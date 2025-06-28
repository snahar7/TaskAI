import OpenAI from "openai";
import { AIBreakdown } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateGoalBreakdown(
  goalInput: string,
  targetDate?: string | null
): Promise<AIBreakdown> {
  // Check if OpenAI is available, otherwise use demo
  if (!process.env.OPENAI_API_KEY) {
    console.log("No OpenAI API key found, using demo breakdown");
    return getDemoBreakdown(goalInput, targetDate);
  }

  try {
    const prompt = `You are an expert project manager. Break down this high-level goal into a structured 4-level hierarchy: Goal → Projects → Tasks → Sub-tasks.

User Input: "${goalInput}"
${targetDate ? `Target Completion: ${targetDate}` : ''}

Create a JSON response with this exact structure:
{
  "goal": {
    "title": "refined version of user input",
    "description": "brief overview of what this goal involves",
    "estimatedDuration": "realistic timeframe (e.g., '3 months', '6 weeks')",
    "targetDate": "${targetDate || 'TBD'}",
    "urgency": "low|medium|high"
  },
  "projects": [
    {
      "title": "Major category/area (e.g., 'Venue & Decor')",
      "description": "what this project covers",
      "estimatedDuration": "timeframe for this project",
      "urgency": "low|medium|high",
      "tasks": [
        {
          "title": "Specific actionable item (e.g., 'Book a venue')",
          "description": "what needs to be done",
          "estimatedHours": 4,
          "dueDate": "YYYY-MM-DD",
          "urgency": "low|medium|high",
          "subtasks": [
            {
              "title": "Small actionable step (e.g., 'Call venues')",
              "description": "specific action to take",
              "estimatedHours": 1,
              "urgency": "low|medium|high"
            }
          ]
        }
      ]
    }
  ]
}

Guidelines:
- Create 2-4 projects per goal
- Each project should have 3-6 tasks
- Each task should have 2-5 subtasks
- Subtasks should be very specific, actionable items
- Use realistic time estimates
- Distribute due dates logically from now to target date
- Make titles concise but descriptive
- Consider dependencies and logical order`;

    const response = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert project manager who creates detailed, realistic project breakdowns. Always respond with valid JSON in the exact format requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout')), 10000)
      )
    ]) as any;

    const breakdown = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate the structure
    if (!breakdown.goal || !breakdown.projects || !Array.isArray(breakdown.projects)) {
      throw new Error('Invalid breakdown structure from AI');
    }

    return breakdown as AIBreakdown;

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback demo breakdown
    return getDemoBreakdown(goalInput, targetDate);
  }
}

function getDemoBreakdown(goalInput: string, targetDate?: string | null): AIBreakdown {
  const today = new Date();
  const futureDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  
  return {
    goal: {
      title: goalInput,
      description: `Complete breakdown for: ${goalInput}`,
      estimatedDuration: "3 months",
      targetDate: targetDate || futureDate.toISOString().split('T')[0],
      urgency: "medium"
    },
    projects: [
      {
        title: "Planning & Preparation",
        description: "Initial research and planning phase",
        estimatedDuration: "2 weeks",
        urgency: "high",
        tasks: [
          {
            title: "Research requirements",
            description: "Gather information and understand scope",
            estimatedHours: 8,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "high",
            subtasks: [
              {
                title: "Create research checklist",
                description: "List all areas that need investigation",
                estimatedHours: 1,
                urgency: "high"
              },
              {
                title: "Conduct online research",
                description: "Search for best practices and examples",
                estimatedHours: 3,
                urgency: "medium"
              },
              {
                title: "Document findings",
                description: "Compile research into organized notes",
                estimatedHours: 2,
                urgency: "medium"
              }
            ]
          },
          {
            title: "Create timeline",
            description: "Develop detailed project schedule",
            estimatedHours: 4,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "high",
            subtasks: [
              {
                title: "List all major milestones",
                description: "Identify key deadlines and checkpoints",
                estimatedHours: 1,
                urgency: "high"
              },
              {
                title: "Estimate task durations",
                description: "Assign realistic time estimates to each task",
                estimatedHours: 2,
                urgency: "medium"
              }
            ]
          }
        ]
      },
      {
        title: "Implementation",
        description: "Execute the main work and activities",
        estimatedDuration: "6 weeks",
        urgency: "medium",
        tasks: [
          {
            title: "Execute core activities",
            description: "Complete the primary work items",
            estimatedHours: 20,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "medium",
            subtasks: [
              {
                title: "Start with high-priority items",
                description: "Focus on most critical components first",
                estimatedHours: 8,
                urgency: "high"
              },
              {
                title: "Complete supporting tasks",
                description: "Finish remaining work items",
                estimatedHours: 12,
                urgency: "medium"
              }
            ]
          }
        ]
      },
      {
        title: "Review & Finalization",
        description: "Quality check and final preparations",
        estimatedDuration: "1 week",
        urgency: "medium",
        tasks: [
          {
            title: "Final review",
            description: "Check all components are complete",
            estimatedHours: 4,
            dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "medium",
            subtasks: [
              {
                title: "Quality checklist review",
                description: "Verify all requirements are met",
                estimatedHours: 2,
                urgency: "medium"
              },
              {
                title: "Make final adjustments",
                description: "Address any remaining issues",
                estimatedHours: 2,
                urgency: "low"
              }
            ]
          }
        ]
      }
    ]
  };
}