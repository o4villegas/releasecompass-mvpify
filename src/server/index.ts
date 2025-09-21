import { routePartykitRequest, Server } from "partyserver";

import type { OutgoingMessage, Position, Milestone, FinancialSummary, TimelineState } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";
import { FinancialEngine } from "../financial-engine";

// This is the state that we'll store on each connection
type ConnectionState = {
  position: Position;
  isTimelineUser?: boolean; // Flag to distinguish timeline users from legacy globe users
};

// Server-side timeline state management
type ServerTimelineState = {
  milestones: Map<string, Milestone>;
  timelineStart: Date;
  timelineEnd: Date;
  lastFinancialUpdate: Date;
};

export class Globe extends Server {
  private timelineState: ServerTimelineState = {
    milestones: new Map(),
    timelineStart: new Date(),
    timelineEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    lastFinancialUpdate: new Date()
  };

  onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
    // Check if this is a timeline user (based on user agent or query param)
    const isTimelineUser = ctx.request.url.includes('timeline=true') ||
                          ctx.request.headers.get('User-Agent')?.includes('ReleaseCompass');

    if (isTimelineUser) {
      // Timeline users don't need location data
      const position = {
        lat: 0,
        lng: 0,
        id: conn.id,
      };

      // Save connection state for timeline user
      conn.setState({
        position,
        isTimelineUser: true,
      });

      // Send timeline state to new timeline user
      this.sendTimelineSync(conn);
    } else {
      // Legacy globe users need location data
      const latitude = ctx.request.cf?.latitude as string | undefined;
      const longitude = ctx.request.cf?.longitude as string | undefined;

      if (!latitude || !longitude) {
        console.warn(`Missing position information for legacy globe connection ${conn.id}`);
        return;
      }

      const position = {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        id: conn.id,
      };

      // Save connection state for globe user
      conn.setState({
        position,
        isTimelineUser: false,
      });

      // Legacy globe behavior for backward compatibility
      this.sendGlobeState(conn);
    }
  }

  private sendTimelineSync(conn: Connection<ConnectionState>) {
    try {
      const milestonesArray = Array.from(this.timelineState.milestones.values());
      const financialSummary = FinancialEngine.calculateFinancialSummary(milestonesArray);

      conn.send(
        JSON.stringify({
          type: "timeline-sync",
          state: {
            milestones: this.timelineState.milestones,
            financialSummary,
            timelineStart: this.timelineState.timelineStart,
            timelineEnd: this.timelineState.timelineEnd,
            currentDate: new Date()
          } satisfies TimelineState
        } satisfies OutgoingMessage)
      );
    } catch (error) {
      console.error('Error sending timeline sync:', error);
      this.onCloseOrError(conn);
    }
  }

  private sendGlobeState(conn: Connection<ConnectionState>) {
    // Legacy globe behavior - send all positions
    for (const connection of this.getConnections<ConnectionState>()) {
      try {
        const connectionState = connection.state as ConnectionState | undefined;
        const connState = conn.state as ConnectionState | undefined;

        if (!connectionState?.isTimelineUser && connectionState?.position) {
          conn.send(
            JSON.stringify({
              type: "add-marker",
              position: connectionState.position,
            } satisfies OutgoingMessage),
          );

          // Send new connection to all other globe users
          if (connection.id !== conn.id && !connectionState?.isTimelineUser && connState?.position) {
            connection.send(
              JSON.stringify({
                type: "add-marker",
                position: connState.position,
              } satisfies OutgoingMessage),
            );
          }
        }
      } catch {
        this.onCloseOrError(conn);
      }
    }
  }

  onMessage(connection: Connection<ConnectionState>, message: string) {
    try {
      const data = JSON.parse(message);
      const state = connection.state as ConnectionState | undefined;

      if (!state?.isTimelineUser) {
        // Ignore messages from non-timeline users for now
        return;
      }

      switch (data.type) {
        case 'milestone-update':
          this.handleMilestoneUpdate(connection, data.milestone);
          break;
        case 'milestone-delete':
          this.handleMilestoneDelete(connection, data.milestoneId);
          break;
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private handleMilestoneUpdate(connection: Connection<ConnectionState>, milestone: Milestone) {
    // Validate milestone data
    if (!milestone.id || !milestone.title || !milestone.date) {
      console.warn('Invalid milestone data received');
      return;
    }

    // Update server state
    this.timelineState.milestones.set(milestone.id, {
      ...milestone,
      date: new Date(milestone.date) // Ensure date is properly parsed
    });

    // Broadcast to all timeline users
    this.broadcastToTimelineUsers({
      type: "milestone-update",
      milestone
    } satisfies OutgoingMessage, connection.id);

    // Recalculate and broadcast financial summary
    this.broadcastFinancialUpdate();
  }

  private handleMilestoneDelete(connection: Connection<ConnectionState>, milestoneId: string) {
    if (!this.timelineState.milestones.has(milestoneId)) {
      console.warn('Attempted to delete non-existent milestone:', milestoneId);
      return;
    }

    this.timelineState.milestones.delete(milestoneId);

    // Broadcast to all timeline users
    this.broadcastToTimelineUsers({
      type: "milestone-delete",
      milestoneId
    } satisfies OutgoingMessage, connection.id);

    // Recalculate and broadcast financial summary
    this.broadcastFinancialUpdate();
  }

  private broadcastToTimelineUsers(message: OutgoingMessage, excludeConnectionId?: string) {
    const messageString = JSON.stringify(message);

    for (const connection of this.getConnections<ConnectionState>()) {
      const state = connection.state as ConnectionState | undefined;
      if (state?.isTimelineUser && connection.id !== excludeConnectionId) {
        try {
          connection.send(messageString);
        } catch (error) {
          console.error('Error broadcasting to timeline user:', error);
          this.onCloseOrError(connection);
        }
      }
    }
  }

  private broadcastFinancialUpdate() {
    const milestonesArray = Array.from(this.timelineState.milestones.values());
    const financialSummary = FinancialEngine.calculateFinancialSummary(milestonesArray);

    this.broadcastToTimelineUsers({
      type: "financial-update",
      financialSummary
    } satisfies OutgoingMessage);

    this.timelineState.lastFinancialUpdate = new Date();
  }

  // Whenever a connection closes (or errors), we'll broadcast a message to all
  // other connections to remove the marker.
  onCloseOrError(connection: Connection) {
    const state = connection.state as ConnectionState | undefined;
    if (state?.isTimelineUser) {
      // Timeline users don't need marker removal - they're not location-based
      return;
    }

    // Legacy globe behavior - remove location marker
    this.broadcast(
      JSON.stringify({
        type: "remove-marker",
        id: connection.id,
      } satisfies OutgoingMessage),
      [connection.id],
    );
  }

  onClose(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }

  onError(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, { ...env })) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
