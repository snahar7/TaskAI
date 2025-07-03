import { pgTable, text, serial, integer, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users, categories, teams } from "./shared";
import { projects } from "./projects";

// Tasks table - third level in goal hierarchy
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  name: text("name"),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
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

// Task relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
  team: one(teams, {
    fields: [tasks.teamId],
    references: [teams.id],
  }),
  subtasks: many(subtasks), // Forward reference
}));

// Zod schemas
export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  projectId: z.number().positive("Project ID is required"),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']).default('not_started'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  percentComplete: z.coerce.number().min(0).max(100).default(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectTaskSchema = createSelectSchema(tasks);
export const updateTaskSchema = insertTaskSchema.partial();

// TypeScript types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

// Export for use in projects.ts relations
export { tasks };