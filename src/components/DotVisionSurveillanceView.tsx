import React, { useState, useEffect } from 'react';
import {
  Cctv,
  Video,
  Grid,
  Maximize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Play,
  Pause,
  Camera,
  Activity,
  HardDrive,
  Eye,
  Shield,
  Circle,
  Wifi
} from 'lucide-react';
import { SecurityCamera } from '../types.ts';

const INITIAL_CAMERAS: SecurityCamera[] = [
  {
    id: 'cam-01',
    name: 'CAM 01 — Entrada Principal / Recepción',
    location: 'ABC Solutions - Edificio Central (Piso 1)',
    customerId: 'cust-abc-01',
    customerName: 'ABC Solutions S.R.L.',
    ipAddress: '192.168.10.201',
    rtspUrl: 'rtsp://admin:pass@192.168.10.201:554/live/ch0',
    status: 'RECORDING',
    resolution: '4K UHD (3840x2160)',
    ptzSupport: true,
    nightVision: true,
    fps: 30,
    bitrateKbps: 4096,
  },
  {
    id: 'cam-02',
    name: 'CAM 02 — Cuarto de Servidores (Data Center)',
    location: 'ABC Solutions - Data Center Rack A',
    customerId: 'cust-abc-01',
    customerName: 'ABC Solutions S.R.L.',
    ipAddress: '192.168.10.202',
    rtspUrl: 'rtsp://admin:pass@192.168.10.202:554/live/ch0',
    status: 'MOTION_DETECTED',
    resolution: '1080p 60fps',
    ptzSupport: false,
    nightVision: true,
    fps: 60,
    bitrateKbps: 3072,
  },
  {
    id: 'cam-03',
    name: 'CAM 03 — Pasillo de Consultorios Norte',
    location: 'Centro Médico Moderno - Ala A',
    customerId: 'cust-med-02',
    customerName: 'Centro Médico Moderno',
    ipAddress: '192.168.20.105',
    rtspUrl: 'rtsp://admin:pass@192.168.20.105:554/live/ch0',
    status: 'RECORDING',
    resolution: '2K QHD (2560x1440)',
    ptzSupport: true,
    nightVision: true,
    fps: 25,
    bitrateKbps: 2048,
  },
  {
    id: 'cam-04',
    name: 'CAM 04 — Estacionamiento / Acceso Vehicular',
    location: 'Centro Médico Moderno - Portón 2',
    customerId: 'cust-med-02',
    customerName: 'Centro Médico Moderno',
    ipAddress: '192.168.20.108',
    rtspUrl: 'rtsp://admin:pass@192.168.20.108:554/live/ch0',
    status: 'ONLINE',
    resolution: '4K ColorVu (Visión Nocturna 24/7)',
    ptzSupport: true,
    nightVision: true,
    fps: 30,
    bitrateKbps: 4096,
  },
];

export function DotVisionSurveillanceView() {
  const [cameras, setCameras] = useState<SecurityCamera[]>(INITIAL_CAMERAS);
  const [selectedCam, setSelectedCam] = useState<SecurityCamera | null>(INITIAL_CAMERAS[0]);
  const [gridLayout, setGridLayout] = useState<'grid-2x2' | 'single' | 'grid-1x3'>('grid-2x2');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(
        `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour12: false })}.${Math.floor(d.getMilliseconds() / 100)}`
      );
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-white shadow-lg shadow-amber-600/20 shrink-0">
              <Cctv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  SMARTDOT VISION — Videovigilancia & Mosaico CCTV
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Transmisión RTSP / H.265
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Monitoreo centralizado de cámaras IP empresariales, visualización multipantalla en tiempo real y detección inteligente de eventos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{cameras.length} Canales Online</span>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setGridLayout('grid-2x2')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  gridLayout === 'grid-2x2' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Mosaico 2x2"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridLayout('single')}
                className={`p-1.5 rounded-lg text-xs transition ${
                  gridLayout === 'single' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Cámara Individual"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Surveillance Live Canvas Area */}
      {gridLayout === 'grid-2x2' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cameras.map((cam, idx) => (
            <div
              key={cam.id}
              onClick={() => setSelectedCam(cam)}
              className="bg-black rounded-xl border border-slate-800 overflow-hidden relative group cursor-pointer aspect-video flex flex-col justify-between shadow-2xl hover:border-amber-500/50 transition"
            >
              {/* Simulated Camera Feed Backdrop with Scanning Lines */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-10" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              {/* Feed Visual Mock */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center opacity-40 group-hover:opacity-60 transition">
                  <Camera className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                  <div className="text-xs font-mono text-slate-400 tracking-wider">LIVE RTSP STREAM</div>
                  <div className="text-[10px] font-mono text-slate-500">{cam.ipAddress} • {cam.fps} FPS</div>
                </div>
              </div>

              {/* Top Feed Overlay Info */}
              <div className="relative z-20 p-3 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-bold flex items-center gap-1 animate-pulse">
                    <Circle className="w-2 h-2 fill-white" /> REC
                  </span>
                  <span className="text-white font-bold drop-shadow-md">{cam.name}</span>
                </div>
                <span className="text-amber-400 text-[11px] font-mono bg-black/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {currentTime}
                </span>
              </div>

              {/* Bottom Feed Overlay Info */}
              <div className="relative z-20 p-3 flex items-center justify-between text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="bg-black/70 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-slate-800">
                    {cam.resolution}
                  </span>
                  <span className="text-slate-400 text-[10px]">{cam.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {cam.status === 'MOTION_DETECTED' && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-bounce">
                      MOVIMIENTO
                    </span>
                  )}
                  <span className="text-slate-400 text-[10px]">{cam.bitrateKbps} kbps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Single Camera Focus Mode */
        selectedCam && (
          <div className="space-y-4">
            <div className="bg-black rounded-2xl border border-slate-800 overflow-hidden relative aspect-video flex flex-col justify-between shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none z-10" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center opacity-40">
                  <Cctv className="w-20 h-20 text-amber-500 mx-auto mb-3" />
                  <div className="text-sm font-mono text-slate-300 font-bold tracking-wider">CANAL RTSP ULTRA HD</div>
                  <div className="text-xs font-mono text-slate-500 mt-1">{selectedCam.rtspUrl}</div>
                </div>
              </div>

              <div className="relative z-20 p-4 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-red-600 text-white font-bold flex items-center gap-1.5 animate-pulse">
                    <Circle className="w-2.5 h-2.5 fill-white" /> EN VIVO
                  </span>
                  <span className="text-white font-bold text-sm">{selectedCam.name}</span>
                </div>
                <div className="text-amber-400 font-mono text-xs bg-black/70 px-3 py-1 rounded border border-amber-500/30">
                  {currentTime}
                </div>
              </div>

              {/* Bottom Controls Bar */}
              <div className="relative z-20 p-4 bg-black/80 backdrop-blur-md border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-slate-300 font-mono text-xs">
                  <span>IP: {selectedCam.ipAddress}</span>
                  <span>FPS: {selectedCam.fps}</span>
                  <span>Códec: H.265+</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                  <button
                    onClick={() => setGridLayout('grid-2x2')}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    Volver al Mosaico (4 Canales)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
