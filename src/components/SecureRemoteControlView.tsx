import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Monitor,
  Video,
  Cpu,
  Lock,
  Unlock,
  Key,
  MousePointer,
  Keyboard,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  Maximize2,
  Minimize2,
  Camera,
  MessageSquare,
  FileCode,
  Send,
  Eye,
  EyeOff,
  Zap,
  CornerDownRight,
  SplitSquareVertical,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import {
  RemoteSession,
  RemoteSessionStatus,
  RemoteSessionPermissions,
} from '../types';
import { soundService } from '../services/soundService';
import {
  DESKTOP_DUPLICATION_CODE,
  REMOTE_INPUT_INJECTOR_CODE,
  CLIENT_CONSENT_OVERLAY_CODE,
  SESSION_CRYPTO_MANAGER_CODE,
} from '../data/csharpPhase8Source';

interface SecureRemoteControlViewProps {
  initialSessionId?: string;
  onOpenTickets?: () => void;
}

interface InputLogEntry {
  id: string;
  timestamp: string;
  type: string;
  details: string;
  win32Call: string;
  allowed: boolean;
}

interface RemoteWindow {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'taskmgr' | 'cmd' | 'notepad' | 'regedit' | 'services';
}

export const SecureRemoteControlView: React.FC<SecureRemoteControlViewProps> = ({
  initialSessionId,
  onOpenTickets,
}) => {
  // State
  const [sessions, setSessions] = useState<RemoteSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSessionId || 'sess-001'
  );
  const [activePerspective, setActivePerspective] = useState<
    'technician' | 'client' | 'split' | 'csharp'
  >('technician');
  const [csharpTab, setCsharpTab] = useState<
    'capture' | 'input' | 'consent' | 'crypto'
  >('capture');
  const [copiedCode, setCopiedCode] = useState(false);

  // Streaming & Video Settings
  const [selectedFps, setSelectedFps] = useState<number>(60);
  const [selectedQuality, setSelectedQuality] = useState<
    'Low' | 'Balanced' | 'High' | 'Ultra'
  >('High');
  const [selectedMonitor, setSelectedMonitor] = useState<number>(1);
  const [showDirtyRects, setShowDirtyRects] = useState<boolean>(false);
  const [showHudTelemetry, setShowHudTelemetry] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<'fit' | 'native' | 'fullscreen'>(
    'fit'
  );
  const [activeSidebarTab, setActiveSidebarTab] = useState<
    'chat' | 'input-log' | 'permissions' | 'diagnostics'
  >('chat');

  // Input & Simulation
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 }); // percentage
  const [isClicking, setIsClicking] = useState(false);
  const [clickRipple, setClickRipple] = useState<{ x: number; y: number } | null>(
    null
  );
  const [notepadText, setNotepadText] = useState<string>(
    '# DIAGNOSTICO REMOTO - RemoteDesk Enterprise\n- Verificado servicio SQL Server (Puerto 1433)\n- Regla de Firewall adicionada: Inbound TCP 1433 [PERMITIR]\n- Test de conectividad exitoso con el servidor central.\n'
  );
  const [cmdHistory, setCmdHistory] = useState<
    { command: string; output: string }[]
  >([
    {
      command: 'ipconfig /all',
      output:
        'Configuracion IP de Windows\n\nAdaptador Ethernet Ethernet0:\n   Sufijo DNS especifico: corp.local\n   Direccion IPv4: 192.168.1.105 (Preferido)\n   Mascara de subred: 255.255.255.0\n   Puerta de enlace predeterminada: 192.168.1.1\n   Servidores DNS: 192.168.1.1, 8.8.8.8',
    },
    {
      command: 'netstat -ano | findstr 1433',
      output:
        '  TCP    0.0.0.0:1433           0.0.0.0:0              LISTENING       4288\n  TCP    [::]:1433              [::]:0                 LISTENING       4288',
    },
  ]);
  const [cmdInput, setCmdInput] = useState('');

  // Interactive Remote Windows
  const [remoteWindows, setRemoteWindows] = useState<RemoteWindow[]>([
    {
      id: 'win-taskmgr',
      title: 'Administrador de Tareas (Task Manager)',
      icon: '📊',
      isOpen: true,
      isMinimized: false,
      x: 30,
      y: 20,
      width: 480,
      height: 310,
      type: 'taskmgr',
    },
    {
      id: 'win-cmd',
      title: 'Símbolo del Sistema (CMD Administrador)',
      icon: '💻',
      isOpen: true,
      isMinimized: false,
      x: 380,
      y: 120,
      width: 520,
      height: 320,
      type: 'cmd',
    },
    {
      id: 'win-notepad',
      title: 'Bloc de Notas - Notas de Soporte.txt',
      icon: '📝',
      isOpen: false,
      isMinimized: false,
      x: 180,
      y: 80,
      width: 460,
      height: 280,
      type: 'notepad',
    },
  ]);

  // Input Logs
  const [inputLogs, setInputLogs] = useState<InputLogEntry[]>([
    {
      id: 'log-1',
      timestamp: '07:05:12.102',
      type: 'MOUSE_MOVE',
      details: 'Norm X: 0.452, Norm Y: 0.312 (Abs: 29622, 20447)',
      win32Call: 'SendInput(MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE)',
      allowed: true,
    },
    {
      id: 'log-2',
      timestamp: '07:05:14.340',
      type: 'MOUSE_CLICK_LEFT',
      details: 'Click en botón Administrador de Tareas',
      win32Call: 'SendInput(MOUSEEVENTF_LEFTDOWN -> MOUSEEVENTF_LEFTUP)',
      allowed: true,
    },
    {
      id: 'log-3',
      timestamp: '07:05:18.915',
      type: 'KEY_UNICODE',
      details: 'String: "netstat -ano"',
      win32Call: 'SendInput(KEYEVENTF_UNICODE x13 keys)',
      allowed: true,
    },
  ]);

  // Chat
  const [chatMessages, setChatMessages] = useState<
    { sender: 'tech' | 'client' | 'system'; text: string; time: string }[]
  >([
    {
      sender: 'system',
      text: 'Sesión de soporte remoto establecida con cifrado AES-256-GCM.',
      time: '07:00:00',
    },
    {
      sender: 'tech',
      text: 'Buenos días, estoy revisando el servicio de facturación en su equipo.',
      time: '07:00:15',
    },
    {
      sender: 'client',
      text: 'Hola, de acuerdo. Quedo atento a lo que necesite.',
      time: '07:00:40',
    },
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Client Consent Form State (for testing in client view)
  const [clientEnteredPin, setClientEnteredPin] = useState('');
  const [clientPermissions, setClientPermissions] = useState<RemoteSessionPermissions>({
    view_only: false,
    allow_input: true,
    allow_clipboard: true,
    allow_file_transfer: true,
    block_remote_input_during_uac: true,
  });

  // Modals
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateReason, setTerminateReason] = useState(
    'Incidencia resuelta exitosamente'
  );
  const [clipboardModalOpen, setClipboardModalOpen] = useState(false);
  const [clipboardContent, setClipboardContent] = useState(
    'https://erp.abcsolutions.com:8443/billing'
  );
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Canvas / Screen Ref
  const screenRef = useRef<HTMLDivElement>(null);

  // Live Timer
  const [sessionSeconds, setSessionSeconds] = useState(1200);

  // Fetch Session Data
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/v1/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Error fetching sessions:', e);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Current selected session
  const currentSession =
    sessions.find((s) => s.id === selectedSessionId) ||
    sessions[0] ||
    ({
      id: 'sess-001',
      ticket_id: 't-1001',
      device_id: 'dev-recep-01',
      technician_id: 'tech-001',
      session_token: 'SESSTOKEN-9988-ABC-AUTH-SECURE',
      security_pin: '849201',
      status: RemoteSessionStatus.ACTIVE,
      authorized_by_client: true,
      permissions: {
        view_only: false,
        allow_input: true,
        allow_clipboard: true,
        allow_file_transfer: true,
        block_remote_input_during_uac: true,
      },
      screen_info: {
        monitors_count: 2,
        selected_monitor: 1,
        resolution: '1920x1080',
        color_depth: '24-bit TrueColor',
        scaling_factor_pct: 100,
      },
      crypto_spec: {
        cipher: 'AES-256-GCM',
        protocol: 'WebRTC DTLS 1.3 / SRTP',
        handshake_fingerprint: 'SHA256:7B:3A:99:F1:4E:22:90:DA:55:18:2C:EE:88:41:9B:04',
        key_rotation_interval_seconds: 3600,
      },
      telemetry: {
        current_fps: 59.8,
        bitrate_kbps: 4250,
        rtt_latency_ms: 12,
        packet_loss_pct: 0.0,
        dirty_rects_pct: 18.5,
        bandwidth_saved_pct: 81.5,
        gpu_encoder: 'NVIDIA NVENC H.264 (DirectX 11 DXGI)',
        frames_rendered: 72400,
      },
      duration_seconds: sessionSeconds,
      quality_setting: selectedQuality,
      frame_rate: selectedFps,
      client_ip: '192.168.1.105',
      technician_ip: '200.88.45.12',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      device: {
        id: 'dev-recep-01',
        customer_id: 'cust-abc-01',
        device_uuid: 'WIN-UUID-4B89-ABC1-RECEPCION01',
        computer_name: 'RECEPCION-01',
        windows_user: 'jperez_rec',
        os_version: 'Windows 11 Pro 64-bit (Build 22631)',
        cpu: 'Intel Core i5-12400 (6 Cores, 12 Threads @ 2.50GHz)',
        ram_mb: 16384,
        storage_info: 'SSD NVMe 512GB (320GB Libres)',
        ip_address: '192.168.1.105',
        is_online: true,
        last_heartbeat: new Date().toISOString(),
        agent_version: '1.0.0',
        customer: {
          id: 'cust-abc-01',
          company_name: 'ABC Solutions S.R.L.',
          contact_name: 'Juan Pérez',
          phone: '809-555-0199',
          email: 'juan.perez@abcsolutions.com',
        },
      },
      technician: {
        id: 'tech-001',
        specialty: 'Redes & Infraestructura Windows',
        is_online: true,
        user: {
          id: 'u-tech-1',
          full_name: 'Ing. Roberto Ramírez',
          email: 'roberto.ramirez@remotedesk.com',
        },
      },
    } as RemoteSession);

  // Sync client permissions when session changes
  useEffect(() => {
    if (currentSession?.permissions) {
      setClientPermissions(currentSession.permissions);
    }
  }, [currentSession]);

  // Inject input event to backend
  const injectRemoteInput = async (
    eventType: string,
    params: {
      x?: number;
      y?: number;
      button?: string;
      key?: string;
      delta_y?: number;
      command?: string;
      text?: string;
    }
  ) => {
    soundService.playInputClick();

    const newLog: InputLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 900 + 100),
      type: eventType.toUpperCase(),
      details: params.text
        ? `Texto: "${params.text}"`
        : params.command
        ? `SAS / Hotkey: ${params.command}`
        : params.button
        ? `Botón: ${params.button}`
        : `X: ${((params.x || 0) * 100).toFixed(1)}%, Y: ${((params.y || 0) * 100).toFixed(1)}%`,
      win32Call:
        params.command === 'SAS_CTRL_ALT_DEL'
          ? 'sas.dll!SendSAS(false)'
          : eventType === 'key_press'
          ? `SendInput(KEYEVENTF_UNICODE '${params.key}')`
          : `SendInput(INPUT_MOUSE)`,
      allowed: currentSession.permissions?.allow_input !== false,
    };

    setInputLogs((prev) => [newLog, ...prev.slice(0, 49)]);

    try {
      const res = await fetch(`/api/v1/sessions/${currentSession.id}/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          ...params,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === 'INPUT_PERMISSION_DENIED') {
          soundService.playCriticalAlert();
        }
      }
    } catch (e) {
      console.error('Error sending input event:', e);
    }
  };

  // Authorize Session from Client View
  const handleClientAuthorize = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${currentSession.id}/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: clientPermissions,
          entered_pin: clientEnteredPin || currentSession.security_pin,
        }),
      });

      if (res.ok) {
        soundService.playSessionConnected();
        fetchSessions();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al autorizar sesión');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject Session from Client View
  const handleClientReject = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${currentSession.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rechazado por el usuario cliente' }),
      });
      if (res.ok) {
        soundService.playDeviceOffline();
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Emergency Panic Revocation
  const handleEmergencyRevoke = async () => {
    soundService.playRevokedPanic();
    try {
      const res = await fetch(`/api/v1/sessions/${currentSession.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'El cliente presionó el botón de pánico de emergencia [REVOCAR ACCESO YA]',
        }),
      });
      if (res.ok) {
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Terminate Session by Tech or Client
  const handleTerminateSession = async () => {
    try {
      const res = await fetch(`/api/v1/sessions/${currentSession.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: terminateReason,
          terminated_by: 'Ing. Roberto Ramírez (Técnico)',
        }),
      });
      if (res.ok) {
        soundService.playDeviceOffline();
        setTerminateModalOpen(false);
        fetchSessions();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quality / Stream settings update
  const handleQualityChange = async (quality: 'Low' | 'Balanced' | 'High' | 'Ultra') => {
    setSelectedQuality(quality);
    const targetFps = quality === 'Ultra' ? 120 : quality === 'High' ? 60 : 30;
    setSelectedFps(targetFps);

    try {
      await fetch(`/api/v1/sessions/${currentSession.id}/quality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quality_setting: quality,
          frame_rate: targetFps,
          selected_monitor: selectedMonitor,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Update permissions in real-time
  const handleTogglePermission = async (key: keyof RemoteSessionPermissions) => {
    const updated = {
      ...clientPermissions,
      [key]: !clientPermissions[key],
    };
    setClientPermissions(updated);

    try {
      await fetch(`/api/v1/sessions/${currentSession.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updated }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Screen Mouse Move
  const handleScreenMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenRef.current) return;
    const rect = screenRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
  };

  // Handle Screen Click
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenRef.current) return;
    const rect = screenRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    setClickRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setTimeout(() => setClickRipple(null), 500);

    injectRemoteInput('mouse_click', {
      x: normX,
      y: normY,
      button: e.button === 2 ? 'right' : 'left',
    });
  };

  // Send Chat Message
  const handleSendChat = () => {
    if (!newChatMessage.trim()) return;
    const msg = {
      sender: 'tech' as const,
      text: newChatMessage.trim(),
      time: new Date().toTimeString().split(' ')[0],
    };
    setChatMessages((prev) => [...prev, msg]);
    setNewChatMessage('');
    soundService.playMessagePop();

    // Auto simulated response from client
    setTimeout(() => {
      const clientReplies = [
        'Entendido, veo que está configurando la regla en el firewall.',
        'Perfecto, gracias por la asistencia.',
        '¿Requiere que reinicie la computadora luego del cambio?',
        'Confirmado, la aplicación de facturación ya abre correctamente.',
      ];
      const reply = {
        sender: 'client' as const,
        text: clientReplies[Math.floor(Math.random() * clientReplies.length)],
        time: new Date().toTimeString().split(' ')[0],
      };
      setChatMessages((prev) => [...prev, reply]);
      soundService.playMessagePop();
    }, 2500);
  };

  // CMD Execution
  const handleExecuteCmd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.trim()) return;

    const cmd = cmdInput.trim();
    setCmdInput('');

    let simulatedOutput = `C:\\Windows\\system32> ${cmd}\n`;
    if (cmd.startsWith('ipconfig')) {
      simulatedOutput +=
        'Adaptador Ethernet Ethernet0:\n   Direccion IPv4: 192.168.1.105\n   Mascara de subred: 255.255.255.0\n   Puerta de enlace: 192.168.1.1';
    } else if (cmd.startsWith('ping')) {
      simulatedOutput +=
        'Haciendo ping a 8.8.8.8 con 32 bytes de datos:\nRespuesta desde 8.8.8.8: bytes=32 tiempo=12ms TTL=117\nRespuesta desde 8.8.8.8: bytes=32 tiempo=11ms TTL=117\nRespuesta desde 8.8.8.8: bytes=32 tiempo=12ms TTL=117\nPaquetes: enviados = 3, recibidos = 3, perdidos = 0 (0% perdidos)';
    } else if (cmd.startsWith('tasklist')) {
      simulatedOutput +=
        'Nombre de imagen               PID Nombre de sesion     Num. de ses  Uso de memoria\n========================= ======== ================ =========== ===============\nSystem                           4 Services                   0         1,240 KB\nRemoteDeskAgent.exe           3412 Console                    1        48,220 KB\nexplorer.exe                  4100 Console                    1        98,400 KB\nsqlservr.exe                  4288 Services                   0       480,100 KB';
    } else if (cmd.startsWith('sfc')) {
      simulatedOutput +=
        'Iniciando examen en el sistema. Este proceso tardará algún tiempo.\nProtección de recursos de Windows no encontró ninguna infracción de integridad.';
    } else {
      simulatedOutput += `Comando '${cmd}' procesado correctamente en el agente Windows. Código de salida: 0 (SUCCESS).`;
    }

    setCmdHistory((prev) => [...prev, { command: cmd, output: simulatedOutput }]);
    injectRemoteInput('key_press', { text: cmd });
  };

  // Format Duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    return `${hrs.toString().padStart(2, '0')}:${(mins % 60)
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Copy C# code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    soundService.playMessagePop();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Take Screenshot
  const handleTakeScreenshot = () => {
    soundService.playMessagePop();
    setScreenshotPreview('data:image/svg+xml;utf8,<svg ...>');
    alert(
      '📸 Captura de pantalla de alta resolución (1080p DXGI) guardada en el portapapeles del técnico y adjuntada al ticket.'
    );
  };

  return (
    <div id="secure-remote-control-view" className="space-y-4">
      {/* 1. Header & Quick Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Host Info & Status */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600/20 border border-red-500/40 rounded-xl text-red-400">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-100">
                  {currentSession.device?.computer_name || 'RECEPCION-01'}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {currentSession.device?.windows_user || 'jperez_rec'}
                </span>
                {currentSession.status === RemoteSessionStatus.ACTIVE ? (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-700 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    SESIÓN EN VIVO AUTORIZADA
                  </span>
                ) : currentSession.status === RemoteSessionStatus.REQUESTED ||
                  currentSession.status === RemoteSessionStatus.TECHNICIAN_ASSIGNED ? (
                  <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-950 text-amber-400 border border-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    ESPERANDO CONSENTIMIENTO DEL CLIENTE
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-950 text-rose-400 border border-rose-700">
                    SESIÓN FINALIZADA / REVOCADA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{currentSession.device?.customer?.company_name || 'ABC Solutions'}</span>
                <span>•</span>
                <span>IP: {currentSession.client_ip}</span>
                <span>•</span>
                <span className="text-red-400 font-mono">
                  {currentSession.crypto_spec?.cipher || 'AES-256-GCM'} (DTLS 1.3)
                </span>
              </p>
            </div>
          </div>

          {/* Center: Perspective Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-tech-view"
              onClick={() => setActivePerspective('technician')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePerspective === 'technician'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Visor del Técnico
            </button>
            <button
              id="tab-client-view"
              onClick={() => setActivePerspective('client')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePerspective === 'client'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Pantalla del Cliente (Consentimiento)
            </button>
            <button
              id="tab-split-view"
              onClick={() => setActivePerspective('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePerspective === 'split'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Vista Dividida (Dual)
            </button>
            <button
              id="tab-csharp-code"
              onClick={() => setActivePerspective('csharp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePerspective === 'csharp'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Código C# .NET 9
            </button>
          </div>

          {/* Right: Bilateral Actions */}
          <div className="flex items-center gap-2">
            <div className="text-right mr-2 hidden sm:block">
              <span className="text-xs text-slate-400 block font-mono">Duración</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {formatDuration(sessionSeconds)}
              </span>
            </div>

            {currentSession.status === RemoteSessionStatus.ACTIVE && (
              <button
                id="btn-terminate-support-main"
                onClick={() => setTerminateModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-lg shadow-rose-900/30 transition-all"
              >
                <Power className="w-4 h-4" />
                FINALIZAR SOPORTE
              </button>
            )}

            {currentSession.status !== RemoteSessionStatus.ACTIVE && (
              <button
                id="btn-reconnect-session"
                onClick={handleClientAuthorize}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reconectar Sesión
              </button>
            )}
          </div>
        </div>

        {/* Sessions Quick Switcher Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 overflow-x-auto gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-red-400" />
              Sesiones Disponibles:
            </span>
            {sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => {
                  setSelectedSessionId(sess.id);
                  soundService.playMessagePop();
                }}
                className={`px-2.5 py-1 rounded-md transition-all font-mono text-xs flex items-center gap-1.5 ${
                  sess.id === selectedSessionId
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    sess.status === RemoteSessionStatus.ACTIVE
                      ? 'bg-emerald-400'
                      : sess.status === RemoteSessionStatus.REQUESTED
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                {sess.device?.computer_name || sess.id} ({sess.quality_setting || '60fps'})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">
              PIN Autorización:{' '}
              <strong className="text-amber-400 font-mono">
                {currentSession.security_pin || '849201'}
              </strong>
            </span>
            <span className="text-slate-400">
              Token:{' '}
              <strong className="text-red-400 font-mono">
                {currentSession.session_token?.slice(0, 16)}...
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA BASED ON PERSPECTIVE */}

      {/* PERSPECTIVE A: TECHNICIAN VIEW (Full Interactive Remote Control) */}
      {(activePerspective === 'technician' || activePerspective === 'split') && (
        <div
          className={`grid gap-4 ${
            activePerspective === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 xl:grid-cols-4'
          }`}
        >
          {/* Main Desktop Canvas Area */}
          <div
            className={`space-y-3 ${
              activePerspective === 'split' ? 'lg:col-span-1' : 'xl:col-span-3'
            }`}
          >
            {/* Technician Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Left Win32 SAS and Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  id="btn-sas-cad"
                  title="Enviar Ctrl+Alt+Del mediante SAS (Secure Attention Sequence)"
                  onClick={() =>
                    injectRemoteInput('special_key', { command: 'SAS_CTRL_ALT_DEL' })
                  }
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono font-bold rounded-lg border border-slate-700 flex items-center gap-1 shadow-sm active:scale-95"
                >
                  <Key className="w-3.5 h-3.5" />
                  Ctrl+Alt+Del
                </button>
                <button
                  id="btn-win-r"
                  title="Ejecutar (Win+R)"
                  onClick={() => injectRemoteInput('special_key', { command: 'WIN_R' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono rounded-lg border border-slate-700 active:scale-95"
                >
                  Win+R
                </button>
                <button
                  id="btn-win-x"
                  title="Menú Rápido (Win+X)"
                  onClick={() => injectRemoteInput('special_key', { command: 'WIN_X' })}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono rounded-lg border border-slate-700 active:scale-95"
                >
                  Win+X
                </button>
                <button
                  id="btn-taskmgr"
                  title="Abrir Administrador de Tareas"
                  onClick={() => {
                    setRemoteWindows((prev) =>
                      prev.map((w) => (w.type === 'taskmgr' ? { ...w, isOpen: true } : w))
                    );
                    injectRemoteInput('special_key', { command: 'TASK_MGR' });
                  }}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 active:scale-95"
                >
                  Task Manager
                </button>
                <button
                  id="btn-cmd-open"
                  title="Abrir Símbolo del Sistema (CMD)"
                  onClick={() => {
                    setRemoteWindows((prev) =>
                      prev.map((w) => (w.type === 'cmd' ? { ...w, isOpen: true } : w))
                    );
                  }}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 active:scale-95"
                >
                  CMD
                </button>
                <button
                  id="btn-notepad-open"
                  title="Abrir Bloc de Notas"
                  onClick={() => {
                    setRemoteWindows((prev) =>
                      prev.map((w) => (w.type === 'notepad' ? { ...w, isOpen: true } : w))
                    );
                  }}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 active:scale-95"
                >
                  Notepad
                </button>
              </div>

              {/* Center Stream Profile Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* FPS Selector */}
                <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                  {[30, 60, 120].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => {
                        setSelectedFps(fps);
                        handleQualityChange(selectedQuality);
                      }}
                      className={`px-2 py-1 rounded text-[11px] font-bold font-mono transition-all ${
                        selectedFps === fps
                          ? 'bg-red-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>

                {/* Quality Selector */}
                <select
                  value={selectedQuality}
                  onChange={(e) =>
                    handleQualityChange(
                      e.target.value as 'Low' | 'Balanced' | 'High' | 'Ultra'
                    )
                  }
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-red-500"
                >
                  <option value="Low">Baja (1.5 Mbps - 720p)</option>
                  <option value="Balanced">Equilibrada (4.5 Mbps - 1080p)</option>
                  <option value="High">Alta (8.0 Mbps - 1080p 60fps)</option>
                  <option value="Ultra">Ultra (16.0 Mbps - Lossless 2K)</option>
                </select>

                {/* Monitor Selector */}
                <select
                  value={selectedMonitor}
                  onChange={(e) => setSelectedMonitor(Number(e.target.value))}
                  className="bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-red-500"
                >
                  <option value={1}>Monitor 1 (Principal 1080p)</option>
                  <option value={2}>Monitor 2 (Secundario 1080p)</option>
                  <option value={0}>Todos los Monitores</option>
                </select>
              </div>

              {/* Right Utility Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-clipboard-sync"
                  onClick={() => setClipboardModalOpen(true)}
                  title="Sincronizar Portapapeles"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  id="btn-screenshot-capture"
                  onClick={handleTakeScreenshot}
                  title="Captura de Pantalla PNG"
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDirtyRects(!showDirtyRects)}
                  title="Visualizar Dirty Rectangles (Optimización de Ancho de Banda)"
                  className={`p-1.5 rounded-lg border transition-all ${
                    showDirtyRects
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowHudTelemetry(!showHudTelemetry)}
                  title="Alternar HUD de Telemetría"
                  className={`p-1.5 rounded-lg border transition-all ${
                    showHudTelemetry
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulated Windows 11 Desktop Canvas */}
            <div
              id="remote-screen-canvas"
              ref={screenRef}
              onMouseMove={handleScreenMouseMove}
              onClick={handleScreenClick}
              className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-800 select-none cursor-crosshair group"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at center, #1e293b 0%, #0f172a 60%, #020617 100%)',
              }}
            >
              {/* Wallpaper Windows 11 Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-red-950/30 via-slate-900/20 to-transparent pointer-events-none" />

              {/* Dirty Rectangles Visualizer Overlay */}
              {showDirtyRects && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  <div className="absolute top-10 left-10 w-80 h-64 border-2 border-amber-400/80 bg-amber-500/10 rounded animate-pulse">
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-br">
                      Dirty Rect: WinTaskMgr (18.2% delta)
                    </span>
                  </div>
                  <div className="absolute bottom-16 right-20 w-64 h-40 border-2 border-amber-400/80 bg-amber-500/10 rounded">
                    <span className="text-[10px] bg-amber-500 text-black font-bold px-1.5 py-0.5 rounded-br">
                      Dirty Rect: System Tray
                    </span>
                  </div>
                </div>
              )}

              {/* View Only Mode Banner if Input Forbidden */}
              {currentSession.permissions?.allow_input === false && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-amber-950/90 border border-amber-500 text-amber-200 px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur">
                  <Eye className="w-4 h-4 text-amber-400" />
                  MODO SOLO VER ACTIVO (Inyección SendInput deshabilitada por el cliente)
                </div>
              )}

              {/* Desktop Icons */}
              <div className="absolute top-4 left-4 grid grid-flow-col grid-rows-4 gap-4 text-slate-200 z-10">
                <div
                  onDoubleClick={() =>
                    setRemoteWindows((prev) =>
                      prev.map((w) =>
                        w.type === 'taskmgr' ? { ...w, isOpen: true } : w
                      )
                    )
                  }
                  className="flex flex-col items-center w-16 text-center cursor-pointer p-1.5 rounded hover:bg-white/10"
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow">
                    Task Manager
                  </span>
                </div>
                <div
                  onDoubleClick={() =>
                    setRemoteWindows((prev) =>
                      prev.map((w) => (w.type === 'cmd' ? { ...w, isOpen: true } : w))
                    )
                  }
                  className="flex flex-col items-center w-16 text-center cursor-pointer p-1.5 rounded hover:bg-white/10"
                >
                  <span className="text-2xl">💻</span>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow">
                    CMD Prompt
                  </span>
                </div>
                <div
                  onDoubleClick={() =>
                    setRemoteWindows((prev) =>
                      prev.map((w) =>
                        w.type === 'notepad' ? { ...w, isOpen: true } : w
                      )
                    )
                  }
                  className="flex flex-col items-center w-16 text-center cursor-pointer p-1.5 rounded hover:bg-white/10"
                >
                  <span className="text-2xl">📝</span>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow">
                    Notas.txt
                  </span>
                </div>
                <div className="flex flex-col items-center w-16 text-center cursor-pointer p-1.5 rounded hover:bg-white/10">
                  <span className="text-2xl">🗑️</span>
                  <span className="text-[10px] mt-1 text-white font-medium drop-shadow">
                    Papelera
                  </span>
                </div>
              </div>

              {/* INTERACTIVE FLOATING WINDOW 1: Task Manager */}
              {remoteWindows.find((w) => w.type === 'taskmgr')?.isOpen && (
                <div
                  className="absolute z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
                  style={{
                    top: '15%',
                    left: '10%',
                    width: '52%',
                    maxHeight: '68%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Window Title Bar */}
                  <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 border-b border-slate-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      📊 Administrador de Tareas (RECEPCION-01)
                    </span>
                    <button
                      onClick={() =>
                        setRemoteWindows((prev) =>
                          prev.map((w) =>
                            w.type === 'taskmgr' ? { ...w, isOpen: false } : w
                          )
                        )
                      }
                      className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Task Manager Metrics */}
                  <div className="p-3 text-xs space-y-3 bg-slate-900/95 text-slate-300">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">CPU Utilización</span>
                        <span className="text-base font-bold text-emerald-400">14.8%</span>
                        <span className="text-[10px] text-slate-500 block">2.50 GHz (6 Cores)</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Memoria RAM</span>
                        <span className="text-base font-bold text-red-400">5.8 / 16.0 GB</span>
                        <span className="text-[10px] text-slate-500 block">36% en uso</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Disco C: NVMe</span>
                        <span className="text-base font-bold text-purple-400">1% Actividad</span>
                        <span className="text-[10px] text-slate-500 block">320 GB Libres</span>
                      </div>
                    </div>

                    {/* Process Table */}
                    <div className="border border-slate-800 rounded overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-950 text-slate-400">
                          <tr>
                            <th className="p-1.5">Nombre de Proceso</th>
                            <th className="p-1.5">PID</th>
                            <th className="p-1.5">CPU</th>
                            <th className="p-1.5">Memoria</th>
                            <th className="p-1.5 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-mono">
                          <tr className="hover:bg-slate-800/50">
                            <td className="p-1.5 font-sans font-medium text-emerald-300">
                              🟢 RemoteDeskAgent.exe
                            </td>
                            <td className="p-1.5 text-slate-400">3412</td>
                            <td className="p-1.5 text-emerald-400">1.2%</td>
                            <td className="p-1.5 text-slate-300">48.2 MB</td>
                            <td className="p-1.5 text-right text-[10px] text-slate-500">
                              System Service
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-800/50">
                            <td className="p-1.5 font-sans font-medium text-red-300">
                              🔵 sqlservr.exe (SQL Server)
                            </td>
                            <td className="p-1.5 text-slate-400">4288</td>
                            <td className="p-1.5 text-red-400">0.8%</td>
                            <td className="p-1.5 text-slate-300">480.1 MB</td>
                            <td className="p-1.5 text-right">
                              <button
                                onClick={() =>
                                  injectRemoteInput('special_key', {
                                    command: 'RESTART_SQL_SERVICE',
                                  })
                                }
                                className="text-red-400 hover:underline text-[10px]"
                              >
                                Reiniciar
                              </button>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-800/50">
                            <td className="p-1.5 font-sans font-medium text-slate-300">
                              explorer.exe (Windows Shell)
                            </td>
                            <td className="p-1.5 text-slate-400">4100</td>
                            <td className="p-1.5 text-slate-400">0.4%</td>
                            <td className="p-1.5 text-slate-300">98.4 MB</td>
                            <td className="p-1.5 text-right text-[10px] text-slate-500">
                              Usuario
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE FLOATING WINDOW 2: CMD Prompt */}
              {remoteWindows.find((w) => w.type === 'cmd')?.isOpen && (
                <div
                  className="absolute z-20 bg-black/95 border border-slate-700 rounded-lg shadow-2xl overflow-hidden font-mono"
                  style={{
                    top: '25%',
                    left: '38%',
                    width: '58%',
                    maxHeight: '68%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 border-b border-slate-700">
                    <span className="font-sans font-semibold flex items-center gap-1.5">
                      💻 Símbolo del sistema (Administrador)
                    </span>
                    <button
                      onClick={() =>
                        setRemoteWindows((prev) =>
                          prev.map((w) =>
                            w.type === 'cmd' ? { ...w, isOpen: false } : w
                          )
                        )
                      }
                      className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3 text-[11px] text-slate-200 space-y-2 max-h-56 overflow-y-auto">
                    <div className="text-slate-400">
                      Microsoft Windows [Versión 10.0.22631.3296]
                      <br />
                      (c) Microsoft Corporation. Todos los derechos reservados.
                    </div>
                    {cmdHistory.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-emerald-400 font-bold">
                          C:\Windows\system32&gt; {item.command}
                        </div>
                        <div className="text-slate-300 whitespace-pre-wrap pl-2 border-l border-slate-700">
                          {item.output}
                        </div>
                      </div>
                    ))}
                    <form onSubmit={handleExecuteCmd} className="flex items-center gap-1 mt-2">
                      <span className="text-emerald-400 font-bold">
                        C:\Windows\system32&gt;
                      </span>
                      <input
                        type="text"
                        value={cmdInput}
                        onChange={(e) => setCmdInput(e.target.value)}
                        placeholder="Escribe ipconfig, ping 8.8.8.8, tasklist..."
                        className="flex-1 bg-transparent text-white focus:outline-none border-b border-slate-700 focus:border-emerald-400 font-mono text-xs"
                      />
                    </form>
                  </div>
                </div>
              )}

              {/* INTERACTIVE FLOATING WINDOW 3: Notepad */}
              {remoteWindows.find((w) => w.type === 'notepad')?.isOpen && (
                <div
                  className="absolute z-20 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden font-sans"
                  style={{
                    top: '20%',
                    left: '20%',
                    width: '45%',
                    maxHeight: '60%',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-200 border-b border-slate-700">
                    <span className="font-semibold flex items-center gap-1.5">
                      📝 Bloc de Notas (Notas_Soporte.txt)
                    </span>
                    <button
                      onClick={() =>
                        setRemoteWindows((prev) =>
                          prev.map((w) =>
                            w.type === 'notepad' ? { ...w, isOpen: false } : w
                          )
                        )
                      }
                      className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-2 bg-slate-950 text-xs">
                    <textarea
                      value={notepadText}
                      onChange={(e) => {
                        setNotepadText(e.target.value);
                        injectRemoteInput('key_press', { text: e.target.value.slice(-1) });
                      }}
                      className="w-full h-40 bg-transparent text-slate-200 font-mono text-xs p-2 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Click Ripple Effect */}
              {clickRipple && (
                <div
                  className="absolute w-8 h-8 rounded-full border-2 border-blue-400 bg-red-500/20 -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-ping z-40"
                  style={{ left: clickRipple.x, top: clickRipple.y }}
                />
              )}

              {/* Mouse Pointer Cursor Sychronized */}
              <div
                className="absolute pointer-events-none z-50 -translate-x-1 -translate-y-1 transition-all duration-75"
                style={{ left: `${mousePos.x}%`, top: `${mousePos.y}%` }}
              >
                <div className="relative">
                  <MousePointer className="w-5 h-5 text-red-400 fill-blue-500 drop-shadow-md" />
                  <span className="absolute -top-4 -right-12 text-[9px] bg-slate-900/90 text-red-300 px-1 py-0.5 rounded font-mono border border-blue-700">
                    {Math.round(mousePos.x)}%, {Math.round(mousePos.y)}%
                  </span>
                </div>
              </div>

              {/* Windows 11 Bottom Taskbar */}
              <div className="absolute bottom-0 inset-x-0 h-10 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between px-3 z-30 backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center text-white text-xs font-bold shadow">
                    🪟
                  </div>
                  <div className="flex items-center gap-1 pl-2">
                    <button
                      onClick={() =>
                        setRemoteWindows((prev) =>
                          prev.map((w) =>
                            w.type === 'taskmgr' ? { ...w, isOpen: !w.isOpen } : w
                          )
                        )
                      }
                      className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded text-xs"
                    >
                      📊 Task Manager
                    </button>
                    <button
                      onClick={() =>
                        setRemoteWindows((prev) =>
                          prev.map((w) =>
                            w.type === 'cmd' ? { ...w, isOpen: !w.isOpen } : w
                          )
                        )
                      }
                      className="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded text-xs"
                    >
                      💻 CMD
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>ESP</span>
                  <span>📶 100%</span>
                  <span>🔊 80%</span>
                  <span className="text-white font-bold">
                    {new Date().toTimeString().slice(0, 5)}
                  </span>
                </div>
              </div>

              {/* HUD Telemetry Overlay */}
              {showHudTelemetry && (
                <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 text-[11px] font-mono text-slate-300 space-y-1.5 shadow-2xl backdrop-blur z-30 pointer-events-none w-56">
                  <div className="flex items-center justify-between font-bold text-slate-100 border-b border-slate-800 pb-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Zap className="w-3.5 h-3.5" />
                      DXGI Telemetría
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {selectedFps} FPS
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latencia RTT:</span>
                    <span className="text-red-400 font-bold">
                      {currentSession.telemetry?.rtt_latency_ms || 12} ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bitrate de Video:</span>
                    <span className="text-purple-400 font-bold">
                      {(
                        (currentSession.telemetry?.bitrate_kbps || 4250) / 1000
                      ).toFixed(1)}{' '}
                      Mbps
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ahorro Dirty Rect:</span>
                    <span className="text-emerald-400 font-bold">
                      {currentSession.telemetry?.bandwidth_saved_pct || 81.5}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Encoder GPU:</span>
                    <span className="text-slate-200 text-[10px]">
                      NVENC H.264
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Seguridad:</span>
                    <span className="text-amber-400 text-[10px]">
                      AES-256-GCM
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Chat, Input Log, and Permissions */}
          {activePerspective !== 'split' && (
            <div className="space-y-3">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl">
                {/* Sidebar Navigation */}
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 mb-3 text-xs">
                  <button
                    onClick={() => setActiveSidebarTab('chat')}
                    className={`flex-1 py-1.5 rounded font-semibold text-center transition-all ${
                      activeSidebarTab === 'chat'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('input-log')}
                    className={`flex-1 py-1.5 rounded font-semibold text-center transition-all ${
                      activeSidebarTab === 'input-log'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Log Entrada
                  </button>
                  <button
                    onClick={() => setActiveSidebarTab('permissions')}
                    className={`flex-1 py-1.5 rounded font-semibold text-center transition-all ${
                      activeSidebarTab === 'permissions'
                        ? 'bg-red-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Permisos
                  </button>
                </div>

                {/* Sub-view A: Real-time Technician-Client Chat */}
                {activeSidebarTab === 'chat' && (
                  <div className="space-y-3">
                    <div className="h-72 overflow-y-auto space-y-2 p-2 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${
                            msg.sender === 'tech'
                              ? 'items-end'
                              : msg.sender === 'client'
                              ? 'items-start'
                              : 'items-center'
                          }`}
                        >
                          {msg.sender === 'system' ? (
                            <div className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full text-center my-1">
                              🛡️ {msg.text}
                            </div>
                          ) : (
                            <div
                              className={`max-w-[85%] rounded-lg p-2 ${
                                msg.sender === 'tech'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-800 text-slate-200 border border-slate-700'
                              }`}
                            >
                              <div className="text-[10px] opacity-75 font-semibold mb-0.5">
                                {msg.sender === 'tech' ? 'Técnico' : 'Cliente'} •{' '}
                                {msg.time}
                              </div>
                              <p>{msg.text}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="Mensaje al cliente..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        onClick={handleSendChat}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-view B: SendInput Live Injection Logs */}
                {activeSidebarTab === 'input-log' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Eventos Win32 Inyectados</span>
                      <span className="font-mono text-emerald-400">
                        {inputLogs.length} total
                      </span>
                    </div>
                    <div className="h-80 overflow-y-auto space-y-1.5 font-mono text-[11px] p-2 bg-slate-950 rounded-lg border border-slate-800">
                      {inputLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-1.5 rounded bg-slate-900/90 border border-slate-800 hover:border-red-500/50"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-red-400">
                              {log.type}
                            </span>
                            <span className="text-slate-500">{log.timestamp}</span>
                          </div>
                          <div className="text-slate-300 text-[10px] mt-0.5">
                            {log.details}
                          </div>
                          <div className="text-emerald-500 text-[9px] truncate">
                            {log.win32Call}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-view C: Granular Session Permissions */}
                {activeSidebarTab === 'permissions' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
                      <h3 className="font-bold text-slate-200">
                        Control de Permisos de Sesión
                      </h3>

                      <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-slate-900">
                        <span className="text-slate-300">
                          Inyección Teclado & Ratón
                        </span>
                        <input
                          type="checkbox"
                          checked={clientPermissions.allow_input}
                          onChange={() => handleTogglePermission('allow_input')}
                          className="rounded border-slate-700 text-blue-600 focus:ring-red-500"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-slate-900">
                        <span className="text-slate-300">Portapapeles Compartido</span>
                        <input
                          type="checkbox"
                          checked={clientPermissions.allow_clipboard}
                          onChange={() =>
                            handleTogglePermission('allow_clipboard')
                          }
                          className="rounded border-slate-700 text-blue-600 focus:ring-red-500"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-slate-900">
                        <span className="text-slate-300">
                          Transferencia de Archivos
                        </span>
                        <input
                          type="checkbox"
                          checked={clientPermissions.allow_file_transfer}
                          onChange={() =>
                            handleTogglePermission('allow_file_transfer')
                          }
                          className="rounded border-slate-700 text-blue-600 focus:ring-red-500"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-slate-900">
                        <span className="text-slate-300">
                          Pausar en Elevación UAC
                        </span>
                        <input
                          type="checkbox"
                          checked={
                            clientPermissions.block_remote_input_during_uac
                          }
                          onChange={() =>
                            handleTogglePermission('block_remote_input_during_uac')
                          }
                          className="rounded border-slate-700 text-blue-600 focus:ring-red-500"
                        />
                      </label>
                    </div>

                    <button
                      onClick={handleEmergencyRevoke}
                      className="w-full py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500 font-bold rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Simular Revocación de Pánico
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PERSPECTIVE B: CLIENT SCREEN (Consent Dialog & Floating Perimeter Bar) */}
      {(activePerspective === 'client' || activePerspective === 'split') && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-600/20 text-amber-400 rounded-lg">
                  <Shield className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-100">
                    Endpoint del Cliente Windows (RECEPCION-01)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Vista simulada de la pantalla del usuario final con diálogos de
                    autorización y marco perimetral de seguridad.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleEmergencyRevoke}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-rose-900/30"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  🚨 REVOCAR ACCESO YA (Ctrl+Alt+F12)
                </button>
              </div>
            </div>

            {/* Simulated Client Monitor Container */}
            <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-2xl border-4 border-emerald-500/80 p-6 flex flex-col justify-between">
              {/* Active Glow Perimeter Frame Indicator */}
              <div className="absolute inset-0 border-4 border-emerald-400/90 pointer-events-none animate-pulse z-20" />

              {/* Floating Top Security Bar on Client Desktop */}
              <div className="relative z-30 bg-slate-900/95 border border-emerald-500/60 rounded-xl p-3 shadow-2xl text-white flex items-center justify-between backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <span className="text-xs font-bold text-emerald-300">
                      Soporte Remoto Activo: {currentSession.technician?.user?.full_name || 'Ing. Roberto Ramírez'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Su pantalla está siendo compartida. Duración:{' '}
                      <strong className="text-white font-mono">
                        {formatDuration(sessionSeconds)}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs text-slate-400 hidden sm:block">
                    Permisos:{' '}
                    <span className="text-emerald-400 font-bold">
                      {clientPermissions.allow_input ? 'Control Total' : 'Solo Ver'}
                    </span>
                  </div>
                  <button
                    id="btn-client-panic-revoke"
                    onClick={handleEmergencyRevoke}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-xs shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <Power className="w-4 h-4" />
                    REVOCAR CONTROL AHORA
                  </button>
                </div>
              </div>

              {/* Client Center TopMost Consent Modal Dialog */}
              <div className="relative z-30 max-w-md mx-auto my-auto bg-slate-900 border-2 border-red-500 rounded-2xl p-5 shadow-2xl text-white">
                <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
                  <div className="p-2.5 bg-red-600/20 border border-red-500 rounded-xl text-red-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-100">
                      Solicitud de Acceso Remoto
                    </h3>
                    <p className="text-xs text-slate-400">
                      RemoteDesk Enterprise Agent v1.0.0
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-300 mb-4">
                  <p className="text-slate-200">
                    El técnico{' '}
                    <strong className="text-red-400">
                      {currentSession.technician?.user?.full_name || 'Ing. Roberto Ramírez'}
                    </strong>{' '}
                    solicita autorización para conectarse a este equipo para atender el
                    ticket #{currentSession.ticket_id || 'TICK-000125'}.
                  </p>

                  {/* PIN Verification Box */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      CÓDIGO PIN DE AUTORIZACIÓN ÚNICO
                    </span>
                    <span className="text-2xl font-black font-mono tracking-widest text-amber-400">
                      {currentSession.security_pin || '849201'}
                    </span>
                  </div>

                  {/* Granular Permission Toggles */}
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                      Permisos Otorgados:
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientPermissions.allow_input}
                        onChange={() => handleTogglePermission('allow_input')}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>Permitir control de Teclado y Ratón</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientPermissions.allow_clipboard}
                        onChange={() => handleTogglePermission('allow_clipboard')}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>Permitir sincronización de Portapapeles</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientPermissions.allow_file_transfer}
                        onChange={() => handleTogglePermission('allow_file_transfer')}
                        className="rounded border-slate-700 text-blue-600"
                      />
                      <span>Permitir transferencia de archivos</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-client-permit-access"
                    onClick={handleClientAuthorize}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    PERMITIR ACCESO
                  </button>
                  <button
                    id="btn-client-deny-access"
                    onClick={handleClientReject}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    RECHAZAR
                  </button>
                </div>
              </div>

              {/* Bottom Windows Client Taskbar */}
              <div className="relative z-30 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="text-slate-300 font-sans">
                  Windows 11 Pro 64-bit | RECEPCION-01
                </span>
                <span>Atajo de Emergencia: Ctrl + Alt + F12</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE C: C# .NET 9 SOURCE CODE TABS */}
      {activePerspective === 'csharp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-100">
                  Código Fuente C# .NET 9 de Producción (Agente Windows)
                </h2>
                <p className="text-xs text-slate-400">
                  DirectX 11 Desktop Duplication API, Inyección Win32 SendInput y Criptografía AES-256-GCM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopyCode(
                    csharpTab === 'capture'
                      ? DESKTOP_DUPLICATION_CODE
                      : csharpTab === 'input'
                      ? REMOTE_INPUT_INJECTOR_CODE
                      : csharpTab === 'consent'
                      ? CLIENT_CONSENT_OVERLAY_CODE
                      : SESSION_CRYPTO_MANAGER_CODE
                  )
                }
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedCode ? '¡Copiado!' : 'Copiar Archivo C#'}
              </button>
            </div>
          </div>

          {/* Sub-tabs for C# Files */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setCsharpTab('capture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                csharpTab === 'capture'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              DesktopDuplicationCaptureEngine.cs
            </button>
            <button
              onClick={() => setCsharpTab('input')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                csharpTab === 'input'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              RemoteInputInjector.cs
            </button>
            <button
              onClick={() => setCsharpTab('consent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                csharpTab === 'consent'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ClientConsentSecurityOverlay.xaml.cs
            </button>
            <button
              onClick={() => setCsharpTab('crypto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                csharpTab === 'crypto'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              SessionCryptoManager.cs
            </button>
          </div>

          {/* Code Viewer Container */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-[560px] overflow-y-auto whitespace-pre">
            {csharpTab === 'capture' && DESKTOP_DUPLICATION_CODE}
            {csharpTab === 'input' && REMOTE_INPUT_INJECTOR_CODE}
            {csharpTab === 'consent' && CLIENT_CONSENT_OVERLAY_CODE}
            {csharpTab === 'crypto' && SESSION_CRYPTO_MANAGER_CODE}
          </div>
        </div>
      )}

      {/* 3. TERMINATE SUPPORT MODAL */}
      {terminateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-xl border border-rose-500/40">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">
                  Finalizar Sesión de Soporte
                </h3>
                <p className="text-xs text-slate-400">
                  Cierre bilateral de streaming y liberación de recursos
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                ¿Desea concluir la sesión remota con el equipo{' '}
                <strong className="text-red-400">
                  {currentSession.device?.computer_name || 'RECEPCION-01'}
                </strong>
                ? El ticket asociado será marcado como Resuelto y se registrará la
                auditoría completa.
              </p>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Notas de Cierre / Resolución:
                </label>
                <textarea
                  value={terminateReason}
                  onChange={(e) => setTerminateReason(e.target.value)}
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleTerminateSession}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-900/40"
              >
                FINALIZAR SOPORTE
              </button>
              <button
                onClick={() => setTerminateModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CLIPBOARD SYNC MODAL */}
      {clipboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-red-600/20 text-red-400 rounded-xl border border-red-500/40">
                <Copy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">
                  Portapapeles Remoto Sincronizado
                </h3>
                <p className="text-xs text-slate-400">
                  Transferencia segura de texto con el portapapeles de Windows
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <textarea
                value={clipboardContent}
                onChange={(e) => setClipboardContent(e.target.value)}
                placeholder="Escribe o pega texto para enviar a la máquina remota..."
                className="w-full h-28 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  injectRemoteInput('clipboard_sync', { text: clipboardContent });
                  soundService.playMessagePop();
                  setClipboardModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg"
              >
                Enviar al Portapapeles Remoto
              </button>
              <button
                onClick={() => setClipboardModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
