import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SubtaskCard } from "@/components/subtask-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Tag, Target, Plus, RefreshCw, Share, ArrowLeft, Filter } from "lucide-react";
import type { TaskWithSubtasks } from "@shared/schema";
import { useState } from "react";

export default function Tasks() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string>("all");

  // If we have an ID, fetch specific task, otherwise fetch all tasks
  const { data: taskData, isLoading } = useQuery<TaskWithSubtasks | TaskWithSubtasks[]>({
    queryKey: id ? ['/api/tasks', id] : ['/api/tasks'],
    enabled: true,
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, completed }: { subtaskId: string | number, completed: boolean }) => {
      const response = await apiRequest('PATCH', `/api/subtasks/${subtaskId}`, { completed });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks', id] });
      }
    },
  });

  const handleSubtaskToggle = (subtaskId: string | number, completed: boolean) => {
    updateSubtaskMutation.mutate({ subtaskId, completed });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle single task view
  if (id && taskData && !Array.isArray(taskData)) {
    const task = taskData as TaskWithSubtasks;
    console.log('=== TASK DEBUG ===');
    console.log('Task ID:', id);
    console.log('Task data:', task);
    console.log('Subtasks array:', task.subtasks);
    console.log('Subtasks length:', task.subtasks?.length);
    console.log('Is Array?', Array.isArray(task.subtasks));
    
    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
    const progress = task.subtasks?.length > 0 ? Math.round((completedSubtasks / task.subtasks.length) * 100) : 0;

    // Filter subtasks
    const filteredSubtasks = (task.subtasks || []).filter(subtask => {
      switch (filter) {
        case "pending": return !subtask.completed;
        case "completed": return subtask.completed;
        case "high": return subtask.priority === "high";
        case "medium": return subtask.priority === "medium";
        case "low": return subtask.priority === "low";
        default: return true;
      }
    });
    
    console.log('Filtered subtasks:', filteredSubtasks);
    console.log('Filter:', filter);

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      if (diffDays < 7) return `${diffDays} days ago`;
      return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    };

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/tasks')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all tasks
        </Button>

        {/* Task Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{task.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Created {formatDate(task.createdAt.toString())}
                  </span>
                  {task.category && (
                    <span className="flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      {task.category}
                    </span>
                  )}
                  {task.targetDate && (
                    <span className="flex items-center">
                      <Target className="w-4 h-4 mr-1" />
                      Target: {task.targetDate}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-4 lg:mt-0">
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700">Progress</div>
                  <div className="text-2xl font-bold text-green-600">{progress}%</div>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="4" fill="none"/>
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="28" 
                      stroke="#059669" 
                      strokeWidth="4" 
                      fill="none" 
                      strokeDasharray="175.9" 
                      strokeDashoffset={175.9 - (175.9 * progress / 100)} 
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Subtask
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Re-analyze
              </Button>
              <Button variant="outline" size="sm">
                <Share className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subtasks Section */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Filter className="mr-2 text-primary" />
                Subtasks
                <Badge variant="secondary" className="ml-2">
                  {task.subtasks?.length || 0} total
                </Badge>
              </CardTitle>
              
              <div className="flex items-center space-x-2">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter tasks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {!task.subtasks || task.subtasks.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No subtasks found for this task.
              </div>
            ) : filteredSubtasks.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                No subtasks match the current filter. ({task.subtasks.length} total subtasks available)
              </div>
            ) : (
              <div>
                <div className="p-3 text-sm text-slate-600 border-b">
                  Showing {filteredSubtasks.length} of {task.subtasks.length} subtasks
                </div>
                {filteredSubtasks.map((subtask, index) => (
                  <SubtaskCard
                    key={subtask.id}
                    subtask={subtask}
                    onToggleComplete={handleSubtaskToggle}
                    isLast={index === filteredSubtasks.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle all tasks view
  const tasks = Array.isArray(taskData) ? taskData : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">All Tasks</h2>
        <p className="text-slate-600">Manage your AI-generated task breakdowns</p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-slate-400 mb-4">
              <Filter size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks yet</h3>
            <p className="text-slate-600 mb-6">Create your first task to get started with AI-powered planning.</p>
            <Button onClick={() => setLocation('/')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {tasks.map((task) => {
            const completedSubtasks = task.subtasks.filter(s => s.completed).length;
            const progress = task.subtasks.length > 0 ? Math.round((completedSubtasks / task.subtasks.length) * 100) : 0;
            
            return (
              <Card 
                key={task.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setLocation(`/tasks/${task.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">{task.title}</h3>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-slate-500">
                        <span>{task.subtasks.length} subtasks</span>
                        <span>•</span>
                        <span>{completedSubtasks} completed</span>
                        {task.category && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{task.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium text-slate-700 mb-1">Progress</div>
                      <div className="text-lg font-bold text-green-600">{progress}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
