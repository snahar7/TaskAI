// Reactive Sync Service - Bridge between database changes and reactive atoms
import { getDefaultStore } from 'jotai';
import { goalsAtom, projectsAtom, tasksAtom } from '@/store/atoms';
import { eventStoreAtom, publishEventAtom } from '@/store/events';

class ReactiveSyncService {
  private store = getDefaultStore();

  // Sync database changes to reactive atoms
  async syncGoals() {
    console.log('🔄 Syncing goals to reactive state');
    try {
      const response = await fetch('/api/goals', { credentials: 'include' });
      if (response.ok) {
        const goals = await response.json();
        this.store.set(goalsAtom, { data: goals, isLoading: false, error: null });
      }
    } catch (error) {
      console.error('Failed to sync goals:', error);
      this.store.set(goalsAtom, { data: null, isLoading: false, error });
    }
  }

  async syncProjects() {
    console.log('🔄 Syncing projects to reactive state');
    try {
      const response = await fetch('/api/projects', { credentials: 'include' });
      if (response.ok) {
        const projects = await response.json();
        this.store.set(projectsAtom, { data: projects, isLoading: false, error: null });
      }
    } catch (error) {
      console.error('Failed to sync projects:', error);
      this.store.set(projectsAtom, { data: null, isLoading: false, error });
    }
  }

  async syncTasks() {
    console.log('🔄 Syncing tasks to reactive state');
    try {
      const response = await fetch('/api/tasks', { credentials: 'include' });
      if (response.ok) {
        const tasks = await response.json();
        this.store.set(tasksAtom, { data: tasks, isLoading: false, error: null });
      }
    } catch (error) {
      console.error('Failed to sync tasks:', error);
      this.store.set(tasksAtom, { data: null, isLoading: false, error });
    }
  }

  // Sync all data after any database change
  async syncAll() {
    console.log('🔄 Full reactive sync triggered');
    await Promise.all([
      this.syncGoals(),
      this.syncProjects(), 
      this.syncTasks()
    ]);
  }

  // Optimistic updates for immediate UI feedback
  optimisticUpdateTask(taskId: number, updates: any) {
    const currentTasks = this.store.get(tasksAtom);
    if (currentTasks.data) {
      const updatedTasks = currentTasks.data.map((task: any) => 
        task.id === taskId ? { ...task, ...updates } : task
      );
      this.store.set(tasksAtom, { ...currentTasks, data: updatedTasks });
    }
  }

  optimisticUpdateProject(projectId: number, updates: any) {
    const currentProjects = this.store.get(projectsAtom);
    if (currentProjects.data) {
      const updatedProjects = currentProjects.data.map((project: any) => 
        project.id === projectId ? { ...project, ...updates } : project
      );
      this.store.set(projectsAtom, { ...currentProjects, data: updatedProjects });
    }
  }

  optimisticUpdateGoal(goalId: number, updates: any) {
    const currentGoals = this.store.get(goalsAtom);
    if (currentGoals.data) {
      const updatedGoals = currentGoals.data.map((goal: any) => 
        goal.id === goalId ? { ...goal, ...updates } : goal
      );
      this.store.set(goalsAtom, { ...currentGoals, data: updatedGoals });
    }
  }

  // Publish events for all CRUD operations
  publishEvent(type: string, payload: any) {
    this.store.set(publishEventAtom, {
      type,
      payload,
      userId: 4, // TODO: Get from auth context
      timestamp: new Date().toISOString()
    });
  }

  // Enhanced CRUD operations that update both database and reactive state
  async updateTaskWithReactiveSync(taskId: number, updates: any) {
    console.log('🚀 Enhanced task update with reactive sync');
    
    // 1. Optimistic update for instant UI feedback
    this.optimisticUpdateTask(taskId, updates);
    
    // 2. Publish event for audit trail
    this.publishEvent('TASK_UPDATED', { taskId, updates });
    
    try {
      // 3. Update database
      const response = await fetch(`/api/database/tasks/${taskId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // 4. Sync all data to ensure consistency
      await this.syncAll();
      
      return await response.json();
    } catch (error) {
      console.error('Task update failed, reverting optimistic update');
      // Revert optimistic update on failure
      await this.syncTasks();
      throw error;
    }
  }

  async updateProjectWithReactiveSync(projectId: number, updates: any) {
    console.log('🚀 Enhanced project update with reactive sync');
    
    this.optimisticUpdateProject(projectId, updates);
    this.publishEvent('PROJECT_UPDATED', { projectId, updates });
    
    try {
      const response = await fetch(`/api/database/projects/${projectId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      await this.syncAll();
      return await response.json();
    } catch (error) {
      console.error('Project update failed, reverting optimistic update');
      await this.syncProjects();
      throw error;
    }
  }

  async updateGoalWithReactiveSync(goalId: number, updates: any) {
    console.log('🚀 Enhanced goal update with reactive sync');
    
    this.optimisticUpdateGoal(goalId, updates);
    this.publishEvent('GOAL_UPDATED', { goalId, updates });
    
    try {
      const response = await fetch(`/api/database/goals/${goalId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      await this.syncAll();
      return await response.json();
    } catch (error) {
      console.error('Goal update failed, reverting optimistic update');
      await this.syncGoals();
      throw error;
    }
  }

  // AI Breakdown integration
  async approveBreakdownWithReactiveSync(pendingId: number, approved: boolean, editedBreakdown?: any) {
    console.log('🚀 Enhanced AI breakdown approval with reactive sync');
    
    this.publishEvent('AI_BREAKDOWN_APPROVED', { pendingId, approved });
    
    try {
      const response = await fetch('/api/goals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pendingId, approved, editedBreakdown })
      });

      if (!response.ok) {
        throw new Error('Failed to approve breakdown');
      }

      // Critical: Sync all data after AI breakdown creates new items
      await this.syncAll();
      
      this.publishEvent('NEW_GOAL_CREATED', { pendingId });
      
      return await response.json();
    } catch (error) {
      console.error('Breakdown approval failed');
      throw error;
    }
  }
}

// Export singleton instance
export const reactiveSyncService = new ReactiveSyncService();