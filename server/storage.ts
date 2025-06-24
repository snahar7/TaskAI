import { users, tasks, subtasks, type User, type InsertUser, type Task, type InsertTask, type Subtask, type InsertSubtask, type TaskWithSubtasks } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createTask(task: InsertTask): Promise<Task>;
  getAllTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined>;
  
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
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

export const storage = new MemStorage();
