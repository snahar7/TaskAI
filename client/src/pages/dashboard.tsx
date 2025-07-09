import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  BarChart3
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
    },
  });

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
                  <CardDescription className="text-sm">Top priority tasks for {new Date().toLocaleDateString()}</CardDescription>
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
                    todayTasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">{task.title}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              From {task.project?.title || task.goal?.title} • Est: {task.estimatedHours || 1}h
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-10 w-10 p-0 sm:h-8 sm:w-auto sm:px-3 shrink-0"
                          onClick={() => completeMutation.mutate({ 
                            type: task.taskId ? 'subtask' : 'task', 
                            id: task.id 
                          })}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-2">Done</span>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No tasks due today. Great job staying on track!
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
                    overdueTasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg">
                        <div>
                          <p className="font-medium text-red-800">{task.title}</p>
                          <p className="text-sm text-red-600">
                            Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button size="sm" variant="outline" className="h-10 text-xs sm:text-sm">Reschedule</Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            className="h-10 text-xs sm:text-sm"
                            onClick={() => completeMutation.mutate({ 
                              type: task.taskId ? 'subtask' : 'task', 
                              id: task.id 
                            })}
                          >
                            Complete
                          </Button>
                        </div>
                      </div>
                    ))
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
    </div>
  );
}