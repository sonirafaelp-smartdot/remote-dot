import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Activity,
  Radio,
  Laptop,
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Play,
  Square,
  MessageSquare,
  Send,
  Wifi,
  Cpu,
  HardDrive,
  User,
  Building2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Code,
  Terminal,
  Zap,
  Phone,
  Layers,
  Settings2,
  Maximize2,
  Check,
  Copy,
  Info
} from 'lucide-react';
import {
  RemoteSession,
  RemoteSessionStatus,
  TechnicianConsoleKpis,
  TechnicianPresenceStatus,
  PingDeviceResult,
  TicketPriority,
  TicketStatus
} from '../types.ts';
import { realtimeSocket } from '../services/realtimeSocket.ts';
import { soundService } from '../services/soundService.ts';

interface TechnicianConsoleViewProps {
  onNavigateToRemoteControl?: (sessionId?: string) => void;
}

export function TechnicianConsoleView({ onNavigateToRemoteControl }: TechnicianConsoleViewProps = {}) {
  // State
  const [kpis, setKpis] = useState<TechnicianConsoleKpis>({
    totalTickets: 0,
    openTicketsCount: 0,
    criticalTicketsCount: 0,
    resolvedTodayCount: 0,
    totalDevicesCount: 0,
    onlineDevicesCount: 0,
    offlineDevicesCount: 0,
    activeSessionsCount: 0,
    queuedRequestsCount: 0,
    avgResponseTimeMinutes: 4.2,
    slaComplianceRate: 98.4,
    techniciansOnline: 2,
  });

  const [queue, setQueue] = useState<RemoteSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<RemoteSession[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [technicianStatus, setTechnicianStatus] = useState<TechnicianPresenceStatus>('AVAILABLE');
  const [selectedSession, setSelectedSession] = useState<RemoteSession | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'active-sessions' | 'devices' | 'csharp-code'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals state
  const [directLaunchModalOpen, setDirectLaunchModalOpen] = useState(false);
  const [selectedDeviceForLaunch, setSelectedDeviceForLaunch] = useState<any | null>(null);
  const [launchReason, setLaunchReason] = useState('');
  const [launchQuality, setLaunchQuality] = useState<'Low' | 'Balanced' | 'High' | 'Ultra'>('Balanced');

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedDeviceForMessage, setSelectedDeviceForMessage] = useState<any | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messageUrgency, setMessageUrgency] = useState<'normal' | 'warning' | 'critical'>('normal');

  const [pingResult, setPingResult] = useState<PingDeviceResult | null>(null);
  const [pingingDeviceId, setPingingDeviceId] = useState<string | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [sessionToReject, setSessionToReject] = useState<RemoteSession | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Live session viewport simulation
  const [liveSessionViewportOpen, setLiveSessionViewportOpen] = useState(false);
  const [viewportSession, setViewportSession] = useState<RemoteSession | null>(null);
  const [simulatedLogLines, setSimulatedLogLines] = useState<string[]>([]);

  // Shift metrics
  const [shiftStartTime] = useState<Date>(new Date(Date.now() - 3.5 * 3600000));
  const [now, setNow] = useState<number>(Date.now());

  // Clock ticker for elapsed wait timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial dashboard stats, queue, devices and active sessions
  const fetchConsoleData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard KPIs
      const kpisRes = await fetch('/api/v1/sessions/dashboard-stats');
      if (kpisRes.ok) {
        const data = await kpisRes.json();
        setKpis(data.kpis);
      }

      // 2. Fetch Queue
      const queueRes = await fetch('/api/v1/sessions/queue');
      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueue(data.queue.filter((s: RemoteSession) => s.status === RemoteSessionStatus.REQUESTED));
      }

      // 3. Fetch Active Sessions
      const sessionsRes = await fetch('/api/v1/sessions?status=Sesión activa');
      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setActiveSessions(data.sessions);
      }

      // 4. Fetch Devices
      const devicesRes = await fetch('/api/v1/devices');
      if (devicesRes.ok) {
        const data = await devicesRes.json();
        setDevices(data);
      }
    } catch (err) {
      console.error('Error fetching technician console data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsoleData();
  }, [fetchConsoleData]);

  // Subscribe to real-time events to update queue and session status instantly
  useEffect(() => {
    const unsub = realtimeSocket.onAny((notif) => {
      if (
        notif.topic === 'sessions' ||
        notif.topic === 'tickets' ||
        notif.topic === 'devices' ||
        notif.type.includes('SESSION') ||
        notif.type.includes('DEVICE')
      ) {
        fetchConsoleData();
      }
    });

    return () => {
      unsub();
    };
  }, [fetchConsoleData]);

  // Format elapsed time (mm:ss or hh:mm:ss)
  const formatElapsedTime = (dateString?: string) => {
    if (!dateString) return '00:00';
    const elapsedSeconds = Math.max(0, Math.floor((now - new Date(dateString).getTime()) / 1000));
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}h ${remainingMins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Format shift elapsed
  const formatShiftDuration = () => {
    const totalSecs = Math.floor((now - shiftStartTime.getTime()) / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  // Handle Accept Session from Queue
  const handleAcceptSession = async (session: RemoteSession) => {
    soundService.playSessionRequest();
    try {
      const res = await fetch(`/api/v1/sessions/${session.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: 'tech-001' }),
      });

      if (res.ok) {
        const accepted = await res.json();
        // Open live viewport
        setViewportSession(accepted);
        setLiveSessionViewportOpen(true);
        setSimulatedLogLines([
          `[${new Date().toLocaleTimeString()}] Handshake WebRTC negociado con éxito.`,
          `[${new Date().toLocaleTimeString()}] Desktop Duplication API iniciada en el agente remoto.`,
          `[${new Date().toLocaleTimeString()}] Conexión establecida: 60 FPS @ 1080p (Latencia: 14ms).`,
          `[${new Date().toLocaleTimeString()}] Control de teclado y ratón inyectado (DirectSendInput).`,
        ]);
        fetchConsoleData();
      }
    } catch (err) {
      console.error('Error accepting session:', err);
    }
  };

  // Open Reject Modal
  const handleOpenReject = (session: RemoteSession) => {
    setSessionToReject(session);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // Submit Rejection
  const handleSubmitReject = async () => {
    if (!sessionToReject) return;
    try {
      const res = await fetch(`/api/v1/sessions/${sessionToReject.id}/reject-by-tech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: 'tech-001',
          reason: rejectReason || 'Reasignación por alta demanda técnica',
        }),
      });
      if (res.ok) {
        setRejectModalOpen(false);
        setSessionToReject(null);
        fetchConsoleData();
      }
    } catch (err) {
      console.error('Error rejecting session:', err);
    }
  };

  // Handle Direct Launch (1-Click Support)
  const handleDirectLaunchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceForLaunch) return;

    try {
      const res = await fetch('/api/v1/sessions/direct-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: selectedDeviceForLaunch.id,
          technician_id: 'tech-001',
          reason: launchReason || 'Sesión de soporte directo solicitada por técnico.',
          quality_setting: launchQuality,
        }),
      });

      if (res.ok) {
        const session = await res.json();
        soundService.playSessionRequest();
        setDirectLaunchModalOpen(false);
        setSelectedDeviceForLaunch(null);
        setLaunchReason('');
        // Open live viewport
        setViewportSession(session);
        setLiveSessionViewportOpen(true);
        setSimulatedLogLines([
          `[${new Date().toLocaleTimeString()}] Petición enviada al Agente Windows (${session.device?.computer_name}).`,
          `[${new Date().toLocaleTimeString()}] Esperando confirmación de usuario en pantalla remota...`,
          `[${new Date().toLocaleTimeString()}] Token de sesión: ${session.session_token}`,
        ]);
        fetchConsoleData();
      }
    } catch (err) {
      console.error('Error in direct launch:', err);
    }
  };

  // Handle Ping Device
  const handlePingDevice = async (device: any) => {
    setPingingDeviceId(device.id);
    try {
      const res = await fetch(`/api/v1/devices/${device.id}/ping`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPingResult(data);
      }
    } catch (err) {
      console.error('Error pinging device:', err);
    } finally {
      setPingingDeviceId(null);
    }
  };

  // Handle Send Message to Device Screen
  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceForMessage || !messageText.trim()) return;

    try {
      const res = await fetch(`/api/v1/devices/${selectedDeviceForMessage.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          urgency: messageUrgency,
          title: `Aviso del Centro de Soporte para ${selectedDeviceForMessage.computer_name}`,
        }),
      });

      if (res.ok) {
        soundService.playMessagePop();
        setMessageModalOpen(false);
        setMessageText('');
        setSelectedDeviceForMessage(null);
      }
    } catch (err) {
      console.error('Error sending message to device:', err);
    }
  };

  // Handle Terminate Session
  const handleTerminateSession = async (session: RemoteSession) => {
    try {
      const res = await fetch(`/api/v1/sessions/${session.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminated_by: 'Ing. Roberto Ramírez (Técnico)',
          reason: 'Soporte técnico concluido con éxito.',
        }),
      });

      if (res.ok) {
        setLiveSessionViewportOpen(false);
        setViewportSession(null);
        fetchConsoleData();
      }
    } catch (err) {
      console.error('Error terminating session:', err);
    }
  };

  // Filtered devices list
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.computer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.windows_user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ip_address.includes(searchQuery) ||
      (d.customer?.company_name && d.customer.company_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (deviceFilter === 'online') return matchesSearch && d.is_online;
    if (deviceFilter === 'offline') return matchesSearch && !d.is_online;
    return matchesSearch;
  });

  // Sample C# WPF Technician Console Code
  const csharpTechnicianCode = `// ============================================================================
// RemoteDesk Enterprise - Consola del Técnico para Windows (.NET 9 / WPF)
// Archivo: TechnicianConsoleMainWindow.xaml.cs
// Arquitectura: MVVM + SignalR Realtime Hub + Direct3D Video Renderer
// ============================================================================

using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.AspNetCore.SignalR.Client;

namespace RemoteDesk.TechnicianConsole
{
    public partial class MainWindow : Window
    {
        private HubConnection _hubConnection;
        private readonly string _serverBaseUrl = "https://remotedesk.enterprise/api/v1";
        private readonly string _technicianId = "tech-001";
        
        public ObservableCollection<SupportQueueItem> IncomingQueue { get; set; } = new();
        public ObservableCollection<ActiveSessionModel> ActiveSessions { get; set; } = new();

        public MainWindow()
        {
            InitializeComponent();
            DataContext = this;
            Loaded += async (s, e) => await InitializeSignalRAsync();
        }

        private async Task InitializeSignalRAsync()
        {
            _hubConnection = new HubConnectionBuilder()
                .WithUrl($"{_serverBaseUrl}/notificationHub?technicianId={_technicianId}")
                .WithAutomaticReconnect(new[] { 
                    TimeSpan.Zero, 
                    TimeSpan.FromSeconds(2), 
                    TimeSpan.FromSeconds(5), 
                    TimeSpan.FromSeconds(10) 
                })
                .Build();

            // 1. Manejo de Nueva Solicitud Entrante en Cola
            _hubConnection.On<SupportQueueItem>("OnIncomingSessionRequested", (queueItem) =>
            {
                Dispatcher.Invoke(() =>
                {
                    IncomingQueue.Insert(0, queueItem);
                    PlayAttentionChime();
                    ShowWindowsToast($"Nueva Petición: {queueItem.ComputerName}", queueItem.ProblemSummary);
                });
            });

            // 2. Manejo de Aceptación Bilateral / Token Autorizado
            _hubConnection.On<string, string>("OnSessionAuthorized", (sessionId, token) =>
            {
                Dispatcher.Invoke(() =>
                {
                    LaunchDirect3DStreamWindow(sessionId, token);
                });
            });

            try
            {
                await _hubConnection.StartAsync();
                UpdateStatusBar("Conectado al Servidor Central (SignalR Hub OK)");
            }
            catch (Exception ex)
            {
                UpdateStatusBar($"Error de conexión: {ex.Message}");
            }
        }

        // Acción [ACEPTAR SOPORTE] en la cola
        private async void BtnAcceptSupport_Click(object sender, RoutedEventArgs e)
        {
            if (QueueDataGrid.SelectedItem is SupportQueueItem selected)
            {
                var response = await HttpService.PostAsync<SessionAcceptResult>(
                    $"{_serverBaseUrl}/sessions/{selected.SessionId}/accept",
                    new { technician_id = _technicianId }
                );

                if (response.Success)
                {
                    IncomingQueue.Remove(selected);
                    LaunchDirect3DStreamWindow(response.SessionId, response.SessionToken);
                }
            }
        }

        private void LaunchDirect3DStreamWindow(string sessionId, string sessionToken)
        {
            var streamWindow = new RemoteStreamViewerWindow(sessionId, sessionToken);
            streamWindow.Show();
        }

        private void PlayAttentionChime()
        {
            System.Media.SystemSounds.Exclamation.Play();
        }
    }
}`;

  return (
    <div id="technician-console-container" className="space-y-6">
      {/* Top Header & Presence Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Technician Profile & Role */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-red-500/20 border border-cyan-400/30">
                RR
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                  technicianStatus === 'AVAILABLE'
                    ? 'bg-emerald-400 animate-pulse'
                    : technicianStatus === 'BUSY'
                    ? 'bg-amber-400'
                    : technicianStatus === 'AWAY'
                    ? 'bg-orange-400'
                    : 'bg-slate-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">Ing. Roberto Ramírez</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  Técnico Nivel 2 (ID: tech-001)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span>Especialidad: Soporte Windows & Redes</span>
                <span>•</span>
                <span>Turno activo: <strong className="text-slate-200 font-mono">{formatShiftDuration()}</strong></span>
                <span>•</span>
                <span>Resueltos hoy: <strong className="text-emerald-400 font-mono">{kpis.resolvedTodayCount}</strong></span>
              </p>
            </div>
          </div>

          {/* Right Status Selector & Quick Triggers */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400">Estado:</span>
              <select
                value={technicianStatus}
                onChange={(e) => setTechnicianStatus(e.target.value as TechnicianPresenceStatus)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="AVAILABLE" className="bg-slate-900 text-emerald-400">🟢 Disponible (Recibir Cola)</option>
                <option value="BUSY" className="bg-slate-900 text-amber-400">🟡 En Soporte Remoto</option>
                <option value="AWAY" className="bg-slate-900 text-orange-400">🟠 En Pausa / Descanso</option>
                <option value="OFFLINE" className="bg-slate-900 text-slate-400">🔴 Desconectado</option>
              </select>
            </div>

            {/* Quick Action Button: Simulate Incoming Support Request */}
            <button
              onClick={async () => {
                try {
                  await fetch('/api/v1/notifications/simulate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario: 'REMOTE_SUPPORT_REQUEST' }),
                  });
                  soundService.playSessionRequest();
                  fetchConsoleData();
                } catch (e) {
                  console.error(e);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Simular Solicitud Entrante</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchConsoleData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Queued Requests */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cola de Espera</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">{queue.length}</span>
            <span className="text-xs text-amber-400 font-medium">
              {queue.length > 0 ? 'Peticiones sin asignar' : 'Sin espera'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Tiempo promedio respuesta:</span>
            <span className="font-mono text-white font-semibold">~4.2 min</span>
          </div>
        </div>

        {/* KPI 2: Active Remote Sessions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sesiones en Vivo</span>
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-red-400">{activeSessions.length}</span>
            <span className="text-xs text-red-300 font-medium">Transmitiendo video</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Tasa de cuadros:</span>
            <span className="font-mono text-emerald-400 font-semibold">60 FPS (1080p)</span>
          </div>
        </div>

        {/* KPI 3: Open Tickets & SLA Compliance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tickets Abiertos</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">{kpis.openTicketsCount}</span>
            {kpis.criticalTicketsCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {kpis.criticalTicketsCount} Críticos
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Cumplimiento SLA:</span>
            <span className="font-mono text-emerald-400 font-semibold">{kpis.slaComplianceRate}%</span>
          </div>
        </div>

        {/* KPI 4: Connected Computers */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Flota de Equipos</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-400">{kpis.onlineDevicesCount}</span>
            <span className="text-xs text-slate-400">/ {kpis.totalDevicesCount} Enrolados</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Agentes Windows listos:</span>
            <span className="font-mono text-white font-semibold">100% HWID Auth</span>
          </div>
        </div>
      </div>

      {/* Main Console Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-md shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Cola de Solicitudes</span>
            {queue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse">
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('active-sessions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'active-sessions'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-md shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Sesiones Activas</span>
            {activeSessions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-slate-950 font-bold text-[10px]">
                {activeSessions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-md shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Gestor de Computadoras & Clientes</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
              {devices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('csharp-code')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'csharp-code'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-md shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Código C# (.NET 9 WPF)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COLA DE SOLICITUDES ENTRANTE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Cola de Soporte Remoto en Vivo</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </h3>
              <p className="text-xs text-slate-400">
                Peticiones de usuarios esperando asignación técnica para iniciar control remoto bilateral.
              </p>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Filtro: {queue.length} pendientes
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white">No hay solicitudes pendientes en la cola</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Todas las peticiones han sido atendidas o no hay usuarios esperando asistencia en este momento.
              </p>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/v1/notifications/simulate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scenario: 'REMOTE_SUPPORT_REQUEST' }),
                    });
                    fetchConsoleData();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 text-xs font-semibold border border-red-500/40 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Generar Solicitud de Prueba</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {queue.map((item) => {
                const priority = item.ticket?.priority || TicketPriority.MEDIUM;
                const isCritical = priority === TicketPriority.CRITICAL;
                const isHigh = priority === TicketPriority.HIGH;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                      isCritical
                        ? 'border-rose-500/60 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                        : isHigh
                        ? 'border-amber-500/50 bg-amber-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Left details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${
                            isCritical
                              ? 'bg-rose-500 text-white animate-pulse'
                              : isHigh
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {priority}
                        </span>

                        <span className="text-xs font-mono font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          {item.ticket?.ticket_number || 'TICK-N/A'}
                        </span>

                        <div className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Esperando: {formatElapsedTime(item.created_at)}</span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <h4 className="text-sm font-bold text-white">
                          {item.ticket?.problem_description || 'Solicitud de asistencia técnica remota.'}
                        </h4>
                      </div>

                      {/* Hardware and client metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-sans">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-red-400" />
                          <strong className="text-white">{item.device?.customer?.company_name || 'Cliente Empresa'}</strong>
                        </span>

                        <span className="flex items-center gap-1 text-slate-400">
                          <User className="w-3.5 h-3.5 text-red-400" />
                          <span>Usuario: <strong className="text-slate-200">{item.device?.windows_user}</strong></span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-400">
                          <Laptop className="w-3.5 h-3.5 text-red-400" />
                          <span>Equipo: <strong className="text-slate-200">{item.device?.computer_name}</strong></span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-400 font-mono">
                          <Wifi className="w-3.5 h-3.5 text-red-400" />
                          <span>IP: {item.client_ip}</span>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-800">
                      <button
                        onClick={() => handleAcceptSession(item)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Aceptar Soporte</span>
                      </button>

                      <button
                        onClick={() => handleOpenReject(item)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                      >
                        <span>Rechazar / Reasignar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SESIONES ACTIVAS */}
      {activeTab === 'active-sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Sesiones de Control Remoto en Curso</span>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">
                Sesiones autorizadas con transmisión bidireccional de video y control activas en tiempo real.
              </p>
            </div>
          </div>

          {activeSessions.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Activity className="w-6 h-6 text-red-400" />
              </div>
              <h4 className="text-sm font-bold text-white">No hay sesiones activas en este momento</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Acepta una petición de la cola o inicia una sesión de 1-Click desde el gestor de computadoras.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-900 border border-red-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h4 className="text-sm font-bold text-white">{session.device?.computer_name || 'Equipo Remoto'}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                        {session.quality_setting}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                      ⏱ {formatElapsedTime(session.started_at || session.created_at)}
                    </span>
                  </div>

                  {/* Remote preview box */}
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs space-y-1.5 text-slate-300">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Cliente: <strong className="text-white">{session.device?.customer?.company_name}</strong></span>
                      <span>FPS: <strong className="text-emerald-400">60 FPS</strong></span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Usuario: <strong className="text-white">{session.device?.windows_user}</strong></span>
                      <span>Latencia: <strong className="text-emerald-400">14 ms</strong></span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate pt-1">
                      Token: {session.session_token}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setViewportSession(session);
                        setLiveSessionViewportOpen(true);
                        setSimulatedLogLines([
                          `[${new Date().toLocaleTimeString()}] Conectado a la sesión en vivo #${session.id.slice(-4)}.`,
                          `[${new Date().toLocaleTimeString()}] Resolucion nativa: 1920x1080 @ 60 Hz.`,
                          `[${new Date().toLocaleTimeString()}] Pipeline: Desktop Duplication + WebRTC DataChannel.`,
                        ]);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Abrir Visor Remoto</span>
                    </button>

                    <button
                      onClick={() => handleTerminateSession(session)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Finalizar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GESTOR DE COMPUTADORAS Y CLIENTES */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por equipo, usuario de Windows, IP o empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Estado:</span>
              <button
                onClick={() => setDeviceFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  deviceFilter === 'all'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({devices.length})
              </button>
              <button
                onClick={() => setDeviceFilter('online')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  deviceFilter === 'online'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🟢 Online ({devices.filter((d) => d.is_online).length})
              </button>
              <button
                onClick={() => setDeviceFilter('offline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  deviceFilter === 'offline'
                    ? 'bg-slate-700 text-slate-200 border border-slate-600'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚪ Offline ({devices.filter((d) => !d.is_online).length})
              </button>
            </div>
          </div>

          {/* Devices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDevices.map((device) => (
              <div
                key={device.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between"
              >
                {/* Header info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            device.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                        <h4 className="text-sm font-bold text-white tracking-tight">{device.computer_name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {device.customer?.company_name || 'Sin Empresa Asignada'}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        device.is_online
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {device.is_online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Hardware & OS Specs */}
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs text-slate-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Usuario Windows:</span>
                      <span className="text-white font-semibold">{device.windows_user}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Dirección IP:</span>
                      <span className="text-red-300">{device.ip_address}</span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span className="text-slate-500 font-sans">Sistema:</span>
                      <span className="text-slate-200 truncate ml-2">{device.os_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-sans">Memoria RAM:</span>
                      <span className="text-slate-200">{Math.round(device.ram_mb / 1024)} GB</span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Toolbar */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 1-Click Remote Support Launch */}
                    <button
                      onClick={() => {
                        setSelectedDeviceForLaunch(device);
                        setLaunchReason(`Soporte técnico directo iniciado para ${device.computer_name}`);
                        setDirectLaunchModalOpen(true);
                      }}
                      disabled={!device.is_online}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        device.is_online
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-cyan-600/20 active:scale-95'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Soporte 1-Click</span>
                    </button>

                    {/* Ping Test */}
                    <button
                      onClick={() => handlePingDevice(device)}
                      disabled={pingingDeviceId === device.id}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      <Wifi className={`w-3.5 h-3.5 ${pingingDeviceId === device.id ? 'animate-spin text-red-400' : ''}`} />
                      <span>{pingingDeviceId === device.id ? 'Probando...' : 'Ping Test'}</span>
                    </button>
                  </div>

                  {/* Send Message Banner */}
                  <button
                    onClick={() => {
                      setSelectedDeviceForMessage(device);
                      setMessageText('');
                      setMessageModalOpen(true);
                    }}
                    disabled={!device.is_online}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Enviar Mensaje a Pantalla Remota</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CODIGO FUENTE C# .NET 9 WPF */}
      {activeTab === 'csharp-code' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Code className="w-5 h-5 text-red-400" />
                <span>Consola del Técnico en C# .NET 9 (WPF / Desktop)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Código fuente del cliente de escritorio para técnicos con recepción de cola por SignalR y visor Direct3D.
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(csharpTechnicianCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 3000);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all"
            >
              {copiedCode ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? '¡Copiado!' : 'Copiar Código C#'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-red-300 overflow-x-auto max-h-[500px] leading-relaxed">
            {csharpTechnicianCode}
          </pre>
        </div>
      )}

      {/* MODAL 1: Lanzamiento Directo 1-Click */}
      {directLaunchModalOpen && selectedDeviceForLaunch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lanzar Soporte Remoto 1-Click</h3>
                  <p className="text-xs text-slate-400">Destino: {selectedDeviceForLaunch.computer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setDirectLaunchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDirectLaunchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Motivo de la Conexión Remota
                </label>
                <textarea
                  rows={3}
                  value={launchReason}
                  onChange={(e) => setLaunchReason(e.target.value)}
                  placeholder="Describe la tarea o incidencia técnica..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perfil de Calidad de Transmisión
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Low', 'Balanced', 'High', 'Ultra'] as const).map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() => setLaunchQuality(q)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        launchQuality === q
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {q === 'Low' ? 'Baja' : q === 'Balanced' ? 'Equilibrada' : q === 'High' ? 'Alta' : 'Ultra'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Usuario Windows:</span>
                  <strong className="text-white">{selectedDeviceForLaunch.windows_user}</strong>
                </div>
                <div className="flex justify-between">
                  <span>IP Destino:</span>
                  <span className="text-red-300 font-mono">{selectedDeviceForLaunch.ip_address}</span>
                </div>
                <div className="flex justify-between">
                  <span>Autorización:</span>
                  <span className="text-emerald-400">Solicitud emergente en pantalla</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all"
                >
                  Enviar Petición de Soporte al Agente
                </button>
                <button
                  type="button"
                  onClick={() => setDirectLaunchModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Enviar Mensaje a Pantalla */}
      {messageModalOpen && selectedDeviceForMessage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Enviar Aviso a Pantalla</h3>
                  <p className="text-xs text-slate-400">Equipo: {selectedDeviceForMessage.computer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setMessageModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMessageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Mensaje para el Usuario
                </label>
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe el aviso que aparecerá en el escritorio del usuario..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nivel de Urgencia
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'warning', 'critical'] as const).map((u) => (
                    <button
                      type="button"
                      key={u}
                      onClick={() => setMessageUrgency(u)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        messageUrgency === u
                          ? u === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                            : u === 'warning'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                            : 'bg-red-500/20 text-red-300 border border-red-500/50'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {u === 'normal' ? 'Normal' : u === 'warning' ? 'Advertencia' : 'Crítico'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmitir Notificación</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Rechazar / Reasignar Solicitud */}
      {rejectModalOpen && sessionToReject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Rechazar / Reasignar Solicitud</h3>
                  <p className="text-xs text-slate-400">Sesión #{sessionToReject.id.slice(-4)}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Motivo de la Declinación o Reasignación
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Sobrecarga de tickets críticos, reasignando a soporte de guardia..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSubmitReject}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all"
                >
                  Confirmar Declinación
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Resultado de Ping Test */}
      {pingResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Telemetría de Latencia en Vivo</h3>
                  <p className="text-xs text-slate-400">{pingResult.computer_name}</p>
                </div>
              </div>
              <button
                onClick={() => setPingResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Estado de Enlace:</span>
                <span className="text-emerald-400 font-bold">🟢 CONECTADO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Latencia Ida y Vuelta:</span>
                <span className="text-red-300 font-bold">{pingResult.round_trip_ms} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Pérdida de Paquetes:</span>
                <span className="text-emerald-400">{pingResult.packet_loss_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Carga CPU Estimada:</span>
                <span className="text-slate-200">{pingResult.cpu_usage_est}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Uso de RAM:</span>
                <span className="text-slate-200">{pingResult.ram_usage_mb} MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Versión del Agente:</span>
                <span className="text-slate-200">v{pingResult.agent_version}</span>
              </div>
            </div>

            <button
              onClick={() => setPingResult(null)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
            >
              Cerrar Diagnóstico
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: Live Remote Session Viewport Simulation */}
      {liveSessionViewportOpen && viewportSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-5xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">
            {/* Viewport Top Bar */}
            <div className="bg-slate-950 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Transmisión en Vivo: {viewportSession.device?.computer_name || 'Equipo Remoto'}</span>
                    <span className="text-[10px] font-mono text-red-300 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                      60 FPS • 1080p
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cliente: {viewportSession.device?.customer?.company_name} • Usuario: {viewportSession.device?.windows_user}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const newLine = `[${new Date().toLocaleTimeString()}] Comando de diagnóstico ejecutado: Tasklist /SVC.`;
                    setSimulatedLogLines((prev) => [...prev, newLine]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                  <span>TaskMgr Remoto</span>
                </button>

                <button
                  onClick={() => handleTerminateSession(viewportSession)}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>FINALIZAR SOPORTE</span>
                </button>

                <button
                  onClick={() => setLiveSessionViewportOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Viewport Canvas Body */}
            <div className="flex-1 bg-slate-950 relative flex flex-col items-center justify-center p-6 overflow-hidden">
              {/* Simulated Desktop Screen Container */}
              <div className="relative w-full max-w-4xl h-[420px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                {/* Windows 11 Desktop Taskbar Simulator */}
                <div className="flex-1 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 flex flex-col justify-between p-6">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md max-w-md">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-300 mb-1">
                        <Activity className="w-4 h-4 text-red-400" />
                        <span>RemoteDesk Direct3D Stream Engine v1.3</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Inyección de ratón y teclado activa. Captura con Desktop Duplication API a 16ms por fotograma.
                      </p>
                    </div>

                    <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>STREAMING ACTIVO</span>
                    </div>
                  </div>

                  {/* Windows Taskbar bottom */}
                  <div className="bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800/80 p-2.5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-white font-bold text-[10px]">
                        🪟
                      </div>
                      <span className="text-white font-medium">Windows 11 Pro</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                      <span>Bitrate: 4.8 Mbps</span>
                      <span>Audio: Estéreo 48kHz</span>
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Console log stream */}
              <div className="w-full max-w-4xl mt-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-400 max-h-24 overflow-y-auto space-y-1">
                {simulatedLogLines.map((line, idx) => (
                  <div key={idx} className="text-red-300">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
