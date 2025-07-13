import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Target, 
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  Edit2,
  Save,
  X,
  User,
  Calendar,
  Flag,
  Link2,
  FileText,
  ChevronRight,
  Zap,
  AlertTriangle,
  Circle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface DashboardStats {
  todayTasks: any[];
  overdueTasks: any[];
  goals: any[];
  quickWins: any[];
  behindSchedule: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [taskDetailModal, setTaskDetailModal] = useState({
    isOpen: false,
    task: null as any,
    isSubtask: false
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [dependencyDialog, setDependencyDialog] = useState({
    isOpen: false,
    taskId: null as number | null,
    currentDependencies: [] as number[],
    selectedDependencies: new Set<number>()
  });
  const [rescheduleDialog, setRescheduleDialog] = useState({
    isOpen: false,
    taskId: null as number | null,
    currentDate: ""
  });
  const [breakdownDialog, setBreakdownDialog] = useState({
    isOpen: false,
    item: null as any,
    type: "",
    breakdown: null as any
  });

  // Fetch dashboard stats with real data
  const { data: dashboardStats, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats", { assignedToMe: showMyTasksOnly }],
    queryFn: () => fetch(`/api/dashboard/stats?assignedToMe=${showMyTasksOnly}`).then(res => res.json()),
  });

  // Fetch all tasks for dependency management
  const { data: allTasks = [] } = useQuery({
    queryKey: ["/api/tasks/all", { assignedToMe: showMyTasksOnly }],
    queryFn: () => fetch(`/api/tasks/all?assignedToMe=${showMyTasksOnly}`).then(res => res.json()),
  });

  // Fetch goals for dependency and breakdown management
  const { data: goals = [] } = useQuery({
    queryKey: ["/api/goals"],
  });

  // Extract data from dashboard stats
  const todayTasks = dashboardStats?.todayTasks || [];
  const overdueTasks = dashboardStats?.overdueTasks || [];
  const quickWins = dashboardStats?.quickWins || [];
  const behindSchedule = dashboardStats?.behindSchedule || [];
  const metrics = dashboardStats?.metrics || {};
  const counts = dashboardStats?.counts || {};
  const dashboardGoals = dashboardStats?.goals || [];



  // Break down mutation for getting AI breakdown
  const breakdownMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'task' | 'subtask'; id: number }) => {
      const endpoint = type === 'subtask' ? `/api/tasks/${id}/breakdown` : `/api/tasks/${id}/breakdown`;
      const response = await apiRequest("POST", endpoint, {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('Raw API response:', data);
      console.log('Extracted breakdown:', data.breakdown);
      setBreakdownDialog(prev => ({
        ...prev,
        breakdown: data.breakdown,
      }));
    },
    onError: (error) => {
      console.error('Breakdown error:', error);
      setBreakdownDialog(prev => ({ ...prev, breakdown: null }));
    },
  });

  // Apply breakdown mutation for creating sub-items
  const applyBreakdownMutation = useMutation({
    mutationFn: async ({ type, id, breakdown }: { type: 'task' | 'subtask'; id: number; breakdown: any }) => {
      const endpoint = `/api/tasks/${id}/apply-breakdown`;
      const response = await apiRequest("POST", endpoint, { subItems: breakdown });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      
      // Close dialog
      setBreakdownDialog({ isOpen: false, item: null, type: "", breakdown: null });
    },
    onError: (error) => {
      console.error('Apply breakdown error:', error);
    },
  });

  // Update dependency mutation
  const updateDependencyMutation = useMutation({
    mutationFn: async ({ taskId, dependencies }: { taskId: number; dependencies: number[] }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/edit`, { 
        dependencies 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setDependencyDialog({ isOpen: false, taskId: null, currentDependencies: [], selectedDependencies: new Set() });
    },
  });

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async ({ taskId, deadline }: { taskId: number; deadline: string }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/edit`, { 
        deadline 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setRescheduleDialog({ isOpen: false, taskId: null, currentDate: "" });
    },
  });

  // Completion mutation
  const completeMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const response = await apiRequest("PATCH", `/api/${type}s/${id}/complete`, { completed: true });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      setTaskDetailModal({ isOpen: false, task: null, isSubtask: false });
    },
  });

  // Edit mutation for task details
  const editTaskMutation = useMutation({
    mutationFn: async ({ type, id, field, value }: { type: string; id: number; field: string; value: any }) => {
      const response = await apiRequest("PATCH", `/api/${type}s/${id}/edit`, { [field]: value });
      return await response.json();
    },
    onMutate: async ({ field, value }) => {
      // Optimistic update - immediately update the task detail modal
      if (taskDetailModal.task) {
        setTaskDetailModal(prev => ({
          ...prev,
          task: {
            ...prev.task,
            [field]: value
          }
        }));
      }
      
      // Return the previous state for rollback if needed
      return { previousTask: taskDetailModal.task };
    },
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      setEditingField(null);
      setEditValue("");
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousTask) {
        setTaskDetailModal(prev => ({
          ...prev,
          task: context.previousTask
        }));
      }
    },
  });

  // Function to open task detail modal
  const openTaskDetail = (item: any) => {
    const isSubtask = item.task !== undefined;
    setTaskDetailModal({
      isOpen: true,
      task: item,
      isSubtask
    });
  };

  // Function to handle inline editing
  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const saveEdit = () => {
    if (!editingField || !taskDetailModal.task) return;
    
    editTaskMutation.mutate({
      type: taskDetailModal.isSubtask ? "subtask" : "task",
      id: taskDetailModal.task.id,
      field: editingField,
      value: editValue
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  // Dialog handlers
  const openDependencyDialog = (taskId: number, currentDependencies: number[]) => {
    setDependencyDialog({
      isOpen: true,
      taskId,
      currentDependencies,
      selectedDependencies: new Set(currentDependencies)
    });
  };

  const openRescheduleDialog = (taskId: number, currentDate: string) => {
    setRescheduleDialog({
      isOpen: true,
      taskId,
      currentDate: currentDate ? new Date(currentDate).toISOString().split('T')[0] : ""
    });
  };

  const openBreakdownDialog = (item: any, type: string) => {
    setBreakdownDialog({
      isOpen: true,
      item,
      type,
      breakdown: null
    });
  };

  // Helper functions for dependency management
  const toggleDependency = (taskId: number) => {
    setDependencyDialog(prev => {
      const newSelected = new Set(prev.selectedDependencies);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      return { ...prev, selectedDependencies: newSelected };
    });
  };

  const saveDependencies = () => {
    if (!dependencyDialog.taskId) return;
    updateDependencyMutation.mutate({
      taskId: dependencyDialog.taskId,
      dependencies: Array.from(dependencyDialog.selectedDependencies)
    });
  };

  const saveReschedule = () => {
    if (!rescheduleDialog.taskId || !rescheduleDialog.currentDate) return;
    rescheduleMutation.mutate({
      taskId: rescheduleDialog.taskId,
      deadline: rescheduleDialog.currentDate
    });
  };

  const handleBreakdown = () => {
    if (!breakdownDialog.item) return;
    breakdownMutation.mutate({
      type: breakdownDialog.type as 'task' | 'subtask',
      id: breakdownDialog.item.id
    });
  };

  const applyBreakdown = () => {
    if (!breakdownDialog.item || !breakdownDialog.breakdown) return;
    applyBreakdownMutation.mutate({
      type: breakdownDialog.type as 'task' | 'subtask',
      id: breakdownDialog.item.id,
      breakdown: breakdownDialog.breakdown.subItems || breakdownDialog.breakdown
    });
  };

  // Helper function to check if dependency would create cycle
  const wouldCreateCycle = (sourceId: number, targetId: number, tasks: any[]): boolean => {
    // Simplified cycle detection - in real app would do full graph traversal
    const targetTask = tasks.find(t => t.id === targetId);
    if (!targetTask?.dependencies) return false;
    return targetTask.dependencies.includes(sourceId);
  };



  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl">
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Your productivity command center</p>
          </div>
          
          {/* Filter Toggle */}
          {user && (
            <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm">
              <Switch
                id="my-tasks-filter-dashboard"
                checked={showMyTasksOnly}
                onCheckedChange={setShowMyTasksOnly}
              />
              <Label htmlFor="my-tasks-filter-dashboard" className="text-sm font-medium">
                Show only my tasks
              </Label>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="action" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="action" className="text-xs sm:text-sm py-2 sm:py-3">Action Center</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs sm:text-sm py-2 sm:py-3">Goal Overview</TabsTrigger>
        </TabsList>

        {/* Action-Oriented Dashboard */}
        <TabsContent value="action" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Today's Focus */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                    Today's Focus
                  </CardTitle>
                  <CardDescription className="text-sm">Tasks active today (between start date and deadline)</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="text-center py-4">Loading today's tasks...</div>
                  ) : todayTasks.length > 0 ? (
                    todayTasks.map((item: any) => {
                      const isSubtask = item.task !== undefined;
                      const displayTitle = isSubtask ? `${item.task.title} → ${item.title}` : item.title;
                      const parentInfo = isSubtask ? item.task.title : (item.project?.title || item.goal?.title || "No Project");
                      const priorityColor = {
                        urgent: "bg-red-500",
                        high: "bg-orange-500", 
                        medium: "bg-blue-500",
                        low: "bg-gray-400"
                      }[item.priority] || "bg-blue-500";
                      
                      return (
                        <div 
                          key={`${isSubtask ? 'subtask' : 'task'}-${item.id}`} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => openTaskDetail(item)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-2 h-2 rounded-full ${priorityColor}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">{displayTitle}</p>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <span>From {parentInfo}</span>
                                {item.estimatedHours && <span>• {item.estimatedHours}h</span>}
                                {item.deadline && (
                                  <span>• Due: {new Date(item.deadline).toLocaleDateString()}</span>
                                )}
                                {item.startDate && (
                                  <span>• Started: {new Date(item.startDate).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                completeMutation.mutate({ 
                                  type: isSubtask ? 'subtask' : 'task', 
                                  id: item.id 
                                });
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No tasks are active today. All scheduled tasks are either completed or not yet started.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overdue Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600 text-base sm:text-lg">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Overdue Items
                </CardTitle>
                <CardDescription className="text-sm">Tasks that need immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueTasks.length > 0 ? (
                    overdueTasks.slice(0, 5).map((item: any) => {
                      const isSubtask = item.task !== undefined;
                      const displayTitle = isSubtask ? `${item.task.title} → ${item.title}` : item.title;
                      const parentInfo = isSubtask ? item.task.title : (item.project?.title || item.goal?.title || "No Project");
                      const daysPastDue = item.deadline ? 
                        Math.floor((new Date().getTime() - new Date(item.deadline).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                      
                      return (
                        <div key={`${isSubtask ? 'subtask' : 'task'}-${item.id}`} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-red-800 truncate">{displayTitle}</p>
                            <div className="flex items-center gap-2 text-sm text-red-600">
                              <span>From {parentInfo}</span>
                              {item.deadline && (
                                <span>• {daysPastDue} days overdue</span>
                              )}
                              {item.estimatedHours && (
                                <span>• {item.estimatedHours}h</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" className="h-8 text-xs">Reschedule</Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="h-8 text-xs"
                              onClick={() => completeMutation.mutate({ 
                                type: isSubtask ? 'subtask' : 'task', 
                                id: item.id 
                              })}
                            >
                              Complete
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No overdue tasks. You're on top of things!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Priority Matrix */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Priority Matrix
                </CardTitle>
                <CardDescription>Tasks categorized by urgency and importance</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Debug Info */}
                {dashboardStats && (
                  <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                    <p>Debug: Found {dashboardStats?.todayTasks?.length || 0} today tasks</p>
                    {dashboardStats?.todayTasks?.slice(0, 2).map((task: any) => (
                      <p key={task.id}>Task: "{task.title}" - Priority: {task.priority} - Deadline: {task.deadline} - Completed: {task.completed ? 'Yes' : 'No'}</p>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 h-96">
                  {/* Urgent & Important */}
                  <div className="border-2 border-red-200 bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Urgent + Important
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dashboardStats?.todayTasks
                        ?.filter((task: any) => {
                          console.log(`Filtering task: ${task.title}, Priority: ${task.priority}, Deadline: ${task.deadline}, Completed: ${task.completed}`);
                          const today = new Date().toISOString().split('T')[0];
                          const deadline = task.deadline?.split('T')[0];
                          const isUrgent = deadline === today || (deadline && new Date(deadline) < new Date(today));
                          const isImportant = task.priority === 'urgent' || task.priority === 'high';
                          console.log(`  IsUrgent: ${isUrgent}, IsImportant: ${isImportant}, Completed: ${task.completed}`);
                          return isUrgent && isImportant && !task.completed;
                        })
                        .map((task: any) => (
                          <div 
                            key={task.id}
                            className="text-xs p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => openTaskDetail(task)}
                          >
                            <p className="font-medium text-red-900 truncate">{task.title}</p>
                            <p className="text-red-600 text-xs mt-1">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
                          </div>
                        )) || <p className="text-xs text-red-600 italic">No urgent important tasks</p>}
                    </div>
                  </div>

                  {/* Important but Not Urgent */}
                  <div className="border-2 border-blue-200 bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Important but Not Urgent
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dashboardStats?.todayTasks
                        ?.filter((task: any) => {
                          const today = new Date().toISOString().split('T')[0];
                          const deadline = task.deadline?.split('T')[0];
                          const isUrgent = deadline === today || (deadline && new Date(deadline) < new Date(today));
                          const isImportant = task.priority === 'urgent' || task.priority === 'high';
                          return !isUrgent && isImportant && !task.completed;
                        })
                        .map((task: any) => (
                          <div 
                            key={task.id}
                            className="text-xs p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => openTaskDetail(task)}
                          >
                            <p className="font-medium text-blue-900 truncate">{task.title}</p>
                            <p className="text-blue-600 text-xs mt-1">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
                          </div>
                        )) || <p className="text-xs text-blue-600 italic">No important tasks</p>}
                    </div>
                  </div>

                  {/* Urgent but Not Important */}
                  <div className="border-2 border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Urgent but Not Important
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dashboardStats?.todayTasks
                        ?.filter((task: any) => {
                          const today = new Date().toISOString().split('T')[0];
                          const deadline = task.deadline?.split('T')[0];
                          const isUrgent = deadline === today || (deadline && new Date(deadline) < new Date(today));
                          const isImportant = task.priority === 'urgent' || task.priority === 'high';
                          return isUrgent && !isImportant && !task.completed;
                        })
                        .map((task: any) => (
                          <div 
                            key={task.id}
                            className="text-xs p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => openTaskDetail(task)}
                          >
                            <p className="font-medium text-yellow-900 truncate">{task.title}</p>
                            <p className="text-yellow-600 text-xs mt-1">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
                          </div>
                        )) || <p className="text-xs text-yellow-600 italic">No urgent tasks</p>}
                    </div>
                  </div>

                  {/* Neither Urgent nor Important */}
                  <div className="border-2 border-gray-200 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Circle className="h-4 w-4" />
                      Neither Urgent nor Important
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {dashboardStats?.todayTasks
                        ?.filter((task: any) => {
                          const today = new Date().toISOString().split('T')[0];
                          const deadline = task.deadline?.split('T')[0];
                          const isUrgent = deadline === today || (deadline && new Date(deadline) < new Date(today));
                          const isImportant = task.priority === 'urgent' || task.priority === 'high';
                          return !isUrgent && !isImportant && !task.completed;
                        })
                        .map((task: any) => (
                          <div 
                            key={task.id}
                            className="text-xs p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => openTaskDetail(task)}
                          >
                            <p className="font-medium text-gray-900 truncate">{task.title}</p>
                            <p className="text-gray-600 text-xs mt-1">Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</p>
                          </div>
                        )) || <p className="text-xs text-gray-600 italic">No low priority tasks</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Add Floating Button */}
          <div className="fixed bottom-6 right-6">
            <Button size="lg" className="rounded-full shadow-lg">
              <Plus className="h-5 w-5" />
              Quick Add
            </Button>
          </div>
        </TabsContent>





        {/* Goal-Centric Overview Dashboard */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Goal Progress Rings */}
            {(dashboardGoals as any[]).map((goal: any) => (
              <Card key={goal.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                  <CardDescription>{goal.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative w-24 h-24">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-gray-200"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - (goal.percentComplete || 0) / 100)}`}
                          className="text-blue-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold">{Math.round(goal.percentComplete || 0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Deadline:</span>
                      <span className="text-muted-foreground">
                        {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : "No deadline"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Priority:</span>
                      <Badge variant={goal.priority === 'high' ? 'destructive' : 'secondary'}>
                        {goal.priority || 'medium'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Goal Timeline */}
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Goal Timeline</CardTitle>
                <CardDescription>Visual timeline of all goals with deadlines and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center border rounded">
                  <p className="text-muted-foreground">Goal timeline visualization placeholder</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      <Dialog open={taskDetailModal.isOpen} onOpenChange={(open) => {
        if (!open) {
          setTaskDetailModal({ isOpen: false, task: null, isSubtask: false });
          setEditingField(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {taskDetailModal.task && (
            <>
              <DialogHeader className="space-y-4">
                {/* Hierarchy Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{taskDetailModal.task.goal?.title || "No Goal"}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{taskDetailModal.task.project?.title || "No Project"}</span>
                  {taskDetailModal.isSubtask && (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      <span>{taskDetailModal.task.task?.title || "Parent Task"}</span>
                    </>
                  )}
                </div>

                {/* Task Title and Priority */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {editingField === "title" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-xl font-semibold"
                          autoFocus
                        />
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <DialogTitle 
                        className="text-xl font-semibold cursor-pointer hover:bg-gray-50 p-2 rounded flex items-center gap-2"
                        onClick={() => startEditing("title", taskDetailModal.task.title)}
                      >
                        <span className="truncate">{taskDetailModal.task.title}</span>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </DialogTitle>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      {editingField === "priority" ? (
                        <div className="flex items-center gap-2">
                          <Select value={editValue} onValueChange={setEditValue}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="urgent">🔴 Urgent</SelectItem>
                              <SelectItem value="high">🟠 High</SelectItem>
                              <SelectItem value="medium">🔵 Medium</SelectItem>
                              <SelectItem value="low">⚪ Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge 
                          className={`cursor-pointer hover:opacity-80 transition-opacity text-white font-semibold border-0 ${
                            taskDetailModal.task.priority === "urgent" ? "bg-red-500 hover:bg-red-600" :
                            taskDetailModal.task.priority === "high" ? "bg-orange-500 hover:bg-orange-600" :
                            taskDetailModal.task.priority === "medium" ? "bg-blue-500 hover:bg-blue-600" :
                            "bg-gray-500 hover:bg-gray-600"
                          }`}
                          onClick={() => startEditing("priority", taskDetailModal.task.priority)}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {
                            taskDetailModal.task.priority === "urgent" ? "🔴 URGENT" :
                            taskDetailModal.task.priority === "high" ? "🟠 HIGH" :
                            taskDetailModal.task.priority === "medium" ? "🔵 MEDIUM" :
                            "⚪ LOW"
                          } PRIORITY
                          <Edit2 className="h-3 w-3 ml-1" />
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {taskDetailModal.isSubtask ? "Subtask" : "Task"}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Assigned User Avatar */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">Assigned to</p>
                      {editingField === "assignedTo" ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Assign to someone"
                            className="w-32"
                          />
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p 
                          className="text-sm text-muted-foreground cursor-pointer hover:bg-gray-50 p-1 rounded"
                          onClick={() => startEditing("assignedTo", taskDetailModal.task.assignedTo)}
                        >
                          {taskDetailModal.task.assignedTo || "Unassigned"}
                        </p>
                      )}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {taskDetailModal.task.assignedTo ? 
                          taskDetailModal.task.assignedTo.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) :
                          <User className="h-5 w-5" />
                        }
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Key Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Deadline */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Deadline
                    </label>
                    {editingField === "deadline" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border"
                        onClick={() => startEditing("deadline", taskDetailModal.task.deadline ? taskDetailModal.task.deadline.split('T')[0] : "")}
                      >
                        {taskDetailModal.task.deadline ? 
                          format(new Date(taskDetailModal.task.deadline), "MMM dd, yyyy") : 
                          "No deadline set"
                        }
                      </p>
                    )}
                  </div>

                  {/* Estimated Hours */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimated Hours
                    </label>
                    {editingField === "estimatedHours" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Hours"
                        />
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border"
                        onClick={() => startEditing("estimatedHours", taskDetailModal.task.estimatedHours)}
                      >
                        {taskDetailModal.task.estimatedHours ? `${taskDetailModal.task.estimatedHours} hours` : "Not estimated"}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Status
                    </label>
                    {editingField === "status" ? (
                      <div className="flex items-center gap-2">
                        <Select value={editValue} onValueChange={setEditValue}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p 
                        className="text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border capitalize"
                        onClick={() => startEditing("status", taskDetailModal.task.status)}
                      >
                        {taskDetailModal.task.status || "Pending"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Description
                  </label>
                  {editingField === "description" ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Describe this task..."
                        rows={4}
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="text-sm cursor-pointer hover:bg-gray-50 p-3 rounded border min-h-[80px] flex items-start"
                      onClick={() => startEditing("description", taskDetailModal.task.description)}
                    >
                      {taskDetailModal.task.description ? (
                        <p className="whitespace-pre-wrap">{taskDetailModal.task.description}</p>
                      ) : (
                        <span className="text-muted-foreground italic">Click to add description...</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Dependencies */}
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Dependencies
                  </label>
                  <div 
                    className="text-sm p-3 rounded border bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => openDependencyDialog(taskDetailModal.task.id, taskDetailModal.task.dependencies || [])}
                  >
                    {taskDetailModal.task.dependencies && taskDetailModal.task.dependencies.length > 0 ? (
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {taskDetailModal.task.dependencies.map((depId: number) => {
                            const depTask = allTasks.find((t: any) => t.id === depId);
                            return (
                              <Badge key={depId} variant="secondary" className="text-xs">
                                {depTask ? depTask.title : `Task ${depId}`}
                              </Badge>
                            );
                          })}
                        </div>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground italic">Click to add dependencies</span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline"
                      onClick={() => completeMutation.mutate({ 
                        type: taskDetailModal.isSubtask ? 'subtask' : 'task', 
                        id: taskDetailModal.task.id 
                      })}
                      disabled={completeMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {completeMutation.isPending ? "Completing..." : "Mark Complete"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => openRescheduleDialog(taskDetailModal.task.id, taskDetailModal.task.deadline)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => openBreakdownDialog(taskDetailModal.task, taskDetailModal.isSubtask ? "subtask" : "task")}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Break Down Further
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => setTaskDetailModal({ isOpen: false, task: null, isSubtask: false })}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
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
                    const task = allTasks.find((t: any) => t.id === depId);
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

            {/* Available Tasks */}
            <div className="space-y-4">
              <h4 className="font-medium">Available Tasks</h4>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {allTasks
                  .filter((task: any) => 
                    task.id !== dependencyDialog.taskId && // Can't depend on itself
                    !wouldCreateCycle(dependencyDialog.taskId!, task.id, allTasks) // Prevent cycles
                  )
                  .map((task: any) => (
                    <div key={task.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={dependencyDialog.selectedDependencies.has(task.id)}
                        onChange={() => toggleDependency(task.id)}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.isOpen} onOpenChange={(open) => 
        !open && setRescheduleDialog({ isOpen: false, taskId: null, currentDate: "" })
      }>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Reschedule Task
            </DialogTitle>
            <DialogDescription>
              Select a new deadline. Dependencies will be automatically updated.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Deadline</label>
              <Input
                type="date"
                value={rescheduleDialog.currentDate}
                onChange={(e) => setRescheduleDialog(prev => ({ ...prev, currentDate: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setRescheduleDialog({ isOpen: false, taskId: null, currentDate: "" })}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveReschedule}
                disabled={rescheduleMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Breakdown Dialog */}
      <Dialog open={breakdownDialog.isOpen} onOpenChange={(open) => 
        !open && setBreakdownDialog({ isOpen: false, item: null, type: "", breakdown: null })
      }>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Break Down Further
            </DialogTitle>
            <DialogDescription>
              AI will analyze and break down this {breakdownDialog.type} into smaller, actionable items.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {breakdownDialog.item && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{breakdownDialog.item.title}</h4>
                {breakdownDialog.item.description && (
                  <p className="text-sm text-gray-600">{breakdownDialog.item.description}</p>
                )}
              </div>
            )}

            {!breakdownDialog.breakdown ? (
              <div className="text-center py-8">
                <Button 
                  onClick={handleBreakdown}
                  disabled={breakdownMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {breakdownMutation.isPending ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Breakdown
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-medium">AI Generated Breakdown:</h4>
                <div className="bg-white border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(breakdownDialog.breakdown, null, 2)}</pre>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setBreakdownDialog({ isOpen: false, item: null, type: "", breakdown: null })}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={applyBreakdown}
                    disabled={applyBreakdownMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {applyBreakdownMutation.isPending ? 'Applying...' : 'Apply Breakdown'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}