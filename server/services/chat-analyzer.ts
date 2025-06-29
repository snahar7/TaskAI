import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function analyzeUserInput(input: string): Promise<{ proposal: EntityProposal }> {
  try {
    const systemPrompt = `You are an AI assistant that analyzes user input and categorizes it into one of four types: goal, project, task, or subtask.

Guidelines for categorization:
- GOAL: High-level, strategic objectives (3+ months, multiple projects). Examples: "Launch a SaaS product", "Expand to new market", "Improve customer satisfaction"
- PROJECT: Medium-term initiatives with clear deliverables (1-3 months, multiple tasks). Examples: "Build mobile app", "Organize conference", "Redesign website"
- TASK: Specific work items (1-4 weeks, may have subtasks). Examples: "Write user documentation", "Fix login bug", "Conduct user interviews"
- SUBTASK: Small, specific actions (hours to days). Examples: "Update button color", "Send follow-up email", "Review pull request"

Consider these factors:
- Scope and complexity
- Time horizon
- Number of people involved
- Dependencies
- Strategic vs tactical nature

Respond with JSON containing:
{
  "type": "goal|project|task|subtask",
  "title": "Clear, actionable title",
  "description": "Detailed description of what needs to be accomplished",
  "priority": "low|medium|high|urgent",
  "estimatedDuration": "Human-readable duration estimate",
  "deadline": "YYYY-MM-DD format, realistic based on complexity",
  "assignedTo": null,
  "parentId": null,
  "parentType": null,
  "confidence": 85,
  "reasoning": "Brief explanation of why you chose this categorization and estimates"
}`;

    const userPrompt = `Analyze this user input and categorize it: "${input}"

Provide realistic estimates based on the scope. For deadlines, assume today is ${new Date().toISOString().split('T')[0]} and add appropriate time based on complexity.`;

    // Use GPT-4o model which was released May 13, 2024. Do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate and set defaults
    const proposal: EntityProposal = {
      type: result.type || 'task',
      title: result.title || input,
      description: result.description || '',
      priority: result.priority || 'medium',
      estimatedDuration: result.estimatedDuration || '1 week',
      deadline: result.deadline || '',
      assignedTo: result.assignedTo || undefined,
      parentId: result.parentId || undefined,
      parentType: result.parentType || undefined,
      confidence: Math.min(Math.max(result.confidence || 75, 0), 100),
      reasoning: result.reasoning || 'Analyzed based on input complexity and scope.'
    };

    return { proposal };

  } catch (error) {
    console.error('Error analyzing user input:', error);
    
    // Fallback analysis without OpenAI
    const fallbackProposal: EntityProposal = {
      type: 'task',
      title: input,
      description: `Work on: ${input}`,
      priority: 'medium',
      estimatedDuration: '1 week',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      confidence: 50,
      reasoning: 'Fallback analysis - unable to connect to AI service. Defaulted to task with medium priority.'
    };

    return { proposal: fallbackProposal };
  }
}