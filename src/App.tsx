import React, { useState, useEffect } from 'react';
import { 
  Laptop,
  Layers, 
  KeyRound,
  Database, 
  Terminal, 
  Activity, 
  Compass, 
  HardDrive,
  Server,
  Ticket,
  Radio,
  Bell,
  LayoutDashboard,
  Monitor,
  DownloadCloud,
  ShieldCheck,
  Package,
  Zap,
  Users,
  MessageSquare,
  ChevronDown,
  Grid,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { ActiveTab, RealtimeNotification } from './types.ts';
import { TechnicianConsoleView } from './components/TechnicianConsoleView.tsx';
import { SecureRemoteControlView } from './components/SecureRemoteControlView.tsx';
import { FileTransferView } from './components/FileTransferView.tsx';
import { InstallerGeneratorView } from './components/InstallerGeneratorView.tsx';
import { TestingAndHardeningView } from './components/TestingAndHardeningView.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { RealtimeNotificationsView } from './components/RealtimeNotificationsView.tsx';
import { NotificationToastStack } from './components/NotificationToastStack.tsx';
import { TicketSystemView } from './components/TicketSystemView.tsx';
import { WindowsAgentView } from './components/WindowsAgentView.tsx';
import { ArchitectureViewer } from './components/ArchitectureViewer.tsx';
import { AuthManager } from './components/AuthManager.tsx';
import { CustomersAndDevicesView } from './components/CustomersAndDevicesView.tsx';
import { DatabaseExplorer } from './components/DatabaseExplorer.tsx';
import { ApiTester } from './components/ApiTester.tsx';
import { ServerHealthView } from './components/ServerHealthView.tsx';
import { PhaseRoadmap } from './components/PhaseRoadmap.tsx';
import { SmartDotLogo } from './components/SmartDotLogo.tsx';
import { WhatsAppIntegrationView } from './components/WhatsAppIntegrationView.tsx';
import { SmartDotSuiteMenu, SMARTDOT_APPS } from './components/SmartDotSuiteMenu.tsx';
import { DotBillInvoicingView } from './components/DotBillInvoicingView.tsx';
import { DotCrmClientsView } from './components/DotCrmClientsView.tsx';
import { DotVisionSurveillanceView } from './components/DotVisionSurveillanceView.tsx';
import { DotSmartHomeView } from './components/DotSmartHomeView.tsx';
import { SmartDotAppId } from './types.ts';
import { realtimeSocket } from './services/realtimeSocket.ts';

export default function App() {
  const [currentApp, setCurrentApp] = useState<SmartDotAppId>('dotdesk');
  const [suiteMenuOpen, setSuiteMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('technician-console');
  const [socketStatus, setSocketStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>(
    realtimeSocket.getConnectionState()
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const activeAppMeta = SMARTDOT_APPS.find((a) => a.id === currentApp) || SMARTDOT_APPS[0];

  useEffect(() => {
    const unsubStatus = realtimeSocket.subscribeStatus((status) => {
      setSocketStatus(status);
    });

    const unsubEvents = realtimeSocket.onAny(() => {
      setUnreadCount((c) => c + 1);
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'notifications') {
      setUnreadCount(0);
    }
  };

  const navItems = [
    { id: 'technician-console' as ActiveTab, label: 'Consola del Técnico', icon: LayoutDashboard, badge: 'Fase 7' },
    { id: 'secure-remote-control' as ActiveTab, label: 'Escritorio Remoto (DXGI)', icon: Monitor, badge: 'Fase 8' },
    { id: 'file-transfer' as ActiveTab, label: 'Transferencia de Archivos', icon: DownloadCloud, badge: 'Fase 9' },
    { id: 'installer-generator' as ActiveTab, label: 'Instaladores MSI / Win32', icon: Package, badge: 'Fase 11' },
    { id: 'testing-suite' as ActiveTab, label: 'Pruebas & Hardening', icon: Zap, badge: 'Fase 12' },
    { id: 'audit-logs' as ActiveTab, label: 'Logs y Auditoría Forense', icon: ShieldCheck, badge: 'Fase 10' },
    { id: 'notifications' as ActiveTab, label: 'Notificaciones en Vivo', icon: Radio, badge: 'Fase 6' },
    { id: 'whatsapp' as ActiveTab, label: 'Alertas WhatsApp', icon: MessageSquare, badge: 'Móvil' },
    { id: 'tickets' as ActiveTab, label: 'Sistema de Tickets & SLA', icon: Ticket, badge: 'Fase 5' },
    { id: 'windows-agent' as ActiveTab, label: 'Agente Windows (Cliente)', icon: Laptop, badge: 'Fase 4' },
    { id: 'customers-devices' as ActiveTab, label: 'Clientes & Dispositivos HWID', icon: HardDrive, badge: 'Fase 3' },
    { id: 'auth' as ActiveTab, label: 'Técnicos & Autenticación', icon: Users, badge: 'Equipo' },
    { id: 'architecture' as ActiveTab, label: 'Arquitectura y Flujos', icon: Layers, badge: '9 Flujos' },
    { id: 'database' as ActiveTab, label: 'Base de Datos & Esquema', icon: Database, badge: 'PostgreSQL' },
    { id: 'api-playground' as ActiveTab, label: 'Pruebas de API REST', icon: Terminal, badge: 'V1 API' },
    { id: 'server-health' as ActiveTab, label: 'Diagnóstico Backend', icon: Activity, badge: 'Live' },
    { id: 'roadmap' as ActiveTab, label: 'Hoja de Ruta (12 Fases)', icon: Compass, badge: '100% Completo' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-red-600 selection:text-white">
      {/* Global Realtime Toast Stack */}
      <NotificationToastStack onNavigateToTab={handleTabChange} />

      {/* Top Navbar with App Switcher */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative">
          {/* SmartDot Logo Button with Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setSuiteMenuOpen(!suiteMenuOpen)}
              className="flex items-center gap-3.5 group text-left hover:bg-slate-800/60 p-1.5 -ml-1.5 rounded-xl transition-all"
              title="Haz clic para abrir el menú de aplicaciones SmartDot Suite"
            >
              {/* Foto 7.png Official Brand Logo (Server Stack in Red Circle) */}
              <div className="relative">
                <SmartDotLogo className="w-10 h-10 group-hover:scale-105 transition-transform" showBadge={socketStatus === 'connected'} />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-slate-300">
                  <Grid className="w-2.5 h-2.5" />
                </div>
              </div>
              
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <div className="flex items-baseline tracking-tight font-black text-lg">
                    <span className="text-white font-extrabold tracking-tight">SMARTDOT</span>
                    <span className={`font-black ml-1.5 text-sm tracking-widest ${
                      currentApp === 'dotdesk' ? 'text-red-500' : currentApp === 'dotbill' ? 'text-emerald-500' : currentApp === 'dotcrm' ? 'text-blue-500' : 'text-amber-500'
                    }`}>•</span>
                    <span className="text-slate-100 font-bold ml-1.5 text-sm">
                      {currentApp === 'dotdesk' ? 'DESK' : currentApp === 'dotbill' ? 'BILL' : currentApp === 'dotcrm' ? 'CRM' : 'VISION'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    currentApp === 'dotdesk'
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : currentApp === 'dotbill'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : currentApp === 'dotcrm'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {currentApp === 'dotdesk' ? 'ENTERPRISE' : currentApp === 'dotbill' ? 'INVOICING' : currentApp === 'dotcrm' ? 'CLIENTS' : 'SURVEILLANCE'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${suiteMenuOpen ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-1.5">
                  <span>{activeAppMeta.tagline}</span>
                  <span className="text-[10px] text-slate-600">• Suite (Clic para cambiar)</span>
                </p>
              </div>
            </button>

            {/* SmartDot Suite Dropdown Menu */}
            <SmartDotSuiteMenu
              currentApp={currentApp}
              onSelectApp={(appId) => setCurrentApp(appId)}
              isOpen={suiteMenuOpen}
              onClose={() => setSuiteMenuOpen(false)}
            />
          </div>

          {/* Quick System Badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {currentApp !== 'dotdesk' && (
              <button
                onClick={() => setCurrentApp('dotdesk')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">Volver a DOTDESK</span>
              </button>
            )}

            {/* Live WebSocket Status Pill */}
            <button
              onClick={() => {
                setCurrentApp('dotdesk');
                handleTabChange('notifications');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors shadow-inner"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  socketStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : socketStatus === 'reconnecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-medium">
                {socketStatus === 'connected' ? 'WebSocket Live' : socketStatus === 'reconnecting' ? 'Reconectando' : 'Offline'}
              </span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white font-bold text-[10px] animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>SmartDot Cloud OK</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Only shown when DOTDESK is active) */}
        {currentApp === 'dotdesk' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto space-x-1 border-t border-slate-800/70 scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`py-3 px-3.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                    isActive
                      ? 'border-red-500 text-red-400 bg-red-950/20 shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isActive ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dedicated SMARTDOT BILL View */}
        {currentApp === 'dotbill' && <DotBillInvoicingView />}

        {/* Dedicated SMARTDOT CRM View */}
        {currentApp === 'dotcrm' && <DotCrmClientsView />}

        {/* Dedicated SMARTDOT VISION View */}
        {currentApp === 'dotvision' && <DotVisionSurveillanceView />}

        {/* Dedicated SMARTDOT HOME View */}
        {currentApp === 'dotshome' && <DotSmartHomeView />}

        {/* SMARTDOT DESK (Full 12-Phase Remote Support & Help Desk Suite) */}
        {currentApp === 'dotdesk' && (
          <>
            {activeTab === 'technician-console' && (
              <TechnicianConsoleView
                onNavigateToRemoteControl={() => handleTabChange('secure-remote-control')}
              />
            )}
            {activeTab === 'secure-remote-control' && (
              <SecureRemoteControlView
                onOpenTickets={() => handleTabChange('tickets')}
              />
            )}
            {activeTab === 'file-transfer' && <FileTransferView />}
            {activeTab === 'installer-generator' && <InstallerGeneratorView />}
            {activeTab === 'testing-suite' && <TestingAndHardeningView />}
            {activeTab === 'audit-logs' && <AuditLogView />}
            {activeTab === 'notifications' && <RealtimeNotificationsView />}
            {activeTab === 'whatsapp' && <WhatsAppIntegrationView />}
            {activeTab === 'tickets' && <TicketSystemView />}
            {activeTab === 'windows-agent' && <WindowsAgentView />}
            {activeTab === 'customers-devices' && <CustomersAndDevicesView />}
            {activeTab === 'auth' && <AuthManager />}
            {activeTab === 'architecture' && <ArchitectureViewer />}
            {activeTab === 'database' && <DatabaseExplorer />}
            {activeTab === 'api-playground' && <ApiTester />}
            {activeTab === 'server-health' && <ServerHealthView />}
            {activeTab === 'roadmap' && <PhaseRoadmap />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-500 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SmartDotLogo className="w-6 h-6" />
            <div>
              <span className="font-semibold text-slate-200">{activeAppMeta.name}</span>
              <span className="text-slate-400 ml-1.5">• SmartDot Cloud Suite Enterprise</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setCurrentApp('dotdesk')} className="hover:text-red-400 transition-colors">DOTDESK (Soporte)</button>
            <span>•</span>
            <button onClick={() => setCurrentApp('dotbill')} className="hover:text-emerald-400 transition-colors">DOTBILL (Facturación)</button>
            <span>•</span>
            <button onClick={() => setCurrentApp('dotcrm')} className="hover:text-blue-400 transition-colors">DOTCRM (Clientes)</button>
            <span>•</span>
            <button onClick={() => setCurrentApp('dotvision')} className="hover:text-amber-400 transition-colors">DOTVISION (CCTV)</button>
            <span>•</span>
            <button onClick={() => setCurrentApp('dotshome')} className="hover:text-cyan-400 transition-colors">SMARTHOME (Domótica)</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

