// Financial calculation engine for ReleaseCompass MVP
import type { Milestone, FinancialSummary } from './shared';

export class FinancialEngine {
  // Project type budget baselines from roadmap requirements
  static readonly PROJECT_BUDGETS = {
    single: 1500,
    ep: 6500,
    album: 25000
  };

  // Timeline compression thresholds
  static readonly COMPRESSION_LEVELS = {
    mild: { threshold: 0.85, impact: 0.05 },    // 5-10% revenue impact
    moderate: { threshold: 0.70, impact: 0.15 }, // 15-25% revenue impact
    severe: { threshold: 0.50, impact: 0.30 }    // 30%+ revenue impact
  };

  /**
   * Calculate comprehensive financial summary from milestones
   */
  static calculateFinancialSummary(milestones: Milestone[]): FinancialSummary {
    const totalBudget = milestones.reduce((sum, m) => sum + m.budget, 0);
    const totalActualCost = milestones.reduce((sum, m) => sum + m.actualCost, 0);
    const projectedOverrun = this.calculateProjectedOverrun(milestones);
    const riskScore = this.calculateRiskScore(milestones);
    const criticalPath = this.identifyCriticalPath(milestones);

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
   * Calculate projected budget overrun based on current spending patterns
   */
  static calculateProjectedOverrun(milestones: Milestone[]): number {
    const completedMilestones = milestones.filter(m => m.status === 'completed');
    const inProgressMilestones = milestones.filter(m => m.status === 'in-progress');
    const plannedMilestones = milestones.filter(m => m.status === 'planned');

    // Calculate average overrun percentage from completed milestones
    let overrunRate = 0;
    if (completedMilestones.length > 0) {
      const totalOverrun = completedMilestones.reduce((sum, m) => {
        const overrun = m.actualCost - m.budget;
        return sum + (overrun > 0 ? overrun / m.budget : 0);
      }, 0);
      overrunRate = totalOverrun / completedMilestones.length;
    }

    // Project future overruns
    const projectedInProgress = inProgressMilestones.reduce((sum, m) => {
      const projected = m.budget * (1 + overrunRate);
      return sum + Math.max(projected - m.budget, m.actualCost - m.budget);
    }, 0);

    const projectedPlanned = plannedMilestones.reduce((sum, m) => {
      return sum + (m.budget * overrunRate);
    }, 0);

    const actualOverrun = completedMilestones.reduce((sum, m) => {
      return sum + Math.max(0, m.actualCost - m.budget);
    }, 0);

    return actualOverrun + projectedInProgress + projectedPlanned;
  }

  /**
   * Calculate overall project risk score (0-100)
   */
  static calculateRiskScore(milestones: Milestone[]): number {
    if (milestones.length === 0) return 0;

    let riskScore = 0;
    let weightSum = 0;

    // Factor 1: Individual milestone risk levels (40% weight)
    const riskLevelScore = milestones.reduce((sum, m) => {
      const score = m.riskLevel === 'high' ? 100 : m.riskLevel === 'medium' ? 50 : 10;
      return sum + score;
    }, 0) / milestones.length;
    riskScore += riskLevelScore * 0.4;
    weightSum += 0.4;

    // Factor 2: Timeline compression (30% weight)
    const compressionScore = this.calculateTimelineCompression(milestones);
    riskScore += compressionScore * 0.3;
    weightSum += 0.3;

    // Factor 3: Budget overrun percentage (30% weight)
    const totalBudget = milestones.reduce((sum, m) => sum + m.budget, 0);
    const totalActual = milestones.reduce((sum, m) => sum + m.actualCost, 0);
    const overrunPercent = totalBudget > 0 ? Math.max(0, (totalActual - totalBudget) / totalBudget) : 0;
    const overrunScore = Math.min(100, overrunPercent * 200); // 50% overrun = 100 score
    riskScore += overrunScore * 0.3;
    weightSum += 0.3;

    return Math.min(100, Math.round(riskScore));
  }

  /**
   * Calculate timeline compression risk (0-100)
   */
  static calculateTimelineCompression(milestones: Milestone[]): number {
    if (milestones.length < 2) return 0;

    // Sort milestones by date
    const sorted = [...milestones].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate average spacing between milestones
    let totalDays = 0;
    let gapCount = 0;

    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = Math.abs(
        new Date(sorted[i].date).getTime() - new Date(sorted[i-1].date).getTime()
      ) / (1000 * 60 * 60 * 24);
      totalDays += daysBetween;
      gapCount++;
    }

    const avgDaysBetween = gapCount > 0 ? totalDays / gapCount : 30;

    // Optimal spacing is 14-30 days between milestones
    if (avgDaysBetween >= 14 && avgDaysBetween <= 30) {
      return 10; // Low compression risk
    } else if (avgDaysBetween >= 7 && avgDaysBetween < 14) {
      return 50; // Moderate compression
    } else if (avgDaysBetween < 7) {
      return 90; // Severe compression
    } else {
      return 30; // Too sparse, moderate risk
    }
  }

