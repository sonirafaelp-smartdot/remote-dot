import React, { useState, useEffect, useRef } from 'react';
import { 
  Laptop, 
  Send, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Volume2, 
  VolumeX, 
  User, 
  Phone, 
  Mail, 
  AlertCircle, 
  Clock, 
  Building2, 
  Wifi, 
  Power, 
  Settings2, 
  Monitor, 
  Eye, 
  RefreshCw, 
  Activity, 
  Sliders, 
  Code, 
  Check, 
  Copy, 
  Radio, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { TicketPriority, RemoteSessionStatus } from '../../backend/database/entities.ts';

// Web Audio API Chimes for notification sounds
const playChimeSound = (type: 'incoming' | 'ended' | 'success') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'incoming') {
      // Dual tone notification chime (A5 then C#6)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1108.73, now + 0.15); // C#6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(554.37, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } else if (type === 'ended') {
      // Descending tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3); // A4

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Pleasant ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.warn('AudioContext not supported or allowed without interaction', e);
  }
};

export const WindowsAgentView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'agent-app' | 'dual-simulation' | 'csharp-code'>('agent-app');

  // Agent Customizable Branding Settings
  const [brandName, setBrandName] = useState<string>('Remote DOT Desk Enterprise');
  const [supportPhone, setSupportPhone] = useState<string>('+1 (809) 555-0199');
  const [supportEmail, setSupportEmail] = useState<string>('soporte@remotedesk.com');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Selected Machine Context
  const [devicesList, setDevicesList] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [currentDevice, setCurrentDevice] = useState<any>(null);

  // Agent State Machine: 'connected' | 'waiting' | 'request_received' | 'in_session' | 'session_ended'
  const [agentState, setAgentState] = useState<'connected' | 'waiting' | 'request_received' | 'in_session' | 'session_ended'>('connected');
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  // Support Request Form Inputs
  const [contactName, setContactName] = useState<string>('Marcos Castillo');
  const [contactInfo, setContactInfo] = useState<string>('809-555-4422 (mcastillo@empresa.com)');
  const [problemDescription, setProblemDescription] = useState<string>('La impresora de facturación no responde y sale error de spooler de Windows.');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(TicketPriority.HIGH);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live Session Tracking
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [showTrayMenu, setShowTrayMenu] = useState<boolean>(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState<boolean>(false);

  // Technicians List for Dual Simulator
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string>('');

  // Code Copy Notification
  const [copiedCodeSnippet, setCopiedCodeSnippet] = useState<string | null>(null);

  // Fetch registered devices and technicians
  const loadData = async () => {
    try {
      const [devRes, techRes] = await Promise.all([
        fetch('/api/v1/devices'),
        fetch('/api/v1/health')
      ]);

      if (devRes.ok) {
        const devs = await devRes.json();
        setDevicesList(devs);
        if (devs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devs[0].id);
          setCurrentDevice(devs[0]);
          setContactName(devs[0].windows_user || 'Marcos Castillo');
        }
      }

      // Sample technicians
      setTechnicians([
        { id: 'tech-001', full_name: 'Ing. Carlos Mendoza', specialty: 'Windows Core & Servidores L2', is_online: true },
        { id: 'tech-002', full_name: 'Lic. Laura Peña', specialty: 'Redes, Firewalls y VPNs', is_online: true },
        { id: 'tech-003', full_name: 'David Rodríguez', specialty: 'Help Desk Nivel 1', is_online: true }
      ]);
      setSelectedTechId('tech-001');
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected device object when dropdown changes
  useEffect(() => {
    if (selectedDeviceId && devicesList.length > 0) {
      const dev = devicesList.find(d => d.id === selectedDeviceId);
      if (dev) {
        setCurrentDevice(dev);
        setContactName(dev.windows_user || 'Usuario Windows');
      }
    }
  }, [selectedDeviceId, devicesList]);

  // Session duration timer loop
  useEffect(() => {
    let interval: any = null;
    if (agentState === 'in_session') {
      interval = setInterval(() => {
        setSessionSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setSessionSeconds(0);
    }
    return () => clearInterval(interval);
  }, [agentState]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // 1. Submit Support Request ("SOLICITAR SOPORTE")
  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        device_id: currentDevice?.id || 'dev-abc-01',
        contact_name: contactName,
        contact_info: contactInfo,
        problem_description: problemDescription,
        priority: selectedPriority,
      };

      const res = await fetch('/api/v1/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const ticket = await res.json();
        setActiveTicket(ticket);
        setAgentState('waiting');
        if (soundEnabled) playChimeSound('success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Technician Accepts Ticket -> Triggers Incoming Connection Request to Client
  const handleTechnicianAcceptsTicket = async () => {
    if (!activeTicket) return;

    try {
      const res = await fetch(`/api/v1/tickets/${activeTicket.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: selectedTechId }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.session);
        setAgentState('request_received');
        if (soundEnabled) playChimeSound('incoming');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 3. User Explicitly Permits Remote Access
  const handleAuthorizeAccess = async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`/api/v1/sessions/${activeSession.id}/authorize`, {
        method: 'POST',
      });

      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
        setAgentState('in_session');
        if (soundEnabled) playChimeSound('success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. User Rejects Remote Access
  const handleRejectAccess = async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`/api/v1/sessions/${activeSession.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rechazado por el usuario cliente desde el diálogo de confirmación' }),
      });

      if (res.ok) {
        setAgentState('connected');
        setActiveTicket(null);
        setActiveSession(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 5. Terminate Session ("FINALIZAR SOPORTE")
  const handleTerminateSession = async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`/api/v1/sessions/${activeSession.id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminated_by: 'Cliente', reason: 'Sesión finalizada por el usuario cliente' }),
      });

      if (res.ok) {
        const ended = await res.json();
        setActiveSession(ended);
        setAgentState('session_ended');
        if (soundEnabled) playChimeSound('ended');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reset to initial state for new ticket
  const handleResetForNewTicket = () => {
    setAgentState('connected');
    setActiveTicket(null);
    setActiveSession(null);
    setProblemDescription('La impresora de facturación no responde y sale error de spooler de Windows.');
  };

  const copySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeSnippet(id);
    setTimeout(() => setCopiedCodeSnippet(null), 2000);
  };

  const assignedTechName = activeSession?.technician?.user?.full_name || 
    technicians.find(t => t.id === selectedTechId)?.full_name || 'Ing. Carlos Mendoza';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                FASE 4: AGENTE WINDOWS
              </span>
              <span className="text-xs text-slate-400">Aplicación del Cliente • WPF .NET 9 • Consentimiento Obligatorio</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">
              Agente Windows y Solicitud de Soporte
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Interfaz cliente moderna con botón "SOLICITAR SOPORTE", máquina de estados en tiempo real, alertas sonoras, ventana de autorización obligatoria y banner flotante superior durante sesiones activas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-sky-400'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {soundEnabled ? 'Alertas Sonoras ON' : 'Alertas Mute'}
            </button>

            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Personalizar Marca
            </button>
          </div>
        </div>

        {/* Drawer for Custom Branding */}
        {showSettingsDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Nombre del Sistema (White-Label):</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Teléfono de Soporte:</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Email de Soporte:</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sub-Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab('agent-app')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'agent-app'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Simulador del Agente Windows</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dual-simulation')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'dual-simulation'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Flujo Completo Cliente ↔ Técnico</span>
        </button>

        <button
          onClick={() => setActiveSubTab('csharp-code')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'csharp-code'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4 text-emerald-400" />
          <span>Código C# (.NET 9 / WPF / Service)</span>
        </button>
      </div>

      {/* SUBTAB 1: WINDOWS AGENT UI SIMULATOR */}
      {activeSubTab === 'agent-app' && (
        <div className="space-y-6">
          {/* Top Floating Banner (Active when in_session) */}
          {agentState === 'in_session' && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce duration-1000 shadow-2xl">
              <div className="bg-slate-900 border-2 border-rose-500 text-white rounded-full px-5 py-2.5 flex items-center gap-4 shadow-rose-950/40 backdrop-blur-lg">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-rose-400">
                    SOPORTE REMOTO EN CURSO
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-700" />

                <div className="text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-semibold text-slate-200">{assignedTechName}</span>
                </div>

                <div className="h-4 w-px bg-slate-700" />

                <div className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(sessionSeconds)}</span>
                </div>

                <button
                  onClick={handleTerminateSession}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Power className="w-3 h-3" />
                  Finalizar Soporte
                </button>
              </div>
            </div>
          )}

          {/* Windows Desktop Frame Simulator */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Background Desktop Wallpaper gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 opacity-80" />

            {/* Simulated Windows 11 Desktop Workspace */}
            <div className="relative z-10 max-w-2xl mx-auto">
              {/* Select device selector bar */}
              <div className="mb-4 bg-slate-900/90 border border-slate-800/80 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <span>Simulando Computadora del Cliente:</span>
                </div>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-sky-300 font-mono text-xs rounded px-2.5 py-1 focus:outline-none focus:border-sky-500"
                >
                  {devicesList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.computer_name} ({d.windows_user}) - {d.customer?.company_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* WPF Native Window Frame */}
              {!isWindowMinimized ? (
                <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-300">
                  {/* Windows Title Bar */}
                  <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded bg-sky-500 flex items-center justify-center text-white text-[10px] font-bold">
                        RD
                      </div>
                      <span className="font-semibold text-xs text-slate-200 tracking-wide">
                        Remote DOT Desk Enterprise - Agente de Soporte
                      </span>
                    </div>

                    {/* Windows Control Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsWindowMinimized(true)}
                        className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-400 transition-colors"
                        title="Minimizar a la bandeja del sistema (System Tray)"
                      />
                      <button
                        onClick={() => setIsWindowMinimized(true)}
                        className="w-3 h-3 rounded-full bg-slate-700 hover:bg-slate-600"
                        title="Maximizar"
                      />
                      <button
                        onClick={() => setIsWindowMinimized(true)}
                        className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-400 transition-colors"
                        title="Cerrar y enviar a segundo plano"
                      />
                    </div>
                  </div>

                  {/* Window Subheader with Agent Status */}
                  <div className="bg-slate-950/40 px-6 py-3 border-b border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        agentState === 'connected' ? 'bg-emerald-400 animate-pulse' :
                        agentState === 'waiting' ? 'bg-amber-400 animate-ping' :
                        agentState === 'request_received' ? 'bg-sky-400 animate-ping' :
                        agentState === 'in_session' ? 'bg-rose-400 animate-pulse' :
                        'bg-slate-500'
                      }`} />
                      <span className="text-xs font-mono font-semibold text-slate-300">
                        {agentState === 'connected' && 'CONECTADO AL SERVIDOR • LISTO'}
                        {agentState === 'waiting' && 'ESPERANDO TÉCNICO DISPONIBLE...'}
                        {agentState === 'request_received' && 'SOLICITUD DE CONEXIÓN RECIBIDA'}
                        {agentState === 'in_session' && 'TÉCNICO CONECTADO • SOPORTE ACTIVO'}
                        {agentState === 'session_ended' && 'SESIÓN FINALIZADA'}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      ID: <span className="text-sky-400">{currentDevice?.computer_name || 'RECEPCION-01'}</span>
                    </div>
                  </div>

                  {/* Main Window Body Content */}
                  <div className="p-6 space-y-5">
                    {/* STATE 1: CONNECTED (FORM READY) */}
                    {agentState === 'connected' && (
                      <form onSubmit={handleSubmitSupport} className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-slate-200">
                              Nombre del Contacto / Usuario:
                            </label>
                            <span className="text-[10px] text-slate-500 font-mono">Windows: {currentDevice?.windows_user}</span>
                          </div>
                          <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              required
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-200 block mb-1">
                            Teléfono o Correo de Contacto:
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              required
                              value={contactInfo}
                              onChange={(e) => setContactInfo(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-200 block mb-1">
                            Breve Descripción del Problema (*):
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            placeholder="Describa el inconveniente que presenta su equipo..."
                            className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-lg text-xs focus:outline-none focus:border-sky-500 resize-none"
                          />
                        </div>

                        {/* Priority Badges Selector */}
                        <div>
                          <label className="text-xs font-bold text-slate-200 block mb-1.5">
                            Nivel de Urgencia:
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { p: TicketPriority.LOW, label: 'Baja', color: 'border-slate-700 text-slate-400' },
                              { p: TicketPriority.MEDIUM, label: 'Media', color: 'border-sky-500/50 text-sky-400' },
                              { p: TicketPriority.HIGH, label: 'Alta', color: 'border-amber-500/50 text-amber-400' },
                              { p: TicketPriority.CRITICAL, label: 'Crítica', color: 'border-rose-500/50 text-rose-400' },
                            ].map((item) => (
                              <button
                                key={item.p}
                                type="button"
                                onClick={() => setSelectedPriority(item.p)}
                                className={`py-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                                  selectedPriority === item.p
                                    ? 'bg-sky-600 border-sky-500 text-white shadow-md'
                                    : `bg-slate-950/70 hover:bg-slate-900 ${item.color}`
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Big Prominent "SOLICITAR SOPORTE" Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-4 bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
                        >
                          {isSubmitting ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                          SOLICITAR SOPORTE TÉCNICO
                        </button>
                      </form>
                    )}

                    {/* STATE 2: WAITING FOR TECHNICIAN */}
                    {agentState === 'waiting' && (
                      <div className="bg-slate-950 p-6 rounded-xl border border-amber-500/30 text-center space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-spin">
                          <RefreshCw className="w-7 h-7" />
                        </div>

                        <div>
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Ticket {activeTicket?.ticket_number || '#TICK-PENDIENTE'}
                          </span>
                          <h4 className="font-bold text-white text-base mt-2">
                            Su solicitud ha sido recibida en la mesa de ayuda
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Un técnico especialista revisará el caso y enviará una solicitud de control remoto. Por favor permanezca atento a la pantalla.
                          </p>
                        </div>

                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-left text-xs space-y-1">
                          <div className="text-slate-400">Problema reportado: <span className="text-slate-200">{activeTicket?.problem_description}</span></div>
                          <div className="text-slate-400">Prioridad: <span className="text-amber-400 font-semibold">{activeTicket?.priority}</span></div>
                        </div>

                        {/* Testing shortcut button */}
                        <button
                          type="button"
                          onClick={handleTechnicianAcceptsTicket}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Simular que el Técnico Acepta y Solicita Conexión
                        </button>
                      </div>
                    )}

                    {/* STATE 3: AUTHORIZATION MODAL / POPUP DIALOG */}
                    {agentState === 'request_received' && (
                      <div className="bg-slate-950 p-6 rounded-xl border-2 border-sky-500 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="w-14 h-14 mx-auto rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center animate-bounce">
                          <ShieldAlert className="w-8 h-8" />
                        </div>

                        <div className="space-y-1.5">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-sky-500/20 text-sky-300">
                            Autorización de Conexión Requerida
                          </span>
                          <h4 className="font-bold text-white text-lg">
                            ¿Desea permitir el acceso remoto?
                          </h4>
                          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                            El técnico <strong className="text-sky-300 font-bold">{assignedTechName}</strong> desea conectarse a su equipo para resolver la incidencia <span className="font-mono text-white font-bold">{activeTicket?.ticket_number}</span>.
                          </p>
                        </div>

                        <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 text-left flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>
                            Usted mantiene el control en todo momento. Podrá visualizar las acciones del técnico y finalizar el soporte con un solo clic.
                          </span>
                        </div>

                        {/* Explicit Authorization Buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleRejectAccess}
                            className="py-3 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar Acceso
                          </button>

                          <button
                            type="button"
                            onClick={handleAuthorizeAccess}
                            className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-colors flex items-center justify-center gap-1.5 transform active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Permitir Acceso
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STATE 4: IN ACTIVE REMOTE SESSION */}
                    {agentState === 'in_session' && (
                      <div className="bg-slate-950 p-6 rounded-xl border border-rose-500/40 space-y-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                          <span className="text-xs font-mono font-bold text-rose-400 uppercase">
                            Sesión de Control Remoto Activa
                          </span>
                        </div>

                        <div className="py-2">
                          <div className="text-3xl font-extrabold font-mono text-white tracking-widest">
                            {formatTime(sessionSeconds)}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            Técnico Conectado: <strong className="text-sky-300">{assignedTechName}</strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-slate-500 text-[10px]">FPS:</span>
                            <div className="text-emerald-400 font-bold">30 FPS</div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px]">CALIDAD:</span>
                            <div className="text-sky-400 font-bold">1080p HD</div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px]">LATENCIA:</span>
                            <div className="text-slate-200 font-bold">24 ms</div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleTerminateSession}
                          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Power className="w-4 h-4" />
                          FINALIZAR SOPORTE INMEDIATAMENTE
                        </button>
                      </div>
                    )}

                    {/* STATE 5: SESSION ENDED */}
                    {agentState === 'session_ended' && (
                      <div className="bg-slate-950 p-6 rounded-xl border border-emerald-500/40 text-center space-y-4">
                        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>

                        <div>
                          <h4 className="font-bold text-white text-base">
                            Sesión Finalizada con Éxito
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            El soporte remoto ha concluido y la conexión se ha cerrado de manera segura. Su equipo está protegido.
                          </p>
                        </div>

                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300">
                          Duración de atención: <strong className="text-emerald-400">{activeSession?.duration_seconds || sessionSeconds} segundos</strong>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetForNewTicket}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-colors"
                        >
                          Solicitar Nueva Asistencia
                        </button>
                      </div>
                    )}

                    {/* Footer Contact Info */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-sky-400" />
                        <span>{supportPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-sky-400" />
                        <span>{supportEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Minimized state placeholder */
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 text-center space-y-3">
                  <div className="text-sm font-semibold text-slate-300">
                    El Agente está ejecutándose en segundo plano en la Bandeja del Sistema (System Tray).
                  </div>
                  <button
                    onClick={() => setIsWindowMinimized(false)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg"
                  >
                    Restaurar Ventana de Soporte
                  </button>
                </div>
              )}

              {/* Windows 11 Taskbar & System Tray Simulator */}
              <div className="mt-4 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 flex items-center justify-between text-xs backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                    ⊞
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">Windows 11 Taskbar</span>
                </div>

                {/* System Tray Icon */}
                <div className="relative flex items-center gap-3">
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    onClick={() => setShowTrayMenu(!showTrayMenu)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 relative"
                    title="RemoteDesk Tray Icon"
                  >
                    <Laptop className="w-4 h-4" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-0.5 right-0.5" />
                  </button>

                  {/* Tray Context Menu Popup */}
                  {showTrayMenu && (
                    <div className="absolute right-0 bottom-8 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 text-xs text-slate-200 z-30 animate-in fade-in">
                      <div className="px-3 py-1.5 border-b border-slate-800 font-bold text-sky-400 flex items-center justify-between">
                        <span>{brandName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Online</span>
                      </div>
                      <button
                        onClick={() => { setIsWindowMinimized(false); setShowTrayMenu(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200"
                      >
                        Abrir Ventana de Soporte
                      </button>
                      <button
                        onClick={() => { setIsWindowMinimized(false); setShowTrayMenu(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-sky-400 font-semibold"
                      >
                        Solicitar Soporte Técnico
                      </button>
                      <div className="border-t border-slate-800 my-1" />
                      <button
                        onClick={() => { alert('Servicio en segundo plano activo'); setShowTrayMenu(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-400"
                      >
                        Ver Estado del Agente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: DUAL SIMULATION (CLIENT & TECHNICIAN SIDE-BY-SIDE) */}
      {activeSubTab === 'dual-simulation' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Simulador del Ciclo Completo de Soporte (Cliente ↔ Técnico)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Experimente cómo interactúan en vivo la aplicación del cliente y la consola del técnico: desde el ticket, la llamada sonora, la autorización obligatoria, hasta la desconexión final.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Client Side Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-white text-sm">Lado 1: Computadora del Cliente</h4>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  agentState === 'connected' ? 'bg-emerald-500/20 text-emerald-300' :
                  agentState === 'waiting' ? 'bg-amber-500/20 text-amber-300' :
                  agentState === 'request_received' ? 'bg-sky-500/20 text-sky-300' :
                  agentState === 'in_session' ? 'bg-rose-500/20 text-rose-300' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  Estado: {agentState.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400">Equipo: <strong className="text-slate-200">{currentDevice?.computer_name}</strong></div>
                  <div className="text-slate-400">Usuario: <strong className="text-slate-200">{contactName}</strong></div>
                  <div className="text-slate-400">Ticket Actual: <strong className="text-sky-400">{activeTicket?.ticket_number || 'Ninguno'}</strong></div>
                </div>

                {agentState === 'connected' && (
                  <button
                    onClick={handleSubmitSupport}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg"
                  >
                    1. Cliente Presiona: "SOLICITAR SOPORTE"
                  </button>
                )}

                {agentState === 'request_received' && (
                  <div className="p-3 bg-sky-950/40 border border-sky-500/50 rounded-lg space-y-2">
                    <div className="text-sky-300 font-bold">¡Alerta Sonora Emitida! Ventana de Consentimiento:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleRejectAccess}
                        className="py-1.5 bg-slate-800 hover:bg-rose-900 text-white font-bold rounded text-xs"
                      >
                        Rechazar
                      </button>
                      <button
                        onClick={handleAuthorizeAccess}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs"
                      >
                        Permitir Control
                      </button>
                    </div>
                  </div>
                )}

                {agentState === 'in_session' && (
                  <button
                    onClick={handleTerminateSession}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg"
                  >
                    Cliente Finaliza Soporte ({formatTime(sessionSeconds)})
                  </button>
                )}
              </div>
            </div>

            {/* Right: Technician Console Side */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-bold text-white text-sm">Lado 2: Consola del Técnico Especialista</h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                  Técnico L2
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Técnico Atendiendo:</label>
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-2 rounded-lg font-mono"
                  >
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.specialty})</option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-400">Cola de Tickets: <strong className="text-white">{activeTicket ? '1 Pendiente' : '0 Pendientes'}</strong></div>
                  <div className="text-slate-400">Sesión Remota: <strong className="text-indigo-400">{activeSession?.session_token || 'Sin sesión'}</strong></div>
                </div>

                {agentState === 'waiting' && (
                  <button
                    onClick={handleTechnicianAcceptsTicket}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    2. Técnico Presiona: "ACEPTAR TICKET & CONECTAR"
                  </button>
                )}

                {agentState === 'in_session' && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-300">
                    <div className="font-bold">Streaming de Escritorio Activo</div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      El técnico tiene acceso autorizado a la pantalla y teclado del cliente.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: C# WINDOWS AGENT CODE VIEWER */}
      {activeSubTab === 'csharp-code' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Estructura del Proyecto C# (.NET 9 / WPF / Windows Service)</h3>
              <p className="text-xs text-slate-400">Archivos fuente implementados en `/client_agent_windows/src/`</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 font-mono text-xs">
              .NET 9.0 Windows
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Snippet 1: AgentMainWindow.xaml.cs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>AgentMainWindow.xaml.cs (WPF State Machine)</span>
                <button
                  onClick={() => copySnippet('// AgentMainWindow.xaml.cs', 'main')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCodeSnippet === 'main' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[220px]">
{`public async Task RequestSupportAsync(string contactName, string contactInfo, string problemDesc, string priority)
{
    var payload = new {
        device_id = "dev-auto",
        contact_name = contactName,
        contact_info = contactInfo,
        problem_description = problemDesc,
        priority = priority
    };
    var response = await _httpClient.PostAsJsonAsync("/api/v1/tickets", payload);
    if (response.IsSuccessStatusCode) {
        UpdateUiForState(AgentState.WaitingTechnician);
    }
}`}
              </pre>
            </div>

            {/* Snippet 2: AuthorizationDialog.xaml.cs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>AuthorizationDialog.xaml.cs (Consent Window)</span>
                <button
                  onClick={() => copySnippet('// AuthorizationDialog.xaml.cs', 'auth')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCodeSnippet === 'auth' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[220px]">
{`public class AuthorizationDialog : Window
{
    public AuthorizationDialog(string technicianName, string systemBrand)
    {
        AudioNotificationHelper.PlayIncomingConnectionAlert();
        Topmost = true;
        Title = $"{systemBrand} - Solicitud de Control Remoto";
    }
    public void OnAllowClicked(object s, RoutedEventArgs e) { DialogResult = true; Close(); }
    public void OnDenyClicked(object s, RoutedEventArgs e) { DialogResult = false; Close(); }
}`}
              </pre>
            </div>

            {/* Snippet 3: FloatingSessionBanner.xaml.cs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>FloatingSessionBanner.xaml.cs (Top Overlay)</span>
                <button
                  onClick={() => copySnippet('// FloatingSessionBanner.xaml.cs', 'banner')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCodeSnippet === 'banner' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[220px]">
{`public class FloatingSessionBanner : Window
{
    public FloatingSessionBanner(string techName, Func<Task> onTerminate)
    {
        Topmost = true;
        WindowStyle = WindowStyle.None;
        AllowsTransparency = true;
        Top = 10;
        Left = (SystemParameters.PrimaryScreenWidth - 520) / 2;
    }
}`}
              </pre>
            </div>

            {/* Snippet 4: AgentConfig.cs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-sky-400">
                <span>AgentConfig.cs (White-Label Branding)</span>
                <button
                  onClick={() => copySnippet('// AgentConfig.cs', 'config')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedCodeSnippet === 'config' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[220px]">
{`public class AgentConfig
{
    public string BrandName { get; set; } = "RemoteDesk Enterprise";
    public string SupportPhone { get; set; } = "+1 (809) 555-0199";
    public string ServerBaseUrl { get; set; } = "https://server.domain.com";
    public bool RequireExplicitUserConsent { get; set; } = true;
    public bool PlayAudioOnIncomingConnection { get; set; } = true;
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
