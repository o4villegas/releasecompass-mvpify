import type { Milestone } from './shared';

/**
 * 3D Timeline Cylinder Geometry
 * Transforms cobe's globe rendering into a cylindrical timeline representation
 */

export interface TimelineCylinderConfig {
  width: number;
  height: number;
  devicePixelRatio: number;
  cylinderRadius: number;
  cylinderHeight: number;
  timelineStart: Date;
  timelineEnd: Date;
  milestones: Milestone[];
  onRender?: (state: any) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
  onMilestoneDrag?: (milestone: Milestone, newPosition: { timelinePosition: number; radialPosition: number }) => void;
}

export interface CylinderMarker {
  position: [number, number]; // [timeline_position, radial_angle]
  size: number;
  color: [number, number, number];
  milestone: Milestone;
}

/**
 * Timeline Cylinder Renderer
 * Adapts cobe's globe rendering for cylindrical timeline visualization
 */
export class TimelineCylinderRenderer {
  private canvas: HTMLCanvasElement;
  private config: TimelineCylinderConfig;
  private animationId: number | null = null;
  private isDragging = false;
  private dragTarget: Milestone | null = null;
  private lastMousePos = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, config: TimelineCylinderConfig) {
    this.canvas = canvas;
    this.config = config;
    this.setupEventListeners();
  }

  /**
   * Convert milestone data to cylinder markers for cobe rendering
   */
  generateCylinderMarkers(): CylinderMarker[] {
    return this.config.milestones.map(milestone => ({
      position: [milestone.timelinePosition, milestone.radialPosition],
      size: this.getMilestoneSize(milestone),
      color: this.getMilestoneColor(milestone),
      milestone
    }));
  }

  /**
   * Transform cylinder coordinates to globe-compatible lat/lng
   * Maps cylinder surface to sphere for cobe compatibility
   */
  cylinderToGlobeCoords(timelinePos: number, radialAngle: number): [number, number] {
    // Map timeline position (0-1) to latitude (-90 to 90)
    const lat = (timelinePos - 0.5) * 180;

    // Map radial angle (0-2π) to longitude (-180 to 180)
    const lng = (radialAngle / (Math.PI * 2)) * 360 - 180;

    return [lat, lng];
  }

  /**
   * Transform globe coordinates back to cylinder space
   */
  globeToCylinderCoords(lat: number, lng: number): [number, number] {
    const timelinePos = (lat / 180) + 0.5;
    const radialAngle = ((lng + 180) / 360) * Math.PI * 2;
    return [timelinePos, radialAngle];
  }

  /**
   * Get milestone visual size based on budget and status
   */
  private getMilestoneSize(milestone: Milestone): number {
    let baseSize = 0.05;

    // Size based on budget (relative to max budget)
    const maxBudget = Math.max(...this.config.milestones.map(m => m.budget));
    if (maxBudget > 0) {
      baseSize += (milestone.budget / maxBudget) * 0.1;
    }

    // Status modifiers
    switch (milestone.status) {
      case 'completed': return baseSize * 0.8; // Smaller when done
      case 'in-progress': return baseSize * 1.2; // Larger when active
      case 'overdue': return baseSize * 1.4; // Largest for attention
      default: return baseSize;
    }
  }

  /**
   * Get milestone color based on risk and status with environmental effects
   */
  private getMilestoneColor(milestone: Milestone): [number, number, number] {
    // Base colors by status with risk intensity modulation
    const baseColors = {
      completed: [0.2, 0.8, 0.3] as [number, number, number], // Green
      'in-progress': [0.3, 0.6, 1.0] as [number, number, number], // Blue
      overdue: [1.0, 0.2, 0.2] as [number, number, number], // Red
      planned: {
        high: [1.0, 0.3, 0.2] as [number, number, number], // Bright red for high risk
        medium: [1.0, 0.65, 0.0] as [number, number, number], // Orange for medium risk
        low: [0.5, 0.8, 0.5] as [number, number, number] // Soft green for low risk
      }
    };

    if (milestone.status === 'planned') {
      return baseColors.planned[milestone.riskLevel];
    } else {
      const baseColor = baseColors[milestone.status];

      // Apply risk intensity overlay for non-planned milestones
      const riskIntensity = milestone.riskLevel === 'high' ? 1.2 :
                           milestone.riskLevel === 'medium' ? 1.0 : 0.8;

      return [
        Math.min(1.0, baseColor[0] * riskIntensity),
        Math.min(1.0, baseColor[1] * riskIntensity),
        Math.min(1.0, baseColor[2] * riskIntensity)
      ];
    }
  }

  /**
   * Calculate environmental risk effects for timeline atmosphere
   */
  getRiskEnvironmentEffects(): {
    fogIntensity: number;
    storminess: number;
    atmosphericColor: [number, number, number];
    pulseSpeed: number;
  } {
    const milestones = this.config.milestones;
    if (milestones.length === 0) {
      return {
        fogIntensity: 0.1,
        storminess: 0.0,
        atmosphericColor: [0.1, 0.1, 0.2],
        pulseSpeed: 0.005
      };
    }

    // Calculate overall risk metrics
    let totalRiskPoints = 0;
    let overdueCount = 0;
    let highRiskCount = 0;
    let criticalMilestones = 0;

    for (const milestone of milestones) {
      // Count overdue items
      if (milestone.status === 'overdue') overdueCount++;

      // Count high-risk items
      if (milestone.riskLevel === 'high') highRiskCount++;

      // Critical milestones (high risk + high budget)
      if (milestone.riskLevel === 'high' && milestone.budget > 5000) {
        criticalMilestones++;
      }

      // Risk point calculation
      let riskPoints = 0;
      switch (milestone.riskLevel) {
        case 'high': riskPoints += 3; break;
        case 'medium': riskPoints += 2; break;
        case 'low': riskPoints += 1; break;
      }

      if (milestone.status === 'overdue') riskPoints += 2;
      if (milestone.actualCost > milestone.budget * 1.2) riskPoints += 1;

      totalRiskPoints += riskPoints;
    }

    const maxPossibleRisk = milestones.length * 6; // Max risk per milestone
    const riskRatio = Math.min(1.0, totalRiskPoints / maxPossibleRisk);

    // Environmental effects based on risk
    const fogIntensity = 0.1 + (riskRatio * 0.4); // 0.1 to 0.5
    const storminess = riskRatio * 0.8; // 0 to 0.8
    const pulseSpeed = 0.005 + (riskRatio * 0.015); // Faster pulse when risky

    // Atmospheric color transitions
    let atmosphericColor: [number, number, number];
    if (riskRatio < 0.3) {
      // Low risk - calm blue
      atmosphericColor = [0.1, 0.1, 0.3];
    } else if (riskRatio < 0.6) {
      // Medium risk - warning orange
      const t = (riskRatio - 0.3) / 0.3;
      atmosphericColor = [
        0.1 + (t * 0.4), // Increase red
        0.1 + (t * 0.2), // Slight green increase
        0.3 - (t * 0.1)  // Decrease blue
      ];
    } else {
      // High risk - danger red
      const t = (riskRatio - 0.6) / 0.4;
      atmosphericColor = [
        0.5 + (t * 0.3), // Strong red
        0.3 - (t * 0.2), // Decrease green
        0.2 - (t * 0.1)  // Minimal blue
      ];
    }

    return {
      fogIntensity,
      storminess,
      atmosphericColor,
      pulseSpeed
    };
  }

  /**
   * Setup mouse/touch event listeners for interaction
   */
  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));

    // Touch events for mobile (future enhancement)
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  /**
   * Convert screen coordinates to 3D cylinder position
   */
  private screenToCylinderCoords(clientX: number, clientY: number): [number, number] | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

    // Convert to normalized device coordinates (-1 to 1)
    const ndcX = (x * 2) - 1;
    const ndcY = 1 - (y * 2);

    // For cylindrical projection:
    // Timeline position from vertical position
    const timelinePos = Math.max(0, Math.min(1, (ndcY + 1) / 2));

    // Radial angle from horizontal position (wraps around)
    const radialAngle = ((ndcX + 1) / 2) * Math.PI * 2;

    return [timelinePos, radialAngle];
  }

  /**
   * Find milestone near screen position
   */
  private findMilestoneAtPosition(clientX: number, clientY: number): Milestone | null {
    const coords = this.screenToCylinderCoords(clientX, clientY);
    if (!coords) return null;

    const [targetTimelinePos, targetRadialAngle] = coords;
    const threshold = 0.05; // 5% threshold for selection

    return this.config.milestones.find(milestone => {
      const timeDiff = Math.abs(milestone.timelinePosition - targetTimelinePos);
      const angleDiff = Math.min(
        Math.abs(milestone.radialPosition - targetRadialAngle),
        Math.abs((milestone.radialPosition + Math.PI * 2) - targetRadialAngle),
        Math.abs(milestone.radialPosition - (targetRadialAngle + Math.PI * 2))
      );

      return timeDiff < threshold && angleDiff < (threshold * Math.PI * 2);
    }) || null;
  }

  // Event handlers
  private handleMouseDown(event: MouseEvent) {
    const milestone = this.findMilestoneAtPosition(event.clientX, event.clientY);
    if (milestone) {
      this.isDragging = true;
      this.dragTarget = milestone;
      this.lastMousePos = { x: event.clientX, y: event.clientY };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (this.isDragging && this.dragTarget && this.config.onMilestoneDrag) {
      const coords = this.screenToCylinderCoords(event.clientX, event.clientY);
      if (coords) {
        const [timelinePosition, radialPosition] = coords;
        this.config.onMilestoneDrag(this.dragTarget, { timelinePosition, radialPosition });
      }
    } else {
      // Update cursor based on hover
      const milestone = this.findMilestoneAtPosition(event.clientX, event.clientY);
      this.canvas.style.cursor = milestone ? 'grab' : 'default';
    }
  }

  private handleMouseUp(event: MouseEvent) {
    this.isDragging = false;
    this.dragTarget = null;
    this.canvas.style.cursor = 'default';
  }

  private handleClick(event: MouseEvent) {
    if (!this.isDragging) { // Only handle click if not dragging
      const milestone = this.findMilestoneAtPosition(event.clientX, event.clientY);
      if (milestone && this.config.onMilestoneClick) {
        this.config.onMilestoneClick(milestone);
      }
    }
  }

  // Touch event handlers (basic implementation)
  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
    event.preventDefault(); // Prevent scrolling
  }

  private handleTouchEnd(event: TouchEvent) {
    this.handleMouseUp({} as MouseEvent);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    // Remove event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }
}

