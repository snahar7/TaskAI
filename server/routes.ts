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
            timeEstimate: aiTask.timeEstimate?.toString() || aiTask.estimatedHours?.toString() || null,
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
              timeEstimate: aiSubtask.timeEstimate?.toString() || aiSubtask.estimatedHours?.toString() || null,
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

  return httpServer;
}