import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Clock, Calendar, Target, TrendingUp, Zap, Brain, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function TimelinePage() {
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{ id: number; type: string } | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  // Fetch goals for timeline estimation
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["/api/goals"],
  });

  // Fetch productivity profile
  const { data: productivityProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/timeline/productivity-profile"],
  });

  // Fetch learning insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/timeline/insights"],
  });

  // Generate time estimate mutation
  const estimateMutation = useMutation({
    mutationFn: async (data: { entityId: number; entityType: string; includeHierarchy: boolean }) => {
      return apiRequest("/api/timeline/estimate", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline"] });
    },
  });

  // Generate project schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: async (data: { goalId: number; startDate: string }) => {
      return apiRequest("/api/timeline/project-schedule", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline"] });
    },
  });

  const handleGenerateEstimate = () => {
    if (!selectedEntity) return;
    
    estimateMutation.mutate({
      entityId: selectedEntity.id,
      entityType: selectedEntity.type,
      includeHierarchy: true
    });
  };

  const handleGenerateSchedule = () => {
    if (!selectedGoal) return;
    
    scheduleMutation.mutate({
      goalId: selectedGoal,
      startDate: startDate
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Timeline Estimation</h1>
          <p className="text-muted-foreground">
            Intelligent scheduling and time estimation using hybrid AI methods
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Method 5: Hybrid System
        </Badge>
      </div>

      <Tabs defaultValue="estimation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="estimation">Time Estimation</TabsTrigger>
          <TabsTrigger value="scheduling">Project Scheduling</TabsTrigger>
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
          <TabsTrigger value="profile">Productivity Profile</TabsTrigger>
        </TabsList>

        {/* Time Estimation Tab */}
        <TabsContent value="estimation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* AI Time Estimation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Context Analysis
                </CardTitle>
                <CardDescription>
                  Generate AI-powered time estimates with complexity analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Goal/Project/Task</Label>
                  <Select onValueChange={(value) => {
                    const [type, id] = value.split('-');
                    setSelectedEntity({ id: parseInt(id), type });
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose entity to estimate" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals?.map((goal: any) => (
                        <SelectItem key={`goal-${goal.id}`} value={`goal-${goal.id}`}>
                          Goal: {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerateEstimate}
                  disabled={!selectedEntity || estimateMutation.isPending}
                  className="w-full"
                >
                  {estimateMutation.isPending ? "Analyzing..." : "Generate AI Estimate"}
                </Button>

                {/* Display Estimation Results */}
                {estimateMutation.data && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                    <h4 className="font-medium">Estimation Results</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Optimistic</div>
                        <div className="font-medium">{estimateMutation.data.estimate.optimistic}h</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Realistic</div>
                        <div className="font-medium text-blue-600">{estimateMutation.data.estimate.realistic}h</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Pessimistic</div>
                        <div className="font-medium">{estimateMutation.data.estimate.pessimistic}h</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Confidence:</span>
                      <Progress value={estimateMutation.data.estimate.confidence * 100} className="flex-1" />
                      <span className="text-sm">{Math.round(estimateMutation.data.estimate.confidence * 100)}%</span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Complexity Factors:</div>
                      <div className="flex flex-wrap gap-1">
                        {estimateMutation.data.estimate.factors.map((factor: string) => (
                          <Badge key={factor} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quick Insights
                </CardTitle>
                <CardDescription>
                  Current productivity metrics and accuracy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="text-center py-4">Loading insights...</div>
                ) : insights ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(insights.insights.overallAccuracy * 100)}%
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Accuracy</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {insights.dataPoints}
                        </div>
                        <div className="text-sm text-muted-foreground">Completed Tasks</div>
                      </div>
                    </div>
                    
                    {insights.insights.recommendations.focusAreas.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Focus Areas:</div>
                        {insights.insights.recommendations.focusAreas.slice(0, 3).map((area: string, i: number) => (
                          <div key={i} className="text-sm text-muted-foreground">
                            • {area}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Complete some tasks to see insights
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Project Scheduling Tab */}
        <TabsContent value="scheduling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Resource-Aware Scheduling
              </CardTitle>
              <CardDescription>
                Generate complete project timeline with dependencies and critical path
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Goal</Label>
                  <Select onValueChange={(value) => setSelectedGoal(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose goal to schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals?.map((goal: any) => (
                        <SelectItem key={goal.id} value={goal.id.toString()}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={handleGenerateSchedule}
                disabled={!selectedGoal || scheduleMutation.isPending}
                className="w-full"
              >
                {scheduleMutation.isPending ? "Calculating Schedule..." : "Generate Project Schedule"}
              </Button>

              {/* Display Schedule Results */}
              {scheduleMutation.data && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Project Timeline</h4>
                    <Badge variant="outline">
                      {scheduleMutation.data.timeline.tasksCount} tasks
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(scheduleMutation.data.timeline.totalDuration)}h
                      </div>
                      <div className="text-sm text-muted-foreground">Total Duration</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {new Date(scheduleMutation.data.timeline.completionDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Completion Date</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {scheduleMutation.data.timeline.criticalPath.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Critical Path Items</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium">Schedule Overview:</h5>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {scheduleMutation.data.timeline.schedule.slice(0, 10).map((item: any) => (
                        <div key={item.taskId} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{item.task?.title || `Task ${item.taskId}`}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={item.criticalPath ? "destructive" : "secondary"}>
                              {Math.round(item.duration)}h
                            </Badge>
                            {item.criticalPath && (
                              <Badge variant="outline" className="text-red-600">
                                Critical
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estimation Accuracy</CardTitle>
                <CardDescription>Performance tracking across different domains</CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="text-center py-4">Loading insights...</div>
                ) : insights ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Accuracy</span>
                        <span className="font-medium">{Math.round(insights.insights.overallAccuracy * 100)}%</span>
                      </div>
                      <Progress value={insights.insights.overallAccuracy * 100} />
                    </div>

                    {Object.entries(insights.insights.domainAccuracy).map(([domain, accuracy]: [string, any]) => (
                      <div key={domain} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm capitalize">{domain}</span>
                          <span className="font-medium">{Math.round(accuracy * 100)}%</span>
                        </div>
                        <Progress value={accuracy * 100} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No data available yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>AI-generated improvement suggestions</CardDescription>
              </CardHeader>
              <CardContent>
                {insights?.insights.recommendations.focusAreas.length > 0 ? (
                  <div className="space-y-3">
                    {insights.insights.recommendations.focusAreas.map((area: string, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Target className="h-4 w-4 mt-0.5 text-blue-600" />
                        <div className="text-sm">{area}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Complete more tasks to get personalized recommendations
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Productivity Profile
              </CardTitle>
              <CardDescription>
                Your personalized productivity settings and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <div className="text-center py-4">Loading profile...</div>
              ) : productivityProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="font-medium">Daily Capacity</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {productivityProfile.profile.dailyCapacity}h
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Productive hours per day
                      </div>
                    </div>

                    <div>
                      <div className="font-medium">Peak Hours</div>
                      <div className="text-lg font-semibold">
                        {productivityProfile.profile.peakHours.start}:00 - {productivityProfile.profile.peakHours.end}:00
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Best productivity window
                      </div>
                    </div>

                    <div>
                      <div className="font-medium">Historical Accuracy</div>
                      <div className="flex items-center gap-2">
                        <Progress value={productivityProfile.profile.historicalAccuracy * 100} className="flex-1" />
                        <span className="text-sm font-medium">
                          {Math.round(productivityProfile.profile.historicalAccuracy * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="font-medium mb-2">Domain Efficiency</div>
                      <div className="space-y-2">
                        {Object.entries(productivityProfile.profile.domainEfficiency).map(([domain, efficiency]: [string, any]) => (
                          <div key={domain} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{domain}</span>
                            <Badge variant="outline">
                              {Math.round(efficiency * 100)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="font-medium">Working Days</div>
                      <div className="flex gap-1 mt-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                          <div
                            key={i}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              productivityProfile.profile.workingDays.includes(i)
                                ? 'bg-blue-600 text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Unable to load productivity profile
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}