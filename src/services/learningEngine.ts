// Learning Engine for Continuous Timeline Estimation Improvement

export interface EstimationRecord {
  id: number;
  taskId: number;
  taskType: 'goal' | 'project' | 'task' | 'subtask';
  estimatedHours: number;
  actualHours: number;
  estimatedStartDate: Date;
  actualStartDate: Date;
  estimatedEndDate: Date;
  actualEndDate: Date;
  complexityFactors: string[];
  domain: string;
  accuracy: number; // actual/estimated ratio
  createdAt: Date;
  completedAt?: Date;
}

export interface LearningInsights {
  overallAccuracy: number;
  domainAccuracy: Record<string, number>;
  complexityAccuracy: Record<string, number>;
  typeAccuracy: Record<string, number>;
  patterns: {
    commonOverruns: string[];
    underestimationFactors: string[];
    accuracyTrends: { period: string; accuracy: number }[];
  };
  recommendations: {
    bufferAdjustments: Record<string, number>;
    domainMultipliers: Record<string, number>;
    focusAreas: string[];
  };
}

export interface ProductivityPattern {
  timeOfDay: Record<number, number>; // hour -> efficiency multiplier
  dayOfWeek: Record<number, number>; // day -> efficiency multiplier
  taskSequencing: Record<string, number>; // task type sequence -> efficiency
  contextSwitching: {
    penalty: number; // time lost per context switch
    recoveryTime: number; // time to regain focus
  };
}

export class LearningEngine {
  private estimationHistory: EstimationRecord[] = [];
  private productivityPatterns: ProductivityPattern;

  constructor() {
    this.productivityPatterns = {
      timeOfDay: {},
      dayOfWeek: {},
      taskSequencing: {},
      contextSwitching: {
        penalty: 0.25, // 15 minutes lost per switch
        recoveryTime: 0.33 // 20 minutes to regain focus
      }
    };
  }

  /**
   * Record actual completion data for learning
   */
  recordCompletion(record: Omit<EstimationRecord, 'id' | 'accuracy' | 'createdAt'>): EstimationRecord {
    const accuracy = record.actualHours > 0 ? record.estimatedHours / record.actualHours : 0;
    
    const estimationRecord: EstimationRecord = {
      id: Date.now(), // Simple ID generation
      accuracy,
      createdAt: new Date(),
      ...record
    };

    this.estimationHistory.push(estimationRecord);
    
    // Update productivity patterns
    this.updateProductivityPatterns(estimationRecord);
    
    return estimationRecord;
  }

  /**
   * Analyze estimation accuracy and generate insights
   */
  generateLearningInsights(lookbackDays: number = 90): LearningInsights {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
    
    const recentRecords = this.estimationHistory.filter(
      record => record.createdAt >= cutoffDate
    );

    if (recentRecords.length === 0) {
      return this.getDefaultInsights();
    }

    // Overall accuracy
    const overallAccuracy = this.calculateAverageAccuracy(recentRecords);

    // Domain-specific accuracy
    const domainAccuracy = this.calculateDomainAccuracy(recentRecords);

    // Complexity-specific accuracy
    const complexityAccuracy = this.calculateComplexityAccuracy(recentRecords);

    // Task type accuracy
    const typeAccuracy = this.calculateTypeAccuracy(recentRecords);

    // Pattern analysis
    const patterns = this.analyzePatterns(recentRecords);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      overallAccuracy, 
      domainAccuracy, 
      complexityAccuracy, 
      patterns
    );

