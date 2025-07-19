import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { UserAvatar } from "@/components/UserAvatar";
import { AuthGuard } from "@/components/AuthGuard";
import { EditableField } from "@/components/EditableField";

function GoalDetailContent() {
  const { goalId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Fetch goal details
  const { data: goal, isLoading } = useQuery({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });

  // Fetch projects for this goal
  const { data: projects = [] } = useQuery({
    queryKey: [`/api/goals/${goalId}/projects`],
    enabled: !!goalId,
  });

  // Fetch assigned user info
  const { data: assignedUser } = useQuery({
    queryKey: [`/api/users/${goal?.assignedTo}`],
    enabled: !!goal?.assignedTo,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all users for assignment dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/team/1"],
    staleTime: 1000 * 60 * 5,
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading goal details...</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Goal not found</p>
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
                <ArrowLeft className="h-4 w-4" />
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
                <Target className="h-4 w-4" />
                <span className="font-medium text-gray-900 ml-2">Goal Details</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Goal Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Goal Header */}
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
                          goal.priority === "urgent" ? "bg-red-500 hover:bg-red-600" :
                          goal.priority === "high" ? "bg-orange-500 hover:bg-orange-600" :
                          goal.priority === "medium" ? "bg-blue-500 hover:bg-blue-600" :
                          "bg-gray-500 hover:bg-gray-600"
                        }`}
                        onClick={() => startEditing("priority", goal.priority)}
                      >
                        <Flag className="h-3 w-3 mr-1" />
                        {
                          goal.priority === "urgent" ? "🔴 URGENT" :
                          goal.priority === "high" ? "🟠 HIGH" :
                          goal.priority === "medium" ? "🔵 MEDIUM" :
                          "⚪ LOW"
                        } PRIORITY
                        <Edit2 className="h-3 w-3 ml-1" />
                      </Badge>
                    )}
                  </div>

                  {/* Goal Title */}
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
                        onClick={() => startEditing("title", goal.title)}
                      >
                        {goal.title}
                        <Edit2 className="h-4 w-4 ml-2 inline opacity-0 group-hover:opacity-100" />
                      </CardTitle>
                    )}
                  </div>
                  
                  {/* Goal Description */}
                  <div className="w-full">
                    {editingField === "description" ? (
                      <div>
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Add a description for this goal..."
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
                        onClick={() => startEditing("description", goal.description)}
                      >
                        {goal.description || "Click to add a description..."}
                      </CardDescription>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {projects.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm text-gray-500">
                        {goal.percentComplete || 0}% completed
                      </span>
                    </div>
                    <Progress value={goal.percentComplete || 0} className="h-3" />
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Goal Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Deadline */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Deadline</span>
                  </div>
                  <EditableField
                    type="goals"
                    id={Number(goalId)}
                    field="deadline"
                    value={goal.deadline}
                    displayValue={goal.deadline ? format(new Date(goal.deadline.split('T')[0] + 'T12:00:00'), "MMM dd, yyyy") : "No deadline set"}
                    fieldType="date"
                    placeholder="Set deadline"
                  />
                </CardContent>
              </Card>

              {/* Estimated Hours */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Estimated Hours</span>
                  </div>
                  <EditableField
                    type="goals"
                    id={Number(goalId)}
                    field="estimatedHours"
                    value={goal.estimatedHours}
                    displayValue={goal.estimatedHours ? `${goal.estimatedHours} hours` : "Not estimated"}
                    fieldType="number"
                    placeholder="Hours"
                  />
                </CardContent>
              </Card>

              {/* Assigned User */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Assigned to</span>
                  </div>
                  <EditableField
                    type="goals"
                    id={Number(goalId)}
                    field="assignedTo"
                    value={goal.assignedTo?.toString() || ""}
                    displayValue={goal.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <UserAvatar userId={goal.assignedTo} size="sm" />
                        <span className="text-sm">
                          {assignedUser ? 
                            assignedUser.displayName || `${assignedUser.firstName} ${assignedUser.lastName}` : 
                            `User ID: ${goal.assignedTo}`
                          }
                        </span>
                      </div>
                    ) : "Click to assign"}
                    fieldType="select"
                    options={["", ...allUsers.map((user: any) => user.id.toString())]}
                    placeholder="Select user"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Projects List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Projects ({projects.length})
                </CardTitle>
                <CardDescription>Projects within this goal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projects.length > 0 ? (
                    projects.map((project: any) => (
                      <div 
                        key={project.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/goal/${goal.id}/project/${project.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-2 h-2 rounded-full ${
                            project.priority === "urgent" ? "bg-red-500" :
                            project.priority === "high" ? "bg-orange-500" :
                            project.priority === "medium" ? "bg-blue-500" :
                            "bg-gray-400"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{project.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {project.estimatedHours && <span>{project.estimatedHours}h</span>}
                              {project.deadline && (
                                <span>• Due: {new Date(project.deadline).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{project.percentComplete || 0}%</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No projects in this goal yet.
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
                  Add New Project
                </Button>
                <Button variant="outline" className="w-full">
                  Break Down Goal
                </Button>
                <Button variant="outline" className="w-full">
                  Share Goal
                </Button>
              </CardContent>
            </Card>

            {/* Goal Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Goal Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Projects</span>
                  <Badge variant="secondary">{projects.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <Badge variant="secondary">{projects.filter((p: any) => p.completed).length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progress</span>
                  <Badge variant="secondary">{goal.percentComplete || 0}%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  return (
    <AuthGuard>
      <GoalDetailContent />
    </AuthGuard>
  );
}