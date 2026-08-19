import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Lock, 
  Unlock, 
  RefreshCw, 
  LogOut, 
  UserX, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Terminal,
  Copy,
  Check,
  Cpu,
  Building2,
  Trash2,
  UserPlus,
  Wrench,
  Users
} from 'lucide-react';

export const AuthManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'auth' | 'technicians'>('technicians');
  const [email, setEmail] = useState<string>('tecnico.ramirez@remotedesk.com');
  const [password, setPassword] = useState<string>('Tech123!');
  const [loading, setLoading] = useState<boolean>(false);
  const [authResponse, setAuthResponse] = useState<any>(null);
  const [decodedJwt, setDecodedJwt] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ status: number; data: any } | null>(null);
  const [activeSessionsList, setActiveSessionsList] = useState<any[]>([]);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Technicians Management State
  const [techniciansList, setTechniciansList] = useState<any[]>([]);
  const [showAddTechModal, setShowAddTechModal] = useState<boolean>(false);
  const [newTechData, setNewTechData] = useState({
    full_name: '',
    email: '',
    password: '',
    specialty: 'Sistemas Windows & Redes',
    max_concurrent_sessions: 3,
  });
  const [techActionMessage, setTechActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch technicians list
  const fetchTechnicians = async () => {
    try {
      const res = await fetch('/api/v1/auth/technicians');
      if (res.ok) {
        const data = await res.json();
        setTechniciansList(data);
      }
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechData.full_name || !newTechData.email || !newTechData.password) {
      setTechActionMessage({ type: 'error', text: 'Por favor complete todos los campos obligatorios.' });
      return;
    }

    setLoading(true);
    setTechActionMessage(null);
    try {
      const res = await fetch('/api/v1/auth/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTechData),
      });
      const data = await res.json();
      if (res.ok) {
        setTechActionMessage({ type: 'success', text: `¡Técnico "${data.technician.full_name}" creado con éxito!` });
        setShowAddTechModal(false);
        setNewTechData({
          full_name: '',
          email: '',
          password: '',
          specialty: 'Sistemas Windows & Redes',
          max_concurrent_sessions: 3,
        });
        fetchTechnicians();
      } else {
        setTechActionMessage({ type: 'error', text: data.error || 'Error al registrar técnico' });
      }
    } catch (err: any) {
      setTechActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Decode JWT Payload without external library
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleLogin = async (overrideEmail?: string, overridePass?: string) => {
    const targetEmail = overrideEmail || email;
    const targetPass = overridePass || password;

    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const data = await res.json();
      if (res.ok) {
        setAuthResponse(data);
        const parsed = parseJwt(data.access_token);
        setDecodedJwt(parsed);
        fetchSessions(data.access_token);
        fetchAudit();
      } else {
        setTestResult({ status: res.status, data });
      }
    } catch (err: any) {
      setTestResult({ status: 500, data: { error: err.message } });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!authResponse?.refresh_token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: authResponse.refresh_token }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthResponse((prev: any) => ({
          ...prev,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        }));
        setDecodedJwt(parseJwt(data.access_token));
        setTestResult({ status: 200, data: { message: 'Token rotado exitosamente con nuevo JWT', new_access_token: data.access_token } });
        fetchAudit();
      } else {
        setTestResult({ status: res.status, data });
      }
    } catch (err: any) {
      setTestResult({ status: 500, data: { error: err.message } });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!authResponse?.access_token) return;
    setLoading(true);
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authResponse.access_token}`,
        },
      });
      setAuthResponse(null);
      setDecodedJwt(null);
      setTestResult({ status: 200, data: { message: 'Sesión cerrada y token revocado inmediatamente.' } });
      fetchSessions();
      fetchAudit();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoint = async (endpoint: string, method = 'GET') => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authResponse?.access_token) {
        headers['Authorization'] = `Bearer ${authResponse.access_token}`;
      }

      const res = await fetch(endpoint, { method, headers });
      const data = await res.json();
      setTestResult({ status: res.status, data });
    } catch (err: any) {
      setTestResult({ status: 500, data: { error: err.message } });
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async (token?: string) => {
    const bearer = token || authResponse?.access_token;
    if (!bearer) return;
    try {
      const res = await fetch('/api/v1/auth/sessions', {
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveSessionsList(data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!authResponse?.access_token) return;
    try {
      const res = await fetch('/api/v1/auth/revoke-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authResponse.access_token}`,
        },
        body: JSON.stringify({ session_id: sessionId, reason: 'Revocación manual inmediata por el administrador' }),
      });
      const data = await res.json();
      setTestResult({ status: res.status, data });
      fetchSessions();
      fetchAudit();
    } catch (err: any) {
      console.error('Error revoking session:', err);
    }
  };

  const fetchAudit = async () => {
    try {
      const res = await fetch('/api/v1/audit?limit=8');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Error fetching audit:', err);
    }
  };

  useEffect(() => {
    // Initial silent login as Technician for demo
    handleLogin('tecnico.ramirez@remotedesk.com', 'Tech123!');
    fetchTechnicians();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                GESTIÓN DE EQUIPO & SEGURIDAD
              </span>
              <span className="text-xs text-slate-400">Técnicos Operativos • JWT • BCrypt • RBAC</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">
              Personal Técnico & Autenticación
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Crea y administra tus técnicos de soporte remoto, asigna especialidades, límites de sesiones concurrentes y gestiona credenciales de acceso con tokens seguros.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddTechModal(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-red-950/40 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              + Agregar Técnico Operativo
            </button>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveSubTab('technicians')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'technicians'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Técnicos Operativos Registrados ({techniciansList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auth')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'auth'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Simulador JWT, Sesiones & RBAC</span>
        </button>
      </div>

      {techActionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            techActionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {techActionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{techActionMessage.text}</span>
          </div>
          <button
            onClick={() => setTechActionMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUBTAB 1: TECHNICIANS LIST & MANAGEMENT */}
      {activeSubTab === 'technicians' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {techniciansList.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">
                      {t.full_name?.charAt(0) || 'T'}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.is_online
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.is_online ? '• DISPONIBLE' : 'OFFLINE'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-white">{t.full_name}</h4>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{t.email}</div>

                  <div className="mt-4 space-y-2 text-xs border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Especialidad:</span>
                      <span className="text-slate-200 font-medium text-right">{t.specialty}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Capacidad Simultánea:</span>
                      <span className="text-red-400 font-mono font-bold">{t.max_concurrent_sessions} sesiones</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>ID Operativo:</span>
                      <span className="text-slate-500 font-mono text-[11px]">{t.id}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEmail(t.email);
                      setPassword('Tech123!');
                      setActiveSubTab('auth');
                      handleLogin(t.email, 'Tech123!');
                    }}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-red-400" />
                    Simular Login
                  </button>
                </div>
              </div>
            ))}

            {/* Add Technician Card Button */}
            <button
              onClick={() => setShowAddTechModal(true)}
              className="bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-red-500/40 hover:bg-red-950/10 rounded-xl p-6 transition-all flex flex-col items-center justify-center gap-3 text-center min-h-[220px] group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-red-600/20 text-slate-400 group-hover:text-red-400 flex items-center justify-center transition-colors">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block group-hover:text-red-400 transition-colors">
                  Registrar Nuevo Técnico
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Añadir operador de Help Desk con credenciales de acceso
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 2: AUTH SIMULATOR */}
      {activeSubTab === 'auth' && (
      <div>

      {/* Preset Accounts & Login Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: One Click Credentials & Login Form */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-sky-400" />
              1. Credenciales de Prueba por Rol
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">BCrypt Hashes</span>
          </div>

          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setEmail('admin@remotedesk.com');
                setPassword('Admin123!');
                handleLogin('admin@remotedesk.com', 'Admin123!');
              }}
              className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Administrador Global</div>
                  <div className="text-[11px] font-mono text-slate-400">admin@remotedesk.com • Admin123!</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                Rol: Admin
              </span>
            </button>

            <button
              onClick={() => {
                setEmail('tecnico.ramirez@remotedesk.com');
                setPassword('Tech123!');
                handleLogin('tecnico.ramirez@remotedesk.com', 'Tech123!');
              }}
              className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold text-xs">
                  T
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Ing. Roberto Ramírez (Técnico)</div>
                  <div className="text-[11px] font-mono text-slate-400">tecnico.ramirez@remotedesk.com • Tech123!</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                Rol: Technician
              </span>
            </button>

            <button
              onClick={() => {
                setEmail('juan.perez@abcsolutions.com');
                setPassword('Client123!');
                handleLogin('juan.perez@abcsolutions.com', 'Client123!');
              }}
              className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Juan Pérez (Cliente ABC)</div>
                  <div className="text-[11px] font-mono text-slate-400">juan.perez@abcsolutions.com • Client123!</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Rol: Customer
              </span>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Correo Electrónico:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Contraseña (BCrypt):</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleLogin()}
                disabled={loading}
                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Iniciar Sesión (POST /login)
              </button>
              {authResponse && (
                <button
                  onClick={handleLogout}
                  className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 text-xs py-2 px-3 rounded-lg transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Active Session & Decoded JWT Token */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              2. Token JWT & Estado de Sesión Activa
            </h3>
            {authResponse ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3 h-3" /> AUTENTICADO
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                NO AUTENTICADO
              </span>
            )}
          </div>

          {authResponse ? (
            <div className="space-y-3">
              {/* User Profile Card */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{authResponse.user.full_name}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{authResponse.user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    Rol: <strong className="text-sky-400">{authResponse.user.role}</strong>
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                    Expira en: <strong>{authResponse.expires_in}s</strong>
                  </span>
                </div>
              </div>

              {/* JWT Decoder View */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Claims Decodificados del Token JWT:</span>
                  <button
                    onClick={() => copyToClipboard(authResponse.access_token)}
                    className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-[10px]"
                  >
                    {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedToken ? 'Copiado' : 'Copiar Token'}
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 p-3 rounded-lg font-mono text-xs text-sky-300 overflow-x-auto max-h-[140px] leading-relaxed">
                  {JSON.stringify(decodedJwt, null, 2)}
                </pre>
              </div>

              {/* Token Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleRefreshToken}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  Rotar Token (POST /refresh)
                </button>
                <button
                  onClick={() => testEndpoint('/api/v1/auth/me')}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Verificar Perfil (GET /me)
                </button>
                <button
                  onClick={() => fetchSessions()}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  Listar Sesiones Activas
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Inicia sesión con cualquiera de los botones de la izquierda para generar tokens JWT y probar el sistema.
            </div>
          )}
        </div>
      </div>

      {/* RBAC Testing Bench & Live Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RBAC Test Suite (Left) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              3. Banco de Pruebas de Autorización (RBAC)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evalúa cómo los middlewares protegen endpoints según el rol del token actual.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200">Endpoint Exclusivo de Admin</div>
                <div className="text-[11px] font-mono text-slate-400">GET /api/v1/auth/test-protected/admin</div>
                <div className="text-[10px] text-slate-500">Requiere: Role = Admin</div>
              </div>
              <button
                onClick={() => testEndpoint('/api/v1/auth/test-protected/admin')}
                className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
              >
                Probar
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200">Endpoint Técnico / Operaciones</div>
                <div className="text-[11px] font-mono text-slate-400">GET /api/v1/auth/test-protected/technician</div>
                <div className="text-[10px] text-slate-500">Requiere: Role = Technician o Admin</div>
              </div>
              <button
                onClick={() => testEndpoint('/api/v1/auth/test-protected/technician')}
                className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shrink-0"
              >
                Probar
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-200">Prueba con Token Falso / Alterado</div>
                <div className="text-[11px] font-mono text-rose-400">Bearer INVALID_FAKE_TOKEN_123</div>
                <div className="text-[10px] text-slate-500">Debe retornar 401 Unauthorized</div>
              </div>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('/api/v1/auth/me', {
                      headers: { Authorization: 'Bearer INVALID_FAKE_TOKEN_123' },
                    });
                    const data = await res.json();
                    setTestResult({ status: res.status, data });
                  } catch (err: any) {
                    setTestResult({ status: 500, data: { error: err.message } });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0"
              >
                Probar Error
              </button>
            </div>
          </div>
        </div>

        {/* Live Test Console (Right) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Resultado de la Prueba HTTP
            </h3>
            {testResult && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                testResult.status === 200
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : testResult.status === 403
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}>
                HTTP {testResult.status}
              </span>
            )}
          </div>

          <pre className="bg-slate-950 border border-slate-800 p-4 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto min-h-[220px] max-h-[260px] leading-relaxed">
            {testResult
              ? JSON.stringify(testResult.data, null, 2)
              : '// Selecciona una prueba en el panel izquierdo para evaluar el middleware de autorización...'}
          </pre>
        </div>
      </div>

      {/* Active Sessions & Immediate Revocation (Kill Switch) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-400" />
              4. Control de Sesiones Activas & Revocación Inmediata (Kill Switch)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cualquier sesión revocada invalida instantáneamente su token JWT en todos los endpoints.
            </p>
          </div>
          <button
            onClick={() => fetchSessions()}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Refrescar Sesiones
          </button>
        </div>

        <div className="overflow-x-auto">
          {activeSessionsList.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              No hay sesiones cargadas. Inicia sesión o pulsa "Listar Sesiones Activas".
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Rol</th>
                  <th className="py-2.5 px-3">IP / Origen</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {activeSessionsList.map((s) => (
                  <tr key={s.sessionId} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-sky-400">{s.sessionId}</td>
                    <td className="py-2 px-3 font-medium text-white">{s.fullName} ({s.email})</td>
                    <td className="py-2 px-3">{s.role}</td>
                    <td className="py-2 px-3 text-slate-400">{s.ipAddress}</td>
                    <td className="py-2 px-3">
                      {s.isRevoked ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          REVOCADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ACTIVA
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {!s.isRevoked ? (
                        <button
                          onClick={() => handleRevokeSession(s.sessionId)}
                          className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                          title="Revocar sesión inmediatamente"
                        >
                          <Trash2 className="w-3 h-3" />
                          Revocar
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Revocado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
      )}

      {/* Add Technician Modal */}
      {showAddTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/30 text-red-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Registrar Técnico Operativo</h3>
                  <p className="text-xs text-slate-400">Crear credenciales para soporte remoto</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddTechModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTechnician} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nombre Completo del Técnico:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ing. Carlos Morales"
                  value={newTechData.full_name}
                  onChange={(e) => setNewTechData({ ...newTechData, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Correo Electrónico (Login):
                </label>
                <input
                  type="email"
                  required
                  placeholder="carlos.morales@smartdot.com"
                  value={newTechData.email}
                  onChange={(e) => setNewTechData({ ...newTechData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Contraseña Temporal:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Tech123! o clave segura"
                  value={newTechData.password}
                  onChange={(e) => setNewTechData({ ...newTechData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Especialidad / Área de Soporte:
                </label>
                <select
                  value={newTechData.specialty}
                  onChange={(e) => setNewTechData({ ...newTechData, specialty: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Sistemas Windows & Redes">Sistemas Windows & Redes</option>
                  <option value="Servidores & Active Directory">Servidores & Active Directory</option>
                  <option value="Software Facturación & ERP">Software Facturación & ERP</option>
                  <option value="Seguridad & Hardening">Seguridad & Hardening</option>
                  <option value="Soporte Nivel 1 (Mesa de Ayuda)">Soporte Nivel 1 (Mesa de Ayuda)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Límite de Sesiones Remotas Simultáneas:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newTechData.max_concurrent_sessions}
                  onChange={(e) => setNewTechData({ ...newTechData, max_concurrent_sessions: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTechModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40"
                >
                  {loading ? 'Guardando...' : 'Crear Técnico'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
