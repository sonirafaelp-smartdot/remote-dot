import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Wifi,
  Activity,
  Server,
  Zap,
  Power,
  Sliders,
  Sun,
  Moon,
  Thermometer,
  Lock,
  Unlock,
  Volume2,
  Tv,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Cpu,
  HardDrive,
  ShieldCheck,
  Radio,
  Cast,
  Layers,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Clock,
  Speaker,
  Flame,
  Wind
} from 'lucide-react';
import { SmartHomeDevice, SmartDeviceType, SmartHomeEcoSystem, SpeedTestResult } from '../types.ts';

interface ServerAndNetworkStats {
  server: {
    status: string;
    uptime_formatted: string;
    uptime_seconds: number;
    node_version: string;
    platform: string;
    cpu_model: string;
    cpu_cores: number;
    memory_used_mb: number;
    memory_heap_mb: number;
    memory_total_heap_mb: number;
    port: number;
    active_connections: number;
    timestamp: string;
  };
  internet: {
    status: string;
    download_speed_mbps: number;
    upload_speed_mbps: number;
    latency_ping_ms: number;
    jitter_ms: number;
    isp: string;
    gateway_ip: string;
    public_ip: string;
    dns_primary: string;
    dns_secondary: string;
    packet_loss_pct: number;
    wifi_band: string;
    connected_home_devices: number;
    online_home_devices: number;
  };
}

