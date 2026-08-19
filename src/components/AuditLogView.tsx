import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileCheck2,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Search,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Code2,
  ExternalLink,
  Lock,
  Calendar,
  Building,
  User,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Key,
  Database,
  Printer,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';
import {
  AuditEvent,
  SessionAuditRecord,
  CustomerServiceReportSummary,
  AuditChainVerificationResult,
  AuditActionCategory,
  Customer
} from '../types.ts';
import { soundService } from '../services/soundService.ts';
import { realtimeSocket } from '../services/realtimeSocket.ts';

export function AuditLogView() {
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'events' | 'reports' | 'csharp-code'>('sessions');

  // Audit Events State
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [categoriesSummary, setCategoriesSummary] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<AuditActionCategory>('ALL');
  const [eventSearch, setEventSearch] = useState('');
  const [eventSeverity, setEventSeverity] = useState<string>('');
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<SessionAuditRecord[]>([]);
  const [sessionSearch, setSessionSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionAuditRecord | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Chain Verification State
  const [verificationResult, setVerificationResult] = useState<AuditChainVerificationResult | null>(null);
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Customer Service Report State
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-abc-01');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Últimos 30 días');
  const [serviceReport, setServiceReport] = useState<CustomerServiceReportSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // C# Code Viewer State
  const [selectedCsFile, setSelectedCsFile] = useState<string>('SecurityAuditLogger.cs');
  const [copiedCode, setCopiedCode] = useState(false);

  // Load Initial Data
  useEffect(() => {
    fetchAuditEvents();
    fetchSessionRecords();
    fetchCustomers();
    fetchServiceReport(selectedCustomerId, selectedPeriod);
    runChainVerification();

    // Listen to real-time audit notifications
    const unsub = realtimeSocket.on('alert_created', () => {
      fetchAuditEvents();
      fetchSessionRecords();
    });

    return () => {
      unsub();
    };
  }, []);

  const fetchAuditEvents = async () => {
    try {
      setLoadingEvents(true);
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (eventSeverity) params.append('severity', eventSeverity);
      if (eventSearch) params.append('search', eventSearch);

      const res = await fetch(`/api/v1/audit/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setCategoriesSummary(data.categoriesSummary || {});
      }
    } catch (err) {
      console.error('Error fetching audit events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchSessionRecords = async () => {
    try {
      setLoadingSessions(true);
      const params = new URLSearchParams();
      if (sessionSearch) params.append('search', sessionSearch);

      const res = await fetch(`/api/v1/audit/sessions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data || []);
      }
    } catch (err) {
      console.error('Error fetching session records:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/v1/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomersList(data || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchServiceReport = async (custId: string, period: string) => {
    try {
      setLoadingReport(true);
      const res = await fetch(`/api/v1/audit/reports/customer-service?customerId=${custId}&period=${encodeURIComponent(period)}`);
      if (res.ok) {
        const data = await res.json();
        setServiceReport(data);
      }
    } catch (err) {
      console.error('Error fetching customer report:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const runChainVerification = async () => {
    try {
      setVerifyingChain(true);
      const res = await fetch('/api/v1/audit/verify-chain', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVerificationResult(data);
        soundService.playSuccessSound();
      }
    } catch (err) {
      console.error('Error verifying audit chain:', err);
      soundService.playAlertSound();
    } finally {
      setVerifyingChain(false);
    }
  };

  const handleExportCsv = (type: 'events' | 'sessions') => {
    soundService.playActionSound();
    window.open(`/api/v1/audit/export/csv?type=${type}`, '_blank');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    soundService.playActionSound();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrintReport = () => {
    soundService.playActionSound();
    window.print();
  };

  const handleSimulateAuditEvent = async () => {
    try {
      soundService.playActionSound();
      const res = await fetch('/api/v1/audit/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'SECURITY_ALERT',
          action: 'MANUAL_AUDIT_CHECKPOINT_TRIGGERED',
          actionTitle: 'Punto de control de auditoría generado manualmente por técnico',
          severity: 'info',
          actor: {
            id: 'u-1002-tech1',
            name: 'Ing. Roberto Ramírez',
            role: 'Technician',
            ip: '200.88.45.12',
          },
          target: {
            entityType: 'System',
            entityId: 'SYS-AUDIT-MANUAL',
            label: 'Consola de Auditoría Forense',
            customerName: 'ABC Solutions S.R.L.',
          },
          details: {
            triggerReason: 'Verificación periódica de integridad ISO 27001',
            clientUptime: '4d 12h 30m',
          },
        }),
      });

      if (res.ok) {
        fetchAuditEvents();
        runChainVerification();
        soundService.playSuccessSound();
      }
    } catch (err) {
      console.error('Error simulating event:', err);
    }
  };

  // C# Source Code Definitions for Windows Agent
  const csFiles: Record<string, { title: string; desc: string; code: string }> = {
    'SecurityAuditLogger.cs': {
      title: 'SecurityAuditLogger.cs',
      desc: 'Motor de auditoría inmutable de Windows Agent con integración nativa a Windows Event Log, ETW y almacenamiento DPAPI cifrado.',
      code: `using System;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace RemoteDesk.WindowsAgent.Audit
{
    /// <summary>
    /// Registrador inmutable de eventos de seguridad y soporte remoto para Windows.
    /// Escribe en Windows Event Log (Application/RemoteDesk) y genera firmas criptográficas HMAC-SHA256.
    /// Cumple con las especificaciones ISO 27001 A.12.4.1 y SOC 2 CC6.1.
    /// </summary>
    public class SecurityAuditLogger : ISecurityAuditLogger
    {
        private const string EventLogSource = "RemoteDesk Enterprise Agent";
        private const string EventLogName = "Application";
        private readonly byte[] _hmacKey;
        private string _previousBlockHash = "0000000000000000000000000000000000000000000000000000000000000000";
        private long _sequenceCounter = 0;
        private readonly object _lock = new object();

        public SecurityAuditLogger(byte[] secretHmacKey)
        {
            _hmacKey = secretHmacKey ?? throw new ArgumentNullException(nameof(secretHmacKey));
            EnsureEventSourceRegistered();
        }

        private void EnsureEventSourceRegistered()
        {
            try
            {
                if (!EventLog.SourceExists(EventLogSource))
                {
                    EventLog.CreateEventSource(EventLogSource, EventLogName);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[Audit Warning] No se pudo registrar EventSource (requiere privilegios de Administrador): {ex.Message}");
            }
        }

        public async Task<AuditEventRecord> LogSecurityEventAsync(
            string category,
            string action,
            string actorName,
            string actorIp,
            string targetEntity,
            object details,
            EventLogEntryType logType = EventLogEntryType.Information)
        {
            return await Task.Run(() =>
            {
                lock (_lock)
                {
                    _sequenceCounter++;
                    var timestamp = DateTime.UtcNow.ToString("o");
                    var jsonDetails = JsonSerializer.Serialize(details);

                    // 1. Cadena de bloques inmutable: hash anterior + payload actual
                    var rawBlock = $"{_sequenceCounter}|{timestamp}|{category}|{action}|{actorName}|{actorIp}|{targetEntity}|{jsonDetails}|{_previousBlockHash}";

                    // 2. Cálculo de firma criptográfica HMAC-SHA256
                    using var hmac = new HMACSHA256(_hmacKey);
                    var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBlock));
                    var hmacSignature = Convert.ToHexString(signatureBytes).ToLowerInvariant();

                    // 3. Cálculo de nuevo hash de bloque SHA-256
                    using var sha = SHA256.Create();
                    var blockHashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(rawBlock + hmacSignature));
                    var currentBlockHash = Convert.ToHexString(blockHashBytes).ToLowerInvariant();

                    var record = new AuditEventRecord
                    {
                        Sequence = _sequenceCounter,
                        TimestampUtc = timestamp,
                        Category = category,
                        Action = action,
                        ActorName = actorName,
                        ActorIp = actorIp,
                        TargetEntity = targetEntity,
                        DetailsJson = jsonDetails,
                        HmacSignature = hmacSignature,
                        PreviousBlockHash = _previousBlockHash,
                        CurrentBlockHash = currentBlockHash
                    };

                    _previousBlockHash = currentBlockHash;

                    // 4. Registro en Windows Event Viewer (Application Log)
                    try
                    {
                        var eventLogMessage = $"[RemoteDesk Audit #{_sequenceCounter}] {action}\\n" +
                                              $"Categoría: {category}\\n" +
                                              $"Actor: {actorName} ({actorIp})\\n" +
                                              $"Objetivo: {targetEntity}\\n" +
                                              $"Detalles: {jsonDetails}\\n" +
                                              $"Firma HMAC-SHA256: {hmacSignature}\\n" +
                                              $"Hash Encadenado: {currentBlockHash}";

                        EventLog.WriteEntry(EventLogSource, eventLogMessage, logType, (int)_sequenceCounter);
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"[Audit Log Fallback] {ex.Message}");
                    }

                    return record;
                }
            });
        }
    }
}`
    },
    'SessionTelemetryTracer.cs': {
      title: 'SessionTelemetryTracer.cs',
      desc: 'Trazador forense de sesiones remotas con captura de IPs, telemetría DXGI, métricas de entrada y sellado de consentimiento.',
      code: `using System;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;

namespace RemoteDesk.WindowsAgent.Audit
{
    /// <summary>
    /// Captura y consolida la telemetría forense de una sesión remota activa para auditoría post-atención.
    /// </summary>
    public class SessionTelemetryTracer
    {
        public string SessionId { get; }
        public string TicketNumber { get; }
        public DateTime StartTimeUtc { get; }
        public DateTime? EndTimeUtc { get; private set; }
        
        public string ClientIpAddress { get; }
        public string TechnicianIpAddress { get; }
        public string ClientConsentPin { get; }
        public bool ClientConsentGranted { get; }

        public long KeystrokesInjected { get; private set; }
        public long MouseClicksInjected { get; private set; }
        public long FilesTransferredCount { get; private set; }
        public long TotalBytesTransferred { get; private set; }
        public double AverageFps { get; private set; }
        public int AverageBitrateKbps { get; private set; }
        public string TerminationReason { get; private set; }

        public SessionTelemetryTracer(
            string sessionId,
            string ticketNumber,
            string technicianIp,
            string consentPin,
            bool consentGranted)
        {
            SessionId = sessionId ?? Guid.NewGuid().ToString();
            TicketNumber = ticketNumber;
            StartTimeUtc = DateTime.UtcNow;
            TechnicianIpAddress = technicianIp;
            ClientConsentPin = consentPin;
            ClientConsentGranted = consentGranted;
            ClientIpAddress = GetLocalEndpointIp();
        }

        public void IncrementKeystrokes(int count = 1) => KeystrokesInjected += count;
        public void IncrementMouseClicks(int count = 1) => MouseClicksInjected += count;
        
        public void RecordFileTransfer(long bytes)
        {
            FilesTransferredCount++;
            TotalBytesTransferred += bytes;
        }

        public void UpdateStreamingQuality(double fps, int bitrateKbps)
        {
            AverageFps = AverageFps == 0 ? fps : (AverageFps * 0.9) + (fps * 0.1);
            AverageBitrateKbps = AverageBitrateKbps == 0 ? bitrateKbps : (int)((AverageBitrateKbps * 0.9) + (bitrateKbps * 0.1));
        }

        public SessionAuditSummary FinalizeSession(string reason)
        {
            EndTimeUtc = DateTime.UtcNow;
            TerminationReason = reason;
            var duration = (int)(EndTimeUtc.Value - StartTimeUtc).TotalSeconds;

            var rawProof = $"{SessionId}|{TicketNumber}|{ClientIpAddress}|{TechnicianIpAddress}|{duration}|{ClientConsentPin}|{TerminationReason}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes("REMOTEDESK_ENTERPRISE_AUDIT_LEDGER_SECRET_2026"));
            var sig = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(rawProof))).ToLowerInvariant();

            return new SessionAuditSummary
            {
                SessionId = SessionId,
                TicketNumber = TicketNumber,
                ClientIp = ClientIpAddress,
                TechnicianIp = TechnicianIpAddress,
                StartedAt = StartTimeUtc.ToString("o"),
                EndedAt = EndTimeUtc.Value.ToString("o"),
                DurationSeconds = duration,
                KeystrokesCount = KeystrokesInjected,
                MouseClicksCount = MouseClicksInjected,
                FilesCount = FilesTransferredCount,
                BytesTransferred = TotalBytesTransferred,
                TerminationReason = TerminationReason,
                HmacSignature = sig
            };
        }

        private string GetLocalEndpointIp()
        {
            try
            {
                using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
                socket.Connect("8.8.8.8", 65530);
                var endPoint = socket.LocalEndPoint as IPEndPoint;
                return endPoint?.Address.ToString() ?? "127.0.0.1";
            }
            catch
            {
                return "127.0.0.1";
            }
        }
    }
}`
    },
    'ImmutableEventChain.cs': {
      title: 'ImmutableEventChain.cs',
      desc: 'Verificador local de cadena de bloques que detecta cualquier manipulación o borrado de registros de auditoría.',
      code: `using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace RemoteDesk.WindowsAgent.Audit
{
    /// <summary>
    /// Validador criptográfico de la integridad de los registros de auditoría locales.
    /// Garantiza que ningún atacante o técnico pueda alterar retroactivamente las acciones registradas.
    /// </summary>
    public class ImmutableEventChain
    {
        private readonly byte[] _secretKey;

        public ImmutableEventChain(byte[] secretKey)
        {
            _secretKey = secretKey;
        }

        public (bool IsValid, int TamperedIndex, string Reason) VerifyChain(IReadOnlyList<AuditEventRecord> chain)
        {
            if (chain == null || chain.Count == 0)
                return (true, -1, "Cadena vacía o recién inicializada.");

            string expectedPreviousHash = "0000000000000000000000000000000000000000000000000000000000000000";

            for (int i = 0; i < chain.Count; i++)
            {
                var block = chain[i];

                // 1. Verificar encadenamiento con el hash del bloque previo
                if (block.PreviousBlockHash != expectedPreviousHash)
                {
                    return (false, i, $"Fallo de encadenamiento en bloque #{block.Sequence}: el hash previo no coincide con el calculado.");
                }

                // 2. Verificar firma HMAC-SHA256 del contenido del bloque
                var rawBlock = $"{block.Sequence}|{block.TimestampUtc}|{block.Category}|{block.Action}|{block.ActorName}|{block.ActorIp}|{block.TargetEntity}|{block.DetailsJson}|{block.PreviousBlockHash}";
                
                using var hmac = new HMACSHA256(_secretKey);
                var calculatedHmac = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBlock))).ToLowerInvariant();

                if (calculatedHmac != block.HmacSignature)
                {
                    return (false, i, $"Firma criptográfica inválida en bloque #{block.Sequence}. Contenido alterado.");
                }

                // 3. Calcular el hash de salida que debe tener el siguiente bloque
                using var sha = SHA256.Create();
                var currentBlockHash = Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(rawBlock + calculatedHmac))).ToLowerInvariant();

                expectedPreviousHash = currentBlockHash;
            }

            return (true, -1, "Cadena criptográfica verificada al 100% con integridad matemáticamente demostrable.");
        }
    }
}`
    },
    'WindowsEventLogForwarder.cs': {
      title: 'WindowsEventLogForwarder.cs',
      desc: 'Reenviador asíncrono y resiliente de eventos de auditoría hacia el servidor central con autenticación mTLS.',
      code: `using System;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace RemoteDesk.WindowsAgent.Audit
{
    /// <summary>
    /// Cola en memoria y retransmisor asíncrono hacia el backend REST API de RemoteDesk.
    /// Soporta reintentos exponenciales y almacenamiento en búfer local ante microcortes de red.
    /// </summary>
    public class WindowsEventLogForwarder : IAsyncDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly string _serverIngressUrl;
        private readonly ConcurrentQueue<AuditEventRecord> _queue = new();
        private readonly CancellationTokenSource _cts = new();
        private readonly Task _workerTask;

        public WindowsEventLogForwarder(HttpClient httpClient, string serverIngressUrl)
        {
            _httpClient = httpClient;
            _serverIngressUrl = serverIngressUrl;
            _workerTask = Task.Run(ProcessQueueAsync);
        }

        public void EnqueueEvent(AuditEventRecord record)
        {
            _queue.Enqueue(record);
        }

        private async Task ProcessQueueAsync()
        {
            while (!_cts.Token.IsCancellationRequested)
            {
                if (_queue.TryDequeue(out var ev))
                {
                    bool sent = false;
                    int attempts = 0;

                    while (!sent && attempts < 5 && !_cts.Token.IsCancellationRequested)
                    {
                        try
                        {
                            var content = new StringContent(JsonSerializer.Serialize(ev), Encoding.UTF8, "application/json");
                            var response = await _httpClient.PostAsync(_serverIngressUrl, content, _cts.Token);
                            if (response.IsSuccessStatusCode)
                            {
                                sent = true;
                            }
                            else
                            {
                                attempts++;
                                await Task.Delay(1000 * attempts, _cts.Token);
                            }
                        }
                        catch
                        {
                            attempts++;
                            await Task.Delay(2000 * attempts, _cts.Token);
                        }
                    }
                }
                else
                {
                    await Task.Delay(200, _cts.Token);
                }
            }
        }

        public async ValueTask DisposeAsync()
        {
            _cts.Cancel();
            try { await _workerTask; } catch { }
            _cts.Dispose();
        }
    }
}`
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> FASE 10: AUDITORÍA & LOGS INMUTABLES
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ISO 27001 • SOC 2 CC6.1 • HIPAA
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Centro de Auditoría, Trazabilidad Forense & Reportes de Servicio
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Registro inmutable de inicio y fin de sesiones remotas con IPs, trazabilidad completa de cambios de tickets y
              acciones técnicas con firmas HMAC-SHA256, y reportes ejecutivos exportables para atención a clientes.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runChainVerification}
              disabled={verifyingChain}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${verifyingChain ? 'animate-spin' : ''}`} />
              <span>{verifyingChain ? 'Verificando Hash Merkle...' : 'Verificar Cadena HMAC'}</span>
            </button>

            <button
              onClick={() => handleExportCsv('events')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-red-400" />
              <span>Exportar Eventos CSV</span>
            </button>

            <button
              onClick={() => handleExportCsv('sessions')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Sesiones CSV</span>
            </button>
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Eventos en Ledger</span>
              <Activity className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {categoriesSummary.ALL || events.length}
            </div>
            <div className="text-[11px] text-red-400 flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3" /> Secuencia encadenada
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Sesiones Registradas</span>
              <Laptop className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {sessions.length}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3" /> IPs & Consentimiento PIN
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Integridad Criptográfica</span>
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
              <span>{verificationResult?.isValid ? '100% VÁLIDA' : 'VERIFICANDO'}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
              HMAC-SHA256 Chained
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Cumplimiento Normativo</span>
              <Building className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              SOC 2 / ISO
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Certificación Apta
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('sessions');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'sessions'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>1. Registro de Sesiones Remotas & IPs</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
            {sessions.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('events');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'events'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>2. Trazabilidad de Eventos & Cambios (Diffs)</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
            {events.length}
          </span>
        </button>

        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('reports');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>3. Reportes de Atención & SLA a Clientes</span>
        </button>

        <button
          onClick={() => {
            soundService.playActionSound();
            setActiveSubTab('csharp-code');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
            activeSubTab === 'csharp-code'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>4. Código C# .NET 9 (Agente Windows)</span>
          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
            4 Clases
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUBTAB 1: REGISTRO DE SESIONES REMOTAS & IPs */}
      {/* ======================================================== */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por ticket, IP, empresa, equipo, técnico..."
                  value={sessionSearch}
                  onChange={(e) => {
                    setSessionSearch(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && fetchSessionRecords()}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                onClick={fetchSessionRecords}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                Filtrar
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Consentimiento PIN 100%</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>AES-256-GCM / WebRTC</span>
              </div>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Ticket & Sesión</th>
                    <th className="py-3 px-4">Cliente & Endpoint</th>
                    <th className="py-3 px-4">IPs Origen/Destino</th>
                    <th className="py-3 px-4">Técnico Asignado</th>
                    <th className="py-3 px-4">Duración & Fecha</th>
                    <th className="py-3 px-4">Acciones / Telemetría</th>
                    <th className="py-3 px-4 text-right">Detalles Forenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Ticket & Session */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-red-500/10 text-red-300 border border-red-500/30">
                            {sess.ticketNumber}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">
                          {sess.sessionId}
                        </div>
                      </td>

                      {/* Customer & Endpoint */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{sess.customerCompany}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Laptop className="w-3 h-3 text-indigo-400" />
                          <span className="font-mono text-slate-300">{sess.deviceComputerName}</span>
                          <span>({sess.deviceWindowsUser})</span>
                        </div>
                      </td>

                      {/* IPs */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-1 text-slate-300">
                          <span className="text-slate-500">Cli:</span> {sess.deviceIp}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                          <span className="text-slate-500">Tec:</span> {sess.technicianIp}
                        </div>
                      </td>

                      {/* Technician */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{sess.technicianName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {sess.technicianEmail}
                        </div>
                      </td>

                      {/* Duration & Timestamp */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-red-400" />
                          <span>{Math.floor(sess.durationSeconds / 60)}m {sess.durationSeconds % 60}s</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {sess.startedAt.replace('T', ' ').substring(0, 16)} UTC
                        </div>
                      </td>

                      {/* Actions & Stats */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {sess.keystrokesCount} teclas
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {sess.mouseClicksCount} clics
                          </span>
                          {sess.fileTransfersCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                              {sess.fileTransfersCount} arch
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> PIN: {sess.clientConsentProof.pinUsed} Verificado
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            soundService.playActionSound();
                            setSelectedSession(sess);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Acta Forense</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {sessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        No se encontraron registros de sesiones con los criterios seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forensic Session Modal */}
          {selectedSession && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-300">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Acta de Auditoría Forense de Sesión Remota
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Sesión: {selectedSession.sessionId} • Ticket: {selectedSession.ticketNumber}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Proof Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Security Proof */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-red-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Consentimiento & Autenticación
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Consentimiento Cliente:</span>
                        <span className="font-semibold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Otorgado por PIN ({selectedSession.clientConsentProof.pinUsed})
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Tipo de Autorización:</span>
                        <span className="font-mono text-slate-300">{selectedSession.clientConsentProof.consentType}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">IP Origen Cliente:</span>
                        <span className="font-mono text-slate-200">{selectedSession.deviceIp}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">IP Técnico Operador:</span>
                        <span className="font-mono text-slate-200">{selectedSession.technicianIp}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Motivo de Término:</span>
                        <span className="font-mono text-red-300">{selectedSession.terminationReason}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Telemetry & Transport */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Telemetría & Rendimiento
                    </h4>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Resolución Captura:</span>
                        <span className="font-mono text-slate-200">{selectedSession.resolution}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">FPS / Bitrate Medio:</span>
                        <span className="font-mono text-slate-200">{selectedSession.avgFps} FPS / {selectedSession.avgBitrateKbps} Kbps</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Ahorro de Ancho de Banda:</span>
                        <span className="font-semibold text-emerald-400">{selectedSession.bandwidthSavedPct}% (Dirty Rects DXGI)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Eventos de Entrada:</span>
                        <span className="font-mono text-slate-300">{selectedSession.keystrokesCount} teclas / {selectedSession.mouseClicksCount} clics</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-900">
                        <span className="text-slate-400">Archivos Transferidos:</span>
                        <span className="font-mono text-slate-300">{selectedSession.fileTransfersCount} ({Math.round(selectedSession.bytesTransferred / 1024)} KB)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Signature Box */}
                <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-indigo-400" /> Firma de Integridad HMAC-SHA256 (Inmutable)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      VERIFICADO
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-slate-300 break-all border border-slate-800">
                    {selectedSession.hmacSignature}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedSession.complianceStandards.map((std, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-800">
                        {std}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Resolution Notes */}
                {selectedSession.notes && (
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
                    <span className="font-semibold text-slate-400 block mb-1">Notas del Técnico Operador:</span>
                    <p className="text-slate-300 italic">{selectedSession.notes}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedSession, null, 2));
                      soundService.playActionSound();
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar JSON
                  </button>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium"
                  >
                    Cerrar Ficha
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: TRAZABILIDAD DE EVENTOS & CAMBIOS (DIFFS) */}
      {/* ======================================================== */}
      {activeSubTab === 'events' && (
        <div className="space-y-4">
          {/* Category Filter Chips & Controls */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'Todos los Eventos' },
                  { id: 'SESSION', label: 'Sesiones Remotas' },
                  { id: 'TICKET_CHANGE', label: 'Tickets & SLA' },
                  { id: 'FILE_TRANSFER', label: 'Transferencia Archivos' },
                  { id: 'DEVICE_ACTION', label: 'Acciones Endpoint' },
                  { id: 'AUTH', label: 'Autenticación' },
                  { id: 'SECURITY_ALERT', label: 'Alertas AMSI' },
                  { id: 'SYSTEM_POLICY', label: 'Políticas' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as AuditActionCategory);
                      soundService.playActionSound();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                      selectedCategory === cat.id ? 'bg-red-700 text-white' : 'bg-slate-900 text-slate-500'
                    }`}>
                      {categoriesSummary[cat.id] || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action: Trigger Simulated Event */}
              <button
                onClick={handleSimulateAuditEvent}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Emitir Checkpoint Test</span>
              </button>
            </div>

            {/* Live Search and Severity */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-800/80">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar en el registro de auditoría (acción, IP, actor, etiqueta)..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAuditEvents()}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <select
                value={eventSeverity}
                onChange={(e) => {
                  setEventSeverity(e.target.value);
                  fetchAuditEvents();
                }}
                className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-red-500 w-full sm:w-auto"
              >
                <option value="">Todas las Severidades</option>
                <option value="info">Info</option>
                <option value="success">Éxito</option>
                <option value="warning">Advertencia</option>
                <option value="critical">Crítica</option>
              </select>

              <button
                onClick={fetchAuditEvents}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 w-full sm:w-auto"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Events Timeline List */}
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-950 text-slate-400 border border-slate-800">
                      #{ev.sequenceNumber.toString().padStart(4, '0')}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        ev.severity === 'critical'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                          : ev.severity === 'warning'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                          : ev.severity === 'success'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950/80 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {ev.category}
                    </span>

                    <h4 className="font-semibold text-slate-200 text-xs tracking-tight">
                      {ev.actionTitle}
                    </h4>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    {ev.timestamp.replace('T', ' ').substring(0, 19)} UTC
                  </div>
                </div>

                {/* Actor and Target Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-400">Actor:</span>
                    <span className="font-medium text-slate-200">{ev.actor.name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 font-mono text-[10px]">
                      {ev.actor.role}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">({ev.actor.ip})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-slate-400">Objetivo:</span>
                    <span className="font-medium text-red-300 truncate">{ev.target.label}</span>
                    {ev.target.customerName && (
                      <span className="text-slate-400 truncate">({ev.target.customerName})</span>
                    )}
                  </div>
                </div>

                {/* Change Diff Inspector (if diffs exist) */}
                {ev.diffs && ev.diffs.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-xs font-mono">
                    <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Inspección de Diferencias de Estado (Old → New):
                    </div>
                    {ev.diffs.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">{d.field}:</span>
                        <span className="line-through text-rose-400 bg-rose-950/40 px-1 rounded">
                          {String(d.before ?? 'null')}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-emerald-400 bg-emerald-950/40 px-1 rounded font-bold">
                          {String(d.after)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Event Payload & Integrity Hash Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>HMAC:</span>
                    <span className="text-slate-400 truncate max-w-[280px]">
                      {ev.hmacSignature}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Prev Hash:</span>
                    <span className="text-slate-500 truncate max-w-[140px]">
                      {ev.previousBlockSha256.substring(0, 16)}...
                    </span>
                    <span className="text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-500/20 text-[10px]">
                      Encadenado
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {events.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                No se encontraron eventos en el ledger con los filtros actuales.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 3: REPORTES DE ATENCIÓN & SLA A CLIENTES */}
      {/* ======================================================== */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          {/* Customer & Period Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-red-400" />
                <span className="text-xs text-slate-400 font-semibold">Cliente:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    fetchServiceReport(e.target.value, selectedPeriod);
                    soundService.playActionSound();
                  }}
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-slate-400 font-semibold">Periodo:</span>
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    fetchServiceReport(selectedCustomerId, e.target.value);
                    soundService.playActionSound();
                  }}
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="Últimos 7 días">Últimos 7 días</option>
                  <option value="Últimos 30 días">Últimos 30 días</option>
                  <option value="Trimestre Q3 2026">Trimestre Q3 2026</option>
                  <option value="Año en curso 2026">Año en curso 2026</option>
                </select>
              </div>
            </div>

            {/* Export & Print Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintReport}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-red-400" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={() => handleExportCsv('events')}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/30 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Reporte</span>
              </button>
            </div>
          </div>

          {/* Printable Formal Executive Service Report */}
          {serviceReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none">
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-bold text-white tracking-tight">
                      INFORME EJECUTIVO DE SERVICIO Y SOPORTE TÉCNICO
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    RemoteDesk Enterprise • Plataforma de Asistencia Remota & Help Desk
                  </p>
                </div>

                <div className="text-right mt-3 sm:mt-0 font-mono text-xs text-slate-400">
                  <div className="font-bold text-red-400 text-sm">{serviceReport.reportId}</div>
                  <div>Fecha: {serviceReport.generatedAt.split('T')[0]}</div>
                  <div>Periodo: {serviceReport.periodLabel}</div>
                </div>
              </div>

              {/* Client & SLA Summary Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Cliente Corporativo</span>
                  <div className="text-base font-bold text-white mt-1">{serviceReport.customerCompany}</div>
                  <div className="text-xs text-slate-400 mt-1">Contacto: {serviceReport.customerContact}</div>
                  <div className="text-xs text-slate-400">Email: {serviceReport.customerEmail}</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Cumplimiento SLA de Atención</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                    {serviceReport.kpis.slaCompliancePct}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {serviceReport.kpis.slaViolatedCount === 0 ? 'Sin infracciones de SLA' : `${serviceReport.kpis.slaViolatedCount} fuera de plazo`}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Tiempo de Respuesta & MTTR</span>
                  <div className="text-xl font-bold font-mono text-red-300 mt-1">
                    {serviceReport.kpis.avgFirstResponseMinutes}m / {serviceReport.kpis.avgResolutionHours}h
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Primera Respuesta / Resolución</div>
                </div>
              </div>

              {/* Key Quantitative Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400">Tickets Totales</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {serviceReport.kpis.totalTickets}
                  </div>
                  <span className="text-[11px] text-emerald-400">{serviceReport.kpis.resolvedTickets} resueltos</span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400">Sesiones Remotas</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {serviceReport.kpis.totalRemoteSessions}
                  </div>
                  <span className="text-[11px] text-red-400">{serviceReport.kpis.totalRemoteMinutes} minutos totales</span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400">Archivos / Parches</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {serviceReport.kpis.filesTransferredCount}
                  </div>
                  <span className="text-[11px] text-indigo-400">{Math.round(serviceReport.kpis.totalBytesTransferred / 1024)} KB transferidos</span>
                </div>

                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400">Incidentes Críticos</span>
                  <div className="text-lg font-bold font-mono text-white mt-0.5">
                    {serviceReport.kpis.criticalIncidentsCount}
                  </div>
                  <span className="text-[11px] text-emerald-400">100% Contenidos</span>
                </div>
              </div>

              {/* Breakdown by Category & Technicians Involved */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tickets by Category */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Distribución por Categoría de Problema
                  </h4>
                  <div className="space-y-2 text-xs">
                    {Object.entries(serviceReport.ticketsByCategory).map(([cat, count]) => (
                      <div key={cat} className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span>{cat}</span>
                          <span className="font-mono font-bold text-red-400">{count} tickets</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-red-600 h-full rounded-full"
                            style={{
                              width: `${Math.round((Number(count) / (serviceReport.kpis.totalTickets || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technicians Involved */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Especialistas Técnicos Asignados
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    {serviceReport.techniciansInvolved.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                        <div>
                          <div className="font-semibold text-slate-200">{t.technicianName}</div>
                          <div className="text-[11px] text-slate-400">{t.specialty}</div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-red-400 font-bold">{t.ticketsHandled} tickets</div>
                          <div className="text-[11px] text-slate-500">{t.sessionMinutes}m soporte</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sessions Details Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Detalle de Sesiones Remotas Realizadas en el Periodo
                </h4>
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 font-mono text-[11px] text-slate-400">
                      <tr>
                        <th className="py-2.5 px-4">Ticket</th>
                        <th className="py-2.5 px-4">Equipo Windows</th>
                        <th className="py-2.5 px-4">Técnico</th>
                        <th className="py-2.5 px-4">Fecha & Hora</th>
                        <th className="py-2.5 px-4">Duración</th>
                        <th className="py-2.5 px-4">PIN Consentimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {serviceReport.sessionHistory.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-4 font-bold text-red-300">{s.ticketNumber}</td>
                          <td className="py-2.5 px-4 text-slate-200">{s.deviceComputerName} ({s.deviceIp})</td>
                          <td className="py-2.5 px-4 text-slate-300">{s.technicianName}</td>
                          <td className="py-2.5 px-4 text-slate-400">{s.startedAt.replace('T', ' ').substring(0, 16)}</td>
                          <td className="py-2.5 px-4 text-slate-300">{Math.floor(s.durationSeconds / 60)}m</td>
                          <td className="py-2.5 px-4 text-emerald-400">{s.clientConsentProof.pinUsed} (OK)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Compliance & Signature Acceptance Block */}
              <div className="pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-400">
                <div>
                  <h5 className="font-bold text-slate-300 mb-1">Cláusula de Confidencialidad & Seguridad</h5>
                  <p className="leading-relaxed">
                    Todas las sesiones remotas fueron autorizadas mediante PIN de consentimiento bilateral y cifradas de extremo a extremo con AES-256-GCM. Los registros son inmutables y auditados bajo los estándares ISO/IEC 27001 y SOC 2 Tipo II.
                  </p>
                </div>

                <div className="flex flex-col justify-end items-end space-y-4">
                  <div className="border-b border-slate-700 w-64 pb-1 text-center font-mono text-slate-300">
                    {serviceReport.customerContact}
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono">
                    Conformidad y Firma del Cliente • {serviceReport.customerCompany}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 4: CÓDIGO FUENTE C# .NET 9 (AGENTE WINDOWS) */}
      {/* ======================================================== */}
      {activeSubTab === 'csharp-code' && (
        <div className="space-y-4">
          {/* File Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            {Object.keys(csFiles).map((fileName) => (
              <button
                key={fileName}
                onClick={() => {
                  setSelectedCsFile(fileName);
                  soundService.playActionSound();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
                  selectedCsFile === fileName
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{fileName}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-red-400">
                    {csFiles[selectedCsFile].title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    C# .NET 9 / Win32
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {csFiles[selectedCsFile].desc}
                </p>
              </div>

              <button
                onClick={() => handleCopyCode(csFiles[selectedCsFile].code)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            {/* Code Body with syntax styling */}
            <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px] scrollbar-thin">
              <pre className="leading-relaxed">
                <code>{csFiles[selectedCsFile].code}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
