import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Target, 
  FolderOpen, 
  CheckSquare, 
  ListTodo, 
  ChevronRight, 
  ChevronDown,
  Calendar,
  Clock,
  Edit2,
  Save,
  X
} from "lucide-react";
import { AIBreakdown } from "@shared/schema";

interface EditableBreakdownApprovalProps {
  breakdown: AIBreakdown;
  pendingId: number;
  onApprove: (pendingId: number, editedBreakdown: AIBreakdown) => void;
  onReject: (pendingId: number) => void;
  isLoading: boolean;
}

export function EditableBreakdownApproval({ 
  breakdown, 
  pendingId, 
  onApprove, 
  onReject, 
  isLoading 
}: EditableBreakdownApprovalProps) {
  const [editedBreakdown, setEditedBreakdown] = useState<AIBreakdown>(breakdown);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set([0]));
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set());

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
    const taskKey = `${projectIndex}-${taskIndex}`;
    const taskKeyNum = parseInt(taskKey.replace('-', ''));
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskKeyNum)) {
      newExpanded.delete(taskKeyNum);
    } else {
      newExpanded.add(taskKeyNum);
    }
    setExpandedTasks(newExpanded);
  };

  const startEditing = (itemId: string) => {
    setEditingItems(prev => new Set([...Array.from(prev), itemId]));
  };

  const stopEditing = (itemId: string) => {
    setEditingItems(prev => {
      const newSet = new Set(Array.from(prev).filter(id => id !== itemId));
      return newSet;
    });
  };

  // Helper function to add business days (excluding weekends)
  const addBusinessDays = (startDate: Date, days: number): Date => {
    let result = new Date(startDate);
    let daysAdded = 0;
    
    while (daysAdded < days) {
      result.setDate(result.getDate() + 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        daysAdded++;
      }
    }
    return result;
  };

  // Recalculate deadlines up the hierarchy when days are edited
  const recalculateHierarchyDeadlines = (projectIndex: number, taskIndex?: number) => {
    const updatedBreakdown = { ...editedBreakdown };
    let currentDate = new Date(updatedBreakdown.goal.startDate || new Date());

    // Recalculate all projects from the beginning
    updatedBreakdown.projects.forEach((project, pIndex) => {
      let projectStartDate = new Date(currentDate);
      
      // Process tasks within project
      project.tasks?.forEach((task, tIndex) => {
        task.startDate = new Date(currentDate).toISOString().split('T')[0];
        
        // Process subtasks within task
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            subtask.startDate = new Date(currentDate).toISOString().split('T')[0];
            
            // Calculate subtask deadline
            const subtaskDays = subtask.estimatedDays || 1;
            const subtaskEndDate = addBusinessDays(currentDate, subtaskDays);
            subtask.dueDate = subtaskEndDate.toISOString().split('T')[0];
            
            // Move current date forward
            currentDate = new Date(subtaskEndDate);
          });
          
          // Task ends when all subtasks are complete
          task.dueDate = new Date(currentDate).toISOString().split('T')[0];
        } else {
          // Task without subtasks
          const taskDays = task.estimatedDays || 1;
          const taskEndDate = addBusinessDays(currentDate, taskDays);
          task.dueDate = taskEndDate.toISOString().split('T')[0];
          currentDate = new Date(taskEndDate);
        }
      });
      
      // Project ends when all tasks are complete
      project.dueDate = new Date(currentDate).toISOString().split('T')[0];
    });

    // Goal ends when all projects are complete
    updatedBreakdown.goal.dueDate = new Date(currentDate).toISOString().split('T')[0];
    
    setEditedBreakdown(updatedBreakdown);
  };

  const updateGoal = (field: string, value: string) => {
    setEditedBreakdown(prev => ({
      ...prev,
      goal: { ...prev.goal, [field]: value }
    }));
  };

  const updateProject = (projectIndex: number, field: string, value: string) => {
    setEditedBreakdown(prev => ({
      ...prev,
      projects: prev.projects.map((project, index) => 
        index === projectIndex ? { ...project, [field]: value } : project
      )
    }));
  };

  const updateTask = (projectIndex: number, taskIndex: number, field: string, value: string) => {
    setEditedBreakdown(prev => ({
      ...prev,
      projects: prev.projects.map((project, pIndex) => 
        pIndex === projectIndex ? {
          ...project,
          tasks: project.tasks.map((task, tIndex) => 
            tIndex === taskIndex ? { ...task, [field]: value } : task
          )
        } : project
      )
    }));
  };

  const updateSubtask = (projectIndex: number, taskIndex: number, subtaskIndex: number, field: string, value: string) => {
    setEditedBreakdown(prev => ({
      ...prev,
      projects: prev.projects.map((project, pIndex) => 
        pIndex === projectIndex ? {
          ...project,
          tasks: project.tasks.map((task, tIndex) => 
            tIndex === taskIndex ? {
              ...task,
              subtasks: task.subtasks.map((subtask, sIndex) => 
                sIndex === subtaskIndex ? { ...subtask, [field]: value } : subtask
              )
            } : task
          )
        } : project
      )
    }));
  };

  // Update task days and recalculate hierarchy deadlines
  const updateTaskDays = (projectIndex: number, taskIndex: number, value: string) => {
    const days = parseInt(value) || 1;
    setEditedBreakdown(prev => ({
      ...prev,
      projects: prev.projects.map((project, pIndex) => 
        pIndex === projectIndex ? {
          ...project,
          tasks: project.tasks.map((task, tIndex) => 
            tIndex === taskIndex ? { ...task, estimatedDays: days } : task
          )
        } : project
      )
    }));
    
    // Recalculate deadlines for the entire hierarchy
    setTimeout(() => recalculateHierarchyDeadlines(projectIndex, taskIndex), 0);
  };

  // Update subtask days and recalculate hierarchy deadlines
  const updateSubtaskDays = (projectIndex: number, taskIndex: number, subtaskIndex: number, value: string) => {
    const days = parseInt(value) || 1;
    setEditedBreakdown(prev => ({
      ...prev,
      projects: prev.projects.map((project, pIndex) => 
        pIndex === projectIndex ? {
          ...project,
          tasks: project.tasks.map((task, tIndex) => 
            tIndex === taskIndex ? {
              ...task,
              subtasks: task.subtasks.map((subtask, sIndex) => 
                sIndex === subtaskIndex ? { ...subtask, estimatedDays: days } : subtask
              )
            } : task
          )
        } : project
      )
    }));
    
    // Recalculate deadlines for the entire hierarchy
    setTimeout(() => recalculateHierarchyDeadlines(projectIndex, taskIndex), 0);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const EditableField = ({ 
    value, 
    onChange, 
    itemId, 
    field, 
    multiline = false, 
    placeholder = "" 
  }: {
    value: string;
    onChange: (value: string) => void;
    itemId: string;
    field: string;
    multiline?: boolean;
    placeholder?: string;
  }) => {
    const isEditing = editingItems.has(`${itemId}-${field}`);
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
            />
          )}
          <Button size="sm" variant="ghost" onClick={() => stopEditing(`${itemId}-${field}`)}>
            <Save className="w-3 h-3" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <span className="flex-1">{value || placeholder}</span>
        <Button 
          size="sm" 
          variant="ghost" 
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => startEditing(`${itemId}-${field}`)}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            AI Generated Goal Breakdown - Review & Edit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Goal Details */}
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-800">Goal</h3>
                <Badge className={getUrgencyColor(editedBreakdown.goal.urgency || 'medium')}>
                  {editedBreakdown.goal.urgency || 'medium'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Title</label>
                  <EditableField
                    value={editedBreakdown.goal.title}
                    onChange={(value) => updateGoal('title', value)}
                    itemId="goal"
                    field="title"
                    placeholder="Goal title"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <EditableField
                    value={editedBreakdown.goal.description || ''}
                    onChange={(value) => updateGoal('description', value)}
                    itemId="goal"
                    field="description"
                    multiline
                    placeholder="Goal description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Target Date</label>
                    <EditableField
                      value={editedBreakdown.goal.targetDate || ''}
                      onChange={(value) => updateGoal('targetDate', value)}
                      itemId="goal"
                      field="targetDate"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estimated Duration</label>
                    <EditableField
                      value={editedBreakdown.goal.estimatedDuration || ''}
                      onChange={(value) => updateGoal('estimatedDuration', value)}
                      itemId="goal"
                      field="estimatedDuration"
                      placeholder="e.g., 6 months"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="space-y-4">
              {editedBreakdown.projects.map((project, projectIndex) => (
                <Collapsible key={projectIndex} open={expandedProjects.has(projectIndex)}>
                  <CollapsibleTrigger asChild>
                    <div 
                      className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 cursor-pointer hover:bg-orange-100"
                      onClick={() => toggleProject(projectIndex)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedProjects.has(projectIndex) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <FolderOpen className="w-4 h-4 text-orange-600" />
                        <span className="font-medium">{project.title}</span>
                      </div>
                      <Badge className={getUrgencyColor(project.urgency || 'medium')}>
                        {project.urgency || 'medium'}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2 ml-6 space-y-3">
                    <div className="p-3 border rounded bg-white">
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Title</label>
                          <EditableField
                            value={project.title}
                            onChange={(value) => updateProject(projectIndex, 'title', value)}
                            itemId={`project-${projectIndex}`}
                            field="title"
                            placeholder="Project title"
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-gray-600">Description</label>
                          <EditableField
                            value={project.description || ''}
                            onChange={(value) => updateProject(projectIndex, 'description', value)}
                            itemId={`project-${projectIndex}`}
                            field="description"
                            multiline
                            placeholder="Project description"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="ml-4 space-y-3">
                      {project.tasks.map((task, taskIndex) => {
                        const taskKey = `${projectIndex}-${taskIndex}`;
                        const taskKeyNum = parseInt(taskKey.replace('-', ''));
                        
                        return (
                          <Collapsible key={taskIndex} open={expandedTasks.has(taskKeyNum)}>
                            <CollapsibleTrigger asChild>
                              <div 
                                className="flex items-center justify-between p-3 border rounded-lg bg-green-50 cursor-pointer hover:bg-green-100"
                                onClick={() => toggleTask(projectIndex, taskIndex)}
                              >
                                <div className="flex items-center gap-2">
                                  {expandedTasks.has(taskKeyNum) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                  <CheckSquare className="w-4 h-4 text-green-600" />
                                  <span className="font-medium">{task.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {task.estimatedHours && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {task.estimatedHours}h
                                    </span>
                                  )}
                                  <Badge className={getUrgencyColor(task.urgency || 'medium')}>
                                    {task.urgency || 'medium'}
                                  </Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="mt-2 ml-6 space-y-3">
                              <div className="p-3 border rounded bg-white">
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Title</label>
                                    <EditableField
                                      value={task.title}
                                      onChange={(value) => updateTask(projectIndex, taskIndex, 'title', value)}
                                      itemId={`task-${projectIndex}-${taskIndex}`}
                                      field="title"
                                      placeholder="Task title"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Description</label>
                                    <EditableField
                                      value={task.description || ''}
                                      onChange={(value) => updateTask(projectIndex, taskIndex, 'description', value)}
                                      itemId={`task-${projectIndex}-${taskIndex}`}
                                      field="description"
                                      multiline
                                      placeholder="Task description"
                                    />
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Due Date</label>
                                      <EditableField
                                        value={task.dueDate || ''}
                                        onChange={(value) => updateTask(projectIndex, taskIndex, 'dueDate', value)}
                                        itemId={`task-${projectIndex}-${taskIndex}`}
                                        field="dueDate"
                                        placeholder="YYYY-MM-DD"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Estimated Days</label>
                                      <EditableField
                                        value={task.estimatedDays?.toString() || ''}
                                        onChange={(value) => updateTaskDays(projectIndex, taskIndex, value)}
                                        itemId={`task-${projectIndex}-${taskIndex}`}
                                        field="estimatedDays"
                                        placeholder="Days"
                                      />
                                    </div>
                                    
                                    <div>
                                      <label className="text-sm font-medium text-gray-600">Estimated Hours</label>
                                      <EditableField
                                        value={task.estimatedHours?.toString() || ''}
                                        onChange={(value) => updateTask(projectIndex, taskIndex, 'estimatedHours', value)}
                                        itemId={`task-${projectIndex}-${taskIndex}`}
                                        field="estimatedHours"
                                        placeholder="Hours"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Subtasks */}
                              <div className="ml-4 space-y-2">
                                {task.subtasks.map((subtask, subtaskIndex) => (
                                  <div key={subtaskIndex} className="p-3 border rounded-lg bg-purple-50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ListTodo className="w-4 h-4 text-purple-600" />
                                      <EditableField
                                        value={subtask.title}
                                        onChange={(value) => updateSubtask(projectIndex, taskIndex, subtaskIndex, 'title', value)}
                                        itemId={`subtask-${projectIndex}-${taskIndex}-${subtaskIndex}`}
                                        field="title"
                                        placeholder="Subtask title"
                                      />
                                    </div>
                                    
                                    <div className="ml-6 space-y-2">
                                      <div>
                                        <label className="text-xs font-medium text-gray-600">Description</label>
                                        <EditableField
                                          value={subtask.description || ''}
                                          onChange={(value) => updateSubtask(projectIndex, taskIndex, subtaskIndex, 'description', value)}
                                          itemId={`subtask-${projectIndex}-${taskIndex}-${subtaskIndex}`}
                                          field="description"
                                          multiline
                                          placeholder="Subtask description"
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Estimated Days</label>
                                          <EditableField
                                            value={subtask.estimatedDays?.toString() || ''}
                                            onChange={(value) => updateSubtaskDays(projectIndex, taskIndex, subtaskIndex, value)}
                                            itemId={`subtask-${projectIndex}-${taskIndex}-${subtaskIndex}`}
                                            field="estimatedDays"
                                            placeholder="Days"
                                          />
                                        </div>
                                        
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Estimated Hours</label>
                                          <EditableField
                                            value={subtask.estimatedHours?.toString() || ''}
                                            onChange={(value) => updateSubtask(projectIndex, taskIndex, subtaskIndex, 'estimatedHours', value)}
                                            itemId={`subtask-${projectIndex}-${taskIndex}-${subtaskIndex}`}
                                            field="estimatedHours"
                                            placeholder="Hours"
                                          />
                                        </div>
                                        
                                        <div className="flex items-center">
                                          <Badge className={getUrgencyColor(subtask.urgency || 'medium')}>
                                            {subtask.urgency || 'medium'}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => onApprove(pendingId, editedBreakdown)}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Creating..." : "Approve & Create Goal"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onReject(pendingId)}
                disabled={isLoading}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}