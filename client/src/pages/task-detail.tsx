import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Flag,
  User,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Circle,
  ChevronRight,
  Home,
  Target,
  Briefcase
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { AuthGuard } from "@/components/AuthGuard";
import { formatDateForInput } from "@/lib/utils";

function TaskDetailContent() {
  const { goalId, projectId, taskId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch task details with hierarchical context
  const { data: task, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`],
    enabled: !!(goalId && projectId && taskId),
  });

  // Fetch subtasks for this task
  const { data: subtasks = [] } = useQuery({
    queryKey: [`/api/tasks/${taskId}/subtasks`],
    enabled: !!taskId,
  });

  // Fetch assigned user info
  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${task?.assignedTo}`],
    enabled: !!task?.assignedTo,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all users for assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/team/1"], // Using team 1 for now
    staleTime: 1000 * 60 * 5,
  });

  // Task update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/edit`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setEditingField(null);
      setEditValue("");
    },
  });

  // Subtask completion mutation
  const toggleSubtaskMutation = useMutation({
    mutationFn: async ({ subtaskId, completed }: { subtaskId: number; completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/subtasks/${subtaskId}/complete`, { completed });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/subtasks`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(currentValue || "");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = () => {
    if (!editingField) return;

    let value: any = editValue;
    
    // Type conversions based on field
    if (editingField === "estimatedHours") {
      value = editValue ? parseFloat(editValue) : null;
    } else if (editingField === "assignedTo") {
      value = editValue ? parseInt(editValue) : null;
    } else if (editingField === "deadline") {
      value = editValue ? new Date(editValue).toISOString() : null;
    }

    updateTaskMutation.mutate({ [editingField]: value });
  };

  const toggleSubtask = (subtaskId: number, completed: boolean) => {
    toggleSubtaskMutation.mutate({ subtaskId, completed: !completed });
  };

  // Task completion mutation
  const completeTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/complete`, { completed: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      alert('Task marked as complete!');
    },
    onError: (error) => {
      console.error('Failed to complete task:', error);
      alert('Failed to mark task as complete. Please try again.');
    },
  });

  // Breakdown mutation 
  const breakdownMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/breakdown`, {});
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Breakdown result:', data);
      if (data.breakdown && data.breakdown.length > 0) {
        alert(`AI breakdown completed! Generated ${data.breakdown.length} subtasks. Check console for details.`);
      } else {
        alert('AI breakdown completed, but no subtasks were generated.');
      }
    },
    onError: (error) => {
      console.error('Breakdown failed:', error);
      alert('Failed to break down task. Please try again.');
    },
  });

  const handleMarkComplete = () => {
    if (task && !task.completed) {
      completeTaskMutation.mutate();
    }
  };

  const handleBreakDownTask = () => {
    breakdownMutation.mutate();
  };

  const handleAddSubtask = () => {
    // For now, navigate to home page where they can add items
    // Later you can implement a direct subtask creation form
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Task not found</p>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Calculate completion percentage
  const completedSubtasks = subtasks.filter((s: any) => s.completed).length;
  const completionPercentage = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-gray-900 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {/* Mobile-optimized Breadcrumb */}
              <div className="flex items-center text-sm text-gray-500 min-w-0 overflow-hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-auto text-gray-500 hover:text-blue-600 shrink-0"
                  onClick={() => navigate("/dashboard")}
                >
                  <Home className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4 mx-1 shrink-0" />
                {task.goal && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto text-gray-500 hover:text-blue-600 flex items-center gap-1 min-w-0"
                      onClick={() => navigate(`/goal/${goalId}`)}
                    >
                      <Target className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate text-xs sm:text-sm max-w-[80px] sm:max-w-none">{task.goal.title}</span>
                    </Button>
                    <ChevronRight className="h-4 w-4 mx-1 shrink-0" />
                  </>
                )}
                {task.project && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto text-gray-500 hover:text-blue-600 flex items-center gap-1 min-w-0"
                      onClick={() => navigate(`/goal/${goalId}/project/${projectId}`)}
                    >
                      <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate text-xs sm:text-sm max-w-[80px] sm:max-w-none">{task.project.title}</span>
                    </Button>
                    <ChevronRight className="h-4 w-4 mx-1 shrink-0" />
                  </>
                )}
                <span className="font-medium text-gray-900 text-xs sm:text-sm truncate">Task Details</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Task Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Task Header */}
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  {/* Priority Badge at top */}
                  <div className="flex justify-start">
                    {editingField === "priority" ? (
                      <div className="flex items-center gap-2">
                        <Select value={editValue} onValueChange={setEditValue}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Badge 
                        className={`cursor-pointer hover:opacity-80 transition-opacity text-white font-semibold border-0 ${
                          task.priority === "urgent" ? "bg-red-500 hover:bg-red-600" :
                          task.priority === "high" ? "bg-orange-500 hover:bg-orange-600" :
                          task.priority === "medium" ? "bg-blue-500 hover:bg-blue-600" :
                          "bg-gray-500 hover:bg-gray-600"
                        }`}
                        onClick={() => startEditing("priority", task.priority)}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {
                          task.priority === "urgent" ? "🔴 URGENT" :
                          task.priority === "high" ? "🟠 HIGH" :
                          task.priority === "medium" ? "🔵 MEDIUM" :
                          "⚪ LOW"
                        } PRIORITY
                        <Edit2 className="h-3 w-3 ml-1" />
                      </Badge>
                    )}
                  </div>

                  {/* Task Title */}
                  <div className="w-full">
                    {editingField === "title" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-2xl font-bold"
                        />
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle 
                        className="text-xl sm:text-2xl font-bold cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEditing("title", task.title)}
                      >
                        {task.title}
                        <Edit2 className="h-4 w-4 ml-2 inline opacity-0 group-hover:opacity-100" />
                      </CardTitle>
                    )}
                  </div>
                  
                  {/* Task Description */}
                  <div className="w-full">
                    {editingField === "description" ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Add a description for this task..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <CardDescription 
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[60px] flex items-center w-full"
                        onClick={() => startEditing("description", task.description)}
                      >
                        {task.description || "Click to add a description..."}
                      </CardDescription>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {subtasks.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-500">
                        {completedSubtasks} of {subtasks.length} subtasks completed
                      </span>
                    </div>
                    <Progress value={completionPercentage} className="h-3" />
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Task Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Deadline */}
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Deadline</span>
                  </div>
                  {editingField === "deadline" ? (
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p 
                      className="text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border"
                      onClick={() => startEditing("deadline", formatDateForInput(task.deadline))}
                    >
                      {task.deadline ? 
                        format(new Date(task.deadline), "MMM dd, yyyy") : 
                        "No deadline set"
                      }
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Estimated Hours */}
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Estimated Hours</span>
                  </div>
                  {editingField === "estimatedHours" ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Hours"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p 
                      className="text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border"
                      onClick={() => startEditing("estimatedHours", task.estimatedHours)}
                    >
                      {task.estimatedHours ? `${task.estimatedHours} hours` : "Not estimated"}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Assigned User */}
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Assigned to</span>
                  </div>
                  {editingField === "assignedTo" ? (
                    <div className="space-y-2">
                      <Select value={editValue} onValueChange={setEditValue}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {allUsers.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.displayName || `${user.firstName} ${user.lastName}` || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded border"
                      onClick={() => startEditing("assignedTo", task.assignedTo?.toString() || "")}
                    >
                      {task.assignedTo ? (
                        <>
                          <UserAvatar userId={task.assignedTo} size="sm" />
                          <span className="text-sm">
                            {assignedUser ? 
                              assignedUser.displayName || `${assignedUser.firstName} ${assignedUser.lastName}` : 
                              `User ID: ${task.assignedTo}`
                            }
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Click to assign</span>
                      )}
                      <Edit2 className="h-3 w-3 ml-auto text-gray-400" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Subtasks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Circle className="h-5 w-5" />
                  Subtasks ({subtasks.length})
                </CardTitle>
                <CardDescription>Subtasks for this task</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subtasks.length > 0 ? (
                    subtasks.map((subtask: any) => (
                      <div 
                        key={subtask.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleSubtask(subtask.id, subtask.completed)}
                          >
                            {subtask.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'font-medium'}`}>
                              {subtask.title}
                            </p>
                            {subtask.description && (
                              <p className="text-xs text-gray-500 mt-1">{subtask.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {subtask.deadline && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(subtask.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No subtasks for this task yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={handleMarkComplete}
                  disabled={task?.completed || completeTaskMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {task?.completed ? "Completed" : completeTaskMutation.isPending ? "Marking..." : "Mark Complete"}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleBreakDownTask}
                  disabled={breakdownMutation.isPending}
                >
                  {breakdownMutation.isPending ? "Breaking Down..." : "Break Down Task"}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleAddSubtask}
                >
                  Add Subtask
                </Button>
              </CardContent>
            </Card>

            {/* Task Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Subtasks</span>
                  <Badge variant="secondary">{subtasks.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <Badge variant="secondary">{subtasks.filter((s: any) => s.completed).length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progress</span>
                  <Badge variant="secondary">{completionPercentage}%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <AuthGuard>
      <TaskDetailContent />
    </AuthGuard>
  );
}