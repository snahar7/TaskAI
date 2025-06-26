import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GoalInputForm } from "@/components/goal-input-form";
import { GoalBreakdownApproval } from "@/components/goal-breakdown-approval";
import { GoalHierarchyDisplay } from "@/components/goal-hierarchy-display";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Target, ListTodo } from "lucide-react";
import { AIBreakdown, GoalWithProjects } from "@shared/schema";

interface PendingBreakdownResponse {
  pendingId: number;
  breakdown: AIBreakdown;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'input' | 'approval' | 'display'>('input');
  const [pendingBreakdown, setPendingBreakdown] = useState<PendingBreakdownResponse | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['/api/goals'],
    enabled: currentStep === 'display'
  });

  // Fetch specific goal with full hierarchy
  const { data: selectedGoal, isLoading: goalLoading } = useQuery({
    queryKey: ['/api/goals', selectedGoalId],
    enabled: !!selectedGoalId && currentStep === 'display'
  });

  // Create goal breakdown mutation
  const createBreakdownMutation = useMutation({
    mutationFn: async (data: { goalInput: string; targetDate?: string }) => {
      const response = await apiRequest('/api/goals/breakdown', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data: PendingBreakdownResponse) => {
      setPendingBreakdown(data);
      setCurrentStep('approval');
      toast({
        title: "Breakdown Created",
        description: "AI has created your goal breakdown. Review and approve it below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create goal breakdown",
        variant: "destructive",
      });
    },
  });

  // Approve breakdown mutation
  const approveBreakdownMutation = useMutation({
    mutationFn: async (data: { pendingId: number; approved: boolean }) => {
      const response = await apiRequest('/api/goals/approve', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data: GoalWithProjects) => {
      setPendingBreakdown(null);
      setSelectedGoalId(data.id);
      setCurrentStep('display');
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: "Goal Created!",
        description: "Your goal has been created with all projects, tasks, and subtasks.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve breakdown",
        variant: "destructive",
      });
    },
  });

  // Task completion mutation
  const taskCompletionMutation = useMutation({
    mutationFn: async (data: { taskId: number; completed: boolean }) => {
      const response = await apiRequest(`/api/tasks/${data.taskId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: data.completed }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals', selectedGoalId] });
      toast({
        title: "Task Updated",
        description: "Task completion status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Subtask completion mutation
  const subtaskCompletionMutation = useMutation({
    mutationFn: async (data: { subtaskId: number; completed: boolean }) => {
      const response = await apiRequest(`/api/subtasks/${data.subtaskId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: data.completed }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals', selectedGoalId] });
      toast({
        title: "Subtask Updated",
        description: "Subtask completion status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update subtask",
        variant: "destructive",
      });
    },
  });

  const handleGoalSubmit = (data: { goalInput: string; targetDate?: string }) => {
    createBreakdownMutation.mutate(data);
  };

  const handleApprove = (pendingId: number) => {
    approveBreakdownMutation.mutate({ pendingId, approved: true });
  };

  const handleReject = (pendingId: number) => {
    approveBreakdownMutation.mutate({ pendingId, approved: false });
    setPendingBreakdown(null);
    setCurrentStep('input');
    toast({
      title: "Breakdown Rejected",
      description: "You can create a new goal breakdown.",
    });
  };

  const handleTaskComplete = (taskId: number, completed: boolean) => {
    taskCompletionMutation.mutate({ taskId, completed });
  };

  const handleSubtaskComplete = (subtaskId: number, completed: boolean) => {
    subtaskCompletionMutation.mutate({ subtaskId, completed });
  };

  const handleEdit = (type: 'goal' | 'project' | 'task' | 'subtask', id: number) => {
    toast({
      title: "Edit Feature",
      description: `Editing ${type} will be available in the next update.`,
    });
  };

  const startNewGoal = () => {
    setCurrentStep('input');
    setSelectedGoalId(null);
    setPendingBreakdown(null);
  };

  const viewGoal = (goalId: number) => {
    setSelectedGoalId(goalId);
    setCurrentStep('display');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trak</h1>
          <p className="text-gray-600">AI-powered task management with intelligent goal breakdown</p>
        </div>

        {/* Step 1: Goal Input */}
        {currentStep === 'input' && (
          <div className="space-y-6">
            <GoalInputForm
              onSubmit={handleGoalSubmit}
              isLoading={createBreakdownMutation.isPending}
              error={createBreakdownMutation.error?.message}
            />

            {/* Show existing goals if any */}
            {!goalsLoading && goals.length > 0 && (
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="w-5 h-5" />
                    Your Existing Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {goals.map((goal: any) => (
                      <div key={goal.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                        <div>
                          <h4 className="font-medium">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-sm text-gray-600">{goal.description}</p>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => viewGoal(goal.id)}>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Breakdown Approval */}
        {currentStep === 'approval' && pendingBreakdown && (
          <div className="space-y-6">
            <div className="text-center">
              <Button variant="outline" onClick={startNewGoal}>
                ← Back to Create New Goal
              </Button>
            </div>
            
            <GoalBreakdownApproval
              breakdown={pendingBreakdown.breakdown}
              pendingId={pendingBreakdown.pendingId}
              onApprove={handleApprove}
              onReject={handleReject}
              isLoading={approveBreakdownMutation.isPending}
            />
          </div>
        )}

        {/* Step 3: Goal Display */}
        {currentStep === 'display' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <Button variant="outline" onClick={startNewGoal}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Goal
              </Button>
              
              {goals.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Switch goal:</span>
                  <select 
                    value={selectedGoalId || ''} 
                    onChange={(e) => viewGoal(parseInt(e.target.value))}
                    className="border rounded px-3 py-1 text-sm"
                  >
                    {goals.map((goal: any) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {goalLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading goal...</p>
              </div>
            ) : selectedGoal ? (
              <GoalHierarchyDisplay
                goal={selectedGoal}
                onTaskComplete={handleTaskComplete}
                onSubtaskComplete={handleSubtaskComplete}
                onEdit={handleEdit}
              />
            ) : (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a goal to view its breakdown</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}