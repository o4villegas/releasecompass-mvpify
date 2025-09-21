// Messages that we'll send to the client

// Legacy position type for backward compatibility
export type Position = {
  lat: number;
  lng: number;
  id: string;
};

// Music release milestone data structure
export type Milestone = {
  id: string;
  title: string;
  date: Date;
  budget: number;
  actualCost: number;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'planned' | 'in-progress' | 'completed' | 'overdue';
  dependencies: string[]; // Array of milestone IDs
  category: 'recording' | 'production' | 'marketing' | 'distribution' | 'legal' | 'other';
  notes?: string;
  // 3D position on timeline cylinder
  timelinePosition: number; // 0-1 representing position along timeline
  radialPosition: number; // 0-2π for position around cylinder
};

// Financial calculation results
export type FinancialSummary = {
  totalBudget: number;
  totalActualCost: number;
  projectedOverrun: number;
  riskScore: number; // 0-100
  criticalPath: string[]; // Array of milestone IDs
  lastUpdated: Date;
};

// Project data structure
export type Project = {
  id: string;
  name: string;
  type: 'single' | 'ep' | 'album';
  releaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  budget: number;
  description?: string;
};

// Timeline state for synchronization
export type TimelineState = {
  milestones: Map<string, Milestone>;
  financialSummary: FinancialSummary;
  timelineStart: Date;
  timelineEnd: Date;
  currentDate: Date;
  currentProject?: Project;
};

export type OutgoingMessage =
  | {
      type: "add-marker";
      position: Position;
    }
  | {
      type: "remove-marker";
      id: string;
    }
  | {
      type: "milestone-update";
      milestone: Milestone;
    }
  | {
      type: "milestone-delete";
      milestoneId: string;
    }
  | {
      type: "financial-update";
      financialSummary: FinancialSummary;
    }
  | {
      type: "timeline-sync";
      state: TimelineState;
    }
  | {
      type: "project-create";
      project: Project;
      milestones: Milestone[];
    }
  | {
      type: "project-update";
      project: Project;
    }
  | {
      type: "project-load";
      projectId: string;
    };
