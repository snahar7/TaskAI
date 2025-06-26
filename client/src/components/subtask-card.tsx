import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, CheckCircle, Plus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Subtask } from "@shared/schema";

interface SubtaskCardProps {
  subtask: Subtask;
  onToggleComplete: (id: string | number, completed: boolean) => void;
  isLast?: boolean;
}

export function SubtaskCard({ subtask, onToggleComplete, isLast = false }: SubtaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const subdivideSubtaskMutation = useMutation({
    mutationFn: async (subtaskId: number) => {
      return apiRequest('POST', `/api/subtasks/${subtaskId}/subdivide`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Subtask subdivided",
        description: `Created ${data.newSubtasks.length} smaller tasks for "${subtask.title}"`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subdivide subtask",
        variant: "destructive"
      });
    }
  });

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await onToggleComplete(subtask.id, checked);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge variant="destructive" className="flex-shrink-0">
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="flex-shrink-0 bg-amber-100 text-amber-800">
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="secondary" className="flex-shrink-0 bg-green-100 text-green-800">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    
    // Handle both date formats and relative dates
    if (dateString.includes('Week') || dateString.includes('Day')) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return dateString;
    }
  };

  const formatCompletedDate = (dateString?: string | Date) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 1) return "Completed just now";
      if (diffHours < 24) return `Completed ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Completed 1 day ago";
      if (diffDays < 7) return `Completed ${diffDays} days ago`;
      
      return `Completed ${date.toLocaleDateString()}`;
    } catch {
      return "Completed recently";
    }
  };

  return (
    <div className={`border-b border-slate-100 ${isLast ? 'border-b-0' : ''}`}>
      <div className={`p-6 hover:bg-slate-50 transition-colors ${subtask.completed ? 'opacity-75' : ''}`}>
        <div className="flex items-start space-x-4">
          <div className="mt-1">
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={handleToggle}
              disabled={isUpdating}
              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className={`font-medium text-slate-900 ${subtask.completed ? 'line-through' : ''}`}>
                {subtask.title}
              </h4>
              {getPriorityBadge(subtask.priority)}
            </div>
            
            {subtask.description && (
              <p className="text-slate-600 text-sm mb-3">
                {subtask.description}
              </p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                {subtask.completed && subtask.completedAt ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {formatCompletedDate(subtask.completedAt)}
                  </span>
                ) : (
                  <>
                    {subtask.dueDate && (
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Due: {formatDate(subtask.dueDate)}
                      </span>
                    )}
                    {subtask.estimatedHours && (
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Est: {subtask.estimatedHours}h
                      </span>
                    )}
                  </>
                )}
                <span className="flex items-center">
                  <User className="w-3 h-3 mr-1" />
                  Assigned to you
                </span>
              </div>
              
              {!subtask.completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={() => subdivideSubtaskMutation.mutate(subtask.id)}
                  disabled={subdivideSubtaskMutation.isPending}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {subdivideSubtaskMutation.isPending ? "Breaking Down..." : "Break Down"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
