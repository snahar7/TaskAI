import OpenAI from "openai";
import { AIAssistContext } from "./index";
import { TaskAnalysis } from "./task-analyzer";

export interface PlanningResult {
  deliverables: Array<{
    type: 'plan' | 'analysis';
    title: string;
    content: string;
    filename?: string;
  }>;
  followUpTasks: Array<{
    title: string;
    description: string;
    priority?: string;
    estimatedHours?: number;
  }>;
}

export class PlanningAssistant {
  constructor(private openai: OpenAI) {}

  async createDetailedPlan(context: AIAssistContext, analysis: TaskAnalysis): Promise<PlanningResult> {
    try {
      // Generate comprehensive project plan
      const planDocument = await this.generateProjectPlan(context, analysis);
      
      // Generate breakdown tasks based on the plan
      const breakdownTasks = await this.generatePlanBreakdown(context, planDocument);

      return {
        deliverables: [
          {
            type: 'plan',
            title: `Detailed Plan: ${context.taskTitle}`,
            content: planDocument,
            filename: this.generatePlanFilename(context.taskTitle)
          }
        ],
        followUpTasks: breakdownTasks
      };

    } catch (error) {
      console.error('Planning generation failed:', error);
      
      return {
        deliverables: [
          {
            type: 'plan',
            title: `Planning Framework: ${context.taskTitle}`,
            content: this.generateFallbackPlan(context, error.message),
            filename: 'project_plan.txt'
          }
        ],
        followUpTasks: []
      };
    }
  }

