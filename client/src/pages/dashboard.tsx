import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  ChevronRight
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [taskDetailModal, setTaskDetailModal] = useState({
    isOpen: false,
    task: null as any,
    isSubtask: false
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch dashboard stats with real data
  const { data: dashboardStats, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Extract data from dashboard stats
  const todayTasks = dashboardStats?.todayTasks || [];
  const overdueTasks = dashboardStats?.overdueTasks || [];
  const quickWins = dashboardStats?.quickWins || [];
  const behindSchedule = dashboardStats?.behindSchedule || [];
  const metrics = dashboardStats?.metrics || {};
  const counts = dashboardStats?.counts || {};
  const goals = dashboardStats?.goals || [];

  // Completion mutation
  const completeMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: number }) => {
      const response = await apiRequest("PATCH", `/api/${type}s/${id}/complete`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  // Edit mutation for task details
  const editTaskMutation = useMutation({
    mutationFn: async ({ type, id, field, value }: { type: string; id: number; field: string; value: any }) => {
      const response = await apiRequest("PATCH", `/api/${type}s/${id}/edit`, { [field]: value });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setEditingField(null);
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

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="container mx-auto p-3 sm:p-6 max-w-7xl">
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Your productivity command center</p>
      </div>

      <Tabs defaultValue="action" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="action" className="text-xs sm:text-sm py-2 sm:py-3">Action Center</TabsTrigger>
          <TabsTrigger value="search" className="text-xs sm:text-sm py-2 sm:py-3">Smart Filters</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 sm:py-3">Analytics</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Priority Matrix
                </CardTitle>
                <CardDescription>Eisenhower Matrix (Urgent vs Important)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 h-64">
                  <div className="border rounded p-2 bg-red-50">
                    <h4 className="text-xs font-medium text-red-800 mb-2">Urgent + Important</h4>
                    <div className="space-y-1">
                      <div className="text-xs p-1 bg-white rounded">Crisis Task</div>
                    </div>
                  </div>
                  <div className="border rounded p-2 bg-blue-50">
                    <h4 className="text-xs font-medium text-blue-800 mb-2">Important + Not Urgent</h4>
                    <div className="space-y-1">
                      <div className="text-xs p-1 bg-white rounded">Strategic Work</div>
                    </div>
                  </div>
                  <div className="border rounded p-2 bg-orange-50">
                    <h4 className="text-xs font-medium text-orange-800 mb-2">Urgent + Not Important</h4>
                    <div className="space-y-1">
                      <div className="text-xs p-1 bg-white rounded">Interruption</div>
                    </div>
                  </div>
                  <div className="border rounded p-2 bg-gray-50">
                    <h4 className="text-xs font-medium text-gray-800 mb-2">Neither</h4>
                    <div className="space-y-1">
                      <div className="text-xs p-1 bg-white rounded">Time Waster</div>
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

        {/* Smart Filters & Search Dashboard */}
        <TabsContent value="search" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Global Search */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Global Search
                </CardTitle>
                <CardDescription>Search across all goals, projects, tasks, and subtasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Search everything..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Intelligent Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Smart Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { name: "Behind Schedule", count: counts.behindSchedule || 0, color: "destructive" },
                    { name: "Quick Wins (<1h)", count: counts.quickWins || 0, color: "secondary" },
                    { name: "Overdue Items", count: counts.overdueTasks || 0, color: "outline" },
                    { name: "Today's Tasks", count: counts.todayTasks || 0, color: "default" }
                  ].map((filter) => (
                    <Button 
                      key={filter.name}
                      variant={filter.color as any}
                      className="w-full justify-between"
                      onClick={() => setSelectedFilter(filter.name)}
                    >
                      {filter.name}
                      <Badge variant="secondary">{filter.count}</Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Saved Views */}
            <Card>
              <CardHeader>
                <CardTitle>Saved Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    "This Week's Priorities",
                    "Team Tasks",
                    "Personal Goals",
                    "High Impact Work"
                  ].map((view) => (
                    <Button key={view} variant="ghost" className="w-full justify-start">
                      {view}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Filter Results */}
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>Showing items for: {selectedFilter}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 border rounded-lg">
                      <p className="font-medium">Filtered Item {i}</p>
                      <p className="text-sm text-muted-foreground">Matches current filter criteria</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics & Insights Dashboard */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Key Metrics */}
            {[
              { title: "Tasks Completed Today", value: metrics.tasksCompletedToday || 0, change: "+12%", icon: CheckCircle2 },
              { title: "Average Completion Time", value: `${metrics.avgCompletionTime || 0}h`, change: "-5%", icon: Clock },
              { title: "Goals On Track", value: `${metrics.goalsOnTrackPercent || 0}%`, change: "+3%", icon: Target },
              { title: "Productivity Score", value: metrics.productivityScore || 0, change: "+8%", icon: TrendingUp }
            ].map((metric) => (
              <Card key={metric.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className={metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {metric.change}
                    </span>
                    {" "}from last week
                  </p>
                </CardContent>
              </Card>
            ))}

            {/* Progress Velocity Chart */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Progress Velocity
                </CardTitle>
                <CardDescription>Estimated vs Actual completion timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border rounded">
                  <p className="text-muted-foreground">Progress velocity chart placeholder</p>
                </div>
              </CardContent>
            </Card>

            {/* Time Analysis */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Time Analysis</CardTitle>
                <CardDescription>Where your time is being spent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { goal: "Write Novel", estimated: 120, actual: 95, progress: 79 },
                    { goal: "Clean House", estimated: 8, actual: 12, progress: 150 },
                    { goal: "Learn Programming", estimated: 40, actual: 35, progress: 88 }
                  ].map((item) => (
                    <div key={item.goal} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.goal}</span>
                        <span className="text-muted-foreground">{item.actual}h / {item.estimated}h</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Completion Patterns Heatmap */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Completion Patterns</CardTitle>
                <CardDescription>Heatmap of your most productive times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-center justify-center border rounded">
                  <p className="text-muted-foreground">Productivity heatmap placeholder</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Goal-Centric Overview Dashboard */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Goal Progress Rings */}
            {(goals as any[]).map((goal: any) => (
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
                      <Badge className={`${
                        taskDetailModal.task.priority === "urgent" ? "bg-red-100 text-red-800 border-red-200" :
                        taskDetailModal.task.priority === "high" ? "bg-orange-100 text-orange-800 border-orange-200" :
                        taskDetailModal.task.priority === "medium" ? "bg-blue-100 text-blue-800 border-blue-200" :
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }`}>
                        <Flag className="h-3 w-3 mr-1" />
                        {taskDetailModal.task.priority || "Medium"} Priority
                      </Badge>
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
                  <div className="text-sm p-3 rounded border bg-gray-50">
                    {taskDetailModal.task.dependencies && taskDetailModal.task.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {taskDetailModal.task.dependencies.map((depId: number, index: number) => (
                          <Badge key={depId} variant="secondary" className="text-xs">
                            Task {depId}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">No dependencies</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => completeMutation.mutate({ 
                        type: taskDetailModal.isSubtask ? 'subtask' : 'task', 
                        id: taskDetailModal.task.id 
                      })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                    <Button variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Reschedule
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
    </div>
  );
}