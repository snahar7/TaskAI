import { db } from "../db";
import { goals, projects, tasks, subtasks } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Comprehensive progress update service that handles cascading progress calculations
 * throughout the 4-level hierarchy: Goal → Project → Task → Subtask
 */
export class ProgressUpdater {
  
  /**
   * Main entry point: Updates subtask and cascades progress up the hierarchy
   */
  async updateSubtaskProgress(subtaskId: number, completed: boolean): Promise<void> {
    console.log(`🚀 Starting progress update chain for subtask ${subtaskId}, completed: ${completed}`);
    
    try {
      // Step 1: Update the subtask itself
      await this.updateSubtaskStatus(subtaskId, completed);
      
      // Step 2: Get hierarchy information for cascading
      const hierarchy = await this.getHierarchyInfo(subtaskId);
      if (!hierarchy) {
        console.error(`❌ Could not find hierarchy for subtask ${subtaskId}`);
        return;
      }
      
      console.log(`📊 Hierarchy found: Subtask ${subtaskId} → Task ${hierarchy.taskId} → Project ${hierarchy.projectId} → Goal ${hierarchy.goalId}`);
      
      // Step 3: Cascade progress updates up the hierarchy
      if (hierarchy.taskId) {
        await this.recalculateTaskProgress(hierarchy.taskId);
      }
      if (hierarchy.projectId) {
        await this.recalculateProjectProgress(hierarchy.projectId);
      }
      if (hierarchy.goalId) {
        await this.recalculateGoalProgress(hierarchy.goalId);
      }
      
      console.log(`✅ Progress update chain completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error in progress update chain:`, error);
      throw error;
    }
  }
  
