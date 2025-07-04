import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage-enhanced";
import { gptAgent, type AIBreakdown } from "../src/services/gptAgent";
import { insertGoalSchema, insertProjectSchema, insertTaskSchema, insertSubtaskSchema, insertPendingBreakdownSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Goal input form schema
  const goalInputSchema = z.object({
    goalInput: z.string().min(1, "Goal cannot be empty"),
    targetDate: z.string().optional(),
  });

  // Goal breakdown approval schema
  const approveBreakdownSchema = z.object({
    pendingId: z.number(),
    approved: z.boolean(),
  });

  // Create goal breakdown (Phase I MVP endpoint)
  app.post("/api/goals/breakdown", async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("=== DEBUG: Goal Breakdown Request ===");
      console.log("Raw request body:", JSON.stringify(req.body, null, 2));
      console.log("Request body type:", typeof req.body);
      console.log("Request body keys:", Object.keys(req.body || {}));
      console.log("Content-Type header:", req.headers['content-type']);
      console.log("goalInput value:", req.body?.goalInput);
      console.log("targetDate value:", req.body?.targetDate);
      console.log("=====================================");
      
      const { goalInput, targetDate } = goalInputSchema.parse(req.body);
      
      console.log("Generating breakdown for:", goalInput);
      
      // Generate AI breakdown with Smart Depth Control
      const aiBreakdown = await gptAgent.generateTaskBreakdown(goalInput, targetDate);
      
      // Store as pending breakdown for approval
      const pendingBreakdown = await storage.createPendingBreakdown({
        originalInput: goalInput,
        breakdown: aiBreakdown
      });
      
      res.json({
        pendingId: pendingBreakdown.id,
        breakdown: aiBreakdown
      });
    } catch (error) {
      next(error);
    }
  });

  // Get all pending breakdowns
  app.get("/api/goals/pending", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pendingBreakdowns = await storage.getAllPendingBreakdowns();
      res.json(pendingBreakdowns);
    } catch (error) {
      next(error);
    }
  });

  // Get specific pending breakdown
  app.get("/api/goals/pending/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const pendingBreakdown = await storage.getPendingBreakdown(id);
      
      if (!pendingBreakdown) {
        return res.status(404).json({ error: "Pending breakdown not found" });
      }
      
      res.json(pendingBreakdown);
    } catch (error) {
      next(error);
    }
  });

  // Approve/reject breakdown and create full hierarchy
  app.post("/api/goals/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pendingId, approved, editedBreakdown } = req.body;
      
      const pendingBreakdown = await storage.getPendingBreakdown(pendingId);
      if (!pendingBreakdown) {
        return res.status(404).json({ error: "Pending breakdown not found" });
      }
      
      if (!approved) {
        // Just delete the pending breakdown if rejected
        await storage.deletePendingBreakdown(pendingId);
        return res.json({ message: "Breakdown rejected and removed" });
      }
      
      // Use edited breakdown if provided, otherwise use original
      const breakdown = editedBreakdown || pendingBreakdown.breakdown as AIBreakdown;
      
      console.log("Breakdown structure:", JSON.stringify(breakdown, null, 2));
      
      // Create the goal (targetDate is text field in goals table)
      const goal = await storage.createGoal({
        title: breakdown.goal.title || breakdown.goal.name,
        name: breakdown.goal.title || breakdown.goal.name,
        description: breakdown.goal.description || null,
        estimatedDuration: breakdown.goal.estimatedDuration || null,
        targetDate: breakdown.goal.targetDate || null,
        priority: breakdown.goal.priority || breakdown.goal.urgency || "medium",
        status: "pending",
        timeEstimate: breakdown.goal.timeEstimate?.toString() || null,
        approved: true
      });
      
      // Create projects under the goal
      const createdProjects = [];
      for (const aiProject of breakdown.projects) {
        const project = await storage.createProject({
          goalId: goal.id,
          title: aiProject.title || aiProject.name,
          name: aiProject.title || aiProject.name,
          description: aiProject.description || null,
          priority: aiProject.priority || aiProject.urgency || "medium",
          status: "pending",
          timeEstimate: aiProject.timeEstimate?.toString() || null,
          estimatedDuration: aiProject.estimatedDuration || null,
          targetDate: aiProject.targetDate || null,
          urgency: aiProject.urgency || "medium",
          approved: true
        });
        
        // Create tasks under each project
        const createdTasks = [];
        for (const aiTask of aiProject.tasks) {
          const task = await storage.createTask({
            projectId: project.id,
            title: aiTask.title || aiTask.name,
            name: aiTask.title || aiTask.name,
            description: aiTask.description || null,
            timeEstimate: aiTask.estimatedHours ? Math.round(aiTask.estimatedHours * 60) : null, // Convert hours to minutes
            estimatedHours: aiTask.estimatedHours || null, // Store decimal hours in the decimal field
            deadline: aiTask.dueDate ? new Date(aiTask.dueDate) : null,
            priority: aiTask.priority || aiTask.urgency || "medium",
            status: "pending",
            completed: false,
            approved: true
          });
          
          // Create subtasks under each task
          const createdSubtasks = [];
          for (const aiSubtask of aiTask.subtasks) {
            console.log("Creating subtask:", aiSubtask.title || aiSubtask.name, aiSubtask);
            const subtask = await storage.createSubtask({
              taskId: task.id,
              title: aiSubtask.title || aiSubtask.name,
              name: aiSubtask.title || aiSubtask.name,
              description: aiSubtask.description || null,
              timeEstimate: aiSubtask.estimatedHours ? Math.round(aiSubtask.estimatedHours * 60) : null, // Convert hours to minutes
              estimatedHours: aiSubtask.estimatedHours || null, // Store decimal hours in the decimal field
              deadline: aiSubtask.dueDate ? new Date(aiSubtask.dueDate) : null,
              priority: aiSubtask.priority || aiSubtask.urgency || "medium",
              status: "pending",
              completed: false,
              approved: true
            });
            createdSubtasks.push(subtask);
          }
          
          createdTasks.push({ ...task, subtasks: createdSubtasks });
        }
        
        createdProjects.push({ ...project, tasks: createdTasks });
      }
      
      // Remove the pending breakdown
      await storage.deletePendingBreakdown(pendingId);
      
      // Return the created goal with full hierarchy
      const fullGoal = { ...goal, projects: createdProjects };
      res.json(fullGoal);
    } catch (error) {
      next(error);
    }
  });

  // HIERARCHICAL ENDPOINTS - Load data progressively for better performance
  
  // Get all goals (lightweight - no nested data)
  app.get("/api/goals", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await storage.getAllGoals();
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  // Get projects for a specific goal
  app.get("/api/goals/:goalId/projects", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const projects = await storage.getProjectsByGoalId(goalId);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });

  // Get tasks for a specific project
  app.get("/api/projects/:projectId/tasks", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getTasksByProjectId(projectId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  // Get subtasks for a specific task
  app.get("/api/tasks/:taskId/subtasks", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const subtasks = await storage.getSubtasksByTaskId(taskId);
      res.json(subtasks);
    } catch (error) {
      next(error);
    }
  });

  // Get hierarchy data for parent selection
  app.get("/api/hierarchy", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await storage.getAllGoals();
      const hierarchyData = [];

      for (const goal of goals) {
        const projects = await storage.getProjectsByGoalId(goal.id);
        const projectsWithTasks = [];

        for (const project of projects) {
          const tasks = await storage.getTasksByProjectId(project.id);
          projectsWithTasks.push({
            ...project,
            tasks
          });
        }

        hierarchyData.push({
          ...goal,
          projects: projectsWithTasks
        });
      }

      res.json(hierarchyData);
    } catch (error) {
      next(error);
    }
  });

  // Get goal with full hierarchy
  app.get("/api/goals/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const goal = await storage.getGoalWithProjects(id);
      
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      next(error);
    }
  });

  // Update goal approval with cascading completion
  app.patch("/api/goals/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
      
      await storage.updateGoalApproval(id, approved);
      
      // If marking as approved/complete, mark all children as complete
      if (approved) {
        const goal = await storage.getGoalWithDetails(id);
        if (goal && goal.projects) {
          for (const project of goal.projects) {
            await storage.updateProjectApproval(project.id, true);
            await storage.updateProjectProgress(project.id, 100);
            
            if (project.tasks) {
              for (const task of project.tasks) {
                await storage.updateTaskCompletion(task.id, true);
                await storage.updateTaskProgress(task.id, 100);
                
                if (task.subtasks) {
                  for (const subtask of task.subtasks) {
                    await storage.updateSubtaskCompletion(subtask.id, true);
                  }
                }
              }
            }
          }
        }
        // Update goal progress to 100%
        await storage.updateGoalProgress(id, 100);
      }
      
      res.json({ message: "Goal approval updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update project completion with comprehensive progress cascading
  app.patch("/api/projects/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
      
      // Use the new progress updater service for proper cascading
      const { progressUpdater } = await import("./services/progressUpdater");
      await progressUpdater.updateProjectProgress(id, completed);
      
      res.json({ message: "Project completion updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update project approval with cascading completion
  app.patch("/api/projects/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
      
      await storage.updateProjectApproval(id, approved);
      
      // If marking as approved/complete, mark all children as complete
      if (approved) {
        const project = await storage.getProjectWithDetails(id);
        if (project && project.tasks) {
          for (const task of project.tasks) {
            await storage.updateTaskCompletion(task.id, true);
            await storage.updateTaskProgress(task.id, 100);
            
            if (task.subtasks) {
              for (const subtask of task.subtasks) {
                await storage.updateSubtaskCompletion(subtask.id, true);
              }
            }
          }
        }
        // Update project progress to 100%
        await storage.updateProjectProgress(id, 100);
        
        // Update parent goal progress
        if (project && project.goalId) {
          const goalProgress = await storage.getGoalProgress(project.goalId);
          await storage.updateGoalProgress(project.goalId, goalProgress.percentComplete);
        }
      }
      
      res.json({ message: "Project approval updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update task completion with comprehensive progress cascading
  app.patch("/api/tasks/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
      
      // Use the new progress updater service for proper cascading
      const { progressUpdater } = await import("./services/progressUpdater");
      await progressUpdater.updateTaskProgress(id, completed);
      
      res.json({ message: "Task completion updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update task approval
  app.patch("/api/tasks/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
      
      await storage.updateTaskApproval(id, approved);
      res.json({ message: "Task approval updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update subtask completion with comprehensive progress cascading
  app.patch("/api/subtasks/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
      
      // Use the new progress updater service for proper cascading
      const { progressUpdater } = await import("./services/progressUpdater");
      await progressUpdater.updateSubtaskProgress(id, completed);
      
      res.json({ message: "Subtask completion updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update subtask approval
  app.patch("/api/subtasks/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
      
      await storage.updateSubtaskApproval(id, approved);
      res.json({ message: "Subtask approval updated" });
    } catch (error) {
      next(error);
    }
  });

  // Edit item titles (universal endpoint for all levels)
  app.patch("/api/:type/:id/edit", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.params;
      const id = parseInt(req.params.id);
      const { title, description, estimatedHours, dueDate, urgency } = req.body;
      
      // This would need to be implemented based on the type
      // For now, just acknowledge the edit request
      res.json({ message: `${type} edit received for ID ${id}` });
    } catch (error) {
      next(error);
    }
  });

  // Create individual hierarchy items
  app.post("/api/hierarchy/create", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { level, title, description, targetDate, estimatedHours, parentId } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      let result;
      const baseData = {
        title,
        description: description || null,
        urgency: "medium" as const,
        approved: true
      };

      switch (level) {
        case 'goal':
          result = await storage.createGoal({
            ...baseData,
            targetDate: targetDate || null,
            estimatedDuration: estimatedHours ? `${estimatedHours} hours` : null
          });
          break;

        case 'project':
          if (!parentId) {
            return res.status(400).json({ error: "Parent goal ID is required for projects" });
          }
          result = await storage.createProject({
            ...baseData,
            goalId: parentId,
            targetDate: targetDate || null,
            estimatedDuration: estimatedHours ? `${estimatedHours} hours` : null
          });
          break;

        case 'task':
          if (!parentId) {
            return res.status(400).json({ error: "Parent project ID is required for tasks" });
          }
          result = await storage.createTask({
            ...baseData,
            projectId: parentId,
            completed: false,
            dueDate: targetDate || null,
            estimatedHours: estimatedHours || null
          });
          break;

        case 'subtask':
          if (!parentId) {
            return res.status(400).json({ error: "Parent task ID is required for subtasks" });
          }
          result = await storage.createSubtask({
            ...baseData,
            taskId: parentId,
            completed: false,
            dueDate: targetDate || null,
            estimatedHours: estimatedHours || null,
            attachments: null
          });
          break;

        default:
          return res.status(400).json({ error: "Invalid hierarchy level" });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Performance diagnostic endpoint
  app.get("/api/diagnostic/performance", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const start = Date.now();
      
      // Test 1: Simple database query
      const simpleStart = Date.now();
      const goals = await storage.getAllGoals();
      const simpleEnd = Date.now();
      
      // Test 2: Single subtask query
      const subtaskStart = Date.now();
      const subtask = await storage.getSubtask(75);
      const subtaskEnd = Date.now();
      
      // Test 3: Progress calculation only
      const progressStart = Date.now();
      if (subtask?.taskId) {
        await storage.recalculateTaskProgressOptimized(subtask.taskId);
      }
      const progressEnd = Date.now();
      
      const total = Date.now() - start;
      
      res.json({
        diagnostics: {
          simpleQuery: `${simpleEnd - simpleStart}ms`,
          subtaskQuery: `${subtaskEnd - subtaskStart}ms`, 
          progressCalculation: `${progressEnd - progressStart}ms`,
          totalTime: `${total}ms`
        },
        goalsCount: goals.length,
        subtaskExists: !!subtask
      });
    } catch (error) {
      next(error);
    }
  });

  // Push schema changes to database
  app.post("/api/db/push", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This endpoint would trigger database schema migration
      res.json({ message: "Database schema push would be triggered here" });
    } catch (error) {
      next(error);
    }
  });

  // Delete endpoints
  app.delete("/api/goals/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGoal(id);
      res.json({ message: "Goal deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/subtasks/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubtask(id);
      res.json({ message: "Subtask deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Break down task/project/subtask further with AI
  app.post("/api/:type/:id/breakdown", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemType = req.params.type as 'tasks' | 'projects' | 'subtasks';
      const itemId = parseInt(req.params.id);
      
      // Validate item type
      if (!['tasks', 'projects', 'subtasks'].includes(itemType)) {
        return res.status(400).json({ error: "Invalid item type. Must be tasks, projects, or subtasks" });
      }

      // Get the item with context
      let item: any;
      let parentContext: any = {};
      
      if (itemType === 'tasks') {
        item = await storage.getTask(itemId);
        if (item) {
          const project = await storage.getProject(item.projectId);
          if (project) {
            parentContext.projectTitle = project.title;
            const goal = await storage.getGoal(project.goalId);
            if (goal) {
              parentContext.goalTitle = goal.title;
              parentContext.description = goal.description;
            }
          }
        }
      } else if (itemType === 'projects') {
        item = await storage.getProject(itemId);
        if (item) {
          const goal = await storage.getGoal(item.goalId);
          if (goal) {
            parentContext.goalTitle = goal.title;
            parentContext.description = goal.description;
          }
        }
      } else if (itemType === 'subtasks') {
        item = await storage.getSubtask(itemId);
        if (item) {
          const task = await storage.getTask(item.taskId);
          if (task) {
            parentContext.taskTitle = task.title;
            const project = await storage.getProject(task.projectId);
            if (project) {
              parentContext.projectTitle = project.title;
              const goal = await storage.getGoal(project.goalId);
              if (goal) {
                parentContext.goalTitle = goal.title;
              }
            }
          }
        }
      }

      if (!item) {
        return res.status(404).json({ error: `${itemType.slice(0, -1)} not found` });
      }

      // Extract breakdown options from request body
      const { targetSubItems, focusArea } = req.body;

      // Generate AI breakdown using the enhanced GPT agent
      const breakdown = await gptAgent.breakDownItemFurther(
        itemType.slice(0, -1) as 'task' | 'project' | 'subtask', // Remove 's' from plural
        {
          title: item.title,
          description: item.description,
          estimatedHours: item.estimatedHours,
          priority: item.priority,
          parentContext
        },
        {
          targetSubItems: targetSubItems || 4,
          focusArea
        }
      );

      res.json({
        itemId,
        itemType: itemType.slice(0, -1),
        breakdown,
        parentContext
      });
    } catch (error) {
      next(error);
    }
  });

  // Apply breakdown results to create actual sub-items in database
  app.post("/api/:type/:id/apply-breakdown", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const itemType = req.params.type as 'tasks' | 'projects' | 'subtasks';
      const itemId = parseInt(req.params.id);
      const { subItems } = req.body;

      if (!subItems || !Array.isArray(subItems)) {
        return res.status(400).json({ error: "subItems array is required" });
      }

      const createdItems = [];

      // Create sub-items based on the parent type
      if (itemType === 'tasks') {
        // Create subtasks under the task
        for (const subItem of subItems) {
          const subtask = await storage.createSubtask({
            taskId: itemId,
            title: subItem.title,
            name: subItem.title,
            description: subItem.description,
            timeEstimate: subItem.estimatedHours ? Math.round(subItem.estimatedHours * 60) : null,
            estimatedHours: subItem.estimatedHours || null,
            deadline: subItem.dueDate ? new Date(subItem.dueDate) : null,
            priority: subItem.urgency || "medium",
            status: "pending",
            completed: false,
            approved: true
          });
          createdItems.push(subtask);
        }
      } else if (itemType === 'projects') {
        // Create tasks under the project  
        for (const subItem of subItems) {
          const task = await storage.createTask({
            projectId: itemId,
            title: subItem.title,
            name: subItem.title,
            description: subItem.description,
            timeEstimate: subItem.estimatedHours ? Math.round(subItem.estimatedHours * 60) : null,
            estimatedHours: subItem.estimatedHours || null,
            deadline: subItem.dueDate ? new Date(subItem.dueDate) : null,
            priority: subItem.urgency || "medium",
            status: "pending",
            completed: false,
            approved: true
          });
          createdItems.push(task);
        }
      } else {
        return res.status(400).json({ error: "Cannot break down subtasks further. Subtasks are the lowest level." });
      }

      res.json({
        message: `Successfully created ${createdItems.length} ${itemType === 'tasks' ? 'subtasks' : 'tasks'}`,
        createdItems
      });
    } catch (error) {
      next(error);
    }
  });

  // Dashboard stats endpoint - provides aggregated data for dashboard
  app.get("/api/dashboard/stats", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get all goals, projects, tasks, and subtasks
      const allGoals = await storage.getAllGoals();
      const allTasks = [];
      const allSubtasks = [];
      const todayTasks = [];
      const overdueTasks = [];
      const quickWins = [];
      const behindSchedule = [];
      
      // Collect all tasks and subtasks with their context
      for (const goal of allGoals) {
        const projects = await storage.getProjectsByGoalId(goal.id);
        for (const project of projects) {
          const tasks = await storage.getTasksByProjectId(project.id);
          for (const task of tasks) {
            const taskWithContext = { ...task, project, goal };
            allTasks.push(taskWithContext);
            
            // Check if task is due today
            if (task.deadline && new Date(task.deadline).toISOString().split('T')[0] === todayStr) {
              todayTasks.push(taskWithContext);
            }
            
            // Check if task is overdue
            if (task.deadline && new Date(task.deadline) < today && !task.completed) {
              overdueTasks.push(taskWithContext);
            }
            
            // Check if task is a quick win (< 1 hour)
            if (task.estimatedHours && Number(task.estimatedHours) < 1 && !task.completed) {
              quickWins.push(taskWithContext);
            }
            
            // Check if task is behind schedule (incomplete with passed deadline)
            if (task.deadline && new Date(task.deadline) < today && !task.completed) {
              behindSchedule.push(taskWithContext);
            }
            
            // Get subtasks for additional analysis
            const subtasks = await storage.getSubtasksByTaskId(task.id);
            for (const subtask of subtasks) {
              const subtaskWithContext = { ...subtask, task, project, goal };
              allSubtasks.push(subtaskWithContext);
              
              // Add subtasks to relevant categories
              if (subtask.deadline && new Date(subtask.deadline).toISOString().split('T')[0] === todayStr) {
                todayTasks.push(subtaskWithContext);
              }
              
              if (subtask.deadline && new Date(subtask.deadline) < today && !subtask.completed) {
                overdueTasks.push(subtaskWithContext);
              }
              
              if (subtask.estimatedHours && Number(subtask.estimatedHours) < 1 && !subtask.completed) {
                quickWins.push(subtaskWithContext);
              }
              
              if (subtask.deadline && new Date(subtask.deadline) < today && !subtask.completed) {
                behindSchedule.push(subtaskWithContext);
              }
            }
          }
        }
      }
      
      // Calculate productivity metrics
      const completedToday = allSubtasks.filter(s => 
        s.completed && s.updatedAt && new Date(s.updatedAt).toDateString() === today.toDateString()
      ).length;
      
      const totalActive = allTasks.filter(t => !t.completed).length + allSubtasks.filter(s => !s.completed).length;
      const totalCompleted = allTasks.filter(t => t.completed).length + allSubtasks.filter(s => s.completed).length;
      
      const productivity = totalActive + totalCompleted > 0 ? 
        Math.round((totalCompleted / (totalActive + totalCompleted)) * 100) : 0;
      
      // Calculate average completion time (mock for now, would need historical data)
      const avgCompletionTime = 2.3; // hours
      
      // Goals on track (percentage)
      const goalsOnTrack = allGoals.filter(g => Number(g.percentComplete || 0) > 50).length;
      const goalsOnTrackPercent = allGoals.length > 0 ? Math.round((goalsOnTrack / allGoals.length) * 100) : 0;
      
      res.json({
        // Key metrics
        todayTasks: todayTasks.slice(0, 5), // Top 5 for today's focus
        overdueTasks: overdueTasks.slice(0, 10),
        quickWins: quickWins.slice(0, 15),
        behindSchedule: behindSchedule.slice(0, 10),
        
        // Analytics
        metrics: {
          tasksCompletedToday: completedToday,
          avgCompletionTime: avgCompletionTime,
          goalsOnTrackPercent: goalsOnTrackPercent,
          productivityScore: productivity
        },
        
        // Counts for filters
        counts: {
          todayTasks: todayTasks.length,
          overdueTasks: overdueTasks.length,
          quickWins: quickWins.length,
          behindSchedule: behindSchedule.length,
          totalGoals: allGoals.length,
          totalTasks: allTasks.length,
          totalSubtasks: allSubtasks.length
        },
        
        // Goal data for overview
        goals: allGoals.map(goal => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          percentComplete: Number(goal.percentComplete || 0),
          deadline: goal.deadline,
          priority: goal.priority || 'medium',
          status: goal.status
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}