import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, Plus, Target, FolderOpen, CheckSquare, ListTodo, Calendar, User, Tag, Clock, FileText, AlertCircle, Percent, Check, Search, Filter, ArrowUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Goal, Project, Task, Subtask } from "@shared/schema";

export default function DatabasePage() {
  const queryClient = useQueryClient();
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  
  // Filtering and sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [sortOrder, setSortOrder] = useState("asc");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Load goals only (lightweight query)
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    refetchOnWindowFocus: false,
  });

  // Toggle functions for expanding/collapsing hierarchy levels
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

  // Completion mutation for all entity types
  const completionMutation = useMutation({
    mutationFn: async ({ type, id, completed }: { type: string; id: number; completed: boolean }) => {
      return apiRequest(`/api/${type}s/${id}/complete`, "PATCH", { completed });
    },
    onSuccess: () => {
      // Invalidate all cached data to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  // Progressive loading components
  const ProjectRow = ({ goalId, isExpanded }: { goalId: number; isExpanded: boolean }) => {
    const { data: projects = [], isLoading } = useQuery<Project[]>({
      queryKey: ["/api/goals", goalId, "projects"],
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    if (!isExpanded) return null;
    if (isLoading) return <TableRow><TableCell colSpan={8} className="text-center">Loading projects...</TableCell></TableRow>;

    return (
      <>
        {projects.map((project) => (
          <React.Fragment key={`project-${project.id}`}>
            <TableRow className="bg-blue-50 dark:bg-blue-950/20">
              <TableCell className="pl-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleProjectExpansion(project.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    {expandedProjects.has(project.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{project.title}</span>
                </div>
              </TableCell>
              <TableCell>{project.description || "No description"}</TableCell>
              <TableCell>
                <Badge variant="secondary">Project</Badge>
              </TableCell>
              <TableCell>
                <Progress value={parseInt(project.percentComplete || "0")} className="w-20" />
              </TableCell>
              <TableCell>{project.assignedTo || "Unassigned"}</TableCell>
              <TableCell>{project.deadline ? format(new Date(project.deadline), "MMM dd") : "No deadline"}</TableCell>
              <TableCell>{project.priority || "Medium"}</TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
            <TaskRow projectId={project.id} isExpanded={expandedProjects.has(project.id)} />
          </React.Fragment>
        ))}
      </>
    );
  };

  const TaskRow = ({ projectId, isExpanded }: { projectId: number; isExpanded: boolean }) => {
    const { data: tasks = [], isLoading } = useQuery<Task[]>({
      queryKey: ["/api/projects", projectId, "tasks"],
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    if (!isExpanded) return null;
    if (isLoading) return <TableRow><TableCell colSpan={8} className="text-center pl-16">Loading tasks...</TableCell></TableRow>;

    return (
      <>
        {tasks.map((task) => (
          <React.Fragment key={`task-${task.id}`}>
            <TableRow className="bg-green-50 dark:bg-green-950/20">
              <TableCell className="pl-16">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleTaskExpansion(task.id)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    {expandedTasks.has(task.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <CheckSquare className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{task.title}</span>
                </div>
              </TableCell>
              <TableCell>{task.description || "No description"}</TableCell>
              <TableCell>
                <Badge variant="outline">Task</Badge>
              </TableCell>
              <TableCell>
                <Progress value={parseInt(task.percentComplete || "0")} className="w-20" />
              </TableCell>
              <TableCell>{task.assignedTo || "Unassigned"}</TableCell>
              <TableCell>{task.deadline ? format(new Date(task.deadline), "MMM dd") : "No deadline"}</TableCell>
              <TableCell>{task.priority || "Medium"}</TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
            <SubtaskRow taskId={task.id} isExpanded={expandedTasks.has(task.id)} />
          </React.Fragment>
        ))}
      </>
    );
  };

  const SubtaskRow = ({ taskId, isExpanded }: { taskId: number; isExpanded: boolean }) => {
    const { data: subtasks = [], isLoading } = useQuery<Subtask[]>({
      queryKey: ["/api/tasks", taskId, "subtasks"],
      enabled: isExpanded,
      staleTime: 1000 * 60 * 2,
    });

    if (!isExpanded) return null;
    if (isLoading) return <TableRow><TableCell colSpan={8} className="text-center pl-24">Loading subtasks...</TableCell></TableRow>;

    return (
      <>
        {subtasks.map((subtask) => (
          <TableRow key={`subtask-${subtask.id}`} className="bg-yellow-50 dark:bg-yellow-950/20">
            <TableCell className="pl-24">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-yellow-600" />
                <span>{subtask.title}</span>
              </div>
            </TableCell>
            <TableCell>{subtask.description || "No description"}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">Subtask</Badge>
            </TableCell>
            <TableCell>
              <Progress value={parseInt(subtask.percentComplete || "0")} className="w-20" />
            </TableCell>
            <TableCell>{subtask.assignedTo || "Unassigned"}</TableCell>
            <TableCell>{subtask.deadline ? format(new Date(subtask.deadline), "MMM dd") : "No deadline"}</TableCell>
            <TableCell>{subtask.priority || "Medium"}</TableCell>
            <TableCell>
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
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  };

  // Remove duplicate function definitions

  const breakdownMutation = useMutation({
    mutationFn: async (data: { goalInput: string; level: string; parentId?: number }) => {
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

  const completionMutation = useMutation({
    mutationFn: async ({ type, id, completed }: { type: string; id: number; completed: boolean }) => {
      const endpoint = type === "goal" ? `/api/goals/${id}/approve` :
                      type === "project" ? `/api/projects/${id}/approve` :
                      type === "task" ? `/api/tasks/${id}/complete` :
                      `/api/subtasks/${id}/complete`;
      
      const body = type === "goal" || type === "project" ? { approved: completed } : { completed };
      
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ${type}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onMutate: async ({ type, id, completed }) => {
      // Cancel outgoing queries to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/goals"] });
      
      // Get previous data for rollback
      const previousGoals = queryClient.getQueryData(["/api/goals"]);
      
      // Optimistically update the UI with cascading completion logic
      queryClient.setQueryData(["/api/goals"], (old: any) => {
        if (!old) return old;
        
        const markAllChildrenComplete = (item: any, itemType: string, shouldComplete: boolean) => {
          const updated = { ...item };
          
          if (shouldComplete) {
            // Mark current item as complete
            if (itemType === "goal" || itemType === "project") {
              updated.status = 'completed';
              updated.percentComplete = "100.00";
            } else {
              updated.completed = true;
              updated.percentComplete = "100.00";
            }
            
            // Recursively mark all children as complete
            if (updated.projects) {
              updated.projects = updated.projects.map((project: any) => 
                markAllChildrenComplete(project, "project", true)
              );
            }
            if (updated.tasks) {
              updated.tasks = updated.tasks.map((task: any) => 
                markAllChildrenComplete(task, "task", true)
              );
            }
            if (updated.subtasks) {
              updated.subtasks = updated.subtasks.map((subtask: any) => 
                markAllChildrenComplete(subtask, "subtask", true)
              );
            }
          } else {
            // Mark current item as incomplete
            if (itemType === "goal" || itemType === "project") {
              updated.status = 'not_started';
              updated.percentComplete = "0.00";
            } else {
              updated.completed = false;
              updated.percentComplete = "0.00";
            }
          }
          
          return updated;
        };
        
        return old.map((goal: any) => {
          if (type === "goal" && goal.id === id) {
            return markAllChildrenComplete(goal, "goal", completed);
          }
          
          if (goal.projects) {
            const updatedProjects = goal.projects.map((project: any) => {
              if (type === "project" && project.id === id) {
                return markAllChildrenComplete(project, "project", completed);
              }
              
              if (project.tasks) {
                const updatedTasks = project.tasks.map((task: any) => {
                  if (type === "task" && task.id === id) {
                    return markAllChildrenComplete(task, "task", completed);
                  }
                  
                  if (task.subtasks) {
                    const updatedSubtasks = task.subtasks.map((subtask: any) => {
                      if (type === "subtask" && subtask.id === id) {
                        return markAllChildrenComplete(subtask, "subtask", completed);
                      }
                      return subtask;
                    });
                    return { ...task, subtasks: updatedSubtasks };
                  }
                  
                  return task;
                });
                return { ...project, tasks: updatedTasks };
              }
              
              return project;
            });
            return { ...goal, projects: updatedProjects };
          }
          
          return goal;
        });
      });
      
      return { previousGoals };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        queryClient.setQueryData(["/api/goals"], context.previousGoals);
      }
    },
    onSettled: () => {
      // Refresh data after mutation with debounce to prevent excessive API calls
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      }, 1000);
    },
  });

  const handleAddBreakdown = (level: string, parentId?: number) => {
    const input = prompt(`Enter a ${level} to break down:`);
    if (input) {
      breakdownMutation.mutate({
        goalInput: input,
        level,
        parentId,
      });
    }
  };

  const handleCompletionToggle = (type: string, id: number, currentStatus: boolean) => {
    completionMutation.mutate({
      type,
      id,
      completed: !currentStatus,
    });
  };

  const toggleExpanded = (type: string, id: number) => {
    const setExpanded = type === "goal" ? setExpandedGoals : 
                      type === "project" ? setExpandedProjects : 
                      setExpandedTasks;
    
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Calculate intelligent deadlines based on AI estimates and dependencies
  const calculateIntelligentDeadline = (item: any, type: string, allItems: any[] = []) => {
    const createdAt = item.createdAt ? new Date(item.createdAt) : new Date();
    const timeEstimate = parseFloat(item.timeEstimate) || 8; // Default 8 hours if no estimate
    const priority = item.priority?.toLowerCase() || 'medium';
    
    // Priority multipliers for urgency
    const priorityMultipliers = {
      'high': 0.7,    // 30% faster deadline
      'medium': 1.0,  // Normal timeline
      'low': 1.5      // 50% longer timeline
    };
    
    const multiplier = priorityMultipliers[priority as keyof typeof priorityMultipliers] || 1.0;
    const adjustedHours = timeEstimate * multiplier;
    
    // Convert hours to days (assuming 8 working hours per day)
    const estimatedDays = Math.ceil(adjustedHours / 8);
    
    // Add buffer based on hierarchy level
    const bufferDays = {
      'goal': estimatedDays * 0.3,      // 30% buffer for goals
      'project': estimatedDays * 0.2,   // 20% buffer for projects  
      'task': estimatedDays * 0.1,      // 10% buffer for tasks
      'subtask': estimatedDays * 0.05   // 5% buffer for subtasks
    };
    
    const totalDays = estimatedDays + (bufferDays[type as keyof typeof bufferDays] || 0);
    
    const deadline = new Date(createdAt);
    deadline.setDate(deadline.getDate() + Math.ceil(totalDays));
    
    return deadline;
  };

  const formatDate = (dateString: string | Date | null, item?: any, type?: string) => {
    if (!dateString && item && type) {
      // Calculate intelligent deadline if none exists
      const calculatedDeadline = calculateIntelligentDeadline(item, type);
      return `${calculatedDeadline.toLocaleDateString()} (AI estimated)`;
    }
    if (!dateString) return "No deadline";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtering and sorting logic
  const filterAndSortItems = (items: any[], level: number = 0) => {
    const flattenItems = (itemsList: any[], itemType: string, parentLevel: number = 0): any[] => {
      let result: any[] = [];
      
      for (const item of itemsList) {
        const flatItem = { ...item, type: itemType, level: parentLevel };
        result.push(flatItem);
        
        // Add children if expanded
        const isExpanded = itemType === "goal" ? expandedGoals.has(item.id) :
                          itemType === "project" ? expandedProjects.has(item.id) :
                          expandedTasks.has(item.id);
        
        if (isExpanded) {
          if (item.projects) {
            result = result.concat(flattenItems(item.projects, "project", parentLevel + 1));
          }
          if (item.tasks) {
            result = result.concat(flattenItems(item.tasks, "task", parentLevel + 1));
          }
          if (item.subtasks) {
            result = result.concat(flattenItems(item.subtasks, "subtask", parentLevel + 1));
          }
        }
      }
      
      return result;
    };

    let flatItems = flattenItems(items, "goal");
    
    // Apply filters
    if (searchTerm) {
      flatItems = flatItems.filter(item => 
        (item.name || item.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== "all") {
      flatItems = flatItems.filter(item => {
        const status = parseFloat(item.percentComplete) === 100 ? 'completed' : (item.status || 'pending');
        return status === statusFilter;
      });
    }
    
    if (priorityFilter !== "all") {
      flatItems = flatItems.filter(item => (item.priority || 'medium') === priorityFilter);
    }
    
    if (typeFilter !== "all") {
      flatItems = flatItems.filter(item => item.type === typeFilter);
    }
    
    // Apply sorting
    flatItems.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = (a.name || a.title || "").toLowerCase();
          bValue = (b.name || b.title || "").toLowerCase();
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = (a.priority?.toLowerCase() || 'medium') as keyof typeof priorityOrder;
          const bPriority = (b.priority?.toLowerCase() || 'medium') as keyof typeof priorityOrder;
          aValue = priorityOrder[aPriority] || 2;
          bValue = priorityOrder[bPriority] || 2;
          break;
        case "progress":
          aValue = parseFloat(a.percentComplete) || 0;
          bValue = parseFloat(b.percentComplete) || 0;
          break;
        case "deadline":
          aValue = a.deadline ? new Date(a.deadline) : calculateIntelligentDeadline(a, a.type);
          bValue = b.deadline ? new Date(b.deadline) : calculateIntelligentDeadline(b, b.type);
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    });
    
    return flatItems;
  };

  const filteredItems = filterAndSortItems(goals);

  const renderTableRow = (item: any, type: string, level: number = 0, index: number | string = 0) => {
    const isExpanded = type === "goal" ? expandedGoals.has(item.id) :
                      type === "project" ? expandedProjects.has(item.id) :
                      expandedTasks.has(item.id);

    const hasChildren = (type === "goal" && item.projects?.length > 0) ||
                       (type === "project" && item.tasks?.length > 0) ||
                       (type === "task" && item.subtasks?.length > 0);
    
    // Removed debug logging for performance

    const getTypeIcon = () => {
      switch (type) {
        case "goal": return <Target className="w-4 h-4 text-blue-600" />;
        case "project": return <FolderOpen className="w-4 h-4 text-green-600" />;
        case "task": return <CheckSquare className="w-4 h-4 text-orange-600" />;
        case "subtask": return <ListTodo className="w-4 h-4 text-purple-600" />;
        default: return null;
      }
    };

    return (
      <>
        <TableRow 
          key={`${type}-${item.id}-${index}`} 
          className={`${level > 0 ? "bg-gray-50" : ""} ${hasChildren ? "cursor-pointer hover:bg-gray-100" : ""}`}
          onClick={hasChildren ? () => toggleExpanded(type, item.id) : undefined}
        >
          <TableCell>
            {hasChildren ? (
              <div className="flex items-center justify-center">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            ) : (
              <div className="w-6" />
            )}
          </TableCell>
          
          <TableCell 
            className="sticky left-0 z-10 bg-white border-r shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={item.status === 'completed' || item.completed === true || parseFloat(item.percentComplete || "0") >= 100}
              onCheckedChange={() => {
                const currentStatus = item.status === 'completed' || item.completed === true || parseFloat(item.percentComplete || "0") >= 100;
                handleCompletionToggle(type, item.id, currentStatus);
              }}
            />
          </TableCell>
          
          <TableCell className="min-w-[350px] max-w-[500px]">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              {getTypeIcon()}
              <span className="font-medium break-words">{item.name || item.title}</span>
            </div>
          </TableCell>

          <TableCell>
            <Badge variant="outline" className="capitalize">
              {type}
            </Badge>
          </TableCell>

          <TableCell>
            <Badge className={getStatusColor(parseFloat(item.percentComplete) === 100 ? 'completed' : item.status)}>
              {parseFloat(item.percentComplete) === 100 ? 'completed' : (item.status || 'pending')}
            </Badge>
          </TableCell>

          <TableCell>
            <Badge className={getPriorityColor(item.priority)}>
              {item.priority || 'medium'}
            </Badge>
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-2">
              <Progress value={parseFloat(item.percentComplete) || 0} className="w-16" />
              <span className="text-sm text-muted-foreground">
                {parseFloat(item.percentComplete) || 0}%
              </span>
            </div>
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{formatDate(item.deadline, item, type)}</span>
            </div>
          </TableCell>

          <TableCell>
            {item.assignedTo ? (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{item.assignedTo}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Unassigned</span>
            )}
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-1">
              {item.description && (
                <Tooltip>
                  <TooltipTrigger>
                    <FileText className="w-4 h-4 text-blue-500 hover:text-blue-700 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {item.timeEstimate && (
                <Tooltip>
                  <TooltipTrigger>
                    <Clock className="w-4 h-4 text-green-500 hover:text-green-700 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Estimated: {item.timeEstimate} hours</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {item.tags && (
                <Tooltip>
                  <TooltipTrigger>
                    <Tag className="w-4 h-4 text-purple-500 hover:text-purple-700 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tags: {item.tags}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TableCell>

          <TableCell onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextLevel = type === "goal" ? "project" : 
                                type === "project" ? "task" : "subtask";
                handleAddBreakdown(nextLevel, item.id);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </TableCell>
        </TableRow>

        {/* Render children when expanded */}
        {isExpanded && (
          <>
            {type === "goal" && item.projects?.map((project: any, childIndex: number) => (
              <React.Fragment key={`project-${project.id}-${childIndex}`}>
                {renderTableRow(project, "project", level + 1, childIndex)}
              </React.Fragment>
            ))}
            {type === "project" && item.tasks?.map((task: any, childIndex: number) => (
              <React.Fragment key={`task-${task.id}-${childIndex}`}>
                {renderTableRow(task, "task", level + 1, childIndex)}
              </React.Fragment>
            ))}
            {type === "task" && item.subtasks?.map((subtask: any, childIndex: number) => (
              <React.Fragment key={`subtask-${subtask.id}-${childIndex}`}>
                {renderTableRow(subtask, "subtask", level + 1, childIndex)}
              </React.Fragment>
            ))}
          </>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Database View</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Database View</h1>
          <Button onClick={() => handleAddBreakdown("goal")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>

        {/* Collapsible Filtering Interface */}
        <div className="bg-white border rounded-lg mb-6 overflow-hidden">
          {/* Header - Always Visible */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filters & Sorting</span>
              <Badge variant="secondary" className="ml-2">
                {filteredItems.length} items
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filtersExpanded ? "Hide" : "Show"} options
              </span>
              {filtersExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Collapsible Content */}
          {filtersExpanded && (
            <div className="p-4 pt-0 space-y-4 border-t bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks, goals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="goal">Goals</SelectItem>
                      <SelectItem value="project">Projects</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="subtask">Subtasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-4 pt-2 border-t bg-white rounded p-3">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="text-sm font-medium">Sort by:</span>
                </div>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                >
                  {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                      setTypeFilter("all");
                      setSortBy("deadline");
                      setSortOrder("asc");
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No goals found. Create your first goal to get started!</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden h-[calc(100vh-250px)]">
            <div className="overflow-auto h-full relative">
              <Table>
                <TableHeader className="sticky top-0 z-20 bg-white shadow-sm">
                  <TableRow>
                    <TableHead className="w-[50px] bg-white"></TableHead>
                    <TableHead className="w-[50px] bg-white sticky left-0 z-30 border-r shadow-sm">Done</TableHead>
                    <TableHead className="bg-white">Name</TableHead>
                    <TableHead className="w-[100px] bg-white">Type</TableHead>
                    <TableHead className="w-[120px] bg-white">Status</TableHead>
                    <TableHead className="w-[100px] bg-white">Priority</TableHead>
                    <TableHead className="w-[120px] bg-white">Progress</TableHead>
                    <TableHead className="w-[120px] bg-white">Deadline</TableHead>
                    <TableHead className="w-[100px] bg-white">Assigned</TableHead>
                    <TableHead className="w-[80px] bg-white">Info</TableHead>
                    <TableHead className="w-[100px] bg-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal) => (
                    <React.Fragment key={`goal-${goal.id}`}>
                      <TableRow className="bg-purple-50 dark:bg-purple-950/20">
                        <TableCell>
                          <button
                            onClick={() => toggleGoalExpansion(goal.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                          >
                            {expandedGoals.has(goal.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">{goal.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>Goal</Badge>
                        </TableCell>
                        <TableCell>{goal.status || "Active"}</TableCell>
                        <TableCell>{goal.priority || "Medium"}</TableCell>
                        <TableCell>
                          <Progress value={parseInt(goal.percentComplete || "0")} className="w-20" />
                        </TableCell>
                        <TableCell>{goal.deadline ? format(new Date(goal.deadline), "MMM dd") : "No deadline"}</TableCell>
                        <TableCell>{goal.assignedTo || "Unassigned"}</TableCell>
                        <TableCell>{goal.description?.slice(0, 30) || "No description"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">Edit</Button>
                        </TableCell>
                      </TableRow>
                      <ProjectRow goalId={goal.id} isExpanded={expandedGoals.has(goal.id)} />
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}