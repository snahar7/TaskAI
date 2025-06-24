import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface AISubtask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  estimatedHours?: string;
}

export interface AITaskBreakdown {
  subtasks: AISubtask[];
}

export async function generateTaskBreakdown(
  taskDescription: string,
  category?: string,
  targetDate?: string
): Promise<AITaskBreakdown> {
  try {
    const prompt = `
You are an expert project manager and productivity consultant. Break down the following high-level task into specific, actionable subtasks.

Task: ${taskDescription}
${category ? `Category: ${category}` : ''}
${targetDate ? `Target completion date: ${targetDate}` : ''}

Please provide a comprehensive breakdown with 6-12 subtasks. For each subtask, include:
- A clear, specific title
- A detailed description of what needs to be done
- Priority level (high, medium, or low)
- Suggested due date (if target date provided, work backwards; otherwise suggest realistic timeline)
- Estimated time required (e.g., "2-3 hours", "1 day", "30 minutes")

Focus on making each subtask:
1. Specific and actionable
2. Appropriately sized (not too big or too small)
3. Logically ordered
4. Realistic and achievable

Respond with JSON in this exact format:
{
  "subtasks": [
    {
      "title": "Specific task title",
      "description": "Detailed description of what to do",
      "priority": "high|medium|low",
      "dueDate": "YYYY-MM-DD or relative date like 'Week 1'",
      "estimatedHours": "time estimate"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful project management assistant that breaks down complex tasks into actionable subtasks. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.subtasks || !Array.isArray(result.subtasks)) {
      throw new Error("Invalid response format from OpenAI");
    }

    return result as AITaskBreakdown;
  } catch (error) {
    console.error("Error generating task breakdown:", error);
    throw new Error("Failed to generate task breakdown: " + (error as Error).message);
  }
}
