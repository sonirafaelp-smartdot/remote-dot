import { RealtimeNotification } from '../types.ts';
import { soundService } from './soundService.ts';

type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';
type EventListener = (event: RealtimeNotification) => void;
type StatusListener = (status: ConnectionState) => void;

class RealtimeSocketManager {
  private socket: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Map<string, Set<EventListener>> = new Map();
  private anyListeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private pingStart: number = 0;
  private latencyMs: number = 0;
  private soundEnabled: boolean = true;

  constructor() {
    this.init();
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getLatency(): number {
    return this.latencyMs;
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public on(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public onAny(listener: EventListener): () => void {
    this.anyListeners.add(listener);
    return () => {
      this.anyListeners.delete(listener);
    };
  }

  private setStatus(state: ConnectionState) {
    this.connectionState = state;
    this.statusListeners.forEach((l) => l(state));
  }

  public init() {
    if (typeof window === 'undefined') return;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    this.setStatus('reconnecting');

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.setStatus('connected');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingEvent(data);
        } catch (err) {
          console.error('Failed to parse WS payload:', err);
        }
      };

      this.socket.onclose = () => {
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket error encountered:', err);
        this.socket?.close();
      };
    } catch (e) {
      console.error('Error connecting to WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.setStatus('reconnecting');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.init();
    }, 3000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.pingStart = Date.now();
        this.socket.send(JSON.stringify({ type: 'PING' }));
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private handleIncomingEvent(data: any) {
    if (data.type === 'PONG') {
      this.latencyMs = Date.now() - this.pingStart;
      return;
    }

    if (data.type === 'HUB_CONNECTED') {
      return;
    }

    const notification: RealtimeNotification = {
      id: data.id || `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: data.type || 'NOTIFICATION',
      topic: data.topic || 'alerts',
      severity: data.severity || 'info',
      title: data.title || 'Nueva Notificación',
      message: data.message || '',
      data: data.data,
      timestamp: data.timestamp || new Date().toISOString(),
      read: false,
    };

    // Play Sound according to severity/topic if enabled
    if (this.soundEnabled) {
      if (notification.severity === 'critical') {
        soundService.playCriticalAlert();
      } else if (notification.type === 'REMOTE_SESSION_REQUESTED') {
        soundService.playSessionRequest();
      } else if (notification.type === 'TICKET_CREATED') {
        soundService.playTicketNotification();
      } else if (notification.type === 'DEVICE_STATUS_CHANGED') {
        if (notification.severity === 'success') {
          soundService.playDeviceOnline();
        } else {
          soundService.playDeviceOffline();
        }
      } else if (notification.type === 'TICKET_COMMENT') {
        soundService.playMessagePop();
      } else {
        soundService.playMessagePop();
      }
    }

    // Dispatch to topic/type listeners
    if (this.listeners.has(notification.type)) {
      this.listeners.get(notification.type)!.forEach((fn) => fn(notification));
    }

    // Dispatch to generic listeners
    this.anyListeners.forEach((fn) => fn(notification));
  }

  public send(event: { type: string; title: string; message: string; severity?: string; topic?: string; data?: any }) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    } else {
      console.warn('Socket not open, attempting fallback via REST');
      fetch('/api/v1/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch((e) => console.error('Fallback broadcast error:', e));
    }
  }

  public reconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.init();
  }
}

export const realtimeSocket = new RealtimeSocketManager();
