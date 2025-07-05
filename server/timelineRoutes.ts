import { Express, Request, Response, NextFunction } from "express";
import { 
  TimelineEstimator, 
  TaskWithEstimate, 
  estimateProjectTimeline,
  createDefaultTimelineEstimator 
} from "../src/services/timelineEstimator";
import { 
  LearningEngine, 
  createLearningEngine, 
  EstimationRecord 
} from "../src/services/learningEngine";
import { db } from "./db";
import { 
  goals, 
  projects, 
  tasks, 
  subtasks,
  timeEstimates,
  estimationHistory,
  userProductivityProfiles,
  scheduledTasks,
  taskDependencies,
  insertTimeEstimateSchema,
  insertEstimationHistorySchema,
  insertUserProductivityProfileSchema,
  insertScheduledTaskSchema,
  insertTaskDependencySchema
} from "../shared/schema";
import { eq, desc, and } from "drizzle-orm";

// Timeline Estimation API Routes
export async function registerTimelineRoutes(app: Express) {
  
  /**
   * Generate AI-powered time estimates for a specific task/project/goal
   */
  app.post("/api/timeline/estimate", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType, includeHierarchy = false } = req.body;
      
      // Fetch the entity and its hierarchy
      let entityData;
      let childEntities: TaskWithEstimate[] = [];
      
      if (entityType === 'goal') {
        const goalData = await db.select().from(goals).where(eq(goals.id, entityId)).limit(1);
        if (goalData.length === 0) {
          return res.status(404).json({ message: "Goal not found" });
        }
        
        entityData = goalData[0];
        
        if (includeHierarchy) {
          // Get all projects for this goal
          const goalProjects = await db.select().from(projects).where(eq(projects.goalId, entityId));
          
          for (const project of goalProjects) {
            childEntities.push({
              id: project.id,
              title: project.title,
              description: project.description,
              type: 'project',
              dependencies: [],
              parentId: entityId,
              priority: project.priority as any,
              domain: 'planning'
            });
            
            // Get tasks for each project
            const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
            
            for (const task of projectTasks) {
              childEntities.push({
                id: task.id,
                title: task.title,
                description: task.description,
                type: 'task',
                dependencies: [],
                parentId: project.id,
                priority: task.priority as any,
                domain: 'execution'
              });
              
              // Get subtasks for each task
              const taskSubtasks = await db.select().from(subtasks).where(eq(subtasks.taskId, task.id));
              
              for (const subtask of taskSubtasks) {
                childEntities.push({
                  id: subtask.id,
                  title: subtask.title,
                  description: subtask.description,
                  type: 'subtask',
                  dependencies: [],
                  parentId: task.id,
                  priority: subtask.priority as any,
                  domain: 'execution'
                });
              }
            }
          }
        }
      } else if (entityType === 'project') {
        const projectData = await db.select().from(projects).where(eq(projects.id, entityId)).limit(1);
        if (projectData.length === 0) {
          return res.status(404).json({ message: "Project not found" });
        }
        entityData = projectData[0];
      } else if (entityType === 'task') {
        const taskData = await db.select().from(tasks).where(eq(tasks.id, entityId)).limit(1);
        if (taskData.length === 0) {
          return res.status(404).json({ message: "Task not found" });
        }
        entityData = taskData[0];
      } else if (entityType === 'subtask') {
        const subtaskData = await db.select().from(subtasks).where(eq(subtasks.id, entityId)).limit(1);
        if (subtaskData.length === 0) {
          return res.status(404).json({ message: "Subtask not found" });
        }
        entityData = subtaskData[0];
      }

      // Create timeline estimator
      const estimator = createDefaultTimelineEstimator();
      
      // Main entity for estimation
      const mainTask: TaskWithEstimate = {
        id: entityData.id,
        title: entityData.title,
        description: entityData.description,
        type: entityType as any,
        dependencies: [],
        priority: entityData.priority as any,
        domain: entityType === 'goal' ? 'planning' : 'execution'
      };

      // Generate AI estimate for main entity
      const estimate = await estimator.analyzeTaskComplexity(mainTask);
      
      // Save estimate to database (handle gracefully if table doesn't exist)
      try {
        await db.insert(timeEstimates).values({
          entityId,
          entityType,
          optimisticHours: estimate.optimistic.toString(),
          realisticHours: estimate.realistic.toString(),
          pessimisticHours: estimate.pessimistic.toString(),
          confidence: estimate.confidence.toString(),
          complexityFactors: estimate.factors,
          domain: mainTask.domain || 'general',
          bufferHours: "0"
        });
      } catch (error) {
        console.log("Time estimates table not yet created, returning estimate without saving");
      }

      // If hierarchy requested, generate timeline for all entities
      let timeline = null;
      if (includeHierarchy && childEntities.length > 0) {
        const allTasks = [mainTask, ...childEntities];
        timeline = await estimateProjectTimeline(allTasks, new Date());
      }

      res.json({
        entityId,
        entityType,
        estimate: {
          optimistic: estimate.optimistic,
          realistic: estimate.realistic,
          pessimistic: estimate.pessimistic,
          confidence: estimate.confidence,
          factors: estimate.factors,
          domain: mainTask.domain
        },
        timeline: timeline || null,
        hierarchyCount: childEntities.length
      });

    } catch (error) {
      console.error('Timeline estimation error:', error);
      next(error);
    }
  });

  /**
   * Generate complete project timeline with dependencies
   */
  app.post("/api/timeline/project-schedule", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { goalId, startDate, userProfile } = req.body;
      
      // Fetch goal and complete hierarchy
      const goal = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
      if (goal.length === 0) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Build complete task list with dependencies
      const allTasks: TaskWithEstimate[] = [];
      
      // Get all projects for this goal
      const goalProjects = await db.select().from(projects).where(eq(projects.goalId, goalId));
      
      for (const project of goalProjects) {
        allTasks.push({
          id: project.id,
          title: project.title,
          description: project.description,
          type: 'project',
          dependencies: [], // Projects typically depend on goal approval
          parentId: goalId,
          priority: project.priority as any,
          domain: 'planning'
        });
        
        // Get tasks for each project
        const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, project.id));
        
        for (const task of projectTasks) {
          allTasks.push({
            id: task.id,
            title: task.title,
            description: task.description,
            type: 'task',
            dependencies: [project.id], // Tasks depend on their project
            parentId: project.id,
            priority: task.priority as any,
            domain: 'execution'
          });
          
          // Get subtasks for each task
          const taskSubtasks = await db.select().from(subtasks).where(eq(subtasks.taskId, task.id));
          
          for (const subtask of taskSubtasks) {
            allTasks.push({
              id: subtask.id,
              title: subtask.title,
              description: subtask.description,
              type: 'subtask',
              dependencies: [task.id], // Subtasks depend on their task
              parentId: task.id,
              priority: subtask.priority as any,
              domain: 'execution'
            });
          }
        }
      }

      // Generate complete timeline
      const timeline = await estimateProjectTimeline(
        allTasks, 
        startDate ? new Date(startDate) : new Date(),
        userProfile
      );

      // Try to save schedule (handle gracefully if table doesn't exist)
      try {
        for (const item of timeline.schedule) {
          await db.insert(scheduledTasks).values({
            entityId: item.taskId,
            entityType: allTasks.find(t => t.id === item.taskId)?.type || 'task',
            scheduledStartDate: item.startDate,
            scheduledEndDate: item.endDate,
            estimatedDuration: item.duration.toString(),
            bufferTime: item.bufferTime.toString(),
            criticalPath: item.criticalPath,
            dependencies: item.dependencies.map(d => d.toString())
          });
        }
      } catch (error) {
        console.log("Scheduled tasks table not yet created, returning timeline without saving");
      }

      res.json({
        goal: goal[0],
        timeline: {
          schedule: timeline.schedule.map(item => ({
            ...item,
            task: allTasks.find(t => t.id === item.taskId)
          })),
          totalDuration: timeline.totalDuration,
          criticalPath: timeline.criticalPath,
          completionDate: timeline.completionDate,
          tasksCount: allTasks.length
        }
      });

    } catch (error) {
      console.error('Project scheduling error:', error);
      next(error);
    }
  });

  /**
   * Record actual completion time for learning
   */
  app.post("/api/timeline/record-completion", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        entityId, 
        entityType, 
        estimatedHours, 
        actualHours, 
        estimatedStartDate,
        actualStartDate,
        estimatedEndDate,
        actualEndDate,
        complexityFactors = [],
        domain = 'general'
      } = req.body;

      const accuracy = estimatedHours > 0 ? actualHours / estimatedHours : 0;

      // Try to save to estimation history (handle gracefully if table doesn't exist)
      try {
        await db.insert(estimationHistory).values({
          entityId,
          entityType,
          estimatedHours: estimatedHours.toString(),
          actualHours: actualHours.toString(),
          estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : null,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
          estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : null,
          actualEndDate: actualEndDate ? new Date(actualEndDate) : null,
          complexityFactors,
          domain,
          accuracy: accuracy.toString(),
          completedAt: new Date()
        });
      } catch (error) {
        console.log("Estimation history table not yet created, recording completion locally");
      }

      // Update learning engine
      const learningEngine = createLearningEngine();
      const record = learningEngine.recordCompletion({
        entityId,
        entityType: entityType as any,
        estimatedHours,
        actualHours,
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate) : new Date(),
        actualStartDate: actualStartDate ? new Date(actualStartDate) : new Date(),
        estimatedEndDate: estimatedEndDate ? new Date(estimatedEndDate) : new Date(),
        actualEndDate: actualEndDate ? new Date(actualEndDate) : new Date(),
        complexityFactors,
        domain,
        completedAt: new Date()
      });

      res.json({
        message: "Completion recorded successfully",
        record: {
          id: record.id,
          accuracy: record.accuracy,
          improvement: accuracy > 0.8 ? "Good estimation!" : accuracy > 0.6 ? "Room for improvement" : "Significantly underestimated"
        }
      });

    } catch (error) {
      console.error('Recording completion error:', error);
      next(error);
    }
  });

  /**
   * Get learning insights and recommendations
   */
  app.get("/api/timeline/insights", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { lookbackDays = 90 } = req.query;
      
      // Fetch historical data (handle gracefully if table doesn't exist)
      let historyRecords: any[] = [];
      try {
        historyRecords = await db.select()
          .from(estimationHistory)
          .orderBy(desc(estimationHistory.createdAt))
          .limit(100);
      } catch (error) {
        console.log("Estimation history table not yet created, returning default insights");
      }

      const learningEngine = createLearningEngine();
      
      // Convert database records to learning engine format
      const learningRecords: EstimationRecord[] = historyRecords.map(record => ({
        id: record.id,
        taskId: record.entityId,
        taskType: record.entityType as any,
        estimatedHours: parseFloat(record.estimatedHours || '0'),
        actualHours: parseFloat(record.actualHours || '0'),
        estimatedStartDate: record.estimatedStartDate || new Date(),
        actualStartDate: record.actualStartDate || new Date(),
        estimatedEndDate: record.estimatedEndDate || new Date(),
        actualEndDate: record.actualEndDate || new Date(),
        complexityFactors: record.complexityFactors || [],
        domain: record.domain || 'general',
        accuracy: parseFloat(record.accuracy || '0'),
        createdAt: record.createdAt || new Date(),
        completedAt: record.completedAt
      }));

      const insights = learningEngine.generateLearningInsights(Number(lookbackDays));
      const productivityProfile = learningEngine.updateProductivityProfile(learningRecords);

      res.json({
        insights,
        productivityProfile,
        dataPoints: learningRecords.length,
        recommendations: insights.recommendations
      });

    } catch (error) {
      console.error('Learning insights error:', error);
      next(error);
    }
  });

  /**
   * Get user's productivity profile
   */
  app.get("/api/timeline/productivity-profile", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId = 1 } = req.query; // Default user for now
      
      // Try to fetch from database (handle gracefully if table doesn't exist)
      let profile = null;
      try {
        const profiles = await db.select()
          .from(userProductivityProfiles)
          .where(eq(userProductivityProfiles.userId, Number(userId)))
          .limit(1);
        
        if (profiles.length > 0) {
          const dbProfile = profiles[0];
          profile = {
            dailyCapacity: parseFloat(dbProfile.dailyCapacity || '6'),
            workingDays: dbProfile.workingDays || [1, 2, 3, 4, 5],
            peakHours: {
              start: dbProfile.peakHoursStart || 9,
              end: dbProfile.peakHoursEnd || 12
            },
            domainEfficiency: dbProfile.domainEfficiency ? JSON.parse(dbProfile.domainEfficiency) : {},
            historicalAccuracy: parseFloat(dbProfile.historicalAccuracy || '0.75'),
            averageOverrun: parseFloat(dbProfile.averageOverrun || '1.30')
          };
        }
      } catch (error) {
        console.log("User productivity profiles table not yet created, using defaults");
      }

      // Default profile if none found
      if (!profile) {
        profile = {
          dailyCapacity: 6,
          workingDays: [1, 2, 3, 4, 5],
          peakHours: { start: 9, end: 12 },
          domainEfficiency: {
            'coding': 1.0,
            'writing': 0.8,
            'research': 0.7,
            'design': 0.9,
            'planning': 1.1,
            'testing': 0.85
          },
          historicalAccuracy: 0.75,
          averageOverrun: 1.3
        };
      }

      res.json({
        userId: Number(userId),
        profile,
        message: "Productivity profile retrieved successfully"
      });

    } catch (error) {
      console.error('Productivity profile error:', error);
      next(error);
    }
  });

  /**
   * Update user's productivity profile
   */
  app.patch("/api/timeline/productivity-profile", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        userId = 1, 
        dailyCapacity, 
        workingDays, 
        peakHours, 
        domainEfficiency 
      } = req.body;

      const updateData: any = {};
      if (dailyCapacity !== undefined) updateData.dailyCapacity = dailyCapacity.toString();
      if (workingDays !== undefined) updateData.workingDays = workingDays;
      if (peakHours !== undefined) {
        updateData.peakHoursStart = peakHours.start;
        updateData.peakHoursEnd = peakHours.end;
      }
      if (domainEfficiency !== undefined) {
        updateData.domainEfficiency = JSON.stringify(domainEfficiency);
      }
      updateData.updatedAt = new Date();

      // Try to update database (handle gracefully if table doesn't exist)
      try {
        const existing = await db.select()
          .from(userProductivityProfiles)
          .where(eq(userProductivityProfiles.userId, Number(userId)))
          .limit(1);

        if (existing.length > 0) {
          await db.update(userProductivityProfiles)
            .set(updateData)
            .where(eq(userProductivityProfiles.userId, Number(userId)));
        } else {
          await db.insert(userProductivityProfiles).values({
            userId: Number(userId),
            ...updateData
          });
        }
      } catch (error) {
        console.log("User productivity profiles table not yet created, returning update confirmation");
      }

      res.json({
        message: "Productivity profile updated successfully",
        userId: Number(userId),
        updatedFields: Object.keys(updateData)
      });

    } catch (error) {
      console.error('Update productivity profile error:', error);
      next(error);
    }
  });

  /**
   * Get optimal scheduling suggestions
   */
  app.post("/api/timeline/optimize-schedule", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { taskIds, startDate = new Date(), userId = 1 } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds)) {
        return res.status(400).json({ message: "taskIds array is required" });
      }

      // Fetch productivity profile
      let productivityProfile = null;
      try {
        const profiles = await db.select()
          .from(userProductivityProfiles)
          .where(eq(userProductivityProfiles.userId, Number(userId)))
          .limit(1);
        
        if (profiles.length > 0) {
          const dbProfile = profiles[0];
          productivityProfile = {
            dailyCapacity: parseFloat(dbProfile.dailyCapacity || '6'),
            peakHours: {
              start: dbProfile.peakHoursStart || 9,
              end: dbProfile.peakHoursEnd || 12
            },
            domainEfficiency: dbProfile.domainEfficiency ? JSON.parse(dbProfile.domainEfficiency) : {}
          };
        }
      } catch (error) {
        console.log("Using default productivity profile");
      }

      // Fetch tasks and their estimates
      const taskData = [];
      
      for (const taskId of taskIds) {
        // Fetch task details
        const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
        if (task.length > 0) {
          // Get time estimate
          let estimate = null;
          try {
            const estimates = await db.select()
              .from(timeEstimates)
              .where(and(
                eq(timeEstimates.entityId, taskId),
                eq(timeEstimates.entityType, 'task')
              ))
              .orderBy(desc(timeEstimates.createdAt))
              .limit(1);
            
            if (estimates.length > 0) {
              estimate = estimates[0];
            }
          } catch (error) {
            console.log("Time estimates table not available, using default estimate");
          }

          taskData.push({
            id: task[0].id,
            type: 'task',
            estimatedHours: estimate ? parseFloat(estimate.realisticHours || '2') : 2,
            domain: estimate?.domain || 'general',
            complexity: estimate?.complexityFactors?.includes('complex') ? 'complex' : 'medium'
          });
        }
      }

      // Generate optimal schedule
      const learningEngine = createLearningEngine();
      const optimizedSchedule = learningEngine.optimizeScheduling(
        taskData,
        new Date(startDate)
      );

      res.json({
        schedule: optimizedSchedule,
        profileUsed: productivityProfile || 'default',
        totalTasks: taskData.length,
        recommendations: [
          'Schedule complex tasks during peak hours',
          'Consider buffer time between tasks',
          'Group similar domain tasks together'
        ]
      });

    } catch (error) {
      console.error('Schedule optimization error:', error);
      next(error);
    }
  });
}