import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Target, 
  FolderOpen, 
  CheckSquare, 
  ListTodo,
  Calendar,
  Clock,
  AlertTriangle,
  Edit3
} from "lucide-react";
import { GoalWithProjects } from "@shared/schema";

interface SimpleGoalHierarchyProps {
  goal: GoalWithProjects;
  onTaskComplete?: (taskId: number, completed: boolean) => void;
  onSubtaskComplete?: (subtaskId: number, completed: boolean) => void;
  onEdit?: (type: 'goal' | 'project' | 'task' | 'subtask', id: number) => void;
}

const urgencyColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-red-100 text-red-800"
};

export function SimpleGoalHierarchy({ 
  goal, 
  onTaskComplete, 
  onSubtaskComplete, 
  onEdit 
}: SimpleGoalHierarchyProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(
    new Set((goal.projects || []).map(p => p.id))
  );
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const toggleProject = (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTask = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getGoalProgress = () => {
    const allTasks = (goal.projects || []).flatMap(p => p.tasks || []);
    if (allTasks.length === 0) return 0;
    const completedTasks = allTasks.filter(t => t.completed).length;
    return Math.round((completedTasks / allTasks.length) * 100);
  };

  const getProjectProgress = (project: any) => {
    const tasks = project.tasks || [];
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter((t: any) => t.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getTaskProgress = (task: any) => {
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) return task.completed ? 100 : 0;
    const completedSubtasks = subtasks.filter((s: any) => s.completed).length;
    return Math.round((completedSubtasks / subtasks.length) * 100);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Goal Header */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <Target className="w-6 h-6 text-blue-600" />
              {goal.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {getGoalProgress()}% Complete
              </Badge>
              {onEdit && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onEdit('goal', goal.id)}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          
          {goal.description && (
            <p className="text-gray-600 mt-2">{goal.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {goal.estimatedDuration && (
              <Badge variant="outline" className="text-sm">
                <Clock className="w-3 h-3 mr-1" />
                {goal.estimatedDuration}
              </Badge>
            )}
            {goal.targetDate && (
              <Badge variant="outline" className="text-sm">
                <Calendar className="w-3 h-3 mr-1" />
                {goal.targetDate}
              </Badge>
            )}
            {goal.urgency && (
              <Badge className={`text-sm ${urgencyColors[goal.urgency] || urgencyColors.medium}`}>
                <AlertTriangle className="w-3 h-3 mr-1" />
                <span className="capitalize">{goal.urgency}</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-sm">
              {(goal.projects || []).length} projects
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Projects */}
      {(goal.projects || []).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No projects found for this goal</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goal.projects.map((project) => (
            <Card key={project.id} className="border border-gray-200">
              <Collapsible 
                open={expandedProjects.has(project.id)}
                onOpenChange={() => toggleProject(project.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedProjects.has(project.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <FolderOpen className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">{project.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getProjectProgress(project)}% Complete
                        </Badge>
                        {project.urgency && (
                          <Badge className={`text-xs ${urgencyColors[project.urgency] || urgencyColors.medium}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            <span className="capitalize">{project.urgency}</span>
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {project.tasks?.length || 0} tasks
                        </Badge>
                        {onEdit && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit('project', project.id);
                            }}
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1 ml-6">
                        {project.description}
                      </p>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3 ml-6">
                      {(project.tasks || []).map((task) => (
                        <Card key={task.id} className="bg-gray-50 border-gray-200">
                          <Collapsible 
                            open={expandedTasks.has(task.id)}
                            onOpenChange={() => toggleTask(task.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-gray-100 transition-colors py-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={task.completed}
                                      onCheckedChange={(checked) => onTaskComplete?.(task.id, !!checked)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    {expandedTasks.has(task.id) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <CheckSquare className="w-3 h-3 text-blue-600" />
                                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {getTaskProgress(task)}%
                                    </Badge>
                                    {task.estimatedHours && (
                                      <Badge variant="outline" className="text-xs">
                                        {task.estimatedHours}h
                                      </Badge>
                                    )}
                                    {task.urgency && (
                                      <Badge className={`text-xs ${urgencyColors[task.urgency] || urgencyColors.medium}`}>
                                        <AlertTriangle className="w-2 h-2 mr-1" />
                                        {task.urgency}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {task.subtasks?.length || 0} items
                                    </Badge>
                                    {onEdit && (
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEdit('task', task.id);
                                        }}
                                      >
                                        <Edit3 className="w-2 h-2" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-gray-600 mt-1 ml-7">
                                    {task.description}
                                  </p>
                                )}
                              </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <CardContent className="pt-0 pb-3">
                                <div className="space-y-2 ml-7">
                                  {(task.subtasks || []).map((subtask) => (
                                    <div key={subtask.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={subtask.completed}
                                          onCheckedChange={(checked) => onSubtaskComplete?.(subtask.id, !!checked)}
                                        />
                                        <ListTodo className="w-3 h-3 text-green-600" />
                                        <span className={`text-xs ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                                          {subtask.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {subtask.estimatedHours && (
                                          <Badge variant="outline" className="text-xs">
                                            {subtask.estimatedHours}h
                                          </Badge>
                                        )}
                                        {subtask.urgency && (
                                          <Badge className={`text-xs ${urgencyColors[subtask.urgency] || urgencyColors.medium}`}>
                                            {subtask.urgency}
                                          </Badge>
                                        )}
                                        {onEdit && (
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => onEdit('subtask', subtask.id)}
                                          >
                                            <Edit3 className="w-2 h-2" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}