import { pgTable, text, serial, integer, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users, categories, teams } from "./shared";

// Goals table - hierarchical task management top level
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // keeping original field name for compatibility
  name: text("name"), // enhanced comprehensive field
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status").default('not_started').notNull(), // not_started, in_progress, completed, on_hold, cancelled
  priority: text("priority").default('medium').notNull(), // low, medium, high, urgent
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }).default('0.00').notNull(),
  deadline: timestamp("deadline"),
  categoryId: integer("category_id").references(() => categories.id),
  teamId: integer("team_id").references(() => teams.id),
  timeEstimate: integer("time_estimate"), // in hours
  timeActual: integer("time_actual"), // in hours
  customFields: json("custom_fields"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Goal relations
export const goalsRelations = relations(goals, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [goals.assignedTo],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [goals.categoryId],
    references: [categories.id],
  }),
  team: one(teams, {
    fields: [goals.teamId],
    references: [teams.id],
  }),
  projects: many(projects), // Forward reference - will be resolved
}));

// Zod schemas for validation
export const insertGoalSchema = createInsertSchema(goals, {
  title: z.string().min(1, "Goal title is required"),
  description: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled']).default('not_started'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  percentComplete: z.coerce.number().min(0).max(100).default(0),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectGoalSchema = createSelectSchema(goals);
export const updateGoalSchema = insertGoalSchema.partial();

// TypeScript types
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type UpdateGoal = z.infer<typeof updateGoalSchema>;