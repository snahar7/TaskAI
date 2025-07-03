import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, User, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

// Temporary type definitions until schema is properly resolved
interface TaskData {
  id: number;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  percentComplete: number;
  deadline?: string;
  assignedTo?: string;
  estimatedHours?: number;
  actualHours?: number;
  subtasks?: number;
  completedSubtasks?: number;
}

interface TaskCardProps {
  task: TaskData;
  onClick?: () => void;
  onStatusChange?: (id: number, completed: boolean) => void;
  className?: string;
}

/**
 * TaskCard - Reusable component for displaying task information
 * Used across different views (list, kanban, etc.)
 */
export function TaskCard({ task, onClick, onStatusChange, className }: TaskCardProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  const statusColors = {
    not_started: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimeEstimate = (hours?: number) => {
    if (!hours) return '';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 8) return `${hours}h`;
    return `${Math.round(hours / 8)}d`;
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md", 
        task.status === 'completed' && "opacity-75",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium line-clamp-2">
            {task.title}
          </CardTitle>
          <div className="flex gap-1 ml-2">
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={statusColors[task.status]}>
              {formatStatus(task.status)}
            </Badge>
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {task.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress Bar */}
        {task.percentComplete > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{task.percentComplete}%</span>
            </div>
            <Progress value={task.percentComplete} className="h-1.5" />
          </div>
        )}

        {/* Subtasks Progress */}
        {task.subtasks && task.subtasks > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckSquare className="w-4 h-4" />
            <span>{task.completedSubtasks || 0}/{task.subtasks} subtasks</span>
          </div>
        )}

        {/* Time and Date Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {task.estimatedHours && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimeEstimate(task.estimatedHours)}</span>
              </div>
            )}
            
            {task.deadline && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {task.assignedTo && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{task.assignedTo}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {task.status !== 'completed' && onStatusChange && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, true);
              }}
              className="flex-1"
            >
              Mark Complete
            </Button>
          )}
          
          {task.status === 'completed' && onStatusChange && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, false);
              }}
              className="flex-1"
            >
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}