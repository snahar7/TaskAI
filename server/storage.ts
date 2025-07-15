import { 
  users, goals, projects, tasks, subtasks, pendingBreakdowns, teams, categories, tags,
  type User, type InsertUser,
  type Goal, type InsertGoal,
  type Project, type InsertProject, 
  type Task, type InsertTask,
  type Subtask, type InsertSubtask,
  type PendingBreakdown, type InsertPendingBreakdown,
  type Team, type InsertTeam,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type GoalWithProjects, type ProjectWithTasks, type TaskWithSubtasks
} from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<void>;
  
  // Teams
  getTeamMembers(teamId: number): Promise<User[]>;
  getUserByInviteCode(inviteCode: string): Promise<User | undefined>;
  joinTeamByInviteCode(userId: number, inviteCode: string): Promise<{ success: boolean; message: string }>;
  
  // Goals
  createGoal(goal: InsertGoal): Promise<Goal>;
  getAllGoals(): Promise<Goal[]>;
  getAccessibleGoals(userIds: number[]): Promise<Goal[]>; // Privacy-filtered goals
  getGoal(id: number): Promise<Goal | undefined>;
  getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined>;
  updateGoalApproval(id: number, approved: boolean): Promise<void>;
  deleteGoal(id: number): Promise<void>;
  
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProjectsByGoalId(goalId: number): Promise<Project[]>;
  getAccessibleProjectsByGoalId(goalId: number, userIds: number[]): Promise<Project[]>; // Privacy-filtered projects
  getProject(id: number): Promise<Project | undefined>;
  getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined>;
  updateProjectApproval(id: number, approved: boolean): Promise<void>;
  deleteProject(id: number): Promise<void>;
  
  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  getTasksByProjectId(projectId: number): Promise<Task[]>;
  getAccessibleTasksByProjectId(projectId: number, userIds: number[]): Promise<Task[]>; // Privacy-filtered tasks
  getAllTasks(): Promise<Task[]>;
  getAccessibleTasks(userIds: number[]): Promise<Task[]>; // Privacy-filtered all tasks
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined>;
  updateTaskCompletion(id: number, completed: boolean): Promise<void>;
  updateTaskApproval(id: number, approved: boolean): Promise<void>;
  deleteTask(id: number): Promise<void>;
  
  // Subtasks
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  getSubtasksByTaskId(taskId: number): Promise<Subtask[]>;
  getAccessibleSubtasksByTaskId(taskId: number, userIds: number[]): Promise<Subtask[]>; // Privacy-filtered subtasks
  getSubtask(id: number): Promise<Subtask | undefined>;
  updateSubtaskCompletion(id: number, completed: boolean): Promise<void>;
  updateSubtaskApproval(id: number, approved: boolean): Promise<void>;
  deleteSubtask(id: number): Promise<void>;
  
  // Pending breakdowns
  createPendingBreakdown(breakdown: InsertPendingBreakdown): Promise<PendingBreakdown>;
  getAllPendingBreakdowns(): Promise<PendingBreakdown[]>;
  getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined>;
  deletePendingBreakdown(id: number): Promise<void>;
  
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
  private currentUserId: number;
  private currentGoalId: number;
  private currentProjectId: number;
  private currentTaskId: number;
  private currentSubtaskId: number;
  private currentPendingId: number;

  constructor() {
    this.users = new Map();
    this.goals = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.subtasks = new Map();
    this.pendingBreakdowns = new Map();
    this.currentUserId = 1;
    this.currentGoalId = 1;
    this.currentProjectId = 1;
    this.currentTaskId = 1;
    this.currentSubtaskId = 1;
    this.currentPendingId = 1;
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
  
  // Privacy-filtered goals - only show goals assigned to accessible users
  async getAccessibleGoals(userIds: number[]): Promise<Goal[]> {
    if (userIds.length === 0) return [];
    return Array.from(this.goals.values()).filter(goal => 
      goal.assignedTo && userIds.includes(goal.assignedTo)
    );
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
  
  // Privacy-filtered projects - only show projects assigned to accessible users
  async getAccessibleProjectsByGoalId(goalId: number, userIds: number[]): Promise<Project[]> {
    if (userIds.length === 0) return [];
    return Array.from(this.projects.values()).filter(project => 
      project.goalId === goalId && project.assignedTo && userIds.includes(project.assignedTo)
    );
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
  
  // Privacy-filtered tasks by project
  async getAccessibleTasksByProjectId(projectId: number, userIds: number[]): Promise<Task[]> {
    if (userIds.length === 0) return [];
    return Array.from(this.tasks.values()).filter(task => 
      task.projectId === projectId && task.assignedTo && userIds.includes(task.assignedTo)
    );
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

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return Array.from(this.subtasks.values()).filter(s => s.taskId === taskId);
  }
  
  // Privacy-filtered subtasks by task
  async getAccessibleSubtasksByTaskId(taskId: number, userIds: number[]): Promise<Subtask[]> {
    if (userIds.length === 0) return [];
    return Array.from(this.subtasks.values()).filter(subtask => 
      subtask.taskId === taskId && subtask.assignedTo && userIds.includes(subtask.assignedTo)
    );
  }
  
  // Get all tasks
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  // Privacy-filtered all tasks - only show tasks assigned to accessible users
  async getAccessibleTasks(userIds: number[]): Promise<Task[]> {
    if (userIds.length === 0) return [];
    return Array.from(this.tasks.values()).filter(task => 
      task.assignedTo && userIds.includes(task.assignedTo)
    );
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
  
  // Privacy-filtered goals - only show goals assigned to accessible users
  async getAccessibleGoals(userIds: number[]): Promise<Goal[]> {
    if (userIds.length === 0) return [];
    
    return await db.select().from(goals).where(
      sql`assigned_to = ANY(${userIds})`
    );
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
  
  // Privacy-filtered projects - only show projects assigned to accessible users
  async getAccessibleProjectsByGoalId(goalId: number, userIds: number[]): Promise<Project[]> {
    if (userIds.length === 0) return [];
    
    return await db.select().from(projects).where(
      sql`goal_id = ${goalId} AND assigned_to = ANY(${userIds})`
    );
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
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }
  
  // Privacy-filtered tasks by project
  async getAccessibleTasksByProjectId(projectId: number, userIds: number[]): Promise<Task[]> {
    if (userIds.length === 0) return [];
    
    return await db.select().from(tasks).where(
      sql`project_id = ${projectId} AND assigned_to = ANY(${userIds})`
    );
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

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
  }
  
  // Privacy-filtered subtasks by task
  async getAccessibleSubtasksByTaskId(taskId: number, userIds: number[]): Promise<Subtask[]> {
    if (userIds.length === 0) return [];
    
    return await db.select().from(subtasks).where(
      sql`task_id = ${taskId} AND assigned_to = ANY(${userIds})`
    );
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
    const [updated] = await db.update(goals).set(updates).where(eq(goals.id, id)).returning();
    return updated || undefined;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return updated || undefined;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated || undefined;
  }

  async updateSubtask(id: number, updates: Partial<Subtask>): Promise<Subtask | undefined> {
    const [updated] = await db.update(subtasks).set(updates).where(eq(subtasks.id, id)).returning();
    return updated || undefined;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }
  
  // Privacy-filtered all tasks - only show tasks assigned to accessible users
  async getAccessibleTasks(userIds: number[]): Promise<Task[]> {
    if (userIds.length === 0) return [];
    
    return await db.select().from(tasks).where(
      sql`assigned_to = ANY(${userIds})`
    );
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

}

export const storage = new DatabaseStorage();