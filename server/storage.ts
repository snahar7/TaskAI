import { users, tasks, subtasks, type User, type InsertUser, type Task, type InsertTask, type Subtask, type InsertSubtask, type TaskWithSubtasks } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createTask(task: InsertTask): Promise<Task>;
  getAllTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined>;
  
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  getSubtask(id: number): Promise<Subtask | undefined>;
  getSubtasksByTaskId(taskId: number): Promise<Subtask[]>;
  updateSubtaskCompletion(id: number, completed: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private subtasks: Map<number, Subtask>;
  private currentUserId: number;
  private currentTaskId: number;
  private currentSubtaskId: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.subtasks = new Map();
    this.currentUserId = 1;
    this.currentTaskId = 1;
    this.currentSubtaskId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask, 
      id, 
      category: insertTask.category || null,
      targetDate: insertTask.targetDate || null,
      createdAt: new Date(),
      completed: false 
    };
    this.tasks.set(id, task);
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const id = this.currentSubtaskId++;
    const subtask: Subtask = { 
      ...insertSubtask, 
      id,
      description: insertSubtask.description || null,
      dueDate: insertSubtask.dueDate || null,
      estimatedHours: insertSubtask.estimatedHours || null,
      completed: false,
      completedAt: null,
      createdAt: new Date()
    };
    this.subtasks.set(id, subtask);
    return subtask;
  }

  async getSubtask(id: number): Promise<Subtask | undefined> {
    return this.subtasks.get(id);
  }

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return Array.from(this.subtasks.values())
      .filter(subtask => subtask.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async updateSubtaskCompletion(id: number, completed: boolean): Promise<void> {
    const subtask = this.subtasks.get(id);
    if (subtask) {
      subtask.completed = completed;
      subtask.completedAt = completed ? new Date() : null;
      this.subtasks.set(id, subtask);
    }
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...insertTask,
        category: insertTask.category || null,
        targetDate: insertTask.targetDate || null,
      })
      .returning();
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(tasks.createdAt);
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

  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const [subtask] = await db
      .insert(subtasks)
      .values({
        ...insertSubtask,
        description: insertSubtask.description || null,
        dueDate: insertSubtask.dueDate || null,
        estimatedHours: insertSubtask.estimatedHours || null,
      })
      .returning();
    return subtask;
  }

  async getSubtask(id: number): Promise<Subtask | undefined> {
    const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, id));
    return subtask || undefined;
  }

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return await db.select().from(subtasks).where(eq(subtasks.taskId, taskId)).orderBy(subtasks.id);
  }

  async updateSubtaskCompletion(id: number, completed: boolean): Promise<void> {
    await db
      .update(subtasks)
      .set({
        completed,
        completedAt: completed ? new Date() : null,
      })
      .where(eq(subtasks.id, id));
  }
}

export const storage = new DatabaseStorage();
