import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Target, FolderOpen, CheckSquare, ListTodo, Trash2 } from "lucide-react";
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
      // Cancel outgoing refetches for instant UI feedback
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
    onSuccess: () => {
      // Invalidate queries to get fresh data with cascaded progress updates
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
    },
  });

  // Delete mutation with confirmation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      return apiRequest("DELETE", `/api/${type}s/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
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
      <React.Fragment>
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
                <div onClick={(e) => e.stopPropagation()}>
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
      </React.Fragment>
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
      <React.Fragment>
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
                <div onClick={(e) => e.stopPropagation()}>
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
      </React.Fragment>
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
      <React.Fragment>
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
      </React.Fragment>
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
    </div>
  );
}