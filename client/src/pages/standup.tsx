import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Play, ArrowRight, CheckCircle, Clock, User } from 'lucide-react';

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Standup Assistant</h1>
        <p className="text-muted-foreground">
          Have a conversation with your AI assistant to plan and refine your weekly tasks
        </p>
      </div>

      {!currentStandup?.hasCurrentStandup ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Start Your Weekly Standup
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Ready to plan your week? Your AI assistant will go through your tasks, 
              ask thoughtful questions, and help you think through the details.
            </p>
            <Button 
              onClick={handleStartStandup}
              disabled={isLoading}
              size="lg"
              className="min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Standup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation Area */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Weekly Planning Conversation
                </div>
                <Badge variant={currentStandup.status === 'completed' ? 'default' : 'secondary'}>
                  {currentStandup.status === 'completed' ? 'Completed' : 'In Progress'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] mb-4">
                <div className="space-y-4">
                  {conversationHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground ml-4'
                            : 'bg-muted mr-4'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {currentStandup.status !== 'completed' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your response..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isLoading}
                    >
                      Send
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleNextTask}
                    disabled={isLoading}
                    className="w-full"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Move to Next Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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