import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle, AlertCircle, FileText, Code, ClipboardList } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AIAssistButtonProps {
  entityId: number;
  entityType: 'goals' | 'projects' | 'tasks' | 'subtasks';
  entityTitle: string;
  disabled?: boolean;
}

interface AIAssistSuggestion {
  strategy: string;
  description: string;
  confidence: number;
  estimatedTime: string;
}

interface AIAssistResult {
  success: boolean;
  message: string;
  deliverables?: Array<{
    type: 'document' | 'code' | 'plan' | 'research' | 'analysis';
    title: string;
    content: string;
    filename?: string;
  }>;
  followUpTasks?: Array<{
    title: string;
    description: string;
    priority?: string;
    estimatedHours?: number;
  }>;
  confidence: number;
  processingTime: number;
}

export function AIAssistButton({ entityId, entityType, entityTitle, disabled = false }: AIAssistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AIAssistSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AIAssistSuggestion | null>(null);
  const [completionResult, setCompletionResult] = useState<AIAssistResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get AI suggestions
  const suggestionsMutation = useMutation({
    mutationFn: async () => {
      console.log('🤖 AI ASSIST: Making API request to /api/ai-assist/suggestions');
      const payload = { 
        entityId, 
        entityType,
        // Legacy support for existing API
        taskId: entityType === 'tasks' ? entityId : undefined 
      };
      console.log('🤖 AI ASSIST: Request payload:', payload);
      
      const response = await apiRequest(`/api/ai-assist/suggestions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      console.log('🤖 AI ASSIST: API response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('🤖 AI ASSIST: Success! Got suggestions:', data);
      setSuggestions(data.suggestions || []);
    },
    onError: (error) => {
      console.error('🤖 AI ASSIST: Error getting suggestions:', error);
      toast({
        title: "Failed to get AI suggestions",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Execute AI completion
  const completionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/ai-assist/complete`, {
        method: 'POST',
        body: JSON.stringify({ 
          entityId, 
          entityType,
          // Legacy support for existing API
          taskId: entityType === 'tasks' ? entityId : undefined 
        })
      });
      return response;
    },
    onSuccess: (result: AIAssistResult) => {
      setCompletionResult(result);
      setShowResults(true);
      
      if (result.success) {
        toast({
          title: "AI Assist completed successfully!",
          description: result.message,
        });
        
        // Invalidate related queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/subtasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: [`/api/${entityType}/${entityId}`] });
        if (entityType === 'tasks') {
          queryClient.invalidateQueries({ queryKey: [`/api/tasks/${entityId}/subtasks`] });
        }
        
      } else {
        toast({
          title: "AI Assist encountered an issue",
          description: result.message,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      toast({
        title: "AI Assist failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleOpenDialog = () => {
    console.log('🤖 AI ASSIST: Button clicked', { entityId, entityType, entityTitle });
    setIsOpen(true);
    setShowResults(false);
    setCompletionResult(null);
    setSuggestions([]);
    setSelectedSuggestion(null);
    
    // Load suggestions immediately
    console.log('🤖 AI ASSIST: Calling suggestionsMutation.mutate()');
    suggestionsMutation.mutate();
  };

  const handleExecuteAI = () => {
    completionMutation.mutate();
  };

  const getDeliverableIcon = (type: string) => {
    switch (type) {
      case 'code': return <Code className="h-4 w-4" />;
      case 'plan': return <ClipboardList className="h-4 w-4" />;
      case 'document':
      case 'research':
      case 'analysis':
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={handleOpenDialog}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-none"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          AI Assist
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Assist: {entityTitle}
          </DialogTitle>
        </DialogHeader>

        {!showResults ? (
          <div className="space-y-6">
            {/* Loading suggestions */}
            {suggestionsMutation.isPending && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <span className="ml-3">Analyzing task and generating suggestions...</span>
              </div>
            )}

            {/* Suggestions list */}
            {suggestions.length > 0 && !completionMutation.isPending && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">How can AI help you?</h3>
                <div className="grid gap-3">
                  {suggestions.map((suggestion, index) => (
                    <Card 
                      key={index}
                      className={`cursor-pointer transition-all ${
                        selectedSuggestion === suggestion 
                          ? 'ring-2 ring-purple-500 border-purple-200' 
                          : 'hover:border-purple-200'
                      }`}
                      onClick={() => setSelectedSuggestion(suggestion)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          {suggestion.strategy}
                          <div className="flex items-center gap-2">
                            <div 
                              className={`w-2 h-2 rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                              title={`Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`}
                            />
                            <Badge variant="outline" className="text-xs">
                              {suggestion.estimatedTime}
                            </Badge>
                          </div>
                        </CardTitle>
                        <CardDescription>{suggestion.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>

                {selectedSuggestion && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Selected: <strong>{selectedSuggestion.strategy}</strong>
                    </div>
                    <Button
                      onClick={handleExecuteAI}
                      disabled={completionMutation.isPending}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      {completionMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI Working...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Start AI Assist
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Processing state */}
            {completionMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold">AI is working on your task...</h3>
                  <p className="text-muted-foreground mt-1">
                    This may take a few minutes while AI analyzes and completes your work.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Results display */
          completionResult && (
            <div className="space-y-6">
              {/* Success/failure header */}
              <div className="flex items-center gap-3">
                {completionResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <h3 className="text-lg font-semibold">
                    {completionResult.success ? "Task completed successfully!" : "Task completion failed"}
                  </h3>
                  <p className="text-muted-foreground">{completionResult.message}</p>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm text-muted-foreground">Processing time</div>
                  <div className="font-semibold">{(completionResult.processingTime / 1000).toFixed(1)}s</div>
                </div>
              </div>

              <Separator />

              {/* Deliverables */}
              {completionResult.deliverables && completionResult.deliverables.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Generated Deliverables</h4>
                  <div className="grid gap-4">
                    {completionResult.deliverables.map((deliverable, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            {getDeliverableIcon(deliverable.type)}
                            {deliverable.title}
                            <Badge variant="outline" className="ml-auto">
                              {deliverable.type}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted rounded-md p-4 max-h-48 overflow-y-auto">
                            <pre className="text-sm whitespace-pre-wrap font-mono">
                              {deliverable.content.substring(0, 1000)}
                              {deliverable.content.length > 1000 && "..."}
                            </pre>
                          </div>
                          {deliverable.filename && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Filename: {deliverable.filename}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up tasks */}
              {completionResult.followUpTasks && completionResult.followUpTasks.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Follow-up Tasks Created</h4>
                  <div className="grid gap-3">
                    {completionResult.followUpTasks.map((task, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium">{task.title}</h5>
                              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {task.priority && (
                                <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'}>
                                  {task.priority}
                                </Badge>
                              )}
                              {task.estimatedHours && (
                                <Badge variant="outline">
                                  {task.estimatedHours}h
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence and close */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${getConfidenceColor(completionResult.confidence)}`}
                    />
                    <span className="font-semibold">{(completionResult.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <Button onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}