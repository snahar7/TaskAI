import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Target, FolderOpen, CheckSquare, ListTodo, Trash2, Zap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Goal, Project, Task, Subtask } from "@shared/schema";

export default function DatabaseOptimizedPage() {
  const queryClient = useQueryClient();
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  
  // Break down functionality state
  const [breakdownDialog, setBreakdownDialog] = useState<{
    isOpen: boolean;
    itemType: 'task' | 'project' | null;
    itemId: number | null;
    breakdown: any;
    isLoading: boolean;
  }>({
    isOpen: false,
    itemType: null,
    itemId: null,
    breakdown: null,
    isLoading: false
  });

  // Break down mutation for getting AI breakdown
  const breakdownMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'task' | 'project'; id: number }) => {
      setBreakdownDialog(prev => ({ ...prev, isLoading: true }));
      return apiRequest("POST", `/api/${type}s/${id}/breakdown`, {});
    },
    onSuccess: (data, { type, id }) => {
      setBreakdownDialog({
        isOpen: true,
        itemType: type,
        itemId: id,
        breakdown: data,
        isLoading: false
      });
    },
    onError: () => {
      setBreakdownDialog(prev => ({ ...prev, isLoading: false }));
    },
  });

  // Apply breakdown mutation for creating sub-items
  const applyBreakdownMutation = useMutation({
    mutationFn: async ({ type, id, subItems }: { type: 'task' | 'project'; id: number; subItems: any[] }) => {
      return apiRequest("POST", `/api/${type}s/${id}/apply-breakdown`, { subItems });
    },
    onSuccess: (_data, { type, id }) => {
      // Refresh appropriate caches
      if (type === 'task') {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/tasks/") &&
            query.queryKey[0].includes("/subtasks")
        });
      } else if (type === 'project') {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/projects/") &&
            query.queryKey[0].includes("/tasks")
        });
      }
      
      // Close dialog
      setBreakdownDialog({
        isOpen: false,
        itemType: null,
        itemId: null,
        breakdown: null,
        isLoading: false
      });
    },
  });

  // Load goals only (lightweight query)
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  // Toggle functions with simplified event handling
  const toggleGoalExpansion = (goalId: number) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleProjectExpansion = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTaskExpansion = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Completion mutation with instant optimistic updates for all levels
  const completionMutation = useMutation({
    mutationFn: async ({ type, id, completed }: { type: string; id: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/${type}s/${id}/complete`, { completed });
    },
    onMutate: async ({ type, id, completed }) => {
      // Cancel all outgoing refetches for instant UI feedback
      await queryClient.cancelQueries();
      
      // Store snapshots for rollback
      const snapshots: any = {};
      
      // Update all query caches to show instant feedback
      if (type === "subtask") {
        // Find and update the subtask in its parent's cache
        const allTaskKeys = queryClient.getQueryCache().findAll({ queryKey: ['/api/tasks/'] });
        allTaskKeys.forEach(query => {
          const key = query.queryKey as string[];
          if (key[0].startsWith('/api/tasks/') && key[0].includes('/subtasks')) {
            const oldData = queryClient.getQueryData(key) as any[];
            if (oldData) {
              snapshots[key.join()] = oldData;
              queryClient.setQueryData(key, oldData.map(subtask => 
                subtask.id === id ? { ...subtask, completed, status: completed ? "completed" : "in_progress" } : subtask
              ));
            }
          }
        });
        
        // Also optimistically update parent caches with estimated progress
        const allProjectKeys = queryClient.getQueryCache().findAll({ queryKey: ['/api/projects/'] });
        allProjectKeys.forEach(query => {
          const key = query.queryKey as string[];
          if (key[0].startsWith('/api/projects/') && key[0].includes('/tasks')) {
            const oldData = queryClient.getQueryData(key) as any[];
            if (oldData) {
              snapshots[key.join() + "_tasks"] = oldData;
              // Update with estimated progress (will be corrected by server response)
              queryClient.setQueryData(key, oldData.map(task => {
                // Find if this task contains the subtask we're updating
                const taskSubtasks = queryClient.getQueryData([`/api/tasks/${task.id}/subtasks`]) as any[];
                if (taskSubtasks && taskSubtasks.some(s => s.id === id)) {
                  // Calculate estimated progress for this task
                  const updatedSubtasks = taskSubtasks.map(s => 
                    s.id === id ? { ...s, completed } : s
                  );
                  const completedCount = updatedSubtasks.filter(s => s.completed).length;
                  const estimatedProgress = Math.round((completedCount / updatedSubtasks.length) * 100);
                  return { 
                    ...task, 
                    percentComplete: estimatedProgress.toFixed(2),
                    status: estimatedProgress === 100 ? 'completed' : estimatedProgress > 0 ? 'in_progress' : 'pending'
                  };
                }
                return task;
              }));
            }
          }
        });
      } else if (type === "task") {
        // Update task in project cache
        const allProjectKeys = queryClient.getQueryCache().findAll({ queryKey: ['/api/projects/'] });
        allProjectKeys.forEach(query => {
          const key = query.queryKey as string[];
          if (key[0].startsWith('/api/projects/') && key[0].includes('/tasks')) {
            const oldData = queryClient.getQueryData(key) as any[];
            if (oldData) {
              snapshots[key.join()] = oldData;
              queryClient.setQueryData(key, oldData.map(task => 
                task.id === id ? { ...task, completed, status: completed ? "completed" : "in_progress" } : task
              ));
            }
          }
        });
      } else if (type === "project") {
        // Update project in goal cache
        const allGoalKeys = queryClient.getQueryCache().findAll({ queryKey: ['/api/goals/'] });
        allGoalKeys.forEach(query => {
          const key = query.queryKey as string[];
          if (key[0].startsWith('/api/goals/') && key[0].includes('/projects')) {
            const oldData = queryClient.getQueryData(key) as any[];
            if (oldData) {
              snapshots[key.join()] = oldData;
              queryClient.setQueryData(key, oldData.map(project => 
                project.id === id ? { ...project, status: completed ? "completed" : "in_progress" } : project
              ));
            }
          }
        });
      } else if (type === "goal") {
        // Update goal in main list
        const oldGoals = queryClient.getQueryData(["/api/goals"]) as any[];
        if (oldGoals) {
          snapshots["/api/goals"] = oldGoals;
          queryClient.setQueryData(["/api/goals"], oldGoals.map(goal => 
            goal.id === id ? { ...goal, status: completed ? "completed" : "in_progress", percentComplete: completed ? "100.00" : goal.percentComplete } : goal
          ));
        }
      }
      
      return { snapshots };
    },
    onError: (err, variables, context) => {
      // Rollback all snapshots on error
      if (context?.snapshots) {
        Object.entries(context.snapshots).forEach(([key, data]) => {
          const queryKey = key.includes(',') ? key.split(',') : [key];
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (_data, _error, { type, id }) => {
      // Comprehensive cache invalidation for cascade progress updates
      
      // Always refresh top-level goals (contains percentComplete values)
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });

      if (type === "subtask") {
        // For subtask completion, invalidate all hierarchy levels upward
        
        // 1. Invalidate all subtask lists (immediate level)
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/tasks/") &&
            query.queryKey[0].includes("/subtasks")
        });
        
        // 2. Invalidate all task lists (parent level - for updated percentComplete)
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/projects/") &&
            query.queryKey[0].includes("/tasks")
        });
        
        // 3. Invalidate all project lists (grandparent level - for updated percentComplete)
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/goals/") &&
            query.queryKey[0].includes("/projects")
        });
      }

      if (type === "task") {
        // Refresh project task lists when a task is toggled
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/projects/") &&
            query.queryKey[0].includes("/tasks")
        });
        
        // Also refresh project lists for updated percentComplete
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/goals/") &&
            query.queryKey[0].includes("/projects")
        });
      }

      if (type === "project") {
        // Refresh goal project lists when a project is toggled
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/goals/") &&
            query.queryKey[0].includes("/projects")
        });
      }
    },
  });

  // Delete mutation with comprehensive cache invalidation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      return apiRequest("DELETE", `/api/${type}s/${id}`, {});
    },
    onSuccess: (_data, { type, id }) => {
      // Always refresh the top-level goals list
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });

      // Invalidate specific child caches based on what was deleted
      if (type === "goal") {
        // When a goal is deleted, invalidate all its projects
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/goals/") &&
            query.queryKey[0].includes("/projects")
        });
      }

      if (type === "project") {
        // When a project is deleted, invalidate all its tasks and any goal-level project lists
        queryClient.invalidateQueries({
          predicate: (query) => {
            if (!Array.isArray(query.queryKey) || typeof query.queryKey[0] !== "string") return false;
            const key = query.queryKey[0];
            return (key.startsWith("/api/goals/") && key.includes("/projects")) ||
                   (key.startsWith("/api/projects/") && key.includes("/tasks"));
          }
        });
      }

      if (type === "task") {
        // When a task is deleted, invalidate project-level task lists and task-level subtask lists
        queryClient.invalidateQueries({
          predicate: (query) => {
            if (!Array.isArray(query.queryKey) || typeof query.queryKey[0] !== "string") return false;
            const key = query.queryKey[0];
            return (key.startsWith("/api/projects/") && key.includes("/tasks")) ||
                   (key.startsWith("/api/tasks/") && key.includes("/subtasks"));
          }
        });
      }

      if (type === "subtask") {
        // When a subtask is deleted, invalidate task-level subtask lists
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/tasks/") &&
            query.queryKey[0].includes("/subtasks")
        });
      }
    },
  });

  // Progressive loading components
  const ProjectRow = ({ goalId, isExpanded }: { goalId: number; isExpanded: boolean }) => {
    const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
      queryKey: [`/api/goals/${goalId}/projects`],
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    if (!isExpanded) return null;
    if (projectsLoading) return <TableRow><TableCell colSpan={8} className="text-center">Loading projects...</TableCell></TableRow>;

    return (
      <>
        {projects.map((project) => (
          <React.Fragment key={project.id}>
            <TableRow 
              className="bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => toggleProjectExpansion(project.id)}
            >
              <TableCell className="pl-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProjectExpansion(project.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded touch-manipulation select-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    type="button"
                  >
                    {expandedProjects.has(project.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{project.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">Project</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{project.status || "Active"}</TableCell>
              <TableCell className="hidden md:table-cell">{project.priority || "Medium"}</TableCell>
              <TableCell>
                <Progress value={parseFloat(project.percentComplete || "0")} className="w-20" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">{project.deadline ? format(new Date(project.deadline), "MMM dd") : "No deadline"}</TableCell>
              <TableCell className="hidden lg:table-cell">{project.assignedTo || "Unassigned"}</TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={project.status === "completed"}
                    onCheckedChange={(checked) =>
                      completionMutation.mutate({
                        type: "project",
                        id: project.id,
                        completed: checked as boolean
                      })
                    }
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => breakdownMutation.mutate({ type: "project", id: project.id })}
                    disabled={breakdownMutation.isPending}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    title="Break down this project with AI"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this project and all its tasks?')) {
                        deleteMutation.mutate({ type: "project", id: project.id });
                      }
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TaskRow projectId={project.id} isExpanded={expandedProjects.has(project.id)} />
          </React.Fragment>
        ))}
      </>
    );
  };

  const TaskRow = ({ projectId, isExpanded }: { projectId: number; isExpanded: boolean }) => {
    const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
      queryKey: [`/api/projects/${projectId}/tasks`],
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    if (!isExpanded) return null;
    if (tasksLoading) return <TableRow><TableCell colSpan={8} className="text-center pl-16">Loading tasks...</TableCell></TableRow>;

    return (
      <>
        {tasks.map((task) => (
          <React.Fragment key={task.id}>
            <TableRow 
              className="bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => toggleTaskExpansion(task.id)}
            >
              <TableCell className="pl-16">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskExpansion(task.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded touch-manipulation select-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    type="button"
                  >
                    {expandedTasks.has(task.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <CheckSquare className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{task.title}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">Task</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{task.status || "Active"}</TableCell>
              <TableCell className="hidden md:table-cell">{task.priority || "Medium"}</TableCell>
              <TableCell>
                <Progress value={parseFloat(task.percentComplete || "0")} className="w-20" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">{task.deadline ? format(new Date(task.deadline), "MMM dd") : "No deadline"}</TableCell>
              <TableCell className="hidden lg:table-cell">{task.assignedTo || "Unassigned"}</TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={task.completed || task.status === "completed"}
                    onCheckedChange={(checked) =>
                      completionMutation.mutate({
                        type: "task",
                        id: task.id,
                        completed: checked as boolean
                      })
                    }
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()} className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => breakdownMutation.mutate({ type: "task", id: task.id })}
                    disabled={breakdownMutation.isPending}
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    title="Break down this task with AI"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this task and all its subtasks?')) {
                        deleteMutation.mutate({ type: "task", id: task.id });
                      }
                    }}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <SubtaskRow taskId={task.id} isExpanded={expandedTasks.has(task.id)} />
          </React.Fragment>
        ))}
      </>
    );
  };

  const SubtaskRow = ({ taskId, isExpanded }: { taskId: number; isExpanded: boolean }) => {
    const { data: subtasks = [], isLoading: subtasksLoading } = useQuery<Subtask[]>({
      queryKey: [`/api/tasks/${taskId}/subtasks`],
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    if (!isExpanded) return null;
    if (subtasksLoading) return <TableRow><TableCell colSpan={8} className="text-center pl-24">Loading subtasks...</TableCell></TableRow>;

    return (
      <>
        {subtasks.map((subtask) => (
          <TableRow key={subtask.id} className="bg-yellow-50">
            <TableCell className="pl-24">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-yellow-600" />
                <span>{subtask.title}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">Subtask</Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">{subtask.status || "Active"}</TableCell>
            <TableCell className="hidden md:table-cell">{subtask.priority || "Medium"}</TableCell>
            <TableCell>
              <div className="w-20 text-sm">
                {subtask.status === "completed" ? "✓ Complete" : "In Progress"}
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell">{subtask.deadline ? format(new Date(subtask.deadline), "MMM dd") : "No deadline"}</TableCell>
            <TableCell className="hidden lg:table-cell">{subtask.assignedTo || "Unassigned"}</TableCell>
            <TableCell>
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={subtask.completed || subtask.status === "completed"}
                  onCheckedChange={(checked) =>
                    completionMutation.mutate({
                      type: "subtask",
                      id: subtask.id,
                      completed: checked as boolean
                    })
                  }
                />
              </div>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Delete this subtask?')) {
                    deleteMutation.mutate({ type: "subtask", id: subtask.id });
                  }
                }}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Task Database - Optimized</h1>
          <p className="text-gray-600">Hierarchical view with progressive loading for better performance</p>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No goals found. Create your first goal to get started!</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[80px]">Type</TableHead>
                  <TableHead className="min-w-[90px] hidden sm:table-cell">Status</TableHead>
                  <TableHead className="min-w-[90px] hidden md:table-cell">Priority</TableHead>
                  <TableHead className="min-w-[100px]">Progress</TableHead>
                  <TableHead className="min-w-[100px] hidden lg:table-cell">Deadline</TableHead>
                  <TableHead className="min-w-[100px] hidden lg:table-cell">Assigned</TableHead>
                  <TableHead className="min-w-[60px]">Done</TableHead>
                  <TableHead className="min-w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => (
                  <React.Fragment key={goal.id}>
                    <TableRow 
                      className="bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                      onClick={() => toggleGoalExpansion(goal.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGoalExpansion(goal.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded touch-manipulation select-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                            type="button"
                          >
                            {expandedGoals.has(goal.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          <Target className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">{goal.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>Goal</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{goal.status || "Active"}</TableCell>
                      <TableCell className="hidden md:table-cell">{goal.priority || "Medium"}</TableCell>
                      <TableCell>
                        <Progress value={parseFloat(goal.percentComplete || "0")} className="w-20" />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{goal.deadline ? format(new Date(goal.deadline), "MMM dd") : "No deadline"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{goal.assignedTo || "Unassigned"}</TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={goal.status === "completed"}
                            onCheckedChange={(checked) =>
                              completionMutation.mutate({
                                type: "goal",
                                id: goal.id,
                                completed: checked as boolean
                              })
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this goal and all its projects/tasks?')) {
                                deleteMutation.mutate({ type: "goal", id: goal.id });
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <ProjectRow goalId={goal.id} isExpanded={expandedGoals.has(goal.id)} />
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Break Down Dialog */}
      <Dialog open={breakdownDialog.isOpen} onOpenChange={(open) => 
        !open && setBreakdownDialog({ isOpen: false, itemType: null, itemId: null, breakdown: null, isLoading: false })
      }>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              AI Breakdown for {breakdownDialog.itemType === 'task' ? 'Task' : 'Project'}
            </DialogTitle>
            <DialogDescription>
              Review the AI-generated breakdown and apply to create new {breakdownDialog.itemType === 'task' ? 'subtasks' : 'tasks'}.
            </DialogDescription>
          </DialogHeader>

          {breakdownDialog.isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Generating breakdown with AI...</p>
            </div>
          ) : breakdownDialog.breakdown ? (
            <div className="space-y-6">
              {/* Debug: Show raw breakdown data */}
              {console.log('Breakdown data:', breakdownDialog.breakdown)}
              
              {/* Analysis Summary */}
              {breakdownDialog.breakdown?.analysis && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">AI Analysis</h4>
                  <p className="text-sm text-blue-800 mb-2">{breakdownDialog.breakdown.analysis.reasoning}</p>
                  {breakdownDialog.breakdown.analysis.suggestions && (
                    <div className="text-sm text-blue-700">
                      <strong>Suggestions:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {breakdownDialog.breakdown.analysis.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-items List */}
              <div>
                <h4 className="font-medium mb-3">
                  Generated {breakdownDialog.itemType === 'task' ? 'Subtasks' : 'Tasks'} 
                  ({breakdownDialog.breakdown?.subItems?.length || 0})
                </h4>
                <div className="space-y-3">
                  {breakdownDialog.breakdown?.subItems?.map((item: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium">{item.title}</h5>
                        <Badge variant={item.urgency === 'High' ? 'destructive' : item.urgency === 'Medium' ? 'default' : 'secondary'}>
                          {item.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>⏱️ {item.estimatedHours}h</span>
                        <span>📅 {item.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setBreakdownDialog({ isOpen: false, itemType: null, itemId: null, breakdown: null, isLoading: false })}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (breakdownDialog.itemType && breakdownDialog.itemId && breakdownDialog.breakdown?.subItems) {
                      applyBreakdownMutation.mutate({
                        type: breakdownDialog.itemType,
                        id: breakdownDialog.itemId,
                        subItems: breakdownDialog.breakdown.subItems
                      });
                    }
                  }}
                  disabled={applyBreakdownMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {applyBreakdownMutation.isPending ? 'Creating...' : `Create ${breakdownDialog.itemType === 'task' ? 'Subtasks' : 'Tasks'}`}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}