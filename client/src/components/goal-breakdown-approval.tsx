import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  ChevronRight, 
  Target, 
  FolderOpen, 
  CheckSquare, 
  ListTodo,
  Calendar,
  Clock,
  AlertTriangle
} from "lucide-react";
import { AIBreakdown } from "@shared/schema";

interface GoalBreakdownApprovalProps {
  breakdown: AIBreakdown;
  pendingId: number;
  onApprove: (pendingId: number) => void;
  onReject: (pendingId: number) => void;
  isLoading: boolean;
}

const urgencyColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-red-100 text-red-800"
};

const urgencyIcons = {
  low: <Clock className="w-3 h-3" />,
  medium: <AlertTriangle className="w-3 h-3" />,
  high: <AlertTriangle className="w-3 h-3" />
};

export function GoalBreakdownApproval({ 
  breakdown, 
  pendingId, 
  onApprove, 
  onReject, 
  isLoading 
}: GoalBreakdownApprovalProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set([0]));
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleProject = (index: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleTask = (projectIndex: number, taskIndex: number) => {
    const key = `${projectIndex}-${taskIndex}`;
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTasks(newExpanded);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Goal Overview */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-blue-600" />
            {breakdown.goal.title}
          </CardTitle>
          {breakdown.goal.description && (
            <p className="text-gray-600">{breakdown.goal.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {breakdown.goal.estimatedDuration && (
              <Badge variant="outline" className="text-sm">
                <Clock className="w-3 h-3 mr-1" />
                {breakdown.goal.estimatedDuration}
              </Badge>
            )}
            {breakdown.goal.targetDate && (
              <Badge variant="outline" className="text-sm">
                <Calendar className="w-3 h-3 mr-1" />
                {breakdown.goal.targetDate}
              </Badge>
            )}
            {breakdown.goal.urgency && (
              <Badge className={`text-sm ${urgencyColors[breakdown.goal.urgency]}`}>
                {urgencyIcons[breakdown.goal.urgency]}
                <span className="ml-1 capitalize">{breakdown.goal.urgency}</span>
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Projects Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Project Breakdown ({breakdown.projects.length} projects)
        </h3>
        
        {breakdown.projects.map((project, projectIndex) => (
          <Card key={projectIndex} className="border border-gray-200">
            <Collapsible 
              open={expandedProjects.has(projectIndex)}
              onOpenChange={() => toggleProject(projectIndex)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedProjects.has(projectIndex) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <FolderOpen className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">{project.title}</span>
                    </div>
                    <div className="flex gap-2">
                      {project.urgency && (
                        <Badge className={`text-xs ${urgencyColors[project.urgency]}`}>
                          {urgencyIcons[project.urgency]}
                          <span className="ml-1 capitalize">{project.urgency}</span>
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {project.tasks.length} tasks
                      </Badge>
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
                    {project.tasks.map((task, taskIndex) => (
                      <Card key={taskIndex} className="border border-gray-100">
                        <Collapsible
                          open={expandedTasks.has(`${projectIndex}-${taskIndex}`)}
                          onOpenChange={() => toggleTask(projectIndex, taskIndex)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {expandedTasks.has(`${projectIndex}-${taskIndex}`) ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3" />
                                  )}
                                  <CheckSquare className="w-3 h-3 text-blue-600" />
                                  <span className="text-sm font-medium">{task.title}</span>
                                </div>
                                <div className="flex gap-1">
                                  {task.estimatedHours && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.estimatedHours}h
                                    </Badge>
                                  )}
                                  {task.urgency && (
                                    <Badge className={`text-xs ${urgencyColors[task.urgency]}`}>
                                      {urgencyIcons[task.urgency]}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {task.subtasks.length} subtasks
                                  </Badge>
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
                                {task.subtasks.map((subtask, subtaskIndex) => (
                                  <div 
                                    key={subtaskIndex} 
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                                  >
                                    <div className="flex items-center gap-2">
                                      <ListTodo className="w-3 h-3 text-green-600" />
                                      <span className="text-xs font-medium">{subtask.title}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      {subtask.estimatedHours && (
                                        <Badge variant="outline" className="text-xs">
                                          {subtask.estimatedHours}h
                                        </Badge>
                                      )}
                                      {subtask.urgency && (
                                        <Badge className={`text-xs ${urgencyColors[subtask.urgency]}`}>
                                          {urgencyIcons[subtask.urgency]}
                                        </Badge>
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

      {/* Approval Actions */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Ready to create your goal?</h3>
            <p className="text-gray-600">
              Review the breakdown above. You can approve to create all items, or reject to start over.
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => onReject(pendingId)}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <XCircle className="w-4 h-4" />
                Reject & Start Over
              </Button>
              
              <Button 
                onClick={() => onApprove(pendingId)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Create Goal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}