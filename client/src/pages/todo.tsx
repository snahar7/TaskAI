import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2,
  Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Task {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  estimatedHours?: number;
  createdAt: string;
}

export default function TodoPage() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all tasks (we'll treat them as todos)
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
    staleTime: 30000,
  });

  // Create new task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await fetch("/api/hierarchy/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task",
          title,
          description: "",
          estimatedHours: 1,
          priority: "medium"
        }),
      });
      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      setNewTaskTitle("");
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task created!", description: "Your task has been added to the list." });
    },
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const response = await fetch(`/api/tasks/${id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!response.ok) throw new Error("Failed to update task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task deleted!", description: "Task has been removed from your list." });
    },
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate(newTaskTitle.trim());
  };

  const handleToggleTask = (id: number, completed: boolean) => {
    toggleTaskMutation.mutate({ id, completed: !completed });
  };

  const handleDeleteTask = (id: number) => {
    deleteTaskMutation.mutate(id);
  };

  const filteredTasks = tasks.filter(task => showCompleted || !task.completed);
  const completedCount = tasks.filter(task => task.completed).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">To-do</h1>
            <p className="text-gray-600">
              {tasks.length} total tasks, {completedCount} completed
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowCompleted(!showCompleted)}
          variant="outline"
          size="sm"
        >
          {showCompleted ? "Hide" : "Show"} Completed
        </Button>
      </div>

      {/* Add New Task */}
      <form onSubmit={handleCreateTask} className="mb-6">
        <div className="flex gap-2">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1"
            disabled={createTaskMutation.isPending}
          />
          <Button 
            type="submit" 
            disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No tasks yet</p>
            <p className="text-sm">Add your first task above to get started!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow",
                task.completed && "opacity-60"
              )}
            >
              {/* Checkbox */}
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => handleToggleTask(task.id, task.completed)}
                className="mt-1"
              />

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={cn(
                    "font-medium text-gray-900",
                    task.completed && "line-through text-gray-500"
                  )}>
                    {task.title}
                  </h3>
                  <Badge variant="secondary" className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
                
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {task.estimatedHours && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.estimatedHours}h
                    </div>
                  )}
                  {task.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(task.deadline).toLocaleDateString()}
                    </div>
                  )}
                  <div>
                    Added {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleteTaskMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}