  /**
   * Identify critical path milestones (those with dependencies)
   */
  static identifyCriticalPath(milestones: Milestone[]): string[] {
    const criticalPath: string[] = [];
    const milestoneMap = new Map(milestones.map(m => [m.id, m]));

    // Find milestones that are dependencies for others
    const isDependency = new Set<string>();
    milestones.forEach(m => {
      m.dependencies.forEach(dep => isDependency.add(dep));
    });

    // Add milestones that are dependencies or have high risk
    milestones.forEach(m => {
      if (isDependency.has(m.id) || m.riskLevel === 'high' || m.status === 'overdue') {
        criticalPath.push(m.id);
      }
    });

    // Sort by date
    criticalPath.sort((a, b) => {
      const mA = milestoneMap.get(a);
      const mB = milestoneMap.get(b);
      if (!mA || !mB) return 0;
      return new Date(mA.date).getTime() - new Date(mB.date).getTime();
    });

    return criticalPath;
  }

  /**
   * Calculate timeline position (0-1) for a date within timeline bounds
   */
  static calculateTimelinePosition(date: Date, startDate: Date, endDate: Date): number {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const datePosition = date.getTime() - startDate.getTime();
    return Math.max(0, Math.min(1, datePosition / totalDuration));
  }

  /**
   * Calculate financial impact based on timeline compression
   */
  static calculateCompressionImpact(
    milestones: Milestone[],
    projectType: 'single' | 'ep' | 'album'
  ): { level: string; revenueImpact: number; message: string } {
    const compressionScore = this.calculateTimelineCompression(milestones);
    const baseRevenue = this.PROJECT_BUDGETS[projectType];

    if (compressionScore >= this.COMPRESSION_LEVELS.severe.threshold * 100) {
      const impact = baseRevenue * this.COMPRESSION_LEVELS.severe.impact;
      return {
        level: 'severe',
        revenueImpact: impact,
        message: `Severe timeline compression detected. Potential revenue loss: $${impact.toLocaleString()}`
      };
    } else if (compressionScore >= this.COMPRESSION_LEVELS.moderate.threshold * 100) {
      const impact = baseRevenue * this.COMPRESSION_LEVELS.moderate.impact;
      return {
        level: 'moderate',
        revenueImpact: impact,
        message: `Moderate timeline compression. Potential revenue impact: $${impact.toLocaleString()}`
      };
    } else if (compressionScore >= this.COMPRESSION_LEVELS.mild.threshold * 100) {
      const impact = baseRevenue * this.COMPRESSION_LEVELS.mild.impact;
      return {
        level: 'mild',
        revenueImpact: impact,
        message: `Mild timeline compression. Minor revenue impact: $${impact.toLocaleString()}`
      };
    }

    return {
      level: 'optimal',
      revenueImpact: 0,
      message: 'Timeline spacing is optimal. No compression-related revenue impact.'
    };
  }

  /**
   * Validate milestone budget against project type baseline
   */
  static validateBudget(
    totalBudget: number,
    projectType: 'single' | 'ep' | 'album'
  ): { isValid: boolean; message: string; percentageOfBaseline: number } {
    const baseline = this.PROJECT_BUDGETS[projectType];
    const percentage = (totalBudget / baseline) * 100;

    if (percentage < 80) {
      return {
        isValid: false,
        message: `Budget may be insufficient. Consider increasing to at least $${(baseline * 0.8).toLocaleString()}`,
        percentageOfBaseline: percentage
      };
    } else if (percentage > 150) {
      return {
        isValid: false,
        message: `Budget significantly exceeds typical ${projectType} costs. Review for potential optimization.`,
        percentageOfBaseline: percentage
      };
    }

    return {
      isValid: true,
      message: `Budget is appropriate for ${projectType} project.`,
      percentageOfBaseline: percentage
    };
  }
}