export const DotSmartHomeView: React.FC = () => {
  const [devices, setDevices] = useState<SmartHomeDevice[]>([]);
  const [stats, setStats] = useState<ServerAndNetworkStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEcosystem, setSelectedEcosystem] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Speedtest State
  const [isTestingSpeed, setIsTestingSpeed] = useState<boolean>(false);
  const [speedTestResult, setSpeedTestResult] = useState<SpeedTestResult | null>(null);
  const [speedProgress, setSpeedProgress] = useState<number>(0);

  // Add / Edit Device Modal
  const [showDeviceModal, setShowDeviceModal] = useState<boolean>(false);
  const [deviceModalMode, setDeviceModalMode] = useState<'create' | 'edit'>('create');
  const [selectedDevice, setSelectedDevice] = useState<SmartHomeDevice | null>(null);
  const [deviceFormData, setDeviceFormData] = useState({
    name: '',
    room: 'Sala Principal',
    type: 'light' as SmartDeviceType,
    ecosystem: 'google_home' as SmartHomeEcoSystem,
    ipAddress: '',
    model: '',
  });

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [devRes, statsRes] = await Promise.all([
        fetch('/api/v1/smarthome/devices'),
        fetch('/api/v1/smarthome/server-and-network-stats')
      ]);

      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error loading smart home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Run Speedtest
  const runSpeedTest = async () => {
    setIsTestingSpeed(true);
    setSpeedProgress(15);
    try {
      const p1 = setTimeout(() => setSpeedProgress(45), 600);
      const p2 = setTimeout(() => setSpeedProgress(80), 1300);

      const res = await fetch('/api/v1/smarthome/speedtest', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSpeedProgress(100);
        setTimeout(() => {
          setSpeedTestResult(data);
          setIsTestingSpeed(false);
          setSpeedProgress(0);
          // Also update the network stats if available
          if (stats) {
            setStats({
              ...stats,
              internet: {
                ...stats.internet,
                download_speed_mbps: data.downloadMbps,
                upload_speed_mbps: data.uploadMbps,
                latency_ping_ms: data.pingMs,
                jitter_ms: data.jitterMs,
              }
            });
          }
        }, 500);
      }
    } catch (err) {
      console.error('Speedtest error:', err);
      setIsTestingSpeed(false);
      setSpeedProgress(0);
    }
  };

  // Toggle device state
  const handleToggleDevice = async (device: SmartHomeDevice) => {
    try {
      // Optimistic UI update
      setDevices(prev => prev.map(d => {
        if (d.id === device.id) {
          if (d.type === 'lock') {
            return { ...d, isLocked: !d.isLocked };
          }
          return { ...d, isOn: !d.isOn };
        }
        return d;
      }));

      const res = await fetch(`/api/v1/smarthome/devices/${device.id}/toggle`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
      }
    } catch (err) {
      console.error('Error toggling device:', err);
      fetchData(); // Rollback
    }
  };

  // Update specific property
  const handleUpdateProperty = async (device: SmartHomeDevice, patch: Partial<SmartHomeDevice>) => {
    try {
      // Optimistic update
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, ...patch } : d));

      const res = await fetch(`/api/v1/smarthome/devices/${device.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (res.ok) {
        const updated = await res.json();
        setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
      }
    } catch (err) {
      console.error('Error updating property:', err);
      fetchData();
    }
  };

  // Delete device
  const handleDeleteDevice = async (id: string) => {
    if (!confirm('¿Estás seguro de desvincular este dispositivo inteligente de tu casa?')) return;
    try {
      const res = await fetch(`/api/v1/smarthome/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices(prev => prev.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error('Error deleting device:', err);
    }
  };

  // Open modal create
  const handleOpenCreateModal = () => {
    setDeviceModalMode('create');
    setSelectedDevice(null);
    setDeviceFormData({
      name: '',
      room: 'Sala Principal',
      type: 'light',
      ecosystem: 'google_home',
      ipAddress: '',
      model: '',
    });
    setShowDeviceModal(true);
  };

  // Open modal edit
  const handleOpenEditModal = (dev: SmartHomeDevice) => {
    setDeviceModalMode('edit');
    setSelectedDevice(dev);
    setDeviceFormData({
      name: dev.name,
      room: dev.room,
      type: dev.type,
      ecosystem: dev.ecosystem,
      ipAddress: dev.ipAddress || '',
      model: dev.model || '',
    });
    setShowDeviceModal(true);
  };

  // Submit device modal
  const handleSubmitDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (deviceModalMode === 'create') {
        const res = await fetch('/api/v1/smarthome/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deviceFormData),
        });
        if (res.ok) {
          const newDev = await res.json();
          setDevices(prev => [...prev, newDev]);
          setShowDeviceModal(false);
        }
      } else if (selectedDevice) {
        const res = await fetch(`/api/v1/smarthome/devices/${selectedDevice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deviceFormData),
        });
        if (res.ok) {
          const updated = await res.json();
          setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
          setShowDeviceModal(false);
        }
      }
    } catch (err) {
      console.error('Error submitting device:', err);
    }
  };

  // Unique rooms
  const rooms = useMemo(() => {
    const set = new Set(devices.map(d => d.room));
    return Array.from(set);
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchRoom = selectedRoom === 'all' || d.room === selectedRoom;
      const matchType = selectedType === 'all' || d.type === selectedType;
      const matchEco = selectedEcosystem === 'all' || d.ecosystem === selectedEcosystem;
      const matchSearch = searchQuery === '' || 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.model.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRoom && matchType && matchEco && matchSearch;
    });
  }, [devices, selectedRoom, selectedType, selectedEcosystem, searchQuery]);

  // Quick Scene Actions
  const handleSceneAllLights = async (turnOn: boolean) => {
    const lights = devices.filter(d => d.type === 'light');
    for (const light of lights) {
      handleUpdateProperty(light, { isOn: turnOn });
    }
  };

  const handleSceneLockAllDoors = async () => {
    const locks = devices.filter(d => d.type === 'lock');
    for (const l of locks) {
      handleUpdateProperty(l, { isLocked: true });
    }
  };

  const totalWatts = devices
    .filter(d => d.isOn)
    .reduce((acc, d) => acc + (d.powerConsumptionWatts || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50 border border-cyan-400/30">
              <Home className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-white tracking-tight">SMARTDOT HOME</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/40">
                  Google Home & Matter Ready
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1">
                Panel central de control domótico: Dispositivos en línea, estado del servidor local y velocidad de Internet en tiempo real.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleSceneAllLights(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Sun className="w-3.5 h-3.5" />
              Encender Todas las Luces
            </button>
            <button
              onClick={() => handleSceneAllLights(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Moon className="w-3.5 h-3.5" />
              Apagar Todo
            </button>
            <button
              onClick={handleSceneLockAllDoors}
              className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              Bloquear Casa
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Agregar Equipo
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Telemetry Widgets (Server Status + Internet Speed + Google Home Ecosystem) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 1. Estado del Servidor en Línea */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Estado del Servidor</h3>
                <p className="text-[11px] text-slate-400">Host Central & Daemon Local</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ONLINE
            </div>
          </div>

          {stats ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Tiempo en Línea (Uptime):
                </span>
                <span className="font-mono font-bold text-cyan-300">{stats.server.uptime_formatted}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-400" />
                  Procesador / Núcleos:
                </span>
                <span className="font-mono text-slate-200">{stats.server.cpu_cores} Cores ({stats.server.platform})</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                  Memoria RAM Utilizada:
                </span>
                <span className="font-mono font-bold text-emerald-400">{stats.server.memory_used_mb} MB</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-purple-400" />
                  Puerto de Enlace & WebSocket:
                </span>
                <span className="font-mono text-slate-300">Port {stats.server.port} (WebSocket Activo)</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Cargando telemetría del servidor...
            </div>
          )}
        </div>

        {/* 2. Velocidad de Internet & Test en Tiempo Real */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Velocidad de Internet</h3>
                <p className="text-[11px] text-slate-400">Fibra Óptica & Enlace WAN</p>
              </div>
            </div>
            <button
              onClick={runSpeedTest}
              disabled={isTestingSpeed}
              className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Play className={`w-3 h-3 ${isTestingSpeed ? 'animate-spin' : ''}`} />
              {isTestingSpeed ? 'Midiendo...' : 'Test de Velocidad'}
            </button>
          </div>

          {/* Progress bar when running test */}
          {isTestingSpeed && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-cyan-300">
                <span>Evaluando ancho de banda y latencia...</span>
                <span>{speedProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${speedProgress}%` }}
                />
              </div>
            </div>
          )}

          {stats ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                    <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400" /> Bajada (Download)
                  </div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {stats.internet.download_speed_mbps} <span className="text-xs text-cyan-400 font-normal">Mbps</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-blue-500/20 text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" /> Subida (Upload)
                  </div>
                  <div className="text-xl font-black text-white font-mono mt-1">
                    {stats.internet.upload_speed_mbps} <span className="text-xs text-blue-400 font-normal">Mbps</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Ping Latency</span>
                  <span className="font-mono font-bold text-emerald-400">{stats.internet.latency_ping_ms} ms</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Jitter</span>
                  <span className="font-mono font-bold text-cyan-400">{stats.internet.jitter_ms} ms</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Wi-Fi Mesh</span>
                  <span className="font-mono font-bold text-amber-400">6E Tri-Band</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2 px-1">
                <span>Proveedor: <strong className="text-slate-200">{stats.internet.isp.split('/')[0]}</strong></span>
                <span>IP Pública: <strong className="text-cyan-300 font-mono">{stats.internet.public_ip}</strong></span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">Conectando con la red local...</div>
          )}
        </div>

        {/* 3. Resumen Google Home & Domótica Activa */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Cast className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Google Home & Domótica</h3>
                <p className="text-[11px] text-slate-400">Integración Matter & Dispositivos</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-bold border border-blue-500/30">
              {devices.filter(d => d.isOnline).length} / {devices.length} Activos
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Consumo Eléctrico Estimado:
              </span>
              <span className="font-mono font-bold text-amber-300">{totalWatts.toFixed(1)} W</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Habitaciones Vinculadas:
              </span>
              <span className="font-mono text-slate-200">{rooms.length} Zonas ({rooms.join(', ')})</span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Seguridad Perimetral:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {devices.filter(d => d.type === 'lock' && d.isLocked).length} Cerraduras Bloqueadas
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                Climatización Nest:
              </span>
              <span className="font-mono text-rose-300">Auto-Set 22°C (Confort)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar dispositivo, habitación, modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Room Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
          <button
            onClick={() => setSelectedRoom('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedRoom === 'all'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todas las Habitaciones ({devices.length})
          </button>
          {rooms.map(room => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRoom === room
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/50'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {room}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Todos los Tipos</option>
            <option value="light">Luces & Iluminación</option>
            <option value="thermostat">Termostatos & Clima</option>
            <option value="plug">Enchufes & Relevadores</option>
            <option value="lock">Cerraduras Inteligentes</option>
            <option value="tv">Smart TVs / Cast</option>
            <option value="speaker">Parlantes Google Nest</option>
            <option value="vacuum">Aspiradoras Robot</option>
            <option value="camera">Cámaras Nest</option>
            <option value="hub">Centros de Control (Hubs)</option>
          </select>
        </div>
      </div>

      {/* Device Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDevices.map(device => {
          const isLight = device.type === 'light';
          const isThermostat = device.type === 'thermostat';
          const isLock = device.type === 'lock';
          const isSpeaker = device.type === 'speaker' || device.type === 'hub';
          const isTv = device.type === 'tv';
          const isPlug = device.type === 'plug';
          const isVacuum = device.type === 'vacuum';
          const isCamera = device.type === 'camera';

          return (
            <div
              key={device.id}
              className={`border rounded-2xl p-4 transition-all flex flex-col justify-between relative overflow-hidden shadow-lg ${
                device.isOn || (isLock && !device.isLocked)
                  ? 'bg-slate-900 border-cyan-500/40 shadow-cyan-950/20'
                  : 'bg-slate-900/60 border-slate-800/80 opacity-90'
              }`}
            >
              {/* Header card */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    {/* Device Icon Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        device.isOn || (isLock && !device.isLocked)
                          ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-md shadow-cyan-950/40'
                          : 'bg-slate-800 border border-slate-700 text-slate-500'
                      }`}
                    >
                      {isLight && <Sun className="w-5 h-5" />}
                      {isThermostat && <Thermometer className="w-5 h-5" />}
                      {isLock && (device.isLocked ? <Lock className="w-5 h-5 text-emerald-400" /> : <Unlock className="w-5 h-5 text-amber-400" />)}
                      {isPlug && <Zap className="w-5 h-5" />}
                      {isSpeaker && <Speaker className="w-5 h-5" />}
                      {isTv && <Tv className="w-5 h-5" />}
                      {isVacuum && <Wind className="w-5 h-5" />}
                      {isCamera && <Activity className="w-5 h-5" />}
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-xs leading-snug line-clamp-1">{device.name}</h4>
                      <p className="text-[11px] text-slate-400">{device.room}</p>
                    </div>
                  </div>

                  {/* Main Toggle Button */}
                  <button
                    onClick={() => handleToggleDevice(device)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                      isLock
                        ? device.isLocked
                          ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                          : 'bg-amber-600/20 border-amber-500/50 text-amber-300 hover:bg-amber-600/30'
                        : device.isOn
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isLock ? (
                      device.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Ecosystem Badge & Model */}
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[10px] font-mono border border-slate-800">
                    {device.ecosystem === 'google_home' ? 'Google Home' : device.ecosystem === 'matter' ? 'Matter' : 'LAN Wi-Fi'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                    {device.ipAddress}
                  </span>
                </div>

                {/* Interactive Sliders / Controls according to device type */}
                {/* 1. Light: Brightness & Color */}
                {isLight && device.isOn && (
                  <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Brillo:</span>
                      <span className="font-mono text-cyan-300 font-bold">{device.brightness || 100}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={device.brightness || 100}
                      onChange={(e) => handleUpdateProperty(device, { brightness: Number(e.target.value) })}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* 2. Thermostat: Temperature controls */}
                {isThermostat && (
                  <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400">Actual: <strong className="text-white">{device.currentTemperature}°C</strong></span>
                      <span className="text-rose-400 font-bold">Objetivo: {device.targetTemperature}°C</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleUpdateProperty(device, { targetTemperature: Math.max(16, (device.targetTemperature || 22) - 1) })}
                        className="px-2 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        -1°C
                      </button>
                      <input
                        type="range"
                        min="16"
                        max="30"
                        value={device.targetTemperature || 22}
                        onChange={(e) => handleUpdateProperty(device, { targetTemperature: Number(e.target.value) })}
                        className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <button
                        onClick={() => handleUpdateProperty(device, { targetTemperature: Math.min(30, (device.targetTemperature || 22) + 1) })}
                        className="px-2 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        +1°C
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Speaker / TV: Volume Control */}
                {(isSpeaker || isTv) && device.isOn && (
                  <div className="space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Volumen:</span>
                      <span className="font-mono text-cyan-300 font-bold">{device.volume || 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={device.volume || 50}
                      onChange={(e) => handleUpdateProperty(device, { volume: Number(e.target.value) })}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {/* Power consumption metric if active */}
                {device.isOn && device.powerConsumptionWatts !== undefined && device.powerConsumptionWatts > 0 && (
                  <div className="flex items-center justify-between text-[10px] text-amber-400/90 font-mono mb-2">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Consumo:</span>
                    <span>{device.powerConsumptionWatts} W</span>
                  </div>
                )}
              </div>

              {/* Card Footer: Edit / Delete */}
              <div className="flex items-center justify-between border-t border-slate-800/80 pt-2.5 mt-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  {device.isOnline ? '● Online' : '○ Offline'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditModal(device)}
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                    title="Editar datos del dispositivo"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(device.id)}
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-all"
                    title="Desvincular equipo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDevices.length === 0 && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Home className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="font-bold text-white text-base">No hay dispositivos en esta categoría</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Ajusta los filtros de habitación o tipo, o haz clic en "Agregar Equipo" para registrar un nuevo dispositivo inteligente.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
          >
            Agregar Dispositivo
          </button>
        </div>
      )}

      {/* Modal: Add or Edit Smart Device */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {deviceModalMode === 'create' ? 'Vincular Dispositivo Inteligente' : 'Editar Dispositivo'}
                  </h3>
                  <p className="text-xs text-slate-400">Google Home, Matter & LAN Wi-Fi</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeviceModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Nombre del Dispositivo (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Luz Sala, Google Nest Hub, Aire Acondicionado"
                  value={deviceFormData.name}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Habitación / Zona (*):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Sala Principal, Cocina"
                    value={deviceFormData.room}
                    onChange={(e) => setDeviceFormData({ ...deviceFormData, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Tipo de Dispositivo (*):
                  </label>
                  <select
                    value={deviceFormData.type}
                    onChange={(e) => setDeviceFormData({ ...deviceFormData, type: e.target.value as SmartDeviceType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="light">Luz / Lámpara</option>
                    <option value="thermostat">Termostato Nest / Clima</option>
                    <option value="plug">Enchufe Inteligente</option>
                    <option value="lock">Cerradura Inteligente</option>
                    <option value="tv">Smart TV / Chromecast</option>
                    <option value="speaker">Parlante Google Nest</option>
                    <option value="vacuum">Aspiradora Robot</option>
                    <option value="camera">Cámara de Seguridad</option>
                    <option value="hub">Hub / Pantalla Inteligente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Ecosistema / Protocolo:
                  </label>
                  <select
                    value={deviceFormData.ecosystem}
                    onChange={(e) => setDeviceFormData({ ...deviceFormData, ecosystem: e.target.value as SmartHomeEcoSystem })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="google_home">Google Home</option>
                    <option value="matter">Matter Standard</option>
                    <option value="local_lan">Red Local Wi-Fi (IP)</option>
                    <option value="tuya">Tuya / SmartLife</option>
                    <option value="zigbee">Zigbee Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Dirección IP Local (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.150"
                    value={deviceFormData.ipAddress}
                    onChange={(e) => setDeviceFormData({ ...deviceFormData, ipAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Modelo o Marca del Fabricante:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Philips Hue, Google Nest, TP-Link Tapo"
                  value={deviceFormData.model}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50"
                >
                  {deviceModalMode === 'create' ? 'Vincular a Mi Casa' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
