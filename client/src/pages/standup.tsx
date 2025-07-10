import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Play, ArrowRight, CheckCircle, Clock, User, Brain, Sparkles, Send, Mic } from 'lucide-react';
import { 
  ModernCard, 
  ModernCardHeader, 
  ModernCardContent, 
  StatusBadge, 
  ProgressRing,
  ModernEmptyState
} from '@/components/modern-ui';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StandupState {
  conversationId: number;
  status: 'in_progress' | 'completed';
  currentTask: any;
  progress: {
    current: number;
    total: number;
  };
  lastMessage: string;
  hasCurrentStandup: boolean;
}

interface SuggestedAction {
  type: 'update_task' | 'create_task' | 'next_task' | 'complete_standup';
  description: string;
  data?: any;
}

export default function StandupPage() {
  const [userInput, setUserInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Check for current standup
  const { data: currentStandup, isLoading: checkingStandup } = useQuery({
    queryKey: ['/api/standup/current', 1], // Default to user 1
    queryFn: async () => {
      const response = await fetch('/api/standup/current/1');
      return response.json();
    }
  });

  // Start new standup
  const startStandupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/standup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setConversationHistory([{
        role: 'assistant',
        content: data.aiMessage,
        timestamp: new Date()
      }]);
      queryClient.invalidateQueries({ queryKey: ['/api/standup/current', 1] });
    }
  });

  // Send user response
  const respondMutation = useMutation({
    mutationFn: async ({ conversationId, userResponse }: { conversationId: number; userResponse: string }) => {
      const response = await fetch('/api/standup/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, userResponse })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: data.aiResponse,
        timestamp: new Date()
      }]);
      queryClient.invalidateQueries({ queryKey: ['/api/standup/current', 1] });
    }
  });

  // Move to next task
  const nextTaskMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await fetch('/api/standup/next-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });
      return response.json();
    },
    onSuccess: (data) => {
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        content: data.aiResponse,
        timestamp: new Date()
      }]);
      queryClient.invalidateQueries({ queryKey: ['/api/standup/current', 1] });
    }
  });

  const handleSendMessage = async () => {
    if (!userInput.trim() || !currentStandup?.conversationId) return;

    setIsLoading(true);
    
    // Add user message to history
    const userMessage: ConversationMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };
    setConversationHistory(prev => [...prev, userMessage]);
    
    try {
      await respondMutation.mutateAsync({
        conversationId: currentStandup.conversationId,
        userResponse: userInput
      });
      setUserInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextTask = async () => {
    if (!currentStandup?.conversationId) return;
    
    setIsLoading(true);
    try {
      await nextTaskMutation.mutateAsync(currentStandup.conversationId);
    } catch (error) {
      console.error('Error moving to next task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStandup = async () => {
    setIsLoading(true);
    try {
      await startStandupMutation.mutateAsync();
    } catch (error) {
      console.error('Error starting standup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingStandup) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Checking for active standup...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-container max-w-6xl py-8 lg:py-12">
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
            <Brain className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="modern-heading">AI Standup</h1>
            <p className="modern-text">Weekly planning conversation with your AI assistant</p>
          </div>
        </div>
      </div>

      {!currentStandup?.hasCurrentStandup ? (
        <ModernCard className="max-w-3xl mx-auto">
          <ModernCardHeader>
            <div className="text-center w-full">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h2 className="modern-subheading">Start Your Weekly Standup</h2>
              </div>
              <p className="modern-text max-w-2xl mx-auto">
                Ready to plan your week? Your AI assistant will go through your tasks, 
                ask thoughtful questions, and help you think through the details.
            </p>
            </div>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Intelligent Task Review
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Adaptive Learning
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Personalized Planning
                </div>
              </div>
              
              <Button 
                onClick={handleStartStandup}
                disabled={isLoading}
                className="modern-button modern-button-primary min-w-[200px] h-12 text-base font-semibold"
              >
                {isLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Weekly Standup
                  </>
                )}
              </Button>
            </div>
          </ModernCardContent>
        </ModernCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Modern Conversation Area */}
          <ModernCard className="lg:col-span-2">
            <ModernCardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="modern-subheading">Weekly Planning Conversation</h2>
                    <p className="modern-text">AI-powered task review and planning</p>
                  </div>
                </div>
                <StatusBadge status={currentStandup.status === 'completed' ? 'completed' : 'in_progress'}>
                  {currentStandup.status === 'completed' ? 'Completed' : 'In Progress'}
                </StatusBadge>
              </div>
            </ModernCardHeader>
            <ModernCardContent>
              <ScrollArea className="h-[400px] mb-6">
                <div className="space-y-4 p-1">
                  {conversationHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-muted/50 mr-4 border'
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {message.role === 'assistant' && (
                            <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          )}
                          {message.role === 'user' && (
                            <User className="h-4 w-4 text-primary-foreground mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <p className="text-xs mt-2 opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {currentStandup.status !== 'completed' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Type your response..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isLoading}
                      className="modern-input flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isLoading}
                      className="modern-button modern-button-primary px-6"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleNextTask}
                      disabled={isLoading}
                      className="modern-button modern-button-secondary flex-1"
                    >
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Move to Next Task
                    </Button>
                    <Button 
                      variant="outline" 
                      disabled={isLoading}
                      className="modern-button modern-button-secondary"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </ModernCardContent>
          </ModernCard>

          {/* Progress & Current Task */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Task {currentStandup.progress?.current || 0} of {currentStandup.progress?.total || 0}</span>
                    <span>{Math.round(((currentStandup.progress?.current || 0) / (currentStandup.progress?.total || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((currentStandup.progress?.current || 0) / (currentStandup.progress?.total || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentStandup.currentTask && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Task</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h3 className="font-semibold">{currentStandup.currentTask.title}</h3>
                    {currentStandup.currentTask.description && (
                      <p className="text-sm text-muted-foreground">
                        {currentStandup.currentTask.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {currentStandup.currentTask.priority && (
                        <Badge variant="outline">
                          {currentStandup.currentTask.priority}
                        </Badge>
                      )}
                      {currentStandup.currentTask.estimatedHours && (
                        <Badge variant="outline">
                          {currentStandup.currentTask.estimatedHours}h
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentStandup.status === 'completed' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Standup Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Great job! Your weekly planning session is complete. 
                    All task updates and insights have been saved.
                  </p>
                  <Button 
                    onClick={handleStartStandup}
                    variant="outline" 
                    className="w-full mt-4"
                  >
                    Start New Standup
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}