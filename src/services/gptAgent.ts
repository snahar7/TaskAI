import { OpenAI } from 'openai';
import { appConfig } from '@/app/config';
import type { AIBreakdown } from '@/schema/ai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * GPT Agent Service - Handles all AI-powered task management features
 * This service provides intelligent task breakdown, completion predictions, and insights
 */
export class GPTAgent {
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.model = appConfig.openai.model;
    this.maxTokens = appConfig.openai.maxTokens;
    this.temperature = appConfig.openai.temperature;
  }

  /**
   * Generate intelligent task breakdown from a high-level goal
   * This is the core feature: user enters goal → AI breaks it → structured output
   */
  async generateTaskBreakdown(
    goalInput: string,
    targetDate?: string,
    userContext?: {
      previousGoals?: string[];
      skillLevel?: string;
      timeAvailable?: string;
    }
  ): Promise<AIBreakdown> {
    const targetDateText = targetDate 
      ? `The user wants to complete this by ${targetDate}.` 
      : 'No specific deadline was provided.';

    const contextText = userContext 
      ? `User context: Previous goals include ${userContext.previousGoals?.join(', ') || 'none'}. 
         Skill level: ${userContext.skillLevel || 'unknown'}. 
         Time available: ${userContext.timeAvailable || 'unknown'}.`
      : '';

    const prompt = `
You are an expert project manager and productivity coach. Break down this goal into a structured hierarchy of projects, tasks, and subtasks.

GOAL: "${goalInput}"
${targetDateText}
${contextText}

Create a detailed breakdown with:
1. Main goal with clear description and realistic timeframe
2. 2-4 projects that achieve the goal
3. 3-5 tasks per project with specific actions
4. 2-4 subtasks per task with actionable steps

For each item, provide:
- Clear, specific title
- Detailed description
- Urgency level (Low/Medium/High)
- Estimated hours (be realistic)
- Due date (distribute logically from today to target)

Return valid JSON matching this structure:
{
  "goal": {
    "title": "string",
    "description": "string", 
    "timeframe": "string"
  },
  "projects": [
    {
      "title": "string",
      "description": "string",
      "urgency": "Low|Medium|High",
      "estimatedHours": number,
      "dueDate": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "string",
          "description": "string", 
          "urgency": "Low|Medium|High",
          "estimatedHours": number,
          "dueDate": "YYYY-MM-DD",
          "subtasks": [
            {
              "title": "string",
              "description": "string",
              "urgency": "Low|Medium|High", 
              "estimatedHours": number,
              "dueDate": "YYYY-MM-DD"
            }
          ]
        }
      ]
    }
  ]
}`;

    try {
      const completion = await this.callOpenAI(prompt);
      const breakdown = JSON.parse(completion) as AIBreakdown;
      
      // Validate the structure
      this.validateBreakdown(breakdown);
      
      return breakdown;
    } catch (error) {
      console.error('GPT Agent - Task breakdown error:', error);
      throw new Error(`Failed to generate task breakdown: ${error.message}`);
    }
  }

  /**
   * Generate completion time predictions for tasks
   */
  async predictCompletionTime(
    taskTitle: string,
    taskDescription: string,
    similarTasks?: Array<{ title: string; actualTime: number }>
  ): Promise<{
    estimatedHours: number;
    confidence: number;
    reasoning: string;
  }> {
    const similarTasksText = similarTasks?.length 
      ? `Similar completed tasks: ${similarTasks.map(t => `${t.title} (${t.actualTime}h)`).join(', ')}`
      : 'No similar task history available.';

    const prompt = `
Analyze this task and predict completion time:

TASK: "${taskTitle}"
DESCRIPTION: "${taskDescription}"
${similarTasksText}

Provide realistic time estimate considering:
- Task complexity and scope
- Required research/setup time  
- Potential blockers or iterations
- Similar task patterns if available

Return JSON:
{
  "estimatedHours": number,
  "confidence": number (0-100),
  "reasoning": "string explaining your estimate"
}`;

    try {
      const completion = await this.callOpenAI(prompt);
      return JSON.parse(completion);
    } catch (error) {
      console.error('GPT Agent - Completion prediction error:', error);
      throw new Error(`Failed to predict completion time: ${error.message}`);
    }
  }

  /**
   * Generate daily standup insights and recommendations
   */
  async generateStandupInsights(
    completedTasks: string[],
    blockers: string[],
    upcomingTasks: string[]
  ): Promise<{
    insights: string[];
    recommendations: string[];
    prioritySuggestions: string[];
  }> {
    const prompt = `
Analyze this daily progress and provide actionable insights:

COMPLETED TASKS:
${completedTasks.map(task => `- ${task}`).join('\n')}

CURRENT BLOCKERS:
${blockers.map(blocker => `- ${blocker}`).join('\n')}

UPCOMING TASKS:
${upcomingTasks.map(task => `- ${task}`).join('\n')}

Provide JSON response:
{
  "insights": ["observation about progress patterns"],
  "recommendations": ["specific actions to improve"],
  "prioritySuggestions": ["which tasks to focus on next"]
}`;

    try {
      const completion = await this.callOpenAI(prompt);
      return JSON.parse(completion);
    } catch (error) {
      console.error('GPT Agent - Standup insights error:', error);
      throw new Error(`Failed to generate standup insights: ${error.message}`);
    }
  }

  /**
   * Suggest task dependencies and optimal ordering
   */
  async analyzeDependencies(
    tasks: Array<{ id: number; title: string; description: string }>
  ): Promise<{
    dependencies: Array<{ taskId: number; dependsOn: number[] }>;
    optimalOrder: number[];
    reasoning: string;
  }> {
    const tasksText = tasks.map(t => `ID ${t.id}: ${t.title} - ${t.description}`).join('\n');

    const prompt = `
Analyze these tasks and suggest dependencies and optimal execution order:

TASKS:
${tasksText}

Consider:
- Which tasks must be completed before others can start
- Logical workflow and dependencies
- Parallel execution opportunities
- Risk mitigation through proper sequencing

Return JSON:
{
  "dependencies": [{"taskId": number, "dependsOn": [number]}],
  "optimalOrder": [number],
  "reasoning": "string explaining the recommended order"
}`;

    try {
      const completion = await this.callOpenAI(prompt);
      return JSON.parse(completion);
    } catch (error) {
      console.error('GPT Agent - Dependency analysis error:', error);
      throw new Error(`Failed to analyze dependencies: ${error.message}`);
    }
  }

  /**
   * Core OpenAI API call with error handling and timeout
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const timeout = appConfig.api.timeout;
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('OpenAI API timeout'));
      }, timeout);

      try {
        const completion = await openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert project manager and productivity coach. Always return valid JSON responses as requested.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          max_tokens: this.maxTokens,
          temperature: this.temperature,
        });

        clearTimeout(timeoutId);
        
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No response from OpenAI');
        }

        resolve(content);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Validate AI-generated breakdown structure
   */
  private validateBreakdown(breakdown: any): void {
    if (!breakdown.goal || !breakdown.projects) {
      throw new Error('Invalid breakdown structure: missing goal or projects');
    }

    if (!Array.isArray(breakdown.projects) || breakdown.projects.length === 0) {
      throw new Error('Invalid breakdown: projects must be a non-empty array');
    }

    breakdown.projects.forEach((project: any, index: number) => {
      if (!project.tasks || !Array.isArray(project.tasks)) {
        throw new Error(`Invalid project ${index}: missing tasks array`);
      }
    });
  }
}

// Export singleton instance
export const gptAgent = new GPTAgent();