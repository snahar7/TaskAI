import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, Plus, Target, FolderOpen, CheckSquare, ListTodo, Calendar, User, Tag, Clock, FileText, AlertCircle, Percent, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { GoalWithProjects } from "@shared/schema";

export default function DatabasePage() {
  const queryClient = useQueryClient();
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const { data: goals = [], isLoading } = useQuery<GoalWithProjects[]>({
    queryKey: ["/api/goals"],
  });

  const breakdownMutation = useMutation({
    mutationFn: async (data: { input: string; level: string; parentId?: number }) => {
      const response = await fetch("/api/goals/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const completionMutation = useMutation({
    mutationFn: async ({ type, id, completed }: { type: string; id: number; completed: boolean }) => {
      const endpoint = type === "goal" ? `/api/goals/${id}/approve` :
                      type === "project" ? `/api/projects/${id}/approve` :
                      type === "task" ? `/api/tasks/${id}/complete` :
                      `/api/subtasks/${id}/complete`;
      
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const handleAddBreakdown = (level: string, parentId?: number) => {
    const input = prompt(`Enter a ${level} to break down:`);
    if (input) {
      breakdownMutation.mutate({
        input,
        level,
        parentId,
      });
    }
  };

  const handleCompletionToggle = (type: string, id: number, currentStatus: boolean) => {
    completionMutation.mutate({
      type,
      id,
      completed: !currentStatus,
    });
  };

  const toggleExpanded = (type: string, id: number) => {
    const setExpanded = type === "goal" ? setExpandedGoals : 
                      type === "project" ? setExpandedProjects : 
                      setExpandedTasks;
    
    setExpanded(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "No deadline";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTableRow = (item: any, type: string, level: number = 0) => {
    const isExpanded = type === "goal" ? expandedGoals.has(item.id) :
                      type === "project" ? expandedProjects.has(item.id) :
                      expandedTasks.has(item.id);

    const hasChildren = (type === "goal" && item.projects?.length > 0) ||
                       (type === "project" && item.tasks?.length > 0) ||
                       (type === "task" && item.subtasks?.length > 0);

    const getTypeIcon = () => {
      switch (type) {
        case "goal": return <Target className="w-4 h-4 text-blue-600" />;
        case "project": return <FolderOpen className="w-4 h-4 text-green-600" />;
        case "task": return <CheckSquare className="w-4 h-4 text-orange-600" />;
        case "subtask": return <ListTodo className="w-4 h-4 text-purple-600" />;
        default: return null;
      }
    };

    return (
      <>
        <TableRow key={`${type}-${item.id}`} className={level > 0 ? "bg-gray-50" : ""}>
          <TableCell>
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(type, item.id)}
                className="p-1"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            ) : (
              <div className="w-6" />
            )}
          </TableCell>
          
          <TableCell>
            <Checkbox
              checked={item.status === 'completed' || item.completed}
              onCheckedChange={() => handleCompletionToggle(type, item.id, item.status === 'completed' || item.completed)}
            />
          </TableCell>
          
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
              {getTypeIcon()}
              <span className="font-medium">{item.name || item.title}</span>
            </div>
          </TableCell>

          <TableCell>
            <Badge variant="outline" className="capitalize">
              {type}
            </Badge>
          </TableCell>

          <TableCell>
            <Badge className={getStatusColor(item.status)}>
              {item.status || 'pending'}
            </Badge>
          </TableCell>

          <TableCell>
            <Badge className={getPriorityColor(item.priority)}>
              {item.priority || 'medium'}
            </Badge>
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-2">
              <Progress value={item.percentComplete || 0} className="w-16" />
              <span className="text-sm text-muted-foreground">
                {item.percentComplete || 0}%
              </span>
            </div>
          </TableCell>

          <TableCell>
            {item.deadline ? (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(item.deadline)}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">No deadline</span>
            )}
          </TableCell>

          <TableCell>
            {item.assignedTo ? (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{item.assignedTo}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Unassigned</span>
            )}
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-1">
              {item.description && (
                <Tooltip>
                  <TooltipTrigger>
                    <FileText className="w-4 h-4 text-blue-500 hover:text-blue-700 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              {item.timeEstimate && (
                <Tooltip>
                  <TooltipTrigger>
                    <Clock className="w-4 h-4 text-green-500 hover:text-green-700 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Estimated: {item.timeEstimate} hours</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {item.tags && (
                <Tooltip>
                  <TooltipTrigger>
                    <Tag className="w-4 h-4 text-purple-500 hover:text-purple-700 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tags: {item.tags}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TableCell>

          <TableCell>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextLevel = type === "goal" ? "project" : 
                                type === "project" ? "task" : "subtask";
                handleAddBreakdown(nextLevel, item.id);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </TableCell>
        </TableRow>

        {/* Render children when expanded */}
        {isExpanded && (
          <>
            {type === "goal" && item.projects?.map((project: any, index: number) => 
              renderTableRow(project, "project", level + 1)
            )}
            {type === "project" && item.tasks?.map((task: any, index: number) => 
              renderTableRow(task, "task", level + 1)
            )}
            {type === "task" && item.subtasks?.map((subtask: any, index: number) => 
              renderTableRow(subtask, "subtask", level + 1)
            )}
          </>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Database View</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Database View</h1>
          <Button onClick={() => handleAddBreakdown("goal")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Goal
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No goals found. Create your first goal to get started!</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[50px]">Done</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[120px]">Progress</TableHead>
                  <TableHead className="w-[120px]">Deadline</TableHead>
                  <TableHead className="w-[100px]">Assigned</TableHead>
                  <TableHead className="w-[80px]">Info</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((goal) => renderTableRow(goal, "goal"))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}