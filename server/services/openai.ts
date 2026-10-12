import OpenAI from "openai";
import type { AIBreakdown } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'demo-mode-no-key' });

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

IMPORTANT: Create an intelligent, professional goal title based on the user's input. Transform their raw input into a clear, actionable goal name that sounds professional and well-structured.

Examples:
- User input: "I want to plan my wedding" → Goal name: "Plan Wedding Celebration"
- User input: "need to learn spanish for my trip" → Goal name: "Learn Spanish for Travel"
- User input: "get fit and lose weight" → Goal name: "Achieve Fitness and Weight Loss Goals"
- User input: "start a business selling handmade crafts" → Goal name: "Launch Handmade Crafts Business"

Create a JSON response with this exact structure:
{
  "goal": {
    "name": "Intelligent, professional goal title based on user input (NOT the raw user input)",
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
- CRITICAL: Transform the raw user input into a professional, clear goal title (don't just copy their input)
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
- Ensure logical breakdown with clear actionable steps
- Goal name should be polished and professional, not raw user input`;

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

function generateIntelligentTitle(goalInput: string): string {
  // Transform raw user input into professional goal titles
  const input = goalInput.toLowerCase().trim();
  
  // Common patterns and transformations
  const transformations = [
    // Wedding planning
    { pattern: /plan.*wedding|wedding.*plan/i, title: "Plan Wedding Celebration" },
    { pattern: /get.*married|marriage.*plan/i, title: "Plan Wedding Celebration" },
    
    // Learning languages
    { pattern: /learn.*spanish/i, title: "Learn Spanish Language" },
    { pattern: /learn.*french/i, title: "Learn French Language" },
    { pattern: /learn.*german/i, title: "Learn German Language" },
    { pattern: /learn.*language/i, title: "Master New Language Skills" },
    
    // Fitness and health
    { pattern: /get.*fit|lose.*weight|fitness/i, title: "Achieve Fitness and Health Goals" },
    { pattern: /build.*muscle|gain.*weight/i, title: "Build Strength and Muscle Mass" },
    { pattern: /run.*marathon|marathon.*train/i, title: "Train for Marathon Competition" },
    
    // Business and career
    { pattern: /start.*business|launch.*business/i, title: "Launch New Business Venture" },
    { pattern: /find.*job|get.*job|job.*search/i, title: "Secure New Employment Position" },
    { pattern: /build.*app|create.*app/i, title: "Develop Mobile/Web Application" },
    { pattern: /learn.*coding|learn.*program/i, title: "Master Programming Skills" },
    
    // Education and courses
    { pattern: /finish.*degree|complete.*degree/i, title: "Complete Academic Degree Program" },
    { pattern: /take.*course|online.*course/i, title: "Complete Professional Course" },
    { pattern: /get.*certification|earn.*cert/i, title: "Earn Professional Certification" },
    
    // Home and lifestyle
    { pattern: /buy.*house|purchase.*home/i, title: "Purchase New Home" },
    { pattern: /move.*house|relocate/i, title: "Complete Residential Relocation" },
    { pattern: /renovate|remodel/i, title: "Complete Home Renovation Project" },
    
    // Travel
    { pattern: /plan.*trip|travel.*plan/i, title: "Plan Travel Adventure" },
    { pattern: /visit.*country|travel.*to/i, title: "Plan International Travel Experience" },
    
    // Creative projects
    { pattern: /write.*book|publish.*book/i, title: "Write and Publish Book" },
    { pattern: /learn.*instrument|play.*music/i, title: "Master Musical Instrument" },
    { pattern: /create.*art|make.*art/i, title: "Develop Artistic Skills" },
    
    // Meeting and networking
    { pattern: /book.*meeting|schedule.*meeting|meet.*with/i, title: "Schedule Important Meeting" },
    { pattern: /network|build.*connect/i, title: "Expand Professional Network" },
  ];
  
  // Check for pattern matches
  for (const transformation of transformations) {
    if (transformation.pattern.test(input)) {
      return transformation.title;
    }
  }
  
  // Generic transformations for unmatched inputs
  let title = goalInput.trim();
  
  // Capitalize first letter of each major word
  title = title.replace(/\b\w+/g, (word) => {
    const lowerWord = word.toLowerCase();
    if (['a', 'an', 'the', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'by'].includes(lowerWord)) {
      return lowerWord;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  // Ensure first word is always capitalized
  title = title.charAt(0).toUpperCase() + title.slice(1);
  
  // Remove common casual words/phrases
  title = title.replace(/^(i want to|i need to|i have to|i will|let me|help me|i should)\s+/i, '');
  title = title.replace(/\s+(please|pls)$/i, '');
  
  // Add action words if the title is too passive
  if (!title.match(/^(plan|create|build|develop|learn|master|achieve|complete|launch|start|finish|get|obtain|earn|buy|find|write|make)/i)) {
    if (title.match(/business|company|startup/i)) {
      title = "Launch " + title;
    } else if (title.match(/skill|course|language|instrument/i)) {
      title = "Master " + title;
    } else if (title.match(/goal|objective|target/i)) {
      title = "Achieve " + title;
    } else if (title.match(/project|task|work/i)) {
      title = "Complete " + title;
    } else {
      title = "Accomplish " + title;
    }
  }
  
  return title;
}

function getDemoBreakdown(goalInput: string, targetDate?: string | null): AIBreakdown {
  const today = new Date();
  const futureDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  
  // Generate intelligent goal title based on user input
  const intelligentTitle = generateIntelligentTitle(goalInput);
  
  return {
    goal: {
      name: intelligentTitle,
      description: `Complete breakdown for: ${intelligentTitle}`,
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