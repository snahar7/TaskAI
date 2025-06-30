import OpenAI from "openai";
import type { AIBreakdown } from "@shared/schema";

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
    "name": "refined version of user input",
    "description": "brief overview of what this goal involves",
    "estimatedDuration": "realistic timeframe (e.g., '3 months', '6 weeks')",
    "targetDate": "${targetDate || 'TBD'}",
    "urgency": "low|medium|high",
    "priority": "low|medium|high",
    "timeEstimate": 40
  },
  "projects": [
    {
      "name": "Major category/area (e.g., 'Venue & Decor')",
      "description": "what this project covers",
      "estimatedDuration": "timeframe for this project",
      "urgency": "low|medium|high",
      "priority": "low|medium|high",
      "timeEstimate": 15,
      "tasks": [
        {
          "name": "Specific actionable item (e.g., 'Book a venue')",
          "description": "what needs to be done",
          "estimatedHours": 4,
          "dueDate": "YYYY-MM-DD",
          "urgency": "low|medium|high",
          "priority": "low|medium|high",
          "timeEstimate": 4,
          "subtasks": [
            {
              "name": "Small actionable step (e.g., 'Call venues')",
              "description": "specific action to take",
              "estimatedHours": 1,
              "urgency": "low|medium|high",
              "priority": "low|medium|high",
              "timeEstimate": 1
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
- Use realistic time estimates (timeEstimate in hours)
- Distribute due dates logically from now to target date
- Make names concise but descriptive
- Consider dependencies and logical order
- All items should start incomplete (status: 'pending')
- Set priority based on urgency and dependencies
- Ensure logical breakdown with clear actionable steps`;

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
      name: goalInput,
      description: `Complete breakdown for: ${goalInput}`,
      estimatedDuration: "3 months",
      targetDate: targetDate || futureDate.toISOString().split('T')[0],
      urgency: "medium",
      priority: "medium",
      timeEstimate: 40
    },
    projects: [
      {
        name: "Planning & Preparation",
        description: "Initial research and planning phase",
        estimatedDuration: "2 weeks",
        urgency: "high",
        priority: "high",
        timeEstimate: 15,
        tasks: [
          {
            name: "Research requirements",
            description: "Gather information and understand scope",
            estimatedHours: 8,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "high",
            priority: "high",
            timeEstimate: 8,
            subtasks: [
              {
                name: "Create research checklist",
                description: "List all areas that need investigation",
                estimatedHours: 1,
                urgency: "high",
                priority: "high",
                timeEstimate: 1
              },
              {
                name: "Conduct online research",
                description: "Search for best practices and examples",
                estimatedHours: 3,
                urgency: "medium",
                priority: "medium",
                timeEstimate: 3
              },
              {
                name: "Document findings",
                description: "Compile research into organized notes",
                estimatedHours: 2,
                urgency: "medium",
                priority: "medium",
                timeEstimate: 2
              }
            ]
          },
          {
            name: "Create timeline",
            description: "Develop detailed project schedule",
            estimatedHours: 4,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "high",
            priority: "high",
            timeEstimate: 4,
            subtasks: [
              {
                name: "List all major milestones",
                description: "Identify key deadlines and checkpoints",
                estimatedHours: 1,
                urgency: "high",
                priority: "high",
                timeEstimate: 1
              },
              {
                name: "Estimate task durations",
                description: "Calculate realistic time requirements",
                estimatedHours: 2,
                urgency: "medium",
                priority: "medium",
                timeEstimate: 2
              }
            ]
          }
        ]
      },
      {
        name: "Implementation Phase",
        description: "Core execution and development work",
        estimatedDuration: "6 weeks",
        urgency: "medium",
        priority: "medium",
        timeEstimate: 25,
        tasks: [
          {
            name: "Setup infrastructure",
            description: "Prepare necessary tools and environments",
            estimatedHours: 12,
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "high",
            priority: "high",
            timeEstimate: 12,
            subtasks: [
              {
                name: "Configure development environment",
                description: "Install and setup required software",
                estimatedHours: 4,
                urgency: "high",
                priority: "high",
                timeEstimate: 4
              },
              {
                name: "Setup version control",
                description: "Initialize repository and collaboration tools",
                estimatedHours: 2,
                urgency: "medium",
                priority: "medium",
                timeEstimate: 2
              }
            ]
          },
          {
            name: "Develop core features",
            description: "Build primary functionality",
            estimatedHours: 16,
            dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            urgency: "medium",
            priority: "medium",
            timeEstimate: 16,
            subtasks: [
              {
                name: "Create user interface",
                description: "Design and implement user-facing components",
                estimatedHours: 8,
                urgency: "medium",
                priority: "medium",
                timeEstimate: 8
              },
              {
                name: "Implement business logic",
                description: "Code core functionality and features",
                estimatedHours: 6,
                urgency: "medium",
                priority: "medium",
                timeEstimate: 6
              }
            ]
          }
        ]
      }
    ]
  };
}