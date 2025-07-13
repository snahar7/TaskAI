import { 
  users, goals, projects, tasks, subtasks, pendingBreakdowns, teams, categories, tags,
  files, comments, dependencies, entityTags, followers, teamMembers, entityLinks,
  type User, type InsertUser,
  type Goal, type InsertGoal,
  type Project, type InsertProject, 
  type Task, type InsertTask,
  type Subtask, type InsertSubtask,
  type PendingBreakdown, type InsertPendingBreakdown,
  type Team, type InsertTeam,
  type Category, type InsertCategory,
  type Tag, type InsertTag,
  type Comment, type InsertComment,
  type File, type InsertFile,
  type GoalWithProjects, type ProjectWithTasks, type TaskWithSubtasks,
  type GoalWithDetails, type ProjectWithDetails, type TaskWithDetails
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql } from "drizzle-orm";

export interface IEnhancedStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  
  // Goals - enhanced with relational fields
  createGoal(goal: InsertGoal): Promise<Goal>;
  getAllGoals(): Promise<Goal[]>;
  getAllGoalsWithHierarchy(): Promise<any[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined>;
  getGoalWithDetails(id: number): Promise<GoalWithDetails | undefined>;
  updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal>;
  updateGoalApproval(id: number, approved: boolean): Promise<void>;
  updateGoalProgress(id: number, percentComplete: number): Promise<void>;
  
  // Projects - enhanced with relational fields
  createProject(project: InsertProject): Promise<Project>;
  getProjectsByGoalId(goalId: number): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined>;
  getProjectWithDetails(id: number): Promise<ProjectWithDetails | undefined>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  updateProjectApproval(id: number, approved: boolean): Promise<void>;
  updateProjectProgress(id: number, percentComplete: number): Promise<void>;
  
  // Tasks - enhanced with relational fields
  createTask(task: InsertTask): Promise<Task>;
  getTasksByProjectId(projectId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined>;
  getTaskWithDetails(id: number): Promise<TaskWithDetails | undefined>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  updateTaskCompletion(id: number, completed: boolean): Promise<void>;
  updateTaskApproval(id: number, approved: boolean): Promise<void>;
  updateTaskProgress(id: number, percentComplete: number): Promise<void>;
  
  // Subtasks - enhanced with relational fields
  createSubtask(subtask: InsertSubtask): Promise<Subtask>;
  getSubtasksByTaskId(taskId: number): Promise<Subtask[]>;
  getSubtask(id: number): Promise<Subtask | undefined>;
  updateSubtask(id: number, updates: Partial<InsertSubtask>): Promise<Subtask>;
  updateSubtaskCompletion(id: number, completed: boolean): Promise<void>;
  updateSubtaskApproval(id: number, approved: boolean): Promise<void>;
  
  // Cascade progress update methods
  cascadeSubtaskProgress(subtaskId: number): Promise<void>;
  cascadeTaskProgress(taskId: number): Promise<void>;
  cascadeProjectProgress(projectId: number): Promise<void>;
  
  // Teams
  createTeam(team: InsertTeam): Promise<Team>;
  getAllTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team>;
  addTeamMember(teamId: number, userId: number, role?: string): Promise<void>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;
  getTeamMembers(teamId: number): Promise<User[]>;
  
  // Categories
  createCategory(category: InsertCategory): Promise<Category>;
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  
  // Tags
  createTag(tag: InsertTag): Promise<Tag>;
  getAllTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  updateTag(id: number, updates: Partial<InsertTag>): Promise<Tag>;
  tagEntity(entityType: string, entityId: number, tagId: number): Promise<void>;
  untagEntity(entityType: string, entityId: number, tagId: number): Promise<void>;
  getEntityTags(entityType: string, entityId: number): Promise<Tag[]>;
  
  // Comments
  createComment(comment: InsertComment): Promise<Comment>;
  getEntityComments(entityType: string, entityId: number): Promise<Comment[]>;
  updateComment(id: number, content: string): Promise<Comment>;
  deleteComment(id: number): Promise<void>;
  
  // Files
  createFile(file: InsertFile): Promise<File>;
  getEntityFiles(entityType: string, entityId: number): Promise<File[]>;
  deleteFile(id: number): Promise<void>;
  
  // Dependencies
  addDependency(dependentType: string, dependentId: number, dependsOnType: string, dependsOnId: number, dependencyType?: string): Promise<void>;
  removeDependency(dependentType: string, dependentId: number, dependsOnType: string, dependsOnId: number): Promise<void>;
  getEntityDependencies(entityType: string, entityId: number): Promise<any[]>;
  
  // Followers
  followEntity(entityType: string, entityId: number, userId: number): Promise<void>;
  unfollowEntity(entityType: string, entityId: number, userId: number): Promise<void>;
  getEntityFollowers(entityType: string, entityId: number): Promise<User[]>;
  getUserFollowedEntities(userId: number): Promise<any[]>;
  
  // Entity Links
  linkEntities(sourceType: string, sourceId: number, targetType: string, targetId: number, linkType?: string): Promise<void>;
  unlinkEntities(sourceType: string, sourceId: number, targetType: string, targetId: number): Promise<void>;
  getEntityLinks(entityType: string, entityId: number): Promise<any[]>;
  
  // Search & Analytics
  searchEntities(query: string, entityTypes?: string[]): Promise<any[]>;
  getProjectProgress(projectId: number): Promise<{ totalTasks: number; completedTasks: number; percentComplete: number }>;
  getGoalProgress(goalId: number): Promise<{ totalProjects: number; completedProjects: number; percentComplete: number }>;
  getUserWorkload(userId: number): Promise<{ goals: number; projects: number; tasks: number; subtasks: number }>;
  
  // Pending breakdowns (legacy support)
  createPendingBreakdown(breakdown: InsertPendingBreakdown): Promise<PendingBreakdown>;
  getAllPendingBreakdowns(): Promise<PendingBreakdown[]>;
  getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined>;
  deletePendingBreakdown(id: number): Promise<void>;
  
  // Delete methods with cascading
  deleteGoal(id: number): Promise<void>;
  deleteProject(id: number): Promise<void>;
  deleteTask(id: number): Promise<void>;
  deleteSubtask(id: number): Promise<void>;
}

export class EnhancedDatabaseStorage implements IEnhancedStorage {
  private db = db;

  // Helper method to ensure compatibility with legacy title/name fields
  private ensureNameField(data: any): any {
    if (data.title && !data.name) {
      data.name = data.title;
    }
    if (!data.title && data.name) {
      data.title = data.name;
    }
    return data;
  }

  // Helper method to add default timestamps
  private addTimestamps(data: any): any {
    const now = new Date();
    return {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };
  }

  // Progress calculation helpers
  private recalcPercent(items: { completed: boolean }[]): number {
    if (!items.length) return 0;
    const done = items.filter(i => i.completed).length;
    return Math.round((done / items.length) * 100);
  }

  private recalcPercentFromProgress(items: { percentComplete: string }[]): number {
    if (!items.length) return 0;
    const totalProgress = items.reduce((sum, item) => sum + parseFloat(item.percentComplete || '0'), 0);
    return Math.round(totalProgress / items.length);
  }

  private async calculateTaskProgress(taskId: number): Promise<number> {
    const subtaskList = await this.getSubtasksByTaskId(taskId);
    return this.recalcPercent(subtaskList); // Subtasks have completed boolean
  }

  private async calculateProjectProgress(projectId: number): Promise<number> {
    const taskList = await this.getTasksByProjectId(projectId);
    return this.recalcPercent(taskList); // Tasks have completed boolean
  }

  private async calculateGoalProgress(goalId: number): Promise<number> {
    const projectList = await this.getProjectsByGoalId(goalId);
    return this.recalcPercentFromProgress(projectList); // Projects have percentComplete
  }

  // Cascade progress update methods
  async cascadeSubtaskProgress(subtaskId: number): Promise<void> {
    // Get the subtask and its parent task
    const [subtask] = await this.db.select().from(subtasks).where(eq(subtasks.id, subtaskId));
    if (!subtask) return;

    // Calculate and update task progress
    const taskProgress = await this.calculateTaskProgress(subtask.taskId);
    await this.updateTaskProgress(subtask.taskId, taskProgress);

    // Get task and cascade to project
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, subtask.taskId));
    if (!task) return;

    const projectProgress = await this.calculateProjectProgress(task.projectId);
    await this.updateProjectProgress(task.projectId, projectProgress);

    // Get project and cascade to goal
    const [project] = await this.db.select().from(projects).where(eq(projects.id, task.projectId));
    if (!project) return;

    const goalProgress = await this.calculateGoalProgress(project.goalId);
    await this.updateGoalProgress(project.goalId, goalProgress);
  }

  async cascadeTaskProgress(taskId: number): Promise<void> {
    // Get the task and its parent project
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) return;

    // Calculate and update project progress
    const projectProgress = await this.calculateProjectProgress(task.projectId);
    await this.updateProjectProgress(task.projectId, projectProgress);

    // Get project and cascade to goal
    const [project] = await this.db.select().from(projects).where(eq(projects.id, task.projectId));
    if (!project) return;

    const goalProgress = await this.calculateGoalProgress(project.goalId);
    await this.updateGoalProgress(project.goalId, goalProgress);
  }

  async cascadeProjectProgress(projectId: number): Promise<void> {
    // Get the project and its parent goal
    const [project] = await this.db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return;

    // Calculate and update goal progress
    const goalProgress = await this.calculateGoalProgress(project.goalId);
    await this.updateGoalProgress(project.goalId, goalProgress);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = this.addTimestamps(insertUser);
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Goals - Enhanced with comprehensive fields
  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const goalData = this.addTimestamps(this.ensureNameField(insertGoal));
    const [goal] = await this.db
      .insert(goals)
      .values(goalData)
      .returning();
    return goal;
  }

  async getAllGoals(): Promise<Goal[]> {
    return await this.db.select().from(goals);
  }

  // OPTIMIZED: Get all goals with full hierarchy in minimal queries
  async getAllGoalsWithHierarchy(): Promise<any[]> {
    // Single query to get all data with joins
    const allData = await this.db
      .select({
        // Goal fields
        goalId: goals.id,
        goalTitle: goals.title,
        goalName: goals.name,
        goalDescription: goals.description,
        goalStatus: goals.status,
        goalPriority: goals.priority,
        goalPercentComplete: goals.percentComplete,
        goalDeadline: goals.deadline,
        goalCreatedAt: goals.createdAt,
        goalUpdatedAt: goals.updatedAt,
        
        // Project fields
        projectId: projects.id,
        projectTitle: projects.title,
        projectName: projects.name,
        projectDescription: projects.description,
        projectStatus: projects.status,
        projectPriority: projects.priority,
        projectPercentComplete: projects.percentComplete,
        projectDeadline: projects.deadline,
        projectCreatedAt: projects.createdAt,
        projectUpdatedAt: projects.updatedAt,
        
        // Task fields
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskName: tasks.name,
        taskDescription: tasks.description,
        taskStatus: tasks.status,
        taskPriority: tasks.priority,
        taskCompleted: tasks.completed,
        taskPercentComplete: tasks.percentComplete,
        taskDeadline: tasks.deadline,
        taskCreatedAt: tasks.createdAt,
        taskUpdatedAt: tasks.updatedAt,
        
        // Subtask fields
        subtaskId: subtasks.id,
        subtaskTitle: subtasks.title,
        subtaskName: subtasks.name,
        subtaskDescription: subtasks.description,
        subtaskStatus: subtasks.status,
        subtaskPriority: subtasks.priority,
        subtaskCompleted: subtasks.completed,
        subtaskDeadline: subtasks.deadline,
        subtaskCreatedAt: subtasks.createdAt,
        subtaskUpdatedAt: subtasks.updatedAt,
      })
      .from(goals)
      .leftJoin(projects, eq(goals.id, projects.goalId))
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .leftJoin(subtasks, eq(tasks.id, subtasks.taskId))
      .orderBy(goals.id, projects.id, tasks.id, subtasks.id);

    // Transform flat data into hierarchical structure efficiently
    const goalsMap = new Map();
    
    for (const row of allData) {
      // Create or get goal
      if (!goalsMap.has(row.goalId)) {
        goalsMap.set(row.goalId, {
          id: row.goalId,
          title: row.goalTitle || row.goalName,
          name: row.goalName || row.goalTitle,
          description: row.goalDescription,
          status: row.goalStatus,
          priority: row.goalPriority,
          percentComplete: row.goalPercentComplete,
          deadline: row.goalDeadline,
          createdAt: row.goalCreatedAt,
          updatedAt: row.goalUpdatedAt,
          projects: new Map()
        });
      }
      
      const goal = goalsMap.get(row.goalId);
      
      // Add project if exists and hasn't been added
      if (row.projectId && !goal.projects.has(row.projectId)) {
        goal.projects.set(row.projectId, {
          id: row.projectId,
          title: row.projectTitle || row.projectName,
          name: row.projectName || row.projectTitle,
          description: row.projectDescription,
          status: row.projectStatus,
          priority: row.projectPriority,
          percentComplete: row.projectPercentComplete,
          deadline: row.projectDeadline,
          createdAt: row.projectCreatedAt,
          updatedAt: row.projectUpdatedAt,
          goalId: row.goalId,
          tasks: new Map()
        });
      }
      
      // Add task if exists and project exists
      if (row.projectId && row.taskId) {
        const project = goal.projects.get(row.projectId);
        if (project && !project.tasks.has(row.taskId)) {
          project.tasks.set(row.taskId, {
            id: row.taskId,
            title: row.taskTitle || row.taskName,
            name: row.taskName || row.taskTitle,
            description: row.taskDescription,
            status: row.taskStatus,
            priority: row.taskPriority,
            completed: row.taskCompleted,
            percentComplete: row.taskPercentComplete,
            deadline: row.taskDeadline,
            createdAt: row.taskCreatedAt,
            updatedAt: row.taskUpdatedAt,
            projectId: row.projectId,
            subtasks: []
          });
        }
      }
      
      // Add subtask if exists
      if (row.projectId && row.taskId && row.subtaskId) {
        const project = goal.projects.get(row.projectId);
        const task = project?.tasks.get(row.taskId);
        if (task) {
          task.subtasks.push({
            id: row.subtaskId,
            title: row.subtaskTitle || row.subtaskName,
            name: row.subtaskName || row.subtaskTitle,
            description: row.subtaskDescription,
            status: row.subtaskStatus,
            priority: row.subtaskPriority,
            completed: row.subtaskCompleted,
            deadline: row.subtaskDeadline,
            createdAt: row.subtaskCreatedAt,
            updatedAt: row.subtaskUpdatedAt,
            taskId: row.taskId
          });
        }
      }
    }
    
    // Convert Maps to Arrays for final output
    const result = [];
    for (const goal of goalsMap.values()) {
      const projectsArray = [];
      for (const project of goal.projects.values()) {
        const tasksArray = Array.from(project.tasks.values());
        projectsArray.push({ ...project, tasks: tasksArray });
      }
      result.push({ ...goal, projects: projectsArray });
    }
    
    return result;
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await this.db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async getGoalWithProjects(id: number): Promise<GoalWithProjects | undefined> {
    const goal = await this.getGoal(id);
    if (!goal) return undefined;

    const goalProjects = await this.db.select().from(projects).where(eq(projects.goalId, id));
    
    const projectsWithTasks = await Promise.all(
      goalProjects.map(async (project) => {
        const projectTasks = await this.db.select().from(tasks).where(eq(tasks.projectId, project.id));
        
        const tasksWithSubtasks = await Promise.all(
          projectTasks.map(async (task) => {
            const taskSubtasks = await this.db.select().from(subtasks).where(eq(subtasks.taskId, task.id));
            return { ...task, subtasks: taskSubtasks };
          })
        );
        
        return { ...project, tasks: tasksWithSubtasks };
      })
    );

    return { ...goal, projects: projectsWithTasks };
  }

  async getGoalWithDetails(id: number): Promise<GoalWithDetails | undefined> {
    const goalWithProjects = await this.getGoalWithProjects(id);
    if (!goalWithProjects) return undefined;

    // Add relational data
    const assignedUser = goalWithProjects.assignedTo 
      ? await this.getUser(goalWithProjects.assignedTo) 
      : undefined;
    
    const category = goalWithProjects.categoryId 
      ? await this.getCategory(goalWithProjects.categoryId) 
      : undefined;
    
    const team = goalWithProjects.teamId 
      ? await this.getTeam(goalWithProjects.teamId) 
      : undefined;
    
    const goalComments = await this.getEntityComments('goal', id);
    const goalFiles = await this.getEntityFiles('goal', id);
    const goalTags = await this.getEntityTags('goal', id);

    return {
      ...goalWithProjects,
      assignedUser,
      category,
      team,
      comments: goalComments,
      files: goalFiles,
      tags: goalTags,
    };
  }

  async updateGoal(id: number, updates: Partial<InsertGoal>): Promise<Goal> {
    const updateData = this.ensureNameField({ ...updates, updatedAt: new Date() });
    const [goal] = await this.db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, id))
      .returning();
    return goal;
  }

  async updateGoalApproval(id: number, approved: boolean): Promise<void> {
    await this.db
      .update(goals)
      .set({ approved, updatedAt: new Date() })
      .where(eq(goals.id, id));
  }

  async updateGoalProgress(id: number, percentComplete: number): Promise<void> {
    await this.db
      .update(goals)
      .set({ percentComplete: percentComplete.toString(), updatedAt: new Date() })
      .where(eq(goals.id, id));
  }

  // Projects - Enhanced with comprehensive fields
  async createProject(insertProject: InsertProject): Promise<Project> {
    const projectData = this.addTimestamps(this.ensureNameField(insertProject));
    const [project] = await this.db
      .insert(projects)
      .values(projectData)
      .returning();
    return project;
  }

  async getProjectsByGoalId(goalId: number): Promise<Project[]> {
    return await this.db.select().from(projects).where(eq(projects.goalId, goalId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectWithTasks(id: number): Promise<ProjectWithTasks | undefined> {
    const project = await this.getProject(id);
    if (!project) return undefined;

    const projectTasks = await this.db.select().from(tasks).where(eq(tasks.projectId, id));
    
    const tasksWithSubtasks = await Promise.all(
      projectTasks.map(async (task) => {
        const taskSubtasks = await this.db.select().from(subtasks).where(eq(subtasks.taskId, task.id));
        return { ...task, subtasks: taskSubtasks };
      })
    );

    return { ...project, tasks: tasksWithSubtasks };
  }

  async getProjectWithDetails(id: number): Promise<ProjectWithDetails | undefined> {
    const projectWithTasks = await this.getProjectWithTasks(id);
    if (!projectWithTasks) return undefined;

    const assignedUser = projectWithTasks.assignedTo 
      ? await this.getUser(projectWithTasks.assignedTo) 
      : undefined;
    
    const category = projectWithTasks.categoryId 
      ? await this.getCategory(projectWithTasks.categoryId) 
      : undefined;
    
    const team = projectWithTasks.teamId 
      ? await this.getTeam(projectWithTasks.teamId) 
      : undefined;

    const projectComments = await this.getEntityComments('project', id);
    const projectFiles = await this.getEntityFiles('project', id);
    const projectTags = await this.getEntityTags('project', id);

    return {
      ...projectWithTasks,
      assignedUser,
      category,
      team,
      comments: projectComments,
      files: projectFiles,
      tags: projectTags,
    };
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const updateData = this.ensureNameField({ ...updates, updatedAt: new Date() });
    const [project] = await this.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async updateProjectApproval(id: number, approved: boolean): Promise<void> {
    await this.db
      .update(projects)
      .set({ approved, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  async updateProjectProgress(id: number, percentComplete: number): Promise<void> {
    await this.db
      .update(projects)
      .set({ percentComplete: percentComplete.toString(), updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  // Tasks - Enhanced with comprehensive fields
  async createTask(insertTask: InsertTask): Promise<Task> {
    const taskData = this.addTimestamps(this.ensureNameField(insertTask));
    const [task] = await this.db
      .insert(tasks)
      .values(taskData)
      .returning();
    return task;
  }

  async getTasksByProjectId(projectId: number): Promise<Task[]> {
    return await this.db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTaskWithSubtasks(id: number): Promise<TaskWithSubtasks | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;

    const taskSubtasks = await this.db.select().from(subtasks).where(eq(subtasks.taskId, id));
    return { ...task, subtasks: taskSubtasks };
  }

  async getTaskWithDetails(id: number): Promise<TaskWithDetails | undefined> {
    const taskWithSubtasks = await this.getTaskWithSubtasks(id);
    if (!taskWithSubtasks) return undefined;

    const assignedUser = taskWithSubtasks.assignedTo 
      ? await this.getUser(taskWithSubtasks.assignedTo) 
      : undefined;
    
    const category = taskWithSubtasks.categoryId 
      ? await this.getCategory(taskWithSubtasks.categoryId) 
      : undefined;
    
    const team = taskWithSubtasks.teamId 
      ? await this.getTeam(taskWithSubtasks.teamId) 
      : undefined;

    const taskComments = await this.getEntityComments('task', id);
    const taskFiles = await this.getEntityFiles('task', id);
    const taskTags = await this.getEntityTags('task', id);

    return {
      ...taskWithSubtasks,
      assignedUser,
      category,
      team,
      comments: taskComments,
      files: taskFiles,
      tags: taskTags,
    };
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const updateData = this.ensureNameField({ ...updates, updatedAt: new Date() });
    const [task] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async updateTaskCompletion(id: number, completed: boolean): Promise<void> {
    const updateData: any = { 
      completed, 
      updatedAt: new Date() 
    };
    
    if (completed) {
      updateData.completedAt = new Date();
      updateData.status = 'completed';
      updateData.percentComplete = '100.00';
    } else {
      updateData.completedAt = null;
      updateData.status = 'in_progress';
    }

    await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id));

    // Automatically update parent project progress
    const task = await this.getTask(id);
    if (task?.projectId) {
      await this.recalculateProjectProgress(task.projectId);
    }
  }

  async updateTaskApproval(id: number, approved: boolean): Promise<void> {
    await this.db
      .update(tasks)
      .set({ approved, updatedAt: new Date() })
      .where(eq(tasks.id, id));
  }

  async updateTaskProgress(id: number, percentComplete: number): Promise<void> {
    await this.db
      .update(tasks)
      .set({ percentComplete: percentComplete.toString(), updatedAt: new Date() })
      .where(eq(tasks.id, id));
  }

  // Subtasks - Enhanced with comprehensive fields
  async createSubtask(insertSubtask: InsertSubtask): Promise<Subtask> {
    const subtaskData = this.addTimestamps(this.ensureNameField(insertSubtask));
    const [subtask] = await this.db
      .insert(subtasks)
      .values(subtaskData)
      .returning();
    return subtask;
  }

  async getSubtasksByTaskId(taskId: number): Promise<Subtask[]> {
    return await this.db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
  }

  async getSubtask(id: number): Promise<Subtask | undefined> {
    const [subtask] = await this.db.select().from(subtasks).where(eq(subtasks.id, id));
    return subtask || undefined;
  }

  async updateSubtask(id: number, updates: Partial<InsertSubtask>): Promise<Subtask> {
    const updateData = this.ensureNameField({ ...updates, updatedAt: new Date() });
    const [subtask] = await this.db
      .update(subtasks)
      .set(updateData)
      .where(eq(subtasks.id, id))
      .returning();
    return subtask;
  }

  async updateSubtaskCompletion(id: number, completed: boolean): Promise<void> {
    const updateData: any = { 
      completed, 
      updatedAt: new Date() 
    };
    
    if (completed) {
      updateData.completedAt = new Date();
      updateData.status = 'completed';
    } else {
      updateData.completedAt = null;
      updateData.status = 'in_progress';
    }

    // Update subtask and get hierarchy IDs in single query
    const [updatedSubtask] = await this.db
      .update(subtasks)
      .set(updateData)
      .where(eq(subtasks.id, id))
      .returning({ taskId: subtasks.taskId });

    // Use ultra-fast batch update for entire hierarchy
    if (updatedSubtask?.taskId) {
      await this.recalculateHierarchyProgressBatch(updatedSubtask.taskId);
    }
  }

  async updateSubtaskApproval(id: number, approved: boolean): Promise<void> {
    await this.db
      .update(subtasks)
      .set({ approved, updatedAt: new Date() })
      .where(eq(subtasks.id, id));
  }

  // Teams
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const teamData = this.addTimestamps(insertTeam);
    const [team] = await this.db
      .insert(teams)
      .values(teamData)
      .returning();
    return team;
  }

  async getAllTeams(): Promise<Team[]> {
    return await this.db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await this.db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async updateTeam(id: number, updates: Partial<InsertTeam>): Promise<Team> {
    const updateData = { ...updates, updatedAt: new Date() };
    const [team] = await this.db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  async addTeamMember(teamId: number, userId: number, role: string = 'member'): Promise<void> {
    await this.db
      .insert(teamMembers)
      .values({ teamId, userId, role, createdAt: new Date() });
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await this.db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  async getTeamMembers(teamId: number): Promise<User[]> {
    const members = await this.db
      .select({ user: users })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    return members.map(m => m.user);
  }

  // Categories
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await this.db
      .insert(categories)
      .values({ ...insertCategory, createdAt: new Date() })
      .returning();
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    return await this.db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await this.db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await this.db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  // Tags
  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await this.db
      .insert(tags)
      .values({ ...insertTag, createdAt: new Date() })
      .returning();
    return tag;
  }

  async getAllTags(): Promise<Tag[]> {
    return await this.db.select().from(tags);
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await this.db.select().from(tags).where(eq(tags.id, id));
    return tag || undefined;
  }

  async updateTag(id: number, updates: Partial<InsertTag>): Promise<Tag> {
    const [tag] = await this.db
      .update(tags)
      .set(updates)
      .where(eq(tags.id, id))
      .returning();
    return tag;
  }

  async tagEntity(entityType: string, entityId: number, tagId: number): Promise<void> {
    await this.db
      .insert(entityTags)
      .values({ entityType, entityId, tagId, createdAt: new Date() });
  }

  async untagEntity(entityType: string, entityId: number, tagId: number): Promise<void> {
    await this.db
      .delete(entityTags)
      .where(and(
        eq(entityTags.entityType, entityType),
        eq(entityTags.entityId, entityId),
        eq(entityTags.tagId, tagId)
      ));
  }

  async getEntityTags(entityType: string, entityId: number): Promise<Tag[]> {
    const tagResults = await this.db
      .select({ tag: tags })
      .from(entityTags)
      .innerJoin(tags, eq(entityTags.tagId, tags.id))
      .where(and(eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId)));
    return tagResults.map(r => r.tag);
  }

  // Comments
  async createComment(insertComment: InsertComment): Promise<Comment> {
    const commentData = this.addTimestamps(insertComment);
    const [comment] = await this.db
      .insert(comments)
      .values(commentData)
      .returning();
    return comment;
  }

  async getEntityComments(entityType: string, entityId: number): Promise<Comment[]> {
    return await this.db
      .select()
      .from(comments)
      .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)));
  }

  async updateComment(id: number, content: string): Promise<Comment> {
    const [comment] = await this.db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return comment;
  }

  async deleteComment(id: number): Promise<void> {
    await this.db.delete(comments).where(eq(comments.id, id));
  }

  // Files
  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await this.db
      .insert(files)
      .values({ ...insertFile, createdAt: new Date() })
      .returning();
    return file;
  }

  async getEntityFiles(entityType: string, entityId: number): Promise<File[]> {
    return await this.db
      .select()
      .from(files)
      .where(and(eq(files.entityType, entityType), eq(files.entityId, entityId)));
  }

  async deleteFile(id: number): Promise<void> {
    await this.db.delete(files).where(eq(files.id, id));
  }

  // Dependencies
  async addDependency(dependentType: string, dependentId: number, dependsOnType: string, dependsOnId: number, dependencyType: string = 'finish_to_start'): Promise<void> {
    await this.db
      .insert(dependencies)
      .values({ 
        dependentType, 
        dependentId, 
        dependsOnType, 
        dependsOnId, 
        dependencyType,
        createdAt: new Date() 
      });
  }

  async removeDependency(dependentType: string, dependentId: number, dependsOnType: string, dependsOnId: number): Promise<void> {
    await this.db
      .delete(dependencies)
      .where(and(
        eq(dependencies.dependentType, dependentType),
        eq(dependencies.dependentId, dependentId),
        eq(dependencies.dependsOnType, dependsOnType),
        eq(dependencies.dependsOnId, dependsOnId)
      ));
  }

  async getEntityDependencies(entityType: string, entityId: number): Promise<any[]> {
    return await this.db
      .select()
      .from(dependencies)
      .where(and(eq(dependencies.dependentType, entityType), eq(dependencies.dependentId, entityId)));
  }

  // Followers
  async followEntity(entityType: string, entityId: number, userId: number): Promise<void> {
    await this.db
      .insert(followers)
      .values({ entityType, entityId, userId, createdAt: new Date() });
  }

  async unfollowEntity(entityType: string, entityId: number, userId: number): Promise<void> {
    await this.db
      .delete(followers)
      .where(and(
        eq(followers.entityType, entityType),
        eq(followers.entityId, entityId),
        eq(followers.userId, userId)
      ));
  }

  async getEntityFollowers(entityType: string, entityId: number): Promise<User[]> {
    const followerResults = await this.db
      .select({ user: users })
      .from(followers)
      .innerJoin(users, eq(followers.userId, users.id))
      .where(and(eq(followers.entityType, entityType), eq(followers.entityId, entityId)));
    return followerResults.map(r => r.user);
  }

  async getUserFollowedEntities(userId: number): Promise<any[]> {
    return await this.db
      .select()
      .from(followers)
      .where(eq(followers.userId, userId));
  }

  // Entity Links
  async linkEntities(sourceType: string, sourceId: number, targetType: string, targetId: number, linkType: string = 'related'): Promise<void> {
    await this.db
      .insert(entityLinks)
      .values({ sourceType, sourceId, targetType, targetId, linkType, createdAt: new Date() });
  }

  async unlinkEntities(sourceType: string, sourceId: number, targetType: string, targetId: number): Promise<void> {
    await this.db
      .delete(entityLinks)
      .where(and(
        eq(entityLinks.sourceType, sourceType),
        eq(entityLinks.sourceId, sourceId),
        eq(entityLinks.targetType, targetType),
        eq(entityLinks.targetId, targetId)
      ));
  }

  async getEntityLinks(entityType: string, entityId: number): Promise<any[]> {
    return await this.db
      .select()
      .from(entityLinks)
      .where(or(
        and(eq(entityLinks.sourceType, entityType), eq(entityLinks.sourceId, entityId)),
        and(eq(entityLinks.targetType, entityType), eq(entityLinks.targetId, entityId))
      ));
  }

  // Search & Analytics
  async searchEntities(query: string, entityTypes: string[] = ['goal', 'project', 'task', 'subtask']): Promise<any[]> {
    const results: any[] = [];
    const searchTerm = `%${query}%`;

    if (entityTypes.includes('goal')) {
      const goalResults = await this.db
        .select()
        .from(goals)
        .where(or(
          sql`${goals.title} ILIKE ${searchTerm}`,
          sql`${goals.description} ILIKE ${searchTerm}`,
          sql`${goals.name} ILIKE ${searchTerm}`
        ));
      results.push(...goalResults.map(g => ({ ...g, entityType: 'goal' })));
    }

    if (entityTypes.includes('project')) {
      const projectResults = await this.db
        .select()
        .from(projects)
        .where(or(
          sql`${projects.title} ILIKE ${searchTerm}`,
          sql`${projects.description} ILIKE ${searchTerm}`,
          sql`${projects.name} ILIKE ${searchTerm}`
        ));
      results.push(...projectResults.map(p => ({ ...p, entityType: 'project' })));
    }

    if (entityTypes.includes('task')) {
      const taskResults = await this.db
        .select()
        .from(tasks)
        .where(or(
          sql`${tasks.title} ILIKE ${searchTerm}`,
          sql`${tasks.description} ILIKE ${searchTerm}`,
          sql`${tasks.name} ILIKE ${searchTerm}`
        ));
      results.push(...taskResults.map(t => ({ ...t, entityType: 'task' })));
    }

    if (entityTypes.includes('subtask')) {
      const subtaskResults = await this.db
        .select()
        .from(subtasks)
        .where(or(
          sql`${subtasks.title} ILIKE ${searchTerm}`,
          sql`${subtasks.description} ILIKE ${searchTerm}`,
          sql`${subtasks.name} ILIKE ${searchTerm}`
        ));
      results.push(...subtaskResults.map(s => ({ ...s, entityType: 'subtask' })));
    }

    return results;
  }

  async getProjectProgress(projectId: number): Promise<{ totalTasks: number; completedTasks: number; percentComplete: number }> {
    const projectTasks = await this.getTasksByProjectId(projectId);
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter(task => task.completed).length;
    const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, completedTasks, percentComplete };
  }

  async getGoalProgress(goalId: number): Promise<{ totalProjects: number; completedProjects: number; percentComplete: number }> {
    const goalProjects = await this.getProjectsByGoalId(goalId);
    const totalProjects = goalProjects.length;
    
    let completedProjects = 0;
    for (const project of goalProjects) {
      const progress = await this.getProjectProgress(project.id);
      if (progress.percentComplete === 100) {
        completedProjects++;
      }
    }
    
    const percentComplete = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    return { totalProjects, completedProjects, percentComplete };
  }

  // Ultra-optimized automatic progress calculation methods
  async recalculateTaskProgressOptimized(taskId: number): Promise<void> {
    // Get subtask completion data without JOIN
    const result = await this.db
      .select({
        totalSubtasks: sql<number>`count(*)`,
        completedSubtasks: sql<number>`count(case when ${subtasks.status} = 'completed' or ${subtasks.completed} = true then 1 end)`,
      })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId));

    const { totalSubtasks, completedSubtasks } = result[0];
    
    if (totalSubtasks === 0) return;
    
    const percentComplete = Math.round((completedSubtasks / totalSubtasks) * 100);
    
    const updateData: any = {
      percentComplete: percentComplete.toString(),
      updatedAt: new Date()
    };
    
    if (percentComplete === 100) {
      updateData.status = 'completed';
      updateData.completed = true;
      updateData.completedAt = new Date();
    } else if (percentComplete > 0) {
      updateData.status = 'in_progress';
      updateData.completed = false;
    } else {
      updateData.status = 'pending';
      updateData.completed = false;
    }
    
    // Update task and get projectId in single returning query
    const [updatedTask] = await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning({ projectId: tasks.projectId });

    // Cascade to parent project
    if (updatedTask?.projectId) {
      await this.recalculateProjectProgressOptimized(updatedTask.projectId);
    }
  }

  async recalculateProjectProgressOptimized(projectId: number): Promise<void> {
    // Get task completion data without JOIN
    const result = await this.db
      .select({
        totalTasks: sql<number>`count(*)`,
        completedTasks: sql<number>`count(case when ${tasks.status} = 'completed' or ${tasks.completed} = true then 1 end)`,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    const { totalTasks, completedTasks } = result[0];
    
    if (totalTasks === 0) return;
    
    const percentComplete = Math.round((completedTasks / totalTasks) * 100);
    
    const updateData: any = {
      percentComplete: percentComplete.toString(),
      updatedAt: new Date()
    };
    
    if (percentComplete === 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    } else if (percentComplete > 0) {
      updateData.status = 'in_progress';
    } else {
      updateData.status = 'pending';
    }
    
    // Update project and get goalId in single returning query
    const [updatedProject] = await this.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning({ goalId: projects.goalId });

    // Cascade to parent goal
    if (updatedProject?.goalId) {
      await this.recalculateGoalProgressOptimized(updatedProject.goalId);
    }
  }

  async recalculateGoalProgressOptimized(goalId: number): Promise<void> {
    // Get all projects with their progress
    const goalProjects = await this.db
      .select({
        percentComplete: projects.percentComplete
      })
      .from(projects)
      .where(eq(projects.goalId, goalId));

    if (goalProjects.length === 0) return;
    
    // Calculate average progress across all projects
    const totalProgress = goalProjects.reduce((sum, project) => {
      const progress = parseFloat(project.percentComplete || '0');
      return sum + progress;
    }, 0);
    
    const percentComplete = Math.round(totalProgress / goalProjects.length);
    
    const updateData: any = {
      percentComplete: percentComplete.toFixed(2),
      updatedAt: new Date()
    };
    
    if (percentComplete === 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    } else if (percentComplete > 0) {
      updateData.status = 'in_progress';
    } else {
      updateData.status = 'pending';
    }
    
    await this.db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, goalId));
  }

  // Ultra-fast batch hierarchy update - updates all levels at once
  async recalculateHierarchyProgressBatch(taskId: number): Promise<void> {
    // Get hierarchy IDs in a single query
    const hierarchyResult = await this.db
      .select({
        taskId: tasks.id,
        projectId: tasks.projectId,
        goalId: projects.goalId
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId));

    const hierarchy = hierarchyResult[0];
    if (!hierarchy) return;

    // Batch all progress calculations in parallel instead of sequential
    const progressPromises = [];

    // Task progress
    const taskProgressPromise = this.db
      .select({
        totalSubtasks: sql<number>`count(*)`,
        completedSubtasks: sql<number>`count(case when ${subtasks.status} = 'completed' or ${subtasks.completed} = true then 1 end)`,
      })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .then(async ([result]) => {
        if (result.totalSubtasks === 0) return;
        const percentComplete = Math.round((result.completedSubtasks / result.totalSubtasks) * 100);
        
        const updateData: any = {
          percentComplete: percentComplete.toString(),
          updatedAt: new Date()
        };
        
        if (percentComplete === 100) {
          updateData.status = 'completed';
          updateData.completed = true;
          updateData.completedAt = new Date();
        } else if (percentComplete > 0) {
          updateData.status = 'in_progress';
          updateData.completed = false;
        } else {
          updateData.status = 'pending';
          updateData.completed = false;
        }
        
        return this.db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
      });

    progressPromises.push(taskProgressPromise);

    // Project progress (if exists)
    if (hierarchy.projectId) {
      const projectProgressPromise = this.db
        .select({
          totalTasks: sql<number>`count(*)`,
          completedTasks: sql<number>`count(case when ${tasks.status} = 'completed' or ${tasks.completed} = true then 1 end)`,
        })
        .from(tasks)
        .where(eq(tasks.projectId, hierarchy.projectId))
        .then(async ([result]) => {
          if (result.totalTasks === 0) return;
          const percentComplete = Math.round((result.completedTasks / result.totalTasks) * 100);
          
          const updateData: any = {
            percentComplete: percentComplete.toString(),
            updatedAt: new Date()
          };
          
          if (percentComplete === 100) {
            updateData.status = 'completed';
            updateData.completedAt = new Date();
          } else if (percentComplete > 0) {
            updateData.status = 'in_progress';
          } else {
            updateData.status = 'pending';
          }
          
          return this.db.update(projects).set(updateData).where(eq(projects.id, hierarchy.projectId));
        });

      progressPromises.push(projectProgressPromise);
    }

    // Goal progress (if exists)
    if (hierarchy.goalId) {
      const goalProgressPromise = this.db
        .select({
          percentComplete: projects.percentComplete
        })
        .from(projects)
        .where(eq(projects.goalId, hierarchy.goalId))
        .then(async (goalProjects) => {
          if (goalProjects.length === 0) return;
          
          // Calculate average progress across all projects
          const totalProgress = goalProjects.reduce((sum, project) => {
            const progress = parseFloat(project.percentComplete || '0');
            return sum + progress;
          }, 0);
          
          const percentComplete = Math.round(totalProgress / goalProjects.length);
          
          const updateData: any = {
            percentComplete: percentComplete.toFixed(2),
            updatedAt: new Date()
          };
          
          if (percentComplete === 100) {
            updateData.status = 'completed';
            updateData.completedAt = new Date();
          } else if (percentComplete > 0) {
            updateData.status = 'in_progress';
          } else {
            updateData.status = 'pending';
          }
          
          return this.db.update(goals).set(updateData).where(eq(goals.id, hierarchy.goalId));
        });

      progressPromises.push(goalProgressPromise);
    }

    // Execute all updates in parallel
    await Promise.all(progressPromises);
  }

  // Legacy methods for backward compatibility
  async recalculateTaskProgress(taskId: number): Promise<void> {
    const subtasks = await this.getSubtasksByTaskId(taskId);
    if (subtasks.length === 0) return;
    
    const completedSubtasks = subtasks.filter(s => s.status === 'completed' || s.completed === true);
    const percentComplete = Math.round((completedSubtasks.length / subtasks.length) * 100);
    
    const updateData: any = {
      percentComplete: percentComplete.toString(),
      updatedAt: new Date()
    };
    
    if (percentComplete === 100) {
      updateData.status = 'completed';
      updateData.completed = true;
      updateData.completedAt = new Date();
    } else if (percentComplete > 0) {
      updateData.status = 'in_progress';
      updateData.completed = false;
    } else {
      updateData.status = 'pending';
      updateData.completed = false;
    }
    
    await this.db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId));

    // Cascade to parent project
    const task = await this.getTask(taskId);
    if (task?.projectId) {
      await this.recalculateProjectProgress(task.projectId);
    }
  }

  async recalculateProjectProgress(projectId: number): Promise<void> {
    const tasks = await this.getTasksByProjectId(projectId);
    if (tasks.length === 0) return;
    
    const completedTasks = tasks.filter(t => t.status === 'completed' || t.completed === true);
    const percentComplete = Math.round((completedTasks.length / tasks.length) * 100);
    
    const updateData: any = {
      percentComplete: percentComplete.toString(),
      updatedAt: new Date()
    };
    
    if (percentComplete === 100) {
      updateData.status = 'completed';
      updateData.completed = true;
      updateData.completedAt = new Date();
    } else if (percentComplete > 0) {
      updateData.status = 'in_progress';
      updateData.completed = false;
    } else {
      updateData.status = 'pending';
      updateData.completed = false;
    }
    
    await this.db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));

    // Cascade to parent goal
    const project = await this.getProject(projectId);
    if (project?.goalId) {
      await this.recalculateGoalProgress(project.goalId);
    }
  }

  async recalculateGoalProgress(goalId: number): Promise<void> {
    const projects = await this.getProjectsByGoalId(goalId);
    if (projects.length === 0) return;
    
    const completedProjects = projects.filter(p => p.status === 'completed' || p.completed === true);
    const percentComplete = Math.round((completedProjects.length / projects.length) * 100);
    
    const updateData: any = {
      percentComplete: percentComplete.toString(),
      updatedAt: new Date()
    };
    
    if (percentComplete === 100) {
      updateData.status = 'completed';
      updateData.completed = true;
      updateData.completedAt = new Date();
    } else if (percentComplete > 0) {
      updateData.status = 'in_progress';
      updateData.completed = false;
    } else {
      updateData.status = 'pending';
      updateData.completed = false;
    }
    
    await this.db
      .update(goals)
      .set(updateData)
      .where(eq(goals.id, goalId));
  }

  async getUserWorkload(userId: number): Promise<{ goals: number; projects: number; tasks: number; subtasks: number }> {
    const userGoals = await this.db.select().from(goals).where(eq(goals.assignedTo, userId));
    const userProjects = await this.db.select().from(projects).where(eq(projects.assignedTo, userId));
    const userTasks = await this.db.select().from(tasks).where(eq(tasks.assignedTo, userId));
    const userSubtasks = await this.db.select().from(subtasks).where(eq(subtasks.assignedTo, userId));

    return {
      goals: userGoals.length,
      projects: userProjects.length,
      tasks: userTasks.length,
      subtasks: userSubtasks.length,
    };
  }

  // Pending breakdowns (legacy support)
  async createPendingBreakdown(insertBreakdown: InsertPendingBreakdown): Promise<PendingBreakdown> {
    const [breakdown] = await this.db
      .insert(pendingBreakdowns)
      .values({ ...insertBreakdown, createdAt: new Date() })
      .returning();
    return breakdown;
  }

  async getAllPendingBreakdowns(): Promise<PendingBreakdown[]> {
    return await this.db.select().from(pendingBreakdowns);
  }

  async getPendingBreakdown(id: number): Promise<PendingBreakdown | undefined> {
    const [breakdown] = await this.db.select().from(pendingBreakdowns).where(eq(pendingBreakdowns.id, id));
    return breakdown || undefined;
  }

  async deletePendingBreakdown(id: number): Promise<void> {
    await this.db.delete(pendingBreakdowns).where(eq(pendingBreakdowns.id, id));
  }

  // Delete methods with cascading
  async deleteGoal(id: number): Promise<void> {
    // Delete cascades: goal -> projects -> tasks -> subtasks
    const goalProjects = await this.db.select({ id: projects.id }).from(projects).where(eq(projects.goalId, id));
    
    for (const project of goalProjects) {
      await this.deleteProject(project.id);
    }
    
    await this.db.delete(goals).where(eq(goals.id, id));
  }

  async deleteProject(id: number): Promise<void> {
    // Delete cascades: project -> tasks -> subtasks
    const projectTasks = await this.db.select({ id: tasks.id }).from(tasks).where(eq(tasks.projectId, id));
    
    for (const task of projectTasks) {
      await this.deleteTask(task.id);
    }
    
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  async deleteTask(id: number): Promise<void> {
    // Delete cascades: task -> subtasks
    await this.db.delete(subtasks).where(eq(subtasks.taskId, id));
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }

  async deleteSubtask(id: number): Promise<void> {
    // Get parent task for progress recalculation
    const [subtask] = await this.db.select({ taskId: subtasks.taskId }).from(subtasks).where(eq(subtasks.id, id));
    
    await this.db.delete(subtasks).where(eq(subtasks.id, id));
    
    // Recalculate parent task progress after deletion
    if (subtask?.taskId) {
      await this.recalculateHierarchyProgressBatch(subtask.taskId);
    }
  }
}

// Export both enhanced and legacy storage interfaces
export const enhancedStorage = new EnhancedDatabaseStorage();
export const storage = enhancedStorage; // Legacy compatibility