import { pgTable, text, serial, integer, boolean, timestamp, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Goal is the top-level item (e.g., "Plan my wedding")
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approved: boolean("approved").default(false).notNull(),
  estimatedDuration: text("estimated_duration"), // e.g., "3 months"
  targetDate: text("target_date"),
  urgency: text("urgency").default("medium").notNull(), // low, medium, high
});

// Projects are major categories under a goal (e.g., "Venue & Decor")
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  goalId: integer("goal_id").references(() => goals.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approved: boolean("approved").default(false).notNull(),
  estimatedDuration: text("estimated_duration"),
  targetDate: text("target_date"),
  urgency: text("urgency").default("medium").notNull(),
});

// Tasks are specific items under a project (e.g., "Book a venue")
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completed: boolean("completed").default(false).notNull(),
  approved: boolean("approved").default(false).notNull(),
  estimatedHours: real("estimated_hours"),
  dueDate: text("due_date"),
  urgency: text("urgency").default("medium").notNull(),
  completedAt: timestamp("completed_at"),
});

// Sub-tasks are actionable items under a task (e.g., "Call venues")
export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completed: boolean("completed").default(false).notNull(),
  approved: boolean("approved").default(false).notNull(),
  estimatedHours: real("estimated_hours"),
  dueDate: text("due_date"),
  urgency: text("urgency").default("medium").notNull(),
  completedAt: timestamp("completed_at"),
  attachments: json("attachments"),
});

// Pending breakdown for approval workflow
export const pendingBreakdowns = pgTable("pending_breakdowns", {
  id: serial("id").primaryKey(),
  originalInput: text("original_input").notNull(),
  breakdown: json("breakdown").notNull(), // Full hierarchy JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertPendingBreakdownSchema = createInsertSchema(pendingBreakdowns).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;

export type InsertPendingBreakdown = z.infer<typeof insertPendingBreakdownSchema>;
export type PendingBreakdown = typeof pendingBreakdowns.$inferSelect;

// Composite types for full hierarchy
export type TaskWithSubtasks = Task & {
  subtasks: Subtask[];
};

export type ProjectWithTasks = Project & {
  tasks: TaskWithSubtasks[];
};

export type GoalWithProjects = Goal & {
  projects: ProjectWithTasks[];
};

// AI Breakdown structure for OpenAI responses
export interface AISubtask {
  title: string;
  description?: string;
  estimatedHours?: number;
  dueDate?: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface AITask {
  title: string;
  description?: string;
  estimatedHours?: number;
  dueDate?: string;
  urgency?: 'low' | 'medium' | 'high';
  subtasks: AISubtask[];
}

export interface AIProject {
  title: string;
  description?: string;
  estimatedDuration?: string;
  targetDate?: string;
  urgency?: 'low' | 'medium' | 'high';
  tasks: AITask[];
}

export interface AIBreakdown {
  goal: {
    title: string;
    description?: string;
    estimatedDuration?: string;
    targetDate?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
  projects: AIProject[];
}