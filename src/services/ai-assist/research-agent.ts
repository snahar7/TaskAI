import OpenAI from "openai";
import { AIAssistContext } from "./index";
import { TaskAnalysis } from "./task-analyzer";

export interface ResearchResult {
  deliverables: Array<{
    type: 'research' | 'analysis';
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
}

export class ResearchAgent {
  constructor(private openai: OpenAI) {}

  async performResearch(context: AIAssistContext, analysis: TaskAnalysis): Promise<ResearchResult> {
    try {
      // Generate comprehensive research report
      const researchReport = await this.generateResearchReport(context, analysis);
      
      // Generate follow-up tasks based on research findings
      const followUpTasks = await this.generateResearchFollowUps(context, researchReport);

      return {
        deliverables: [
          {
            type: 'research',
            title: `Research Report: ${context.taskTitle}`,
            content: researchReport,
            filename: this.generateResearchFilename(context.taskTitle)
          }
        ],
        followUpTasks
      };

    } catch (error) {
      console.error('Research generation failed:', error);
      
      return {
        deliverables: [
          {
            type: 'research',
            title: `Research Report: ${context.taskTitle}`,
            content: this.generateFallbackResearch(context, error.message),
            filename: 'research_report.txt'
          }
        ]
      };
    }
  }

  private async generateResearchReport(context: AIAssistContext, analysis: TaskAnalysis): Promise<string> {
    const prompt = `Conduct comprehensive research for this task:

RESEARCH TARGET: ${context.taskTitle}
DESCRIPTION: ${context.taskDescription || 'No description provided'}

CONTEXT:
${context.parentProject ? `Project: ${context.parentProject.title}` : ''}
${context.parentGoal ? `Goal: ${context.parentGoal.title}` : ''}

TASK ANALYSIS:
- Type: ${analysis.taskType}
- Complexity: ${analysis.complexity}
- Expected Outputs: ${analysis.expectedOutputs.join(', ')}

Please provide a comprehensive research report that includes:

1. EXECUTIVE SUMMARY
   - Key findings overview
   - Main insights and conclusions

2. RESEARCH METHODOLOGY
   - Approach taken
   - Sources of information
   - Analysis framework

3. DETAILED FINDINGS
   - Core research results
   - Supporting data and evidence
   - Relevant statistics or metrics

4. ANALYSIS & INSIGHTS
   - Pattern identification
   - Trend analysis
   - Critical observations

5. COMPETITIVE/COMPARATIVE ANALYSIS (if applicable)
   - Market landscape
   - Benchmarking results
   - Best practices identified

6. RECOMMENDATIONS
   - Actionable next steps
   - Strategic recommendations
   - Implementation considerations

7. APPENDICES
   - Additional data
   - Reference materials
   - Further reading suggestions

Focus on providing practical, actionable insights that directly support the task objectives.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a senior research analyst with expertise across multiple domains. Provide comprehensive, well-structured research reports with actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    return response.choices[0].message.content;
  }

  private async generateResearchFollowUps(context: AIAssistContext, researchContent: string): Promise<Array<{
    title: string;
    description: string;
    priority?: string;
    estimatedHours?: number;
  }>> {
    const prompt = `Based on this research report, generate specific follow-up tasks:

ORIGINAL TASK: ${context.taskTitle}
RESEARCH FINDINGS: ${researchContent.substring(0, 2000)}...

Generate 3-5 specific, actionable follow-up tasks that:
- Build on the research findings
- Move toward practical implementation
- Are clearly defined and measurable
- Have appropriate priority levels
- Include realistic time estimates

Format as JSON array:
[
  {
    "title": "Task title",
    "description": "Detailed task description",
    "priority": "high|medium|low",
    "estimatedHours": 2.5
  }
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a project management expert. Generate practical, actionable follow-up tasks based on research findings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      const result = JSON.parse(response.choices[0].message.content);
      return Array.isArray(result.tasks) ? result.tasks : result.length ? result : [];

    } catch (error) {
      console.error('Follow-up task generation failed:', error);
      
      // Return basic follow-up tasks based on research context
      return [
        {
          title: `Review Research Findings: ${context.taskTitle}`,
          description: "Analyze the research report and identify key actionable insights",
          priority: "medium",
          estimatedHours: 1
        },
        {
          title: `Implement Research Recommendations`,
          description: "Execute the top recommendations from the research analysis",
          priority: "high", 
          estimatedHours: 3
        }
      ];
    }
  }

  private generateFallbackResearch(context: AIAssistContext, errorMessage: string): string {
    return `RESEARCH REPORT: ${context.taskTitle}

EXECUTIVE SUMMARY
This research task encountered technical limitations during execution. The following represents a structured approach to completing the research manually.

RESEARCH OBJECTIVE
Task: ${context.taskTitle}
Description: ${context.taskDescription || 'No description provided'}

Context:
${context.parentProject ? `- Project: ${context.parentProject.title}` : ''}
${context.parentGoal ? `- Goal: ${context.parentGoal.title}` : ''}

RECOMMENDED RESEARCH APPROACH

1. INFORMATION GATHERING
   - Identify primary sources relevant to: ${context.taskTitle}
   - Collect data from authoritative sources
   - Document methodology and source credibility

2. ANALYSIS FRAMEWORK
   - Define key research questions
   - Establish evaluation criteria
   - Create comparison methodology

3. DATA COLLECTION AREAS
   - Industry trends and patterns
   - Best practices and benchmarks
   - Competitive landscape analysis
   - Regulatory or compliance factors

4. SYNTHESIS & INSIGHTS
   - Identify key findings and patterns
   - Draw actionable conclusions
   - Develop strategic recommendations

NEXT STEPS
1. Execute manual research following this framework
2. Document findings in structured format
3. Validate conclusions with stakeholders
4. Develop implementation plan based on insights

TECHNICAL NOTE
Research automation encountered an error: ${errorMessage}
Manual research completion is recommended following the outlined approach.

DELIVERABLES CHECKLIST
□ Complete research findings document
□ Executive summary with key insights
□ Actionable recommendations
□ Implementation roadmap
□ Source documentation`;
  }

  private generateResearchFilename(taskTitle: string): string {
    const cleanTitle = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `research_${cleanTitle}.txt`;
  }
}