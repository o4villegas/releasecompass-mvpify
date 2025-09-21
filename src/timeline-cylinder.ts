// Timeline cylinder rendering engine for ReleaseCompass MVP
// Enhances existing cobe globe with timeline-specific visualization
import type { Milestone } from './shared';

export interface TimelineCylinderConfig {
  width: number;
  height: number;
  devicePixelRatio: number;
  cylinderRadius: number;
  cylinderHeight: number;
  timelineStart: Date;
  timelineEnd: Date;
  milestones: Milestone[];
  onMilestoneClick?: (milestone: Milestone) => void;
  onMilestoneDrag?: (milestone: Milestone, newPosition: { timelinePosition: number; radialPosition: number }) => void;
  onRender?: (state: any) => void;
}

export class TimelineCylinderRenderer {
  private canvas: HTMLCanvasElement;
  private config: TimelineCylinderConfig;
  private isDragging = false;
  private selectedMilestone: Milestone | null = null;
  private mousePosition = { x: 0, y: 0 };
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement, config: TimelineCylinderConfig) {
    this.canvas = canvas;
    this.config = config;
    this.initEventListeners();
  }

  private initEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private handleMouseDown(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    // Find if clicking on a milestone
    const milestone = this.findMilestoneAt(x, y);
    if (milestone) {
      this.isDragging = true;
      this.selectedMilestone = milestone;
    }
  }

  private handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition.x = (event.clientX - rect.left) / rect.width;
    this.mousePosition.y = (event.clientY - rect.top) / rect.height;

    if (this.isDragging && this.selectedMilestone && this.config.onMilestoneDrag) {
      // Calculate new position on timeline
      const timelinePosition = Math.max(0, Math.min(1, 1 - this.mousePosition.y));
      const radialPosition = this.mousePosition.x * Math.PI * 2;

      this.config.onMilestoneDrag(this.selectedMilestone, {
        timelinePosition,
        radialPosition
      });
    }
  }

  private handleMouseUp() {
    this.isDragging = false;
    this.selectedMilestone = null;
  }

  private handleClick(event: MouseEvent) {
    if (this.isDragging) return; // Ignore clicks during drag

    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const milestone = this.findMilestoneAt(x, y);
    if (milestone && this.config.onMilestoneClick) {
      this.config.onMilestoneClick(milestone);
    }
  }

  private findMilestoneAt(x: number, y: number): Milestone | null {
    // Simple proximity check for milestone selection
    const threshold = 0.05; // 5% of canvas size

    for (const milestone of this.config.milestones) {
      // Convert milestone position to canvas coordinates
      const canvasY = 1 - milestone.timelinePosition;
      const canvasX = (milestone.radialPosition / (Math.PI * 2));

      const distance = Math.sqrt(
        Math.pow(x - canvasX, 2) + Math.pow(y - canvasY, 2)
      );

      if (distance < threshold) {
        return milestone;
      }
    }

    return null;
  }

  public updateMilestones(milestones: Milestone[]) {
    this.config.milestones = milestones;
  }

  public destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    // Remove event listeners
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('click', this.handleClick);
  }
}

/**
 * Create configuration for cobe to render as timeline cylinder
 * Enhances existing cobe globe with timeline-specific parameters
 */
export function createTimelineCylinderConfig(
  config: TimelineCylinderConfig,
  renderer: TimelineCylinderRenderer
): any {
  // Calculate risk-based environmental effects
  const riskLevel = calculateOverallRisk(config.milestones);
  const atmosphereColor = getAtmosphereColor(riskLevel);
  const fogIntensity = getFogIntensity(riskLevel);

  // Convert milestones to cobe marker format
  const markers = config.milestones.map(milestone => ({
    location: [
      // Use timeline position as latitude (mapped to -90 to 90)
      (milestone.timelinePosition - 0.5) * 180,
      // Use radial position as longitude (mapped to -180 to 180)
      (milestone.radialPosition / Math.PI - 1) * 180
    ],
    size: milestone.riskLevel === 'high' ? 0.1 :
          milestone.riskLevel === 'medium' ? 0.07 : 0.05
  }));

  return {
    devicePixelRatio: config.devicePixelRatio,
    width: config.width,
    height: config.height,
    phi: 0,
    theta: 0.3, // Slight tilt for better cylinder view
    dark: 1,
    diffuse: 1.2,
    mapSamples: 8000, // Reduced from 16000 for better performance
    mapBrightness: 4,
    // Environmental risk visualization colors
    baseColor: atmosphereColor.base,
    markerColor: atmosphereColor.marker,
    glowColor: atmosphereColor.glow,
    markers: markers,
    opacity: 0.8 + (fogIntensity * 0.2), // Increase opacity with risk
    offset: [0, config.cylinderHeight * 50], // Vertical stretch for cylinder effect
    scale: config.cylinderRadius * 100,
    onRender: (state: any) => {
      // Update markers with current milestone positions
      const currentMarkers = config.milestones.map(milestone => ({
        location: [
          (milestone.timelinePosition - 0.5) * 180,
          (milestone.radialPosition / Math.PI - 1) * 180
        ],
        size: milestone.riskLevel === 'high' ? 0.1 :
              milestone.riskLevel === 'medium' ? 0.07 : 0.05
      }));
      state.markers = currentMarkers;

      // Apply smooth rotation for timeline effect
      if (config.onRender) {
        config.onRender(state);
      }

      return state;
    }
  };
}

/**
 * Calculate overall risk level from milestones
 */
function calculateOverallRisk(milestones: Milestone[]): 'low' | 'medium' | 'high' {
  if (milestones.length === 0) return 'low';

  const highRiskCount = milestones.filter(m => m.riskLevel === 'high').length;
  const mediumRiskCount = milestones.filter(m => m.riskLevel === 'medium').length;

  const riskScore = (highRiskCount * 3 + mediumRiskCount * 1.5) / milestones.length;

  if (riskScore > 2) return 'high';
  if (riskScore > 1) return 'medium';
  return 'low';
}

/**
 * Get atmosphere colors based on risk level
 */
function getAtmosphereColor(riskLevel: 'low' | 'medium' | 'high') {
  switch (riskLevel) {
    case 'high':
      return {
        base: [0.5, 0.1, 0.1],    // Dark red atmosphere
        marker: [1.0, 0.2, 0.2],  // Bright red markers
        glow: [0.8, 0.1, 0.1]     // Red glow
      };
    case 'medium':
      return {
        base: [0.5, 0.3, 0.1],    // Orange atmosphere
        marker: [1.0, 0.6, 0.2],  // Orange markers
        glow: [0.8, 0.4, 0.1]     // Orange glow
      };
    case 'low':
    default:
      return {
        base: [0.1, 0.3, 0.5],    // Blue atmosphere
        marker: [0.2, 0.6, 1.0],  // Blue markers
        glow: [0.1, 0.4, 0.8]     // Blue glow
      };
  }
}

/**
 * Get fog intensity based on risk level
 */
function getFogIntensity(riskLevel: 'low' | 'medium' | 'high'): number {
  switch (riskLevel) {
    case 'high': return 0.8;
    case 'medium': return 0.4;
    case 'low':
    default: return 0.1;
  }
}

// Extended interface for cobe configuration
interface ExtendedCobeConfig {
  onRender?: (state: any) => void;
}