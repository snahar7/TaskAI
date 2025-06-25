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

// Demo task breakdowns for testing when OpenAI quota is exceeded
function getDemoTaskBreakdown(taskDescription: string): AITaskBreakdown {
  const lowerTask = taskDescription.toLowerCase();
  
  if (lowerTask.includes('wedding')) {
    return {
      subtasks: [
        {
          title: "Set Wedding Budget",
          description: "Determine total budget and allocate funds for venue, catering, photography, etc.",
          priority: "high",
          dueDate: "Week 1",
          estimatedHours: "3-4 hours"
        },
        {
          title: "Create Guest List",
          description: "Compile list of family and friends, determine final headcount",
          priority: "high",
          dueDate: "Week 2",
          estimatedHours: "2-3 hours"
        },
        {
          title: "Book Wedding Venue",
          description: "Research and visit venues, negotiate contracts and secure date",
          priority: "high",
          dueDate: "Week 4",
          estimatedHours: "8-10 hours"
        },
        {
          title: "Choose Wedding Vendors",
          description: "Book photographer, caterer, florist, and DJ/band",
          priority: "medium",
          dueDate: "Month 2",
          estimatedHours: "12-15 hours"
        },
        {
          title: "Send Save the Dates",
          description: "Design and mail save-the-date cards to guests",
          priority: "medium",
          dueDate: "Month 3",
          estimatedHours: "4-5 hours"
        },
        {
          title: "Plan Menu and Tastings",
          description: "Work with caterer to finalize menu and arrange tastings",
          priority: "medium",
          dueDate: "Month 4",
          estimatedHours: "6-8 hours"
        }
      ]
    };
  }
  
  if (lowerTask.includes('marketing') || lowerTask.includes('campaign')) {
    return {
      subtasks: [
        {
          title: "Define Target Audience",
          description: "Research and create detailed buyer personas and demographics",
          priority: "high",
          dueDate: "Week 1",
          estimatedHours: "4-6 hours"
        },
        {
          title: "Set Campaign Goals",
          description: "Establish clear KPIs, budget, and success metrics",
          priority: "high",
          dueDate: "Week 1",
          estimatedHours: "2-3 hours"
        },
        {
          title: "Create Content Strategy",
          description: "Plan content themes, messaging, and content calendar",
          priority: "high",
          dueDate: "Week 2",
          estimatedHours: "6-8 hours"
        },
        {
          title: "Design Marketing Materials",
          description: "Create ads, social media graphics, and promotional content",
          priority: "medium",
          dueDate: "Week 3",
          estimatedHours: "8-10 hours"
        },
        {
          title: "Set Up Analytics",
          description: "Configure tracking tools and measurement systems",
          priority: "medium",
          dueDate: "Week 2",
          estimatedHours: "3-4 hours"
        },
        {
          title: "Launch Campaign",
          description: "Deploy across all channels and monitor initial performance",
          priority: "low",
          dueDate: "Week 4",
          estimatedHours: "4-5 hours"
        }
      ]
    };
  }
  
  // Generic fallback breakdown
  return {
    subtasks: [
      {
        title: "Research and Planning",
        description: "Gather information and create a detailed action plan",
        priority: "high",
        dueDate: "Week 1",
        estimatedHours: "4-6 hours"
      },
      {
        title: "Define Requirements",
        description: "List specific needs, constraints, and success criteria",
        priority: "high",
        dueDate: "Week 1",
        estimatedHours: "2-3 hours"
      },
      {
        title: "Create Timeline",
        description: "Establish milestones and deadlines for each phase",
        priority: "medium",
        dueDate: "Week 2",
        estimatedHours: "2-3 hours"
      },
      {
        title: "Execute Phase 1",
        description: "Begin implementation of the first major milestone",
        priority: "medium",
        dueDate: "Week 3",
        estimatedHours: "8-12 hours"
      },
      {
        title: "Review and Adjust",
        description: "Evaluate progress and make necessary adjustments",
        priority: "low",
        dueDate: "Week 4",
        estimatedHours: "2-4 hours"
      }
    ]
  };
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
    
    // If it's a quota error, provide a demo breakdown so user can still test the app
    if (error.message && error.message.includes('quota')) {
      console.log("Using demo task breakdown due to OpenAI quota limit");
      return getDemoTaskBreakdown(taskDescription);
    }
    
    throw new Error("Failed to generate task breakdown: " + (error as Error).message);
  }
}
