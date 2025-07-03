import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// AI-generated breakdowns for approval workflow
export const pendingBreakdowns = pgTable("pending_breakdowns", {
  id: serial("id").primaryKey(),
  originalInput: text("original_input").notNull(),
  breakdown: json("breakdown").notNull(), // Stores AI-generated hierarchy
  approved: text("approved"), // null=pending, 'approved', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI task analysis and recommendations
export const taskAnalytics = pgTable("task_analytics", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // 'goal', 'project', 'task', 'subtask'
  entityId: integer("entity_id").notNull(),
  analysisType: text("analysis_type").notNull(), // 'breakdown', 'completion_prediction', 'dependency_analysis'
  inputData: json("input_data").notNull(),
  aiResponse: json("ai_response").notNull(),
  confidence: integer("confidence"), // 0-100 confidence score
  processingTime: integer("processing_time"), // milliseconds
  model: text("model").default('gpt-4o'), // AI model used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily standups and AI-generated insights
export const dailyStandups = pgTable("daily_standups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  completedTasks: json("completed_tasks"), // Array of task IDs completed
  blockers: json("blockers"), // Array of blocking issues
  nextGoals: json("next_goals"), // Array of planned tasks
  aiInsights: json("ai_insights"), // AI-generated insights and recommendations
  mood: text("mood"), // 'great', 'good', 'okay', 'struggling'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for AI-related data
export const aiBreakdownSchema = z.object({
  goal: z.object({
    title: z.string(),
    description: z.string(),
    timeframe: z.string(),
  }),
  projects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    urgency: z.enum(['Low', 'Medium', 'High']),
    estimatedHours: z.number(),
    dueDate: z.string(),
    tasks: z.array(z.object({
      title: z.string(),
      description: z.string(),
      urgency: z.enum(['Low', 'Medium', 'High']),
      estimatedHours: z.number(),
      dueDate: z.string(),
      subtasks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        urgency: z.enum(['Low', 'Medium', 'High']),
        estimatedHours: z.number(),
        dueDate: z.string(),
      })),
    })),
  })),
});

export const insertPendingBreakdownSchema = createInsertSchema(pendingBreakdowns, {
  originalInput: z.string().min(1, "Original input is required"),
  breakdown: aiBreakdownSchema,
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAnalyticsSchema = createInsertSchema(taskAnalytics, {
  entityType: z.enum(['goal', 'project', 'task', 'subtask']),
  entityId: z.number().positive(),
  analysisType: z.string().min(1),
  confidence: z.number().min(0).max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertDailyStandupSchema = createInsertSchema(dailyStandups, {
  userId: z.number().positive(),
  date: z.date(),
  mood: z.enum(['great', 'good', 'okay', 'struggling']).optional(),
}).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type PendingBreakdown = typeof pendingBreakdowns.$inferSelect;
export type InsertPendingBreakdown = z.infer<typeof insertPendingBreakdownSchema>;
export type AIBreakdown = z.infer<typeof aiBreakdownSchema>;
export type TaskAnalytics = typeof taskAnalytics.$inferSelect;
export type DailyStandup = typeof dailyStandups.$inferSelect;