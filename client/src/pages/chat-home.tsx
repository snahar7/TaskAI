import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Check, X, Edit2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  entityProposal?: EntityProposal;
}

interface EntityProposal {
  type: 'goal' | 'project' | 'task' | 'subtask';
  title: string;
  description: string;
  priority: string;
  estimatedDuration: string;
  deadline: string;
  assignedTo?: string;
  parentId?: number;
  parentType?: string;
  confidence: number;
  reasoning: string;
}

export default function ChatHomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingProposal, setEditingProposal] = useState<EntityProposal | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeInputMutation = useMutation({
    mutationFn: async (userInput: string) => {
      const response = await fetch('/api/chat/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: userInput })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze input');
      }
      
      return response.json();
    },
    onSuccess: (data, userInput) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: userInput,
        timestamp: new Date()
      };

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I understand you want to work on: "${userInput}"\n\nBased on your input, I believe this is a ${data.proposal.type}. Here's what I've prepared:`,
        timestamp: new Date(),
        entityProposal: data.proposal
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    }
  });

  const createEntityMutation = useMutation({
    mutationFn: async (proposal: EntityProposal) => {
      const endpoint = `/api/${proposal.type}s`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: proposal.title,
          name: proposal.title,
          description: proposal.description,
          priority: proposal.priority,
          estimatedDuration: proposal.estimatedDuration,
          deadline: proposal.deadline ? new Date(proposal.deadline).toISOString() : null,
          assignedTo: proposal.assignedTo ? parseInt(proposal.assignedTo) : null,
          status: 'planning',
          percentComplete: '0.00',
          ...(proposal.parentId && { 
            [`${proposal.parentType}Id`]: proposal.parentId 
          })
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create entity');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hierarchy'] });
      
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: "Perfect! I've created your item successfully. You can now view it in your task hierarchy. Is there anything else you'd like to work on?",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, successMessage]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    
    setIsLoading(true);
    analyzeInputMutation.mutate(input);
    setInput("");
  };

  const handleApprove = (proposal: EntityProposal) => {
    createEntityMutation.mutate(proposal);
  };

  const handleEdit = (proposal: EntityProposal) => {
    setEditingProposal({ ...proposal });
  };

  const handleSaveEdit = () => {
    if (!editingProposal) return;
    
    setMessages(prev => prev.map(msg => 
      msg.entityProposal ? {
        ...msg,
        entityProposal: editingProposal,
        content: `I understand you want to work on: "${editingProposal.title}"\n\nBased on your input, I believe this is a ${editingProposal.type}. Here's what I've prepared:`
      } : msg
    ));
    
    setEditingProposal(null);
  };

  const handleReject = () => {
    const rejectionMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'ai',
      content: "No problem! Feel free to provide more details about what you'd like to work on, and I'll analyze it again.",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, rejectionMessage]);
  };

  const renderEntityProposal = (proposal: EntityProposal, isEditing: boolean = false) => {
    if (isEditing && editingProposal) {
      return (
        <Card className="mt-3 border-blue-200 bg-blue-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-900">Edit Details</h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {editingProposal.type}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-blue-900">Title</label>
                <Input
                  value={editingProposal.title}
                  onChange={(e) => setEditingProposal({...editingProposal, title: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-blue-900">Priority</label>
                <select
                  value={editingProposal.priority}
                  onChange={(e) => setEditingProposal({...editingProposal, priority: e.target.value})}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-blue-900">Estimated Duration</label>
                <Input
                  value={editingProposal.estimatedDuration}
                  onChange={(e) => setEditingProposal({...editingProposal, estimatedDuration: e.target.value})}
                  placeholder="e.g., 2 weeks, 40 hours"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-blue-900">Deadline</label>
                <Input
                  type="date"
                  value={editingProposal.deadline}
                  onChange={(e) => setEditingProposal({...editingProposal, deadline: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-blue-900">Description</label>
              <textarea
                value={editingProposal.description}
                onChange={(e) => setEditingProposal({...editingProposal, description: e.target.value})}
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} size="sm">
                <Check className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
              <Button onClick={() => setEditingProposal(null)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="mt-3 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-green-900">Proposed {proposal.type.charAt(0).toUpperCase() + proposal.type.slice(1)}</h4>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {Math.round(proposal.confidence)}% confident
            </Badge>
          </div>
          
          <div className="space-y-2 text-sm">
            <div><strong>Title:</strong> {proposal.title}</div>
            <div><strong>Description:</strong> {proposal.description}</div>
            <div><strong>Priority:</strong> <Badge variant="outline">{proposal.priority}</Badge></div>
            <div><strong>Estimated Duration:</strong> {proposal.estimatedDuration}</div>
            {proposal.deadline && <div><strong>Deadline:</strong> {new Date(proposal.deadline).toLocaleDateString()}</div>}
          </div>
          
          <div className="mt-3 p-2 bg-white rounded border text-xs text-gray-600">
            <strong>AI Reasoning:</strong> {proposal.reasoning}
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={() => handleApprove(proposal)} size="sm" className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-1" />
              Approve & Create
            </Button>
            <Button onClick={() => handleEdit(proposal)} variant="outline" size="sm">
              <Edit2 className="w-4 h-4 mr-1" />
              Edit Details
            </Button>
            <Button onClick={handleReject} variant="outline" size="sm" className="text-red-600 border-red-200">
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Taflo</h1>
          <p className="text-gray-600">What would you like to work on today?</p>
        </div>

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="mb-6 space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start space-x-2 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {message.type === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                  </div>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white border shadow-sm'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.entityProposal && renderEntityProposal(message.entityProposal)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Section */}
        <div className="relative">
          <Card className={`border-2 transition-all duration-200 ${messages.length === 0 ? 'shadow-lg border-blue-200' : 'border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex space-x-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={messages.length === 0 ? "Tell me what you want to accomplish..." : "Continue the conversation..."}
                  className="text-lg p-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="lg"
                  className="px-6"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sample Prompts */}
        {messages.length === 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">Try something like:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "Launch a new mobile app",
                "Organize team offsite event", 
                "Write quarterly report",
                "Fix login bug",
                "Research competitor analysis"
              ].map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(prompt)}
                  className="text-xs"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Editing Modal Overlay */}
        {editingProposal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              {renderEntityProposal(editingProposal, true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}