import { useState, useEffect } from 'react';
import { RealtimeNotification } from '../types.ts';
import { realtimeSocket } from '../services/realtimeSocket.ts';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Radio,
  ExternalLink,
  Ticket,
  Laptop,
  Video
} from 'lucide-react';

interface NotificationToastStackProps {
  onNavigateToTab?: (tab: any) => void;
}

export function NotificationToastStack({ onNavigateToTab }: NotificationToastStackProps) {
  const [toasts, setToasts] = useState<RealtimeNotification[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeSocket.onAny((notif) => {
      setToasts((prev) => [notif, ...prev.slice(0, 3)]); // Keep max 4 toasts simultaneously

      // Auto dismiss after 7 seconds for non-critical
      if (notif.severity !== 'critical') {
        setTimeout(() => {
          setToasts((current) => current.filter((t) => t.id !== notif.id));
        }, 7000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleActionClick = (notif: RealtimeNotification) => {
    if (notif.topic === 'tickets' || notif.type.includes('TICKET')) {
      onNavigateToTab?.('tickets');
    } else if (notif.topic === 'devices' || notif.type.includes('DEVICE')) {
      onNavigateToTab?.('customers-devices');
    } else {
      onNavigateToTab?.('notifications');
    }
    removeToast(notif.id);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all animate-slideUp ${
            toast.severity === 'critical'
              ? 'bg-rose-950/95 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
              : toast.severity === 'warning'
              ? 'bg-amber-950/95 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              : toast.severity === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-slate-900/95 border-red-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 mt-0.5">
                {toast.severity === 'critical' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                ) : toast.severity === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : toast.severity === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : toast.topic === 'tickets' ? (
                  <Ticket className="w-5 h-5 text-red-400" />
                ) : toast.topic === 'devices' ? (
                  <Laptop className="w-5 h-5 text-red-400" />
                ) : (
                  <Radio className="w-5 h-5 text-red-400" />
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-white tracking-tight">{toast.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">{toast.message}</p>

                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => handleActionClick(toast)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-300 hover:text-red-200 bg-red-500/20 hover:bg-red-500/30 px-2.5 py-1 rounded-md transition-colors"
                  >
                    <span>Ver Detalles</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-[10px] text-slate-400">
                    {new Date(toast.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
