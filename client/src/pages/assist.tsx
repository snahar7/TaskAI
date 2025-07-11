import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  MessageSquare, 
  Lightbulb, 
  Target, 
  TrendingUp,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AssistPage() {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const suggestions = [
    {
      icon: Target,
      title: "Break down my project",
      description: "Get AI help to break complex goals into manageable tasks",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: TrendingUp,
      title: "Analyze my productivity",
      description: "Get insights on your work patterns and efficiency",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Calendar,
      title: "Optimize my schedule",
      description: "AI recommendations for better time management",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: CheckCircle2,
      title: "Review my progress",
      description: "Get feedback on completed tasks and goals",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const quickActions = [
    "How can I be more productive today?",
    "What should I focus on this week?",
    "Help me prioritize my tasks",
    "Suggest improvements for my workflow"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setQuery("");
    }, 2000);
  };

  const handleQuickAction = (action: string) => {
    setQuery(action);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Bot className="h-8 w-8 text-orange-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-600">Get intelligent insights and recommendations for your tasks</p>
        </div>
      </div>

      {/* Main Chat Interface */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything about your tasks, productivity, or goals..."
                className="pr-12 h-12 text-base"
                disabled={isProcessing}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!query.trim() || isProcessing}
                className="absolute right-2 top-2 bg-orange-600 hover:bg-orange-700"
              >
                {isProcessing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="mt-6">
            <p className="text-sm text-gray-600 mb-3">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="text-xs"
                  disabled={isProcessing}
                >
                  {action}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-600" />
          AI Suggestions
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", suggestion.bgColor)}>
                    <suggestion.icon className={cn("h-5 w-5", suggestion.color)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{suggestion.title}</h3>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-orange-600" />
            Recent AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">Productivity Tip</p>
                <p className="text-sm text-gray-600">Based on your patterns, you're most productive between 9-11 AM. Consider scheduling important tasks during this time.</p>
                <Badge variant="secondary" className="mt-2 text-xs">2 hours ago</Badge>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">Goal Progress</p>
                <p className="text-sm text-gray-600">You're 75% through your weekly goals. Great progress! Focus on the remaining 3 high-priority tasks.</p>
                <Badge variant="secondary" className="mt-2 text-xs">5 hours ago</Badge>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">Task Suggestion</p>
                <p className="text-sm text-gray-600">Consider breaking down "Complete project proposal" into smaller subtasks for better progress tracking.</p>
                <Badge variant="secondary" className="mt-2 text-xs">1 day ago</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}