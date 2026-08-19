import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import {
  Bell,
  Radio,
  Volume2,
  VolumeX,
  Play,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Trash2,
  Laptop,
  Ticket,
  Video,
  Code2,
  Sliders,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  Server,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { RealtimeNotification } from '../types.ts';
import { realtimeSocket } from '../services/realtimeSocket.ts';
import { soundService } from '../services/soundService.ts';
import { signalRHubCode, csharpClientCode } from '../data/realtimeSourceCode.ts';

interface DeviceItem {
  id: string;
  computer_name: string;
  windows_user: string;
  ip_address: string;
  is_online: boolean;
  last_heartbeat: string;
  customer_id: string;
  customer?: {
    company_name: string;
  };
}

export function RealtimeNotificationsView() {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>(
    realtimeSocket.getConnectionState()
  );
  const [latency, setLatency] = useState<number>(0);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(75);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(false);
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCodeTab, setActiveCodeTab] = useState<'hub' | 'client'>('hub');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);

  // Custom event dispatcher form state
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [customSeverity, setCustomSeverity] = useState<'info' | 'warning' | 'error' | 'critical' | 'success'>('info');
  const [customTopic, setCustomTopic] = useState<'tickets' | 'devices' | 'sessions' | 'alerts' | 'system'>('alerts');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Fetch initial notifications and devices
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/notifications');
      if (res.ok) {
        const data = await res.json();
        if (data.events && Array.isArray(data.events)) {
          setNotifications(data.events);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch('/api/v1/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchDevices();

    // Subscribe to socket connection status
    const unsubscribeStatus = realtimeSocket.subscribeStatus((status) => {
      setConnectionStatus(status);
      setLatency(realtimeSocket.getLatency());
    });

    // Subscribe to incoming realtime notifications
    const unsubscribeAny = realtimeSocket.onAny((notif) => {
      setNotifications((prev) => [notif, ...prev]);
      // If event is device status changed, refresh devices list
      if (notif.type === 'DEVICE_STATUS_CHANGED') {
        fetchDevices();
      }
    });

    // Latency interval update
    const latInterval = setInterval(() => {
      setLatency(realtimeSocket.getLatency());
    }, 2000);

    return () => {
      unsubscribeStatus();
      unsubscribeAny();
      clearInterval(latInterval);
    };
  }, [fetchNotifications, fetchDevices]);

  // Handle sound toggle & volume
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    realtimeSocket.setSoundEnabled(next);
    soundService.setMuted(!next);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundService.setVolume(newVol / 100);
  };

  // Trigger sound sample preview
  const playSampleSound = (type: 'critical' | 'ticket' | 'session' | 'online' | 'offline') => {
    if (type === 'critical') soundService.playCriticalAlert();
    else if (type === 'ticket') soundService.playTicketNotification();
    else if (type === 'session') soundService.playSessionRequest();
    else if (type === 'online') soundService.playDeviceOnline();
    else if (type === 'offline') soundService.playDeviceOffline();
  };

  // Trigger simulated scenarios
  const handleSimulateScenario = async (scenario: string) => {
    setIsSimulating(scenario);
    try {
      const res = await fetch('/api/v1/notifications/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      if (res.ok) {
        await res.json();
      }
    } catch (err) {
      console.error('Error simulating scenario:', err);
    } finally {
      setTimeout(() => setIsSimulating(null), 600);
    }
  };

  // Broadcast custom event
  const handleBroadcastCustom = async (e: FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customMessage.trim()) return;

    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/v1/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle,
          message: customMessage,
          severity: customSeverity,
          topic: customTopic,
          type: 'CUSTOM_TECHNICIAN_BROADCAST',
        }),
      });
      if (res.ok) {
        setCustomTitle('');
        setCustomMessage('');
      }
    } catch (err) {
      console.error('Error broadcasting custom event:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Toggle device online state
  const handleToggleDevice = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/v1/devices/${deviceId}/toggle-online`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchDevices();
      }
    } catch (err) {
      console.error('Error toggling device status:', err);
    }
  };

  // Copy code helper
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Clear notifications
  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    if (selectedSeverityFilter !== 'all' && n.severity !== selectedSeverityFilter) return false;
    if (selectedTopicFilter !== 'all' && n.topic !== selectedTopicFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Crítico
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3 text-red-400" />
            Error
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Advertencia
          </span>
        );
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Éxito
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Radio className="w-3 h-3 text-red-400" />
            Informativo
          </span>
        );
    }
  };

  const getTopicIcon = (topic?: string, type?: string) => {
    if (topic === 'tickets' || type?.includes('TICKET')) {
      return <Ticket className="w-4 h-4 text-amber-400" />;
    }
    if (topic === 'devices' || type?.includes('DEVICE')) {
      return <Laptop className="w-4 h-4 text-emerald-400" />;
    }
    if (topic === 'sessions' || type?.includes('SESSION')) {
      return <Video className="w-4 h-4 text-red-400" />;
    }
    return <Bell className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-rose-600/20 rounded-lg border border-red-500/30">
                <Radio className="w-6 h-6 text-red-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  Notificaciones & Eventos en Tiempo Real
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    Fase 6: WebSocket / SignalR
                  </span>
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Canal bidireccional de alertas instantáneas, telemetría de equipos y notificaciones sonoras sintetizadas.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Status & Quick Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            {/* Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/60 text-xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-medium text-slate-200">
                {connectionStatus === 'connected'
                  ? 'WebSocket Conectado'
                  : connectionStatus === 'reconnecting'
                  ? 'Reconectando...'
                  : 'Desconectado'}
              </span>
              <span className="text-slate-500 text-[11px] ml-1">
                {latency > 0 ? `${latency}ms` : '< 1ms'}
              </span>
            </div>

            {/* Sound Mute Toggle */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                soundEnabled
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
              title={soundEnabled ? 'Silenciar sonidos de alerta' : 'Activar sonidos de alerta'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-red-400" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Audio ON' : 'Audio Mute'}</span>
            </button>

            {/* Reconnect button */}
            <button
              onClick={() => realtimeSocket.reconnect()}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Reconectar Socket"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Audio Controls & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Synthesizer & Audio Engine */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-red-400" />
                Motor de Audio Web API
              </h3>
              <span className="text-[11px] text-red-400 font-mono">24-bit / 48kHz</span>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Sintetizador Web Audio nativo para avisos acústicos de alta prioridad sin depender de archivos de audio externos.
            </p>

            {/* Volume Slider */}
            <div className="mt-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-medium">
                <span>Volumen de Notificaciones</span>
                <span className="text-red-400 font-mono">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Audio Sampler Buttons */}
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Muestras de Audio en Vivo
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => playSampleSound('critical')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all text-left"
                >
                  <Play className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span className="truncate">Alerta Crítica</span>
                </button>
                <button
                  onClick={() => playSampleSound('ticket')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all text-left"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="truncate">Nuevo Ticket</span>
                </button>
                <button
                  onClick={() => playSampleSound('session')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition-all text-left"
                >
                  <Play className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  <span className="truncate">Sesión Remota</span>
                </button>
                <button
                  onClick={() => playSampleSound('online')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all text-left"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">Equipo Online</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Scenario Simulator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Simulador de Eventos Helpdesk
              </h3>
              <span className="text-[11px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                1-Click Test
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Dispare escenarios reales para validar la propagación de eventos en WebSocket, SignalR y avisos de audio.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                onClick={() => handleSimulateScenario('CRITICAL_TICKET')}
                disabled={isSimulating === 'CRITICAL_TICKET'}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/50 text-slate-200 transition-all text-left text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 group-hover:animate-ping" />
                  <div>
                    <span className="font-semibold text-rose-300">Ticket Crítico (Caída BD)</span>
                    <p className="text-[11px] text-slate-500">SLA de 2 Horas y aviso de alta prioridad</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
              </button>

              <button
                onClick={() => handleSimulateScenario('REMOTE_SESSION_REQUEST')}
                disabled={isSimulating === 'REMOTE_SESSION_REQUEST'}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/50 text-slate-200 transition-all text-left text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div>
                    <span className="font-semibold text-red-300">Solicitud de Control Remoto</span>
                    <p className="text-[11px] text-slate-500">Usuario esperando autorización de técnico</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
              </button>

              <button
                onClick={() => handleSimulateScenario('SLA_BREACH_WARNING')}
                disabled={isSimulating === 'SLA_BREACH_WARNING'}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/50 text-slate-200 transition-all text-left text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div>
                    <span className="font-semibold text-amber-300">Alarma de SLA (&lt; 30 min)</span>
                    <p className="text-[11px] text-slate-500">Aviso de riesgo de incumplimiento contractual</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>

              <button
                onClick={() => handleSimulateScenario('DEVICE_OFFLINE_ALERT')}
                disabled={isSimulating === 'DEVICE_OFFLINE_ALERT'}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 hover:bg-red-950/30 border border-slate-800 hover:border-red-500/50 text-slate-200 transition-all text-left text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div>
                    <span className="font-semibold text-red-300">Caída de Equipo Heartbeat Timeout</span>
                    <p className="text-[11px] text-slate-500">Falta de latido durante más de 60 segundos</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Custom Broadcast Dispatcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              Emitir Alerta Manual
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">POST /broadcast</span>
          </div>

          <form onSubmit={handleBroadcastCustom} className="mt-3 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Título de la Notificación</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ej. Mantenimiento del servidor central"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Mensaje de Detalle</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Ej. Se reiniciará el servicio en 10 minutos..."
                rows={2}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Severidad</label>
                <select
                  value={customSeverity}
                  onChange={(e) => setCustomSeverity(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="info">Info (Azul)</option>
                  <option value="success">Éxito (Verde)</option>
                  <option value="warning">Advertencia (Ámbar)</option>
                  <option value="critical">Crítico (Rojo)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Canal</label>
                <select
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="alerts">Alertas Generales</option>
                  <option value="tickets">Tickets & SLA</option>
                  <option value="devices">Dispositivos HWID</option>
                  <option value="sessions">Sesiones Remotas</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBroadcasting}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all mt-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBroadcasting ? 'Emitiendo...' : 'Transmitir por WebSocket'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Split: Live Feed & Device Heartbeat Presence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Activity Feed */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[580px]">
          {/* Feed Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-bold text-white">Registro de Eventos en Tiempo Real</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {filteredNotifications.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClearNotifications}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Limpiar registro"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            </div>
          </div>

          {/* Search & Filters Toolbar */}
          <div className="flex flex-wrap items-center gap-3 py-3 border-b border-slate-800/80 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por ticket, título o equipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <Filter className="w-3 h-3 text-slate-500 ml-1" />
              {['all', 'critical', 'warning', 'info', 'success'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverityFilter(sev)}
                  className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-all ${
                    selectedSeverityFilter === sev
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev === 'all' ? 'Todos' : sev}
                </button>
              ))}
            </div>
          </div>

          {/* Feed List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 mt-3 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Radio className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                <p className="text-sm font-medium text-slate-400">No hay notificaciones en la cola</p>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Utilice el simulador de eventos de la derecha o envíe un ticket para ver la propagación instantánea.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    notif.severity === 'critical'
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                      : notif.severity === 'warning'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : notif.severity === 'success'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                        {getTopicIcon(notif.topic, notif.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-100">{notif.title}</h4>
                          {getSeverityBadge(notif.severity)}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                        {notif.data && (
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                            {Object.entries(notif.data).map(([k, v]) => (
                              <span key={k}>
                                <strong className="text-slate-300">{k}:</strong> {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Device Presence & Heartbeat Monitoring */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Dispositivos en Vivo (Heartbeat)</h3>
            </div>
            <button
              onClick={fetchDevices}
              className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
              title="Refrescar equipos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-2 mb-3">
            Monitoreo en tiempo real del estado de conexión de los agentes Windows cliente.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
            {devices.map((device) => (
              <div
                key={device.id}
                className="p-3 bg-slate-950/80 border border-slate-800/90 rounded-xl flex flex-col gap-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        device.is_online
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-slate-600'
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-200">{device.computer_name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      device.is_online
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {device.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{device.customer?.company_name || 'Sin empresa'}</span>
                  <span className="font-mono text-slate-500">{device.ip_address}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                  <span className="text-slate-500">
                    Último latido: <span className="text-slate-400">{new Date(device.last_heartbeat).toLocaleTimeString()}</span>
                  </span>
                  <button
                    onClick={() => handleToggleDevice(device.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      device.is_online
                        ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    {device.is_online ? 'Desconectar' : 'Conectar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* C# .NET 9 SignalR Architecture & Client Implementation Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-400" />
              Arquitectura SignalR & Cliente Windows C# (.NET 9)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Código fuente de producción para integración con servicios ASP.NET Core y el Agente Windows WPF.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveCodeTab('hub')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeCodeTab === 'hub'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                NotificationHub.cs (Servidor)
              </button>
              <button
                onClick={() => setActiveCodeTab('client')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeCodeTab === 'client'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RealtimeNotificationClient.cs (Agente WPF)
              </button>
            </div>

            <button
              onClick={() => handleCopyCode(activeCodeTab === 'hub' ? signalRHubCode : csharpClientCode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Code Box */}
        <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <span>{activeCodeTab === 'hub' ? 'RemoteDesk.Server / NotificationHub.cs' : 'RemoteDesk.Client / RealtimeNotificationClient.cs'}</span>
            <span className="text-indigo-400">C# 13 / .NET 9</span>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed custom-scrollbar">
            <code>{activeCodeTab === 'hub' ? signalRHubCode : csharpClientCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
