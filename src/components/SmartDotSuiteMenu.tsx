import React, { useRef, useEffect } from 'react';
import { 
  Headphones, 
  Receipt, 
  Users, 
  Cctv, 
  Grid, 
  ChevronDown, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  Check,
  Home
} from 'lucide-react';
import { SmartDotAppId, SmartDotAppModule } from '../types.ts';
import { SmartDotLogo } from './SmartDotLogo.tsx';

interface SmartDotSuiteMenuProps {
  currentApp: SmartDotAppId;
  onSelectApp: (appId: SmartDotAppId) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SMARTDOT_APPS: (SmartDotAppModule & { icon: React.ElementType })[] = [
  {
    id: 'dotdesk',
    name: 'SMARTDOT DESK',
    shortName: 'DOTDESK',
    tagline: 'Acceso Remoto & Mesa de Ayuda',
    description: 'Control remoto DirectX DXGI, agente Windows nativo, tickets con SLA y alertas automáticas WhatsApp.',
    color: 'from-red-600 to-rose-700',
    badge: 'Operativo / Principal',
    status: 'active',
    icon: Headphones,
  },
  {
    id: 'dotshome',
    name: 'SMARTDOT HOME',
    shortName: 'SMARTHOME',
    tagline: 'Domótica & Control de Casa Inteligente',
    description: 'Control de dispositivos Google Home/Matter, estado en línea del servidor, test de velocidad de Internet y monitoreo domótico integral.',
    color: 'from-cyan-600 to-blue-600',
    badge: 'Nuevo Módulo',
    status: 'ready',
    icon: Home,
  },
  {
    id: 'dotbill',
    name: 'SMARTDOT BILL',
    shortName: 'DOTBILL',
    tagline: 'Facturación & Cobros',
    description: 'Emisión de facturas con valor fiscal (NCF), presupuestos, control de pagos y suscripciones de soporte.',
    color: 'from-emerald-600 to-teal-700',
    badge: 'Módulo Activo',
    status: 'ready',
    icon: Receipt,
  },
  {
    id: 'dotcrm',
    name: 'SMARTDOT CRM',
    shortName: 'DOTCRM',
    tagline: 'Gestión y Perfiles de Clientes',
    description: 'Fichas completas de clientes, contratos mensuales de mantenimiento, inventario de hardware y contactos clave.',
    color: 'from-blue-600 to-indigo-700',
    badge: 'Módulo Activo',
    status: 'ready',
    icon: Users,
  },
  {
    id: 'dotvision',
    name: 'SMARTDOT VISION',
    shortName: 'DOTVISION',
    tagline: 'Videovigilancia & Mosaico CCTV',
    description: 'Monitoreo de cámaras IP (RTSP / WebRTC), matriz de video en vivo (4/9/16), grabación y detección de movimiento.',
    color: 'from-amber-600 to-orange-700',
    badge: 'Módulo Activo',
    status: 'ready',
    icon: Cctv,
  },
];

export function SmartDotSuiteMenu({
  currentApp,
  onSelectApp,
  isOpen,
  onClose,
}: SmartDotSuiteMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentAppObj = SMARTDOT_APPS.find((a) => a.id === currentApp) || SMARTDOT_APPS[0];

  return (
    <div
      ref={menuRef}
      className="absolute top-16 left-4 sm:left-6 z-50 w-[380px] sm:w-[420px] bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 p-4 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-white text-xs uppercase tracking-wider">
              <span>SMARTDOT</span>
              <span className="text-red-500">•</span>
              <span>CLOUD SUITE</span>
            </div>
            <p className="text-[10px] text-slate-400">Ecosistema modular de aplicaciones empresariales</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
          4 Módulos
        </span>
      </div>

      {/* Applications List */}
      <div className="space-y-2">
        {SMARTDOT_APPS.map((app) => {
          const Icon = app.icon;
          const isSelected = currentApp === app.id;

          return (
            <button
              key={app.id}
              onClick={() => {
                onSelectApp(app.id);
                onClose();
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 relative group ${
                isSelected
                  ? 'bg-slate-800/90 border-red-500/50 shadow-md ring-1 ring-red-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
              }`}
            >
              {/* App Icon Container */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner bg-gradient-to-br ${app.color} text-white font-bold transition-transform group-hover:scale-105`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white group-hover:text-red-400 transition-colors">
                      {app.name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold ${
                        isSelected
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {app.badge}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="text-[11px] font-medium text-slate-300 mt-0.5">{app.tagline}</div>
                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                  {app.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Single Sign-On (SSO) Activo
        </span>
        <span className="text-[10px] text-slate-500 font-mono">v2.5 Enterprise</span>
      </div>
    </div>
  );
}
