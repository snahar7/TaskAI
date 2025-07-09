import OpenAI from "openai";
import { Task, UserPreference, AiInsight, StandupConversation, InsertTask } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    taskId?: number;
    actionType?: 'question' | 'suggestion' | 'create_task' | 'update_task';
    taskData?: any;
  };
}

export interface ConversationState {
  conversationId: string;
  currentTaskIndex: number;
  tasksToDiscuss: Task[];
  conversationHistory: ConversationMessage[];
  userPreferences: UserPreference[];
  aiInsights: AiInsight[];
  pendingActions: {
    taskUpdates: Array<{ taskId: number; updates: Partial<Task> }>;
    newTasks: Array<{ taskData: InsertTask; parentId?: number; parentType?: string }>;
  };
}

export class AIConversationService {
  private model: string = "gpt-4o"; // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

  /**
   * Initialize a new weekly standup conversation
   */
  async initializeWeeklyStandup(
    userId: number,
    weekTasks: Task[],
    userPreferences: UserPreference[],
    aiInsights: AiInsight[]
  ): Promise<ConversationState> {
    const conversationId = `standup_${userId}_${Date.now()}`;
    
    const initialState: ConversationState = {
      conversationId,
      currentTaskIndex: 0,
      tasksToDiscuss: weekTasks,
      conversationHistory: [],
      userPreferences,
      aiInsights,
      pendingActions: {
        taskUpdates: [],
        newTasks: []
      }
    };

    // Generate opening message
    const openingMessage = await this.generateOpeningMessage(initialState);
    
    initialState.conversationHistory.push({
      role: 'assistant',
      content: openingMessage,
      timestamp: new Date(),
      metadata: { actionType: 'question' }
    });

    return initialState;
  }

  /**
   * Process user response and continue conversation
   */
  async processUserResponse(
    conversationState: ConversationState,
    userResponse: string
  ): Promise<{
    updatedState: ConversationState;
    aiResponse: string;
    suggestedActions: Array<{
      type: 'update_task' | 'create_task' | 'next_task' | 'complete_standup';
      description: string;
      data?: any;
    }>;
  }> {
    // Add user response to conversation history
    conversationState.conversationHistory.push({
      role: 'user',
      content: userResponse,
      timestamp: new Date()
    });

    // Generate AI response based on conversation context
    const aiResponse = await this.generateContextualResponse(conversationState, userResponse);
    
    // Parse AI response for actionable insights
    const { responseText, suggestedActions } = await this.parseAIResponse(aiResponse, conversationState);
    
    // Process suggested actions and add to pending actions
    const currentTask = conversationState.tasksToDiscuss[conversationState.currentTaskIndex];
    for (const action of suggestedActions) {
      if (action.type === 'update_task' && currentTask) {
        conversationState.pendingActions.taskUpdates.push({
          taskId: currentTask.id,
          updates: action.data || {}
        });
      } else if (action.type === 'create_task') {
        conversationState.pendingActions.newTasks.push({
          taskData: action.data || {},
          parentId: currentTask?.id,
          parentType: 'task'
        });
      }
    }
    
    // Update conversation state with AI response
    conversationState.conversationHistory.push({
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
      metadata: { 
        actionType: 'suggestion',
        taskId: currentTask?.id,
        suggestedActions: suggestedActions.length
      }
    });

    return {
      updatedState: conversationState,
      aiResponse: responseText,
      suggestedActions
    };
  }

  /**
   * Generate opening message for the weekly standup
   */
  private async generateOpeningMessage(state: ConversationState): Promise<string> {
    const currentTask = state.tasksToDiscuss[state.currentTaskIndex];
    
    // Build context from user preferences and insights
    const userContext = this.buildUserContext(state.userPreferences, state.aiInsights);
    
    const prompt = `
You are an intelligent AI assistant conducting a weekly planning conversation. Your role is to help the user think through their tasks more thoroughly and make improvements.

USER CONTEXT:
${userContext}

CURRENT TASK TO DISCUSS:
Task: "${currentTask.title}"
Description: ${currentTask.description || 'No description provided'}
Estimated Hours: ${currentTask.estimatedHours || 'Not estimated'}
Due Date: ${currentTask.dueDate || 'No due date'}
Priority: ${currentTask.priority || 'Not set'}

CONVERSATION STYLE:
- Be conversational and friendly, like a knowledgeable colleague
- Ask 1-2 specific, insightful questions about this task
- Reference user's past patterns when relevant
- Focus on helping them think through details they might have missed
- Don't ask generic questions - be specific and actionable

Generate a friendly opening message that introduces the weekly planning session and asks thoughtful questions about the current task.
`;

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an intelligent AI planning assistant. Be conversational, insightful, and helpful.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "Let's start planning your week! Tell me about your first task.";
  }

