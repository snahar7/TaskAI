import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Plus, Target, FolderOpen, CheckSquare, ListTodo, Calendar, User, Tag, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { GoalWithProjects } from "@shared/schema";

export default function DatabasePage() {
  const queryClient = useQueryClient();
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const { data: goals = [], isLoading } = useQuery<GoalWithProjects[]>({
    queryKey: ["/api/goals"],
  });

  const breakdownMutation = useMutation({
    mutationFn: async (data: { input: string; level: string; parentId?: number }) => {
      const response = await fetch("/api/goals/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const toggleGoal = (goalId: number) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTask = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleBreakdown = async (title: string, level: string, parentId?: number) => {
    await breakdownMutation.mutateAsync({
      input: title,
      level,
      parentId,
    });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "No deadline";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "on_hold": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database View</h1>
          <p className="text-gray-600">Complete overview of all goals, projects, tasks, and subtasks</p>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
                <p className="text-gray-500 mb-4">Create your first goal to get started</p>
                <Button onClick={() => window.location.href = "/"}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            goals.map((goal: GoalWithProjects) => (
              <Card key={goal.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGoal(goal.id)}
                        className="p-1"
                      >
                        {expandedGoals.has(goal.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Target className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{goal.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBreakdown(goal.title, "project", goal.id)}
                        disabled={breakdownMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Project
                      </Button>
                    </div>
                  </div>
                  
                  {/* Goal Details */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {goal.status && (
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status.replace('_', ' ')}
                      </Badge>
                    )}
                    {goal.priority && (
                      <Badge className={getPriorityColor(goal.priority)}>
                        {goal.priority} priority
                      </Badge>
                    )}
                    {goal.deadline && (
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(goal.deadline)}
                      </Badge>
                    )}
                    {goal.assignedTo && (
                      <Badge variant="outline">
                        <User className="w-3 h-3 mr-1" />
                        Assigned
                      </Badge>
                    )}
                    {goal.percentComplete && (
                      <Badge variant="outline">
                        {goal.percentComplete}% complete
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Projects */}
                {expandedGoals.has(goal.id) && (
                  <CardContent className="pt-0">
                    {goal.projects && goal.projects.length > 0 ? (
                      <div className="space-y-3">
                        {goal.projects.map((project) => (
                          <Card key={project.id} className="border-l-4 border-l-green-500 ml-4">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleProject(project.id)}
                                    className="p-1"
                                  >
                                    {expandedProjects.has(project.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <FolderOpen className="h-4 w-4 text-green-600" />
                                  <div>
                                    <h4 className="font-medium">{project.title}</h4>
                                    <p className="text-sm text-gray-600">{project.description}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBreakdown(project.title, "task", project.id)}
                                  disabled={breakdownMutation.isPending}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Task
                                </Button>
                              </div>
                              
                              {/* Project Details */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {project.status && (
                                  <Badge className={getStatusColor(project.status)}>
                                    {project.status.replace('_', ' ')}
                                  </Badge>
                                )}
                                {project.priority && (
                                  <Badge className={getPriorityColor(project.priority)}>
                                    {project.priority}
                                  </Badge>
                                )}
                                {project.deadline && (
                                  <Badge variant="outline">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {formatDate(project.deadline)}
                                  </Badge>
                                )}
                                {project.timeEstimate && (
                                  <Badge variant="outline">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {project.timeEstimate}h est.
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>

                            {/* Tasks */}
                            {expandedProjects.has(project.id) && (
                              <CardContent className="pt-0">
                                {project.tasks && project.tasks.length > 0 ? (
                                  <div className="space-y-2">
                                    {project.tasks.map((task) => (
                                      <Card key={task.id} className="border-l-4 border-l-orange-500 ml-4">
                                        <CardHeader className="pb-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleTask(task.id)}
                                                className="p-1"
                                              >
                                                {expandedTasks.has(task.id) ? (
                                                  <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4" />
                                                )}
                                              </Button>
                                              <CheckSquare className="h-4 w-4 text-orange-600" />
                                              <div>
                                                <h5 className="font-medium text-sm">{task.title}</h5>
                                                <p className="text-xs text-gray-600">{task.description}</p>
                                              </div>
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleBreakdown(task.title, "subtask", task.id)}
                                              disabled={breakdownMutation.isPending}
                                            >
                                              <Plus className="w-3 h-3 mr-1" />
                                              Add Subtask
                                            </Button>
                                          </div>
                                          
                                          {/* Task Details */}
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {task.status && (
                                              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                                {task.status.replace('_', ' ')}
                                              </Badge>
                                            )}
                                            {task.priority && (
                                              <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                              </Badge>
                                            )}
                                            {task.dueDate && (
                                              <Badge variant="outline" className="text-xs">
                                                <Calendar className="w-2 h-2 mr-1" />
                                                {formatDate(task.dueDate)}
                                              </Badge>
                                            )}
                                            {task.completed && (
                                              <Badge className="text-xs bg-green-100 text-green-800">
                                                Completed
                                              </Badge>
                                            )}
                                          </div>
                                        </CardHeader>

                                        {/* Subtasks */}
                                        {expandedTasks.has(task.id) && task.subtasks && (
                                          <CardContent className="pt-0">
                                            {task.subtasks.length > 0 ? (
                                              <div className="space-y-2">
                                                {task.subtasks.map((subtask) => (
                                                  <div key={subtask.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded border-l-2 border-l-purple-400 ml-4">
                                                    <ListTodo className="h-3 w-3 text-purple-600" />
                                                    <div className="flex-1">
                                                      <p className="text-sm font-medium">{subtask.title}</p>
                                                      <p className="text-xs text-gray-600">{subtask.description}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                      {subtask.status && (
                                                        <Badge className={`text-xs ${getStatusColor(subtask.status)}`}>
                                                          {subtask.status.replace('_', ' ')}
                                                        </Badge>
                                                      )}
                                                      {subtask.completed && (
                                                        <Badge className="text-xs bg-green-100 text-green-800">
                                                          ✓
                                                        </Badge>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-center text-sm text-gray-500 py-4">
                                                No subtasks yet
                                              </div>
                                            )}
                                          </CardContent>
                                        )}
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center text-sm text-gray-500 py-4">
                                    No tasks yet
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-500 py-4">
                        No projects yet
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}