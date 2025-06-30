import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage-enhanced";
import { generateGoalBreakdown } from "./services/openai";
import { insertGoalSchema, insertProjectSchema, insertTaskSchema, insertSubtaskSchema, insertPendingBreakdownSchema, type AIBreakdown } from "@shared/schema";
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
      const { goalInput, targetDate } = goalInputSchema.parse(req.body);
      
      console.log("Generating breakdown for:", goalInput);
      
      // Generate AI breakdown
      const aiBreakdown = await generateGoalBreakdown(goalInput, targetDate);
      
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
      
      // Create the goal
      const goal = await storage.createGoal({
        title: breakdown.goal.title,
        description: breakdown.goal.description || null,
        estimatedDuration: breakdown.goal.estimatedDuration || null,
        targetDate: breakdown.goal.targetDate || null,
        urgency: breakdown.goal.urgency || "medium",
        approved: true
      });
      
      // Create projects under the goal
      const createdProjects = [];
      for (const aiProject of breakdown.projects) {
        const project = await storage.createProject({
          goalId: goal.id,
          title: aiProject.title,
          description: aiProject.description || null,
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
            title: aiTask.title,
            description: aiTask.description || null,
            estimatedHours: aiTask.estimatedHours || null,
            dueDate: aiTask.dueDate || null,
            urgency: aiTask.urgency || "medium",
            completed: false,
            approved: true
          });
          
          // Create subtasks under each task
          const createdSubtasks = [];
          for (const aiSubtask of aiTask.subtasks) {
            const subtask = await storage.createSubtask({
              taskId: task.id,
              title: aiSubtask.title,
              description: aiSubtask.description || null,
              estimatedHours: aiSubtask.estimatedHours || null,
              dueDate: aiSubtask.dueDate || null,
              urgency: aiSubtask.urgency || "medium",
              completed: false,
              approved: true,
              attachments: null
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

  // Get all goals with full hierarchy including tasks and subtasks
  app.get("/api/goals", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goals = await storage.getAllGoals();
      const goalsWithFullHierarchy = [];

      for (const goal of goals) {
        const projects = await storage.getProjectsByGoalId(goal.id);
        const projectsWithTasks = [];

        for (const project of projects) {
          const tasks = await storage.getTasksByProjectId(project.id);
          const tasksWithSubtasks = [];

          for (const task of tasks) {
            const subtasks = await storage.getSubtasksByTaskId(task.id);
            tasksWithSubtasks.push({
              ...task,
              subtasks
            });
          }

          projectsWithTasks.push({
            ...project,
            tasks: tasksWithSubtasks
          });
        }

        goalsWithFullHierarchy.push({
          ...goal,
          projects: projectsWithTasks
        });
      }

      res.json(goalsWithFullHierarchy);
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

  // Update goal approval
  app.patch("/api/goals/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
      
      await storage.updateGoalApproval(id, approved);
      res.json({ message: "Goal approval updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update project approval
  app.patch("/api/projects/:id/approve", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { approved } = z.object({ approved: z.boolean() }).parse(req.body);
      
      await storage.updateProjectApproval(id, approved);
      res.json({ message: "Project approval updated" });
    } catch (error) {
      next(error);
    }
  });

  // Update task completion with cascading progress calculation
  app.patch("/api/tasks/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
      
      await storage.updateTaskCompletion(id, completed);
      
      // Get task to find its project
      const task = await storage.getTask(id);
      if (task && task.projectId) {
        // Recalculate project progress
        const projectProgress = await storage.getProjectProgress(task.projectId);
        await storage.updateProjectProgress(task.projectId, projectProgress.percentComplete);
        
        // Get project to find its goal
        const project = await storage.getProject(task.projectId);
        if (project && project.goalId) {
          // Recalculate goal progress
          const goalProgress = await storage.getGoalProgress(project.goalId);
          await storage.updateGoalProgress(project.goalId, goalProgress.percentComplete);
        }
      }
      
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

  // Update subtask completion with cascading progress calculation
  app.patch("/api/subtasks/:id/complete", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = z.object({ completed: z.boolean() }).parse(req.body);
      
      await storage.updateSubtaskCompletion(id, completed);
      
      // Get subtask to find its task
      const subtask = await storage.getSubtask(id);
      if (subtask && subtask.taskId) {
        // Calculate task progress based on subtasks completion
        const taskSubtasks = await storage.getSubtasksByTaskId(subtask.taskId);
        const completedSubtasks = taskSubtasks.filter(st => st.completed).length;
        const taskProgress = taskSubtasks.length > 0 ? Math.round((completedSubtasks / taskSubtasks.length) * 100) : 0;
        
        await storage.updateTaskProgress(subtask.taskId, taskProgress);
        
        // Get task to find its project
        const task = await storage.getTask(subtask.taskId);
        if (task && task.projectId) {
          // Recalculate project progress
          const projectProgress = await storage.getProjectProgress(task.projectId);
          await storage.updateProjectProgress(task.projectId, projectProgress.percentComplete);
          
          // Get project to find its goal
          const project = await storage.getProject(task.projectId);
          if (project && project.goalId) {
            // Recalculate goal progress
            const goalProgress = await storage.getGoalProgress(project.goalId);
            await storage.updateGoalProgress(project.goalId, goalProgress.percentComplete);
          }
        }
      }
      
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



  // Push schema changes to database
  app.post("/api/db/push", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This endpoint would trigger database schema migration
      res.json({ message: "Database schema push would be triggered here" });
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}