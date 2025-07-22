import { 
  users, goals, projects, tasks, subtasks, pendingBreakdowns, teams, categories, tags, files, fileComments, fileActivity,
  type User, type InsertUser,
  type Goal, type InsertGoal,
  type Project, type InsertProject, 
  type Task, type InsertTask,
  type Subtask, type InsertSubtask,
  type PendingBreakdown, type InsertPendingBreakdown,
  type Team, type InsertTeam,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type File, type InsertFile,
  type ProjectWithTasks, type TaskWithSubtasks
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, or, isNull, getTableColumns } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<void>;
  
  // Teams (simplified for hybrid model)
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: number): Promise<Team | undefined>;
  updateTeam(id: number, updates: Partial<InsertTeam>): Promise<void>;
  
  // Teams (deprecated but kept for backward compatibility)
  getTeamMembers(teamId: number): Promise<User[]>;
  getTeamMemberIds(teamId: number): Promise<number[]>;
  getUserByInviteCode(inviteCode: string): Promise<User | undefined>;
  joinTeamByInviteCode(userId: number, inviteCode: string): Promise<{ success: boolean; message: string }>;
  
  // Goals
  createGoal(goal: InsertGoal): Promise<Goal>;
  getAllGoals(): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  updateGoalApproval(id: number, approved: boolean): Promise<void>;
  deleteGoal(id: number): Promise<void>;
  
  // User-centric methods (simplified approach)
  getGoalsForUser(userId: number): Promise<Goal[]>;
  getProjectsForUser(userId: number): Promise<Project[]>;
  getTasksForUser(userId: number): Promise<Task[]>;
  getSubtasksForUser(userId: number): Promise<Subtask[]>;
  
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProjectsByGoalId(goalId: number): Promise<Project[]>;

  getProject(id: number): Promise<Project | undefined>;
  getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined>;
  updateProjectApproval(id: number, approved: boolean): Promise<void>;
  deleteProject(id: number): Promise<void>;
  
  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  getTasksByProjectId(projectId: number): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;

  getTask(id: number): Promise<Task | undefined>;
  getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined>;
  updateTaskCompletion(id: number, completed: boolean): Promise<void>;
  updateTaskApproval(id: number, approved: boolean): Promise<void>;
  deleteTask(id: number): Promise<void>;
  
  // Subtasks
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  getSubtasksByTaskId(taskId: number): Promise<(Subtask & { goalId?: number; projectId?: number })[]>;

  getSubtask(id: number): Promise<Subtask | undefined>;
  updateSubtaskCompletion(id: number, completed: boolean): Promise<void>;
  updateSubtaskApproval(id: number, approved: boolean): Promise<void>;
  deleteSubtask(id: number): Promise<void>;
  
  // Pending breakdowns
  createPendingBreakdown(breakdown: InsertPendingBreakdown): Promise<PendingBreakdown>;
  getAllPendingBreakdowns(): Promise<PendingBreakdown[]>;
  getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined>;
  deletePendingBreakdown(id: number): Promise<void>;
  
  // Files
  createFile(file: InsertFile): Promise<File>;
  getFileById(id: number): Promise<File | undefined>;
  getFile(id: number): Promise<File | undefined>;
  getFilesForEntity(entityType: string, entityId: number, userId?: number): Promise<File[]>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<void>;
  deleteFile(id: number): Promise<void>;
  
  // File collaboration
  createFileComment(comment: { fileId: number; userId: number; content: string; mentions?: number[] }): Promise<any>;
  getFileComments(fileId: number): Promise<any[]>;
  logFileActivity(activity: { fileId: number; userId: number; type: string; content?: string; metadata?: any }): Promise<void>;
  getFileActivity(fileId: number): Promise<any[]>;
  
  // Optimized data fetching
  getOptimizedDashboardData(userIds: number[]): Promise<{
    allTasks: any[];
    allSubtasks: any[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private goals: Map<number, Goal>;
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private subtasks: Map<number, Subtask>;
  private pendingBreakdowns: Map<number, PendingBreakdown>;
  private files: Map<number, File>;
  private currentUserId: number;
  private currentGoalId: number;
  private currentProjectId: number;
  private currentTaskId: number;
  private currentSubtaskId: number;
  private currentPendingId: number;
  private currentFileId: number;

  constructor() {
    this.users = new Map();
    this.goals = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.subtasks = new Map();
    this.pendingBreakdowns = new Map();
    this.files = new Map();
    this.currentUserId = 1;
    this.currentGoalId = 1;
    this.currentProjectId = 1;
    this.currentTaskId = 1;
    this.currentSubtaskId = 1;
    this.currentPendingId = 1;
    this.currentFileId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.set(id, { ...user, ...updates });
    }
  }



  // Teams (keeping for compatibility)
  async getTeamMembers(teamId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.teamId === teamId);
  }

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.inviteCode === inviteCode) return user;
    }
    return undefined;
  }

  async joinTeamByInviteCode(userId: number, inviteCode: string): Promise<{ success: boolean; message: string }> {
    const inviter = await this.getUserByInviteCode(inviteCode);
    if (!inviter) {
      return { success: false, message: "Invalid invite code" };
    }
    
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, teamId: inviter.teamId });
      return { success: true, message: "Successfully joined team" };
    }
    
    return { success: false, message: "User not found" };
  }

  // Goals
  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const id = this.currentGoalId++;
    const goal: Goal = { 
      ...insertGoal, 
      id, 
      createdAt: new Date(),
      approved: insertGoal.approved ?? false,
      urgency: insertGoal.urgency ?? "medium",
      description: insertGoal.description ?? null,
      estimatedDuration: insertGoal.estimatedDuration ?? null,
      targetDate: insertGoal.targetDate ?? null
    };
    this.goals.set(id, goal);
    return goal;
  }

  async getAllGoals(): Promise<Goal[]> {
    return Array.from(this.goals.values());
  }



  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;

    const goalProjects = await this.getProjectsByGoalId(id);
    const projectsWithTasks = await Promise.all(
      goalProjects.map(async (project) => {
        const projectTasks = await this.getTasksByProjectId(project.id);
        const tasksWithSubtasks = await Promise.all(
          projectTasks.map(async (task) => {
            const taskSubtasks = await this.getSubtasksByTaskId(task.id);
            return { ...task, subtasks: taskSubtasks };
          })
        );
        return { ...project, tasks: tasksWithSubtasks };
      })
    );

    return {
      ...goal,
      projects: projectsWithTasks
    };
  }

  async updateGoalApproval(id: number, approved: boolean): Promise<void> {
    const goal = this.goals.get(id);
    if (goal) {
      this.goals.set(id, { ...goal, approved });
    }
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (goal) {
      const updatedGoal = { ...goal, ...updates };
      this.goals.set(id, updatedGoal);
      return updatedGoal;
    }
    return undefined;
  }

  // Projects
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = { 
      ...insertProject, 
      id, 
      createdAt: new Date(),
      approved: insertProject.approved ?? false,
      urgency: insertProject.urgency ?? "medium"
    };
    this.projects.set(id, project);
    return project;
  }

  async getProjectsByGoalId(goalId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.goalId === goalId);
  }



  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const projectTasks = await this.getTasksByProjectId(id);
    const tasksWithSubtasks = await Promise.all(
      projectTasks.map(async (task) => {
        const taskSubtasks = await this.getSubtasksByTaskId(task.id);
        return { ...task, subtasks: taskSubtasks };
      })
    );

    return {
      ...project,
      tasks: tasksWithSubtasks
    };
  }

  async updateProjectApproval(id: number, approved: boolean): Promise<void> {
    const project = this.projects.get(id);
    if (project) {
      this.projects.set(id, { ...project, approved });
    }
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (project) {
      const updatedProject = { ...project, ...updates };
      this.projects.set(id, updatedProject);
      return updatedProject;
    }
    return undefined;
  }

  // Tasks
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: new Date(),
      completed: insertTask.completed ?? false,
      approved: insertTask.approved ?? false,
      urgency: insertTask.urgency ?? "medium",
      completedAt: null
    };
    this.tasks.set(id, task);
    return task;
  }

  async getTasksByProjectId(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(t => t.projectId === projectId);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }



  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const taskSubtasks = await this.getSubtasksByTaskId(id);
    return {
      ...task,
      subtasks: taskSubtasks
    };
  }

  async updateTaskCompletion(id: number, completed: boolean): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { 
        ...task, 
        completed,
        completedAt: completed ? new Date() : null
      });
    }
  }

  async updateTaskApproval(id: number, approved: boolean): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      this.tasks.set(id, { ...task, approved });
    }
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (task) {
      const updatedTask = { ...task, ...updates };
      this.tasks.set(id, updatedTask);
      return updatedTask;
    }
    return undefined;
  }

  // Subtasks
  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const id = this.currentSubtaskId++;
    const subtask: Subtask = { 
      ...insertSubtask, 
      id, 
      createdAt: new Date(),
      completed: insertSubtask.completed ?? false,
      approved: insertSubtask.approved ?? false,
      urgency: insertSubtask.urgency ?? "medium",
      completedAt: null,
      attachments: insertSubtask.attachments ?? null
    };
    this.subtasks.set(id, subtask);
    return subtask;
  }

  async getSubtasksByTaskId(taskId: number): Promise<(Subtask & { goalId?: number; projectId?: number })[]> {
    // For MemStorage, we need to manually join the data to get goalId and projectId
    const taskSubtasks = Array.from(this.subtasks.values()).filter(s => s.taskId === taskId);
    
    // Get the parent task and project info for navigation
    const task = this.tasks.get(taskId);
    let goalId: number | undefined;
    let projectId: number | undefined;
    
    if (task) {
      projectId = task.projectId;
      const project = this.projects.get(task.projectId);
      if (project) {
        goalId = project.goalId;
      }
    }
    
    // Add goalId and projectId to each subtask for navigation
    return taskSubtasks.map(subtask => ({
      ...subtask,
      goalId,
      projectId
    }));
  }



  async getSubtask(id: number): Promise<Subtask | undefined> {
    return this.subtasks.get(id);
  }

  async updateSubtaskCompletion(id: number, completed: boolean): Promise<void> {
    const subtask = this.subtasks.get(id);
    if (subtask) {
      this.subtasks.set(id, { 
        ...subtask, 
        completed,
        completedAt: completed ? new Date() : null
      });
    }
  }

  async updateSubtaskApproval(id: number, approved: boolean): Promise<void> {
    const subtask = this.subtasks.get(id);
    if (subtask) {
      this.subtasks.set(id, { ...subtask, approved });
    }
  }

  async updateSubtask(id: number, updates: Partial<Subtask>): Promise<Subtask | undefined> {
    const subtask = this.subtasks.get(id);
    if (subtask) {
      const updatedSubtask = { ...subtask, ...updates };
      this.subtasks.set(id, updatedSubtask);
      return updatedSubtask;
    }
    return undefined;
  }

  // Pending breakdowns
  async createPendingBreakdown(insertBreakdown: InsertPendingBreakdown): Promise<PendingBreakdown> {
    const id = this.currentPendingId++;
    const breakdown: PendingBreakdown = { 
      ...insertBreakdown, 
      id, 
      createdAt: new Date()
    };
    this.pendingBreakdowns.set(id, breakdown);
    return breakdown;
  }

  async getAllPendingBreakdowns(): Promise<PendingBreakdown[]> {
    return Array.from(this.pendingBreakdowns.values());
  }

  async getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined> {
    return this.pendingBreakdowns.get(id);
  }

  async deletePendingBreakdown(id: number): Promise<void> {
    this.pendingBreakdowns.delete(id);
  }

  // Delete methods for MemStorage with cascading
  async deleteGoal(id: number): Promise<void> {
    // Delete all projects and their children first
    const projectsToDelete = Array.from(this.projects.values()).filter(p => p.goalId === id);
    for (const project of projectsToDelete) {
      await this.deleteProject(project.id);
    }
    
    // Then delete the goal
    this.goals.delete(id);
  }

  async deleteProject(id: number): Promise<void> {
    // Delete all tasks and their children first
    const tasksToDelete = Array.from(this.tasks.values()).filter(t => t.projectId === id);
    for (const task of tasksToDelete) {
      await this.deleteTask(task.id);
    }
    
    // Then delete the project
    this.projects.delete(id);
  }

  async deleteTask(id: number): Promise<void> {
    // Delete all subtasks first
    const subtasksToDelete = Array.from(this.subtasks.values()).filter(s => s.taskId === id);
    for (const subtask of subtasksToDelete) {
      await this.deleteSubtask(subtask.id);
    }
    
    // Then delete the task
    this.tasks.delete(id);
  }

  async deleteSubtask(id: number): Promise<void> {
    this.subtasks.delete(id);
  }

  // Files
  async createFile(insertFile: InsertFile): Promise<number> {
    const id = this.currentFileId++;
    const file: File = { 
      ...insertFile, 
      id,
      createdAt: new Date()
    };
    this.files.set(id, file);
    return id;
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesForEntity(entityType: string, entityId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      file => file.entityType === entityType && file.entityId === entityId
    );
  }

  async deleteFile(id: number): Promise<void> {
    this.files.delete(id);
  }

  async getOptimizedDashboardData(userIds: number[]): Promise<{
    allTasks: any[];
    allSubtasks: any[];
  }> {
    // Simple implementation for MemStorage (fallback to regular methods)
    const allTasks = Array.from(this.tasks.values()).filter(task => 
      userIds.includes(task.assignedTo || 0)
    );
    const allSubtasks = Array.from(this.subtasks.values()).filter(subtask => 
      userIds.includes(subtask.assignedTo || 0)
    );
    
    return { allTasks, allSubtasks };
  }
}

