import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  targetDate: text("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completed: boolean("completed").default(false).notNull(),
});

export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull(), // 'high', 'medium', 'low'
  dueDate: text("due_date"),
  estimatedHours: text("estimated_hours"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completed: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdAt: true,
  completed: true,
  completedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;

export type TaskWithSubtasks = Task & {
  subtasks: Subtask[];
};
