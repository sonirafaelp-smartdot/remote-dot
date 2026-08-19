import { WebSocket } from 'ws';

export interface RealtimeEvent {
  type: string;
  topic?: 'tickets' | 'devices' | 'sessions' | 'alerts' | 'system';
  severity?: 'info' | 'warning' | 'error' | 'critical' | 'success';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

class RealtimeHub {
  private clients = new Set<WebSocket>();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistory = 100;

  public registerClient(ws: WebSocket) {
    this.clients.add(ws);

    // Send connection handshake + recent notification history
    ws.send(
      JSON.stringify({
        type: 'HUB_CONNECTED',
        message: 'Conexión WebSocket establecida con el Hub de Notificaciones en Tiempo Real',
        timestamp: new Date().toISOString(),
        recent_events: this.eventHistory.slice(0, 15),
      })
    );
  }

  public unregisterClient(ws: WebSocket) {
    this.clients.delete(ws);
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public getRecentEvents(): RealtimeEvent[] {
    return [...this.eventHistory];
  }

  public broadcast(event: Omit<RealtimeEvent, 'timestamp'>) {
    const payload: RealtimeEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Keep in memory history
    this.eventHistory.unshift(payload);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    const json = JSON.stringify(payload);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(json);
        } catch (e) {
          console.error('Error sending WS message:', e);
        }
      }
    });

    return payload;
  }
}

export const realtimeHub = new RealtimeHub();