  /**
   * Generate contextual response based on conversation history
   */
  private async generateContextualResponse(
    state: ConversationState,
    userResponse: string
  ): Promise<string> {
    const currentTask = state.tasksToDiscuss[state.currentTaskIndex];
    const userContext = this.buildUserContext(state.userPreferences, state.aiInsights);
    
    // Build conversation history for context
    const recentHistory = state.conversationHistory
      .slice(-4) // Last 4 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `
You are continuing a weekly planning conversation with a user. Analyze their response and provide helpful insights.

USER CONTEXT:
${userContext}

CURRENT TASK:
${currentTask.title} - ${currentTask.description || 'No description'}

RECENT CONVERSATION:
${recentHistory}

USER'S LATEST RESPONSE:
${userResponse}

INSTRUCTIONS:
1. Analyze the user's response for insights about their approach to this task
2. Identify any gaps, missing considerations, or potential improvements
3. Suggest specific actions or new tasks if needed
4. Ask follow-up questions if more clarity is needed
5. Be helpful and specific, not generic
6. If this task discussion seems complete, suggest moving to the next task

RESPONSE FORMAT:
Return a JSON object with:
{
  "response": "Your conversational response to the user",
  "insights": ["Any insights learned about user patterns"],
  "suggestions": [
    {
      "type": "update_task|create_task|next_task",
      "description": "Description of suggested action",
      "data": {} // relevant data for the action
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an intelligent AI planning assistant. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    return response.choices[0]?.message?.content || '{"response": "I understand. Let me help you with that.", "insights": [], "suggestions": []}';
  }

  /**
   * Parse AI response and extract actionable insights
   */
  private async parseAIResponse(
    aiResponse: string,
    state: ConversationState
  ): Promise<{
    responseText: string;
    suggestedActions: Array<{
      type: 'update_task' | 'create_task' | 'next_task' | 'complete_standup';
      description: string;
      data?: any;
    }>;
  }> {
    try {
      const parsed = JSON.parse(aiResponse);
      
      // Store insights for future use
      if (parsed.insights && parsed.insights.length > 0) {
        // These would be saved to the database in a real implementation
        console.log('New insights learned:', parsed.insights);
      }

      return {
        responseText: parsed.response,
        suggestedActions: parsed.suggestions || []
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        responseText: aiResponse,
        suggestedActions: []
      };
    }
  }

  /**
   * Build user context from preferences and insights
   */
  private buildUserContext(preferences: UserPreference[], insights: AiInsight[]): string {
    const preferenceContext = preferences.map(p => 
      `${p.preferenceType}: ${p.preferenceKey} = ${p.preferenceValue}`
    ).join('\n');

    const insightContext = insights.map(i => 
      `${i.insightCategory}: ${i.insight}`
    ).join('\n');

    return `
USER PREFERENCES:
${preferenceContext || 'No preferences stored yet'}

LEARNED INSIGHTS:
${insightContext || 'No insights learned yet'}
`;
  }

  /**
   * Move to next task in the conversation
   */
  async moveToNextTask(state: ConversationState): Promise<{
    updatedState: ConversationState;
    aiResponse: string;
    isComplete: boolean;
  }> {
    state.currentTaskIndex++;
    
    if (state.currentTaskIndex >= state.tasksToDiscuss.length) {
      // Standup is complete
      const completionMessage = await this.generateCompletionMessage(state);
      return {
        updatedState: state,
        aiResponse: completionMessage,
        isComplete: true
      };
    }

    // Generate message for next task
    const nextTaskMessage = await this.generateNextTaskMessage(state);
    
    state.conversationHistory.push({
      role: 'assistant',
      content: nextTaskMessage,
      timestamp: new Date(),
      metadata: { 
        actionType: 'question',
        taskId: state.tasksToDiscuss[state.currentTaskIndex].id
      }
    });

    return {
      updatedState: state,
      aiResponse: nextTaskMessage,
      isComplete: false
    };
  }

  /**
   * Generate message for next task
   */
  private async generateNextTaskMessage(state: ConversationState): Promise<string> {
    const currentTask = state.tasksToDiscuss[state.currentTaskIndex];
    const userContext = this.buildUserContext(state.userPreferences, state.aiInsights);
    
    const prompt = `
You are continuing a weekly planning conversation. The user has finished discussing the previous task and now you're moving to the next one.

USER CONTEXT:
${userContext}

NEXT TASK TO DISCUSS:
Task: "${currentTask.title}"
Description: ${currentTask.description || 'No description provided'}
Estimated Hours: ${currentTask.estimatedHours || 'Not estimated'}
Due Date: ${currentTask.dueDate || 'No due date'}
Priority: ${currentTask.priority || 'Not set'}

PROGRESS: Task ${state.currentTaskIndex + 1} of ${state.tasksToDiscuss.length}

Generate a smooth transition message introducing the next task and asking thoughtful questions about it.
`;

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an intelligent AI planning assistant. Be conversational and helpful.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "Let's move on to your next task.";
  }

  /**
   * Generate completion message for finished standup
   */
  private async generateCompletionMessage(state: ConversationState): Promise<string> {
    const totalTasks = state.tasksToDiscuss.length;
    const tasksWithUpdates = state.pendingActions.taskUpdates.length;
    const newTasks = state.pendingActions.newTasks.length;

    const prompt = `
You have completed a weekly planning conversation with the user. Generate a summary message.

CONVERSATION SUMMARY:
- Total tasks discussed: ${totalTasks}
- Tasks with updates: ${tasksWithUpdates}
- New tasks created: ${newTasks}
- Insights learned: ${state.conversationHistory.filter(m => m.metadata?.actionType === 'suggestion').length}

Generate a friendly completion message that summarizes what was accomplished and what actions will be taken.
`;

    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an intelligent AI planning assistant. Be encouraging and professional.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    return response.choices[0]?.message?.content || "Great job planning your week! All updates will be applied to your tasks.";
  }
}

export const aiConversationService = new AIConversationService();