import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Flag,
  User,
  CheckCircle2,
  Circle,
  ChevronRight,
  Home,
  Target,
  Briefcase,
  ListTodo,
  Edit2
} from "lucide-react";
import { format } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { AuthGuard } from "@/components/AuthGuard";
import { EditableField } from "@/components/EditableField";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function SubtaskDetailContent() {
  const { goalId, projectId, taskId, subtaskId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch subtask details with hierarchical context
  const { data: subtask, isLoading } = useQuery({
    queryKey: [`/api/subtasks/${subtaskId}`],
    enabled: !!subtaskId,
  });

  // Fetch parent task for context
  const { data: task } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects/${projectId}/tasks/${taskId}`],
    enabled: !!(goalId && projectId && taskId),
  });

  // Fetch assigned user info
  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${subtask?.assignedTo}`],
    enabled: !!subtask?.assignedTo,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all users for assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/team/1"], // Using team 1 for now
    staleTime: 1000 * 60 * 5,
  });

  // Subtask completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async ({ completed }: { completed: boolean }) => {
      const response = await apiRequest("PATCH", `/api/subtasks/${subtaskId}/complete`, { completed });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/subtasks/${subtaskId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/subtasks`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Subtask Updated",
        description: "Subtask completion status updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Failed to toggle subtask completion:', error);
      toast({
        title: "Error",
        description: "Failed to update subtask completion status.",
        variant: "destructive",
      });
    },
  });

  const handleToggleCompletion = () => {
    toggleCompletionMutation.mutate({ completed: !subtask?.completed });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!subtask) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Subtask Not Found</h1>
          <p className="text-gray-600 mb-8">The requested subtask could not be found.</p>
          <Button onClick={() => navigate("/dashboard")}>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => {
          if (goalId && projectId && taskId) {
            navigate(`/goal/${goalId}/project/${projectId}/task/${taskId}`);
          } else {
            navigate("/dashboard");
          }
        }}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Task
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <button
          onClick={() => navigate("/")}
          className="hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4" />
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate(`/goal/${goalId}`)}
          className="hover:text-blue-600 transition-colors"
        >
          <Target className="h-4 w-4 mr-1" />
          {task?.goalTitle || 'Goal'}
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate(`/goal/${goalId}/project/${projectId}`)}
          className="hover:text-blue-600 transition-colors"
        >
          <Briefcase className="h-4 w-4 mr-1" />
          {task?.projectTitle || 'Project'}
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate(`/goal/${goalId}/project/${projectId}/task/${taskId}`)}
          className="hover:text-blue-600 transition-colors"
        >
          <Flag className="h-4 w-4 mr-1" />
          {task?.title || 'Task'}
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">
          <ListTodo className="h-4 w-4 mr-1 inline" />
          {subtask.title}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subtask Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl mb-2">
                    <EditableField
                      type="subtasks"
                      id={subtask.id}
                      field="title"
                      value={subtask.title}
                      displayValue={subtask.title}
                      fieldType="text"
                      placeholder="Subtask title"
                    />
                  </CardTitle>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          subtask.priority === "high" ? "destructive" :
                          subtask.priority === "medium" ? "default" :
                          "secondary"
                        }
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {(subtask.priority || 'medium').charAt(0).toUpperCase() + (subtask.priority || 'medium').slice(1)} Priority
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={subtask.completed ? "default" : "outline"}>
                        {subtask.completed ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Circle className="h-3 w-3 mr-1" />
                        )}
                        {subtask.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <EditableField
                    type="subtasks"
                    id={subtask.id}
                    field="description"
                    value={subtask.description || ''}
                    displayValue={subtask.description || 'No description provided'}
                    fieldType="textarea"
                    placeholder="Add subtask description..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subtask Details */}
          <Card>
            <CardHeader>
              <CardTitle>Subtask Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Deadline
                  </h4>
                  <EditableField
                    type="subtasks"
                    id={subtask.id}
                    field="deadline"
                    value={subtask.deadline}
                    displayValue={subtask.deadline ? format(new Date(subtask.deadline), "PPP") : "No deadline set"}
                    fieldType="date"
                    placeholder="Set deadline"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Estimated Hours
                  </h4>
                  <EditableField
                    type="subtasks"
                    id={subtask.id}
                    field="estimatedHours"
                    value={subtask.estimatedHours}
                    displayValue={subtask.estimatedHours ? `${subtask.estimatedHours} hours` : "No estimate"}
                    fieldType="number"
                    placeholder="Enter hours estimate"
                  />
                </div>
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
                onClick={handleToggleCompletion}
                disabled={toggleCompletionMutation.isPending}
                variant={subtask.completed ? "outline" : "default"}
              >
                {subtask.completed ? (
                  <>
                    <Circle className="h-4 w-4 mr-2" />
                    Mark Incomplete
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Assigned To</h4>
                  {assignedUser ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={assignedUser} size="sm" />
                      <span className="text-sm font-medium">{assignedUser.displayName || assignedUser.email}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Not assigned</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subtask Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subtask Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={subtask.completed ? "default" : "outline"}>
                  {subtask.completed ? "Completed" : "In Progress"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Priority</span>
                <Badge variant={
                  subtask.priority === "high" ? "destructive" :
                  subtask.priority === "medium" ? "default" :
                  "secondary"
                }>
                  {(subtask.priority || 'medium').charAt(0).toUpperCase() + (subtask.priority || 'medium').slice(1)}
                </Badge>
              </div>
              {subtask.createdAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm">{format(new Date(subtask.createdAt), "MMM dd, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SubtaskDetailPage() {
  return (
    <AuthGuard>
      <SubtaskDetailContent />
    </AuthGuard>
  );
}