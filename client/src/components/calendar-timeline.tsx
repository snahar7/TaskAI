import { Calendar, Clock, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Subtask } from "@shared/schema";

interface CalendarTimelineProps {
  subtasks: Subtask[];
}

export function CalendarTimeline({ subtasks }: CalendarTimelineProps) {
  // Group subtasks by due date
  const tasksByDate = subtasks.reduce((acc, subtask) => {
    if (!subtask.dueDate) return acc;
    
    const date = new Date(subtask.dueDate).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(subtask);
    return acc;
  }, {} as Record<string, Subtask[]>);

  // Sort dates chronologically
  const sortedDates = Object.keys(tasksByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  };

  const getTotalHours = (tasks: Subtask[]) => {
    return tasks.reduce((total, task) => total + (task.estimatedHours || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedDates.length === 0 ? (
          <p className="text-slate-500 text-center py-4">
            No scheduled tasks with due dates
          </p>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateString) => {
              const tasks = tasksByDate[dateString];
              const totalHours = getTotalHours(tasks);
              const completedTasks = tasks.filter(t => t.completed).length;
              
              return (
                <div key={dateString} className="relative">
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {new Date(dateString).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {formatDate(dateString)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-4 w-4" />
                        {totalHours}h total
                      </div>
                      <p className="text-xs text-slate-500">
                        {completedTasks}/{tasks.length} completed
                      </p>
                    </div>
                  </div>

                  {/* Timeline tasks */}
                  <div className="space-y-2 ml-4 border-l-2 border-slate-200 pl-4">
                    {tasks.map((task, index) => (
                      <div key={task.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-6 top-2">
                          {task.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 bg-white" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-400 bg-white" />
                          )}
                        </div>

                        {/* Task card */}
                        <div className={`p-3 rounded-lg border transition-colors ${
                          task.completed 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className={`font-medium ${
                                task.completed ? 'line-through text-slate-500' : ''
                              }`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-sm text-slate-600 mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                              {task.estimatedHours && (
                                <span className="text-xs text-slate-500">
                                  {task.estimatedHours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}