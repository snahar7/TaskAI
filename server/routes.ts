import { Request, Response, NextFunction } from "express";
import { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { gptAgent, type AIBreakdown } from "../src/services/gptAgent";
import { insertGoalSchema, insertProjectSchema, insertTaskSchema, insertSubtaskSchema, insertPendingBreakdownSchema } from "@shared/schema";
import { z } from "zod";

// Helper to extract user ID from request headers (set by auth middleware)
function getCurrentUserId(req: Request): number | null {
  const userId = req.headers['x-user-id'] as string;
  return userId ? parseInt(userId) : null;
}

// Helper to get accessible user IDs for a user (themselves + team members)
async function getAccessibleUserIds(userId: number): Promise<number[]> {
  try {
    // Validate userId
    if (!userId || isNaN(userId)) {
      console.error('Invalid userId passed to getAccessibleUserIds:', userId);
      return [];
    }
    
    // Get current user to find their team
    const currentUser = await storage.getUserById(userId);
    if (!currentUser) {
      console.log(`User ${userId} not found, returning only self access`);
      return [userId]; // Only user themselves if user not found
    }
    
    // If user has no team, they can only see their own tasks
    if (!currentUser.teamId) {
      console.log(`User ${userId} has no team, returning only self access`);
      return [userId];
    }
    
    // Get all team members
    const teamMembers = await storage.getTeamMembers(currentUser.teamId);
    const accessibleIds = teamMembers.map(member => member.id);
    
    // Ensure current user is included
    if (!accessibleIds.includes(userId)) {
      accessibleIds.push(userId);
    }
    
    console.log(`User ${userId} (team ${currentUser.teamId}) has access to user IDs:`, accessibleIds);
    return accessibleIds;
  } catch (error) {
    console.error('Error getting accessible user IDs for user', userId, ':', error);
    return userId && !isNaN(userId) ? [userId] : []; // Fallback to only user themselves if valid, empty array if invalid
  }
}

// Cascade assignment down the hierarchy
async function cascadeAssignment(type: string, id: number, assignedTo: number | null) {
  console.log(`🔄 CASCADING assignment for ${type} ${id} to user ${assignedTo}`);
  
  try {
    if (type === "goals") {
      // Cascade to all projects in this goal
      const projects = await storage.getProjectsByGoalId(id);
      console.log(`  Found ${projects.length} projects to cascade to`);
      
      for (const project of projects) {
        console.log(`    Updating project ${project.id} (${project.title}) → user ${assignedTo}`);
        await storage.updateProject(project.id, { assignedTo });
        
        // Cascade to all tasks in this project
        const tasks = await storage.getTasksByProjectId(project.id);
        console.log(`    Found ${tasks.length} tasks in project ${project.id}`);
        
        for (const task of tasks) {
          console.log(`      Updating task ${task.id} (${task.title}) → user ${assignedTo}`);
          await storage.updateTask(task.id, { assignedTo });
          
          // Cascade to all subtasks in this task
          const subtasks = await storage.getSubtasksByTaskId(task.id);
          console.log(`      Found ${subtasks.length} subtasks in task ${task.id}`);
          
          for (const subtask of subtasks) {
            console.log(`        Updating subtask ${subtask.id} (${subtask.title}) → user ${assignedTo}`);
            await storage.updateSubtask(subtask.id, { assignedTo });
          }
        }
      }
    } else if (type === "projects") {
      // Cascade to all tasks in this project
      const tasks = await storage.getTasksByProjectId(id);
      console.log(`  Found ${tasks.length} tasks to cascade to`);
      
      for (const task of tasks) {
        console.log(`    Updating task ${task.id} (${task.title}) → user ${assignedTo}`);
        await storage.updateTask(task.id, { assignedTo });
        
        // Cascade to all subtasks in this task
        const subtasks = await storage.getSubtasksByTaskId(task.id);
        console.log(`    Found ${subtasks.length} subtasks in task ${task.id}`);
        
        for (const subtask of subtasks) {
          console.log(`      Updating subtask ${subtask.id} (${subtask.title}) → user ${assignedTo}`);
          await storage.updateSubtask(subtask.id, { assignedTo });
        }
      }
    } else if (type === "tasks") {
      // Cascade to all subtasks in this task
      const subtasks = await storage.getSubtasksByTaskId(id);
      console.log(`  Found ${subtasks.length} subtasks to cascade to`);
      
      for (const subtask of subtasks) {
        console.log(`    Updating subtask ${subtask.id} (${subtask.title}) → user ${assignedTo}`);
        await storage.updateSubtask(subtask.id, { assignedTo });
      }
    }
    
    console.log(`✅ Successfully cascaded assignment for ${type} ${id}`);
  } catch (error) {
    console.error(`❌ Error cascading assignment for ${type} ${id}:`, error);
    // Don't throw error to avoid breaking the main update operation
  }
}

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
      
      console.log("Generating breakdown for:", goalInput, targetDate ? `with target date: ${targetDate}` : "(no target date)");
      
      // Generate AI breakdown with Smart Depth Control
      const aiBreakdown = await gptAgent.generateTaskBreakdown(goalInput, targetDate);
      
      // If target date is provided, also generate automatic timeline
      let timelineData = null;
      if (targetDate) {
        console.log("Generating automatic timeline for target date:", targetDate);
        try {
          timelineData = await gptAgent.generateAutomaticTimeline(aiBreakdown, targetDate);
          
          // Apply timeline dates to the breakdown
          if (timelineData && timelineData.scheduledTasks) {
            gptAgent.applyTimelineToBreakdown(aiBreakdown, timelineData.scheduledTasks);
          }
        } catch (timelineError) {
          console.warn("Timeline generation failed, continuing without it:", timelineError);
        }
      }
      
      // Store as pending breakdown for approval
      const pendingBreakdown = await storage.createPendingBreakdown({
        originalInput: goalInput,
        breakdown: aiBreakdown,
        timeline: timelineData
      });
      
      res.json({
        pendingId: pendingBreakdown.id,
        breakdown: aiBreakdown,
        timeline: timelineData
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
      
      // Get current user ID from middleware
      const currentUserId = getCurrentUserId(req);
      
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
      
      // Create the goal (targetDate is text field in goals table) with user assignment
      const goal = await storage.createGoal({
        title: breakdown.goal.title || breakdown.goal.name,
        name: breakdown.goal.title || breakdown.goal.name,
        description: breakdown.goal.description || null,
        estimatedDuration: breakdown.goal.estimatedDuration || null,
        targetDate: breakdown.goal.targetDate || breakdown.goal.dueDate || null,
        priority: breakdown.goal.priority || breakdown.goal.urgency || "medium",
        status: "pending",
        timeEstimate: breakdown.goal.timeEstimate?.toString() || null,
        estimatedDays: breakdown.goal.estimatedDays || null,
        startDate: breakdown.goal.startDate ? new Date(breakdown.goal.startDate) : null,
        deadline: breakdown.goal.dueDate ? new Date(breakdown.goal.dueDate) : null,
        approved: true,
        assignedTo: currentUserId
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
          targetDate: aiProject.targetDate || aiProject.dueDate || null,
          urgency: aiProject.urgency || "medium",
          estimatedDays: aiProject.estimatedDays || null,
          startDate: aiProject.startDate ? new Date(aiProject.startDate) : null,
          deadline: aiProject.dueDate ? new Date(aiProject.dueDate) : null,
          approved: true,
          assignedTo: currentUserId
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
            estimatedDays: aiTask.estimatedDays || null,
            startDate: aiTask.startDate ? new Date(aiTask.startDate) : null,
            deadline: aiTask.dueDate ? new Date(aiTask.dueDate) : null,
            dueDate: aiTask.dueDate || null,
            priority: aiTask.priority || aiTask.urgency || "medium",
            status: "pending",
            completed: false,
            approved: true,
            assignedTo: currentUserId
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
              estimatedDays: aiSubtask.estimatedDays || null,
              startDate: aiSubtask.startDate ? new Date(aiSubtask.startDate) : null,
              deadline: aiSubtask.dueDate ? new Date(aiSubtask.dueDate) : null,
              dueDate: aiSubtask.dueDate || null,
              priority: aiSubtask.priority || aiSubtask.urgency || "medium",
              status: "pending",
              completed: false,
              approved: true,
              assignedTo: currentUserId
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
  
  // Get all goals (lightweight - no nested data) - WITH PROPER PRIVACY FILTERING
  app.get("/api/goals", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getCurrentUserId(req);
      const showMyTasksOnly = req.query.assignedToMe === 'true';
      
      // CRITICAL: No access without authentication
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      console.log("Goals filtering - userId:", userId, "showMyTasksOnly:", showMyTasksOnly);
      
      // Get accessible user IDs (user + team members)
      let accessibleUserIds = await getAccessibleUserIds(userId);
      
      // If showMyTasksOnly is true, filter to only current user
      if (showMyTasksOnly) {
        accessibleUserIds = [userId];
      }
      
      // Use privacy-filtered storage method
      const accessibleGoals = await storage.getAccessibleGoals(accessibleUserIds);
      
      console.log(`User ${userId} sees ${accessibleGoals.length} goals (privacy-filtered at storage level)`);
      res.json(accessibleGoals);
    } catch (error) {
      next(error);
    }
  });

  // Get projects for a specific goal - WITH PROPER PRIVACY FILTERING
  app.get("/api/goals/:goalId/projects", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const userId = getCurrentUserId(req);
      const showMyTasksOnly = req.query.assignedToMe === 'true';
      
      // CRITICAL: No access without authentication
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get accessible user IDs (user + team members)
      let accessibleUserIds = await getAccessibleUserIds(userId);
      
      // If showMyTasksOnly is true, filter to only current user
      if (showMyTasksOnly) {
        accessibleUserIds = [userId];
      }
      
      // Use privacy-filtered storage method
      const accessibleProjects = await storage.getAccessibleProjectsByGoalId(goalId, accessibleUserIds);
      
      console.log(`User ${userId} sees ${accessibleProjects.length} projects in goal ${goalId} (privacy-filtered at storage level)`);
      res.json(accessibleProjects);
    } catch (error) {
      next(error);
    }
  });

  // Get all tasks (for dependency lookups) - WITH PROPER PRIVACY FILTERING - OPTIMIZED
  app.get("/api/tasks/all", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getCurrentUserId(req);
      const showMyTasksOnly = req.query.assignedToMe === 'true';
      
      // CRITICAL: No access without authentication
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get accessible user IDs (user + team members)
      let accessibleUserIds = await getAccessibleUserIds(userId);
      
      // If showMyTasksOnly is true, filter to only current user
      if (showMyTasksOnly) {
        accessibleUserIds = [userId];
      }
      
      // Use privacy-filtered storage method
      const filteredTasks = await storage.getAccessibleTasks(accessibleUserIds);
      
      console.log(`User ${userId} sees ${filteredTasks.length} tasks (privacy-filtered at storage level)`);
      res.json(filteredTasks);
    } catch (error) {
      next(error);
    }
  });

  // Get tasks for a specific project - WITH PROPER PRIVACY FILTERING
  app.get("/api/projects/:projectId/tasks", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = getCurrentUserId(req);
      const showMyTasksOnly = req.query.assignedToMe === 'true';
      
      // CRITICAL: No access without authentication
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get accessible user IDs (user + team members)
      let accessibleUserIds = await getAccessibleUserIds(userId);
      
      // If showMyTasksOnly is true, filter to only current user
      if (showMyTasksOnly) {
        accessibleUserIds = [userId];
      }
      
      // Use privacy-filtered storage method
      const accessibleTasks = await storage.getAccessibleTasksByProjectId(projectId, accessibleUserIds);
      
      console.log(`User ${userId} sees ${accessibleTasks.length} tasks in project ${projectId} (privacy-filtered at storage level)`);
      res.json(accessibleTasks);
    } catch (error) {
      next(error);
    }
  });

  // Get subtasks for a specific task - WITH PROPER PRIVACY FILTERING
  app.get("/api/tasks/:taskId/subtasks", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const userId = getCurrentUserId(req);
      const showMyTasksOnly = req.query.assignedToMe === 'true';
      
      // CRITICAL: No access without authentication
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get accessible user IDs (user + team members)
      let accessibleUserIds = await getAccessibleUserIds(userId);
      
      // If showMyTasksOnly is true, filter to only current user
      if (showMyTasksOnly) {
        accessibleUserIds = [userId];
      }
      
      // Use privacy-filtered storage method
      const accessibleSubtasks = await storage.getAccessibleSubtasksByTaskId(taskId, accessibleUserIds);
      
      console.log(`User ${userId} sees ${accessibleSubtasks.length} subtasks in task ${taskId} (privacy-filtered at storage level)`);
      res.json(accessibleSubtasks);
    } catch (error) {
      next(error);
    }
  });

  // Get hierarchy data for parent selection - WITH PROPER PRIVACY FILTERING
  app.get("/api/hierarchy", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getCurrentUserId(req);
      
      // CRITICAL: No access without authentication
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get accessible user IDs (user + team members)
      const accessibleUserIds = await getAccessibleUserIds(userId);
      
      const allGoals = await storage.getAllGoals();
      const hierarchyData = [];

      for (const goal of allGoals) {
        // Check if goal is accessible (assigned to user or team member)
        if (!goal.assignedTo || !accessibleUserIds.includes(goal.assignedTo)) {
          continue; // Skip this goal
        }
        
        const projects = await storage.getProjectsByGoalId(goal.id);
        const projectsWithTasks = [];

        for (const project of projects) {
          // Check if project is accessible
          if (!project.assignedTo || !accessibleUserIds.includes(project.assignedTo)) {
            continue; // Skip this project
          }
          
          const tasks = await storage.getTasksByProjectId(project.id);
          // Filter tasks to only accessible ones
          const accessibleTasks = tasks.filter(task => 
            task.assignedTo && accessibleUserIds.includes(task.assignedTo)
          );
          
          projectsWithTasks.push({
            ...project,
            tasks: accessibleTasks
          });
        }

        hierarchyData.push({
          ...goal,
          projects: projectsWithTasks
        });
      }

      console.log(`User ${userId} sees ${hierarchyData.length}/${allGoals.length} goals in hierarchy (accessible users: ${accessibleUserIds.join(', ')})`);
      res.json(hierarchyData);
    } catch (error) {
      next(error);
    }
  });

  // Get individual task with related information
  app.get("/api/tasks/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Get related project and goal information
      let enrichedTask = { ...task };
      
      if (task.projectId) {
        const project = await storage.getProject(task.projectId);
        if (project) {
          enrichedTask.project = project;
          
          if (project.goalId) {
            const goal = await storage.getGoal(project.goalId);
            if (goal) {
              enrichedTask.goal = goal;
            }
          }
        }
      }
      
      res.json(enrichedTask);
    } catch (error) {
      next(error);
    }
  });

  // Hierarchical endpoints for proper navigation context
  
  // Get goal by ID with full hierarchy context
  app.get("/api/goals/:goalId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const goal = await storage.getGoal(goalId);
      
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      next(error);
    }
  });

  // Get project within goal context  
  app.get("/api/goals/:goalId/projects/:projectId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const projectId = parseInt(req.params.projectId);
      
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Verify project belongs to the goal
      if (project.goalId !== goalId) {
        return res.status(404).json({ error: "Project not found in this goal" });
      }
      
      // Add goal context to project
      const enrichedProject = { ...project, goal };
      res.json(enrichedProject);
    } catch (error) {
      next(error);
    }
  });

  // Get task within goal/project context
  app.get("/api/goals/:goalId/projects/:projectId/tasks/:taskId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const goalId = parseInt(req.params.goalId);
      const projectId = parseInt(req.params.projectId);
      const taskId = parseInt(req.params.taskId);
      
      const goal = await storage.getGoal(goalId);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Verify project belongs to the goal
      if (project.goalId !== goalId) {
        return res.status(404).json({ error: "Project not found in this goal" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Verify task belongs to the project
      if (task.projectId !== projectId) {
        return res.status(404).json({ error: "Task not found in this project" });
      }
      
      // Add full hierarchy context to task
      const enrichedTask = { ...task, project, goal };
      res.json(enrichedTask);
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

  // Edit item fields (universal endpoint for all levels)
  app.patch("/api/:type/:id/edit", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.params.type;
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      console.log(`Editing ${type} ${id} with updates:`, updates);
      
      // Check if this is an assignment update
      if (updates.assignedTo !== undefined) {
        console.log(`Assignment update detected: ${type} ${id} → user ${updates.assignedTo}`);
      }
      
      // Import timeline calculator for smart recalculation
      const { timelineCalculator } = await import("./services/timelineCalculator");
      
      // Check if we need smart timeline recalculation
      const needsTimelineRecalc = Object.keys(updates).some(key => 
        key === 'estimatedDays' || key === 'deadline'
      );
      
      // Convert date strings to Date objects for database compatibility
      const processedUpdates = { ...updates };
      if (processedUpdates.deadline && typeof processedUpdates.deadline === 'string') {
        processedUpdates.deadline = new Date(processedUpdates.deadline + 'T00:00:00.000Z');
      }
      
      // Update the appropriate entity based on type
      let updatedItem;
      
      if (type === "goals") {
        updatedItem = await storage.updateGoal(id, processedUpdates);
        
        // If assignedTo was updated, cascade to all children
        if (processedUpdates.assignedTo !== undefined) {
          await cascadeAssignment(type, id, processedUpdates.assignedTo);
        }
      } else if (type === "projects") {
        updatedItem = await storage.updateProject(id, processedUpdates);
        
        // If assignedTo was updated, cascade to all children
        if (processedUpdates.assignedTo !== undefined) {
          await cascadeAssignment(type, id, processedUpdates.assignedTo);
        }
      } else if (type === "tasks") {
        updatedItem = await storage.updateTask(id, processedUpdates);
        
        // If assignedTo was updated, cascade to all children
        if (processedUpdates.assignedTo !== undefined) {
          await cascadeAssignment(type, id, processedUpdates.assignedTo);
        }
      } else if (type === "subtasks") {
        updatedItem = await storage.updateSubtask(id, processedUpdates);
      } else {
        return res.status(400).json({ error: `Invalid type: ${type}` });
      }
      
      // Perform smart timeline recalculation if needed
      if (needsTimelineRecalc) {
        for (const [field, value] of Object.entries(updates)) {
          if (field === 'estimatedDays' || field === 'deadline') {
            // For deadline field, pass the original string value, not the processed Date object
            const recalcValue = field === 'deadline' ? value : value;
            await timelineCalculator.smartRecalculate(type, id, field, recalcValue);
          }
        }
      }
      
      res.json({ 
        message: `${type} updated successfully`, 
        item: updatedItem,
        timelineRecalculated: needsTimelineRecalc
      });
    } catch (error) {
      console.error(`Error updating ${req.params.type} ${req.params.id}:`, error);
      next(error);
    }
  });

  // Create individual hierarchy items
  app.post("/api/hierarchy/create", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { level, title, description, targetDate, estimatedHours, parentId } = req.body;
      const userId = getCurrentUserId(req);

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
            estimatedDuration: estimatedHours ? `${estimatedHours} hours` : null,
            assignedTo: userId
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
            estimatedDuration: estimatedHours ? `${estimatedHours} hours` : null,
            assignedTo: userId
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
            estimatedHours: estimatedHours || null,
            assignedTo: userId
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
            assignedTo: userId,
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

  // User profile update endpoint
  app.patch("/api/users/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Validate the updates
      const allowedFields = ['firstName', 'lastName', 'displayName', 'profilePicture'];
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      const updatedUser = await storage.updateUser(id, filteredUpdates);
      res.json({ user: updatedUser });
    } catch (error) {
      next(error);
    }
  });

  // Get user by ID (for UserAvatar component)
  app.get("/api/users/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  // Get team members for assignment dropdown
  app.get("/api/users/team/:teamId", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const teamId = parseInt(req.params.teamId);
      console.log('Route: Getting team members for teamId:', teamId);
      
      // Validate teamId
      if (isNaN(teamId)) {
        return res.status(400).json({ error: "Invalid team ID" });
      }
      
      // Check if storage function exists
      if (typeof storage.getTeamMembers !== 'function') {
        console.error('Route: getTeamMembers is not a function!');
        return res.status(500).json({ error: 'Storage function not available' });
      }
      
      const teamMembers = await storage.getTeamMembers(teamId);
      console.log('Route: Received team members:', teamMembers.length, teamMembers);
      res.json(teamMembers);
    } catch (error) {
      console.error('Error getting team members:', error);
      next(error);
    }
  });

  // Join team via invite code (used during signup)
  app.post("/api/teams/join", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, inviteCode } = req.body;
      
      if (!userId || !inviteCode) {
        return res.status(400).json({ error: "User ID and invite code required" });
      }

      const result = await storage.joinTeamByInviteCode(userId, inviteCode);
      res.json(result);
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
      const userId = getCurrentUserId(req);

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
            estimatedDays: subItem.estimatedDays || null,
            startDate: subItem.startDate ? new Date(subItem.startDate) : null,
            deadline: subItem.dueDate ? new Date(subItem.dueDate) : null,
            priority: subItem.urgency || "medium",
            status: "pending",
            completed: false,
            approved: true,
            assignedTo: userId // Automatically assign to authenticated user
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
            estimatedDays: subItem.estimatedDays || null,
            startDate: subItem.startDate ? new Date(subItem.startDate) : null,
            deadline: subItem.dueDate ? new Date(subItem.dueDate) : null,
            priority: subItem.urgency || "medium",
            status: "pending",
            completed: false,
            approved: true,
            assignedTo: userId // Automatically assign to authenticated user
          });
          createdItems.push(task);
        }
      } else {
        return res.status(400).json({ error: "Cannot break down subtasks further. Subtasks are the lowest level." });
      }

      // After creating sub-items, check if we need to adjust subsequent deadlines
      await adjustDependentDeadlines(itemType, itemId, createdItems);

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
      const userId = getCurrentUserId(req);
      const showMyTasksOnly = req.query.assignedToMe === 'true';
      
      // ALWAYS get accessible user IDs for proper privacy control
      let accessibleUserIds: number[] = [];
      if (userId) {
        accessibleUserIds = await getAccessibleUserIds(userId);
        
        // If showMyTasksOnly is true, filter to only the current user
        if (showMyTasksOnly) {
          accessibleUserIds = [userId];
        }
        // Otherwise, use all accessible user IDs (team members)
      }
      
      // Use optimized database queries with proper privacy filtering
      const { allTasks, allSubtasks } = await storage.getOptimizedDashboardData(accessibleUserIds);
      
      // Get goals for overview (simple query)
      const allGoals = await storage.getAllGoals();
      
      const todayTasks = [];
      const overdueTasks = [];
      const quickWins = [];
      const behindSchedule = [];
      
      // Process tasks for dashboard categories
      for (const task of allTasks) {
        // Check if task is in today's focus (today is between start date and deadline)
        const taskDeadline = task.deadline ? new Date(task.deadline) : null;
        const taskStartDate = task.startDate ? new Date(task.startDate) : null;
        
        // Today's focus: tasks where today falls between start date and deadline AND not completed
        if (taskDeadline && taskDeadline >= today && task.status !== "completed" && !task.completed) {
          if (!taskStartDate || taskStartDate <= today) {
            // Task is active today (started and not yet due)
            todayTasks.push(task);
          }
        }
        
        // Check if task is overdue (deadline passed and not completed)
        if (taskDeadline && taskDeadline < today && task.status !== "completed" && !task.completed) {
          overdueTasks.push(task);
        }
        
        // Check if task is a quick win (< 1 hour)
        if (task.estimatedHours && Number(task.estimatedHours) < 1 && !task.completed) {
          quickWins.push(task);
        }
        
        // Check if task is behind schedule (incomplete with passed deadline)
        if (task.deadline && new Date(task.deadline) < today && !task.completed) {
          behindSchedule.push(task);
        }
      }
      
      // Process subtasks for dashboard categories
      for (const subtask of allSubtasks) {
        // Check if subtask is in today's focus
        const subtaskDeadline = subtask.deadline ? new Date(subtask.deadline) : null;
        const subtaskStartDate = subtask.startDate ? new Date(subtask.startDate) : null;
        
        if (subtaskDeadline && subtaskDeadline >= today && subtask.status !== "completed" && !subtask.completed) {
          if (!subtaskStartDate || subtaskStartDate <= today) {
            // Subtask is active today
            todayTasks.push(subtask);
          }
        }
        
        // Check if subtask is overdue
        if (subtaskDeadline && subtaskDeadline < today && subtask.status !== "completed" && !subtask.completed) {
          overdueTasks.push(subtask);
        }
        
        // Check if subtask is a quick win (< 1 hour)
        if (subtask.estimatedHours && Number(subtask.estimatedHours) < 1 && !subtask.completed) {
          quickWins.push(subtask);
        }
        
        // Check if subtask is behind schedule
        if (subtaskDeadline && subtaskDeadline < today && !subtask.completed) {
          behindSchedule.push(subtask);
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
      
      // Sort today's focus by priority and deadline
      const sortedTodayTasks = todayTasks.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
        
        if (aPriority !== bPriority) return bPriority - aPriority; // Higher priority first
        
        // If same priority, sort by deadline (sooner first)
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return a.deadline ? -1 : 1; // Tasks with deadlines first
      });
      
      // Sort overdue items by how overdue they are (most overdue first)
      const sortedOverdueTasks = overdueTasks.sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return a.deadline ? -1 : 1;
      });

      res.json({
        // Key metrics
        todayTasks: sortedTodayTasks.slice(0, 8), // Top 8 for today's focus
        overdueTasks: sortedOverdueTasks.slice(0, 10),
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

  // Helper function to adjust deadlines of dependent items
  async function adjustDependentDeadlines(itemType: string, itemId: number, newItems: any[]) {
    try {
      console.log(`🔄 Adjusting dependent deadlines after breakdown of ${itemType} ${itemId}`);
      
      if (itemType === 'tasks') {
        // Get the task and its project to find subsequent tasks
        const task = await storage.getTask(itemId);
        if (!task || !task.projectId) return;
        
        // Get all tasks in the same project
        const allTasks = await storage.getTasksByProjectId(task.projectId);
        
        // Find tasks that come after this one (by ID or deadline)
        const currentTaskIndex = allTasks.findIndex(t => t.id === itemId);
        const subsequentTasks = allTasks.slice(currentTaskIndex + 1);
        
        // If new subtasks extend the parent task deadline, shift subsequent tasks
        if (newItems.length > 0) {
          const lastSubtaskDeadline = new Date(Math.max(...newItems.map(item => new Date(item.deadline || item.dueDate).getTime())));
          
          // Update parent task deadline to match last subtask
          await storage.updateTask(itemId, { 
            deadline: lastSubtaskDeadline,
            estimatedDays: newItems.reduce((sum, item) => sum + (item.estimatedDays || 0), 0)
          });
          
          // Calculate business days shift needed
          const addBusinessDays = (date: Date, days: number): Date => {
            let result = new Date(date);
            let daysAdded = 0;
            while (daysAdded < days) {
              result.setDate(result.getDate() + 1);
              if (result.getDay() !== 0 && result.getDay() !== 6) {
                daysAdded++;
              }
            }
            return result;
          };
          
          // Shift subsequent tasks to start after the last subtask
          let currentDate = new Date(lastSubtaskDeadline);
          currentDate.setDate(currentDate.getDate() + 1); // Start next day
          
          for (const subsequentTask of subsequentTasks) {
            if (subsequentTask.deadline && new Date(subsequentTask.deadline) <= lastSubtaskDeadline) {
              const taskDays = subsequentTask.estimatedDays || 3; // Default to 3 days if not set
              const newStartDate = new Date(currentDate);
              const newDeadline = addBusinessDays(currentDate, taskDays);
              
              console.log(`📅 Shifting task "${subsequentTask.title}" to start ${newStartDate.toISOString().split('T')[0]} and end ${newDeadline.toISOString().split('T')[0]}`);
              
              await storage.updateTask(subsequentTask.id, {
                startDate: newStartDate,
                deadline: newDeadline
              });
              
              currentDate = new Date(newDeadline);
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        }
      } else if (itemType === 'projects') {
        // Similar logic for project-level adjustments
        const project = await storage.getProject(itemId);
        if (!project || !project.goalId) return;
        
        const allProjects = await storage.getProjectsByGoalId(project.goalId);
        const currentProjectIndex = allProjects.findIndex(p => p.id === itemId);
        const subsequentProjects = allProjects.slice(currentProjectIndex + 1);
        
        if (newItems.length > 0) {
          const lastTaskDeadline = new Date(Math.max(...newItems.map(item => new Date(item.deadline || item.dueDate).getTime())));
          
          // Update parent project deadline
          await storage.updateProject(itemId, { 
            deadline: lastTaskDeadline,
            estimatedDays: newItems.reduce((sum, item) => sum + (item.estimatedDays || 0), 0)
          });
          
          // Shift subsequent projects
          let currentDate = new Date(lastTaskDeadline);
          currentDate.setDate(currentDate.getDate() + 1);
          
          for (const subsequentProject of subsequentProjects) {
            if (subsequentProject.deadline && new Date(subsequentProject.deadline) <= lastTaskDeadline) {
              const projectDays = subsequentProject.estimatedDays || 14; // Default to 14 days
              const addBusinessDays = (date: Date, days: number): Date => {
                let result = new Date(date);
                let daysAdded = 0;
                while (daysAdded < days) {
                  result.setDate(result.getDate() + 1);
                  if (result.getDay() !== 0 && result.getDay() !== 6) {
                    daysAdded++;
                  }
                }
                return result;
              };
              
              const newDeadline = addBusinessDays(currentDate, projectDays);
              
              console.log(`📅 Shifting project "${subsequentProject.title}" to end ${newDeadline.toISOString().split('T')[0]}`);
              
              await storage.updateProject(subsequentProject.id, {
                startDate: new Date(currentDate),
                deadline: newDeadline
              });
              
              currentDate = new Date(newDeadline);
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error adjusting dependent deadlines:', error);
      // Don't throw error - this is a helpful feature but shouldn't break the main flow
    }
  }

  return httpServer;
}