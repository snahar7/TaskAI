import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';

// Core data atoms - these replace React Query with reactive state
export const userAtom = atom(null);

// Goals atom with automatic query
export const goalsAtom = atomWithQuery((get) => ({
  queryKey: ['/api/goals'],
  queryFn: async () => {
    const response = await fetch('/api/goals', {
      credentials: 'include' // Include session cookies
    });
    if (!response.ok) throw new Error('Failed to fetch goals');
    return response.json();
  },
}));

// Projects atom with automatic query
export const projectsAtom = atomWithQuery((get) => ({
  queryKey: ['/api/projects'],
  queryFn: async () => {
    const response = await fetch('/api/projects', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },
}));

// Tasks atom with automatic query
export const tasksAtom = atomWithQuery((get) => ({
  queryKey: ['/api/tasks'],
  queryFn: async () => {
    const response = await fetch('/api/tasks', {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },
}));

// Derived atoms for computed state
export const todayTasksAtom = atom((get) => {
  const tasks = get(tasksAtom);
  if (!tasks.data) return [];
  
  const today = new Date().toISOString().split('T')[0];
  return tasks.data.filter(task => {
    if (!task.deadline) return false;
    const deadline = task.deadline.split('T')[0];
    return deadline === today && !task.completed;
  });
});

export const overdueTasksAtom = atom((get) => {
  const tasks = get(tasksAtom);
  if (!tasks.data) return [];
  
  const today = new Date().toISOString().split('T')[0];
  return tasks.data.filter(task => {
    if (!task.deadline) return false;
    const deadline = task.deadline.split('T')[0];
    return deadline < today && !task.completed;
  });
});

// Dashboard stats derived atom
export const dashboardStatsAtom = atom((get) => {
  const goals = get(goalsAtom);
  const projects = get(projectsAtom);
  const tasks = get(tasksAtom);
  const todayTasks = get(todayTasksAtom);
  const overdueTasks = get(overdueTasksAtom);

  if (!goals.data || !projects.data || !tasks.data) {
    return {
      totalGoals: 0,
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      todayTasks: [],
      overdueTasks: [],
      completionRate: 0
    };
  }

  const completedTasks = tasks.data.filter(t => t.completed).length;
  const completionRate = tasks.data.length > 0 ? (completedTasks / tasks.data.length) * 100 : 0;

  return {
    totalGoals: goals.data.length,
    totalProjects: projects.data.length,
    totalTasks: tasks.data.length,
    completedTasks,
    todayTasks,
    overdueTasks,
    completionRate: Math.round(completionRate)
  };
});