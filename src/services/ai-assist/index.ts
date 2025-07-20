import OpenAI from "openai";
import { readFileSync } from "fs";
import { join } from "path";
import { TaskAnalyzer } from "./task-analyzer";
import { ContentGenerator } from "./content-generator";
import { ResearchAgent } from "./research-agent";
import { PlanningAssistant } from "./planning-assistant";
import { DeliverableManager } from "./deliverable-manager";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export interface FileContext {
  id: number;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: number;
  content?: string; // For text files that can be read
  entityType: 'goal' | 'project' | 'task' | 'subtask';
  entityId: number;
}

export interface AIAssistContext {
  taskId: number;
  taskTitle: string;
  taskDescription?: string;
  parentProject?: {
    id: number;
    title: string;
    description?: string;
  };
  parentGoal?: {
    id: number;
    title: string;
    description?: string;
  };
  deadline?: string;
  priority?: string;
  estimatedHours?: number;
  files?: FileContext[]; // Attached files with context
}

export interface AIAssistResult {
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

export class AIAssistService {
  private taskAnalyzer: TaskAnalyzer;
  private contentGenerator: ContentGenerator;
  private researchAgent: ResearchAgent;
  private planningAssistant: PlanningAssistant;
  private deliverableManager: DeliverableManager;

  constructor() {
    this.taskAnalyzer = new TaskAnalyzer(openai);
    this.contentGenerator = new ContentGenerator(openai);
    this.researchAgent = new ResearchAgent(openai);
    this.planningAssistant = new PlanningAssistant(openai);
    this.deliverableManager = new DeliverableManager();
  }

  /**
   * Main entry point for AI Assist - analyzes task and completes work
   */
  async completeTask(context: AIAssistContext): Promise<AIAssistResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Enrich context with file content
      const enrichedContext = await this.enrichContextWithFiles(context);
      
      // Step 2: Analyze task to determine completion strategy
      const analysis = await this.taskAnalyzer.analyzeTask(enrichedContext);
      
      // Step 3: Execute appropriate completion strategy
      let result: AIAssistResult;
      