export class DatabaseStorage implements IStorage {
  
  // Helper function for hierarchical share level access control
  private getEffectiveShareLevel(
    item: { shareLevel?: string | null }, 
    parentShareLevel: string = 'just_me'
  ): string {
    return item.shareLevel || parentShareLevel;
  }

  // Helper function to check if user can access item based on hierarchical share levels
  private async canUserAccessItem(
    userId: number, 
    effectiveShareLevel: string, 
    assignedTo: number, 
    createdBy: number
  ): Promise<boolean> {
    // Always allow access if user is assigned to or created the item
    if (userId === assignedTo || userId === createdBy) {
      return true;
    }

    // Handle different share levels
    switch (effectiveShareLevel) {
      case 'just_me':
        return false; // Only assigned/creator can see
      
      case 'my_team':
        // Check if users are on the same team
        const currentUser = await this.getUserById(userId);
        const assignedUser = await this.getUserById(assignedTo);
        return currentUser?.teamId !== null && 
               currentUser?.teamId === assignedUser?.teamId;
      
      case 'specific_people':
        // For now, treat same as just_me (can be enhanced later with viewers table)
        return false;
      
      default:
        return false; // Fail closed for unknown share levels
    }
  }

  // Users - implements IStorage interface
  async getUser(id: number): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<void> {
    await db.update(users).set(updates).where(eq(users.id, id));
  }



