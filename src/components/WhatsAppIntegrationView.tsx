import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  Zap,
  RefreshCw,
  Sliders,
  Settings,
  BellRing,
  HelpCircle,
  Copy,
  Check,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { WhatsAppConfig, WhatsAppDispatchLog } from '../types.ts';

export function WhatsAppIntegrationView() {
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: true,
    provider: 'browser_direct',
    recipientNumber: '+18095550199',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: 'whatsapp:+14155238886',
    metaApiToken: '',
    metaPhoneNumberId: '',
    webhookUrl: '',
    notifyOnCritical: true,
    notifyOnHigh: true,
    notifyOnMedium: true,
    notifyOnLow: false,
  });

  const [logs, setLogs] = useState<WhatsAppDispatchLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchConfigAndLogs = async () => {
    try {
      setLoading(true);
      const [resCfg, resLogs] = await Promise.all([
        fetch('/api/v1/whatsapp/config'),
        fetch('/api/v1/whatsapp/logs'),
      ]);
      if (resCfg.ok) {
        const dataCfg = await resCfg.json();
        setConfig(dataCfg);
      }
      if (resLogs.ok) {
        const dataLogs = await resLogs.json();
        setLogs(dataLogs);
      }
    } catch (err) {
      console.error('Error loading WhatsApp settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigAndLogs();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/v1/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        fetchConfigAndLogs();
      }
    } catch (err) {
      console.error('Error saving WhatsApp settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/whatsapp/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customNumber: config.recipientNumber,
          priority: 'HIGH',
        }),
      });
      const data = await res.json();
      setTestResult(data);
      fetchConfigAndLogs();
    } catch (err: any) {
      setTestResult({ error: err.message || 'Fallo al enviar prueba' });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Notificaciones de Tickets por WhatsApp
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> En tiempo real
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Recibe alertas automáticas en tu móvil cada vez que un cliente reporte un problema desde el cliente de escritorio o la web, con enlace directo para conectarte de inmediato.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSendTestNotification}
              disabled={testing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Probar Notificación Ahora
            </button>
            <button
              onClick={fetchConfigAndLogs}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Test Notification Banner if Available */}
      {testResult && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              Notificación generada con éxito ({testResult.result?.provider || 'Listo'})
            </div>
            {testResult.directUrl && (
              <a
                href={testResult.directUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-md inline-flex items-center gap-1.5 transition"
              >
                Abrir WhatsApp Web Directo <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap">
            {testResult.preview}
          </div>
        </div>
      )}

      {/* Main Grid: Settings & Dispatch Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: WhatsApp Config Form */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveConfig} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Configuración del Técnico / Destino</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-slate-800"
                />
                <span className="text-xs font-semibold text-slate-300">Activar Alertas</span>
              </label>
            </div>

            {/* Recipient Phone */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Tu Número de WhatsApp (Técnico / Central de Soporte)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Smartphone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="+18095550199 (con código de país)"
                  value={config.recipientNumber}
                  onChange={(e) => setConfig({ ...config, recipientNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <p className="text-xs text-slate-500">
                Incluye el código de país. Ejemplos: <code className="text-slate-400">+18095550199</code>, <code className="text-slate-400">+34600000000</code>, <code className="text-slate-400">+5215512345678</code>.
              </p>
            </div>

            {/* Provider Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Modo de Envío de WhatsApp
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'browser_direct' })}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    config.provider === 'browser_direct'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-white">Click-to-Chat / wa.me</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">100% Gratis</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Genera enlace directo instantáneo sin costo ni registro de API.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'twilio' })}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    config.provider === 'twilio'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-white">Twilio WhatsApp API</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold">Oficial API</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Envío 100% silencioso y desatendido directo al teléfono.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'webhook' })}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    config.provider === 'webhook'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-white">Webhook Relay</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold">Make/n8n/Evolution</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Conecta con Evolution API, Baileys, Make.com o n8n.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig({ ...config, provider: 'meta' })}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    config.provider === 'meta'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs text-white">Meta Cloud API</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">Meta Business</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    API directa de Facebook Developers / WhatsApp Cloud.
                  </span>
                </button>
              </div>
            </div>

            {/* Provider Detailed Fields */}
            {config.provider === 'twilio' && (
              <div className="space-y-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-bold text-slate-300">Credenciales Twilio</div>
                <div>
                  <label className="text-[11px] text-slate-400">Account SID:</label>
                  <input
                    type="text"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={config.twilioAccountSid || ''}
                    onChange={(e) => setConfig({ ...config, twilioAccountSid: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Auth Token:</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={config.twilioAuthToken || ''}
                    onChange={(e) => setConfig({ ...config, twilioAuthToken: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Número Emisor (From):</label>
                  <input
                    type="text"
                    placeholder="whatsapp:+14155238886 (Sandbox de Twilio)"
                    value={config.twilioFromNumber || ''}
                    onChange={(e) => setConfig({ ...config, twilioFromNumber: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                  />
                </div>
              </div>
            )}

            {config.provider === 'webhook' && (
              <div className="space-y-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-bold text-slate-300">URL del Webhook Relay</div>
                <div>
                  <label className="text-[11px] text-slate-400">Webhook Endpoint URL:</label>
                  <input
                    type="url"
                    placeholder="https://hook.us1.make.com/xxxx o https://tu-instancia-evolution-api.com/send"
                    value={config.webhookUrl || ''}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                  />
                </div>
              </div>
            )}

            {config.provider === 'meta' && (
              <div className="space-y-3 p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-xs font-bold text-slate-300">Credenciales Meta Cloud API</div>
                <div>
                  <label className="text-[11px] text-slate-400">Phone Number ID:</label>
                  <input
                    type="text"
                    placeholder="1049281928471"
                    value={config.metaPhoneNumberId || ''}
                    onChange={(e) => setConfig({ ...config, metaPhoneNumberId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Access Token Permanente:</label>
                  <input
                    type="password"
                    placeholder="EAAG..."
                    value={config.metaApiToken || ''}
                    onChange={(e) => setConfig({ ...config, metaApiToken: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                  />
                </div>
              </div>
            )}

            {/* Filter by Priority */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Filtrar Alertas por Urgencia del Ticket
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifyOnCritical}
                    onChange={(e) => setConfig({ ...config, notifyOnCritical: e.target.checked })}
                    className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 h-4 w-4 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> Urgente / Crítica
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifyOnHigh}
                    onChange={(e) => setConfig({ ...config, notifyOnHigh: e.target.checked })}
                    className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 h-4 w-4 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Prioridad Alta
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifyOnMedium}
                    onChange={(e) => setConfig({ ...config, notifyOnMedium: e.target.checked })}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1">
                    Prioridad Media
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifyOnLow}
                    onChange={(e) => setConfig({ ...config, notifyOnLow: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 bg-slate-900"
                  />
                  <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                    Prioridad Baja
                  </span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Check className="w-4 h-4" /> Configuración Guardada
                </div>
              ) : <div />}

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Message Format & Dispatch Logs */}
        <div className="lg:col-span-6 space-y-6">
          {/* Format Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <BellRing className="w-4 h-4 text-emerald-400" /> Plantilla del Mensaje de WhatsApp
              </div>
              <span className="text-xs text-slate-500">Auto-completado con datos del ticket</span>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-4 font-mono text-xs text-emerald-200 leading-relaxed relative">
              <div className="text-emerald-400 font-bold mb-1">🔔 *DOTDESK - NUEVA SOLICITUD DE ASISTENCIA*</div>
              <div className="text-emerald-500/60">----------------------------------------</div>
              <div>🎫 *Ticket:* #T-1084</div>
              <div>⚡ *Nivel:* 🚨 *URGENTE / CRÍTICA*</div>
              <div>🏢 *Cliente:* ABC Solutions S.R.L.</div>
              <div>💻 *Equipo:* WS-CONTABILIDAD-01</div>
              <div>👤 *Usuario:* María Gómez</div>
              <div>📞 *Contacto:* +1 (809) 555-0199</div>
              <div>📝 *Problema:* "El sistema de facturación no emite comprobantes fiscales"</div>
              <div className="text-emerald-500/60">----------------------------------------</div>
              <div className="text-slate-400 text-[11px] mt-1">👉 _Abrir consola de soporte DOTDESK para iniciar sesion remota._</div>
            </div>
          </div>

          {/* Dispatch Logs History */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Clock className="w-4 h-4 text-slate-400" /> Historial de Envíos Recientes
              </div>
              <span className="text-xs text-slate-500">{logs.length} envíos</span>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No hay envíos registrados todavía. Genera un ticket o haz clic en "Probar Notificación".
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 hover:border-slate-700 transition flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Ticket #{log.ticketNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'SENT'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : log.status === 'READY_LINK'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {log.status === 'SENT' ? 'ENVIADO' : log.status === 'READY_LINK' ? 'LINK LISTO' : 'FALLIDO'}
                        </span>
                        <span className="text-[10px] text-slate-500">vía {log.provider}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] line-clamp-1">{log.messagePreview}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {log.directWhatsAppWebUrl && (
                        <a
                          href={log.directWhatsAppWebUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded transition"
                          title="Abrir en WhatsApp Web"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => copyToClipboard(log.directWhatsAppWebUrl, log.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        title="Copiar Enlace"
                      >
                        {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
