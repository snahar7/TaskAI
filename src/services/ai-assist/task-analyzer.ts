import OpenAI from "openai";
import { AIAssistContext } from "./index";

export interface TaskAnalysis {
  completionStrategy: 'content_generation' | 'research_analysis' | 'planning_breakdown' | 'code_implementation' | 'communication_draft' | 'generic_completion';
  taskType: string;
  complexity: 'simple' | 'medium' | 'complex';
  expectedOutputs: string[];
  requiredInputs: string[];
  confidence: number;
  reasoning: string;
  suggestedApproach: string;
}

export class TaskAnalyzer {
  constructor(private openai: OpenAI) {}

  async analyzeTask(context: AIAssistContext): Promise<TaskAnalysis> {
    const prompt = this.buildAnalysisPrompt(context);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert task analysis AI. Analyze tasks to determine the best completion strategy and approach. 

Respond with JSON in this exact format:
{
  "completionStrategy": "content_generation|research_analysis|planning_breakdown|code_implementation|communication_draft|generic_completion",
  "taskType": "description of what kind of task this is",
  "complexity": "simple|medium|complex",
  "expectedOutputs": ["list of expected deliverables"],
  "requiredInputs": ["list of information needed"],
  "confidence": 0.85,
  "reasoning": "explanation of why this strategy was chosen",
  "suggestedApproach": "high-level approach description"
}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Validate and sanitize response
      return {
        completionStrategy: this.validateCompletionStrategy(analysis.completionStrategy),
        taskType: analysis.taskType || 'Unknown task type',
        complexity: this.validateComplexity(analysis.complexity),
        expectedOutputs: Array.isArray(analysis.expectedOutputs) ? analysis.expectedOutputs : [],
        requiredInputs: Array.isArray(analysis.requiredInputs) ? analysis.requiredInputs : [],
        confidence: Math.max(0.1, Math.min(1.0, analysis.confidence || 0.5)),
        reasoning: analysis.reasoning || 'Analysis reasoning not provided',
        suggestedApproach: analysis.suggestedApproach || 'Standard completion approach'
      };

    } catch (error) {
      console.error('Task analysis failed:', error);
      
      // Fallback analysis based on simple keyword matching
      return this.generateFallbackAnalysis(context);
    }
  }

  private buildAnalysisPrompt(context: AIAssistContext): string {
    return `Analyze this task to determine the best AI completion strategy:

TASK DETAILS:
Title: ${context.taskTitle}
Description: ${context.taskDescription || 'No description provided'}

CONTEXT:
Project: ${context.parentProject?.title || 'No parent project'}
Project Description: ${context.parentProject?.description || 'Not provided'}
Goal: ${context.parentGoal?.title || 'No parent goal'}
Goal Description: ${context.parentGoal?.description || 'Not provided'}

CONSTRAINTS:
Deadline: ${context.deadline || 'Not specified'}
Priority: ${context.priority || 'Not specified'}
Estimated Hours: ${context.estimatedHours || 'Not specified'}

Based on this information, determine:
1. The most appropriate completion strategy
2. Task complexity level
3. Expected deliverable types
4. Required inputs for completion
5. Confidence level (0.0-1.0)
6. Reasoning for strategy choice
7. Suggested approach

COMPLETION STRATEGIES:
- content_generation: Creating documents, reports, presentations, written content
- research_analysis: Researching topics, analyzing data, compiling findings
- planning_breakdown: Creating plans, timelines, breaking down complex work
- code_implementation: Writing code, scripts, technical implementations
- communication_draft: Writing emails, messages, correspondence
- generic_completion: General task completion when strategy is unclear`;
  }

  private validateCompletionStrategy(strategy: string): TaskAnalysis['completionStrategy'] {
    const validStrategies: TaskAnalysis['completionStrategy'][] = [
      'content_generation',
      'research_analysis', 
      'planning_breakdown',
      'code_implementation',
      'communication_draft',
      'generic_completion'
    ];
    
    return validStrategies.includes(strategy as any) ? strategy as TaskAnalysis['completionStrategy'] : 'generic_completion';
  }

  private validateComplexity(complexity: string): TaskAnalysis['complexity'] {
    const validComplexities: TaskAnalysis['complexity'][] = ['simple', 'medium', 'complex'];
    return validComplexities.includes(complexity as any) ? complexity as TaskAnalysis['complexity'] : 'medium';
  }

  private generateFallbackAnalysis(context: AIAssistContext): TaskAnalysis {
    const title = context.taskTitle.toLowerCase();
    const description = (context.taskDescription || '').toLowerCase();
    const text = `${title} ${description}`;

    // Simple keyword-based strategy detection
    let strategy: TaskAnalysis['completionStrategy'] = 'generic_completion';
    let expectedOutputs: string[] = ['Task completion summary'];

    if (text.includes('research') || text.includes('analyze') || text.includes('investigate')) {
      strategy = 'research_analysis';
      expectedOutputs = ['Research report', 'Analysis summary'];
    } else if (text.includes('write') || text.includes('document') || text.includes('report') || text.includes('proposal')) {
      strategy = 'content_generation';
      expectedOutputs = ['Written document', 'Content deliverable'];
    } else if (text.includes('plan') || text.includes('timeline') || text.includes('strategy') || text.includes('roadmap')) {
      strategy = 'planning_breakdown';
      expectedOutputs = ['Project plan', 'Timeline', 'Task breakdown'];
    } else if (text.includes('code') || text.includes('implement') || text.includes('develop') || text.includes('program')) {
      strategy = 'code_implementation';
      expectedOutputs = ['Code implementation', 'Documentation'];
    } else if (text.includes('email') || text.includes('message') || text.includes('communication') || text.includes('draft')) {
      strategy = 'communication_draft';
      expectedOutputs = ['Communication draft'];
    }

    return {
      completionStrategy: strategy,
      taskType: 'Fallback analysis - keyword based',
      complexity: 'medium',
      expectedOutputs,
      requiredInputs: ['Task context', 'Basic requirements'],
      confidence: 0.6,
      reasoning: 'Fallback analysis based on keyword matching',
      suggestedApproach: 'Best-effort completion using available context'
    };
  }
}