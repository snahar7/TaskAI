import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Plus, 
  Calendar, 
  Users, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Goal {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  percentComplete: number;
  deadline?: string;
  createdAt: string;
  projects?: Project[];
}

interface Project {
  id: number;
  title: string;
  description?: string;
  status: string;
  percentComplete: number;
  deadline?: string;
}

export default function GoalsPage() {
  const [expandedGoals, setExpandedGoals] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  // Fetch all goals
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    staleTime: 30000,
  });

  const toggleGoalExpansion = (goalId: number) => {
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeGoals = goals.filter(goal => goal.status !== 'completed');
  const completedGoals = goals.filter(goal => goal.status === 'completed');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Goals</h1>
            <p className="text-gray-600">
              {activeGoals.length} active goals, {completedGoals.length} completed
            </p>
          </div>
        </div>
        
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Progress</p>
                <p className="text-xl font-semibold text-gray-900">
                  {goals.length > 0 ? Math.round(goals.reduce((acc, goal) => acc + goal.percentComplete, 0) / goals.length) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-semibold text-gray-900">{completedGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-xl font-semibold text-gray-900">
                  {goals.filter(g => g.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No goals yet</p>
            <p className="text-sm mb-4">Create your first goal to get started!</p>
            <Link href="/">
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </Link>
          </div>
        ) : (
          goals.map((goal) => (
            <Card key={goal.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Goal Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleGoalExpansion(goal.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {expandedGoals.has(goal.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">{goal.title}</h3>
                          <Badge variant="secondary" className={getStatusColor(goal.status)}>
                            {goal.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className={getPriorityColor(goal.priority)}>
                            {goal.priority}
                          </Badge>
                        </div>
                        
                        {goal.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{goal.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {goal.deadline && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {new Date(goal.deadline).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            Created {new Date(goal.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {goal.percentComplete}% Complete
                      </div>
                      <Progress value={goal.percentComplete} className="w-24" />
                    </div>
                  </div>
                </div>

                {/* Expanded Projects */}
                {expandedGoals.has(goal.id) && goal.projects && goal.projects.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Projects ({goal.projects.length})
                    </h4>
                    <div className="grid gap-3">
                      {goal.projects.map((project) => (
                        <div key={project.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-gray-900">{project.title}</h5>
                                <Badge variant="secondary" className={getStatusColor(project.status)}>
                                  {project.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600">{project.description}</p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {project.percentComplete}%
                              </div>
                              <Progress value={project.percentComplete} className="w-20" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}