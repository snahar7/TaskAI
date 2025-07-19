import { atom } from 'jotai';
import { goalsAtom, projectsAtom, tasksAtom } from './atoms';

// Action atoms for mutations - these will eventually become events
export const updateTaskAtom = atom(
  null,
  async (get, set, { taskId, updates }: { taskId: number, updates: any }) => {
    try {
      // Optimistic update
      const currentTasks = get(tasksAtom);
      if (currentTasks.data) {
        const updatedTasks = currentTasks.data.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        );
        // Temporarily update the local state
        set(tasksAtom, { ...currentTasks, data: updatedTasks });
      }

      // Make API call
      const response = await fetch(`/api/tasks/${taskId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        set(tasksAtom, currentTasks);
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      
      // Update with server response
      if (currentTasks.data) {
        const finalTasks = currentTasks.data.map(task => 
          task.id === taskId ? updatedTask : task
        );
        set(tasksAtom, { ...currentTasks, data: finalTasks });
      }

      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }
);

export const completeTaskAtom = atom(
  null,
  async (get, set, taskId: number) => {
    try {
      const updateAction = get(updateTaskAtom);
      await set(updateTaskAtom, { taskId, updates: { completed: true } });
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }
);

// Event-sourced actions (future enhancement)
export const taskEventAtom = atom(
  null,
  (get, set, event: { type: string, payload: any, timestamp?: string }) => {
    // Future: This will publish events to the event store
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      userId: 4 // Will get from auth context
    };
    
    console.log('Task Event:', eventWithTimestamp);
    
    // For now, just delegate to existing actions
    switch (event.type) {
      case 'TASK_UPDATED':
        set(updateTaskAtom, { 
          taskId: event.payload.taskId, 
          updates: event.payload.updates 
        });
        break;
      case 'TASK_COMPLETED':
        set(completeTaskAtom, event.payload.taskId);
        break;
    }
  }
);