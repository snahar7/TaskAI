import { useAtomValue, useSetAtom } from 'jotai';
import { 
  goalsAtom, 
  projectsAtom, 
  tasksAtom, 
  dashboardStatsAtom,
  todayTasksAtom,
  overdueTasksAtom 
} from '../store/atoms';
import { updateTaskAtom, completeTaskAtom, taskEventAtom } from '../store/actions';

// Custom hooks for reactive data access
export function useReactiveGoals() {
  const goals = useAtomValue(goalsAtom);
  return {
    data: goals.data || [],
    isLoading: goals.isLoading,
    error: goals.error
  };
}

export function useReactiveProjects() {
  const projects = useAtomValue(projectsAtom);
  return {
    data: projects.data || [],
    isLoading: projects.isLoading,
    error: projects.error
  };
}

export function useReactiveTasks() {
  const tasks = useAtomValue(tasksAtom);
  return {
    data: tasks.data || [],
    isLoading: tasks.isLoading,
    error: tasks.error
  };
}

export function useReactiveDashboard() {
  const stats = useAtomValue(dashboardStatsAtom);
  const todayTasks = useAtomValue(todayTasksAtom);
  const overdueTasks = useAtomValue(overdueTasksAtom);
  
  return {
    stats,
    todayTasks,
    overdueTasks,
    isLoading: false // Derived atoms are never loading
  };
}

// Action hooks
export function useTaskActions() {
  const updateTask = useSetAtom(updateTaskAtom);
  const completeTask = useSetAtom(completeTaskAtom);
  const publishEvent = useSetAtom(taskEventAtom);
  
  return {
    updateTask,
    completeTask,
    // Event-sourced actions
    publishTaskEvent: publishEvent,
    // Convenience methods
    updateTaskEvent: (taskId: number, updates: any) => 
      publishEvent({ type: 'TASK_UPDATED', payload: { taskId, updates } }),
    completeTaskEvent: (taskId: number) => 
      publishEvent({ type: 'TASK_COMPLETED', payload: { taskId } })
  };
}