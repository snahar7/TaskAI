import { storage } from "../storage-enhanced";

interface TimelineCalculation {
  estimatedDays: number;
  deadline: string;
  startDate: string;
}

interface HierarchyItem {
  id: number;
  title: string;
  estimatedDays?: number;
  deadline?: string;
  startDate?: string;
  dependencies?: number[];
}

class TimelineCalculator {
  
  // Calculate business days between two dates (excluding weekends)
  private calculateBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  // Add business days to a date (excluding weekends)
  private addBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate);
    let addedDays = 0;
    
    while (addedDays < businessDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
        addedDays++;
      }
    }
    
    return result;
  }

  // Calculate estimated days from deadline (business days from now to deadline)
  calculateEstimatedDaysFromDeadline(deadline: string | Date): number {
    const today = new Date();
    const deadlineDate = this.toDate(deadline);
    
    if (deadlineDate <= today) {
      return 1; // Minimum 1 day for overdue/today items
    }
    
    return this.calculateBusinessDays(today, deadlineDate);
  }

  // Calculate deadline from estimated days (add business days to today)
  calculateDeadlineFromEstimatedDays(estimatedDays: number): string {
    const today = new Date();
    const deadline = this.addBusinessDays(today, estimatedDays);
    return deadline.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  // Safely convert value to Date object
  private toDate(value: string | Date): Date {
    if (value instanceof Date) {
      return value;
    }
    return new Date(value);
  }

  // Calculate timeline for a hierarchy based on dependencies and estimated days
  calculateHierarchyTimeline(items: HierarchyItem[]): Map<number, TimelineCalculation> {
    const results = new Map<number, TimelineCalculation>();
    const processed = new Set<number>();
    
    // Sort items by dependencies (items with no dependencies first)
    const sortedItems = [...items].sort((a, b) => {
      const aDeps = a.dependencies?.length || 0;
      const bDeps = b.dependencies?.length || 0;
      return aDeps - bDeps;
    });

    let currentStartDate = new Date();

    for (const item of sortedItems) {
      if (processed.has(item.id)) continue;

      // Calculate start date based on dependencies
      let itemStartDate = new Date(currentStartDate);
      
      if (item.dependencies?.length) {
        // Find the latest end date of all dependencies
        let latestEndDate = new Date(currentStartDate);
        
        for (const depId of item.dependencies) {
          const depResult = results.get(depId);
          if (depResult) {
            const depEndDate = new Date(depResult.deadline);
            if (depEndDate > latestEndDate) {
              latestEndDate = depEndDate;
            }
          }
        }
        
        // Start the next business day after dependencies complete
        itemStartDate = this.addBusinessDays(latestEndDate, 1);
      }

      // Use existing estimated days or default to 3
      const estimatedDays = item.estimatedDays || 3;
      
      // Calculate deadline based on start date + estimated days
      const deadline = this.addBusinessDays(itemStartDate, estimatedDays);

      results.set(item.id, {
        estimatedDays,
        deadline: deadline.toISOString().split('T')[0],
        startDate: itemStartDate.toISOString().split('T')[0]
      });

      processed.add(item.id);
      
      // Update current start date for next item (if no dependencies)
      if (!item.dependencies?.length) {
        currentStartDate = this.addBusinessDays(deadline, 1);
      }
    }

    return results;
  }

  // Recalculate timeline for an entire project when a task is updated
  async recalculateProjectTimeline(projectId: number): Promise<void> {
    const tasks = await storage.getTasksByProjectId(projectId);
    
    // Convert tasks to hierarchy items
    const hierarchyItems: HierarchyItem[] = tasks.map(task => ({
      id: task.id,
      title: task.title,
      estimatedDays: task.estimatedDays,
      deadline: task.deadline,
      dependencies: [] // Could be enhanced to support task dependencies
    }));

    const timeline = this.calculateHierarchyTimeline(hierarchyItems);
    
    // Update each task with new timeline
    for (const [taskId, calculation] of timeline) {
      await storage.updateTask(taskId, {
        estimatedDays: calculation.estimatedDays,
        deadline: new Date(calculation.deadline + 'T00:00:00.000Z')
      });
    }
  }

  // Recalculate timeline for an entire goal when a project is updated
  async recalculateGoalTimeline(goalId: number): Promise<void> {
    const projects = await storage.getProjectsByGoalId(goalId);
    
    // Calculate total estimated days and latest deadline
    let totalEstimatedDays = 0;
    let latestDeadline: Date | null = null;

    for (const project of projects) {
      const tasks = await storage.getTasksByProjectId(project.id);
      
      let projectEstimatedDays = 0;
      let projectLatestDeadline: Date | null = null;

      for (const task of tasks) {
        projectEstimatedDays += task.estimatedDays || 3;
        
        if (task.deadline) {
          const taskDeadline = new Date(task.deadline);
          if (!projectLatestDeadline || taskDeadline > projectLatestDeadline) {
            projectLatestDeadline = taskDeadline;
          }
        }
      }

      // Update project with calculated values
      const projectDeadline = projectLatestDeadline || this.addBusinessDays(new Date(), projectEstimatedDays);
      await storage.updateProject(project.id, {
        estimatedDays: projectEstimatedDays,
        deadline: projectDeadline
      });

      totalEstimatedDays += projectEstimatedDays;
      
      if (!latestDeadline || projectDeadline > latestDeadline) {
        latestDeadline = projectDeadline;
      }
    }

    // Update goal with calculated timeline
    const goalDeadline = latestDeadline || this.addBusinessDays(new Date(), totalEstimatedDays);
    await storage.updateGoal(goalId, {
      estimatedDays: totalEstimatedDays,
      deadline: goalDeadline
    });
  }

  // Smart recalculation when a field is edited
  async smartRecalculate(type: string, id: number, field: string, value: any): Promise<void> {
    console.log(`Smart recalculating ${type} ${id} field ${field} with value:`, value);

    if (type === "tasks") {
      const task = await storage.getTask(id);
      if (!task) return;

      if (field === "estimatedDays") {
        // When estimated days change, recalculate deadline
        const deadlineStr = this.calculateDeadlineFromEstimatedDays(Number(value));
        const newDeadline = new Date(deadlineStr + 'T00:00:00.000Z');
        await storage.updateTask(id, { deadline: newDeadline });
        
        // Recalculate parent project timeline
        await this.recalculateProjectTimeline(task.projectId);
        
        // Get project to find goal
        const project = await storage.getProject(task.projectId);
        if (project) {
          await this.recalculateGoalTimeline(project.goalId);
        }
        
      } else if (field === "deadline") {
        // When deadline changes, recalculate estimated days
        const newEstimatedDays = this.calculateEstimatedDaysFromDeadline(value);
        await storage.updateTask(id, { estimatedDays: newEstimatedDays });
        
        // Recalculate parent timelines
        await this.recalculateProjectTimeline(task.projectId);
        const project = await storage.getProject(task.projectId);
        if (project) {
          await this.recalculateGoalTimeline(project.goalId);
        }
      }
      
    } else if (type === "subtasks") {
      const subtask = await storage.getSubtask(id);
      if (!subtask) return;

      if (field === "estimatedDays") {
        const deadlineStr = this.calculateDeadlineFromEstimatedDays(Number(value));
        const newDeadline = new Date(deadlineStr + 'T00:00:00.000Z');
        await storage.updateSubtask(id, { deadline: newDeadline });
        
      } else if (field === "deadline") {
        const newEstimatedDays = this.calculateEstimatedDaysFromDeadline(value);
        await storage.updateSubtask(id, { estimatedDays: newEstimatedDays });
      }

      // Recalculate parent task timeline
      const task = await storage.getTask(subtask.taskId);
      if (task) {
        // Aggregate subtask estimates to update task
        const subtasks = await storage.getSubtasksByTaskId(subtask.taskId);
        const totalSubtaskDays = subtasks.reduce((sum, s) => sum + (s.estimatedDays || 1), 0);
        const latestSubtaskDeadline = subtasks
          .filter(s => s.deadline)
          .map(s => new Date(s.deadline!))
          .sort((a, b) => b.getTime() - a.getTime())[0];

        if (latestSubtaskDeadline) {
          await storage.updateTask(subtask.taskId, {
            estimatedDays: totalSubtaskDays,
            deadline: latestSubtaskDeadline
          });
        }

        // Cascade up to project and goal
        await this.recalculateProjectTimeline(task.projectId);
        const project = await storage.getProject(task.projectId);
        if (project) {
          await this.recalculateGoalTimeline(project.goalId);
        }
      }
      
    } else if (type === "projects") {
      const project = await storage.getProject(id);
      if (!project) return;

      if (field === "estimatedDays") {
        const deadlineStr = this.calculateDeadlineFromEstimatedDays(Number(value));
        const newDeadline = new Date(deadlineStr + 'T00:00:00.000Z');
        await storage.updateProject(id, { deadline: newDeadline });
        
      } else if (field === "deadline") {
        const newEstimatedDays = this.calculateEstimatedDaysFromDeadline(value);
        await storage.updateProject(id, { estimatedDays: newEstimatedDays });
      }

      // Recalculate goal timeline
      await this.recalculateGoalTimeline(project.goalId);
      
    } else if (type === "goals") {
      if (field === "estimatedDays") {
        const deadlineStr = this.calculateDeadlineFromEstimatedDays(Number(value));
        const newDeadline = new Date(deadlineStr + 'T00:00:00.000Z');
        await storage.updateGoal(id, { deadline: newDeadline });
        
      } else if (field === "deadline") {
        const newEstimatedDays = this.calculateEstimatedDaysFromDeadline(value);
        await storage.updateGoal(id, { estimatedDays: newEstimatedDays });
      }
    }
  }
}

export const timelineCalculator = new TimelineCalculator();