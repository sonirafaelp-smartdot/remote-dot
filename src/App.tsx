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
  Users
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
import { realtimeSocket } from './services/realtimeSocket.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('technician-console');
  const [socketStatus, setSocketStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>(
    realtimeSocket.getConnectionState()
  );
  const [unreadCount, setUnreadCount] = useState<number>(0);

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

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Foto 7.png Official Brand Logo (Server Stack in Red Circle) */}
            <SmartDotLogo className="w-10 h-10 hover:scale-105 transition-transform cursor-pointer" showBadge={socketStatus === 'connected'} />
            
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <div className="flex items-baseline tracking-tight font-black text-lg">
                  <span className="text-white font-extrabold tracking-tight">SMARTDOT</span>
                  <span className="text-red-500 font-black ml-1.5 text-sm tracking-widest">•</span>
                  <span className="text-slate-100 font-bold ml-1.5 text-sm">DESK</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Sistema de Soporte Remoto & Help Desk para Windows
              </p>
            </div>
          </div>

          {/* Quick System Badges */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {/* Live WebSocket Status Pill */}
            <button
              onClick={() => handleTabChange('notifications')}
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
              <span>Agente Windows Listo</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs with SmartDot Red/Anthracite Palette */}
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
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        {activeTab === 'tickets' && <TicketSystemView />}
        {activeTab === 'windows-agent' && <WindowsAgentView />}
        {activeTab === 'customers-devices' && <CustomersAndDevicesView />}
        {activeTab === 'auth' && <AuthManager />}
        {activeTab === 'architecture' && <ArchitectureViewer />}
        {activeTab === 'database' && <DatabaseExplorer />}
        {activeTab === 'api-playground' && <ApiTester />}
        {activeTab === 'server-health' && <ServerHealthView />}
        {activeTab === 'roadmap' && <PhaseRoadmap />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-xs text-slate-500 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <SmartDotLogo className="w-6 h-6" />
            <div>
              <span className="font-semibold text-slate-200">SMARTDOT DESK</span>
              <span className="text-slate-400 ml-1.5">• Plataforma Enterprise de Control Remoto y Help Desk</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="hover:text-red-400 transition-colors">Cliente Windows (.NET 9 / WPF)</span>
            <span>•</span>
            <span className="hover:text-red-400 transition-colors">DirectX 11 DXGI</span>
            <span>•</span>
            <span className="hover:text-red-400 transition-colors">STUN/TURN Relays</span>
            <span>•</span>
            <span className="hover:text-red-400 transition-colors">Auditoría HMAC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