/**
 * Create timeline-specific adaptation of cobe configuration with environmental effects
 */
export function createTimelineCylinderConfig(
  config: TimelineCylinderConfig,
  renderer: TimelineCylinderRenderer
) {
  const markers = renderer.generateCylinderMarkers();
  const environmentEffects = renderer.getRiskEnvironmentEffects();

  return {
    devicePixelRatio: config.devicePixelRatio,
    width: config.width,
    height: config.height,
    phi: 0, // Will be controlled by animation
    theta: Math.PI / 2, // Side view of cylinder
    dark: 1,
    diffuse: 0.4 + (environmentEffects.storminess * 0.3), // More diffuse lighting in stormy conditions
    mapSamples: 8000, // Reduced for performance
    mapBrightness: 2 - (environmentEffects.fogIntensity * 2), // Dimmer in foggy conditions
    baseColor: environmentEffects.atmosphericColor, // Dynamic atmospheric color
    markerColor: [0.8, 0.4, 0.2] as [number, number, number], // Default orange
    glowColor: [
      environmentEffects.atmosphericColor[0] * 2,
      environmentEffects.atmosphericColor[1] * 2,
      environmentEffects.atmosphericColor[2] * 2
    ] as [number, number, number], // Glow matches atmosphere
    markers: markers.map(marker => ({
      location: renderer.cylinderToGlobeCoords(marker.position[0], marker.position[1]),
      size: marker.size * (1 + environmentEffects.storminess * 0.2), // Larger markers in storms
      color: marker.color
    })),
    opacity: 0.9 - (environmentEffects.fogIntensity * 0.2), // More transparent in fog
    onRender: (state: any) => {
      // Update markers from current milestone data
      const updatedMarkers = renderer.generateCylinderMarkers();
      const currentEffects = renderer.getRiskEnvironmentEffects();

      state.markers = updatedMarkers.map(marker => ({
        location: renderer.cylinderToGlobeCoords(marker.position[0], marker.position[1]),
        size: marker.size * (1 + currentEffects.storminess * 0.2),
        color: marker.color
      }));

      // Update environmental effects dynamically
      state.baseColor = currentEffects.atmosphericColor;
      state.glowColor = [
        currentEffects.atmosphericColor[0] * 2,
        currentEffects.atmosphericColor[1] * 2,
        currentEffects.atmosphericColor[2] * 2
      ];
      state.diffuse = 0.4 + (currentEffects.storminess * 0.3);
      state.mapBrightness = 2 - (currentEffects.fogIntensity * 2);
      state.opacity = 0.9 - (currentEffects.fogIntensity * 0.2);

      // Apply environmental animation effects
      if (currentEffects.storminess > 0.3) {
        // Add subtle storm turbulence
        const turbulence = Math.sin(Date.now() * 0.01) * currentEffects.storminess * 0.1;
        state.phi += turbulence;
      }

      // Custom render callback
      if (config.onRender) {
        config.onRender(state);
      }
    }
  };
}