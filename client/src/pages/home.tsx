import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TaskInputForm } from "@/components/task-input-form";
import { TaskApproval } from "@/components/task-approval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, ListChecks, TrendingUp, Clock } from "lucide-react";
import type { TaskWithSubtasks } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const [pendingTask, setPendingTask] = useState<{
    title: string;
    description: string;
    category?: string;
    targetDate?: string;
    subtasks: any[];
  } | null>(null);

  // Fetch recent tasks
  const { data: recentTasks = [] } = useQuery<TaskWithSubtasks[]>({
    queryKey: ['/api/tasks'],
    enabled: true,
  });

  // Generate task breakdown for preview
  const generateTaskMutation = useMutation({
    mutationFn: async (taskData: {
      title: string;
      description: string;
      category?: string;
      targetDate?: string;
    }) => {
      const response = await apiRequest('POST', '/api/tasks/generate', taskData);
      return response.json();
    },
    onSuccess: (data: TaskWithSubtasks) => {
      // Show approval modal instead of directly creating
      setPendingTask({
        title: data.title,
        description: data.description,
        category: data.category || undefined,
        targetDate: data.targetDate || undefined,
        subtasks: data.subtasks || []
      });
    },
  });

  // Create approved task
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest('POST', '/api/tasks/generate', taskData);
    },
    onSuccess: (data: TaskWithSubtasks) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setPendingTask(null);
      setLocation(`/tasks/${data.id}`);
    },
  });

  const handleTaskSubmit = (taskData: {
    title: string;
    description: string;
    category?: string;
    targetDate?: string;
  }) => {
    generateTaskMutation.mutate(taskData);
  };

  const handleApproveTask = () => {
    if (pendingTask) {
      createTaskMutation.mutate(pendingTask);
    }
  };

  const handleRejectTask = () => {
    setPendingTask(null);
  };

  const getStatusColor = (subtasks: any[]) => {
    if (!subtasks.length) return "bg-slate-500";
    const completed = subtasks.filter(s => s.completed).length;
    const progress = completed / subtasks.length;
    if (progress === 1) return "bg-green-500";
    if (progress > 0.5) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Turn Big Goals into Clear Actions
        </h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Simply describe what you want to accomplish, and our AI will break it down into actionable steps you can start working on today.
        </p>
      </div>

      {/* Task Input Form */}
      <div className="mb-8">
        {pendingTask ? (
          <TaskApproval
            title={pendingTask.title}
            description={pendingTask.description}
            subtasks={pendingTask.subtasks}
            onApprove={handleApproveTask}
            onReject={handleRejectTask}
            isLoading={createTaskMutation.isPending}
          />
        ) : (
          <TaskInputForm 
            onSubmit={handleTaskSubmit}
            isLoading={generateTaskMutation.isPending}
            error={generateTaskMutation.error?.message}
          />
        )}
      </div>

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Brain className="text-primary text-xl" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">AI-Powered Breakdown</h3>
          <p className="text-slate-600 text-sm">
            Advanced AI analyzes your goal and creates a structured, actionable plan.
          </p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ListChecks className="text-green-600 text-xl" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Smart Prioritization</h3>
          <p className="text-slate-600 text-sm">
            Each subtask gets assigned priority levels and suggested timelines.
          </p>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="text-purple-600 text-xl" />
          </div>
          <h3 className="font-semibold text-slate-900 mb-2">Track Progress</h3>
          <p className="text-slate-600 text-sm">
            Mark tasks as complete and see your progress toward your bigger goal.
          </p>
        </div>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 text-slate-400" />
            Recent Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No tasks yet. Create your first task above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(task.subtasks)}`} />
                    <span className="text-slate-700 font-medium">{task.title}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span>{task.subtasks.length} subtasks</span>
                    <span>•</span>
                    <span>{formatDate(task.createdAt.toString())}</span>
                  </div>
                </div>
              ))}
              
              {recentTasks.length > 3 && (
                <div className="text-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('/tasks')}
                  >
                    View all tasks
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
