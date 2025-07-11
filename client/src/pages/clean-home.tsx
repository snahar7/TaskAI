import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, MessageSquare, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export default function CleanHome() {
  const [input, setInput] = useState("");
  const [selectedModes, setSelectedModes] = useState<{ goal: boolean; standup: boolean }>({
    goal: false,
    standup: false
  });

  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: async ({ text, isGoal, isStandup }: { text: string; isGoal: boolean; isStandup: boolean }) => {
      if (isGoal && isStandup) {
        // Create goal breakdown AND add to standup
        const goalResponse = await fetch("/api/goals/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalText: text }),
        });
        if (!goalResponse.ok) throw new Error("Failed to create goal");
        
        // Also start standup conversation with this goal
        const standupResponse = await fetch("/api/standup/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: 1, goalText: text }),
        });
        
        return goalResponse.json();
      } else if (isGoal) {
        // Create a goal breakdown
        const response = await fetch("/api/goals/breakdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goalText: text }),
        });
        if (!response.ok) throw new Error("Failed to create goal");
        return response.json();
      } else if (isStandup) {
        // Create task and add to standup
        const taskResponse = await fetch("/api/hierarchy/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task",
            title: text,
            description: "",
            estimatedHours: 1,
            priority: "medium"
          }),
        });
        
        if (!taskResponse.ok) throw new Error("Failed to create task");
        
        // Also add to standup
        const standupResponse = await fetch("/api/standup/start", {
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: 1, taskText: text }),
        });
        
        return taskResponse.json();
      } else {
        // Create a simple task/todo
        const response = await fetch("/api/hierarchy/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task",
            title: text,
            description: "",
            estimatedHours: 1,
            priority: "medium"
          }),
        });
        if (!response.ok) throw new Error("Failed to create task");
        return response.json();
      }
    },
    onSuccess: (data) => {
      const wasGoal = selectedModes.goal;
      const wasStandup = selectedModes.standup;
      
      setInput("");
      setSelectedModes({ goal: false, standup: false });
      
      if (wasGoal && wasStandup) {
        toast({
          title: "Goal & Standup Created!",
          description: "Your goal has been broken down and added to standup for insights.",
        });
      } else if (wasGoal) {
        toast({
          title: "Goal Created!",
          description: "Your goal has been broken down into actionable tasks.",
        });
      } else if (wasStandup) {
        toast({
          title: "Task Added to Standup!",
          description: "Your task has been added to to-do and standup queue.",
        });
      } else {
        toast({
          title: "Task Added!",
          description: "Your task has been added to your to-do list.",
        });
      }

      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/standup'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    createTaskMutation.mutate({
      text: input.trim(),
      isGoal: selectedModes.goal,
      isStandup: selectedModes.standup
    });
  };

  const toggleMode = (mode: 'goal' | 'standup') => {
    setSelectedModes(prev => ({
      ...prev,
      [mode]: !prev[mode]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <h3 className="text-2xl font-semibold text-gray-900 text-center mb-8">
          What do you want to work on?
        </h3>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden backdrop-blur-sm">
            {/* Main Input */}
            <div className="p-6 pb-0">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="write your goal or a task"
                className="w-full border-0 text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-auto py-4 px-0 text-gray-900 font-medium"
                disabled={createTaskMutation.isPending}
              />
            </div>

            {/* Bottom Section */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
              {/* Mode Icons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMode('goal')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 font-medium",
                    selectedModes.goal
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-105"
                      : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 hover:scale-105"
                  )}
                >
                  <Target className="h-4 w-4" />
                  {selectedModes.goal && <span className="text-sm">Goal</span>}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMode('standup')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 font-medium",
                    selectedModes.standup
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25 scale-105"
                      : "text-gray-600 hover:text-violet-600 hover:bg-violet-50 hover:scale-105"
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  {selectedModes.standup && <span className="text-sm">Standup</span>}
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || createTaskMutation.isPending}
                className={cn(
                  "rounded-full px-6 py-2 font-medium transition-all duration-200 shadow-lg",
                  !input.trim() || createTaskMutation.isPending
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl hover:shadow-blue-500/25 hover:scale-105"
                )}
              >
                {createTaskMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Helper Text */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-gray-600">
                <span className="font-medium text-emerald-600">Goal</span> for AI breakdown
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
              <span className="text-gray-600">
                <span className="font-medium text-violet-600">Standup</span> for insights
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Or just type and press enter to add a simple task
          </p>
        </div>
      </div>
    </div>
  );
}