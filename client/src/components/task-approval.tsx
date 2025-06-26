import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Calendar } from "lucide-react";
interface AISubtask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  estimatedHours?: number;
}

interface TaskApprovalProps {
  title: string;
  description: string;
  subtasks: AISubtask[];
  onApprove: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function TaskApproval({ 
  title, 
  description, 
  subtasks, 
  onApprove, 
  onReject, 
  isLoading = false 
}: TaskApprovalProps) {
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
    if (diffDays > 0) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  const totalHours = subtasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
  const totalDays = Math.ceil(totalHours / 8); // Assuming 8-hour workdays

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Review AI-Generated Task Breakdown</span>
          <div className="text-sm font-normal text-slate-500">
            {subtasks.length} subtasks • {totalHours}h total • ~{totalDays} days
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Task overview */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-slate-600">{description}</p>
        </div>

        {/* Subtasks breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium">Proposed Subtasks:</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {subtasks.map((subtask, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h5 className="font-medium">{subtask.title}</h5>
                    <p className="text-sm text-slate-600 mt-1">
                      {subtask.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getPriorityColor(subtask.priority)}>
                      {subtask.priority}
                    </Badge>
                    {subtask.estimatedHours && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {subtask.estimatedHours}h
                      </div>
                    )}
                    {subtask.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {formatDate(subtask.dueDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline overview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Timeline Preview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Total time commitment:</span>
              <div className="font-medium">{totalHours} hours</div>
            </div>
            <div>
              <span className="text-blue-700">Estimated duration:</span>
              <div className="font-medium">{totalDays} working days</div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={onReject} 
            variant="outline" 
            className="flex-1"
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
          <Button 
            onClick={onApprove} 
            className="flex-1"
            disabled={isLoading}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isLoading ? "Adding to Calendar..." : "Approve & Add to Calendar"}
          </Button>
        </div>

        <p className="text-xs text-slate-500 text-center">
          Once approved, these tasks will be added to your calendar with the scheduled due dates.
        </p>
      </CardContent>
    </Card>
  );
}