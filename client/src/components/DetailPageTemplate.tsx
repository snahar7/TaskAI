import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Edit2,
  Zap,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { EditableField } from "@/components/EditableField";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface DetailPageConfig {
  type: 'goals' | 'projects' | 'tasks' | 'subtasks';
  icon: React.ComponentType<{ className?: string }>;
  displayName: string;
  parentType?: 'goals' | 'projects' | 'tasks';
  parentIcon?: React.ComponentType<{ className?: string }>;
  childType?: 'projects' | 'tasks' | 'subtasks';
  childIcon?: React.ComponentType<{ className?: string }>;
}

interface DetailPageTemplateProps {
  config: DetailPageConfig;
  itemId: string;
  parentIds?: {
    goalId?: string;
    projectId?: string;
    taskId?: string;
  };
  data: any;
  children?: any[];
  isLoading: boolean;
  onComplete?: () => void;
  onBreakDown?: () => void;
  onAddChild?: () => void;
  breadcrumbPath?: Array<{
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export function DetailPageTemplate({
  config,
  itemId,
  parentIds = {},
  data,
  children = [],
  isLoading,
  onComplete,
  onBreakDown,
  onAddChild,
  breadcrumbPath = []
}: DetailPageTemplateProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [breakdownDialog, setBreakdownDialog] = useState<{
    isOpen: boolean;
    breakdown: any;
  }>({ isOpen: false, breakdown: null });

  // Fetch assigned user info
  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${data?.assignedTo}`],
    enabled: !!data?.assignedTo,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all users for assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/team/1"],
    staleTime: 1000 * 60 * 5,
  });

  // Child completion mutation (for tasks/subtasks)
  const toggleChildMutation = useMutation({
    mutationFn: async ({ childId, completed }: { childId: number; completed: boolean }) => {
      const childType = config.childType === 'subtasks' ? 'subtasks' : config.childType;
      const response = await apiRequest("PATCH", `/api/${childType}/${childId}/complete`, { completed });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${config.type}/${itemId}`] });
      if (config.childType) {
        queryClient.invalidateQueries({ queryKey: [`/api/${config.type}/${itemId}/${config.childType}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });

  // Item completion mutation
  const completeItemMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/${config.type}/${itemId}/complete`, { completed: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${config.type}/${itemId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: `${config.displayName} Completed`,
        description: `${config.displayName} has been marked as complete.`,
      });
      if (onComplete) onComplete();
    },
    onError: (error) => {
      console.error(`Failed to complete ${config.type}:`, error);
      toast({
        title: "Error",
        description: `Failed to mark ${config.displayName.toLowerCase()} as complete.`,
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = () => {
    completeItemMutation.mutate();
  };

  const toggleChild = (childId: number, completed: boolean) => {
    toggleChildMutation.mutate({ childId, completed: !completed });
  };

  const handleBreakDown = () => {
    if (onBreakDown) onBreakDown();
  };

  const handleAddChild = () => {
    if (onAddChild) onAddChild();
  };

  const getBackPath = () => {
    if (config.parentType && parentIds.goalId) {
      if (config.parentType === 'projects' && parentIds.projectId) {
        return `/goal/${parentIds.goalId}/project/${parentIds.projectId}`;
      } else if (config.parentType === 'tasks' && parentIds.projectId && parentIds.taskId) {
        return `/goal/${parentIds.goalId}/project/${parentIds.projectId}/task/${parentIds.taskId}`;
      } else if (config.parentType === 'goals') {
        return `/goal/${parentIds.goalId}`;
      }
    }
    return "/dashboard";
  };

  const getChildPath = (childId: number) => {
    const baseUrl = `/goal/${parentIds.goalId || data?.goalId}`;
    
    if (config.childType === 'projects') {
      return `${baseUrl}/project/${childId}`;
    } else if (config.childType === 'tasks') {
      return `${baseUrl}/project/${parentIds.projectId || data?.projectId}/task/${childId}`;
    } else if (config.childType === 'subtasks') {
      return `${baseUrl}/project/${parentIds.projectId || data?.projectId}/task/${parentIds.taskId || data?.taskId}/subtask/${childId}`;
    }
    return "#";
  };

  const completionPercentage = data?.percentComplete || 0;
  const completedChildren = children.filter((child: any) => child.completed).length;

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

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{config.displayName} Not Found</h1>
          <p className="text-gray-600 mb-8">The requested {config.displayName.toLowerCase()} could not be found.</p>
          <Button onClick={() => navigate("/dashboard")}>
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = config.icon;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => navigate(getBackPath())}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <button
          onClick={() => navigate("/")}
          className="hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4" />
        </button>
        {breadcrumbPath.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => navigate(crumb.path)}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <crumb.icon className="h-4 w-4" />
              {crumb.label}
            </button>
          </div>
        ))}
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium flex items-center gap-1">
          <IconComponent className="h-4 w-4" />
          {data.title}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Priority Badge */}
                  {data.priority && (
                    <div className="mb-3">
                      <Badge 
                        variant={
                          data.priority === "high" || data.priority === "urgent" ? "destructive" :
                          data.priority === "medium" ? "default" :
                          "secondary"
                        }
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {data.priority.charAt(0).toUpperCase() + data.priority.slice(1)} Priority
                      </Badge>
                    </div>
                  )}
                  
                  {/* Title and Status */}
                  <CardTitle className="text-2xl mb-2">
                    <EditableField
                      type={config.type}
                      id={data.id}
                      field="title"
                      value={data.title}
                      displayValue={data.title}
                      fieldType="text"
                      placeholder={`${config.displayName} title`}
                    />
                  </CardTitle>
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={data.completed ? "default" : "outline"}>
                        {data.completed ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Circle className="h-3 w-3 mr-1" />
                        )}
                        {data.completed ? "Completed" : "In Progress"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Progress</h3>
                    <span className="text-sm text-gray-600">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="w-full" />
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <EditableField
                    type={config.type}
                    id={data.id}
                    field="description"
                    value={data.description || ''}
                    displayValue={data.description || 'No description provided'}
                    fieldType="textarea"
                    placeholder={`Add ${config.displayName.toLowerCase()} description...`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Item Details */}
          <Card>
            <CardHeader>
              <CardTitle>{config.displayName} Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.deadline && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Deadline
                    </h4>
                    <EditableField
                      type={config.type}
                      id={data.id}
                      field="deadline"
                      value={data.deadline}
                      displayValue={data.deadline ? format(new Date(data.deadline), "PPP") : "No deadline set"}
                      fieldType="date"
                      placeholder="Set deadline"
                    />
                  </div>
                )}
                {data.estimatedHours !== undefined && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Estimated Hours
                    </h4>
                    <EditableField
                      type={config.type}
                      id={data.id}
                      field="estimatedHours"
                      value={data.estimatedHours}
                      displayValue={data.estimatedHours ? `${data.estimatedHours} hours` : "No estimate"}
                      fieldType="number"
                      placeholder="Enter hours estimate"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Children List */}
          {config.childType && children.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {config.childIcon && <config.childIcon className="h-5 w-5" />}
                  {config.childType.charAt(0).toUpperCase() + config.childType.slice(1)} ({children.length})
                </CardTitle>
                <CardDescription>{config.childType} for this {config.displayName.toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {children.map((child: any) => (
                    <div 
                      key={child.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(getChildPath(child.id))}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleChild(child.id, child.completed);
                          }}
                        >
                          {child.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${child.completed ? 'line-through text-gray-500' : 'font-medium'}`}>
                            {child.title}
                          </p>
                          {child.description && (
                            <p className="text-xs text-gray-500 mt-1">{child.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.deadline && (
                          <span className="text-xs text-gray-500">
                            Due: {new Date(child.deadline).toLocaleDateString()}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
                disabled={data?.completed || completeItemMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {data?.completed ? "Completed" : completeItemMutation.isPending ? "Marking..." : "Mark Complete"}
              </Button>
              {onBreakDown && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleBreakDown}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Break Down {config.displayName}
                </Button>
              )}
              {onAddChild && config.childType && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleAddChild}
                >
                  Add {config.childType.slice(0, -1).charAt(0).toUpperCase() + config.childType.slice(0, -1).slice(1)}
                </Button>
              )}
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

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{config.displayName} Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.childType && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total {config.childType}</span>
                    <Badge variant="secondary">{children.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <Badge variant="secondary">{completedChildren}</Badge>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress</span>
                <Badge variant="secondary">{completionPercentage}%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={data.completed ? "default" : "outline"}>
                  {data.completed ? "Completed" : "In Progress"}
                </Badge>
              </div>
              {data.createdAt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Created</span>
                  <span className="text-sm">{format(new Date(data.createdAt), "MMM dd, yyyy")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}