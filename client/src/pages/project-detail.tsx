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
  Briefcase,
  ClipboardList
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { AuthGuard } from "@/components/AuthGuard";

function ProjectDetailContent() {
  const { goalId, projectId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Fetch project details with hierarchical context
  const { data: project, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects/${projectId}`],
    enabled: !!(goalId && projectId),
  });

  // Fetch tasks for this project
  const { data: tasks = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/tasks`],
    enabled: !!projectId,
  });

  // Fetch assigned user info
  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${project?.assignedTo}`],
    enabled: !!project?.assignedTo,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all users for assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/team/1"],
    staleTime: 1000 * 60 * 5,
  });

  // Project update mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest("PATCH", `/api/projects/${projectId}/edit`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}/projects/${projectId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setEditingField(null);
      setEditValue("");
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

    updateProjectMutation.mutate({ [editingField]: value });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Project not found</p>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-0 h-auto text-gray-500 hover:text-blue-600"
                  onClick={() => navigate("/dashboard")}
                >
                  <Home className="h-4 w-4" />
                </Button>
                <ChevronRight className="h-4 w-4 mx-2" />
                {project.goal && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="p-0 h-auto text-gray-500 hover:text-blue-600 flex items-center gap-1"
                      onClick={() => navigate(`/goal/${goalId}`)}
                    >
                      <Target className="h-4 w-4" />
                      <span>{project.goal.title}</span>
                    </Button>
                    <ChevronRight className="h-4 w-4 mx-2" />
                  </>
                )}
                <Briefcase className="h-4 w-4" />
                <span className="font-medium text-gray-900 ml-2">Project Details</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Header */}
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
                          project.priority === "urgent" ? "bg-red-500 hover:bg-red-600" :
                          project.priority === "high" ? "bg-orange-500 hover:bg-orange-600" :
                          project.priority === "medium" ? "bg-blue-500 hover:bg-blue-600" :
                          "bg-gray-500 hover:bg-gray-600"
                        }`}
                        onClick={() => startEditing("priority", project.priority)}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {
                          project.priority === "urgent" ? "🔴 URGENT" :
                          project.priority === "high" ? "🟠 HIGH" :
                          project.priority === "medium" ? "🔵 MEDIUM" :
                          "⚪ LOW"
                        } PRIORITY
                        <Edit2 className="h-3 w-3 ml-1" />
                      </Badge>
                    )}
                  </div>

                  {/* Project Title */}
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
                        className="text-2xl font-bold cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                        onClick={() => startEditing("title", project.title)}
                      >
                        {project.title}
                        <Edit2 className="h-4 w-4 ml-2 inline opacity-0 group-hover:opacity-100" />
                      </CardTitle>
                    )}
                  </div>
                  
                  {/* Project Description */}
                  <div className="w-full">
                    {editingField === "description" ? (
                      <div>
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Add a description for this project..."
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
                        className="cursor-pointer hover:bg-gray-50 p-2 rounded min-h-[60px] flex items-center"
                        onClick={() => startEditing("description", project.description)}
                      >
                        {project.description || "Click to add a description..."}
                      </CardDescription>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {tasks.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-500">
                        {project.percentComplete || 0}% completed
                      </span>
                    </div>
                    <Progress value={project.percentComplete || 0} className="h-3" />
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Project Details Grid */}
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
                      onClick={() => startEditing("deadline", project.deadline ? project.deadline.split('T')[0] : "")}
                    >
                      {project.deadline ? 
                        format(new Date(project.deadline), "MMM dd, yyyy") : 
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
                      onClick={() => startEditing("estimatedHours", project.estimatedHours)}
                    >
                      {project.estimatedHours ? `${project.estimatedHours} hours` : "Not estimated"}
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
                      onClick={() => startEditing("assignedTo", project.assignedTo?.toString() || "")}
                    >
                      {project.assignedTo ? (
                        <>
                          <UserAvatar userId={project.assignedTo} size="sm" />
                          <span className="text-sm">
                            {assignedUser ? 
                              assignedUser.displayName || `${assignedUser.firstName} ${assignedUser.lastName}` : 
                              `User ID: ${project.assignedTo}`
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

            {/* Tasks List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Tasks ({tasks.length})
                </CardTitle>
                <CardDescription>Tasks within this project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.length > 0 ? (
                    tasks.map((task: any) => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/goal/${goalId}/project/${projectId}/task/${task.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full ${
                            task.priority === "urgent" ? "bg-red-500" :
                            task.priority === "high" ? "bg-orange-500" :
                            task.priority === "medium" ? "bg-blue-500" :
                            "bg-gray-400"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{task.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {task.estimatedHours && <span>{task.estimatedHours}h</span>}
                              {task.deadline && (
                                <span>• Due: {new Date(task.deadline).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{task.percentComplete || 0}%</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No tasks in this project yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => navigate("/")}>
                  Add New Task
                </Button>
                <Button variant="outline" className="w-full">
                  Break Down Project
                </Button>
                <Button variant="outline" className="w-full">
                  Share Project
                </Button>
              </CardContent>
            </Card>

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Tasks</span>
                  <Badge variant="secondary">{tasks.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <Badge variant="secondary">{tasks.filter((t: any) => t.completed).length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progress</span>
                  <Badge variant="secondary">{project.percentComplete || 0}%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <AuthGuard>
      <ProjectDetailContent />
    </AuthGuard>
  );
}