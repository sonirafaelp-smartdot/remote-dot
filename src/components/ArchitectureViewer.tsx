import React, { useState } from 'react';
import { 
  Server, 
  Layers, 
  FolderTree, 
  Network, 
  Database, 
  KeyRound, 
  HelpCircle, 
  MonitorPlay, 
  PowerOff,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Terminal,
  FileCode
} from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<number>(1);

  const sections = [
    { id: 1, title: '1. Arquitectura General', icon: Layers },
    { id: 2, title: '2. Estructura de Carpetas', icon: FolderTree },
    { id: 3, title: '3. Componentes del Sistema', icon: Server },
    { id: 4, title: '4. Flujo de Comunicación', icon: Network },
    { id: 5, title: '5. Modelo de Base de Datos', icon: Database },
    { id: 6, title: '6. Flujo de Autenticación', icon: KeyRound },
    { id: 7, title: '7. Flujo de Solicitud de Soporte', icon: HelpCircle },
    { id: 8, title: '8. Flujo de Conexión Remota', icon: MonitorPlay },
    { id: 9, title: '9. Flujo de Cierre de Sesión', icon: PowerOff },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                FASE 1 COMPLETADA
              </span>
              <span className="text-xs text-slate-400">Especificación de Arquitectura de Sistema & Backend</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">
              Arquitectura Integral: RemoteDesk Enterprise
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Diseño estructural de alto rendimiento para Windows Client Agent (C# / WPF / Service), Servidor Central (ASP.NET Core / Node REST & WebSockets, PostgreSQL) y Consola de Técnico.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400">Protocolo de Transporte</div>
              <div className="text-sm font-semibold text-sky-400">TLS 1.3 + WebRTC + WSS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`p-3 rounded-lg text-left transition-all border flex flex-col justify-between ${
                isActive
                  ? 'bg-sky-950/60 border-sky-500/60 text-sky-200 shadow-md shadow-sky-950/40'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span className="text-[10px] font-mono opacity-60">0{sec.id}</span>
              </div>
              <span className="text-xs font-medium line-clamp-1">{sec.title.replace(/^\d+\.\s*/, '')}</span>
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-200 shadow-sm">
        {/* Section 1: General Architecture */}
        {activeSection === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-400" />
                1. Arquitectura General del Sistema
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Topología de 3 capas desacoplada y orientada a eventos con cifrado de extremo a extremo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                </div>
                <h4 className="font-semibold text-slate-100 text-base mb-1">Capa 1: Agente Windows</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Aplicación nativa C# .NET / Windows Service y GUI WPF con baja huella de memoria (&lt;35MB RAM).
                </p>
                <ul className="text-xs space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Identificador HWID único</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Telemetría (CPU, RAM, Discos)</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Captura Desktop Duplication API</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Consentimiento explícito UI</li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5">
                <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
                  <Server className="w-5 h-5 text-sky-400" />
                </div>
                <h4 className="font-semibold text-slate-100 text-base mb-1">Capa 2: Servidor Central</h4>
                <p className="text-xs text-slate-400 mb-3">
                  ASP.NET Core 8 / REST API & SignalR/WebSocket con base de datos PostgreSQL 16.
                </p>
                <ul className="text-xs space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Hub de señalización en tiempo real</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Autenticación JWT & RBAC</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Motor de tickets y asignaciones</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Servidor Relay / TURN para NAT bypass</li>
                </ul>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-5">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <MonitorPlay className="w-5 h-5 text-emerald-400" />
                </div>
                <h4 className="font-semibold text-slate-100 text-base mb-1">Capa 3: Consola Técnico</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Dashboard de administración de clientes, computadoras remotas y visor WebRTC / H.264 interactivo.
                </p>
                <ul className="text-xs space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Notificaciones instantáneas (Popups)</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Visor remoto interactivo (Mouse/Teclado)</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Gestor de transferencia de archivos</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Control de resolución y bitrate</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Principio de Seguridad Cero Confianza (Zero-Trust):</strong> El servidor actúa como intermediario de control, señalización y auditoría. Ningún técnico puede iniciar captura ni inyectar eventos de entrada (mouse/teclado) sin que el usuario local en Windows presione <span className="text-emerald-400 font-medium">"AUTORIZAR SESIÓN"</span>. Todo evento queda registrado con SHA-256 en la tabla de auditoría.
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Folder Structure */}
        {activeSection === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-sky-400" />
                2. Estructura de Carpetas del Proyecto
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Estructura modular limpia dividida en Backend, Client Agent, Technician Console y Base de Datos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300">
                <div className="text-sky-400 font-bold mb-2 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4" /> Servidor Backend (ASP.NET Core / Node API)
                </div>
                <pre className="text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
{`├── backend/
│   ├── database/
│   │   ├── schema.sql           <- DDL PostgreSQL
│   │   ├── db.ts                <- Repository & Seed Store
│   │   └── entities.ts          <- Types & Enums
│   ├── models_csharp/
│   │   └── RemoteDeskDbContext.cs <- EF Core Models
│   ├── routes/
│   │   ├── auth.ts              <- Login & JWT
│   │   ├── customers.ts         <- Clientes & Empresas
│   │   ├── devices.ts           <- Registro & HWID
│   │   ├── tickets.ts           <- Solicitudes de Soporte
│   │   ├── sessions.ts          <- Sesiones Remotas
│   │   ├── audit.ts             <- Logs de Auditoría
│   │   └── health.ts            <- Diagnóstico
│   └── server.ts                <- Express + WebSockets Hub`}
                </pre>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300">
                <div className="text-emerald-400 font-bold mb-2 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4" /> Agente Windows & Consola Técnico (C#)
                </div>
                <pre className="text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
{`├── client_agent_windows/
│   ├── src/
│   │   ├── Service/             <- Windows Background Service
│   │   ├── UI/                  <- WPF System Tray & Dialogs
│   │   ├── Capture/             <- DXGI Desktop Duplication
│   │   ├── Input/               <- SendInput Mouse/Keyboard
│   │   └── Network/             <- SignalR Client & WebRTC
│   └── installer/               <- InnoSetup / WiX MSI Script
│
├── technician_console_windows/
│   ├── src/
│   │   ├── Dashboard/           <- Help Desk & Live Queues
│   │   ├── RemoteViewer/        <- WebRTC Renderer & Control
│   │   ├── FileTransfer/        <- Chunked SFTP/WebSockets
│   │   └── AuditViewer/         <- Logs & History Explorer`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Components */}
        {activeSection === 3 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-sky-400" />
                3. Componentes Principales del Ecosistema
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Responsabilidades técnicas exactas de cada pieza del software.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                <div className="font-bold text-indigo-400 text-sm mb-2">1. Agente Cliente Windows</div>
                <p className="text-slate-400 mb-3">
                  Se ejecuta como servicio en segundo plano con interfaz accesible desde la barra de tareas (Tray Icon).
                </p>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">Hardware Telemetry:</strong> Obtiene CPU, RAM, Windows Build, IP local y espacio en disco vía WMI y System.Management.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">DXGI Duplication:</strong> Captura ultra rápida a 60 FPS por GPU sin parpadeo de pantalla.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">User Consent Guard:</strong> Diálogo modal no bloqueante con PIN de 6 dígitos o botón de aprobación explícita.
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                <div className="font-bold text-sky-400 text-sm mb-2">2. Servidor Central</div>
                <p className="text-slate-400 mb-3">
                  Punto neurálgico de orquestación, base de datos y pasarela de señalización en la nube o red corporativa.
                </p>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">SignalR / WS Hub:</strong> Difusión de eventos de tickets nuevos, cambios de estado y latidos (heartbeats).
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">Security Gatekeeper:</strong> Emisión de tokens de sesión temporales con caducidad forzada y HMAC.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">TURN / STUN Relay:</strong> Garantiza conexión incluso si el cliente está detrás de CGNAT o firewall estricto.
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
                <div className="font-bold text-emerald-400 text-sm mb-2">3. Consola del Técnico</div>
                <p className="text-slate-400 mb-3">
                  Panel de control de alta densidad para mesa de ayuda (Help Desk) y operación remota.
                </p>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">Live Ticket Queue:</strong> Alertas sonoras y visuales con badges de prioridad (Crítica, Alta, Media, Baja).
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">Remote Canvas:</strong> Transmisión de video de baja latencia (&lt;50ms) con mapeo de coordenadas relativas de mouse y teclas modificadoras.
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <strong className="text-slate-200">File Explorer Remoto:</strong> Carga y descarga de parches, logs y scripts de solución.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Communication Flow */}
        {activeSection === 4 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-sky-400" />
                4. Flujo de Comunicación y Protocolos
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Interacción entre sockets persistentes, APIs REST y túneles de streaming.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-center">
                <div className="bg-indigo-950/50 border border-indigo-500/30 p-2.5 rounded">
                  <span className="text-indigo-300 font-bold block">CLIENTE WINDOWS</span>
                  <span className="text-[10px] text-slate-400">Agent Service (Puerto Efímero)</span>
                </div>
                <div className="bg-sky-950/50 border border-sky-500/30 p-2.5 rounded">
                  <span className="text-sky-300 font-bold block">SERVIDOR CENTRAL</span>
                  <span className="text-[10px] text-slate-400">HTTPS (443) / WSS (443) / STUN</span>
                </div>
                <div className="bg-emerald-950/50 border border-emerald-500/30 p-2.5 rounded">
                  <span className="text-emerald-300 font-bold block">CONSOLA TÉCNICO</span>
                  <span className="text-[10px] text-slate-400">Dashboard & Viewer</span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-900/80 p-4 rounded border border-slate-800/80">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center text-[11px]">1</span>
                  <span><strong>Heartbeat Periódico (cada 30s):</strong> Cliente → Servidor (REST POST /api/v1/devices/:id/heartbeat o WebSocket ping).</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center text-[11px]">2</span>
                  <span><strong>Solicitud de Soporte:</strong> Cliente emite ticket → Servidor guarda en PostgreSQL y difunde <code className="text-amber-400">TICKET_CREATED</code> vía WebSocket a todos los técnicos conectados.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center text-[11px]">3</span>
                  <span><strong>Aceptación de Técnico:</strong> Técnico llama <code className="text-sky-400">POST /api/v1/tickets/:id/assign</code> → Servidor genera <code className="text-emerald-400">session_token</code> único.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center text-[11px]">4</span>
                  <span><strong>WebRTC Handshake:</strong> Intercambio de SDP Offers/Answers e ICE Candidates vía Servidor de Señalización.</span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center text-[11px]">5</span>
                  <span><strong>Túnel Directo Peer-to-Peer:</strong> Video H.264 por UDP cifrado con DTLS/SRTP y canal de datos SCTP para mouse/teclado.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 5: Database Model */}
        {activeSection === 5 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-400" />
                5. Modelo Relacional de Base de Datos (PostgreSQL)
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Estructura de 7 tablas normalizadas con claves primarias UUID, llaves foráneas e integridad referencial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-bold text-sky-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>users</span>
                  <span className="text-[10px] text-slate-500 font-mono">Tabla Auth</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-amber-400 font-bold">id</span> (UUID PK)</div>
                  <div>email (VARCHAR 255 UNIQUE)</div>
                  <div>password_hash (VARCHAR 255)</div>
                  <div>full_name (VARCHAR 150)</div>
                  <div>role (ENUM: Admin, Tech, Cust)</div>
                  <div>is_active (BOOLEAN)</div>
                  <div>created_at, updated_at</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-bold text-indigo-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>technicians</span>
                  <span className="text-[10px] text-slate-500 font-mono">Tabla Perfil</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-amber-400 font-bold">id</span> (UUID PK)</div>
                  <div><span className="text-sky-400 font-semibold">user_id</span> (UUID FK → users)</div>
                  <div>specialty (VARCHAR 100)</div>
                  <div>is_online (BOOLEAN)</div>
                  <div>max_concurrent_sessions (INT)</div>
                  <div>created_at, updated_at</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>customers</span>
                  <span className="text-[10px] text-slate-500 font-mono">Tabla Empresas</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-amber-400 font-bold">id</span> (UUID PK)</div>
                  <div>company_name (VARCHAR 200)</div>
                  <div>contact_name (VARCHAR 150)</div>
                  <div>phone (VARCHAR 50)</div>
                  <div>email (VARCHAR 255)</div>
                  <div>address (TEXT)</div>
                  <div>is_active (BOOLEAN)</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-bold text-red-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>devices</span>
                  <span className="text-[10px] text-slate-500 font-mono">Tabla Equipos</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-amber-400 font-bold">id</span> (UUID PK)</div>
                  <div><span className="text-sky-400 font-semibold">customer_id</span> (UUID FK)</div>
                  <div>device_uuid (VARCHAR UNIQUE)</div>
                  <div>computer_name (VARCHAR 100)</div>
                  <div>windows_user (VARCHAR 100)</div>
                  <div>os_version (VARCHAR 150)</div>
                  <div>cpu, ram_mb, storage_info</div>
                  <div>ip_address, is_online, last_heartbeat</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>support_tickets</span>
                  <span className="text-[10px] text-slate-500 font-mono">Tabla Tickets</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-amber-400 font-bold">id</span> (UUID PK)</div>
                  <div>ticket_number (VARCHAR 30 UNIQUE)</div>
                  <div><span className="text-sky-400 font-semibold">customer_id</span> (FK)</div>
                  <div><span className="text-sky-400 font-semibold">device_id</span> (FK)</div>
                  <div><span className="text-sky-400 font-semibold">technician_id</span> (FK NULL)</div>
                  <div>priority (Baja, Media, Alta, Crítica)</div>
                  <div>status (Pendiente..Resuelto)</div>
                  <div>resolution_notes (TEXT)</div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="font-bold text-fuchsia-400 border-b border-slate-800 pb-1 mb-2 flex justify-between">
                  <span>remote_sessions</span>
                  <span className="text-[10px] text-slate-500 font-mono">Tabla Sesiones</span>
                </div>
                <div className="space-y-1 font-mono text-[11px]">
                  <div><span className="text-amber-400 font-bold">id</span> (UUID PK)</div>
                  <div><span className="text-sky-400 font-semibold">ticket_id, device_id, tech_id</span></div>
                  <div>session_token (VARCHAR 255 UNIQUE)</div>
                  <div>status (Esperando..Finalizada)</div>
                  <div>authorized_by_client (BOOLEAN)</div>
                  <div>started_at, ended_at, duration</div>
                  <div>client_ip, technician_ip</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 6: Auth Flow */}
        {activeSection === 6 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-sky-400" />
                6. Flujo de Autenticación y Autorización
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Seguridad basada en JWT + RBAC (Roles: Admin, Technician, Customer) y HWID Binding.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">1</div>
                <div>
                  <h4 className="font-semibold text-white">Login del Técnico / Administrador</h4>
                  <p className="text-slate-400 mt-0.5">El técnico ingresa email y contraseña. El backend valida el hash Argon2/BCrypt, genera un JWT con expiración de 8 horas y registra el inicio de sesión en <code className="text-sky-400">audit_logs</code>.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">2</div>
                <div>
                  <h4 className="font-semibold text-white">Registro de Dispositivo Windows (HWID Binding)</h4>
                  <p className="text-slate-400 mt-0.5">El agente genera un UUID determinista combinando Motherboard Serial + CPU ID + MAC Address. El servidor valida la suscripción del cliente y asigna una clave de API de dispositivo con firma HMAC.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">3</div>
                <div>
                  <h4 className="font-semibold text-white">Token Temporal de Sesión Remota</h4>
                  <p className="text-slate-400 mt-0.5">Cuando se establece una sesión, se emite un <code className="text-emerald-400">SessionToken</code> firmado de un solo uso válido por 10 minutos de handshake y revocable al instante.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 7: Support Request Flow */}
        {activeSection === 7 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                7. Flujo de Solicitud de Soporte (Help Desk)
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Desde que el usuario en Windows hace clic en "SOLICITAR SOPORTE" hasta la alerta en la consola del técnico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-sky-400 font-bold mb-1">Paso 1: Solicitud</div>
                <p className="text-slate-300">El cliente abre la ventana, escribe la falla (ej: "No puedo abrir facturación") y elige la prioridad (Crítica/Alta/Media/Baja).</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-amber-400 font-bold mb-1">Paso 2: Registro</div>
                <p className="text-slate-300">El servidor crea el Ticket #TICK-000125, adjunta telemetría del equipo y cambia el estado del cliente a "Esperando técnico".</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-emerald-400 font-bold mb-1">Paso 3: Alerta en Tiempo Real</div>
                <p className="text-slate-300">La consola del técnico emite un popup sonoro con datos de Empresa, Equipo, Problema y dos botones: [ACEPTAR] / [RECHAZAR].</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <div className="text-indigo-400 font-bold mb-1">Paso 4: Asignación</div>
                <p className="text-slate-300">El técnico acepta el ticket. El sistema asigna el técnico y prepara el handshake de conexión remota.</p>
              </div>
            </div>
          </div>
        )}

        {/* Section 8: Remote Connection Flow */}
        {activeSection === 8 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-sky-400" />
                8. Flujo de Conexión Remota Segura y Autorizada
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Protocolo sin acceso oculto: autorización expresa del cliente y visualización continua.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" /> Garantía de Consentimiento Visible
              </div>
              <p>
                1. El técnico presiona <strong>"INICIAR SESIÓN REMOTA"</strong>.
                <br />
                2. En la pantalla del cliente aparece una alerta prominente: <span className="text-white font-medium">"El técnico Ing. Roberto Ramírez solicita control remoto para resolver su ticket #TICK-000125. ¿Desea permitir el acceso?"</span>
                <br />
                3. Solo tras presionar <strong>"PERMITIR ACCESO"</strong> el agente activa el capturador DXGI y el receptor de teclado/mouse.
                <br />
                4. Durante toda la sesión aparece un banner verde/azul persistente con: <strong>"Técnico Conectado (Ing. Roberto Ramírez)"</strong> y el botón <strong>"FINALIZAR SOPORTE"</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Section 9: Session Closure */}
        {activeSection === 9 && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PowerOff className="w-5 h-5 text-sky-400" />
                9. Flujo de Cierre de Sesión y Auditoría
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Terminación bilateral instantánea, cálculo de duración y notas de resolución.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h4 className="font-bold text-rose-400 mb-1">1. Terminación Inmediata</h4>
                <p className="text-slate-400">Si el cliente o el técnico pulsan "FINALIZAR SOPORTE", el socket y canal WebRTC se destruyen inmediatamente en ambos extremos.</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">2. Registro de Métricas</h4>
                <p className="text-slate-400">Se guarda hora exacta de inicio, fin, duración en segundos, IP de origen/destino y resolución empleada.</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h4 className="font-bold text-emerald-400 mb-1">3. Cierre de Ticket</h4>
                <p className="text-slate-400">El técnico ingresa las notas de solución aplicada y el ticket pasa a estado "Resuelto / Cerrado".</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
