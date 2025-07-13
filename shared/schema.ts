import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - enhanced
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Goals table - comprehensive fields as requested
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // keeping original field name for compatibility
  name: text("name"), // new comprehensive field
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approved: boolean("approved").default(false).notNull(),
  // Legacy fields for backward compatibility
  estimatedDuration: text("estimated_duration"),
  targetDate: text("target_date"),
  urgency: text("urgency").default("medium").notNull(),
});

// Projects table - comprehensive fields
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // keeping original field name for compatibility
  name: text("name"), // new comprehensive field
  description: text("description"),
  goalId: integer("goal_id").references(() => goals.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status").default('not_started').notNull(),
  priority: text("priority").default('medium').notNull(),
  percentComplete: decimal("percent_complete", { precision: 5, scale: 2 }).default('0.00').notNull(),
  deadline: timestamp("deadline"),
  categoryId: integer("category_id").references(() => categories.id),
  teamId: integer("team_id").references(() => teams.id),
  timeEstimate: integer("time_estimate"),
  timeActual: integer("time_actual"),
  estimatedDays: integer("estimated_days"), // New field for day-based estimation
  startDate: timestamp("start_date"), // New field for start date
  customFields: json("custom_fields"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approved: boolean("approved").default(false).notNull(),
  // Legacy fields for backward compatibility
  estimatedDuration: text("estimated_duration"),
  targetDate: text("target_date"),
  urgency: text("urgency").default("medium").notNull(),
});

// Tasks table - comprehensive fields
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // keeping original field name for compatibility
  name: text("name"), // new comprehensive field
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
  estimatedDays: integer("estimated_days"), // New field for day-based estimation
  startDate: timestamp("start_date"), // New field for start date
  customFields: json("custom_fields"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approved: boolean("approved").default(false).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  // Legacy fields for backward compatibility
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  dueDate: text("due_date"),
  urgency: text("urgency").default("medium").notNull(),
});