  private async generateProjectPlan(context: AIAssistContext, analysis: TaskAnalysis): Promise<string> {
    const prompt = `Create a comprehensive project plan for this task:

PLANNING TARGET: ${context.taskTitle}
DESCRIPTION: ${context.taskDescription || 'No description provided'}

PROJECT CONTEXT:
${context.parentProject ? `Project: ${context.parentProject.title}` : ''}
${context.parentGoal ? `Goal: ${context.parentGoal.title}` : ''}

CONSTRAINTS:
${context.deadline ? `Deadline: ${context.deadline}` : 'No deadline specified'}
${context.priority ? `Priority: ${context.priority}` : 'Priority not specified'}
${context.estimatedHours ? `Time Budget: ${context.estimatedHours} hours` : 'No time budget specified'}

TASK ANALYSIS:
- Type: ${analysis.taskType}
- Complexity: ${analysis.complexity}
- Expected Deliverables: ${analysis.expectedOutputs.join(', ')}

Create a detailed project plan that includes:

1. PROJECT OVERVIEW
   - Objective and scope
   - Success criteria
   - Key stakeholders

2. WORK BREAKDOWN STRUCTURE
   - Major phases/milestones
   - Task dependencies
   - Critical path identification

3. DETAILED TIMELINE
   - Phase-by-phase schedule
   - Milestone dates
   - Buffer time allocation

4. RESOURCE PLANNING
   - Required skills and expertise
   - Tool and technology needs
   - Budget considerations

5. RISK ASSESSMENT
   - Potential challenges
   - Mitigation strategies
   - Contingency plans

6. QUALITY ASSURANCE
   - Review checkpoints
   - Quality criteria
   - Testing/validation approach

7. COMMUNICATION PLAN
   - Stakeholder updates
   - Reporting schedule
   - Escalation procedures

8. EXECUTION ROADMAP
   - Step-by-step action items
   - Immediate next steps
   - Long-term implementation

Focus on creating an actionable, realistic plan that can be immediately implemented.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert project manager and strategic planner. Create comprehensive, actionable project plans with clear timelines and deliverables."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 4000
    });

    return response.choices[0].message.content;
  }

  private async generatePlanBreakdown(context: AIAssistContext, planContent: string): Promise<Array<{
    title: string;
    description: string;
    priority?: string;
    estimatedHours?: number;
  }>> {
    const prompt = `Break down this project plan into specific, actionable tasks:

ORIGINAL TASK: ${context.taskTitle}
PROJECT PLAN: ${planContent.substring(0, 2500)}...

Generate 5-8 specific tasks that:
- Represent the key phases of the plan
- Are concrete and actionable
- Have clear completion criteria
- Include realistic time estimates
- Are properly prioritized
- Can be assigned and tracked

Respond with JSON in this format:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Detailed task description with clear deliverables",
      "priority": "high|medium|low",
      "estimatedHours": 2.5
    }
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a project breakdown specialist. Convert plans into actionable, trackable tasks."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content);
      return Array.isArray(result.tasks) ? result.tasks : [];

    } catch (error) {
      console.error('Task breakdown generation failed:', error);
      
      // Return basic breakdown based on planning context
      return this.generateFallbackBreakdown(context);
    }
  }

  private generateFallbackBreakdown(context: AIAssistContext): Array<{
    title: string;
    description: string;
    priority?: string;
    estimatedHours?: number;
  }> {
    const baseTitle = context.taskTitle;
    
    return [
      {
        title: `Plan ${baseTitle} - Phase 1: Preparation`,
        description: "Set up initial requirements, gather resources, and prepare workspace",
        priority: "high",
        estimatedHours: 2
      },
      {
        title: `Plan ${baseTitle} - Phase 2: Research & Analysis`,
        description: "Conduct necessary research and analyze requirements in detail",
        priority: "high", 
        estimatedHours: 3
      },
      {
        title: `Plan ${baseTitle} - Phase 3: Implementation`,
        description: "Execute the main work according to the detailed plan",
        priority: "high",
        estimatedHours: 5
      },
      {
        title: `Plan ${baseTitle} - Phase 4: Review & Finalization`,
        description: "Review deliverables, gather feedback, and finalize outputs",
        priority: "medium",
        estimatedHours: 2
      },
      {
        title: `Plan ${baseTitle} - Phase 5: Documentation & Handoff`,
        description: "Document results and hand off completed work to stakeholders",
        priority: "medium",
        estimatedHours: 1
      }
    ];
  }

  private generateFallbackPlan(context: AIAssistContext, errorMessage: string): string {
    return `PROJECT PLAN: ${context.taskTitle}

PROJECT OVERVIEW
Objective: ${context.taskTitle}
Description: ${context.taskDescription || 'Complete the specified task according to requirements'}
${context.deadline ? `Target Completion: ${context.deadline}` : ''}
${context.priority ? `Priority Level: ${context.priority}` : ''}

WORK BREAKDOWN STRUCTURE

Phase 1: Planning & Preparation (20% of effort)
- Define detailed requirements and scope
- Identify resources and dependencies
- Set up workspace and tools
- Create detailed timeline

Phase 2: Research & Analysis (25% of effort)
- Gather necessary information
- Analyze requirements and constraints
- Identify best practices and approaches
- Document findings and recommendations

Phase 3: Implementation (40% of effort)
- Execute main deliverables
- Apply best practices identified
- Monitor progress against timeline
- Adjust approach as needed

Phase 4: Review & Quality Assurance (10% of effort)
- Review all deliverables
- Validate against requirements
- Gather stakeholder feedback
- Make necessary revisions

Phase 5: Finalization & Documentation (5% of effort)
- Finalize all deliverables
- Create documentation
- Prepare handoff materials
- Archive project materials

RISK MANAGEMENT
- Regular progress checkpoints
- Buffer time for unexpected challenges
- Clear escalation procedures
- Backup plans for critical dependencies

QUALITY CRITERIA
- All deliverables meet stated requirements
- Work completed within timeline and budget
- Stakeholder approval obtained
- Documentation complete and accessible

IMMEDIATE NEXT STEPS
1. Review and approve this plan
2. Begin Phase 1: Planning & Preparation
3. Schedule regular progress reviews
4. Identify and engage key stakeholders

TECHNICAL NOTE
Plan automation encountered an error: ${errorMessage}
This framework provides manual planning guidance for task completion.

SUCCESS METRICS
□ All planned deliverables completed
□ Timeline and budget targets met
□ Stakeholder satisfaction achieved
□ Quality standards maintained
□ Documentation completed`;
  }

  private generatePlanFilename(taskTitle: string): string {
    const cleanTitle = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `plan_${cleanTitle}.txt`;
  }
}