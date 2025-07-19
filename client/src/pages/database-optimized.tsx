import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Target, FolderOpen, CheckSquare, ListTodo, Trash2, Zap, Edit2, Save, X, Link2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Goal, Project, Task, Subtask } from "@shared/schema";
import { UserAvatar } from "@/components/UserAvatar";
import { TeamAssignmentDropdown } from "@/components/TeamAssignmentDropdown";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AuthGuard } from "@/components/AuthGuard";
import { formatDateForInput, getTodayDateString } from "@/lib/utils";
import { useReactiveDatabaseStats, useReactiveTaskMutation, useReactiveProjectMutation, useReactiveGoalMutation } from "@/hooks/useReactiveIntegration";

export default function DatabaseOptimizedPage() {
  return (
    <AuthGuard>
      <DatabaseContent />
    </AuthGuard>
  );
}

function DatabaseContent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  
  // Reactive stats integration
  const reactiveStats = useReactiveDatabaseStats();
  
  // Enhanced mutations with reactive integration
  const taskMutation = useReactiveTaskMutation();
  const projectMutation = useReactiveProjectMutation();
  const goalMutation = useReactiveGoalMutation();
  
  const editItemMutation = useMutation({
    mutationFn: async ({ type, id, updates }: { type: string; id: number; updates: any }) => {
      console.log(`🚀 Editing ${type} ${id} with updates:`, updates);
      
      // Use enhanced reactive mutations when available
      if (type === 'tasks' && taskMutation) {
        return taskMutation.mutateAsync({ taskId: id, updates });
      } else if (type === 'projects' && projectMutation) {
        return projectMutation.mutateAsync({ projectId: id, updates });
      } else if (type === 'goals' && goalMutation) {
        return goalMutation.mutateAsync({ goalId: id, updates });
      }
      
      // Fallback to direct API call
      const response = await apiRequest('PATCH', `/api/database/${type}/${id}/edit`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      toast({
        title: "Success",
        description: "Item updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(true);
  
  // Editing state management
  const [editingItems, setEditingItems] = useState<{
    [key: string]: { // key format: "type-id-field" e.g. "goal-1-title"
      value: any;
      originalValue: any;
    }
  }>({});

  // Helper functions for editing
  const startEditing = (type: string, id: number, field: string, currentValue: any) => {
    const key = `${type}-${id}-${field}`;
    
    // For date fields, use timezone-safe conversion to prevent "one day ahead" issue
    let editValue = currentValue;
    if (field === 'deadline' && currentValue) {
      console.log(`🐛 DEBUG startEditing deadline:`, {
        currentValue,
        type: typeof currentValue,
        formatDateForInputResult: formatDateForInput(currentValue)
      });
      editValue = formatDateForInput(currentValue);
    }
    
    setEditingItems(prev => ({
      ...prev,
      [key]: {
        value: editValue,
        originalValue: currentValue
      }
    }));
  };

  const updateEditingValue = (type: string, id: number, field: string, value: any) => {
    const key = `${type}-${id}-${field}`;
    setEditingItems(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value
      }
    }));
  };

  const cancelEditing = (type: string, id: number, field: string) => {
    const key = `${type}-${id}-${field}`;
    setEditingItems(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const getEditingValue = (type: string, id: number, field: string) => {
    const key = `${type}-${id}-${field}`;
    return editingItems[key]?.value;
  };

  const isEditing = (type: string, id: number, field: string) => {
    const key = `${type}-${id}-${field}`;
    return key in editingItems;
  };
  
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

  // Dependency management state
  const [dependencyDialog, setDependencyDialog] = useState<{
    isOpen: boolean;
    taskId: number | null;
    currentDependencies: number[];
    selectedDependencies: Set<number>;
  }>({
    isOpen: false,
    taskId: null,
    currentDependencies: [],
    selectedDependencies: new Set()
  });

  // Break down mutation for getting AI breakdown
  const breakdownMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'task' | 'project'; id: number }) => {
      setBreakdownDialog(prev => ({ ...prev, isLoading: true }));
      const response = await apiRequest("POST", `/api/${type}s/${id}/breakdown`, {});
      return await response.json(); // Parse the JSON from the Response
    },
    onSuccess: (data: any, { type, id }) => {
      console.log('Raw API response:', data);
      console.log('Extracted breakdown:', data.breakdown);
      setBreakdownDialog({
        isOpen: true,
        itemType: type,
        itemId: id,
        breakdown: data.breakdown, // Extract the actual breakdown data
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
      const response = await apiRequest("POST", `/api/${type}s/${id}/apply-breakdown`, { subItems });
      return await response.json();
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

  // Update item mutation for saving edits
  const updateItemMutation = useMutation({
    mutationFn: async ({ type, id, field, value }: { type: string; id: number; field: string; value: any }) => {
      const response = await apiRequest("PATCH", `/api/${type}/${id}/edit`, { [field]: value });
      return await response.json();
    },
    onSuccess: (data, { type, id, field }) => {
      // Remove from editing state
      cancelEditing(type, id, field);
      
      // Invalidate relevant caches
      if (type === "goals") {
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      } else if (type === "projects") {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/goals/") &&
            query.queryKey[0].includes("/projects")
        });
      } else if (type === "tasks") {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/projects/") &&
            query.queryKey[0].includes("/tasks")
        });
      } else if (type === "subtasks") {
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            typeof query.queryKey[0] === "string" &&
            query.queryKey[0].startsWith("/api/tasks/") &&
            query.queryKey[0].includes("/subtasks")
        });
      }
    },
    onError: (error, { type, id, field }) => {
      console.error('Failed to update item:', error);
      // Reset to original value on error
      cancelEditing(type, id, field);
    }
  });

  // Dependency update mutation
  const updateDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependencies }: { taskId: number; dependencies: number[] }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/edit`, { dependencies });
      return await response.json();
    },
    onSuccess: () => {
      // Close dialog
      setDependencyDialog({
        isOpen: false,
        taskId: null,
        currentDependencies: [],
        selectedDependencies: new Set()
      });
      
      // Invalidate task cache and all tasks cache
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          typeof query.queryKey[0] === "string" &&
          (query.queryKey[0].startsWith("/api/projects/") && query.queryKey[0].includes("/tasks")) ||
          query.queryKey[0] === "/api/tasks/all"
      });
    }
  });

  // Functions for dependency management
  const openDependencyDialog = (taskId: number, currentDependencies: number[]) => {
    setDependencyDialog({
      isOpen: true,
      taskId,
      currentDependencies,
      selectedDependencies: new Set(currentDependencies)
    });
  };

  const toggleDependency = (depTaskId: number) => {
    setDependencyDialog(prev => {
      const newSelected = new Set(prev.selectedDependencies);
      if (newSelected.has(depTaskId)) {
        newSelected.delete(depTaskId);
      } else {
        newSelected.add(depTaskId);
      }
      return { ...prev, selectedDependencies: newSelected };
    });
  };

  const saveDependencies = () => {
    if (dependencyDialog.taskId) {
      updateDependencyMutation.mutate({
        taskId: dependencyDialog.taskId,
        dependencies: Array.from(dependencyDialog.selectedDependencies)
      });
    }
  };

  // Editable field component
  const EditableField = ({ 
    type, 
    id, 
    field, 
    value, 
    displayValue, 
    fieldType = "text",
    options = [],
    className = "",
    placeholder = ""
  }: {
    type: string;
    id: number;
    field: string;
    value: any;
    displayValue?: string;
    fieldType?: "text" | "textarea" | "select" | "date" | "number";
    options?: string[];
    className?: string;
    placeholder?: string;
  }) => {
    const editing = isEditing(type, id, field);
    const editingValue = getEditingValue(type, id, field);

    if (editing) {
      return (
        <div className="flex items-center gap-1">
          {fieldType === "text" && (
            <Input
              value={editingValue || ""}
              onChange={(e) => updateEditingValue(type, id, field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateItemMutation.mutate({ type, id, field, value: editingValue });
                } else if (e.key === "Escape") {
                  cancelEditing(type, id, field);
                }
              }}
              className={`h-8 ${className}`}
              placeholder={placeholder}
              autoFocus
            />
          )}
          {fieldType === "textarea" && (
            <Textarea
              value={editingValue || ""}
              onChange={(e) => updateEditingValue(type, id, field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  updateItemMutation.mutate({ type, id, field, value: editingValue });
                } else if (e.key === "Escape") {
                  cancelEditing(type, id, field);
                }
              }}
              className={`min-h-[60px] ${className}`}
              placeholder={placeholder}
              autoFocus
            />
          )}
          {fieldType === "select" && (
            <Select
              value={editingValue || ""}
              onValueChange={(value) => updateEditingValue(type, id, field, value)}
            >
              <SelectTrigger className={`h-8 ${className}`}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {fieldType === "date" && (
            <Input
              type="date"
              value={editingValue || ""}
              onChange={(e) => updateEditingValue(type, id, field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateItemMutation.mutate({ type, id, field, value: editingValue });
                } else if (e.key === "Escape") {
                  cancelEditing(type, id, field);
                }
              }}
              className={`h-8 ${className}`}
              autoFocus
            />
          )}
          {fieldType === "number" && (
            <Input
              type="number"
              value={editingValue || ""}
              onChange={(e) => updateEditingValue(type, id, field, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateItemMutation.mutate({ type, id, field, value: editingValue });
                } else if (e.key === "Escape") {
                  cancelEditing(type, id, field);
                }
              }}
              className={`h-8 ${className}`}
              placeholder={placeholder}
              autoFocus
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateItemMutation.mutate({ type, id, field, value: editingValue })}
            disabled={updateItemMutation.isPending}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => cancelEditing(type, id, field)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div 
        className="group flex items-center gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 py-1"
        onClick={() => startEditing(type, id, field, value)}
      >
        <span className={className}>{displayValue || value || placeholder}</span>
        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 text-gray-400" />
      </div>
    );
  };

  // Load goals only (lightweight query)
  const { data: goalsData = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals", { assignedToMe: showMyTasksOnly }],
    queryFn: () => fetch(`/api/goals?assignedToMe=${showMyTasksOnly}`).then(res => res.json()),
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  // Ensure goals is always an array
  const goals = Array.isArray(goalsData) ? goalsData : [];

  // Load all tasks for dependency management
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/all"],
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
      queryKey: [`/api/goals/${goalId}/projects`, { assignedToMe: showMyTasksOnly }],
      queryFn: () => fetch(`/api/goals/${goalId}/projects?assignedToMe=${showMyTasksOnly}`).then(res => res.json()),
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    // Sort projects by deadline (earliest first, then null deadlines)
    const sortedProjects = [...projects].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    if (!isExpanded) return null;
    if (projectsLoading) return <TableRow><TableCell colSpan={11} className="text-center">Loading projects...</TableCell></TableRow>;

    return (
      <>
        {sortedProjects.map((project) => (
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
                  <span 
                    className="font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (project.goalId) {
                        navigate(`/goal/${project.goalId}/project/${project.id}`);
                      } else {
                        navigate(`/project/${project.id}`);
                      }
                    }}
                  >
                    {project.title}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">Project</Badge>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="projects"
                    id={project.id}
                    field="status"
                    value={project.status || "Active"}
                    fieldType="select"
                    options={["pending", "in_progress", "completed", "on_hold"]}
                    placeholder="Status"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="projects"
                    id={project.id}
                    field="priority"
                    value={project.priority || "Medium"}
                    fieldType="select"
                    options={["low", "medium", "high", "urgent"]}
                    placeholder="Priority"
                  />
                </div>
              </TableCell>
              <TableCell>
                <span className="text-gray-400 text-sm">-</span>
              </TableCell>
              <TableCell className="text-center">
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="projects"
                    id={project.id}
                    field="estimatedDays"
                    value={project.estimatedDays}
                    displayValue={project.estimatedDays ? `${project.estimatedDays}d` : "-"}
                    fieldType="number"
                    placeholder="Days"
                  />
                </div>
              </TableCell>
              <TableCell>
                <Progress value={parseFloat(project.percentComplete || "0")} className="w-20" />
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="projects"
                    id={project.id}
                    field="deadline"
                    value={project.deadline}
                    displayValue={project.deadline ? format(new Date(project.deadline.split('T')[0] + 'T12:00:00'), "MMM dd") : "No deadline"}
                    fieldType="date"
                    placeholder="Set deadline"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <TeamAssignmentDropdown 
                    type="projects" 
                    id={project.id} 
                    assignedUserId={project.assignedTo} 
                  />
                </div>
              </TableCell>
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
      queryKey: [`/api/projects/${projectId}/tasks`, { assignedToMe: showMyTasksOnly }],
      queryFn: () => fetch(`/api/projects/${projectId}/tasks?assignedToMe=${showMyTasksOnly}`).then(res => res.json()),
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });



    // Sort tasks by deadline (earliest first, then null deadlines)
    const sortedTasks = [...tasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    if (!isExpanded) return null;
    if (tasksLoading) return <TableRow><TableCell colSpan={11} className="text-center pl-16">Loading tasks...</TableCell></TableRow>;

    return (
      <>
        {sortedTasks.map((task) => (
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
                  <span 
                    className="font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Use hierarchical navigation if available, otherwise fallback to direct route
                      if (task.goalId && task.projectId) {
                        navigate(`/goal/${task.goalId}/project/${task.projectId}/task/${task.id}`);
                      } else {
                        navigate(`/task/${task.id}`);
                      }
                    }}
                  >
                    {task.title}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">Task</Badge>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="tasks"
                    id={task.id}
                    field="status"
                    value={task.status || "Active"}
                    fieldType="select"
                    options={["pending", "in_progress", "completed", "on_hold"]}
                    placeholder="Status"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="tasks"
                    id={task.id}
                    field="priority"
                    value={task.priority || "Medium"}
                    fieldType="select"
                    options={["low", "medium", "high", "urgent"]}
                    placeholder="Priority"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  {task.dependencies && Array.isArray(task.dependencies) && task.dependencies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.dependencies.map((depId, index) => {
                        const dependentTask = allTasks.find(t => t.id === depId);
                        return (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {dependentTask ? dependentTask.title.substring(0, 15) + (dependentTask.title.length > 15 ? '...' : '') : `Task ${depId}`}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">None</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDependencyDialog(task.id, task.dependencies || [])}
                    className="mt-1 h-6 text-xs px-2 text-blue-600 hover:text-blue-800"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="tasks"
                    id={task.id}
                    field="estimatedDays"
                    value={task.estimatedDays}
                    displayValue={task.estimatedDays ? `${task.estimatedDays}d` : "-"}
                    fieldType="number"
                    placeholder="Days"
                  />
                </div>
              </TableCell>
              <TableCell>
                <Progress value={parseFloat(task.percentComplete || "0")} className="w-20" />
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <EditableField
                    type="tasks"
                    id={task.id}
                    field="deadline"
                    value={task.deadline}
                    displayValue={task.deadline ? format(new Date(task.deadline.split('T')[0] + 'T12:00:00'), "MMM dd") : "No deadline"}
                    fieldType="date"
                    placeholder="Set deadline"
                  />
                </div>
              </TableCell>
              <TableCell>
                <div onClick={(e) => e.stopPropagation()}>
                  <TeamAssignmentDropdown 
                    type="tasks" 
                    id={task.id} 
                    assignedUserId={task.assignedTo} 
                  />
                </div>
              </TableCell>
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
      queryKey: [`/api/tasks/${taskId}/subtasks`, { assignedToMe: showMyTasksOnly }],
      queryFn: () => fetch(`/api/tasks/${taskId}/subtasks?assignedToMe=${showMyTasksOnly}`).then(res => res.json()),
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    // Sort subtasks by deadline (earliest first, then null deadlines)
    const sortedSubtasks = [...subtasks].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    if (!isExpanded) return null;
    if (subtasksLoading) return <TableRow><TableCell colSpan={10} className="text-center pl-24">Loading subtasks...</TableCell></TableRow>;

    return (
      <>
        {sortedSubtasks.map((subtask) => (
          <TableRow key={subtask.id} className="bg-yellow-50">
            <TableCell className="pl-24">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-yellow-600" />
                <span 
                  className="font-medium text-sm cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to dedicated subtask detail page
                    if (subtask.goalId && subtask.projectId && subtask.taskId) {
                      navigate(`/goal/${subtask.goalId}/project/${subtask.projectId}/task/${subtask.taskId}/subtask/${subtask.id}`);
                    } else if (subtask.taskId) {
                      navigate(`/task/${subtask.taskId}/subtask/${subtask.id}`);
                    } else {
                      navigate(`/subtask/${subtask.id}`);
                    }
                  }}
                >
                  {subtask.title}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">Subtask</Badge>
            </TableCell>
            <TableCell>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableField
                  type="subtasks"
                  id={subtask.id}
                  field="status"
                  value={subtask.status || "Active"}
                  fieldType="select"
                  options={["pending", "in_progress", "completed", "on_hold"]}
                  placeholder="Status"
                />
              </div>
            </TableCell>
            <TableCell>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableField
                  type="subtasks"
                  id={subtask.id}
                  field="priority"
                  value={subtask.priority || "Medium"}
                  fieldType="select"
                  options={["low", "medium", "high", "urgent"]}
                  placeholder="Priority"
                />
              </div>
            </TableCell>
            <TableCell>
              <span className="text-gray-400 text-sm">-</span>
            </TableCell>
            <TableCell className="text-center">
              <div onClick={(e) => e.stopPropagation()}>
                <EditableField
                  type="subtasks"
                  id={subtask.id}
                  field="estimatedDays"
                  value={subtask.estimatedDays}
                  displayValue={subtask.estimatedDays ? `${subtask.estimatedDays}d` : "-"}
                  fieldType="number"
                  placeholder="Days"
                />
              </div>
            </TableCell>
            <TableCell>
              <div className="w-20 text-sm">
                {subtask.status === "completed" ? "✓ Complete" : "In Progress"}
              </div>
            </TableCell>
            <TableCell>
              <div onClick={(e) => e.stopPropagation()}>
                <EditableField
                  type="subtasks"
                  id={subtask.id}
                  field="deadline"
                  value={subtask.deadline}
                  displayValue={subtask.deadline ? format(new Date(subtask.deadline.split('T')[0] + 'T12:00:00'), "MMM dd") : "No deadline"}
                  fieldType="date"
                  placeholder="Set deadline"
                />
              </div>
            </TableCell>
            <TableCell>
              <div onClick={(e) => e.stopPropagation()}>
                <TeamAssignmentDropdown 
                  type="subtasks" 
                  id={subtask.id} 
                  assignedUserId={subtask.assignedTo} 
                />
              </div>
            </TableCell>
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Task Database - Optimized</h1>
              <p className="text-sm sm:text-base text-gray-600">Hierarchical view with progressive loading for better performance</p>
            </div>
            
            {/* Filter Toggle */}
            {user && (
              <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border">
                <Switch
                  id="my-tasks-filter"
                  checked={showMyTasksOnly}
                  onCheckedChange={setShowMyTasksOnly}
                />
                <Label htmlFor="my-tasks-filter" className="text-sm font-medium">
                  Show only my tasks
                </Label>
              </div>
            )}
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No goals found. Create your first goal to get started!</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden bg-white overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] text-xs sm:text-sm">Name</TableHead>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">Type</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm">Priority</TableHead>
                  <TableHead className="min-w-[120px] text-xs sm:text-sm">Dependencies</TableHead>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">Days</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm">Progress</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm">Deadline</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm">Assigned</TableHead>
                  <TableHead className="min-w-[60px] text-xs sm:text-sm">Done</TableHead>
                  <TableHead className="min-w-[70px] text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals
                  .sort((a, b) => {
                    // Sort goals by deadline (earliest first, then null deadlines)
                    if (!a.deadline && !b.deadline) return 0;
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                  })
                  .map((goal) => (
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
                          <span 
                            className="font-medium cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/goal/${goal.id}`);
                            }}
                          >
                            {goal.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>Goal</Badge>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableField
                            type="goals"
                            id={goal.id}
                            field="status"
                            value={goal.status || "Active"}
                            fieldType="select"
                            options={["pending", "in_progress", "completed", "on_hold"]}
                            placeholder="Status"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableField
                            type="goals"
                            id={goal.id}
                            field="priority"
                            value={goal.priority || "Medium"}
                            fieldType="select"
                            options={["low", "medium", "high", "urgent"]}
                            placeholder="Priority"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-400 text-sm">-</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableField
                            type="goals"
                            id={goal.id}
                            field="estimatedDays"
                            value={goal.estimatedDays}
                            displayValue={goal.estimatedDays ? `${goal.estimatedDays}d` : "-"}
                            fieldType="number"
                            placeholder="Days"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Progress value={parseFloat(goal.percentComplete || "0")} className="w-20" />
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <EditableField
                            type="goals"
                            id={goal.id}
                            field="deadline"
                            value={goal.deadline}
                            displayValue={goal.deadline ? format(new Date(goal.deadline.split('T')[0] + 'T12:00:00'), "MMM dd") : "No deadline"}
                            fieldType="date"
                            placeholder="Set deadline"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div onClick={(e) => e.stopPropagation()}>
                          <TeamAssignmentDropdown 
                            type="goals" 
                            id={goal.id} 
                            assignedUserId={goal.assignedTo} 
                          />
                        </div>
                      </TableCell>
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

      {/* Dependency Management Dialog */}
      <Dialog open={dependencyDialog.isOpen} onOpenChange={(open) => 
        !open && setDependencyDialog({ isOpen: false, taskId: null, currentDependencies: [], selectedDependencies: new Set() })
      }>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-600" />
              Edit Task Dependencies
            </DialogTitle>
            <DialogDescription>
              Select which tasks this task depends on. Dependencies will affect timeline calculations and task scheduling.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Dependencies Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Current Dependencies ({dependencyDialog.selectedDependencies.size})
              </h4>
              {dependencyDialog.selectedDependencies.size > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {Array.from(dependencyDialog.selectedDependencies).map(depId => {
                    const task = allTasks.find(t => t.id === depId);
                    return (
                      <Badge key={depId} variant="secondary" className="text-xs">
                        {task ? task.title : `Task ${depId}`}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-blue-700 text-sm">No dependencies selected</p>
              )}
            </div>

            {/* Available Tasks by Project */}
            <div className="space-y-4">
              <h4 className="font-medium">Available Tasks</h4>
              {/* Group tasks by project for better organization */}
              {goals.map(goal => (
                <div key={goal.id} className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {goal.title}
                  </h5>
                  {/* Get projects for this goal and map tasks */}
                  {(() => {
                    const projectsQuery = queryClient.getQueryData([`/api/goals/${goal.id}/projects`]) as Project[] || [];
                    return projectsQuery.map(project => {
                      const tasksQuery = queryClient.getQueryData([`/api/projects/${project.id}/tasks`]) as Task[] || [];
                      const availableTasks = tasksQuery.filter(task => 
                        task.id !== dependencyDialog.taskId && // Can't depend on itself
                        !wouldCreateCycle(dependencyDialog.taskId!, task.id, allTasks) // Prevent cycles
                      );
                      
                      if (availableTasks.length === 0) return null;
                      
                      return (
                        <div key={project.id} className="ml-4 space-y-1">
                          <h6 className="text-xs font-medium text-gray-600 flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" />
                            {project.title}
                          </h6>
                          <div className="ml-4 space-y-1">
                            {availableTasks.map(task => (
                              <div key={task.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                <Checkbox
                                  checked={dependencyDialog.selectedDependencies.has(task.id)}
                                  onCheckedChange={() => toggleDependency(task.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CheckSquare className="h-3 w-3 text-green-600 flex-shrink-0" />
                                    <span className="text-sm truncate">{task.title}</span>
                                  </div>
                                  {task.deadline && (
                                    <span className="text-xs text-gray-500">
                                      Due: {format(new Date(task.deadline), "MMM dd")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setDependencyDialog({ isOpen: false, taskId: null, currentDependencies: [], selectedDependencies: new Set() })}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveDependencies}
              disabled={updateDependencyMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateDependencyMutation.isPending ? 'Saving...' : 'Save Dependencies'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to prevent circular dependencies
function wouldCreateCycle(taskId: number, potentialDepId: number, allTasks: Task[]): boolean {
  // Simple cycle detection - check if potentialDep already depends on taskId
  const visited = new Set<number>();
  
  function hasPath(from: number, to: number): boolean {
    if (from === to) return true;
    if (visited.has(from)) return false;
    visited.add(from);
    
    const task = allTasks.find(t => t.id === from);
    if (!task?.dependencies) return false;
    
    return task.dependencies.some((depId: number) => hasPath(depId, to));
  }
  
  return hasPath(potentialDepId, taskId);
}