// Subtasks table - comprehensive fields (no percent_complete as specified)
export const subtasks = pgTable("subtasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // keeping original field name for compatibility
  name: text("name"), // new comprehensive field
  description: text("description"),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: text("status").default('not_started').notNull(),
  priority: text("priority").default('medium').notNull(),
  // No percentComplete for subtasks as requested
  deadline: timestamp("deadline"),
  categoryId: integer("category_id").references(() => categories.id),
  teamId: integer("team_id").references(() => teams.id),
  timeEstimate: integer("time_estimate"),
  timeActual: integer("time_actual"),
  estimatedDays: integer("estimated_days"), // New field for day-based estimation
  startDate: timestamp("start_date"), // New field for start date
  customFields: json("custom_fields"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approved: boolean("approved").default(false).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  // Legacy fields for backward compatibility
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  dueDate: text("due_date"),
  urgency: text("urgency").default("medium").notNull(),
  attachments: json("attachments"),
});

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Files/Attachments table - polymorphic file attachments
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  entityType: text("entity_type").notNull(), // goal, project, task, subtask
  entityId: integer("entity_id").notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments table - polymorphic comments system
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  entityType: text("entity_type").notNull(), // goal, project, task, subtask
  entityId: integer("entity_id").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  parentId: integer("parent_id").references(() => comments.id), // for threaded comments
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Dependencies table - many-to-many self-referencing dependencies
export const dependencies = pgTable("dependencies", {
  id: serial("id").primaryKey(),
  dependentType: text("dependent_type").notNull(), // goal, project, task, subtask
  dependentId: integer("dependent_id").notNull(),
  dependsOnType: text("depends_on_type").notNull(),
  dependsOnId: integer("depends_on_id").notNull(),
  dependencyType: text("dependency_type").default('finish_to_start').notNull(), // finish_to_start, start_to_start, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Entity Tags - many-to-many polymorphic tagging
export const entityTags = pgTable("entity_tags", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Followers - users following entities for notifications
export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Team Members - many-to-many team membership
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default('member').notNull(), // admin, member, viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Entity Links - ability to link/nest items across different types
export const entityLinks = pgTable("entity_links", {
  id: serial("id").primaryKey(),
  sourceType: text("source_type").notNull(),
  sourceId: integer("source_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  linkType: text("link_type").default('related').notNull(), // related, nested, duplicate, blocked_by, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Pending breakdown for approval workflow
export const pendingBreakdowns = pgTable("pending_breakdowns", {
  id: serial("id").primaryKey(),
  originalInput: text("original_input").notNull(),
  breakdown: json("breakdown").notNull(), // Full hierarchy JSON
  timeline: json("timeline"), // Auto-generated timeline data (optional)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations - define explicit relationships for Drizzle
export const usersRelations = relations(users, ({ many }) => ({
  assignedGoals: many(goals),
  assignedProjects: many(projects),
  assignedTasks: many(tasks),
  assignedSubtasks: many(subtasks),
  comments: many(comments),
  uploadedFiles: many(files),
  teamMemberships: many(teamMembers),
  followedEntities: many(followers),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  goals: many(goals),
  projects: many(projects),
  tasks: many(tasks),
  subtasks: many(subtasks),
}));

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
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  goal: one(goals, {
    fields: [projects.goalId],
    references: [goals.id],
  }),
  assignedUser: one(users, {
    fields: [projects.assignedTo],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [projects.categoryId],
    references: [categories.id],
  }),
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  tasks: many(tasks),
}));

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
  subtasks: many(subtasks),
}));

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

// Insert schemas - updated for new field names
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertSubtaskSchema = createInsertSchema(subtasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertPendingBreakdownSchema = createInsertSchema(pendingBreakdowns).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});

// Types - updated for new field names
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

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// Composite types for full hierarchy with new field names
export type TaskWithSubtasks = Task & {
  subtasks: Subtask[];
};

export type ProjectWithTasks = Project & {
  tasks: TaskWithSubtasks[];
};

export type GoalWithProjects = Goal & {
  projects: ProjectWithTasks[];
};

// Enhanced composite types with related data
export type TaskWithDetails = Task & {
  subtasks: Subtask[];
  assignedUser?: User;
  category?: Category;
  team?: Team;
  comments?: Comment[];
  files?: File[];
  tags?: Tag[];
};

export type ProjectWithDetails = Project & {
  tasks: TaskWithDetails[];
  assignedUser?: User;
  category?: Category;
  team?: Team;
  comments?: Comment[];
  files?: File[];
  tags?: Tag[];
};

export type GoalWithDetails = Goal & {
  projects: ProjectWithDetails[];
  assignedUser?: User;
  category?: Category;
  team?: Team;
  comments?: Comment[];
  files?: File[];
  tags?: Tag[];
};

// AI Breakdown structure for OpenAI responses - updated for new field names with day-based estimation
export interface AISubtask {
  name: string; // changed from title to name
  description?: string;
  estimatedHours?: number;
  estimatedDays?: number; // New field for realistic day-based estimation
  dueDate?: string;
  startDate?: string; // New field for start date
  urgency?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeEstimate?: number;
}

export interface AITask {
  name: string; // changed from title to name
  description?: string;
  estimatedHours?: number;
  estimatedDays?: number; // New field for realistic day-based estimation
  dueDate?: string;
  startDate?: string; // New field for start date
  urgency?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeEstimate?: number;
  subtasks: AISubtask[];
}

export interface AIProject {
  name: string; // changed from title to name
  description?: string;
  estimatedDuration?: string;
  estimatedDays?: number; // New field for realistic day-based estimation
  targetDate?: string;
  startDate?: string; // New field for start date
  urgency?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeEstimate?: number;
  tasks: AITask[];
}

export interface AIBreakdown {
  goal: {
    name: string; // changed from title to name
    description?: string;
    estimatedDuration?: string;
    estimatedDays?: number; // New field for realistic day-based estimation
    targetDate?: string;
    startDate?: string; // New field for start date
    urgency?: 'low' | 'medium' | 'high';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    timeEstimate?: number;
  };
  projects: AIProject[];
}

