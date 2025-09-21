import { Milestone } from './shared';

export interface DependencyUpdate {
  milestoneId: string;
  newDate: Date;
  reason: string;
}

export class DependencyEngine {
  private milestones: Map<string, Milestone>;

  constructor(milestones: Milestone[]) {
    this.milestones = new Map(milestones.map(m => [m.id, m]));
  }

  /**
   * Update milestones collection
   */
  updateMilestones(milestones: Milestone[]): void {
    this.milestones = new Map(milestones.map(m => [m.id, m]));
  }

  /**
   * Calculate cascading updates when a milestone date changes
   */
  calculateCascadingUpdates(
    changedMilestoneId: string,
    newDate: Date
  ): DependencyUpdate[] {
    const updates: DependencyUpdate[] = [];
    const visited = new Set<string>();
    const milestone = this.milestones.get(changedMilestoneId);

    if (!milestone) return updates;

    const oldDate = milestone.date;
    const dateDiff = newDate.getTime() - oldDate.getTime();

    // Find all dependent milestones (milestones that depend on this one)
    const dependents = this.findDependentMilestones(changedMilestoneId);

    // Process each dependent milestone
    dependents.forEach(dependentId => {
      if (!visited.has(dependentId)) {
        this.cascadeUpdate(dependentId, dateDiff, updates, visited);
      }
    });

    return updates;
  }

  /**
   * Recursively cascade date changes through dependency chain
   */
  private cascadeUpdate(
    milestoneId: string,
    dateDiff: number,
    updates: DependencyUpdate[],
    visited: Set<string>
  ): void {
    if (visited.has(milestoneId)) return;
    visited.add(milestoneId);

    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return;

    // Calculate new date
    const newDate = new Date(milestone.date.getTime() + dateDiff);

    // Add to updates
    updates.push({
      milestoneId,
      newDate,
      reason: 'Dependency cascade'
    });

    // Find and update all milestones that depend on this one
    const dependents = this.findDependentMilestones(milestoneId);
    dependents.forEach(dependentId => {
      this.cascadeUpdate(dependentId, dateDiff, updates, visited);
    });
  }

  /**
   * Find all milestones that depend on the given milestone
   */
  private findDependentMilestones(milestoneId: string): string[] {
    const dependents: string[] = [];

    this.milestones.forEach((milestone, id) => {
      if (milestone.dependencies.includes(milestoneId)) {
        dependents.push(id);
      }
    });

    return dependents;
  }

  /**
   * Validate that moving a milestone won't violate dependency constraints
   */
  validateDependencyConstraints(
    milestoneId: string,
    newDate: Date
  ): { valid: boolean; violations: string[] } {
    const violations: string[] = [];
    const milestone = this.milestones.get(milestoneId);

    if (!milestone) {
      return { valid: false, violations: ['Milestone not found'] };
    }

    // Check if new date violates any dependencies this milestone has
    milestone.dependencies.forEach(depId => {
      const dependency = this.milestones.get(depId);
      if (dependency && newDate < dependency.date) {
        violations.push(
          `Cannot schedule "${milestone.title}" before its dependency "${dependency.title}"`
        );
      }
    });

    // Check if new date violates any milestones that depend on this one
    const dependents = this.findDependentMilestones(milestoneId);
    dependents.forEach(depId => {
      const dependent = this.milestones.get(depId);
      if (dependent && dependent.date < newDate) {
        violations.push(
          `Moving "${milestone.title}" would conflict with dependent milestone "${dependent.title}"`
        );
      }
    });

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Get the critical path - the longest dependency chain in the project
   */
  getCriticalPath(): string[] {
    const criticalPath: string[] = [];
    const visited = new Set<string>();
    let longestPath: string[] = [];

    // Find all milestones without dependents (end nodes)
    const endNodes = Array.from(this.milestones.keys()).filter(id => {
      return this.findDependentMilestones(id).length === 0;
    });

    // Perform DFS from each end node
    endNodes.forEach(nodeId => {
      const path = this.findLongestPath(nodeId, visited);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    });

    return longestPath.reverse();
  }

  /**
   * Find the longest path from a given milestone through its dependencies
   */
  private findLongestPath(milestoneId: string, visited: Set<string>): string[] {
    if (visited.has(milestoneId)) return [];

    const milestone = this.milestones.get(milestoneId);
    if (!milestone) return [];

    visited.add(milestoneId);

    if (milestone.dependencies.length === 0) {
      return [milestoneId];
    }

    let longestSubPath: string[] = [];
    milestone.dependencies.forEach(depId => {
      const subPath = this.findLongestPath(depId, new Set(visited));
      if (subPath.length > longestSubPath.length) {
        longestSubPath = subPath;
      }
    });

    return [milestoneId, ...longestSubPath];
  }

  /**
   * Check if adding a dependency would create a cycle
   */
  wouldCreateCycle(fromId: string, toId: string): boolean {
    // Check if there's already a path from toId to fromId
    const visited = new Set<string>();
    return this.hasPath(toId, fromId, visited);
  }

  /**
   * Check if there's a path from source to target through dependencies
   */
  private hasPath(sourceId: string, targetId: string, visited: Set<string>): boolean {
    if (sourceId === targetId) return true;
    if (visited.has(sourceId)) return false;

    visited.add(sourceId);

    const milestone = this.milestones.get(sourceId);
    if (!milestone) return false;

    for (const depId of milestone.dependencies) {
      if (this.hasPath(depId, targetId, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get visual dependency lines for rendering
   */
  getDependencyLines(): Array<{
    from: { milestoneId: string; position: { x: number; y: number } };
    to: { milestoneId: string; position: { x: number; y: number } };
  }> {
    const lines: Array<{
      from: { milestoneId: string; position: { x: number; y: number } };
      to: { milestoneId: string; position: { x: number; y: number } };
    }> = [];

    this.milestones.forEach(milestone => {
      milestone.dependencies.forEach(depId => {
        const dependency = this.milestones.get(depId);
        if (dependency) {
          // Calculate 2D positions from timeline and radial positions
          const fromX = Math.cos(dependency.radialPosition) * 100;
          const fromY = dependency.timelinePosition * 400;
          const toX = Math.cos(milestone.radialPosition) * 100;
          const toY = milestone.timelinePosition * 400;

          lines.push({
            from: {
              milestoneId: depId,
              position: { x: fromX, y: fromY }
            },
            to: {
              milestoneId: milestone.id,
              position: { x: toX, y: toY }
            }
          });
        }
      });
    });

    return lines;
  }
}