  /**
   * Updates task completion and cascades up
   */
  async updateTaskProgress(taskId: number, completed: boolean): Promise<void> {
    console.log(`🚀 Starting task progress update for task ${taskId}, completed: ${completed}`);
    
    try {
      // Update task status
      await this.updateTaskStatus(taskId, completed);
      
      // Get project and goal info
      const taskInfo = await db
        .select({
          projectId: tasks.projectId,
          goalId: projects.goalId
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(eq(tasks.id, taskId));
      
      const task = taskInfo[0];
      if (task?.projectId) {
        await this.recalculateProjectProgress(task.projectId);
      }
      if (task?.goalId) {
        await this.recalculateGoalProgress(task.goalId);
      }
      
      console.log(`✅ Task progress update completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error in task progress update:`, error);
      throw error;
    }
  }
  
  /**
   * Updates project completion and cascades up
   */
  async updateProjectProgress(projectId: number, completed: boolean): Promise<void> {
    console.log(`🚀 Starting project progress update for project ${projectId}, completed: ${completed}`);
    
    try {
      // Update project status
      await this.updateProjectStatus(projectId, completed);
      
      // Get goal info
      const projectInfo = await db
        .select({ goalId: projects.goalId })
        .from(projects)
        .where(eq(projects.id, projectId));
      
      const project = projectInfo[0];
      if (project?.goalId) {
        await this.recalculateGoalProgress(project.goalId);
      }
      
      console.log(`✅ Project progress update completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error in project progress update:`, error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private async updateSubtaskStatus(subtaskId: number, completed: boolean): Promise<void> {
    const updateData: any = {
      completed,
      status: completed ? 'completed' : 'in_progress',
      updatedAt: new Date()
    };
    
    if (completed) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
    
    await db.update(subtasks).set(updateData).where(eq(subtasks.id, subtaskId));
    console.log(`📝 Updated subtask ${subtaskId}: status=${updateData.status}, completed=${completed}`);
  }
  
  private async updateTaskStatus(taskId: number, completed: boolean): Promise<void> {
    const updateData: any = {
      completed,
      status: completed ? 'completed' : 'in_progress',
      percentComplete: completed ? '100.00' : '0.00',
      updatedAt: new Date()
    };
    
    if (completed) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
    
    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
    console.log(`📝 Updated task ${taskId}: status=${updateData.status}, completed=${completed}, progress=${updateData.percentComplete}%`);
  }
  
  private async updateProjectStatus(projectId: number, completed: boolean): Promise<void> {
    const updateData: any = {
      status: completed ? 'completed' : 'in_progress',
      percentComplete: completed ? '100.00' : '0.00',
      updatedAt: new Date()
    };
    
    if (completed) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
    
    await db.update(projects).set(updateData).where(eq(projects.id, projectId));
    console.log(`📝 Updated project ${projectId}: status=${updateData.status}, progress=${updateData.percentComplete}%`);
  }
  
  private async getHierarchyInfo(subtaskId: number): Promise<{
    taskId: number | null;
    projectId: number | null;
    goalId: number | null;
  } | undefined> {
    const result = await db
      .select({
        taskId: tasks.id,
        projectId: tasks.projectId,
        goalId: projects.goalId
      })
      .from(subtasks)
      .leftJoin(tasks, eq(subtasks.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(subtasks.id, subtaskId));
    
    return result[0];
  }
  
  private async recalculateTaskProgress(taskId: number): Promise<void> {
    // Get all subtasks for this task
    const taskSubtasks = await db
      .select({
        id: subtasks.id,
        completed: subtasks.completed,
        status: subtasks.status
      })
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId));
    
    if (taskSubtasks.length === 0) {
      console.log(`⚠️ Task ${taskId} has no subtasks, skipping progress calculation`);
      return;
    }
    
    // Calculate progress based on completed subtasks
    const completedCount = taskSubtasks.filter(s => s.completed || s.status === 'completed').length;
    const progressPercent = Math.round((completedCount / taskSubtasks.length) * 100);
    
    const updateData: any = {
      percentComplete: progressPercent.toFixed(2),
      updatedAt: new Date()
    };
    
    if (progressPercent === 100) {
      updateData.status = 'completed';
      updateData.completed = true;
      updateData.completedAt = new Date();
    } else if (progressPercent > 0) {
      updateData.status = 'in_progress';
      updateData.completed = false;
    } else {
      updateData.status = 'pending';
      updateData.completed = false;
    }
    
    await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
    console.log(`📊 Task ${taskId} progress: ${completedCount}/${taskSubtasks.length} subtasks completed = ${progressPercent}%`);
  }
  
  private async recalculateProjectProgress(projectId: number): Promise<void> {
    // Get all tasks for this project with their progress
    const projectTasks = await db
      .select({
        id: tasks.id,
        percentComplete: tasks.percentComplete,
        status: tasks.status
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    if (projectTasks.length === 0) {
      console.log(`⚠️ Project ${projectId} has no tasks, skipping progress calculation`);
      return;
    }
    
    // Calculate average progress across all tasks
    const totalProgress = projectTasks.reduce((sum, task) => {
      const progress = parseFloat(task.percentComplete || '0');
      return sum + progress;
    }, 0);
    
    const progressPercent = Math.round(totalProgress / projectTasks.length);
    
    const updateData: any = {
      percentComplete: progressPercent.toFixed(2),
      updatedAt: new Date()
    };
    
    if (progressPercent === 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    } else if (progressPercent > 0) {
      updateData.status = 'in_progress';
    } else {
      updateData.status = 'pending';
    }
    
    await db.update(projects).set(updateData).where(eq(projects.id, projectId));
    console.log(`📊 Project ${projectId} progress: average of ${projectTasks.length} tasks = ${progressPercent}%`);
  }
  
  private async recalculateGoalProgress(goalId: number): Promise<void> {
    // Get all projects for this goal with their progress
    const goalProjects = await db
      .select({
        id: projects.id,
        percentComplete: projects.percentComplete,
        status: projects.status
      })
      .from(projects)
      .where(eq(projects.goalId, goalId));
    
    if (goalProjects.length === 0) {
      console.log(`⚠️ Goal ${goalId} has no projects, skipping progress calculation`);
      return;
    }
    
    // Calculate average progress across all projects
    const totalProgress = goalProjects.reduce((sum, project) => {
      const progress = parseFloat(project.percentComplete || '0');
      return sum + progress;
    }, 0);
    
    const progressPercent = Math.round(totalProgress / goalProjects.length);
    
    const updateData: any = {
      percentComplete: progressPercent.toFixed(2),
      updatedAt: new Date()
    };
    
    if (progressPercent === 100) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
    } else if (progressPercent > 0) {
      updateData.status = 'in_progress';
    } else {
      updateData.status = 'pending';
    }
    
    await db.update(goals).set(updateData).where(eq(goals.id, goalId));
    console.log(`📊 Goal ${goalId} progress: average of ${goalProjects.length} projects = ${progressPercent}%`);
  }
}

// Export singleton instance
export const progressUpdater = new ProgressUpdater();