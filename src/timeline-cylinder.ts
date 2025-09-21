// Timeline cylinder rendering engine for ReleaseCompass MVP
// Full Three.js implementation replacing Cobe for enhanced 3D interactions
import * as THREE from 'three';
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

interface MilestoneObject extends THREE.Mesh {
  userData: {
    milestone: Milestone;
    originalMaterial: THREE.Material;
    hoverMaterial: THREE.Material;
  } & Record<string, any>;
}

export class TimelineCylinderRenderer {
  private canvas: HTMLCanvasElement;
  private config: TimelineCylinderConfig;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  // Scene objects
  private cylinderMesh!: THREE.Mesh;
  private milestoneObjects: Map<string, MilestoneObject> = new Map();
  private dependencyLines: THREE.LineSegments | null = null;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;

  // Interaction state
  private isDragging = false;
  private selectedMilestone: Milestone | null = null;
  private hoveredMilestone: MilestoneObject | null = null;
  private dragStartPosition: THREE.Vector3 = new THREE.Vector3();
  private animationFrame: number | null = null;

  // Materials
  private cylinderMaterial!: THREE.MeshLambertMaterial;
  private milestoneMaterials!: {
    low: THREE.MeshPhongMaterial;
    medium: THREE.MeshPhongMaterial;
    high: THREE.MeshPhongMaterial;
    hover: THREE.MeshPhongMaterial;
  };

  constructor(canvas: HTMLCanvasElement, config: TimelineCylinderConfig) {
    this.canvas = canvas;
    this.config = config;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.initScene();
    this.initLighting();
    this.initMaterials();
    this.createCylinder();
    this.createMilestones();
    this.createDependencyLines();
    this.initEventListeners();
    this.startRenderLoop();
  }

