import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for timeline estimation
export interface TimeEstimate {
  optimistic: number; // hours
  realistic: number;  // hours
  pessimistic: number; // hours
  confidence: number; // 0-1
  factors: string[];  // complexity factors identified
}

export interface TaskWithEstimate {
  id: number;
  title: string;
  description?: string;
  type: 'goal' | 'project' | 'task' | 'subtask';
  estimate?: TimeEstimate;
  dependencies: number[];
  parentId?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  complexity?: 'simple' | 'medium' | 'complex';
  domain?: string;
}

export interface TimelineCalculation {
  taskId: number;
  startDate: Date;
  endDate: Date;
  duration: number; // hours
  criticalPath: boolean;
  bufferTime: number; // hours
  dependencies: number[];
}

export interface UserProductivityProfile {
  dailyCapacity: number; // productive hours per day
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  peakHours: { start: number; end: number }; // best productivity window
  domainEfficiency: Record<string, number>; // domain -> efficiency multiplier
  historicalAccuracy: number; // how accurate estimates have been
  averageOverrun: number; // typical overrun percentage
}

export class TimelineEstimator {
  private productivityProfile: UserProductivityProfile;

  constructor(profile?: Partial<UserProductivityProfile>) {
    this.productivityProfile = {
      dailyCapacity: 6, // 6 productive hours per day
      workingDays: [1, 2, 3, 4, 5], // Monday-Friday
      peakHours: { start: 9, end: 12 }, // 9 AM - 12 PM
      domainEfficiency: {
        'coding': 1.0,
        'writing': 0.8,
        'research': 0.7,
        'design': 0.9,
        'planning': 1.1,
        'testing': 0.85
      },
      historicalAccuracy: 0.75, // 75% estimation accuracy
      averageOverrun: 1.3, // 30% typical overrun
      ...profile
    };
  }

