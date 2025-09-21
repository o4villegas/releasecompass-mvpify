import React, { useState } from 'react';

export type ProjectType = 'single' | 'ep' | 'album';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  releaseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  budget: number;
  description?: string;
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const PROJECT_BUDGETS = {
  single: 1500,
  ep: 6500,
  album: 25000
};

export function ProjectModal({ isOpen, onClose, onCreateProject }: ProjectModalProps) {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('album');
  const [releaseDate, setReleaseDate] = useState('');
  const [description, setDescription] = useState('');
  const [customBudget, setCustomBudget] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim() || !releaseDate) {
      alert('Please fill in all required fields');
      return;
    }

    const budget = customBudget || PROJECT_BUDGETS[projectType];

    onCreateProject({
      name: projectName.trim(),
      type: projectType,
      releaseDate: new Date(releaseDate),
      budget,
      description: description.trim() || undefined
    });

    // Reset form
    setProjectName('');
    setProjectType('album');
    setReleaseDate('');
    setDescription('');
    setCustomBudget(null);
  };

  const handleClose = () => {
    // Reset form on close
    setProjectName('');
    setProjectType('album');
    setReleaseDate('');
    setDescription('');
    setCustomBudget(null);
    onClose();
  };

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content project-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="project-name">
              Project Name <span className="required">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Enter project name"
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-type">
              Project Type <span className="required">*</span>
            </label>
            <div className="project-type-selector">
              <label className={`type-option ${projectType === 'single' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="projectType"
                  value="single"
                  checked={projectType === 'single'}
                  onChange={e => setProjectType(e.target.value as ProjectType)}
                />
                <div className="type-content">
                  <span className="type-name">Single</span>
                  <span className="type-budget">${PROJECT_BUDGETS.single.toLocaleString()}</span>
                  <span className="type-desc">1-2 tracks</span>
                </div>
              </label>

              <label className={`type-option ${projectType === 'ep' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="projectType"
                  value="ep"
                  checked={projectType === 'ep'}
                  onChange={e => setProjectType(e.target.value as ProjectType)}
                />
                <div className="type-content">
                  <span className="type-name">EP</span>
                  <span className="type-budget">${PROJECT_BUDGETS.ep.toLocaleString()}</span>
                  <span className="type-desc">3-6 tracks</span>
                </div>
              </label>

              <label className={`type-option ${projectType === 'album' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="projectType"
                  value="album"
                  checked={projectType === 'album'}
                  onChange={e => setProjectType(e.target.value as ProjectType)}
                />
                <div className="type-content">
                  <span className="type-name">Album</span>
                  <span className="type-budget">${PROJECT_BUDGETS.album.toLocaleString()}</span>
                  <span className="type-desc">7+ tracks</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="release-date">
              Release Date <span className="required">*</span>
            </label>
            <input
              id="release-date"
              type="date"
              value={releaseDate}
              onChange={e => setReleaseDate(e.target.value)}
              min={today}
              required
            />
            <small className="form-help">
              Milestones will be automatically scheduled backwards from this date
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="custom-budget">
              Custom Budget (Optional)
            </label>
            <input
              id="custom-budget"
              type="number"
              value={customBudget || ''}
              onChange={e => setCustomBudget(e.target.value ? Number(e.target.value) : null)}
              placeholder={`Default: $${PROJECT_BUDGETS[projectType].toLocaleString()}`}
              min="0"
              step="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add project notes, goals, or special requirements..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}