import { Milestone } from './shared';

export interface MilestoneTemplate {
  title: string;
  daysBeforeRelease: number;
  budget: number;
  category: Milestone['category'];
  dependencies?: string[];
  riskLevel: Milestone['riskLevel'];
  description?: string;
}

// Industry-standard milestone templates
export const MILESTONE_TEMPLATES: Record<'single' | 'ep' | 'album', MilestoneTemplate[]> = {
  single: [
    {
      title: 'Recording',
      daysBeforeRelease: 60,
      budget: 500,
      category: 'recording',
      riskLevel: 'medium',
      description: 'Studio recording sessions for single track'
    },
    {
      title: 'Mixing',
      daysBeforeRelease: 45,
      budget: 300,
      category: 'production',
      dependencies: ['Recording'],
      riskLevel: 'low',
      description: 'Professional mixing of recorded tracks'
    },
    {
      title: 'Mastering',
      daysBeforeRelease: 30,
      budget: 200,
      category: 'production',
      dependencies: ['Mixing'],
      riskLevel: 'low',
      description: 'Final mastering for all platforms'
    },
    {
      title: 'Artwork',
      daysBeforeRelease: 21,
      budget: 300,
      category: 'marketing',
      riskLevel: 'low',
      description: 'Single cover artwork and design'
    },
    {
      title: 'Release',
      daysBeforeRelease: 0,
      budget: 200,
      category: 'distribution',
      dependencies: ['Mastering', 'Artwork'],
      riskLevel: 'low',
      description: 'Distribution to all streaming platforms'
    }
  ],

  ep: [
    {
      title: 'Recording',
      daysBeforeRelease: 90,
      budget: 2000,
      category: 'recording',
      riskLevel: 'medium',
      description: 'Studio sessions for 3-6 tracks'
    },
    {
      title: 'Mixing',
      daysBeforeRelease: 60,
      budget: 1200,
      category: 'production',
      dependencies: ['Recording'],
      riskLevel: 'medium',
      description: 'Professional mixing of all EP tracks'
    },
    {
      title: 'Mastering',
      daysBeforeRelease: 45,
      budget: 800,
      category: 'production',
      dependencies: ['Mixing'],
      riskLevel: 'low',
      description: 'EP mastering and sequencing'
    },
    {
      title: 'Artwork',
      daysBeforeRelease: 30,
      budget: 500,
      category: 'marketing',
      riskLevel: 'low',
      description: 'EP cover art and packaging design'
    },
    {
      title: 'Distribution',
      daysBeforeRelease: 14,
      budget: 500,
      category: 'distribution',
      dependencies: ['Mastering'],
      riskLevel: 'low',
      description: 'Distribution setup and metadata'
    },
    {
      title: 'Release',
      daysBeforeRelease: 0,
      budget: 1500,
      category: 'distribution',
      dependencies: ['Distribution', 'Artwork'],
      riskLevel: 'medium',
      description: 'EP launch and promotion'
    }
  ],

  album: [
    {
      title: 'Pre-production',
      daysBeforeRelease: 180,
      budget: 2000,
      category: 'production',
      riskLevel: 'low',
      description: 'Song selection, arrangements, and demos'
    },
    {
      title: 'Recording',
      daysBeforeRelease: 150,
      budget: 8000,
      category: 'recording',
      dependencies: ['Pre-production'],
      riskLevel: 'high',
      description: 'Full album recording sessions'
    },
    {
      title: 'Mixing',
      daysBeforeRelease: 90,
      budget: 4000,
      category: 'production',
      dependencies: ['Recording'],
      riskLevel: 'medium',
      description: 'Professional mixing of all album tracks'
    },
    {
      title: 'Mastering',
      daysBeforeRelease: 60,
      budget: 2000,
      category: 'production',
      dependencies: ['Mixing'],
      riskLevel: 'low',
      description: 'Album mastering and final sequencing'
    },
    {
      title: 'Artwork',
      daysBeforeRelease: 45,
      budget: 1500,
      category: 'marketing',
      riskLevel: 'medium',
      description: 'Album artwork, photography, and design'
    },
    {
      title: 'Video',
      daysBeforeRelease: 30,
      budget: 3000,
      category: 'marketing',
      dependencies: ['Mastering'],
      riskLevel: 'high',
      description: 'Music video production for lead single'
    },
    {
      title: 'PR Campaign',
      daysBeforeRelease: 21,
      budget: 2500,
      category: 'marketing',
      dependencies: ['Artwork', 'Video'],
      riskLevel: 'medium',
      description: 'Press release, media outreach, interviews'
    },
    {
      title: 'Distribution',
      daysBeforeRelease: 14,
      budget: 1000,
      category: 'distribution',
      dependencies: ['Mastering', 'Artwork'],
      riskLevel: 'low',
      description: 'Physical and digital distribution setup'
    },
    {
      title: 'Release',
      daysBeforeRelease: 0,
      budget: 2000,
      category: 'distribution',
      dependencies: ['Distribution', 'PR Campaign'],
      riskLevel: 'medium',
      description: 'Album launch event and promotion'
    }
  ]
};

/**
 * Generate milestones for a project based on its type and release date
 */
export function generateMilestones(
  projectType: 'single' | 'ep' | 'album',
  releaseDate: Date,
  projectId: string
): Milestone[] {
  const templates = MILESTONE_TEMPLATES[projectType];
  const milestones: Milestone[] = [];
  const dependencyMap = new Map<string, string>(); // template title -> milestone id

  // Calculate total timeline duration for positioning
  const maxDays = Math.max(...templates.map(t => t.daysBeforeRelease));
  const timelineStart = new Date(releaseDate.getTime() - (maxDays * 24 * 60 * 60 * 1000));

  templates.forEach((template, index) => {
    const milestoneId = `${projectId}-${template.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`;
    const milestoneDate = new Date(releaseDate.getTime() - (template.daysBeforeRelease * 24 * 60 * 60 * 1000));

    // Calculate timeline position (0-1)
    const daysFromStart = (milestoneDate.getTime() - timelineStart.getTime()) / (24 * 60 * 60 * 1000);
    const timelinePosition = daysFromStart / maxDays;

    // Distribute milestones around the cylinder for visual clarity
    const radialPosition = (index / templates.length) * Math.PI * 2;

    // Map template dependencies to milestone IDs
    const dependencies: string[] = [];
    if (template.dependencies) {
      template.dependencies.forEach(depTitle => {
        const depId = dependencyMap.get(depTitle);
        if (depId) {
          dependencies.push(depId);
        }
      });
    }

    const milestone: Milestone = {
      id: milestoneId,
      title: template.title,
      date: milestoneDate,
      budget: template.budget,
      actualCost: 0,
      riskLevel: template.riskLevel,
      status: 'planned',
      dependencies,
      category: template.category,
      notes: template.description,
      timelinePosition,
      radialPosition
    };

    milestones.push(milestone);
    dependencyMap.set(template.title, milestoneId);
  });

  return milestones;
}

/**
 * Calculate optimal timeline bounds for a set of milestones
 */
export function calculateTimelineBounds(milestones: Milestone[]): { start: Date; end: Date } {
  if (milestones.length === 0) {
    const now = new Date();
    return {
      start: now,
      end: new Date(now.getTime() + (180 * 24 * 60 * 60 * 1000)) // 6 months default
    };
  }

  const dates = milestones.map(m => m.date.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  // Add padding (10% on each side)
  const range = maxDate.getTime() - minDate.getTime();
  const padding = range * 0.1;

  return {
    start: new Date(minDate.getTime() - padding),
    end: new Date(maxDate.getTime() + padding)
  };
}