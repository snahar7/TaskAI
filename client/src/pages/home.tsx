import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { GoalInputForm } from "@/components/goal-input-form";
import { HierarchicalInputForm } from "@/components/hierarchical-input-form";
import { EditableBreakdownApproval } from "@/components/editable-breakdown-approval";
import { SimpleGoalHierarchy } from "@/components/simple-goal-hierarchy";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, ListTodo, Sparkles, FolderPlus, Calendar, AlertTriangle } from "lucide-react";
import { AIBreakdown, GoalWithProjects } from "@shared/schema";

interface PendingBreakdownResponse {
  pendingId: number;
  breakdown: AIBreakdown;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'input' | 'approval' | 'display'>('display');
  const [pendingBreakdown, setPendingBreakdown] = useState<PendingBreakdownResponse | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<GoalWithProjects[]>({
    queryKey: ['/api/goals']
  });

  // Set default to wedding goal when data loads
  useEffect(() => {
    if (!selectedGoalId && goals.length > 0) {
      const weddingGoal = goals.find(g => g.title.toLowerCase().includes('wedding'));
      if (weddingGoal) {
        setSelectedGoalId(weddingGoal.id);
      }
    }
  }, [goals]);

  // Get selected goal from already loaded goals data
  const selectedGoal = selectedGoalId ? goals.find(goal => goal.id === selectedGoalId) : null;

  // Create goal breakdown mutation (AI-powered)
  const createBreakdownMutation = useMutation({
    mutationFn: async (data: { goalInput: string; targetDate?: string }) => {
      const response = await apiRequest('POST', '/api/goals/breakdown', data);
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
    mutationFn: async (data: { pendingId: number; approved: boolean; editedBreakdown?: AIBreakdown }) => {
      const response = await apiRequest('POST', '/api/goals/approve', data);
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
      const response = await apiRequest('PATCH', `/api/tasks/${data.taskId}/complete`, { completed: data.completed });
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
      const response = await apiRequest('PATCH', `/api/subtasks/${data.subtaskId}/complete`, { completed: data.completed });
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

  // Create individual hierarchy item mutation
  const createHierarchyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/hierarchy/create', data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals/hierarchy'] });
      
      if (variables.level === 'goal') {
        setSelectedGoalId(data.id);
        setCurrentStep('display');
      }
      
      toast({
        title: `${variables.level.charAt(0).toUpperCase() + variables.level.slice(1)} Created`,
        description: `Successfully created ${variables.level}: ${data.title}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create item",
        variant: "destructive",
      });
    },
  });

  const handleGoalSubmit = (data: { goalInput: string; targetDate?: string }) => {
    createBreakdownMutation.mutate(data);
  };

  const handleHierarchySubmit = (data: any) => {
    createHierarchyMutation.mutate(data);
  };

  const handleApproval = (pendingId: number, editedBreakdown: AIBreakdown) => {
    approveBreakdownMutation.mutate({ pendingId, approved: true, editedBreakdown });
  };

  const handleRejection = (pendingId: number) => {
    approveBreakdownMutation.mutate({ pendingId, approved: false });
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

  const showAllGoals = () => {
    setCurrentStep('display');
    setSelectedGoalId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trak</h1>
          <p className="text-gray-600">AI-powered task management with intelligent goal breakdown</p>
        </div>

        {/* Step 1: Input Options */}
        {currentStep === 'input' && (
          <div className="space-y-6">
            <Tabs defaultValue="ai-goal" className="w-full max-w-2xl mx-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ai-goal" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Goal Breakdown
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  Add Specific Item
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ai-goal" className="mt-6">
                <GoalInputForm
                  onSubmit={handleGoalSubmit}
                  isLoading={createBreakdownMutation.isPending}
                  error={createBreakdownMutation.error?.message}
                />
              </TabsContent>
              
              <TabsContent value="manual" className="mt-6">
                <HierarchicalInputForm
                  onSubmit={handleHierarchySubmit}
                  isLoading={createHierarchyMutation.isPending}
                  error={createHierarchyMutation.error?.message}
                />
              </TabsContent>
            </Tabs>

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
                    {goals.map((goal) => (
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
            
            <EditableBreakdownApproval
              breakdown={pendingBreakdown.breakdown}
              pendingId={pendingBreakdown.pendingId}
              onApprove={handleApproval}
              onReject={handleRejection}
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
              
              <Button variant="outline" onClick={showAllGoals}>
                <ListTodo className="w-4 h-4 mr-2" />
                View All Goals
              </Button>
            </div>

            {!selectedGoalId ? (
              /* All Goals View */
              <div className="max-w-4xl mx-auto space-y-4">
                <h2 className="text-2xl font-bold text-center mb-6">Your Goals</h2>
                
                {goalsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading your goals...</p>
                  </div>
                ) : goals.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No goals yet</h3>
                      <p className="text-gray-500 mb-4">Create your first goal to get started with AI-powered task breakdown</p>
                      <Button onClick={startNewGoal}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Goal
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {goals.map((goal) => {
                      const allTasks = (goal.projects || []).flatMap(p => p.tasks || []);
                      const completedTasks = allTasks.filter(t => t.completed).length;
                      const progressPercent = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;
                      
                      return (
                        <Card key={goal.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => viewGoal(goal.id)}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-blue-600" />
                                <div>
                                  <CardTitle className="text-lg">{goal.title}</CardTitle>
                                  {goal.description && (
                                    <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {progressPercent}% Complete
                                </Badge>
                                <Badge variant="outline">
                                  {(goal.projects || []).length} projects
                                </Badge>
                                <Badge variant="outline">
                                  {allTasks.length} tasks
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {goal.targetDate && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Due: {goal.targetDate}
                                </Badge>
                              )}
                              {goal.urgency && (
                                <Badge className={`text-xs ${
                                  goal.urgency === 'high' ? 'bg-red-100 text-red-800' :
                                  goal.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {goal.urgency}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Single Goal View */
              <div className="space-y-4">
                <div className="flex items-center gap-2 max-w-4xl mx-auto">
                  <Button variant="outline" size="sm" onClick={showAllGoals}>
                    ← Back to All Goals
                  </Button>
                  
                  {goals.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Switch goal:</span>
                      <select 
                        value={selectedGoalId || ''} 
                        onChange={(e) => viewGoal(parseInt(e.target.value))}
                        className="border rounded px-3 py-1 text-sm"
                      >
                        {goals.map((goal) => (
                          <option key={goal.id} value={goal.id}>
                            {goal.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {selectedGoal ? (
                  <SimpleGoalHierarchy
                    goal={selectedGoal}
                    onTaskComplete={handleTaskComplete}
                    onSubtaskComplete={handleSubtaskComplete}
                    onEdit={handleEdit}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Goal not found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}