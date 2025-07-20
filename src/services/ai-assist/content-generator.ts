import OpenAI from "openai";
import { AIAssistContext } from "./index";
import { TaskAnalysis } from "./task-analyzer";

export interface GeneratedContent {
  type: 'document' | 'code' | 'plan' | 'research' | 'analysis';
  title: string;
  content: string;
  filename?: string;
}

export class ContentGenerator {
  constructor(private openai: OpenAI) {}

  async generateContent(context: AIAssistContext, analysis: TaskAnalysis): Promise<GeneratedContent[]> {
    const deliverables: GeneratedContent[] = [];

    // Generate primary content based on expected outputs
    for (const expectedOutput of analysis.expectedOutputs) {
      const content = await this.generateSpecificContent(context, analysis, expectedOutput);
      if (content) {
        deliverables.push(content);
      }
    }

    // If no specific content generated, create a general deliverable
    if (deliverables.length === 0) {
      const fallbackContent = await this.generateFallbackContent(context, analysis);
      deliverables.push(fallbackContent);
    }

    return deliverables;
  }

  async generateCode(context: AIAssistContext, analysis: TaskAnalysis): Promise<GeneratedContent[]> {
    const prompt = `Generate complete, production-ready code for this task:

TASK: ${context.taskTitle}
DESCRIPTION: ${context.taskDescription || 'No description provided'}

PROJECT CONTEXT:
${context.parentProject ? `Project: ${context.parentProject.title}` : ''}
${context.parentGoal ? `Goal: ${context.parentGoal.title}` : ''}

REQUIREMENTS:
- Write clean, well-documented code
- Include error handling and validation
- Add comprehensive comments
- Follow best practices
- Include usage examples if applicable

Please provide:
1. Main implementation code
2. Supporting files (if needed)
3. Documentation/README
4. Usage examples

Format as complete, ready-to-use code files.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert software developer. Generate complete, production-ready code implementations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
      });

      const codeContent = response.choices[0].message.content;
      
      return [
        {
          type: 'code',
          title: `Code Implementation: ${context.taskTitle}`,
          content: codeContent,
          filename: this.generateCodeFilename(context.taskTitle)
        }
      ];

    } catch (error) {
      console.error('Code generation failed:', error);
      return [
        {
          type: 'code',
          title: `Code Implementation: ${context.taskTitle}`,
          content: `// Code generation failed: ${error.message}\n// Please implement manually or try again`,
          filename: 'implementation.txt'
        }
      ];
    }
  }

  async generateCommunication(context: AIAssistContext, analysis: TaskAnalysis): Promise<GeneratedContent[]> {
    const prompt = `Draft professional communication for this task:

TASK: ${context.taskTitle}
DESCRIPTION: ${context.taskDescription || 'No description provided'}

CONTEXT:
${context.parentProject ? `Project: ${context.parentProject.title}` : ''}
${context.parentGoal ? `Goal: ${context.parentGoal.title}` : ''}
${context.deadline ? `Deadline: ${context.deadline}` : ''}
${context.priority ? `Priority: ${context.priority}` : ''}

Please create appropriate communication (email, message, update, etc.) that:
- Is professional and clear
- Includes relevant context and details
- Has appropriate tone for the situation
- Includes next steps or call-to-action if needed
- Is ready to send with minimal editing

Determine the most appropriate communication type and format.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system", 
            content: "You are an expert communication specialist. Draft professional, effective communications."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3
      });

      return [
        {
          type: 'document',
          title: `Communication Draft: ${context.taskTitle}`,
          content: response.choices[0].message.content,
          filename: 'communication_draft.txt'
        }
      ];

    } catch (error) {
      console.error('Communication generation failed:', error);
      return [
        {
          type: 'document',
          title: `Communication Draft: ${context.taskTitle}`,
          content: `Communication generation failed: ${error.message}`,
          filename: 'communication_draft.txt'
        }
      ];
    }
  }

  async generateGenericCompletion(context: AIAssistContext, analysis: TaskAnalysis): Promise<GeneratedContent[]> {
    const prompt = `Complete this task comprehensively:

TASK: ${context.taskTitle}
DESCRIPTION: ${context.taskDescription || 'No description provided'}

FULL CONTEXT:
${context.parentProject ? `Project: ${context.parentProject.title} - ${context.parentProject.description || ''}` : ''}
${context.parentGoal ? `Goal: ${context.parentGoal.title} - ${context.parentGoal.description || ''}` : ''}

CONSTRAINTS:
${context.deadline ? `Deadline: ${context.deadline}` : ''}
${context.priority ? `Priority: ${context.priority}` : ''}
${context.estimatedHours ? `Estimated Hours: ${context.estimatedHours}` : ''}

TASK ANALYSIS:
Type: ${analysis.taskType}
Complexity: ${analysis.complexity}
Expected Outputs: ${analysis.expectedOutputs.join(', ')}

Please provide a comprehensive completion that includes:
1. Main deliverable addressing the task objective
2. Supporting analysis or reasoning
3. Recommendations for next steps
4. Any relevant documentation or notes

Focus on providing practical, actionable value that truly completes the task.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert task completion specialist. Provide comprehensive, practical solutions that truly complete tasks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4
      });

      return [
        {
          type: 'document',
          title: `Task Completion: ${context.taskTitle}`,
          content: response.choices[0].message.content,
          filename: this.generateDocumentFilename(context.taskTitle)
        }
      ];

    } catch (error) {
      console.error('Generic completion failed:', error);
      return [
        {
          type: 'document',
          title: `Task Completion: ${context.taskTitle}`,
          content: `Task completion failed: ${error.message}`,
          filename: 'task_completion.txt'
        }
      ];
    }
  }

  private async generateSpecificContent(context: AIAssistContext, analysis: TaskAnalysis, outputType: string): Promise<GeneratedContent | null> {
    const prompt = `Generate ${outputType} for this task:

TASK: ${context.taskTitle}
DESCRIPTION: ${context.taskDescription || 'No description provided'}

CONTEXT:
${context.parentProject ? `Project: ${context.parentProject.title}` : ''}
${context.parentGoal ? `Goal: ${context.parentGoal.title}` : ''}

Create a comprehensive ${outputType} that:
- Directly addresses the task requirements
- Is professional and well-structured
- Includes relevant details and analysis
- Is ready for immediate use
- Follows best practices for this type of deliverable

Focus on quality and completeness.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert at creating ${outputType}. Generate high-quality, professional deliverables.`
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        temperature: 0.3
      });

      return {
        type: this.determineContentType(outputType),
        title: `${outputType}: ${context.taskTitle}`,
        content: response.choices[0].message.content,
        filename: this.generateFilename(outputType, context.taskTitle)
      };

    } catch (error) {
      console.error(`Failed to generate ${outputType}:`, error);
      return null;
    }
  }

  private async generateFallbackContent(context: AIAssistContext, analysis: TaskAnalysis): Promise<GeneratedContent> {
    return {
      type: 'document',
      title: `Task Analysis: ${context.taskTitle}`,
      content: `TASK COMPLETION ANALYSIS

Task: ${context.taskTitle}
Description: ${context.taskDescription || 'No description provided'}

Analysis Results:
- Task Type: ${analysis.taskType}
- Complexity: ${analysis.complexity}
- Completion Strategy: ${analysis.completionStrategy}
- Confidence: ${(analysis.confidence * 100).toFixed(1)}%

Reasoning: ${analysis.reasoning}

Suggested Approach: ${analysis.suggestedApproach}

Expected Outputs: ${analysis.expectedOutputs.join(', ')}

Next Steps:
1. Review this analysis
2. Refine task requirements if needed
3. Execute the suggested approach
4. Create the expected deliverables

Note: This is a fallback analysis. For better results, provide more specific task details.`,
      filename: 'task_analysis.txt'
    };
  }

  private determineContentType(outputType: string): GeneratedContent['type'] {
    const type = outputType.toLowerCase();
    
    if (type.includes('code') || type.includes('script') || type.includes('implementation')) {
      return 'code';
    }
    if (type.includes('plan') || type.includes('timeline') || type.includes('roadmap')) {
      return 'plan';
    }
    if (type.includes('research') || type.includes('findings')) {
      return 'research';
    }
    if (type.includes('analysis') || type.includes('evaluation')) {
      return 'analysis';
    }
    
    return 'document';
  }

  private generateFilename(outputType: string, taskTitle: string): string {
    const cleanTitle = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const cleanOutput = outputType.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${cleanOutput}_${cleanTitle}.txt`;
  }

  private generateDocumentFilename(taskTitle: string): string {
    const cleanTitle = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `completion_${cleanTitle}.txt`;
  }

  private generateCodeFilename(taskTitle: string): string {
    const cleanTitle = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `implementation_${cleanTitle}.js`;
  }
}