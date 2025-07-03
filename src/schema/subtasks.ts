import { pgTable, text, serial, integer, timestamp, decimal, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users, categories, teams } from "./shared";
import { tasks } from "./tasks";

// Subtasks table - fourth level in goal hierarchy
export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  name: text("name"),
  description: text("description"),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  completed: boolean("completed").default(false).notNull(),
  status: text("status").default('not_started').notNull(),
  priority: text("priority").default('medium').notNull(),
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }).default('0.00').notNull(),
  deadline: timestamp("deadline"),
  categoryId: integer("category_id").references(() => categories.id),
  teamId: integer("team_id").references(() => teams.id),
  timeEstimate: integer("time_estimate"),
  timeActual: integer("time_actual"),
  customFields: json("custom_fields"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subtask relations
export const subtasksRelations = relations(subtasks, ({ one }) => ({
  task: one(tasks, {
    fields: [subtasks.taskId],
    references: [tasks.id],
  }),
  assignedUser: one(users, {
    fields: [subtasks.assignedTo],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [subtasks.categoryId],
    references: [categories.id],
  }),
  team: one(teams, {
    fields: [subtasks.teamId],
    references: [teams.id],
  }),
}));

// Zod schemas
export const insertSubtaskSchema = createInsertSchema(subtasks, {
  title: z.string().min(1, "Subtask title is required"),
  description: z.string().optional(),
  taskId: z.number().positive("Task ID is required"),
  completed: z.boolean().default(false),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']).default('not_started'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  percentComplete: z.coerce.number().min(0).max(100).default(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectSubtaskSchema = createSelectSchema(subtasks);
export const updateSubtaskSchema = insertSubtaskSchema.partial();

// TypeScript types
export type Subtask = typeof subtasks.$inferSelect;
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type UpdateSubtask = z.infer<typeof updateSubtaskSchema>;