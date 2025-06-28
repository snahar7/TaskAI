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
  Edit3,
  Paperclip
} from "lucide-react";
import { GoalWithProjects } from "@shared/schema";

interface GoalHierarchyDisplayProps {
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

const urgencyIcons: Record<string, React.ReactElement> = {
  low: <Clock className="w-3 h-3" />,
  medium: <AlertTriangle className="w-3 h-3" />,
  high: <AlertTriangle className="w-3 h-3" />
};

export function GoalHierarchyDisplay({ 
  goal, 
  onTaskComplete, 
  onSubtaskComplete, 
  onEdit 
}: GoalHierarchyDisplayProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set(goal.projects?.[0]?.id ? [goal.projects[0].id] : []));
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

  const calculateProgress = (items: Array<{ completed: boolean }>) => {
    if (items.length === 0) return 0;
    const completed = items.filter(item => item.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const getProjectProgress = (project: any) => {
    const allTasks = project.tasks || [];
    return calculateProgress(allTasks);
  };

  const getTaskProgress = (task: any) => {
    const allSubtasks = task.subtasks || [];
    return calculateProgress(allSubtasks);
  };

  const getGoalProgress = () => {
    const allTasks = (goal.projects || []).flatMap(p => p.tasks || []);
    return calculateProgress(allTasks);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Goal Header */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="w-5 h-5 text-blue-600" />
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
                {urgencyIcons[goal.urgency] || urgencyIcons.medium}
                <span className="ml-1 capitalize">{goal.urgency}</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-sm">
              {(goal.projects || []).length} projects
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Projects */}
      <div className="space-y-4">
        {(goal.projects || []).map((project) => (
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
                          {urgencyIcons[project.urgency] || urgencyIcons.medium}
                          <span className="ml-1 capitalize">{project.urgency}</span>
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
                    {project.tasks?.map((task) => (
                      <Card key={task.id} className="border border-gray-100">
                        <Collapsible
                          open={expandedTasks.has(task.id)}
                          onOpenChange={() => toggleTask(task.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={task.completed}
                                    onCheckedChange={(checked) => {
                                      if (onTaskComplete) {
                                        onTaskComplete(task.id, !!checked);
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
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
                                  {task.dueDate && (
                                    <Badge variant="outline" className="text-xs">
                                      <Calendar className="w-2 h-2 mr-1" />
                                      {task.dueDate}
                                    </Badge>
                                  )}
                                  {task.urgency && (
                                    <Badge className={`text-xs ${urgencyColors[task.urgency] || urgencyColors.medium}`}>
                                      {urgencyIcons[task.urgency] || urgencyIcons.medium}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {task.subtasks?.length || 0} subtasks
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
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-600 mt-1 ml-5">
                                  {task.description}
                                </p>
                              )}
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="py-2">
                              <div className="space-y-2 ml-5">
                                {task.subtasks?.map((subtask) => (
                                  <div 
                                    key={subtask.id} 
                                    className={`flex items-center justify-between p-3 bg-gray-50 rounded border transition-opacity ${subtask.completed ? 'opacity-75' : ''}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={subtask.completed}
                                        onCheckedChange={(checked) => {
                                          if (onSubtaskComplete) {
                                            onSubtaskComplete(subtask.id, !!checked);
                                          }
                                        }}
                                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                      />
                                      <ListTodo className="w-3 h-3 text-green-600" />
                                      <span className={`text-xs font-medium ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                                        {subtask.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {subtask.estimatedHours && (
                                        <Badge variant="outline" className="text-xs">
                                          {subtask.estimatedHours}h
                                        </Badge>
                                      )}
                                      {subtask.dueDate && (
                                        <Badge variant="outline" className="text-xs">
                                          <Calendar className="w-2 h-2 mr-1" />
                                          {subtask.dueDate}
                                        </Badge>
                                      )}
                                      {subtask.urgency && (
                                        <Badge className={`text-xs ${urgencyColors[subtask.urgency] || urgencyColors.medium}`}>
                                          {urgencyIcons[subtask.urgency] || urgencyIcons.medium}
                                        </Badge>
                                      )}
                                      {subtask.attachments && (
                                        <Badge variant="outline" className="text-xs">
                                          <Paperclip className="w-2 h-2 mr-1" />
                                          Files
                                        </Badge>
                                      )}
                                      {onEdit && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => onEdit('subtask', subtask.id)}
                                        >
                                          <Edit3 className="w-3 h-3" />
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
    </div>
  );
}