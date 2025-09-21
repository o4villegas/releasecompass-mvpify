import type { Milestone, FinancialSummary } from './shared';

/**
 * Financial calculation engine for music release timeline
 * Provides real-time budget analysis, risk assessment, and critical path calculation
 */
export class FinancialEngine {

  /**
   * Calculate comprehensive financial summary from milestones
   */
  static calculateFinancialSummary(milestones: Milestone[]): FinancialSummary {
    const totalBudget = milestones.reduce((sum, m) => sum + m.budget, 0);
    const totalActualCost = milestones.reduce((sum, m) => sum + m.actualCost, 0);

    // Calculate projected overrun based on completion rates and trends
    const projectedOverrun = this.calculateProjectedOverrun(milestones);

    // Calculate risk score based on multiple factors
    const riskScore = this.calculateRiskScore(milestones);

    // Find critical path through dependencies
    const criticalPath = this.findCriticalPath(milestones);

    return {
      totalBudget,
      totalActualCost,
      projectedOverrun,
      riskScore,
      criticalPath,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate projected budget overrun based on current trends
   */
  private static calculateProjectedOverrun(milestones: Milestone[]): number {
    let projectedTotal = 0;

    for (const milestone of milestones) {
      switch (milestone.status) {
        case 'completed':
          projectedTotal += milestone.actualCost;
          break;
        case 'in-progress':
          // Project completion cost based on current overrun ratio
          const completionRatio = milestone.actualCost / milestone.budget;
          projectedTotal += milestone.budget * Math.max(completionRatio, 1);
          break;
        case 'planned':
          // Apply risk multiplier to planned milestones
          const riskMultiplier = this.getRiskMultiplier(milestone.riskLevel);
          projectedTotal += milestone.budget * riskMultiplier;
          break;
        case 'overdue':
          // Overdue items typically cost 20% more due to rush costs
          projectedTotal += milestone.budget * 1.2;
          break;
      }
    }

    const totalBudget = milestones.reduce((sum, m) => sum + m.budget, 0);
    return Math.max(0, projectedTotal - totalBudget);
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private static calculateRiskScore(milestones: Milestone[]): number {
    if (milestones.length === 0) return 0;

    let totalRiskPoints = 0;
    let maxPossiblePoints = 0;

    for (const milestone of milestones) {
      const weight = milestone.budget; // Weight by budget impact
      let riskPoints = 0;

      // Risk level scoring
      switch (milestone.riskLevel) {
        case 'high': riskPoints += 30; break;
        case 'medium': riskPoints += 15; break;
        case 'low': riskPoints += 5; break;
      }

      // Status risk scoring
      switch (milestone.status) {
        case 'overdue': riskPoints += 25; break;
        case 'in-progress':
          // Check if over budget
          if (milestone.actualCost > milestone.budget) riskPoints += 15;
          break;
        case 'completed':
          // Reduce risk for completed items
          riskPoints = Math.max(0, riskPoints - 10);
          break;
      }

      // Dependency risk - milestones with many dependencies are riskier
      riskPoints += Math.min(20, milestone.dependencies.length * 3);

      totalRiskPoints += riskPoints * weight;
      maxPossiblePoints += 75 * weight; // Max possible risk points per milestone
    }

    return Math.min(100, Math.round((totalRiskPoints / maxPossiblePoints) * 100));
  }

  /**
   * Find critical path through milestone dependencies
   */
  private static findCriticalPath(milestones: Milestone[]): string[] {
    const milestoneMap = new Map(milestones.map(m => [m.id, m]));
    const visited = new Set<string>();
    const criticalPath: string[] = [];

    // Find milestone with no dependencies (start of chain)
    const startMilestones = milestones.filter(m => m.dependencies.length === 0);

    if (startMilestones.length === 0) return []; // No clear starting point

    // Use DFS to find longest path (critical path)
    const findLongestPath = (milestoneId: string, currentPath: string[]): string[] => {
      if (visited.has(milestoneId)) return currentPath;

      visited.add(milestoneId);
      const currentMilestone = milestoneMap.get(milestoneId);
      if (!currentMilestone) return currentPath;

      const newPath = [...currentPath, milestoneId];

      // Find all milestones that depend on this one
      const dependents = milestones.filter(m =>
        m.dependencies.includes(milestoneId)
      );

      if (dependents.length === 0) return newPath;

      // Find the longest path among all dependents
      let longestPath = newPath;
      for (const dependent of dependents) {
        const path = findLongestPath(dependent.id, newPath);
        if (path.length > longestPath.length) {
          longestPath = path;
        }
      }

      return longestPath;
    };

    // Find the longest critical path from all starting points
    let longestCriticalPath: string[] = [];
    for (const start of startMilestones) {
      visited.clear();
      const path = findLongestPath(start.id, []);
      if (path.length > longestCriticalPath.length) {
        longestCriticalPath = path;
      }
    }

    return longestCriticalPath;
  }

  /**
   * Get risk multiplier for budget projections
   */
  private static getRiskMultiplier(riskLevel: 'low' | 'medium' | 'high'): number {
    switch (riskLevel) {
      case 'low': return 1.05;    // 5% buffer
      case 'medium': return 1.15; // 15% buffer
      case 'high': return 1.30;   // 30% buffer
    }
  }

  /**
   * Calculate timeline position (0-1) based on date and timeline bounds
   */
  static calculateTimelinePosition(
    date: Date,
    timelineStart: Date,
    timelineEnd: Date
  ): number {
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const elapsed = date.getTime() - timelineStart.getTime();
    return Math.max(0, Math.min(1, elapsed / totalDuration));
  }

  /**
   * Calculate optimal radial position to avoid overlap
   */
  static calculateRadialPosition(
    milestone: Milestone,
    existingMilestones: Milestone[],
    timelinePosition: number
  ): number {
    const nearbyMilestones = existingMilestones.filter(m =>
      Math.abs(m.timelinePosition - timelinePosition) < 0.05 // Within 5% of timeline
    );

    if (nearbyMilestones.length === 0) return 0;

    // Find available angular positions
    const occupiedAngles = nearbyMilestones.map(m => m.radialPosition).sort();
    const minSpacing = Math.PI / 6; // 30 degrees minimum spacing

    // Find first available position
    let targetAngle = 0;
    for (const occupied of occupiedAngles) {
      if (targetAngle + minSpacing <= occupied) break;
      targetAngle = occupied + minSpacing;
    }

    return targetAngle % (Math.PI * 2);
  }
}