import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateTaskBreakdown } from "./services/openai";
import { firebaseService } from "./services/firebase";
import { insertTaskSchema, insertSubtaskSchema } from "@shared/schema";
import { z } from "zod";

const createTaskRequestSchema = insertTaskSchema.extend({
  useFirebase: z.boolean().optional().default(false)
});

const updateSubtaskSchema = z.object({
  completed: z.boolean()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate task breakdown with AI
  app.post("/api/tasks/generate", async (req, res) => {
    try {
      const { title, description, category, targetDate, useFirebase } = createTaskRequestSchema.parse(req.body);
      
      // Generate AI breakdown
      const aiBreakdown = await generateTaskBreakdown(description, category || undefined, targetDate || undefined);
      
      if (useFirebase) {
        // Save to Firebase
        try {
          const taskData = { 
            title, 
            description, 
            category: category || null, 
            targetDate: targetDate || null,
            createdAt: new Date(),
            completed: false
          };
          const subtasks = aiBreakdown.subtasks.map(subtask => ({
            title: subtask.title,
            description: subtask.description || null,
            priority: subtask.priority,
            dueDate: subtask.dueDate || null,
            estimatedHours: subtask.estimatedHours || null,
            createdAt: new Date(),
            completed: false,
            completedAt: null
          }));
          
          const savedTask = await firebaseService.saveTask(taskData, subtasks);
          res.json(savedTask);
        } catch (firebaseError) {
          console.error("Firebase save failed, falling back to memory storage:", firebaseError);
          // Fall back to memory storage
          const task = await storage.createTask({ title, description, category, targetDate });
          const savedSubtasks = [];
          
          for (const aiSubtask of aiBreakdown.subtasks) {
            const subtask = await storage.createSubtask({
              taskId: task.id,
              title: aiSubtask.title,
              description: aiSubtask.description,
              priority: aiSubtask.priority,
              dueDate: aiSubtask.dueDate,
              estimatedHours: aiSubtask.estimatedHours
            });
            savedSubtasks.push(subtask);
          }
          
          res.json({ ...task, subtasks: savedSubtasks });
        }
      } else {
        // Save to memory storage
        const task = await storage.createTask({ title, description, category, targetDate });
        const savedSubtasks = [];
        
        for (const aiSubtask of aiBreakdown.subtasks) {
          const subtask = await storage.createSubtask({
            taskId: task.id,
            title: aiSubtask.title,
            description: aiSubtask.description,
            priority: aiSubtask.priority,
            dueDate: aiSubtask.dueDate,
            estimatedHours: aiSubtask.estimatedHours
          });
          savedSubtasks.push(subtask);
        }
        
        res.json({ ...task, subtasks: savedSubtasks });
      }
    } catch (error) {
      console.error("Error generating task breakdown:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to generate task breakdown" 
      });
    }
  });

  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const useFirebase = req.query.firebase === 'true';
      
      if (useFirebase) {
        try {
          const tasks = await firebaseService.getAllTasks();
          res.json(tasks);
        } catch (firebaseError) {
          console.error("Firebase fetch failed, falling back to memory storage:", firebaseError);
          // Fall back to memory storage
          const tasks = await storage.getAllTasks();
          const tasksWithSubtasks = [];
          
          for (const task of tasks) {
            const subtasks = await storage.getSubtasksByTaskId(task.id);
            tasksWithSubtasks.push({ ...task, subtasks });
          }
          
          res.json(tasksWithSubtasks);
        }
      } else {
        const tasks = await storage.getAllTasks();
        const tasksWithSubtasks = [];
        
        for (const task of tasks) {
          const subtasks = await storage.getSubtasksByTaskId(task.id);
          tasksWithSubtasks.push({ ...task, subtasks });
        }
        
        res.json(tasksWithSubtasks);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get specific task with subtasks
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const useFirebase = req.query.firebase === 'true';
      
      if (useFirebase) {
        try {
          const task = await firebaseService.getTask(id);
          if (!task) {
            return res.status(404).json({ message: "Task not found" });
          }
          res.json(task);
        } catch (firebaseError) {
          console.error("Firebase fetch failed, falling back to memory storage:", firebaseError);
          // Fall back to memory storage
          const taskId = parseInt(id);
          if (isNaN(taskId)) {
            return res.status(400).json({ message: "Invalid task ID" });
          }
          
          const task = await storage.getTaskWithSubtasks(taskId);
          if (!task) {
            return res.status(404).json({ message: "Task not found" });
          }
          res.json(task);
        }
      } else {
        const taskId = parseInt(id);
        if (isNaN(taskId)) {
          return res.status(400).json({ message: "Invalid task ID" });
        }
        
        const task = await storage.getTaskWithSubtasks(taskId);
        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }
        res.json(task);
      }
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  // Update subtask completion
  app.patch("/api/subtasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const useFirebase = req.query.firebase === 'true';
      const { completed } = updateSubtaskSchema.parse(req.body);
      
      if (useFirebase) {
        try {
          await firebaseService.updateSubtaskCompletion(id, completed);
          res.json({ success: true });
        } catch (firebaseError) {
          console.error("Firebase update failed, falling back to memory storage:", firebaseError);
          // Fall back to memory storage
          const subtaskId = parseInt(id);
          if (isNaN(subtaskId)) {
            return res.status(400).json({ message: "Invalid subtask ID" });
          }
          
          await storage.updateSubtaskCompletion(subtaskId, completed);
          res.json({ success: true });
        }
      } else {
        const subtaskId = parseInt(id);
        if (isNaN(subtaskId)) {
          return res.status(400).json({ message: "Invalid subtask ID" });
        }
        
        await storage.updateSubtaskCompletion(subtaskId, completed);
        res.json({ success: true });
      }
    } catch (error) {
      console.error("Error updating subtask:", error);
      res.status(500).json({ message: "Failed to update subtask" });
    }
  });

  // Subdivide a subtask into smaller tasks
  app.post("/api/subtasks/:id/subdivide", async (req, res) => {
    try {
      const subtaskId = parseInt(req.params.id);
      
      if (isNaN(subtaskId)) {
        return res.status(400).json({ message: "Invalid subtask ID" });
      }

      // Get the original subtask
      const originalSubtask = await storage.getSubtask(subtaskId);
      if (!originalSubtask) {
        return res.status(404).json({ message: "Subtask not found" });
      }

      // Get the parent task for context
      const parentTask = await storage.getTask(originalSubtask.taskId);
      if (!parentTask) {
        return res.status(404).json({ message: "Parent task not found" });
      }

      // Generate sub-breakdown using AI
      const contextualDescription = `Break down this subtask from the larger project "${parentTask.title}":

Subtask: ${originalSubtask.title}
Description: ${originalSubtask.description || 'Complete this specific part of the project'}

Create 3-5 smaller, specific action items that together complete this subtask. Each should be:
- A clear, actionable step that can be completed in 30 minutes to 2 hours
- Specific enough to know exactly what to do
- Logically ordered from first to last step`;

      const aiBreakdown = await generateTaskBreakdown(contextualDescription, parentTask.targetDate || undefined);
      
      // Create the sub-subtasks
      const createdSubtasks = [];
      for (const aiSubtask of aiBreakdown.subtasks) {
        const subtask = await storage.createSubtask({
          taskId: originalSubtask.taskId,
          title: `${originalSubtask.title} → ${aiSubtask.title}`,
          description: aiSubtask.description,
          priority: aiSubtask.priority,
          dueDate: aiSubtask.dueDate,
          estimatedHours: aiSubtask.estimatedHours
        });
        createdSubtasks.push(subtask);
      }

      res.json({
        message: `Created ${createdSubtasks.length} sub-tasks for "${originalSubtask.title}"`,
        originalSubtask,
        newSubtasks: createdSubtasks
      });

    } catch (error) {
      console.error("Error subdividing subtask:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to subdivide subtask" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
