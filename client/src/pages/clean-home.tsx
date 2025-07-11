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
          <div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* Main Input */}
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="write your goal or a task"
              className="w-full border-0 text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              disabled={createTaskMutation.isPending}
            />

            {/* Bottom Section */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              {/* Mode Icons */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMode('goal')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
                    selectedModes.goal
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "text-gray-500 hover:text-green-600 hover:bg-green-50"
                  )}
                >
                  <Target className="h-4 w-4" />
                  {selectedModes.goal && <span className="text-sm font-medium">Goal</span>}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMode('standup')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
                    selectedModes.standup
                      ? "bg-purple-100 text-purple-700 border border-purple-300"
                      : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  {selectedModes.standup && <span className="text-sm font-medium">Standup</span>}
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
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
        <div className="mt-6 text-center text-sm text-gray-500 space-y-1">
          <p>Select <span className="text-green-600 font-medium">Goal</span> to break down complex tasks with AI</p>
          <p>Select <span className="text-purple-600 font-medium">Standup</span> to add insights and planning</p>
          <p>Or just press enter to add a simple task to your to-do list</p>
        </div>
      </div>
    </div>
  );
}