  // Goals
  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(insertGoal).returning();
    return goal;
  }

  async getAllGoals(): Promise<Goal[]> {
    return await db.select().from(goals);
  }



  async getAllGoalsWithProjects(): Promise<GoalWithProjects[]> {
    // Single optimized query with joins for all goals
    const result = await db
      .select({
        goalId: goals.id,
        goalTitle: goals.title,
        goalDescription: goals.description,
        goalCreatedAt: goals.createdAt,
        goalApproved: goals.approved,
        goalEstimatedDuration: goals.estimatedDuration,
        goalTargetDate: goals.targetDate,
        goalUrgency: goals.urgency,
        projectId: projects.id,
        projectTitle: projects.title,
        projectDescription: projects.description,
        projectCreatedAt: projects.createdAt,
        projectApproved: projects.approved,
        projectEstimatedDuration: projects.estimatedDuration,
        projectTargetDate: projects.targetDate,
        projectUrgency: projects.urgency,
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskDescription: tasks.description,
        taskCreatedAt: tasks.createdAt,
        taskCompleted: tasks.completed,
        taskApproved: tasks.approved,
        taskEstimatedHours: tasks.estimatedHours,
        taskDueDate: tasks.dueDate,
        taskUrgency: tasks.urgency,
        taskCompletedAt: tasks.completedAt,
        subtaskId: subtasks.id,
        subtaskTitle: subtasks.title,
        subtaskDescription: subtasks.description,
        subtaskCreatedAt: subtasks.createdAt,
        subtaskCompleted: subtasks.completed,
        subtaskApproved: subtasks.approved,
        subtaskEstimatedHours: subtasks.estimatedHours,
        subtaskDueDate: subtasks.dueDate,
        subtaskUrgency: subtasks.urgency,
        subtaskCompletedAt: subtasks.completedAt,
        subtaskAttachments: subtasks.attachments,
      })
      .from(goals)
      .leftJoin(projects, eq(goals.id, projects.goalId))
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .leftJoin(subtasks, eq(tasks.id, subtasks.taskId))
      .orderBy(goals.id, projects.id, tasks.id, subtasks.id);

    // Transform flat result into hierarchical structure
    const goalsMap = new Map<number, GoalWithProjects>();
    const projectsMap = new Map<number, any>();
    const tasksMap = new Map<number, any>();

    result.forEach(row => {
      // Build goal
      if (!goalsMap.has(row.goalId)) {
        goalsMap.set(row.goalId, {
          id: row.goalId,
          title: row.goalTitle,
          description: row.goalDescription,
          createdAt: row.goalCreatedAt,
          approved: row.goalApproved,
          estimatedDuration: row.goalEstimatedDuration,
          targetDate: row.goalTargetDate,
          urgency: row.goalUrgency,
          projects: []
        });
      }

      // Build project
      if (row.projectId && !projectsMap.has(row.projectId)) {
        const project = {
          id: row.projectId,
          title: row.projectTitle || '',
          description: row.projectDescription,
          goalId: row.goalId,
          createdAt: row.projectCreatedAt || new Date(),
          approved: row.projectApproved || false,
          estimatedDuration: row.projectEstimatedDuration,
          targetDate: row.projectTargetDate,
          urgency: row.projectUrgency || 'medium',
          tasks: []
        };
        projectsMap.set(row.projectId, project);
        goalsMap.get(row.goalId)!.projects.push(project);
      }

      // Build task
      if (row.taskId && !tasksMap.has(row.taskId)) {
        const task = {
          id: row.taskId,
          title: row.taskTitle || '',
          description: row.taskDescription || null,
          projectId: row.projectId || 0,
          createdAt: row.taskCreatedAt || new Date(),
          completed: row.taskCompleted || false,
          approved: row.taskApproved || false,
          estimatedHours: row.taskEstimatedHours || null,
          dueDate: row.taskDueDate || null,
          urgency: row.taskUrgency || 'medium',
          completedAt: row.taskCompletedAt || null,
          subtasks: []
        };
        tasksMap.set(row.taskId, task);
        if (row.projectId) {
          projectsMap.get(row.projectId)?.tasks.push(task);
        }
      }

      // Build subtask
      if (row.subtaskId) {
        const subtask = {
          id: row.subtaskId,
          title: row.subtaskTitle || '',
          description: row.subtaskDescription || null,
          taskId: row.taskId || 0,
          createdAt: row.subtaskCreatedAt || new Date(),
          completed: row.subtaskCompleted || false,
          approved: row.subtaskApproved || false,
          estimatedHours: row.subtaskEstimatedHours || null,
          dueDate: row.subtaskDueDate || null,
          urgency: row.subtaskUrgency || 'medium',
          completedAt: row.subtaskCompletedAt || null,
          attachments: row.subtaskAttachments || null,
        };
        if (row.taskId) {
          tasksMap.get(row.taskId)?.subtasks.push(subtask);
        }
      }
    });

    return Array.from(goalsMap.values());
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined> {
    // Single optimized query with joins
    const result = await db
      .select({
        goalId: goals.id,
        goalTitle: goals.title,
        goalDescription: goals.description,
        goalCreatedAt: goals.createdAt,
        goalApproved: goals.approved,
        goalEstimatedDuration: goals.estimatedDuration,
        goalTargetDate: goals.targetDate,
        goalUrgency: goals.urgency,
        projectId: projects.id,
        projectTitle: projects.title,
        projectDescription: projects.description,
        projectCreatedAt: projects.createdAt,
        projectApproved: projects.approved,
        projectEstimatedDuration: projects.estimatedDuration,
        projectTargetDate: projects.targetDate,
        projectUrgency: projects.urgency,
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskDescription: tasks.description,
        taskCreatedAt: tasks.createdAt,
        taskCompleted: tasks.completed,
        taskApproved: tasks.approved,
        taskEstimatedHours: tasks.estimatedHours,
        taskDueDate: tasks.dueDate,
        taskUrgency: tasks.urgency,
        taskCompletedAt: tasks.completedAt,
        subtaskId: subtasks.id,
        subtaskTitle: subtasks.title,
        subtaskDescription: subtasks.description,
        subtaskCreatedAt: subtasks.createdAt,
        subtaskCompleted: subtasks.completed,
        subtaskApproved: subtasks.approved,
        subtaskEstimatedHours: subtasks.estimatedHours,
        subtaskDueDate: subtasks.dueDate,
        subtaskUrgency: subtasks.urgency,
        subtaskCompletedAt: subtasks.completedAt,
        subtaskAttachments: subtasks.attachments,
      })
      .from(goals)
      .leftJoin(projects, eq(goals.id, projects.goalId))
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .leftJoin(subtasks, eq(tasks.id, subtasks.taskId))
      .where(eq(goals.id, id));

    if (result.length === 0) return undefined;

    // Transform flat result into hierarchical structure
    const goal = {
      id: result[0].goalId,
      title: result[0].goalTitle,
      description: result[0].goalDescription,
      createdAt: result[0].goalCreatedAt,
      approved: result[0].goalApproved,
      estimatedDuration: result[0].goalEstimatedDuration,
      targetDate: result[0].goalTargetDate,
      urgency: result[0].goalUrgency,
    };

    const projectsMap = new Map();
    const tasksMap = new Map();

    result.forEach(row => {
      if (row.projectId && !projectsMap.has(row.projectId)) {
        projectsMap.set(row.projectId, {
          id: row.projectId,
          title: row.projectTitle,
          description: row.projectDescription,
          goalId: row.goalId,
          createdAt: row.projectCreatedAt,
          approved: row.projectApproved,
          estimatedDuration: row.projectEstimatedDuration,
          targetDate: row.projectTargetDate,
          urgency: row.projectUrgency,
          tasks: []
        });
      }

      if (row.taskId && !tasksMap.has(row.taskId)) {
        const task = {
          id: row.taskId,
          title: row.taskTitle,
          description: row.taskDescription,
          projectId: row.projectId,
          createdAt: row.taskCreatedAt,
          completed: row.taskCompleted,
          approved: row.taskApproved,
          estimatedHours: row.taskEstimatedHours,
          dueDate: row.taskDueDate,
          urgency: row.taskUrgency,
          completedAt: row.taskCompletedAt,
          subtasks: []
        };
        tasksMap.set(row.taskId, task);
        if (row.projectId) {
          projectsMap.get(row.projectId)?.tasks.push(task);
        }
      }

      if (row.subtaskId) {
        const subtask = {
          id: row.subtaskId,
          title: row.subtaskTitle,
          description: row.subtaskDescription,
          taskId: row.taskId,
          createdAt: row.subtaskCreatedAt,
          completed: row.subtaskCompleted,
          approved: row.subtaskApproved,
          estimatedHours: row.subtaskEstimatedHours,
          dueDate: row.subtaskDueDate,
          urgency: row.subtaskUrgency,
          completedAt: row.subtaskCompletedAt,
          attachments: row.subtaskAttachments,
        };
        if (row.taskId) {
          tasksMap.get(row.taskId)?.subtasks.push(subtask);
        }
      }
    });

    return {
      ...goal,
      projects: Array.from(projectsMap.values())
    };
  }

  async updateGoalApproval(id: number, approved: boolean): Promise<void> {
    await db.update(goals).set({ approved }).where(eq(goals.id, id));
  }

  async deleteGoal(id: number): Promise<void> {
    // First delete all projects and their children
    const projectsToDelete = await this.getProjectsByGoalId(id);
    for (const project of projectsToDelete) {
      await this.deleteProject(project.id);
    }
    
    // Then delete the goal
    await db.delete(goals).where(eq(goals.id, id));
  }

  // Projects
  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async getProjectsByGoalId(goalId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.goalId, goalId));
  }



  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;

    const projectTasks = await this.getTasksByProjectId(id);
    const tasksWithSubtasks = await Promise.all(
      projectTasks.map(async (task) => {
        const taskSubtasks = await this.getSubtasksByTaskId(task.id);
        return { ...task, subtasks: taskSubtasks };
      })
    );

    return {
      ...project,
      tasks: tasksWithSubtasks
    };
  }

  async updateProjectApproval(id: number, approved: boolean): Promise<void> {
    await db.update(projects).set({ approved }).where(eq(projects.id, id));
  }

  async deleteProject(id: number): Promise<void> {
    // First delete all tasks and their children
    const tasksToDelete = await this.getTasksByProjectId(id);
    for (const task of tasksToDelete) {
      await this.deleteTask(task.id);
    }
    
    // Then delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Tasks
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async getTasksByProjectId(projectId: number): Promise<Task[]> {
    // Get tasks with complete hierarchy information
    const tasksWithHierarchy = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        projectId: tasks.projectId,
        assignedTo: tasks.assignedTo,
        createdBy: tasks.createdBy,
        status: tasks.status,
        priority: tasks.priority,
        percentComplete: tasks.percentComplete,
        deadline: tasks.deadline,
        timeEstimate: tasks.timeEstimate,
        timeActual: tasks.timeActual,
        estimatedDays: tasks.estimatedDays,
        shareLevel: tasks.shareLevel,
        urgency: tasks.urgency,
        dependencies: tasks.dependencies,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        // Include hierarchy information
        goalId: projects.goalId,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.projectId, projectId));

    return tasksWithHierarchy;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;

    const taskSubtasks = await this.getSubtasksByTaskId(id);
    return {
      ...task,
      subtasks: taskSubtasks
    };
  }

  async updateTaskCompletion(id: number, completed: boolean): Promise<void> {
    await db.update(tasks).set({ 
      completed,
      completedAt: completed ? new Date() : null
    }).where(eq(tasks.id, id));
  }

  async updateTaskApproval(id: number, approved: boolean): Promise<void> {
    await db.update(tasks).set({ approved }).where(eq(tasks.id, id));
  }

  async deleteTask(id: number): Promise<void> {
    // First delete all subtasks
    const subtasksToDelete = await this.getSubtasksByTaskId(id);
    for (const subtask of subtasksToDelete) {
      await this.deleteSubtask(subtask.id);
    }
    
    // Then delete the task
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Subtasks
  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const [subtask] = await db.insert(subtasks).values(insertSubtask).returning();
    return subtask;
  }

  async getSubtasksByTaskId(taskId: number): Promise<(Subtask & { goalId?: number; projectId?: number })[]> {
    // Get subtasks with parent hierarchy info for navigation
    const result = await db
      .select({
        ...getTableColumns(subtasks),
        goalId: projects.goalId,
        projectId: tasks.projectId,
      })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(subtasks.taskId, taskId));
    
    return result;
  }



  async getSubtask(id: number): Promise<Subtask | undefined> {
    const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, id));
    return subtask || undefined;
  }

  async updateSubtaskCompletion(id: number, completed: boolean): Promise<void> {
    await db.update(subtasks).set({ 
      completed,
      completedAt: completed ? new Date() : null
    }).where(eq(subtasks.id, id));
  }

  async updateSubtaskApproval(id: number, approved: boolean): Promise<void> {
    await db.update(subtasks).set({ approved }).where(eq(subtasks.id, id));
  }

  async deleteSubtask(id: number): Promise<void> {
    await db.delete(subtasks).where(eq(subtasks.id, id));
  }

  // Pending breakdowns
  async createPendingBreakdown(insertBreakdown: InsertPendingBreakdown): Promise<PendingBreakdown> {
    const [breakdown] = await db.insert(pendingBreakdowns).values(insertBreakdown).returning();
    return breakdown;
  }

  async getAllPendingBreakdowns(): Promise<PendingBreakdown[]> {
    return await db.select().from(pendingBreakdowns);
  }

  async getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined> {
    const [breakdown] = await db.select().from(pendingBreakdowns).where(eq(pendingBreakdowns.id, id));
    return breakdown || undefined;
  }

  async deletePendingBreakdown(id: number): Promise<void> {
    await db.delete(pendingBreakdowns).where(eq(pendingBreakdowns.id, id));
  }

  // Teams
  async getTeamMembers(teamId: number): Promise<User[]> {
    console.log('STORAGE: Getting team members for teamId:', teamId);
    try {
      // Try raw SQL to debug
      const rawMembers = await db.execute(sql`SELECT * FROM users WHERE team_id = ${teamId}`);
      console.log('STORAGE: Raw SQL result:', rawMembers.rows);
      
      // Also try Drizzle query
      const members = await db.select().from(users).where(eq(users.teamId, teamId));
      console.log('STORAGE: Drizzle result:', members.length, members.map(m => ({ id: m.id, email: m.email, teamId: m.teamId })));
      return members;
    } catch (error) {
      console.error('STORAGE: Error in getTeamMembers:', error);
      throw error;
    }
  }

  async getTeamMemberIds(teamId: number): Promise<number[]> {
    console.log('STORAGE: Getting team member IDs for teamId:', teamId);
    try {
      const members = await db.select({ id: users.id }).from(users).where(eq(users.teamId, teamId));
      const memberIds = members.map(m => m.id);
      console.log('STORAGE: Team member IDs:', memberIds);
      return memberIds;
    } catch (error) {
      console.error('STORAGE: Error in getTeamMemberIds:', error);
      throw error;
    }
  }

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.inviteCode, inviteCode));
    return user || undefined;
  }

  async joinTeamByInviteCode(userId: number, inviteCode: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find the user who owns this invite code
      const inviter = await this.getUserByInviteCode(inviteCode);
      if (!inviter) {
        return { success: false, message: "Invalid invite code" };
      }

      // Update the joining user's team to match the inviter's team
      await db.update(users)
        .set({ teamId: inviter.teamId })
        .where(eq(users.id, userId));

      return { success: true, message: "Successfully joined team" };
    } catch (error) {
      console.error("Error joining team:", error);
      return { success: false, message: "Failed to join team" };
    }
  }
  // Update methods for DatabaseStorage
  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    try {
      console.log('Updating goal', id, 'with updates:', updates);
      
      // Sanitize updates to only include valid fields
      const validUpdates: any = {};
      const allowedFields = ['title', 'description', 'shareLevel', 'teamId', 'assignedTo', 'status', 'priority', 'percentComplete', 'deadline', 'timeEstimate', 'timeActual', 'estimatedDays'];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          // Special handling for date fields
          if (key === 'deadline' && typeof value === 'string') {
            // Validate and convert date string to proper Date object
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
              console.error(`Invalid date value for ${key}:`, value);
              continue; // Skip invalid dates
            }
            validUpdates[key] = dateObj;
          } else {
            validUpdates[key] = value;
          }
        }
      }
      
      console.log('Sanitized updates:', validUpdates);
      
      const [updated] = await db.update(goals).set(validUpdates).where(eq(goals.id, id)).returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error in updateGoal:', error);
      throw error;
    }
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    try {
      console.log('Updating project', id, 'with updates:', updates);
      
      // Sanitize updates to only include valid fields
      const validUpdates: any = {};
      const allowedFields = ['title', 'description', 'shareLevel', 'assignedTo', 'status', 'priority', 'percentComplete', 'deadline', 'timeEstimate', 'timeActual', 'estimatedDays', 'urgency'];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          // Special handling for date fields
          if (key === 'deadline' && typeof value === 'string') {
            // Validate and convert date string to proper Date object
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
              console.error(`Invalid date value for ${key}:`, value);
              continue; // Skip invalid dates
            }
            validUpdates[key] = dateObj;
          } else {
            validUpdates[key] = value;
          }
        }
      }
      
      console.log('Sanitized updates:', validUpdates);
      
      const [updated] = await db.update(projects).set(validUpdates).where(eq(projects.id, id)).returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error in updateProject:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    try {
      console.log('Updating task', id, 'with updates:', updates);
      
      // Sanitize updates to only include valid fields
      const validUpdates: any = {};
      const allowedFields = ['title', 'description', 'shareLevel', 'assignedTo', 'status', 'priority', 'percentComplete', 'deadline', 'timeEstimate', 'timeActual', 'estimatedDays', 'dependencies', 'completed'];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          // Special handling for date fields
          if (key === 'deadline' && typeof value === 'string') {
            // Validate and convert date string to proper Date object
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
              console.error(`Invalid date value for ${key}:`, value);
              continue; // Skip invalid dates
            }
            validUpdates[key] = dateObj;
          } else {
            validUpdates[key] = value;
          }
        }
      }
      
      console.log('Sanitized updates:', validUpdates);
      
      const [updated] = await db.update(tasks).set(validUpdates).where(eq(tasks.id, id)).returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error in updateTask:', error);
      throw error;
    }
  }

  async updateSubtask(id: number, updates: Partial<Subtask>): Promise<Subtask | undefined> {
    try {
      console.log('Updating subtask', id, 'with updates:', updates);
      
      // Sanitize updates to only include valid fields
      const validUpdates: any = {};
      const allowedFields = ['title', 'description', 'shareLevel', 'assignedTo', 'status', 'priority', 'percentComplete', 'deadline', 'timeEstimate', 'timeActual', 'estimatedDays', 'completed'];
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          // Special handling for date fields
          if (key === 'deadline' && typeof value === 'string') {
            // Validate and convert date string to proper Date object
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) {
              console.error(`Invalid date value for ${key}:`, value);
              continue; // Skip invalid dates
            }
            validUpdates[key] = dateObj;
          } else {
            validUpdates[key] = value;
          }
        }
      }
      
      console.log('Sanitized updates:', validUpdates);
      
      const [updated] = await db.update(subtasks).set(validUpdates).where(eq(subtasks.id, id)).returning();
      return updated || undefined;
    } catch (error) {
      console.error('Error in updateSubtask:', error);
      throw error;
    }
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }



  // Optimized dashboard data - uses database-level filtering 
  async getOptimizedDashboardData(userIds: number[]): Promise<{
    allTasks: any[];
    allSubtasks: any[];
  }> {
    try {
      if (userIds.length === 0) {
        return { allTasks: [], allSubtasks: [] };
      }

      // Step 1: Get filtered tasks efficiently
      const filteredTasks = await db
        .select()
        .from(tasks)
        .where(sql`${tasks.assignedTo} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

      // Step 2: Get filtered subtasks efficiently  
      const filteredSubtasks = await db
        .select()
        .from(subtasks)
        .where(sql`${subtasks.assignedTo} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

      // Step 3: Get unique project and goal IDs from tasks
      const projectIds = [...new Set(filteredTasks.map(t => t.projectId))];
      const taskIds = [...new Set(filteredTasks.map(t => t.id))];

      // Step 4: Batch fetch projects and goals
      const projectsMap = new Map();
      const goalsMap = new Map();

      if (projectIds.length > 0) {
        const batchProjects = await db
          .select()
          .from(projects)
          .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
        
        batchProjects.forEach(project => projectsMap.set(project.id, project));

        const goalIds = [...new Set(batchProjects.map(p => p.goalId))];
        if (goalIds.length > 0) {
          const batchGoals = await db
            .select()
            .from(goals)
            .where(sql`${goals.id} IN (${sql.join(goalIds.map(id => sql`${id}`), sql`, `)})`);
          
          batchGoals.forEach(goal => goalsMap.set(goal.id, goal));
        }
      }

      // Step 5: Enrich tasks with context
      const enrichedTasks = filteredTasks.map(task => {
        const project = projectsMap.get(task.projectId);
        const goal = project ? goalsMap.get(project.goalId) : null;
        
        return {
          ...task,
          goalId: goal?.id,
          projectId: project?.id,
          goal: goal || null,
          project: project || null
        };
      });

      // Step 6: Batch fetch parent tasks for subtasks
      const parentTasksMap = new Map();
      const subtaskTaskIds = [...new Set(filteredSubtasks.map(s => s.taskId))];
      
      if (subtaskTaskIds.length > 0) {
        const batchTasks = await db
          .select()
          .from(tasks)
          .where(sql`${tasks.id} IN (${sql.join(subtaskTaskIds.map(id => sql`${id}`), sql`, `)})`);
        
        batchTasks.forEach(task => parentTasksMap.set(task.id, task));
      }

      // Step 7: Enrich subtasks with context
      const enrichedSubtasks = filteredSubtasks.map(subtask => {
        const task = parentTasksMap.get(subtask.taskId);
        const project = task ? projectsMap.get(task.projectId) : null;
        const goal = project ? goalsMap.get(project.goalId) : null;
        
        return {
          ...subtask,
          goalId: goal?.id,
          projectId: project?.id,
          taskId: task?.id,
          goal: goal || null,
          project: project || null,
          task: task || null
        };
      });

      return {
        allTasks: enrichedTasks,
        allSubtasks: enrichedSubtasks
      };
    } catch (error) {
      console.error('Error in getOptimizedDashboardData:', error);
      throw error;
    }
  }

  // HIERARCHICAL SHARE LEVEL ACCESS CONTROL - Fixes User 9 security vulnerability
  async getGoalsForUser(userId: number): Promise<Goal[]> {
    console.log(`STORAGE: Getting goals for user ${userId} (hierarchical share level access)`);
    
    // Get user's team information
    const user = await this.getUser(userId);
    if (!user) {
      console.log(`STORAGE: User ${userId} not found, returning empty goals`);
      return [];
    }
    
    // Get all goals and filter by hierarchical access control
    const allGoals = await db.select().from(goals);
    const accessibleGoals: Goal[] = [];
    
    for (const goal of allGoals) {
      const effectiveShareLevel = this.getEffectiveShareLevel(goal, 'just_me');
      const canAccess = await this.canUserAccessItem(
        userId, 
        effectiveShareLevel, 
        goal.assignedTo, 
        goal.createdBy
      );
      
      if (canAccess) {
        accessibleGoals.push(goal);
      }
    }
    
    console.log(`STORAGE: User ${userId} can access ${accessibleGoals.length} of ${allGoals.length} total goals`);
    console.log(`STORAGE: Accessible goal IDs: [${accessibleGoals.map(g => g.id).join(', ')}]`);
    return accessibleGoals;
  }

  async getProjectsForUser(userId: number): Promise<Project[]> {
    console.log(`STORAGE: Getting projects for user ${userId} (hierarchical access)`);
    
    // Get user's accessible goals first
    const accessibleGoals = await this.getGoalsForUser(userId);
    const goalIds = accessibleGoals.map(g => g.id);
    
    if (goalIds.length === 0) {
      console.log(`STORAGE: No accessible goals, returning empty projects for user ${userId}`);
      return [];
    }
    
    // Get projects for accessible goals
    const goalProjects = await db.select().from(projects).where(
      sql`${projects.goalId} IN (${sql.join(goalIds.map(id => sql`${id}`), sql`, `)})`
    );
    
    // Filter projects by hierarchical share level (may override goal's share level)
    const accessibleProjects: Project[] = [];
    
    for (const project of goalProjects) {
      // Find parent goal to get its share level
      const parentGoal = accessibleGoals.find(g => g.id === project.goalId);
      const parentShareLevel = parentGoal?.shareLevel || 'just_me';
      
      const effectiveShareLevel = this.getEffectiveShareLevel(project, parentShareLevel);
      const canAccess = await this.canUserAccessItem(
        userId, 
        effectiveShareLevel, 
        project.assignedTo, 
        project.createdBy
      );
      
      if (canAccess) {
        accessibleProjects.push(project);
      }
    }
    
    console.log(`STORAGE: User ${userId} can access ${accessibleProjects.length} of ${goalProjects.length} goal projects`);
    return accessibleProjects;
  }

  async getTasksForUser(userId: number): Promise<Task[]> {
    console.log(`STORAGE: Getting tasks for user ${userId} (hierarchical access)`);
    
    // Get user's accessible projects first
    const accessibleProjects = await this.getProjectsForUser(userId);
    const projectIds = accessibleProjects.map(p => p.id);
    
    if (projectIds.length === 0) {
      console.log(`STORAGE: No accessible projects, returning empty tasks for user ${userId}`);
      return [];
    }
    
    // Get tasks for accessible projects with hierarchy information
    const projectTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        projectId: tasks.projectId,
        assignedTo: tasks.assignedTo,
        createdBy: tasks.createdBy,
        status: tasks.status,
        priority: tasks.priority,
        percentComplete: tasks.percentComplete,
        deadline: tasks.deadline,
        timeEstimate: tasks.timeEstimate,
        timeActual: tasks.timeActual,
        estimatedDays: tasks.estimatedDays,
        shareLevel: tasks.shareLevel,
        urgency: tasks.urgency,
        dependencies: tasks.dependencies,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        // Include hierarchy information
        goalId: projects.goalId,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(
        sql`${tasks.projectId} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`
      );
    
    // Filter tasks by hierarchical share level (may override project/goal share level)
    const accessibleTasks: Task[] = [];
    
    for (const task of projectTasks) {
      // Find parent project and goal to get their share levels
      const parentProject = accessibleProjects.find(p => p.id === task.projectId);
      let parentShareLevel = 'just_me';
      
      if (parentProject) {
        // Get goal's share level through accessible goals
        const accessibleGoals = await this.getGoalsForUser(userId);
        const parentGoal = accessibleGoals.find(g => g.id === parentProject.goalId);
        const goalShareLevel = parentGoal?.shareLevel || 'just_me';
        parentShareLevel = this.getEffectiveShareLevel(parentProject, goalShareLevel);
      }
      
      const effectiveShareLevel = this.getEffectiveShareLevel(task, parentShareLevel);
      const canAccess = await this.canUserAccessItem(
        userId, 
        effectiveShareLevel, 
        task.assignedTo, 
        task.createdBy
      );
      
      if (canAccess) {
        accessibleTasks.push(task);
      }
    }
    
    console.log(`STORAGE: User ${userId} can access ${accessibleTasks.length} of ${projectTasks.length} project tasks`);
    return accessibleTasks;
  }

  async getSubtasksForUser(userId: number): Promise<Subtask[]> {
    console.log(`STORAGE: Getting subtasks for user ${userId} (hierarchical access)`);
    
    // Get user's accessible tasks first
    const accessibleTasks = await this.getTasksForUser(userId);
    const taskIds = accessibleTasks.map(t => t.id);
    
    if (taskIds.length === 0) {
      console.log(`STORAGE: No accessible tasks, returning empty subtasks for user ${userId}`);
      return [];
    }
    
    // Get subtasks for accessible tasks
    const taskSubtasks = await db.select().from(subtasks).where(
      sql`${subtasks.taskId} IN (${sql.join(taskIds.map(id => sql`${id}`), sql`, `)})`
    );
    
    // Filter subtasks by hierarchical share level (may override task/project/goal share level)
    const accessibleSubtasks: Subtask[] = [];
    
    for (const subtask of taskSubtasks) {
      // Find parent task, project, and goal to get their share levels
      const parentTask = accessibleTasks.find(t => t.id === subtask.taskId);
      let parentShareLevel = 'just_me';
      
      if (parentTask) {
        // Get project and goal share levels through accessible items
        const accessibleProjects = await this.getProjectsForUser(userId);
        const accessibleGoals = await this.getGoalsForUser(userId);
        
        const parentProject = accessibleProjects.find(p => p.id === parentTask.projectId);
        const parentGoal = parentProject ? accessibleGoals.find(g => g.id === parentProject.goalId) : null;
        
        const goalShareLevel = parentGoal?.shareLevel || 'just_me';
        const projectShareLevel = this.getEffectiveShareLevel(parentProject, goalShareLevel);
        parentShareLevel = this.getEffectiveShareLevel(parentTask, projectShareLevel);
      }
      
      const effectiveShareLevel = this.getEffectiveShareLevel(subtask, parentShareLevel);
      const canAccess = await this.canUserAccessItem(
        userId, 
        effectiveShareLevel, 
        subtask.assignedTo, 
        subtask.createdBy
      );
      
      if (canAccess) {
        accessibleSubtasks.push(subtask);
      }
    }
    
    console.log(`STORAGE: User ${userId} can access ${accessibleSubtasks.length} of ${taskSubtasks.length} task subtasks`);
    return accessibleSubtasks;
  }

  // Helper method to check if user can access a specific goal
  async canUserAccessGoal(userId: number, goalId: number): Promise<boolean> {
    const goal = await this.getGoal(goalId);
    if (!goal) return false;
    
    const user = await this.getUser(userId);
    if (!user) return false;
    
    // Personal goal: user must be assigned
    if (!goal.teamId) {
      return goal.assignedTo === userId;
    }
    
    // Team goal: user must be in same team
    return user.teamId === goal.teamId;
  }

  // Files
  async createFile(insertFile: InsertFile): Promise<File> {
    const [created] = await db.insert(files).values({
      ...insertFile,
      createdAt: new Date()
    }).returning();
    return created;
  }

  async getFileById(id: number): Promise<File | undefined> {
    const [result] = await db.select().from(files).where(eq(files.id, id));
    return result;
  }

  async getFile(id: number): Promise<File | undefined> {
    const [result] = await db.select().from(files).where(eq(files.id, id));
    return result;
  }

  async getFilesForEntity(entityType: string, entityId: number, userId?: number): Promise<File[]> {
    return await db.select().from(files).where(
      and(eq(files.entityType, entityType), eq(files.entityId, entityId))
    );
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<void> {
    await db.update(files).set(updates).where(eq(files.id, id));
  }

  async deleteFile(id: number): Promise<void> {
    console.log('STORAGE: Deleting file', id, 'with cascade cleanup');
    
    // Delete file activity records first (foreign key dependency)
    await db.delete(fileActivity).where(eq(fileActivity.fileId, id));
    console.log('STORAGE: Deleted file activity records for file', id);
    
    // Delete file comments (foreign key dependency)  
    await db.delete(fileComments).where(eq(fileComments.fileId, id));
    console.log('STORAGE: Deleted file comments for file', id);
    
    // Now delete the file itself
    await db.delete(files).where(eq(files.id, id));
    console.log('STORAGE: Successfully deleted file', id);
  }

  // File collaboration methods
  async createFileComment(comment: { fileId: number; userId: number; content: string; mentions?: number[] }): Promise<any> {
    const result = await db.insert(fileComments).values(comment).returning();
    return result[0];
  }

  async getFileComments(fileId: number): Promise<any[]> {
    try {
      console.log('STORAGE: Getting comments for fileId:', fileId);
      const result = await db
        .select({
          id: fileComments.id,
          content: fileComments.content,
          mentions: fileComments.mentions,
          createdAt: fileComments.createdAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
        })
        .from(fileComments)
        .leftJoin(users, eq(fileComments.userId, users.id))
        .where(eq(fileComments.fileId, fileId))
        .orderBy(fileComments.createdAt);
      console.log('STORAGE: Found comments:', result.length);
      return result;
    } catch (error) {
      console.error('STORAGE ERROR in getFileComments:', error);
      return [];
    }
  }

  async logFileActivity(activity: { fileId: number; userId: number; type: string; content?: string; metadata?: any }): Promise<void> {
    await db.insert(fileActivity).values(activity);
  }

  async getFileActivity(fileId: number): Promise<any[]> {
    try {
      console.log('STORAGE: Getting activity for fileId:', fileId);
      const result = await db
        .select({
          id: fileActivity.id,
          type: fileActivity.type,
          content: fileActivity.content,
          metadata: fileActivity.metadata,
          createdAt: fileActivity.createdAt,
          user: {
            id: users.id,
            displayName: users.displayName,
            email: users.email,
          },
        })
        .from(fileActivity)
        .leftJoin(users, eq(fileActivity.userId, users.id))
        .where(eq(fileActivity.fileId, fileId))
        .orderBy(fileActivity.createdAt);
      console.log('STORAGE: Found activities:', result.length);
      return result;
    } catch (error) {
      console.error('STORAGE ERROR in getFileActivity:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();