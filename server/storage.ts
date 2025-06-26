import { 
  users, goals, projects, tasks, subtasks, pendingBreakdowns,
  type User, type InsertUser,
  type Goal, type InsertGoal,
  type Project, type InsertProject, 
  type Task, type InsertTask,
  type Subtask, type InsertSubtask,
  type PendingBreakdown, type InsertPendingBreakdown,
  type GoalWithProjects, type ProjectWithTasks, type TaskWithSubtasks
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Goals
  createGoal(goal: InsertGoal): Promise<Goal>;
  getAllGoals(): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined>;
  updateGoalApproval(id: number, approved: boolean): Promise<void>;
  
  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProjectsByGoalId(goalId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined>;
  updateProjectApproval(id: number, approved: boolean): Promise<void>;
  
  // Tasks
  createTask(task: InsertTask): Promise<Task>;
  getTasksByProjectId(projectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined>;
  updateTaskCompletion(id: number, completed: boolean): Promise<void>;
  updateTaskApproval(id: number, approved: boolean): Promise<void>;
  
  // Subtasks
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  getSubtasksByTaskId(taskId: number): Promise<Subtask[]>;
  getSubtask(id: number): Promise<Subtask | undefined>;
  updateSubtaskCompletion(id: number, completed: boolean): Promise<void>;
  updateSubtaskApproval(id: number, approved: boolean): Promise<void>;
  
  // Pending breakdowns
  createPendingBreakdown(breakdown: InsertPendingBreakdown): Promise<PendingBreakdown>;
  getAllPendingBreakdowns(): Promise<PendingBreakdown[]>;
  getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined>;
  deletePendingBreakdown(id: number): Promise<void>;
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
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Goals
  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(insertGoal).returning();
    return goal;
  }

  async getAllGoals(): Promise<Goal[]> {
    return await db.select().from(goals);
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined> {
    const goal = await this.getGoal(id);
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
    await db.update(goals).set({ approved }).where(eq(goals.id, id));
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

  // Tasks
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async getTasksByProjectId(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
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

  // Subtasks
  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const [subtask] = await db.insert(subtasks).values(insertSubtask).returning();
    return subtask;
  }

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
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
}

export const storage = new DatabaseStorage();