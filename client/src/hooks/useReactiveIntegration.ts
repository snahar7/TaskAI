// Integration layer: Makes reactive state work with existing React Query components
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { goalsAtom, projectsAtom, tasksAtom, todayTasksAtom, overdueTasksAtom, dashboardStatsAtom } from '@/store/atoms';

// Hook to seamlessly integrate reactive state with existing dashboard
export function useReactiveGoalsWithFallback() {
  const reactiveGoals = useAtomValue(goalsAtom);
  
  // Fallback to React Query if reactive data not available
  const fallbackQuery = useQuery({
    queryKey: ['/api/goals'],
    queryFn: async () => {
      const response = await fetch('/api/goals', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch goals');
      return response.json();
    },
    enabled: !reactiveGoals.data
  });

  return {
    data: reactiveGoals.data || fallbackQuery.data,
    isLoading: reactiveGoals.isLoading || fallbackQuery.isLoading,
    error: reactiveGoals.error || fallbackQuery.error
  };
}

// Hook for reactive tasks with fallback
export function useReactiveTasksWithFallback() {
  const reactiveTasks = useAtomValue(tasksAtom);
  
  const fallbackQuery = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
    enabled: !reactiveTasks.data
  });

  return {
    data: reactiveTasks.data || fallbackQuery.data,
    isLoading: reactiveTasks.isLoading || fallbackQuery.isLoading,
    error: reactiveTasks.error || fallbackQuery.error
  };
}

// Hook for reactive projects with fallback
export function useReactiveProjectsWithFallback() {
  const reactiveProjects = useAtomValue(projectsAtom);
  
  const fallbackQuery = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
    enabled: !reactiveProjects.data
  });

  return {
    data: reactiveProjects.data || fallbackQuery.data,
    isLoading: reactiveProjects.isLoading || fallbackQuery.isLoading,
    error: reactiveProjects.error || fallbackQuery.error
  };
}

// Enhanced dashboard stats with reactive data
export function useReactiveDashboardStats() {
  const stats = useAtomValue(dashboardStatsAtom);
  const todayTasks = useAtomValue(todayTasksAtom);
  const overdueTasks = useAtomValue(overdueTasksAtom);

  return {
    stats,
    todayTasks,
    overdueTasks,
    // Computed metrics that auto-update
    productivity: {
      completionRate: stats.completionRate,
      tasksRemaining: stats.totalTasks - stats.completedTasks,
      urgentTasks: todayTasks.filter(task => task.priority === 'urgent').length
    }
  };
}

// Database page integration
export function useReactiveDatabaseStats() {
  const goals = useAtomValue(goalsAtom);
  const projects = useAtomValue(projectsAtom);
  const tasks = useAtomValue(tasksAtom);

  return {
    totalGoals: goals.data?.length || 0,
    totalProjects: projects.data?.length || 0,
    totalTasks: tasks.data?.length || 0,
    completedTasks: tasks.data?.filter(task => task.completed).length || 0,
    isLoading: goals.isLoading || projects.isLoading || tasks.isLoading
  };
}