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
   * Enhanced complexity analyzer with better heuristics
   * Analyzes intent patterns, time indicators, scope keywords, and domain complexity
   */
  private analyzeGoalComplexity(goalInput: string): { 
    complexity: 'simple' | 'medium' | 'complex'; 
    maxDepth: number;
    analysis: {
      intentPattern: string;
      timeIndicators: string[];
      scopeLevel: string;
      domain: string;
      reasoning: string;
    }
  } {
    const text = goalInput.toLowerCase();
    const words = text.split(/\s+/);
    const wordCount = words.length;
    
    // 1. Intent Pattern Analysis
    let intentPattern = 'action';
    if (text.match(/^(i want to|i need to|i would like to)/)) {
      intentPattern = 'personal_desire';
    } else if (text.match(/^(build|create|develop|launch)/)) {
      intentPattern = 'creation';
    } else if (text.match(/^(learn|study|master|understand)/)) {
      intentPattern = 'learning';
    } else if (text.match(/^(plan|organize|prepare)/)) {
      intentPattern = 'planning';
    }
    
    // 2. Time Indicators
    const timeIndicators = [];
    const urgentWords = ['tonight', 'today', 'asap', 'urgent', 'quick'];
    const shortTermWords = ['this week', 'weekend', 'soon', 'next week'];
    const longTermWords = ['month', 'year', 'eventually', 'someday'];
    
    if (urgentWords.some(word => text.includes(word))) timeIndicators.push('urgent');
    if (shortTermWords.some(word => text.includes(word))) timeIndicators.push('short_term');
    if (longTermWords.some(word => text.includes(word))) timeIndicators.push('long_term');
    
    // 3. Scope Keywords Analysis
    const simpleScope = ['clean', 'organize', 'fix', 'call', 'email', 'buy', 'read'];
    const mediumScope = ['project', 'plan', 'design', 'setup', 'configure', 'implement'];
    const complexScope = ['enterprise', 'comprehensive', 'complete', 'full-scale', 'end-to-end', 'ecosystem'];
    
    let scopeLevel = 'medium';
    if (simpleScope.some(word => text.includes(word))) scopeLevel = 'simple';
    if (complexScope.some(word => text.includes(word))) scopeLevel = 'complex';
    
    // 4. Domain Complexity
    const personalDomains = ['room', 'house', 'personal', 'self', 'fitness', 'health'];
    const businessDomains = ['business', 'company', 'startup', 'revenue', 'customers'];
    const technicalDomains = ['app', 'website', 'system', 'api', 'database', 'software', 'code'];
    
    let domain = 'general';
    if (personalDomains.some(word => text.includes(word))) domain = 'personal';
    if (businessDomains.some(word => text.includes(word))) domain = 'business';
    if (technicalDomains.some(word => text.includes(word))) domain = 'technical';
    
    // 5. Advanced scoring with multiple factors
    let complexityScore = 0;
    
    // Base word count scoring
    if (wordCount > 20) complexityScore += 3;
    else if (wordCount > 10) complexityScore += 2;
    else if (wordCount > 5) complexityScore += 1;
    
    // Intent pattern scoring
    if (intentPattern === 'creation') complexityScore += 2;
    if (intentPattern === 'planning') complexityScore += 1;
    
    // Time scoring (longer term = more complex)
    if (timeIndicators.includes('long_term')) complexityScore += 2;
    else if (timeIndicators.includes('urgent')) complexityScore -= 1;
    
    // Scope scoring
    if (scopeLevel === 'complex') complexityScore += 3;
    else if (scopeLevel === 'simple') complexityScore -= 1;
    
    // Domain scoring
    if (domain === 'technical') complexityScore += 2;
    else if (domain === 'business') complexityScore += 1;
    
    // 6. Determine final complexity with reasoning
    let complexity: 'simple' | 'medium' | 'complex';
    let maxDepth: number;
    let reasoning: string;
    
    if (complexityScore <= 2) {
      complexity = 'simple';
      maxDepth = 1;
      reasoning = `Simple task: ${scopeLevel} scope, ${domain} domain, ${timeIndicators.join(',') || 'no time pressure'}`;
    } else if (complexityScore <= 6) {
      complexity = 'medium';
      maxDepth = 2;
      reasoning = `Medium project: ${intentPattern} intent, ${scopeLevel} scope, needs sub-planning`;
    } else {
      complexity = 'complex';
      maxDepth = 3;
      reasoning = `Complex initiative: ${domain} domain, ${scopeLevel} scope, requires full hierarchy`;
    }
    
    console.log(`🔍 Enhanced Goal Analysis: "${goalInput}"`);
    console.log(`📊 Complexity Score: ${complexityScore}`);
    console.log(`🎯 Intent: ${intentPattern}, Domain: ${domain}, Scope: ${scopeLevel}`);
    console.log(`⏱️ Time Indicators: ${timeIndicators.join(', ') || 'none'}`);
    console.log(`✅ Classification: ${complexity} (maxDepth = ${maxDepth})`);
    console.log(`🧠 Reasoning: ${reasoning}`);
    
    return {
      complexity,
      maxDepth,
      analysis: {
        intentPattern,
        timeIndicators,
        scopeLevel,
        domain,
        reasoning
      }
    };
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
    const { complexity, maxDepth, analysis } = this.analyzeGoalComplexity(goalInput);
    
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

      // Parse JSON response (handle markdown code blocks)
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const rawData = JSON.parse(cleanContent);
      const adaptedBreakdown = this.adaptResponseToSchema(rawData, maxDepth, complexity);
      
      console.log(`✅ Successfully generated ${complexity} goal breakdown`);
      return adaptedBreakdown;
    } catch (error) {
      console.error('Error in generateTaskBreakdown:', error);
      throw error;
    }
  }

  /**
   * Break down a specific task/project further using AI with rich context
   * This allows users to get more detailed breakdown of any existing item
   */
  async breakDownItemFurther(
    itemType: 'task' | 'subtask' | 'project',
    itemData: {
      title: string;
      description?: string;
      estimatedHours?: number;
      priority?: string;
      parentContext?: {
        projectTitle?: string;
        goalTitle?: string;
        description?: string;
      };
    },
    options?: {
      targetSubItems?: number; // How many sub-items to generate
      focusArea?: string; // Specific area to focus breakdown on
    }
  ): Promise<{
    subItems: Array<{
      title: string;
      description: string;
      urgency: string;
      estimatedHours: number;
      dueDate: string;
    }>;
    analysis: {
      complexity: string;
      reasoning: string;
      suggestions: string[];
    };
  }> {
    console.log(`🔧 Breaking down ${itemType}: "${itemData.title}"`);
    
    // Build context-rich prompt
    const contextText = itemData.parentContext 
      ? `This ${itemType} is part of project "${itemData.parentContext.projectTitle}" under goal "${itemData.parentContext.goalTitle}".`
      : '';
    
    const focusText = options?.focusArea 
      ? `Focus the breakdown specifically on: ${options.focusArea}.`
      : '';
    
    const targetCount = options?.targetSubItems || 4;
    
    const prompt = `
You are an expert project manager. Break down this ${itemType} into ${targetCount} specific, actionable sub-items.

${itemType.toUpperCase()}: "${itemData.title}"
Description: ${itemData.description || 'Not provided'}
Priority: ${itemData.priority || 'Medium'}
Estimated Hours: ${itemData.estimatedHours || 'Not specified'}

${contextText}
${focusText}

Guidelines:
- Create ${targetCount} specific, actionable sub-items
- Each sub-item should be completable in 15 minutes to 2 hours
- Include realistic time estimates and due dates  
- Make each sub-item clear and specific
- Consider dependencies and logical order
- Add helpful implementation details

Return JSON in this exact format:
{
  "subItems": [
    {
      "title": "Specific actionable task",
      "description": "Clear description with implementation details",
      "urgency": "Low|Medium|High", 
      "estimatedHours": 0.5,
      "dueDate": "YYYY-MM-DD"
    }
  ],
  "analysis": {
    "complexity": "Assessment of breakdown complexity",
    "reasoning": "Why this breakdown approach was chosen",
    "suggestions": ["Additional tip 1", "Additional tip 2"]
  }
}`;

    try {
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

      // Parse JSON response (handle markdown code blocks)
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const breakdown = JSON.parse(cleanContent);
      
      console.log(`✅ Successfully generated breakdown for ${itemType}: ${breakdown.subItems.length} sub-items`);
      return breakdown;
    } catch (error) {
      console.error(`Error breaking down ${itemType}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const gptAgent = new GPTAgent();