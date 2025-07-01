import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight, Target, FolderOpen, CheckSquare, ListTodo } from "lucide-react";
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

  // Completion mutation
  const completionMutation = useMutation({
    mutationFn: async ({ type, id, completed }: { type: string; id: number; completed: boolean }) => {
      return apiRequest(`/api/${type}s/${id}/complete`, "PATCH", { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  // Progressive loading components
  const ProjectRow = ({ goalId, isExpanded }: { goalId: number; isExpanded: boolean }) => {
    const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
      queryKey: ["/api/goals", goalId, "projects"],
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
            </TableRow>
            <TaskRow projectId={project.id} isExpanded={expandedProjects.has(project.id)} />
          </React.Fragment>
        ))}
      </>
    );
  };

  const TaskRow = ({ projectId, isExpanded }: { projectId: number; isExpanded: boolean }) => {
    const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
      queryKey: ["/api/projects", projectId, "tasks"],
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
                    checked={task.status === "completed"}
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
            </TableRow>
            <SubtaskRow taskId={task.id} isExpanded={expandedTasks.has(task.id)} />
          </React.Fragment>
        ))}
      </>
    );
  };

  const SubtaskRow = ({ taskId, isExpanded }: { taskId: number; isExpanded: boolean }) => {
    const { data: subtasks = [], isLoading: subtasksLoading } = useQuery<Subtask[]>({
      queryKey: ["/api/tasks", taskId, "subtasks"],
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
              <Progress value={parseFloat(subtask.percentComplete || "0")} className="w-20" />
            </TableCell>
            <TableCell className="hidden lg:table-cell">{subtask.deadline ? format(new Date(subtask.deadline), "MMM dd") : "No deadline"}</TableCell>
            <TableCell className="hidden lg:table-cell">{subtask.assignedTo || "Unassigned"}</TableCell>
            <TableCell>
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={subtask.status === "completed"}
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