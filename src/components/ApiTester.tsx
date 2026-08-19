import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  RefreshCw,
  Cpu,
  Ticket,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

export const ApiTester: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('health');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST'>('GET');
  const [requestPath, setRequestPath] = useState<string>('/api/v1/health');
  const [requestBody, setRequestBody] = useState<string>('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<string>('');
  const [responseBody, setResponseBody] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const presets = [
    {
      id: 'health',
      name: '1. Diagnóstico del Servidor & DB',
      method: 'GET',
      path: '/api/v1/health',
      body: '',
      desc: 'Verifica la conexión a la base de datos, estado de tablas y memoria.',
    },
    {
      id: 'login',
      name: '2. Autenticación de Técnico',
      method: 'POST',
      path: '/api/v1/auth/login',
      body: JSON.stringify({
        email: 'tecnico.ramirez@remotedesk.com',
        password: 'password123',
      }, null, 2),
      desc: 'Simula el login seguro de un técnico y la emisión del token JWT.',
    },
    {
      id: 'devices',
      name: '3. Listar Computadoras Registradas',
      method: 'GET',
      path: '/api/v1/devices',
      body: '',
      desc: 'Obtiene todos los equipos Windows con telemetría de hardware.',
    },
    {
      id: 'register_device',
      name: '4. Registrar Nuevo Dispositivo (Agente)',
      method: 'POST',
      path: '/api/v1/devices/register',
      body: JSON.stringify({
        customer_id: 'cust-abc-01',
        device_uuid: 'WIN-UUID-7766-TEST-LAPTOP09',
        computer_name: 'ABC-LAPTOP-VENTAS-09',
        windows_user: 'carlos_ventas',
        os_version: 'Windows 11 Enterprise 64-bit',
        cpu: 'Intel Core i7-13700H (14 Cores @ 2.40GHz)',
        ram_mb: 32768,
        storage_info: 'SSD NVMe 1TB (620GB Libres)',
        ip_address: '192.168.1.140',
        mac_address: '00:2B:67:89:12:FA',
        agent_version: '1.0.0',
      }, null, 2),
      desc: 'Simula el handshake inicial del Agente Windows instalado en un equipo cliente.',
    },
    {
      id: 'create_ticket',
      name: '5. "SOLICITAR SOPORTE" (Cliente Windows)',
      method: 'POST',
      path: '/api/v1/tickets',
      body: JSON.stringify({
        device_id: 'dev-recep-01',
        problem_description: 'Error crítico al emitir factura electrónica con certificado digital.',
        priority: 'Alta',
      }, null, 2),
      desc: 'Simula la creación de una solicitud de soporte desde el botón del Agente Windows.',
    },
    {
      id: 'assign_ticket',
      name: '6. "ACEPTAR SOLICITUD" (Consola Técnico)',
      method: 'POST',
      path: '/api/v1/tickets/t-1002/assign',
      body: JSON.stringify({
        technician_id: 'tech-001',
      }, null, 2),
      desc: 'Asigna un técnico disponible y genera un token temporal de sesión remota.',
    },
    {
      id: 'audit_logs',
      name: '7. Consultar Logs de Auditoría',
      method: 'GET',
      path: '/api/v1/audit?limit=15',
      body: '',
      desc: 'Consulta los eventos de seguridad y sesiones registradas en el backend.',
    },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setSelectedEndpoint(preset.id);
    setRequestMethod(preset.method as 'GET' | 'POST');
    setRequestPath(preset.path);
    setRequestBody(preset.body);
  };

  const executeRequest = async () => {
    setLoading(true);
    setResponseStatus(null);
    setResponseBody('');
    const startTime = performance.now();

    try {
      const options: RequestInit = {
        method: requestMethod,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (requestMethod === 'POST' && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(requestPath, options);
      const elapsed = Math.round(performance.now() - startTime);

      setResponseStatus(res.status);
      setResponseHeaders(`${res.status} ${res.statusText} (${elapsed}ms)`);

      const json = await res.json();
      setResponseBody(JSON.stringify(json, null, 2));
    } catch (err: any) {
      setResponseStatus(500);
      setResponseHeaders('Error de conexión');
      setResponseBody(JSON.stringify({ error: err.message || 'Network error' }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              REST API / V1
            </span>
            <span className="text-xs text-slate-400">Pruebas Funcionales Interactivas</span>
          </div>
          <h2 className="text-xl font-bold text-white">Laboratorio de Pruebas de API Backend</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Preset Selector (Left) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Casos de Prueba Preconfigurados
          </div>
          {presets.map((p) => {
            const isSelected = selectedEndpoint === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    p.method === 'POST' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'
                  }`}>
                    {p.method}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{p.path.split('?')[0]}</span>
                </div>
                <div className="font-semibold text-xs text-slate-200">{p.name}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{p.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Request & Response Sandbox (Right) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Request Header Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono ${
                requestMethod === 'POST' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}>
                {requestMethod}
              </span>
              <input
                type="text"
                value={requestPath}
                onChange={(e) => setRequestPath(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={executeRequest}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Ejecutar
              </button>
            </div>

            {requestMethod === 'POST' && (
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-slate-400">Request Body (JSON):</div>
                <textarea
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 p-3 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Response Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">Respuesta del Servidor</span>
              </div>
              {responseStatus !== null && (
                <span className={`text-xs font-mono px-2 py-0.5 rounded flex items-center gap-1 ${
                  responseStatus >= 200 && responseStatus < 300
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {responseStatus >= 200 && responseStatus < 300 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {responseHeaders}
                </span>
              )}
            </div>

            <pre className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[350px] leading-relaxed">
              {responseBody || '// Presiona "Ejecutar" para enviar la solicitud al servidor backend central...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