    return {
      overallAccuracy,
      domainAccuracy,
      complexityAccuracy,
      typeAccuracy,
      patterns,
      recommendations
    };
  }

  /**
   * Predict optimal scheduling based on learned patterns
   */
  optimizeScheduling(
    tasks: Array<{
      id: number;
      type: string;
      estimatedHours: number;
      domain: string;
      complexity: string;
    }>,
    startDate: Date
  ): Array<{
    taskId: number;
    optimalStartTime: Date;
    optimalEndTime: Date;
    efficiencyScore: number;
    recommendations: string[];
  }> {
    const schedule = [];
    let currentDate = new Date(startDate);

    for (const task of tasks) {
      const optimalTiming = this.findOptimalTimeSlot(
        task.estimatedHours,
        task.domain,
        task.complexity,
        currentDate
      );

      schedule.push({
        taskId: task.id,
        optimalStartTime: optimalTiming.startTime,
        optimalEndTime: optimalTiming.endTime,
        efficiencyScore: optimalTiming.efficiency,
        recommendations: optimalTiming.recommendations
      });

      currentDate = new Date(optimalTiming.endTime);
    }

    return schedule;
  }

  /**
   * Update user's productivity profile based on completion data
   */
  updateProductivityProfile(completions: EstimationRecord[]): {
    dailyCapacity: number;
    peakHours: { start: number; end: number };
    domainEfficiency: Record<string, number>;
    averageOverrun: number;
  } {
    // Calculate actual daily capacity
    const dailyHours = this.calculateDailyCapacity(completions);
    
    // Find peak productivity hours
    const peakHours = this.findPeakProductivityHours(completions);
    
    // Calculate domain-specific efficiency
    const domainEfficiency = this.calculateDomainEfficiency(completions);
    
    // Calculate average overrun
    const averageOverrun = completions.length > 0 
      ? completions.reduce((sum, record) => sum + (record.actualHours / record.estimatedHours), 0) / completions.length
      : 1.3;

    return {
      dailyCapacity: dailyHours,
      peakHours,
      domainEfficiency,
      averageOverrun
    };
  }

  /**
   * Private helper methods
   */

  private updateProductivityPatterns(record: EstimationRecord): void {
    if (!record.actualStartDate || !record.completedAt) return;

    // Update time of day patterns
    const startHour = record.actualStartDate.getHours();
    const efficiency = record.accuracy;
    
    this.productivityPatterns.timeOfDay[startHour] = 
      (this.productivityPatterns.timeOfDay[startHour] || 0) * 0.9 + efficiency * 0.1;

    // Update day of week patterns
    const dayOfWeek = record.actualStartDate.getDay();
    this.productivityPatterns.dayOfWeek[dayOfWeek] = 
      (this.productivityPatterns.dayOfWeek[dayOfWeek] || 0) * 0.9 + efficiency * 0.1;
  }

  private calculateAverageAccuracy(records: EstimationRecord[]): number {
    if (records.length === 0) return 0;
    return records.reduce((sum, record) => sum + record.accuracy, 0) / records.length;
  }

  private calculateDomainAccuracy(records: EstimationRecord[]): Record<string, number> {
    const domainGroups = this.groupBy(records, 'domain');
    const accuracy: Record<string, number> = {};

    Object.entries(domainGroups).forEach(([domain, domainRecords]) => {
      accuracy[domain] = this.calculateAverageAccuracy(domainRecords);
    });

    return accuracy;
  }

  private calculateComplexityAccuracy(records: EstimationRecord[]): Record<string, number> {
    const complexityAccuracy: Record<string, number> = {};
    
    // Group by complexity factors
    const complexityGroups: Record<string, EstimationRecord[]> = {};
    
    records.forEach(record => {
      record.complexityFactors.forEach(factor => {
        if (!complexityGroups[factor]) complexityGroups[factor] = [];
        complexityGroups[factor].push(record);
      });
    });

    Object.entries(complexityGroups).forEach(([complexity, complexityRecords]) => {
      complexityAccuracy[complexity] = this.calculateAverageAccuracy(complexityRecords);
    });

    return complexityAccuracy;
  }

  private calculateTypeAccuracy(records: EstimationRecord[]): Record<string, number> {
    const typeGroups = this.groupBy(records, 'taskType');
    const accuracy: Record<string, number> = {};

    Object.entries(typeGroups).forEach(([type, typeRecords]) => {
      accuracy[type] = this.calculateAverageAccuracy(typeRecords);
    });

    return accuracy;
  }

  private analyzePatterns(records: EstimationRecord[]): LearningInsights['patterns'] {
    // Find common overrun factors
    const overrunRecords = records.filter(r => r.accuracy < 0.8);
    const overrunFactors = this.getCommonFactors(overrunRecords);

    // Find underestimation factors
    const underestimatedRecords = records.filter(r => r.accuracy < 0.7);
    const underestimationFactors = this.getCommonFactors(underestimatedRecords);

    // Calculate accuracy trends
    const accuracyTrends = this.calculateAccuracyTrends(records);

    return {
      commonOverruns: overrunFactors,
      underestimationFactors,
      accuracyTrends
    };
  }

  private generateRecommendations(
    overallAccuracy: number,
    domainAccuracy: Record<string, number>,
    complexityAccuracy: Record<string, number>,
    patterns: LearningInsights['patterns']
  ): LearningInsights['recommendations'] {
    const bufferAdjustments: Record<string, number> = {};
    const domainMultipliers: Record<string, number> = {};
    const focusAreas: string[] = [];

    // Buffer adjustments based on accuracy
    Object.entries(complexityAccuracy).forEach(([complexity, accuracy]) => {
      if (accuracy < 0.8) {
        bufferAdjustments[complexity] = (1 / accuracy) * 1.2; // Increase buffer
      }
    });

    // Domain multipliers
    Object.entries(domainAccuracy).forEach(([domain, accuracy]) => {
      domainMultipliers[domain] = 1 / Math.max(accuracy, 0.5);
    });

    // Focus areas
    if (overallAccuracy < 0.7) {
      focusAreas.push('Improve overall estimation accuracy');
    }
    
    if (patterns.commonOverruns.length > 0) {
      focusAreas.push(`Address common overrun factors: ${patterns.commonOverruns.slice(0, 3).join(', ')}`);
    }

    return {
      bufferAdjustments,
      domainMultipliers,
      focusAreas
    };
  }

  private findOptimalTimeSlot(
    estimatedHours: number,
    domain: string,
    complexity: string,
    startDate: Date
  ): {
    startTime: Date;
    endTime: Date;
    efficiency: number;
    recommendations: string[];
  } {
    // Find the best time slot based on productivity patterns
    const bestHour = Object.entries(this.productivityPatterns.timeOfDay)
      .sort(([, a], [, b]) => b - a)[0];
    
    const startTime = new Date(startDate);
    if (bestHour) {
      startTime.setHours(parseInt(bestHour[0]));
    }

    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + Math.ceil(estimatedHours));

    const efficiency = parseFloat(bestHour?.[1]?.toString() || '1');

    const recommendations = [];
    if (efficiency > 0.9) {
      recommendations.push('Optimal timing for peak productivity');
    }
    if (complexity === 'complex' && efficiency < 0.8) {
      recommendations.push('Consider scheduling complex tasks during peak hours');
    }

    return { startTime, endTime, efficiency, recommendations };
  }

  private calculateDailyCapacity(records: EstimationRecord[]): number {
    const dailyTotals = new Map<string, number>();
    
    records.forEach(record => {
      if (record.actualStartDate && record.completedAt) {
        const dateKey = record.actualStartDate.toISOString().split('T')[0];
        const hours = dailyTotals.get(dateKey) || 0;
        dailyTotals.set(dateKey, hours + record.actualHours);
      }
    });

    const capacities = Array.from(dailyTotals.values());
    return capacities.length > 0 
      ? capacities.reduce((sum, cap) => sum + cap, 0) / capacities.length 
      : 6;
  }

  private findPeakProductivityHours(records: EstimationRecord[]): { start: number; end: number } {
    const hourlyEfficiency: Record<number, number[]> = {};
    
    records.forEach(record => {
      if (record.actualStartDate) {
        const hour = record.actualStartDate.getHours();
        if (!hourlyEfficiency[hour]) hourlyEfficiency[hour] = [];
        hourlyEfficiency[hour].push(record.accuracy);
      }
    });

    // Calculate average efficiency per hour
    const hourlyAverage: Record<number, number> = {};
    Object.entries(hourlyEfficiency).forEach(([hour, efficiencies]) => {
      hourlyAverage[parseInt(hour)] = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    });

    // Find the best 3-hour window
    let bestStart = 9;
    let bestEfficiency = 0;
    
    for (let start = 6; start <= 18; start++) {
      const windowEfficiency = (hourlyAverage[start] || 0) + 
                              (hourlyAverage[start + 1] || 0) + 
                              (hourlyAverage[start + 2] || 0);
      if (windowEfficiency > bestEfficiency) {
        bestEfficiency = windowEfficiency;
        bestStart = start;
      }
    }

    return { start: bestStart, end: bestStart + 3 };
  }

  private calculateDomainEfficiency(records: EstimationRecord[]): Record<string, number> {
    const domainGroups = this.groupBy(records, 'domain');
    const efficiency: Record<string, number> = {};

    Object.entries(domainGroups).forEach(([domain, domainRecords]) => {
      const avgAccuracy = this.calculateAverageAccuracy(domainRecords);
      efficiency[domain] = Math.max(avgAccuracy, 0.5); // Minimum 50% efficiency
    });

    return efficiency;
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private getCommonFactors(records: EstimationRecord[]): string[] {
    const factorCounts: Record<string, number> = {};
    
    records.forEach(record => {
      record.complexityFactors.forEach(factor => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });
    });

    return Object.entries(factorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([factor]) => factor);
  }

  private calculateAccuracyTrends(records: EstimationRecord[]): Array<{ period: string; accuracy: number }> {
    // Group by month
    const monthlyGroups: Record<string, EstimationRecord[]> = {};
    
    records.forEach(record => {
      const monthKey = record.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = [];
      monthlyGroups[monthKey].push(record);
    });

    return Object.entries(monthlyGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, periodRecords]) => ({
        period,
        accuracy: this.calculateAverageAccuracy(periodRecords)
      }));
  }

  private getDefaultInsights(): LearningInsights {
    return {
      overallAccuracy: 0.75,
      domainAccuracy: {},
      complexityAccuracy: {},
      typeAccuracy: {},
      patterns: {
        commonOverruns: [],
        underestimationFactors: [],
        accuracyTrends: []
      },
      recommendations: {
        bufferAdjustments: {},
        domainMultipliers: {},
        focusAreas: ['Start completing tasks to build estimation accuracy']
      }
    };
  }
}

// Utility functions for integration
export const createLearningEngine = () => new LearningEngine();

export const updateUserProfileWithLearning = async (
  learningEngine: LearningEngine,
  completions: EstimationRecord[]
): Promise<{
  insights: LearningInsights;
  updatedProfile: ReturnType<LearningEngine['updateProductivityProfile']>;
}> => {
  const insights = learningEngine.generateLearningInsights();
  const updatedProfile = learningEngine.updateProductivityProfile(completions);
  
  return { insights, updatedProfile };
};