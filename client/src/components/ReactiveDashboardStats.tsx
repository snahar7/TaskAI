import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useReactiveDashboard } from "@/hooks/useReactiveData";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Target, CheckCircle2, Clock } from "lucide-react";

// This component demonstrates reactive state - it automatically updates when any task changes
export function ReactiveDashboardStats() {
  const { stats, todayTasks, overdueTasks } = useReactiveDashboard();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Reactive Stats Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalGoals}</div>
          <p className="text-xs text-muted-foreground">Active goals</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProjects}</div>
          <p className="text-xs text-muted-foreground">In progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTasks}</div>
          <p className="text-xs text-muted-foreground">
            {stats.completedTasks} completed ({stats.completionRate}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayTasks.length}</div>
          <p className="text-xs text-muted-foreground">
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueTasks.length} overdue
              </Badge>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Reactive Today's Tasks component - automatically updates when tasks change
export function ReactiveTodayTasks() {
  const { todayTasks } = useReactiveDashboard();

  if (todayTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Focus</CardTitle>
          <CardDescription>No tasks due today</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Focus</CardTitle>
        <CardDescription>{todayTasks.length} tasks due today</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {todayTasks.map((task) => (
            <div 
              key={task.id} 
              className="flex items-center space-x-2 p-2 rounded border hover:bg-gray-50 transition-colors"
            >
              <input 
                type="checkbox" 
                checked={task.completed}
                onChange={() => {
                  // This will trigger reactive updates across all components
                  console.log('Would complete task:', task.id);
                }}
              />
              <div className="flex-1">
                <p className="font-medium text-sm">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  {task.priority && (
                    <Badge variant="outline" size="sm" className="mr-2">
                      {task.priority}
                    </Badge>
                  )}
                  {task.estimatedHours}h estimated
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}