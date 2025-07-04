import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the AIBreakdown interface (simplified version)
export interface AIBreakdown {
  goal: {
    title: string;
    description: string;
    timeframe: string;
  };
  projects: Array<{
    title: string;
    description: string;
    urgency: string;
    estimatedHours: number;
    dueDate: string;
    tasks: Array<{
      title: string;
      description: string;
      urgency: string;
      estimatedHours: number;
      dueDate: string;
      subtasks: Array<{
        title: string;
        description: string;
        urgency: string;
        estimatedHours: number;
        dueDate: string;
      }>;
    }>;
  }>;
}

/**
 * GPT Agent Service with Smart Depth Control
 * Analyzes goal complexity and dynamically adjusts breakdown depth
 */
export class GPTAgent {
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.model = 'gpt-4o';
    this.maxTokens = 4000;
    this.temperature = 0.7;
  }

  /**
   * Analyze goal complexity using heuristics to determine optimal breakdown depth
   * Simple goals → maxDepth = 1 (flat tasks)
   * Medium goals → maxDepth = 2 (subgoals → tasks)  
   * Complex goals → maxDepth = 3 (goals → projects → tasks → subtasks)
   */
  private analyzeGoalComplexity(goalInput: string): { complexity: 'simple' | 'medium' | 'complex'; maxDepth: number } {
    const text = goalInput.toLowerCase();
    
    // Count action verbs (strong indicators of work units)
    const actionVerbs = ['create', 'build', 'develop', 'implement', 'design', 'plan', 'setup', 'configure', 'deploy', 'test', 'write', 'research', 'analyze', 'organize', 'clean', 'prepare', 'launch', 'complete', 'finish', 'start', 'begin', 'study', 'learn', 'practice', 'review', 'update', 'install', 'fix', 'repair', 'optimize', 'improve'];
    const verbCount = actionVerbs.filter(verb => text.includes(verb)).length;
    
    // Count clauses (indicated by conjunctions and complex sentence structures)
    const conjunctions = ['and', 'or', 'but', 'then', 'after', 'before', 'while', 'when', 'if', 'because', 'since', 'although', 'however', 'therefore', 'meanwhile', 'furthermore', 'moreover', 'additionally'];
    const clauseCount = conjunctions.filter(conj => text.includes(conj)).length;
    
    // Count estimated work units (nouns that suggest deliverables)
    const workUnits = ['app', 'website', 'system', 'platform', 'dashboard', 'api', 'database', 'report', 'document', 'presentation', 'strategy', 'plan', 'design', 'prototype', 'feature', 'module', 'component', 'service', 'integration', 'workflow', 'process', 'house', 'room', 'kitchen', 'bathroom', 'project', 'business', 'company', 'team', 'event', 'campaign', 'course', 'book', 'article', 'video', 'tutorial'];
    const workUnitCount = workUnits.filter(unit => text.includes(unit)).length;
    
    // Calculate complexity score
    const complexityScore = verbCount + clauseCount + workUnitCount;
    const wordCount = text.split(/\s+/).length;
    
    console.log(`🔍 Goal Analysis: "${goalInput}"`);
    console.log(`📊 Complexity Score: ${complexityScore} (verbs: ${verbCount}, clauses: ${clauseCount}, work units: ${workUnitCount})`);
    console.log(`📝 Word Count: ${wordCount}`);
    
    // Determine complexity level
    if (complexityScore <= 2 && wordCount <= 8) {
      console.log(`✅ Classification: Simple (maxDepth = 1)`);
      return { complexity: 'simple', maxDepth: 1 };
    } else if (complexityScore <= 5 && wordCount <= 15) {
      console.log(`✅ Classification: Medium (maxDepth = 2)`);
      return { complexity: 'medium', maxDepth: 2 };
    } else {
      console.log(`✅ Classification: Complex (maxDepth = 3)`);
      return { complexity: 'complex', maxDepth: 3 };
    }
  }

  /**
   * Generate appropriate prompt template based on complexity and maxDepth
   */
  private generateSmartDepthPrompt(
    goalInput: string, 
    maxDepth: number, 
    complexity: string,
    targetDateText: string, 
    contextText: string
  ): string {
    const basePrompt = `
You are an expert project manager. Break down the goal "${goalInput}" into at most ${maxDepth} levels.
Only create additional levels if necessary for clarity.

${targetDateText}
${contextText}

Complexity detected: ${complexity}
`;

    if (maxDepth === 1) {
      // Simple goals: flat list of actionable tasks
      return basePrompt + `
Return JSON with a flat list of actionable tasks:
{
  "goal": {
    "title": "string",
    "description": "string", 
    "timeframe": "string"
  },
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "urgency": "Low|Medium|High",
      "estimatedHours": number,
      "dueDate": "YYYY-MM-DD"
    }
  ]
}

Create 3-6 specific, actionable tasks that directly achieve the goal.`;
    } else if (maxDepth === 2) {
      // Medium goals: subgoals → tasks
      return basePrompt + `
Return JSON with subgoals and their tasks:
{
  "goal": {
    "title": "string",
    "description": "string", 
    "timeframe": "string"
  },
  "subgoals": [
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
          "dueDate": "YYYY-MM-DD"
        }
      ]
    }
  ]
}

Create 2-4 logical subgoals, each with 2-4 specific tasks.`;
    } else {
      // Complex goals: projects → tasks → subtasks (original structure)
      return basePrompt + `
Return JSON with full project hierarchy:
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
}

Create 2-4 logical projects, each with 2-4 tasks, each with 2-4 actionable subtasks.`;
    }
  }

  /**
   * Adapt different response structures to our standard AIBreakdown schema
   */
  private adaptResponseToSchema(rawData: any, maxDepth: number, complexity: string): AIBreakdown {
    const goal = rawData.goal;
    
    console.log(`🔄 Adapting response for ${complexity} goal (maxDepth: ${maxDepth})`);
    
    if (maxDepth === 1) {
      // Simple: Convert flat tasks to minimal project structure
      const tasks = rawData.tasks || [];
      console.log(`📋 Converting ${tasks.length} flat tasks to project structure`);
      
      return {
        goal,
        projects: [
          {
            title: goal.title,
            description: goal.description,
            urgency: "Medium",
            estimatedHours: tasks.reduce((sum: number, task: any) => sum + (task.estimatedHours || 0), 0),
            dueDate: tasks[tasks.length - 1]?.dueDate || new Date().toISOString().split('T')[0],
            tasks: tasks.map((task: any) => ({
              ...task,
              subtasks: []
            }))
          }
        ]
      };
    } else if (maxDepth === 2) {
      // Medium: Convert subgoals to projects
      const subgoals = rawData.subgoals || [];
      console.log(`📋 Converting ${subgoals.length} subgoals to project structure`);
      
      return {
        goal,
        projects: subgoals.map((subgoal: any) => ({
          title: subgoal.title,
          description: subgoal.description,
          urgency: subgoal.urgency,
          estimatedHours: subgoal.estimatedHours,
          dueDate: subgoal.dueDate,
          tasks: (subgoal.tasks || []).map((task: any) => ({
            ...task,
            subtasks: []
          }))
        }))
      };
    } else {
      // Complex: Use original structure
      console.log(`📋 Using full project hierarchy structure`);
      return {
        goal,
        projects: rawData.projects || []
      };
    }
  }

  /**
   * Generate intelligent task breakdown from a high-level goal with Smart Depth Control
   * This is the core feature: user enters goal → AI analyzes complexity → breaks it down optimally
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
    // Analyze goal complexity to determine optimal breakdown depth
    const { complexity, maxDepth } = this.analyzeGoalComplexity(goalInput);
    
    const targetDateText = targetDate 
      ? `The user wants to complete this by ${targetDate}.` 
      : 'No specific deadline was provided.';

    const contextText = userContext 
      ? `User context: Previous goals include ${userContext.previousGoals?.join(', ') || 'none'}. 
         Skill level: ${userContext.skillLevel || 'unknown'}. 
         Time available: ${userContext.timeAvailable || 'unknown'}.`
      : '';

    // Generate dynamic prompt based on complexity analysis
    const prompt = this.generateSmartDepthPrompt(goalInput, maxDepth, complexity, targetDateText, contextText);

    try {
      console.log(`🤖 Generating ${complexity} goal breakdown with maxDepth: ${maxDepth}`);
      
      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert project manager. Always return valid JSON that matches the requested structure exactly.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Extract JSON from potential markdown formatting
      let jsonContent = content.trim();
      
      // Remove markdown code blocks if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log(`📝 Extracted JSON content (first 200 chars): ${jsonContent.substring(0, 200)}...`);
      
      // Parse JSON response and adapt to our AIBreakdown schema
      let rawData;
      try {
        rawData = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('JSON parsing failed. Raw content:', content);
        console.error('Cleaned content:', jsonContent);
        throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
      }
      
      const adaptedBreakdown = this.adaptResponseToSchema(rawData, maxDepth, complexity);
      
      console.log(`✅ Successfully generated ${complexity} goal breakdown`);
      console.log(`📊 Breakdown contains ${adaptedBreakdown.projects.length} projects`);
      
      return adaptedBreakdown;
    } catch (error) {
      console.error('Error in generateTaskBreakdown:', error);
      
      // If Smart Depth Control fails, provide a fallback with detailed error info
      if (error.message?.includes('API key') || error.message?.includes('quota')) {
        throw new Error('OpenAI API issue. Please check your API key and quota.');
      } else if (error.message?.includes('JSON')) {
        throw new Error('AI response formatting issue. Please try again.');
      } else {
        throw new Error(`Smart Depth Control error: ${error.message}`);
      }
    }
  }
}

// Export singleton instance
export const gptAgent = new GPTAgent();