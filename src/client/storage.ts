import { Project } from './components/ProjectModal';
import { Milestone, TimelineState } from '../shared';

const STORAGE_KEYS = {
  CURRENT_PROJECT: 'releasecompass_current_project',
  PROJECTS_LIST: 'releasecompass_projects',
  TIMELINE_STATE: 'releasecompass_timeline_state'
};

export interface StoredProject extends Project {
  milestones: Milestone[];
  timelineState?: Partial<TimelineState>;
}

export class ProjectStorage {
  /**
   * Save current project to localStorage
   */
  static saveCurrentProject(project: StoredProject): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROJECT, JSON.stringify(project));
      this.updateProjectsList(project);
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      return false;
    }
  }

  /**
   * Load current project from localStorage
   */
  static loadCurrentProject(): StoredProject | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_PROJECT);
      if (!stored) return null;

      const project = JSON.parse(stored);
      // Convert date strings back to Date objects
      project.releaseDate = new Date(project.releaseDate);
      project.createdAt = new Date(project.createdAt);
      project.updatedAt = new Date(project.updatedAt);

      if (project.milestones) {
        project.milestones = project.milestones.map((m: any) => ({
          ...m,
          date: new Date(m.date)
        }));
      }

      if (project.timelineState) {
        if (project.timelineState.timelineStart) {
          project.timelineState.timelineStart = new Date(project.timelineState.timelineStart);
        }
        if (project.timelineState.timelineEnd) {
          project.timelineState.timelineEnd = new Date(project.timelineState.timelineEnd);
        }
        if (project.timelineState.currentDate) {
          project.timelineState.currentDate = new Date(project.timelineState.currentDate);
        }
      }

      return project;
    } catch (error) {
      console.error('Failed to load project:', error);
      return null;
    }
  }

  /**
   * Get list of all saved projects
   */
  static getProjectsList(): Project[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS_LIST);
      if (!stored) return [];

      const projects = JSON.parse(stored);
      return projects.map((p: any) => ({
        ...p,
        releaseDate: new Date(p.releaseDate),
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      }));
    } catch (error) {
      console.error('Failed to load projects list:', error);
      return [];
    }
  }

  /**
   * Update projects list with current project
   */
  private static updateProjectsList(project: StoredProject): void {
    try {
      const projects = this.getProjectsList();
      const index = projects.findIndex(p => p.id === project.id);

      const projectSummary: Project = {
        id: project.id,
        name: project.name,
        type: project.type,
        releaseDate: project.releaseDate,
        createdAt: project.createdAt,
        updatedAt: new Date(),
        budget: project.budget,
        description: project.description
      };

      if (index >= 0) {
        projects[index] = projectSummary;
      } else {
        projects.push(projectSummary);
      }

      // Keep only last 20 projects
      const recentProjects = projects
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 20);

      localStorage.setItem(STORAGE_KEYS.PROJECTS_LIST, JSON.stringify(recentProjects));
    } catch (error) {
      console.error('Failed to update projects list:', error);
    }
  }

  /**
   * Delete a project
   */
  static deleteProject(projectId: string): boolean {
    try {
      const projects = this.getProjectsList();
      const filtered = projects.filter(p => p.id !== projectId);
      localStorage.setItem(STORAGE_KEYS.PROJECTS_LIST, JSON.stringify(filtered));

      // If deleting current project, clear it
      const current = this.loadCurrentProject();
      if (current && current.id === projectId) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  /**
   * Clear all stored data
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS_LIST);
    localStorage.removeItem(STORAGE_KEYS.TIMELINE_STATE);
  }

  /**
   * Export project as JSON
   */
  static exportProject(project: StoredProject): string {
    return JSON.stringify(project, null, 2);
  }

  /**
   * Import project from JSON
   */
  static importProject(jsonString: string): StoredProject | null {
    try {
      const project = JSON.parse(jsonString);

      // Validate structure
      if (!project.id || !project.name || !project.type || !project.releaseDate) {
        throw new Error('Invalid project structure');
      }

      // Convert dates
      project.releaseDate = new Date(project.releaseDate);
      project.createdAt = new Date(project.createdAt || Date.now());
      project.updatedAt = new Date(project.updatedAt || Date.now());

      if (project.milestones) {
        project.milestones = project.milestones.map((m: any) => ({
          ...m,
          date: new Date(m.date)
        }));
      }

      return project;
    } catch (error) {
      console.error('Failed to import project:', error);
      return null;
    }
  }

  /**
   * Check if storage is available
   */
  static isAvailable(): boolean {
    try {
      const testKey = '__releasecompass_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  static getStorageInfo(): {
    used: number;
    available: boolean;
    projectCount: number;
  } {
    let used = 0;
    try {
      for (const key in localStorage) {
        if (key.startsWith('releasecompass_')) {
          used += localStorage.getItem(key)?.length || 0;
        }
      }
    } catch {}

    return {
      used,
      available: this.isAvailable(),
      projectCount: this.getProjectsList().length
    };
  }
}