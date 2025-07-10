import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Lightbulb, ArrowRight, Database, CheckCircle2, Calendar, Clock, Sparkles, Brain, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ModernCard, ModernCardHeader, ModernCardContent, StatusBadge } from "@/components/modern-ui";

export default function HomePage() {
  const [goalInput, setGoalInput] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedTimeline, setGeneratedTimeline] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createGoalMutation = useMutation({
    mutationFn: async ({ goalText, targetCompletionDate }: { goalText: string; targetCompletionDate?: string }) => {
      setIsGenerating(true);
      
      // First, generate the breakdown with optional target date
      const breakdownResponse = await fetch("/api/goals/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          goalInput: goalText,
          targetDate: targetCompletionDate 
        }),
      });
      const breakdown = await breakdownResponse.json();

      // Then approve and create the hierarchy
      const approveResponse = await fetch("/api/goals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId: breakdown.pendingId, approved: true }),
      });
      const result = await approveResponse.json();

      // If target date was provided, also store timeline info for display
      if (targetCompletionDate && breakdown.timeline) {
        setGeneratedTimeline(breakdown.timeline);
      }

      return result;
    },
    onSuccess: () => {
      setIsGenerating(false);
      setShowSuccess(true);
      setGoalInput("");
      setTargetDate("");
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      
      const hasTimeline = generatedTimeline && targetDate;
      
      toast({
        title: "Goal Created Successfully!",
        description: hasTimeline 
          ? "Your goal has been broken down with automatic timeline generation!" 
          : "Your goal has been broken down into projects, tasks, and subtasks.",
      });

      // Reset success state after animation
      setTimeout(() => {
        setShowSuccess(false);
        setGeneratedTimeline(null);
      }, 3000);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async () => {
    if (!goalInput.trim()) {
      toast({
        title: "Please enter a goal",
        description: "Describe what you want to accomplish.",
        variant: "destructive",
      });
      return;
    }

    // Validate target date if provided
    if (targetDate && new Date(targetDate) <= new Date()) {
      toast({
        title: "Invalid Target Date",
        description: "Target completion date must be in the future.",
        variant: "destructive",
      });
      return;
    }

    await createGoalMutation.mutateAsync({
      goalText: goalInput.trim(),
      targetCompletionDate: targetDate || undefined
    });
  };

  return (
    <div className="modern-container max-w-6xl py-8 lg:py-12">
      {/* Modern Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
            <Target className="h-10 w-10 text-primary-foreground" />
          </div>
        </div>
        <h1 className="modern-heading mb-4 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Transform Ideas Into Reality
        </h1>
        <p className="modern-text-large max-w-3xl mx-auto mb-8">
          Describe any goal, and our AI will instantly create a complete action plan with projects, tasks, and smart timelines.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI-Powered Breakdown
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Smart Scheduling
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Weekly Planning
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <Link href="/database">
            <Button variant="outline" className="modern-button modern-button-secondary">
              <Database className="w-5 h-5 mr-2" />
              View Database
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Input Card */}
      <ModernCard className="mb-8 border-2 border-border shadow-xl">
          <ModernCardHeader>
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <h2 className="modern-subheading">What would you like to accomplish?</h2>
              </div>
              <p className="modern-text">Share your vision and let AI create the perfect action plan</p>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            {/* Success Animation */}
            {showSuccess && (
              <div className="flex items-center justify-center space-x-3 p-4 bg-success/10 border border-success/20 rounded-lg animate-in fade-in duration-500">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <span className="text-success font-medium">Goal created and broken down successfully!</span>
              </div>
            )}

            <div className="modern-spacing-md">
              <div>
                <Label htmlFor="goal-input" className="text-sm font-semibold text-foreground mb-2 block">
                  Describe your goal
                </Label>
                <Textarea
                  id="goal-input"
                  placeholder="Example: Launch a mobile app for fitness tracking with 10,000 users by end of year"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="modern-input min-h-[120px] text-base resize-none"
                  disabled={isGenerating}
                />
              </div>

              <div>
                <Label htmlFor="target-date" className="text-sm font-semibold text-foreground mb-2 block">
                  Target completion date (optional)
                </Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="modern-input text-base"
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {targetDate ? "AI will generate automatic timeline with deadlines" : "Add a target date for AI timeline generation"}
                </p>
              </div>
              
              {/* Tips */}
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1 bg-primary/10 rounded">
                    <Lightbulb className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Tips for better results:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Be specific about your desired outcome</li>
                      <li>• Include timelines when possible</li>
                      <li>• Mention key metrics or targets</li>
                      <li>• Describe the scope and complexity</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isGenerating || !goalInput.trim()}
                className="modern-button modern-button-primary w-full h-12 text-base font-semibold"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    {targetDate ? "Creating breakdown + timeline..." : "Creating your breakdown..."}
                  </>
                ) : (
                  <>
                    {targetDate ? "Generate Goal + Timeline" : "Break Down My Goal"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Timeline Preview */}
            {generatedTimeline && showSuccess && (
              <ModernCard className="bg-success/10 border-success/20">
                <ModernCardHeader>
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <Clock className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-success">Auto-Generated Timeline</h3>
                      <p className="text-sm text-success/80">Smart scheduling complete</p>
                    </div>
                  </div>
                </ModernCardHeader>
                <ModernCardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-3 bg-card rounded-lg border border-border">
                      <div className="font-semibold text-success">Start Date</div>
                      <div className="text-muted-foreground">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="text-center p-3 bg-card rounded-lg border border-border">
                      <div className="font-semibold text-success">Target Date</div>
                      <div className="text-muted-foreground">{new Date(targetDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-center p-3 bg-card rounded-lg border border-border">
                      <div className="font-semibold text-success">Total Tasks</div>
                      <div className="text-muted-foreground">{generatedTimeline.totalTasks || "Multiple"}</div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-success mt-4">
                    ✨ Deadlines automatically assigned to all tasks and subtasks
                  </div>
                </ModernCardContent>
              </ModernCard>
            )}
          </ModernCardContent>
        </ModernCard>

        {/* Features Overview */}
        <div className="mt-16 modern-grid">
          <ModernCard className="text-center border-primary/10 hover:border-primary/20 transition-all">
            <ModernCardContent>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Smart Breakdown</h3>
              <p className="text-muted-foreground text-sm">
                AI analyzes your goal and creates a structured hierarchy of projects, tasks, and subtasks
              </p>
            </ModernCardContent>
          </ModernCard>
          
          <ModernCard className="text-center border-primary/10 hover:border-primary/20 transition-all">
            <ModernCardContent>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Complete Overview</h3>
              <p className="text-muted-foreground text-sm">
                View all your goals, projects, and tasks in an organized database with detailed tracking
              </p>
            </ModernCardContent>
          </ModernCard>
          
          <ModernCard className="text-center border-primary/10 hover:border-primary/20 transition-all">
            <ModernCardContent>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Intelligent Planning</h3>
              <p className="text-muted-foreground text-sm">
                Get realistic timelines, priorities, and dependencies automatically generated for each task
              </p>
            </ModernCardContent>
          </ModernCard>
        </div>
      </div>
    </div>
  );
}