/**
 * Sample Data Flow Demonstration for Taflo
 * Shows complete user journey: Goal Input → AI Breakdown → Database Storage
 */

// Sample user input
const sampleGoalInput = {
  goalInput: "Build a mobile app for task management",
  targetDate: "2025-06-01",
  userContext: {
    skillLevel: "intermediate" as const,
    timeAvailable: "20 hours per week",
    previousGoals: ["Built a web dashboard", "Created REST API"]
  }
};

/**
 * Step 1: User enters goal in form
 * This simulates the GoalForm component submission
 */
export async function stepOne_UserInput() {
  console.log("📝 Step 1: User Input");
  console.log("User enters:", sampleGoalInput);
  
  return sampleGoalInput;
}

/**
 * Step 2: AI processes the goal and generates breakdown
 * This uses the GPTAgent service to create structured hierarchy
 */
export async function stepTwo_AIBreakdown(goalInput: typeof sampleGoalInput) {
  console.log("🤖 Step 2: AI Processing");
  console.log("Sending to GPT Agent...");
  
  // Fallback sample breakdown for demonstration
  const breakdown = {
    goal: {
      title: "Build a Mobile App for Task Management",
      description: "Create a comprehensive mobile application that helps users manage their tasks efficiently",
      timeframe: "4-6 months"
    },
    projects: [
      {
        title: "App Planning & Design",
        description: "Define requirements, create wireframes, and design UI/UX",
        urgency: "High",
        estimatedHours: 40,
        dueDate: "2025-02-15",
        tasks: [
          {
            title: "Market Research",
            description: "Research competitors and user needs",
            urgency: "High",
            estimatedHours: 8,
            dueDate: "2025-01-20",
            subtasks: [
              {
                title: "Analyze top 5 task management apps",
                description: "Study features, UI patterns, and user reviews",
                urgency: "High",
                estimatedHours: 3,
                dueDate: "2025-01-15"
              },
              {
                title: "Survey potential users",
                description: "Create and distribute user needs survey",
                urgency: "Medium",
                estimatedHours: 5,
                dueDate: "2025-01-20"
              }
            ]
          }
        ]
      }
    ]
  };
  
  console.log("✅ AI Generated Breakdown:");
  console.log(`- Goal: ${breakdown.goal.title}`);
  console.log(`- Projects: ${breakdown.projects.length}`);
  console.log(`- Total Tasks: ${breakdown.projects.reduce((sum, p) => sum + p.tasks.length, 0)}`);
  
  return breakdown;
}

/**
 * Complete demonstration flow
 * Run this to see the entire user journey
 */
export async function runCompleteDemo() {
  console.log("🚀 Starting Taflo Data Flow Demonstration\n");
  
  const userInput = await stepOne_UserInput();
  const aiBreakdown = await stepTwo_AIBreakdown(userInput);
  
  console.log("🎉 Demo completed successfully!");
  
  return { success: true, data: { userInput, aiBreakdown } };
}