  /**
   * 1. AI Context Analysis - Analyze task complexity and generate time estimates
   */
  async analyzeTaskComplexity(task: TaskWithEstimate): Promise<TimeEstimate> {
    try {
      const prompt = `
Analyze this ${task.type} for time estimation:

Title: ${task.title}
Description: ${task.description || 'No description provided'}
Type: ${task.type}
Priority: ${task.priority || 'medium'}

Provide time estimation analysis considering:
1. Complexity factors (technical difficulty, scope, unknowns)
2. Domain expertise required
3. Dependencies and coordination needed
4. Research/learning time required
5. Testing and validation time

Return JSON with this format:
{
  "optimistic": <hours for best-case scenario>,
  "realistic": <hours for most likely scenario>,
  "pessimistic": <hours for worst-case scenario>,
  "confidence": <confidence level 0-1>,
  "factors": ["factor1", "factor2", ...],
  "domain": "<primary domain: coding|writing|research|design|planning|testing>",
  "complexity": "<simple|medium|complex>"
}

Be realistic about human productivity and include buffer for context switching, debugging, and iteration.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert project manager and time estimation specialist. Provide accurate, realistic time estimates based on software development and project management best practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Apply user's domain efficiency and historical accuracy
      const domainMultiplier = this.productivityProfile.domainEfficiency[analysis.domain] || 1.0;
      const accuracyAdjustment = this.productivityProfile.averageOverrun;

      return {
        optimistic: Math.round(analysis.optimistic * domainMultiplier * 10) / 10,
        realistic: Math.round(analysis.realistic * domainMultiplier * accuracyAdjustment * 10) / 10,
        pessimistic: Math.round(analysis.pessimistic * domainMultiplier * accuracyAdjustment * 10) / 10,
        confidence: Math.min(analysis.confidence * this.productivityProfile.historicalAccuracy, 1.0),
        factors: analysis.factors || []
      };

    } catch (error) {
      console.error('AI time estimation failed:', error);
      // Fallback to rule-based estimation
      return this.fallbackEstimation(task);
    }
  }

  /**
   * 2. Dependency Mapping - Build dependency graph and find critical path
   */
  buildDependencyGraph(tasks: TaskWithEstimate[]): Map<number, number[]> {
    const dependencyGraph = new Map<number, number[]>();
    
    // Build explicit dependencies
    tasks.forEach(task => {
      dependencyGraph.set(task.id, task.dependencies || []);
    });

    // Add implicit hierarchical dependencies
    tasks.forEach(task => {
      if (task.parentId) {
        const siblings = tasks.filter(t => t.parentId === task.parentId && t.id !== task.id);
        // Tasks within same parent may have sequential dependencies based on priority
        siblings.forEach(sibling => {
          if (this.shouldDependOn(task, sibling)) {
            const deps = dependencyGraph.get(task.id) || [];
            deps.push(sibling.id);
            dependencyGraph.set(task.id, deps);
          }
        });
      }
    });

    return dependencyGraph;
  }

  /**
   * Calculate critical path using longest path algorithm
   */
  calculateCriticalPath(tasks: TaskWithEstimate[], dependencyGraph: Map<number, number[]>): number[] {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const visited = new Set<number>();
    const distances = new Map<number, number>();
    const path = new Map<number, number[]>();

    // Initialize distances
    tasks.forEach(task => {
      distances.set(task.id, 0);
      path.set(task.id, []);
    });

    // Topological sort and longest path calculation
    const topologicalSort = (taskId: number): void => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const dependencies = dependencyGraph.get(taskId) || [];
      dependencies.forEach(depId => {
        topologicalSort(depId);
        const task = taskMap.get(taskId);
        const taskDuration = task?.estimate?.realistic || 0;
        const newDistance = (distances.get(depId) || 0) + taskDuration;
        
        if (newDistance > (distances.get(taskId) || 0)) {
          distances.set(taskId, newDistance);
          const depPath = path.get(depId) || [];
          path.set(taskId, [...depPath, taskId]);
        }
      });
    };

    tasks.forEach(task => topologicalSort(task.id));

    // Find the critical path (longest path)
    let maxDistance = 0;
    let criticalEndTask = 0;
    distances.forEach((distance, taskId) => {
      if (distance > maxDistance) {
        maxDistance = distance;
        criticalEndTask = taskId;
      }
    });

    return path.get(criticalEndTask) || [];
  }

  /**
   * 3. Resource-Aware Scheduling - Schedule tasks considering user availability
   */
  scheduleTasksWithResources(
    tasks: TaskWithEstimate[], 
    dependencyGraph: Map<number, number[]>,
    startDate: Date = new Date()
  ): TimelineCalculation[] {
    const schedule: TimelineCalculation[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const criticalPath = this.calculateCriticalPath(tasks, dependencyGraph);
    
    // Sort tasks by dependencies (topological order)
    const sortedTasks = this.topologicalSort(tasks, dependencyGraph);
    let currentDate = new Date(startDate);

    sortedTasks.forEach(task => {
      const dependencies = dependencyGraph.get(task.id) || [];
      const duration = task.estimate?.realistic || 1;
      
      // Find the latest end date of all dependencies
      let earliestStart = new Date(currentDate);
      dependencies.forEach(depId => {
        const depSchedule = schedule.find(s => s.taskId === depId);
        if (depSchedule && depSchedule.endDate > earliestStart) {
          earliestStart = new Date(depSchedule.endDate);
        }
      });

      // Calculate buffer time based on complexity and critical path
      const bufferMultiplier = criticalPath.includes(task.id) ? 1.2 : 1.1;
      const complexityBuffer = task.complexity === 'complex' ? 1.3 : task.complexity === 'medium' ? 1.15 : 1.0;
      const bufferTime = duration * (bufferMultiplier * complexityBuffer - 1);

      // Schedule the task considering working days and daily capacity
      const totalHours = duration + bufferTime;
      const endDate = this.calculateEndDate(earliestStart, totalHours);

      schedule.push({
        taskId: task.id,
        startDate: earliestStart,
        endDate,
        duration: totalHours,
        criticalPath: criticalPath.includes(task.id),
        bufferTime,
        dependencies
      });

      // Update current date for next task
      if (endDate > currentDate) {
        currentDate = new Date(endDate);
      }
    });

    return schedule;
  }

  /**
   * 4. Smart Buffer Strategies - Calculate appropriate buffers
   */
  calculateSmartBuffer(task: TaskWithEstimate, isOnCriticalPath: boolean): number {
    const baseEstimate = task.estimate?.realistic || 1;
    let bufferMultiplier = 1.0;

    // Complexity-based buffer
    switch (task.complexity) {
      case 'simple': bufferMultiplier += 0.1; break;
      case 'medium': bufferMultiplier += 0.2; break;
      case 'complex': bufferMultiplier += 0.4; break;
    }

    // Critical path buffer
    if (isOnCriticalPath) {
      bufferMultiplier += 0.15;
    }

    // Confidence-based buffer
    const confidence = task.estimate?.confidence || 0.5;
    bufferMultiplier += (1 - confidence) * 0.3;

    // Historical accuracy adjustment
    bufferMultiplier *= this.productivityProfile.averageOverrun;

    return baseEstimate * (bufferMultiplier - 1);
  }

  /**
   * Calculate end date considering working days and daily capacity
   */
  private calculateEndDate(startDate: Date, totalHours: number): Date {
    let remainingHours = totalHours;
    let currentDate = new Date(startDate);
    
    while (remainingHours > 0) {
      // Skip non-working days
      if (!this.productivityProfile.workingDays.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Allocate hours for this day
      const hoursToday = Math.min(remainingHours, this.productivityProfile.dailyCapacity);
      remainingHours -= hoursToday;

      if (remainingHours > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return currentDate;
  }

  /**
   * Topological sort for dependency ordering
   */
  private topologicalSort(tasks: TaskWithEstimate[], dependencyGraph: Map<number, number[]>): TaskWithEstimate[] {
    const visited = new Set<number>();
    const result: TaskWithEstimate[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const visit = (taskId: number) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const dependencies = dependencyGraph.get(taskId) || [];
      dependencies.forEach(depId => visit(depId));

      const task = taskMap.get(taskId);
      if (task) result.push(task);
    };

    tasks.forEach(task => visit(task.id));
    return result;
  }

  /**
   * Determine if one task should depend on another based on priority and type
   */
  private shouldDependOn(task: TaskWithEstimate, potentialDependency: TaskWithEstimate): boolean {
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const taskPriority = priorityOrder[task.priority || 'medium'];
    const depPriority = priorityOrder[potentialDependency.priority || 'medium'];
    
    // Higher priority tasks depend on lower priority tasks being completed first
    return depPriority > taskPriority;
  }

  /**
   * Fallback estimation when AI is unavailable
   */
  private fallbackEstimation(task: TaskWithEstimate): TimeEstimate {
    let baseHours = 2; // default 2 hours

    // Adjust based on task type
    switch (task.type) {
      case 'subtask': baseHours = 1; break;
      case 'task': baseHours = 4; break;
      case 'project': baseHours = 20; break;
      case 'goal': baseHours = 80; break;
    }

    // Adjust based on description length (rough complexity indicator)
    const descriptionLength = (task.description || '').length;
    if (descriptionLength > 200) baseHours *= 1.5;
    if (descriptionLength > 500) baseHours *= 2;

    return {
      optimistic: baseHours * 0.7,
      realistic: baseHours,
      pessimistic: baseHours * 1.8,
      confidence: 0.6,
      factors: ['fallback-estimation']
    };
  }
}

// Usage example and utility functions
export const createDefaultTimelineEstimator = () => {
  return new TimelineEstimator();
};

export const estimateProjectTimeline = async (
  tasks: TaskWithEstimate[],
  startDate?: Date,
  userProfile?: Partial<UserProductivityProfile>
): Promise<{
  schedule: TimelineCalculation[];
  totalDuration: number;
  criticalPath: number[];
  completionDate: Date;
}> => {
  const estimator = new TimelineEstimator(userProfile);
  
  // Analyze each task with AI
  for (const task of tasks) {
    if (!task.estimate) {
      task.estimate = await estimator.analyzeTaskComplexity(task);
    }
  }

  // Build dependency graph and schedule
  const dependencyGraph = estimator.buildDependencyGraph(tasks);
  const criticalPath = estimator.calculateCriticalPath(tasks, dependencyGraph);
  const schedule = estimator.scheduleTasksWithResources(tasks, dependencyGraph, startDate);

  // Calculate project completion
  const completionDate = schedule.reduce((latest, item) => 
    item.endDate > latest ? item.endDate : latest, new Date()
  );
  
  const totalDuration = schedule.reduce((total, item) => total + item.duration, 0);

  return {
    schedule,
    totalDuration,
    criticalPath,
    completionDate
  };
};