  private initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000510); // Dark space-like background

    // Camera setup with proper FOV for cylinder viewing
    const aspect = this.config.width / this.config.height;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(8, 0, 8);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.config.width, this.config.height);
    this.renderer.setPixelRatio(this.config.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private initLighting() {
    // Ambient light for overall illumination
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(this.ambientLight);

    // Directional light for shadows and depth
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);
  }

  private initMaterials() {
    // Timeline cylinder material
    this.cylinderMaterial = new THREE.MeshLambertMaterial({
      color: 0x2a4d6e,
      transparent: true,
      opacity: 0.3,
      wireframe: false
    });

    // Milestone materials by risk level
    this.milestoneMaterials = {
      low: new THREE.MeshPhongMaterial({
        color: 0x4a90e2,
        emissive: 0x1a3050,
        shininess: 30
      }),
      medium: new THREE.MeshPhongMaterial({
        color: 0xf5a623,
        emissive: 0x503020,
        shininess: 30
      }),
      high: new THREE.MeshPhongMaterial({
        color: 0xd0021b,
        emissive: 0x500510,
        shininess: 30
      }),
      hover: new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x404040,
        shininess: 60
      })
    };
  }

  private createCylinder() {
    const geometry = new THREE.CylinderGeometry(
      this.config.cylinderRadius,
      this.config.cylinderRadius,
      this.config.cylinderHeight,
      32,
      1,
      true // Open ended
    );

    this.cylinderMesh = new THREE.Mesh(geometry, this.cylinderMaterial);
    this.cylinderMesh.receiveShadow = true;
    this.scene.add(this.cylinderMesh);

    // Add subtle grid lines to cylinder
    this.addCylinderGridLines();
  }

  private addCylinderGridLines() {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.2
    });

    // Vertical lines
    const verticalLines = new THREE.BufferGeometry();
    const verticalPoints: number[] = [];
    const segments = 16;

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * this.config.cylinderRadius;
      const z = Math.sin(angle) * this.config.cylinderRadius;

      verticalPoints.push(x, -this.config.cylinderHeight / 2, z);
      verticalPoints.push(x, this.config.cylinderHeight / 2, z);
    }

    verticalLines.setAttribute('position', new THREE.Float32BufferAttribute(verticalPoints, 3));
    const verticalLineSegments = new THREE.LineSegments(verticalLines, gridMaterial);
    this.scene.add(verticalLineSegments);

    // Horizontal rings
    const horizontalLines = new THREE.BufferGeometry();
    const horizontalPoints: number[] = [];
    const rings = 10;

    for (let i = 0; i <= rings; i++) {
      const y = (i / rings - 0.5) * this.config.cylinderHeight;

      for (let j = 0; j < segments; j++) {
        const angle1 = (j / segments) * Math.PI * 2;
        const angle2 = ((j + 1) / segments) * Math.PI * 2;

        horizontalPoints.push(
          Math.cos(angle1) * this.config.cylinderRadius, y, Math.sin(angle1) * this.config.cylinderRadius,
          Math.cos(angle2) * this.config.cylinderRadius, y, Math.sin(angle2) * this.config.cylinderRadius
        );
      }
    }

    horizontalLines.setAttribute('position', new THREE.Float32BufferAttribute(horizontalPoints, 3));
    const horizontalLineSegments = new THREE.LineSegments(horizontalLines, gridMaterial);
    this.scene.add(horizontalLineSegments);
  }

  private createMilestones() {
    this.milestoneObjects.clear();

    this.config.milestones.forEach(milestone => {
      this.createMilestoneObject(milestone);
    });
  }

  private createMilestoneObject(milestone: Milestone): MilestoneObject {
    // Create sphere geometry for milestone
    const geometry = new THREE.SphereGeometry(
      milestone.riskLevel === 'high' ? 0.15 :
      milestone.riskLevel === 'medium' ? 0.12 : 0.1,
      16, 16
    );

    const material = this.milestoneMaterials[milestone.riskLevel];
    const mesh = new THREE.Mesh(geometry, material);

    // Setup user data
    mesh.userData = {
      milestone,
      originalMaterial: material,
      hoverMaterial: this.milestoneMaterials.hover
    };

    const milestoneObject = mesh as unknown as MilestoneObject;

    // Position on cylinder
    this.updateMilestonePosition(milestoneObject, milestone);

    milestoneObject.castShadow = true;
    milestoneObject.receiveShadow = true;

    this.scene.add(milestoneObject);
    this.milestoneObjects.set(milestone.id, milestoneObject);

    return milestoneObject;
  }

  private updateMilestonePosition(mesh: MilestoneObject, milestone: Milestone) {
    // Calculate position on cylinder surface
    const y = (milestone.timelinePosition - 0.5) * this.config.cylinderHeight;
    const angle = milestone.radialPosition;
    const x = Math.cos(angle) * (this.config.cylinderRadius + 0.1);
    const z = Math.sin(angle) * (this.config.cylinderRadius + 0.1);

    mesh.position.set(x, y, z);
  }

  private createDependencyLines() {
    if (this.dependencyLines) {
      this.scene.remove(this.dependencyLines);
    }

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x66cc66,
      transparent: true,
      opacity: 0.6
    });

    const points: number[] = [];

    this.config.milestones.forEach(milestone => {
      milestone.dependencies.forEach(depId => {
        const dependentMilestone = this.config.milestones.find(m => m.id === depId);
        if (dependentMilestone) {
          const mesh1 = this.milestoneObjects.get(milestone.id);
          const mesh2 = this.milestoneObjects.get(depId);

          if (mesh1 && mesh2) {
            points.push(
              mesh1.position.x, mesh1.position.y, mesh1.position.z,
              mesh2.position.x, mesh2.position.y, mesh2.position.z
            );
          }
        }
      });
    });

    if (points.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      this.dependencyLines = new THREE.LineSegments(geometry, lineMaterial);
      this.scene.add(this.dependencyLines);
    }
  }

  private initEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

    // Add context menu prevention for right-click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private updateMousePosition(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleMouseDown(event: MouseEvent) {
    this.updateMousePosition(event);

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.milestoneObjects.values()));

    if (intersects.length > 0) {
      const milestoneObject = intersects[0].object as MilestoneObject;
      this.isDragging = true;
      this.selectedMilestone = milestoneObject.userData.milestone;
      this.dragStartPosition.copy(milestoneObject.position);

      // Prevent camera controls during drag
      event.preventDefault();
    }
  }

  private handleMouseMove(event: MouseEvent) {
    this.updateMousePosition(event);

    if (this.isDragging && this.selectedMilestone) {
      // Handle milestone dragging
      this.handleMilestoneDrag();
    } else {
      // Handle hover effects
      this.handleMilestoneHover();
    }
  }

  private handleMilestoneDrag() {
    if (!this.selectedMilestone) return;

    // Project mouse position onto cylinder surface
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Create a plane at the cylinder center for intersection
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectionPoint = new THREE.Vector3();

    if (this.raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      // Calculate cylindrical coordinates
      const angle = Math.atan2(intersectionPoint.z, intersectionPoint.x);
      const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;

      // Clamp Y position to cylinder bounds
      const clampedY = Math.max(
        -this.config.cylinderHeight / 2,
        Math.min(this.config.cylinderHeight / 2, intersectionPoint.y)
      );

      const timelinePosition = (clampedY / this.config.cylinderHeight) + 0.5;
      const radialPosition = normalizedAngle;

      if (this.config.onMilestoneDrag) {
        this.config.onMilestoneDrag(this.selectedMilestone, {
          timelinePosition,
          radialPosition
        });
      }
    }
  }

  private handleMilestoneHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.milestoneObjects.values()));

    // Reset previous hover
    if (this.hoveredMilestone) {
      this.hoveredMilestone.material = this.hoveredMilestone.userData.originalMaterial;
      this.hoveredMilestone = null;
      this.canvas.style.cursor = 'default';
    }

    // Set new hover
    if (intersects.length > 0) {
      const milestoneObject = intersects[0].object as MilestoneObject;
      this.hoveredMilestone = milestoneObject;
      milestoneObject.material = milestoneObject.userData.hoverMaterial;
      this.canvas.style.cursor = 'pointer';
    }
  }

  private handleMouseUp() {
    this.isDragging = false;
    this.selectedMilestone = null;
  }

  private handleClick(event: MouseEvent) {
    if (this.isDragging) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(Array.from(this.milestoneObjects.values()));

    if (intersects.length > 0) {
      const milestoneObject = intersects[0].object as MilestoneObject;
      if (this.config.onMilestoneClick) {
        this.config.onMilestoneClick(milestoneObject.userData.milestone);
      }
    }
  }

  private handleWheel(event: WheelEvent) {
    event.preventDefault();

    // Simple zoom by moving camera closer/farther
    const zoomSpeed = 0.1;
    const direction = this.camera.position.clone().normalize();

    if (event.deltaY > 0) {
      // Zoom out
      this.camera.position.addScaledVector(direction, zoomSpeed);
    } else {
      // Zoom in
      this.camera.position.addScaledVector(direction, -zoomSpeed);
    }

    // Constrain zoom distance
    const distance = this.camera.position.length();
    if (distance < 3) {
      this.camera.position.normalize().multiplyScalar(3);
    } else if (distance > 20) {
      this.camera.position.normalize().multiplyScalar(20);
    }
  }

  private startRenderLoop() {
    const render = () => {
      this.animationFrame = requestAnimationFrame(render);

      // Auto-rotate the scene slowly
      if (!this.isDragging) {
        this.scene.rotation.y += 0.005;
      }

      // Update environmental effects based on risk
      this.updateEnvironmentalEffects();

      // Call user render callback
      if (this.config.onRender) {
        this.config.onRender({
          camera: this.camera,
          scene: this.scene,
          milestones: this.config.milestones
        });
      }

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }

  private updateEnvironmentalEffects() {
    const riskLevel = calculateOverallRisk(this.config.milestones);
    const atmosphereColor = getAtmosphereColor(riskLevel);
    const fogIntensity = getFogIntensity(riskLevel);

    // Update ambient light based on risk
    this.ambientLight.color.setRGB(
      atmosphereColor.base[0],
      atmosphereColor.base[1],
      atmosphereColor.base[2]
    );

    // Update fog
    if (fogIntensity > 0.1) {
      if (!this.scene.fog) {
        this.scene.fog = new THREE.Fog(0x000510, 5, 20);
      }
      // Fog uses near/far instead of density
      (this.scene.fog as THREE.Fog).far = 20 - (fogIntensity * 10);
    } else if (this.scene.fog) {
      this.scene.fog = null;
    }
  }

  public updateMilestones(milestones: Milestone[]) {
    this.config.milestones = milestones;

    // Remove old milestone objects
    this.milestoneObjects.forEach(mesh => {
      this.scene.remove(mesh);
    });
    this.milestoneObjects.clear();

    // Create new milestone objects
    this.createMilestones();
    this.createDependencyLines();
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
    this.canvas.removeEventListener('wheel', this.handleWheel);

    // Clean up Three.js resources
    this.scene.clear();
    this.renderer.dispose();

    // Clean up geometries and materials
    this.milestoneObjects.forEach(mesh => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(mat => mat.dispose());
      } else {
        mesh.material.dispose();
      }
    });

    this.cylinderMaterial.dispose();
    Object.values(this.milestoneMaterials).forEach(mat => mat.dispose());
  }
}

/**
 * Create configuration for Three.js timeline cylinder
 * Maintains compatibility with the existing interface
 */
export function createTimelineCylinderConfig(
  config: TimelineCylinderConfig,
  renderer: TimelineCylinderRenderer
): any {
  // This function now primarily serves as a compatibility layer
  // The actual Three.js configuration is handled within the TimelineCylinderRenderer
  return {
    width: config.width,
    height: config.height,
    devicePixelRatio: config.devicePixelRatio,
    milestones: config.milestones,
    onRender: config.onRender,
    // These properties are now handled internally by Three.js
    renderer: renderer
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