import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Lightbulb, ArrowRight, Database, CheckCircle2, Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { MobileInput, MobileButton, MobileFormField } from "@/components/mobile-form";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Taflo</h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered task management with intelligent goal breakdown
          </p>
          
          <div className="flex justify-center space-x-4">
            <Link href="/database">
              <Button variant="outline" size="lg">
                <Database className="w-5 h-5 mr-2" />
                View Database
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Input Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center space-x-2">
              <Target className="h-6 w-6 text-blue-600" />
              <span>What's your goal?</span>
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Describe your objective and let AI break it down into actionable steps
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Success Animation */}
            {showSuccess && (
              <div className="flex items-center justify-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-500">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-green-800 font-medium">Goal created and broken down successfully!</span>
              </div>
            )}

            {/* Input Area */}
            <div className="space-y-6">
              <MobileFormField label="Describe Your Goal">
                <Textarea
                  placeholder="Example: Launch a mobile app for fitness tracking with 10,000 users by end of year"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="min-h-[120px] text-base sm:text-lg border-2 border-gray-200 focus:border-blue-500 resize-none"
                  disabled={isGenerating}
                />
              </MobileFormField>

              <MobileFormField label="Target Completion Date (Optional)">
                <div className="relative">
                  <MobileInput
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    disabled={isGenerating}
                    min={new Date().toISOString().split('T')[0]}
                    className="pr-10"
                  />
                  <Calendar className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                {targetDate && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                    <Clock className="h-4 w-4" />
                    <span>AI will generate automatic timeline and deadlines</span>
                  </div>
                )}
              </MobileFormField>
              
              {/* Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Tips for better results:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Be specific about your desired outcome</li>
                      <li>• Include timelines when possible</li>
                      <li>• Mention key metrics or targets</li>
                      <li>• Describe the scope and complexity</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <MobileButton
              onClick={handleSubmit}
              disabled={isGenerating || !goalInput.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold"
            >
              {isGenerating ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{targetDate ? "Creating breakdown + timeline..." : "Creating your breakdown..."}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{targetDate ? "Break Down + Generate Timeline" : "Break Down My Goal"}</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </MobileButton>

            {/* Timeline Preview */}
            {generatedTimeline && showSuccess && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Auto-Generated Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="font-semibold text-green-700">Start Date</div>
                      <div className="text-green-600">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="font-semibold text-green-700">Target Date</div>
                      <div className="text-green-600">{new Date(targetDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <div className="font-semibold text-green-700">Total Tasks</div>
                      <div className="text-green-600">{generatedTimeline.totalTasks || "Multiple"}</div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-green-700">
                    ✨ Deadlines automatically assigned to all tasks and subtasks
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Features Overview */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <Card className="text-center p-6 bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Breakdown</h3>
            <p className="text-gray-600 text-sm">
              AI analyzes your goal and creates a structured hierarchy of projects, tasks, and subtasks
            </p>
          </Card>
          
          <Card className="text-center p-6 bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Complete Overview</h3>
            <p className="text-gray-600 text-sm">
              View all your goals, projects, and tasks in an organized database with detailed tracking
            </p>
          </Card>
          
          <Card className="text-center p-6 bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Intelligent Planning</h3>
            <p className="text-gray-600 text-sm">
              Get realistic timelines, priorities, and dependencies automatically generated for each task
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}