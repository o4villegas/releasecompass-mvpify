import "./styles.css";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import usePartySocket from "partysocket/react";

// The type of messages we'll be receiving from the server
import type { OutgoingMessage, Milestone, FinancialSummary, TimelineState } from "../shared";
import type { LegacyRef } from "react";
import { TimelineCylinderRenderer, createTimelineCylinderConfig } from "../timeline-cylinder";
import { FinancialEngine } from "../financial-engine";

function App() {
  // Canvas reference for 3D timeline rendering
  const canvasRef = useRef<HTMLCanvasElement>();
  const timelineRenderer = useRef<TimelineCylinderRenderer | null>(null);

  // Timeline state
  const [milestones, setMilestones] = useState<Map<string, Milestone>>(new Map());
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [timelineStart, setTimelineStart] = useState<Date>(new Date());
  const [timelineEnd, setTimelineEnd] = useState<Date>(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  // Connect to PartyServer with timeline user flag
  const socket = usePartySocket({
    room: "default",
    party: "globe",
    query: { timeline: "true" },
    onMessage(evt) {
      const message = JSON.parse(evt.data as string) as OutgoingMessage;
      handleTimelineMessage(message);
    },
    onError(evt) {
      console.error('WebSocket error:', evt);
      // TODO: Show user-friendly error message
    },
    onClose() {
      console.log('WebSocket connection closed');
      // TODO: Implement reconnection logic
    },
  });

  const handleTimelineMessage = useCallback((message: OutgoingMessage) => {
    switch (message.type) {
      case "timeline-sync":
        // Initial state synchronization
        const state = message.state as TimelineState;
        setMilestones(new Map(Object.entries(state.milestones)));
        setFinancialSummary(state.financialSummary);
        setTimelineStart(new Date(state.timelineStart));
        setTimelineEnd(new Date(state.timelineEnd));
        break;

      case "milestone-update":
        setMilestones(prev => {
          const updated = new Map(prev);
          updated.set(message.milestone.id, message.milestone);
          return updated;
        });
        break;

      case "milestone-delete":
        setMilestones(prev => {
          const updated = new Map(prev);
          updated.delete(message.milestoneId);
          return updated;
        });
        break;

      case "financial-update":
        setFinancialSummary(message.financialSummary);
        break;

      default:
        // Ignore legacy globe messages
        break;
    }
  }, []);

  // Milestone interaction handlers
  const handleMilestoneClick = useCallback((milestone: Milestone) => {
    setSelectedMilestone(milestone);
  }, []);

  const handleMilestoneDrag = useCallback((milestone: Milestone, newPosition: { timelinePosition: number; radialPosition: number }) => {
    // Calculate new date based on timeline position
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const newDate = new Date(timelineStart.getTime() + (newPosition.timelinePosition * totalDuration));

    const updatedMilestone = {
      ...milestone,
      date: newDate,
      timelinePosition: newPosition.timelinePosition,
      radialPosition: newPosition.radialPosition
    };

    // Send update to server
    if (socket) {
      socket.send(JSON.stringify({
        type: 'milestone-update',
        milestone: updatedMilestone
      }));
    }
  }, [socket, timelineStart, timelineEnd]);

  const createNewMilestone = useCallback((timelinePosition: number, radialPosition: number) => {
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();
    const date = new Date(timelineStart.getTime() + (timelinePosition * totalDuration));

    const newMilestone: Milestone = {
      id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: "New Milestone",
      date,
      budget: 1000,
      actualCost: 0,
      riskLevel: 'medium',
      status: 'planned',
      dependencies: [],
      category: 'other',
      notes: '',
      timelinePosition,
      radialPosition
    };

    // Send to server
    if (socket) {
      socket.send(JSON.stringify({
        type: 'milestone-update',
        milestone: newMilestone
      }));
    }

    setSelectedMilestone(newMilestone);
    setIsAddingMilestone(false);
  }, [socket, timelineStart, timelineEnd]);

  const deleteMilestone = useCallback((milestoneId: string) => {
    if (socket) {
      socket.send(JSON.stringify({
        type: 'milestone-delete',
        milestoneId
      }));
    }
    setSelectedMilestone(null);
  }, [socket]);

  const updateMilestone = useCallback((updatedMilestone: Milestone) => {
    // Recalculate timeline position if date changed
    const timelinePosition = FinancialEngine.calculateTimelinePosition(
      updatedMilestone.date,
      timelineStart,
      timelineEnd
    );

    const milestoneWithPosition = {
      ...updatedMilestone,
      timelinePosition
    };

    if (socket) {
      socket.send(JSON.stringify({
        type: 'milestone-update',
        milestone: milestoneWithPosition
      }));
    }
  }, [socket, timelineStart, timelineEnd]);

  // Initialize 3D timeline
  useEffect(() => {
    if (!canvasRef.current) return;

    const milestonesArray = Array.from(milestones.values());

    // Create timeline renderer
    const renderer = new TimelineCylinderRenderer(canvasRef.current, {
      width: 800,
      height: 600,
      devicePixelRatio: window.devicePixelRatio || 2,
      cylinderRadius: 2,
      cylinderHeight: 4,
      timelineStart,
      timelineEnd,
      milestones: milestonesArray,
      onMilestoneClick: handleMilestoneClick,
      onMilestoneDrag: handleMilestoneDrag
    });

    timelineRenderer.current = renderer;

    // Configure cobe with timeline cylinder setup
    const cylinderConfig = createTimelineCylinderConfig({
      width: 800,
      height: 600,
      devicePixelRatio: window.devicePixelRatio || 2,
      cylinderRadius: 2,
      cylinderHeight: 4,
      timelineStart,
      timelineEnd,
      milestones: milestonesArray,
      onRender: (state) => {
        // Smooth rotation animation
        state.phi += 0.005;
      }
    }, renderer);

    const globe = createGlobe(canvasRef.current, cylinderConfig);

    // Double-click to add new milestone
    const handleDoubleClick = (event: MouseEvent) => {
      if (isAddingMilestone) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        // Convert to timeline coordinates
        const timelinePosition = Math.max(0, Math.min(1, (1 - y))); // Invert Y
        const radialPosition = (x * Math.PI * 2);

        createNewMilestone(timelinePosition, radialPosition);
      }
    };

    canvasRef.current.addEventListener('dblclick', handleDoubleClick);

    return () => {
      globe.destroy();
      renderer.destroy();
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('dblclick', handleDoubleClick);
      }
    };
  }, [milestones, timelineStart, timelineEnd, isAddingMilestone, handleMilestoneClick, handleMilestoneDrag, createNewMilestone]);

  return (
    <div className="timeline-app">
      <header className="timeline-header">
        <h1>ReleaseCompass Timeline</h1>
        <div className="timeline-controls">
          <button
            className={`add-milestone-btn ${isAddingMilestone ? 'active' : ''}`}
            onClick={() => setIsAddingMilestone(!isAddingMilestone)}
          >
            {isAddingMilestone ? 'Cancel Adding' : 'Add Milestone'}
          </button>
          {isAddingMilestone && (
            <span className="add-instruction">Double-click on timeline to add milestone</span>
          )}
        </div>
      </header>

      <div className="timeline-main">
        <div className="timeline-3d">
          <canvas
            ref={canvasRef as LegacyRef<HTMLCanvasElement>}
            style={{ width: 800, height: 600, maxWidth: "100%", cursor: isAddingMilestone ? 'crosshair' : 'default' }}
          />
        </div>

        <div className="timeline-sidebar">
          {financialSummary && (
            <div className="financial-summary">
              <h3>Financial Overview</h3>
              <div className="financial-stats">
                <div className="stat">
                  <label>Total Budget</label>
                  <span>${financialSummary.totalBudget.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <label>Actual Cost</label>
                  <span>${financialSummary.totalActualCost.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <label>Projected Overrun</label>
                  <span className={financialSummary.projectedOverrun > 0 ? 'warning' : 'success'}>
                    ${financialSummary.projectedOverrun.toLocaleString()}
                  </span>
                </div>
                <div className="stat">
                  <label>Risk Score</label>
                  <span className={`risk-${financialSummary.riskScore > 70 ? 'high' : financialSummary.riskScore > 40 ? 'medium' : 'low'}`}>
                    {financialSummary.riskScore}/100
                  </span>
                </div>
              </div>
              {financialSummary.criticalPath.length > 0 && (
                <div className="critical-path">
                  <h4>Critical Path</h4>
                  <ul>
                    {financialSummary.criticalPath.map(id => {
                      const milestone = milestones.get(id);
                      return milestone ? (
                        <li key={id}>{milestone.title}</li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selectedMilestone && (
            <MilestoneEditor
              milestone={selectedMilestone}
              onUpdate={updateMilestone}
              onDelete={() => deleteMilestone(selectedMilestone.id)}
              onClose={() => setSelectedMilestone(null)}
            />
          )}
        </div>
      </div>

      <footer className="timeline-footer">
        <p>
          Powered by <a href="https://cobe.vercel.app/">🌏 Cobe</a> and{" "}
          <a href="https://npmjs.com/package/partyserver/">🎈 PartyServer</a>
        </p>
      </footer>
    </div>
  );
}

// Milestone editor component
interface MilestoneEditorProps {
  milestone: Milestone;
  onUpdate: (milestone: Milestone) => void;
  onDelete: () => void;
  onClose: () => void;
}

function MilestoneEditor({ milestone, onUpdate, onDelete, onClose }: MilestoneEditorProps) {
  const [editedMilestone, setEditedMilestone] = useState<Milestone>(milestone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editedMilestone);
    onClose();
  };

  const handleChange = (field: keyof Milestone, value: any) => {
    setEditedMilestone(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="milestone-editor">
      <div className="editor-header">
        <h3>Edit Milestone</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={editedMilestone.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={editedMilestone.date.toISOString().split('T')[0]}
            onChange={(e) => handleChange('date', new Date(e.target.value))}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Budget</label>
            <input
              type="number"
              value={editedMilestone.budget}
              onChange={(e) => handleChange('budget', Number(e.target.value))}
              min="0"
              step="100"
              required
            />
          </div>

          <div className="form-group">
            <label>Actual Cost</label>
            <input
              type="number"
              value={editedMilestone.actualCost}
              onChange={(e) => handleChange('actualCost', Number(e.target.value))}
              min="0"
              step="100"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select
              value={editedMilestone.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="form-group">
            <label>Risk Level</label>
            <select
              value={editedMilestone.riskLevel}
              onChange={(e) => handleChange('riskLevel', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Category</label>
          <select
            value={editedMilestone.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            <option value="recording">Recording</option>
            <option value="production">Production</option>
            <option value="marketing">Marketing</option>
            <option value="distribution">Distribution</option>
            <option value="legal">Legal</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={editedMilestone.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">Save Changes</button>
          <button type="button" className="delete-btn" onClick={onDelete}>Delete</button>
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