      switch (analysis.completionStrategy) {
        case 'content_generation':
          result = await this.handleContentGeneration(enrichedContext, analysis);
          break;
        case 'research_analysis':
          result = await this.handleResearchAnalysis(enrichedContext, analysis);
          break;
        case 'planning_breakdown':
          result = await this.handlePlanningBreakdown(enrichedContext, analysis);
          break;
        case 'code_implementation':
          result = await this.handleCodeImplementation(enrichedContext, analysis);
          break;
        case 'communication_draft':
          result = await this.handleCommunicationDraft(enrichedContext, analysis);
          break;
        default:
          result = await this.handleGenericCompletion(enrichedContext, analysis);
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      console.error('AI Assist completion failed:', error);
      return {
        success: false,
        message: `Failed to complete task: ${error.message}`,
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Enriches context with file content from attached files
   */
  private async enrichContextWithFiles(context: AIAssistContext): Promise<AIAssistContext> {
    try {
      // Fetch files from the storage layer
      const files = await this.fetchFilesForTask(context.taskId);
      
      if (!files || files.length === 0) {
        return { ...context, files: [] };
      }

      // Process files to extract content where possible
      const enrichedFiles: FileContext[] = [];
      
      for (const file of files) {
        const enrichedFile: FileContext = {
          id: file.id,
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          entityType: 'task', // Default to task, could be determined from file path
          entityId: context.taskId
        };

        // Try to read file content for text-based files
        if (this.isTextFile(file.mimeType || file.fileName)) {
          try {
            const content = await this.readFileContent(file.fileUrl);
            enrichedFile.content = content;
          } catch (error) {
            console.warn(`Could not read content for file ${file.fileName}:`, error.message);
          }
        }

        enrichedFiles.push(enrichedFile);
      }

      return {
        ...context,
        files: enrichedFiles
      };

    } catch (error) {
      console.error('Failed to enrich context with files:', error);
      return { ...context, files: [] };
    }
  }

  /**
   * Fetches files attached to a specific task
   */
  private async fetchFilesForTask(taskId: number): Promise<any[]> {
    try {
      // Import storage interface to fetch files
      const { dbStorage } = await import('../../server/storage');
      return await dbStorage.getFilesForEntity('task', taskId);
    } catch (error) {
      console.error('Failed to fetch files for task:', error);
      return [];
    }
  }

  /**
   * Determines if a file is text-based and can be read for content
   */
  private isTextFile(mimeTypeOrFilename: string): boolean {
    const textMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json',
      'application/xml',
      'text/xml'
    ];

    const textExtensions = [
      '.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts',
      '.py', '.java', '.cpp', '.c', '.h', '.yml', '.yaml', '.toml', '.ini',
      '.log', '.sql', '.sh', '.bat', '.ps1', '.dockerfile', '.gitignore'
    ];

    // Check MIME type
    if (textMimeTypes.some(type => mimeTypeOrFilename.includes(type))) {
      return true;
    }

    // Check file extension
    return textExtensions.some(ext => 
      mimeTypeOrFilename.toLowerCase().endsWith(ext)
    );
  }

  /**
   * Reads content from a file URL (local file system)
   */
  private async readFileContent(fileUrl: string): Promise<string> {
    try {
      // If it's a local file path, read directly
      if (fileUrl.startsWith('./') || fileUrl.startsWith('/') || !fileUrl.includes('://')) {
        const filePath = fileUrl.startsWith('./') ? join(process.cwd(), fileUrl.slice(2)) : fileUrl;
        return readFileSync(filePath, 'utf-8');
      }
      
      // For HTTP URLs, fetch the content
      if (fileUrl.startsWith('http')) {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
      }

      throw new Error('Unsupported file URL format');
    } catch (error) {
      throw new Error(`Failed to read file content: ${error.message}`);
    }
  }

  /**
   * Generate suggestions for how AI can help with a task
   */
  async generateAssistSuggestions(context: AIAssistContext): Promise<Array<{
    strategy: string;
    description: string;
    confidence: number;
    estimatedTime: string;
  }>> {
    const analysis = await this.taskAnalyzer.analyzeTask(context);
    
    const suggestions = [];

    // Add strategy-specific suggestions
    if (analysis.completionStrategy === 'content_generation') {
      suggestions.push({
        strategy: 'Generate Complete Content',
        description: `Create ${analysis.expectedOutputs.join(', ')} based on task requirements`,
        confidence: analysis.confidence,
        estimatedTime: '2-5 minutes'
      });
    }

    if (analysis.completionStrategy === 'research_analysis') {
      suggestions.push({
        strategy: 'Research & Analysis',
        description: 'Perform comprehensive research and compile findings into structured report',
        confidence: analysis.confidence,
        estimatedTime: '3-7 minutes'
      });
    }

    if (analysis.completionStrategy === 'planning_breakdown') {
      suggestions.push({
        strategy: 'Create Detailed Plan',
        description: 'Generate step-by-step plan with timeline and create follow-up tasks',
        confidence: analysis.confidence,
        estimatedTime: '2-4 minutes'
      });
    }

    // Always offer generic completion as fallback
    suggestions.push({
      strategy: 'Smart Completion',
      description: 'Analyze task requirements and provide best-effort completion',
      confidence: Math.max(0.7, analysis.confidence * 0.8),
      estimatedTime: '1-3 minutes'
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Strategy-specific handlers
  private async handleContentGeneration(context: AIAssistContext, analysis: any): Promise<AIAssistResult> {
    const deliverables = await this.contentGenerator.generateContent(context, analysis);
    
    return {
      success: true,
      message: `Generated ${deliverables.length} deliverable(s) for task completion`,
      deliverables,
      confidence: analysis.confidence,
      processingTime: 0 // Will be set by caller
    };
  }

  private async handleResearchAnalysis(context: AIAssistContext, analysis: any): Promise<AIAssistResult> {
    const research = await this.researchAgent.performResearch(context, analysis);
    
    return {
      success: true,
      message: 'Completed comprehensive research and analysis',
      deliverables: research.deliverables,
      followUpTasks: research.followUpTasks,
      confidence: analysis.confidence,
      processingTime: 0
    };
  }

  private async handlePlanningBreakdown(context: AIAssistContext, analysis: any): Promise<AIAssistResult> {
    const plan = await this.planningAssistant.createDetailedPlan(context, analysis);
    
    return {
      success: true,
      message: 'Created detailed execution plan with follow-up tasks',
      deliverables: plan.deliverables,
      followUpTasks: plan.followUpTasks,
      confidence: analysis.confidence,
      processingTime: 0
    };
  }

  private async handleCodeImplementation(context: AIAssistContext, analysis: any): Promise<AIAssistResult> {
    const code = await this.contentGenerator.generateCode(context, analysis);
    
    return {
      success: true,
      message: 'Generated complete code implementation with documentation',
      deliverables: code,
      confidence: analysis.confidence,
      processingTime: 0
    };
  }

  private async handleCommunicationDraft(context: AIAssistContext, analysis: any): Promise<AIAssistResult> {
    const communication = await this.contentGenerator.generateCommunication(context, analysis);
    
    return {
      success: true,
      message: 'Drafted professional communication ready for review',
      deliverables: communication,
      confidence: analysis.confidence,
      processingTime: 0
    };
  }

  private async handleGenericCompletion(context: AIAssistContext, analysis: any): Promise<AIAssistResult> {
    const completion = await this.contentGenerator.generateGenericCompletion(context, analysis);
    
    return {
      success: true,
      message: 'Completed task with best-effort analysis and deliverables',
      deliverables: completion,
      confidence: Math.max(0.7, analysis.confidence * 0.8),
      processingTime: 0
    };
  }
}

export const aiAssistService = new AIAssistService();