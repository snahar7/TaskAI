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

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch task details
  const { data: task, isLoading } = useQuery({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
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

  // Task update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setEditingField(null);
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
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              {/* Breadcrumb */}
              <div className="flex items-center text-sm text-gray-500">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 mx-2" />
                {task.goal && (
                  <>
                    <Target className="h-4 w-4" />
                    <span className="mx-2">{task.goal.title}</span>
                    <ChevronRight className="h-4 w-4 mx-2" />
                  </>
                )}
                {task.project && (
                  <>
                    <Briefcase className="h-4 w-4" />
                    <span className="mx-2">{task.project.title}</span>
                    <ChevronRight className="h-4 w-4 mx-2" />
                  </>
                )}
                <span className="font-medium text-gray-900">Task Details</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Task Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                        className="text-2xl font-bold cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEditing("title", task.title)}
                      >
                        {task.title}
                        <Edit2 className="h-4 w-4 ml-2 inline opacity-0 group-hover:opacity-100" />
                      </CardTitle>
                    )}
                    
                    {editingField === "description" ? (
                      <div className="mt-4">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Add a description for this task..."
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
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
                        className="mt-2 cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[60px] flex items-center"
                        onClick={() => startEditing("description", task.description)}
                      >
                        {task.description || "Click to add a description..."}
                      </CardDescription>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <div className="ml-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Deadline */}
              <Card>
                <CardContent className="p-4">
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
                      onClick={() => startEditing("deadline", task.deadline ? task.deadline.split('T')[0] : "")}
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
                <CardContent className="p-4">
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
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Assigned to</span>
                  </div>
                  <div className="flex items-center gap-2">
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
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subtasks */}
            {subtasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subtasks</CardTitle>
                  <CardDescription>
                    Break down this task into smaller, manageable pieces
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subtasks.map((subtask: any) => (
                    <div 
                      key={subtask.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-0 h-6 w-6"
                        onClick={() => toggleSubtask(subtask.id, subtask.completed)}
                      >
                        {subtask.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          subtask.completed ? "line-through text-gray-500" : "text-gray-900"
                        }`}>
                          {subtask.title}
                        </p>
                        {subtask.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {subtask.description}
                          </p>
                        )}
                      </div>

                      {subtask.deadline && (
                        <div className="text-xs text-gray-500">
                          {format(new Date(subtask.deadline), "MMM dd")}
                        </div>
                      )}

                      {subtask.estimatedHours && (
                        <div className="text-xs text-gray-500">
                          {subtask.estimatedHours}h
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completion</span>
                    <span className="text-sm text-gray-500">{completionPercentage}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Subtasks</span>
                    <span className="text-sm text-gray-500">
                      {completedSubtasks}/{subtasks.length}
                    </span>
                  </div>

                  {task.createdAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Created</span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(task.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/database?highlight=${taskId}`)}
                >
                  View in Database
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}