import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  HardDrive, 
  Plus, 
  Search, 
  RefreshCw, 
  Copy, 
  Check, 
  Trash2, 
  Cpu, 
  Activity, 
  User, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Terminal, 
  ExternalLink,
  Laptop,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Code
} from 'lucide-react';

export const CustomersAndDevicesView: React.FC = () => {
  const [subTab, setSubTab] = useState<'customers' | 'devices' | 'enroll-simulator' | 'csharp-code'>('devices');
  const [customers, setCustomers] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New Customer Form State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustomerData, setNewCustomerData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Simulator State
  const [simTargetCustomerId, setSimTargetCustomerId] = useState<string>('');
  const [simComputerName, setSimComputerName] = useState<string>('ABC-RECEP-02');
  const [simWindowsUser, setSimWindowsUser] = useState<string>('mgarcia_recep');
  const [simOsVersion, setSimOsVersion] = useState<string>('Windows 11 Pro 64-bit (Build 22631)');
  const [simCpu, setSimCpu] = useState<string>('Intel Core i5-13400 (10 Cores @ 2.50GHz)');
  const [simRamMb, setSimRamMb] = useState<number>(16384);
  const [simStorage, setSimStorage] = useState<string>('SSD NVMe 500GB (340GB Libres)');
  const [simIp, setSimIp] = useState<string>('192.168.1.115');
  const [simResult, setSimResult] = useState<any>(null);

  // HWID Calculation Interactive Playground
  const [hwidMb, setHwidMb] = useState<string>('MB-ASUS-ROG-STRIX-B660-F');
  const [hwidCpu, setHwidCpu] = useState<string>('BFEBFBFF00090672');
  const [hwidBios, setHwidBios] = useState<string>('BIOS-SER-994810229');
  const [hwidMac, setHwidMac] = useState<string>('00:1A:2B:99:AA:FF');
  const [calculatedHwid, setCalculatedHwid] = useState<string>('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        if (data.length > 0 && !simTargetCustomerId) {
          setSimTargetCustomerId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/devices');
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAll = () => {
    fetchCustomers();
    fetchDevices();
    calculateHwidPreview();
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(() => {
      fetchDevices();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const calculateHwidPreview = async () => {
    try {
      const res = await fetch('/api/v1/devices/generate-hwid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motherboard_uuid: hwidMb,
          cpu_id: hwidCpu,
          bios_serial: hwidBios,
          mac_address: hwidMac,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCalculatedHwid(data.hwid);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.company_name || !newCustomerData.contact_name || !newCustomerData.email) return;

    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerData),
      });

      if (res.ok) {
        setShowAddCustomerModal(false);
        setNewCustomerData({ company_name: '', contact_name: '', phone: '', email: '', address: '' });
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear la empresa');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la empresa "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleOnline = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/v1/devices/${deviceId}/toggle-online`, { method: 'POST' });
      if (res.ok) {
        fetchDevices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendHeartbeat = async (deviceId: string) => {
    try {
      const res = await fetch(`/api/v1/devices/${deviceId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpu_load_pct: Math.floor(Math.random() * 30) + 5 }),
      });
      if (res.ok) {
        fetchDevices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDevice = async (deviceId: string, compName: string) => {
    if (!confirm(`¿Eliminar y desvincular la computadora ${compName}?`)) return;
    try {
      const res = await fetch(`/api/v1/devices/${deviceId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDevices();
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateEnrollment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: simTargetCustomerId,
          computer_name: simComputerName,
          windows_user: simWindowsUser,
          os_version: simOsVersion,
          cpu: simCpu,
          ram_mb: simRamMb,
          storage_info: simStorage,
          ip_address: simIp,
          mac_address: '00:1A:2B:77:88:99',
          agent_version: '1.0.0',
        }),
      });
      const data = await res.json();
      setSimResult(data);
      fetchDevices();
      fetchCustomers();
    } catch (err: any) {
      setSimResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filteredDevices = devices.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.computer_name.toLowerCase().includes(q) ||
      d.windows_user.toLowerCase().includes(q) ||
      d.device_uuid.toLowerCase().includes(q) ||
      d.ip_address.includes(q) ||
      (d.customer && d.customer.company_name.toLowerCase().includes(q))
    );
  });

  const totalDevicesCount = devices.length;
  const onlineDevicesCount = devices.filter((d) => d.is_online).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                FASE 3 COMPLETADA
              </span>
              <span className="text-xs text-slate-400">Enrolamiento HWID + Empresas + Telemetría Windows</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">
              Registro de Clientes y Dispositivos Windows
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Administración de empresas clientes, generación determinista de Hardware ID (HWID), enrolamiento automático con tokens de cliente e inventario en tiempo real de telemetría de hardware (CPU, RAM, Discos, OS y Heartbeats).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Empresas Clientes</div>
            <div className="text-2xl font-bold text-white mt-1">{customers.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Cuentas corporativas activas</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Computadoras</div>
            <div className="text-2xl font-bold text-white mt-1">{totalDevicesCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Equipos con HWID enrolado</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Equipos Online</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{onlineDevicesCount}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Latidos y señal activos</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Equipos Offline</div>
            <div className="text-2xl font-bold text-slate-400 mt-1">
              {totalDevicesCount - onlineDevicesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Sin señal de servicio</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
            <WifiOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setSubTab('devices')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'devices'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Inventario de Computadoras ({devices.length})</span>
        </button>

        <button
          onClick={() => setSubTab('customers')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'customers'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Gestión de Empresas Clientes ({customers.length})</span>
        </button>

        <button
          onClick={() => setSubTab('enroll-simulator')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'enroll-simulator'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Simulador de Enrolamiento & HWID</span>
        </button>

        <button
          onClick={() => setSubTab('csharp-code')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'csharp-code'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4 text-emerald-400" />
          <span>Código C# Windows (.NET WMI)</span>
        </button>
      </div>

      {/* TAB 1: DEVICES INVENTORY */}
      {subTab === 'devices' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por nombre de equipo, usuario, HWID, IP o empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <button
              onClick={() => setSubTab('enroll-simulator')}
              className="px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Enrolar Nuevo Equipo
            </button>
          </div>

          {/* Devices Grid Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredDevices.map((dev) => (
              <div
                key={dev.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Card Top: Machine Name, Status & Company */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      dev.is_online
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base tracking-wide">{dev.computer_name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-1 ${
                          dev.is_online
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dev.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          {dev.is_online ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="text-xs text-sky-400 font-medium mt-0.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {dev.customer?.company_name || 'Sin Empresa Asociada'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleOnline(dev.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                        dev.is_online
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300 hover:bg-emerald-900/60'
                      }`}
                      title="Alternar estado online/offline para pruebas"
                    >
                      {dev.is_online ? 'Desconectar' : 'Conectar'}
                    </button>
                    <button
                      onClick={() => handleDeleteDevice(dev.id, dev.computer_name)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors"
                      title="Desvincular computadora"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* HWID & Windows User Banner */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">HWID:</span>
                    <span className="text-sky-300 font-bold">{dev.device_uuid}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(dev.device_uuid, dev.id)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                  >
                    {copiedToken === dev.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedToken === dev.id ? 'Copiado' : 'Copiar'}
                  </button>
                </div>

                {/* Hardware Telemetry Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-mono">USUARIO WINDOWS</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">{dev.windows_user}</div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-mono">SISTEMA OPERATIVO</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">{dev.os_version}</div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-mono">MEMORIA RAM</div>
                    <div className="font-semibold text-slate-200 mt-0.5">
                      {Math.round(dev.ram_mb / 1024)} GB Total ({dev.ram_mb} MB)
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 col-span-2">
                    <div className="text-[10px] text-slate-500 font-mono">PROCESADOR (CPU)</div>
                    <div className="font-semibold text-slate-200 truncate mt-0.5">{dev.cpu}</div>
                  </div>

                  <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-mono">IP LOCAL & MAC</div>
                    <div className="font-mono text-slate-300 text-[11px] truncate mt-0.5">{dev.ip_address}</div>
                  </div>
                </div>

                {/* Storage and Heartbeat Status */}
                <div className="border-t border-slate-800/80 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-red-400" />
                    <span>{dev.storage_info}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Último Heartbeat:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(dev.last_heartbeat).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => handleSendHeartbeat(dev.id)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium text-[10px]"
                      title="Enviar señal de latido manual"
                    >
                      Ping
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMERS MANAGEMENT */}
      {subTab === 'customers' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Empresas Clientes y Contratos de Soporte</h3>
              <p className="text-xs text-slate-400">Cada empresa dispone de un Token de Enrolamiento para despliegues masivos.</p>
            </div>
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Empresa Cliente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-base">{c.company_name}</h4>
                      <div className="text-xs text-slate-400 mt-0.5">Contacto: <strong className="text-slate-200">{c.contact_name}</strong></div>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomer(c.id, c.company_name)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition-colors"
                      title="Eliminar empresa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Teléfono:</span>
                      <span className="font-mono">{c.phone || 'No especificado'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-mono text-sky-400">{c.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Dirección:</span>
                      <span className="truncate max-w-[180px]">{c.address || 'Principal'}</span>
                    </div>
                  </div>

                  {/* Enrollment Key for MSI Installer */}
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                    <div className="text-[10px] text-slate-500 font-mono uppercase">Token de Instalador MSI:</div>
                    <div className="flex items-center justify-between gap-2 font-mono text-xs text-emerald-400">
                      <span className="truncate">{c.enrollment_token}</span>
                      <button
                        onClick={() => copyToClipboard(c.enrollment_token, c.id)}
                        className="text-slate-400 hover:text-white"
                        title="Copiar token para instalador"
                      >
                        {copiedToken === c.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Equipos: <strong className="text-white">{c.total_devices}</strong> ({c.online_devices} online)
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                    ID: {c.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ENROLLMENT SIMULATOR & HWID GENERATOR */}
      {subTab === 'enroll-simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Enroll new Machine Simulator Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Laptop className="w-4 h-4 text-sky-400" />
                Simulador de Enrolamiento de Computadora Windows
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Simula el proceso que ejecuta el Agente Windows en su primer arranque para reportar su HWID y telemetría de hardware al Servidor Central.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Empresa Cliente Destino:</label>
                <select
                  value={simTargetCustomerId}
                  onChange={(e) => setSimTargetCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Nombre del Equipo (ComputerName):</label>
                <input
                  type="text"
                  value={simComputerName}
                  onChange={(e) => setSimComputerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Usuario de Windows Actual:</label>
                <input
                  type="text"
                  value={simWindowsUser}
                  onChange={(e) => setSimWindowsUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Versión de Windows y Build:</label>
                <input
                  type="text"
                  value={simOsVersion}
                  onChange={(e) => setSimOsVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Modelo de CPU:</label>
                <input
                  type="text"
                  value={simCpu}
                  onChange={(e) => setSimCpu(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Memoria RAM Total (MB):</label>
                <input
                  type="number"
                  value={simRamMb}
                  onChange={(e) => setSimRamMb(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Espacio de Almacenamiento:</label>
                <input
                  type="text"
                  value={simStorage}
                  onChange={(e) => setSimStorage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Dirección IP Local:</label>
                <input
                  type="text"
                  value={simIp}
                  onChange={(e) => setSimIp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateEnrollment}
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
              Ejecutar Enrolamiento de Equipo (POST /api/v1/devices/register)
            </button>

            {simResult && (
              <div className="space-y-1 pt-2">
                <div className="text-[11px] font-mono text-slate-400">Respuesta del Servidor Central:</div>
                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto max-h-[160px]">
                  {JSON.stringify(simResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right: Deterministic HWID Generator Lab */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Algoritmo de Identificación HWID
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Fórmula criptográfica para identificar computadoras sin colisiones.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-sky-400">Fórmula Determinista:</div>
              <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                HWID = SHA-256(Motherboard_Serial + CPU_ID + BIOS_Serial + MAC_Address)
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-400">Serial de Placa Madre (Win32_BaseBoard):</label>
                <input
                  type="text"
                  value={hwidMb}
                  onChange={(e) => {
                    setHwidMb(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-2.5 py-1.5 rounded font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400">Processor ID (Win32_Processor):</label>
                <input
                  type="text"
                  value={hwidCpu}
                  onChange={(e) => {
                    setHwidCpu(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-2.5 py-1.5 rounded font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400">Serial de BIOS (Win32_BIOS):</label>
                <input
                  type="text"
                  value={hwidBios}
                  onChange={(e) => {
                    setHwidBios(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-2.5 py-1.5 rounded font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400">MAC Address Primaria:</label>
                <input
                  type="text"
                  value={hwidMac}
                  onChange={(e) => {
                    setHwidMac(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-2.5 py-1.5 rounded font-mono text-[11px]"
                />
              </div>

              <button
                onClick={calculateHwidPreview}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs transition-colors"
              >
                Recalcular HWID
              </button>
            </div>

            {/* Calculated Output */}
            <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/30 space-y-1">
              <div className="text-[10px] text-emerald-400 font-mono uppercase font-bold">HWID Generado en Vivo:</div>
              <div className="font-mono text-sm font-bold text-white tracking-wider">
                {calculatedHwid || 'Calculando...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: C# WINDOWS CODE */}
      {subTab === 'csharp-code' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Código C# (.NET 8/9) del Agente Windows</h3>
              <p className="text-xs text-slate-400">Implementación de WMI y Servicio de Enrolamiento en segundo plano.</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">
              System.Management.dll
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-mono text-sky-400 mb-1">
                HardwareTelemetryCollector.cs (WMI & HWID Calculator)
              </div>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[300px] leading-relaxed">
{`using System.Management; // Win32_Processor, Win32_BaseBoard, Win32_OperatingSystem

public class HardwareTelemetryCollector
{
    public static string GenerateDeterministicHwid()
    {
        string mbUuid = GetWmiValue("Win32_BaseBoard", "SerialNumber");
        string cpuId = GetWmiValue("Win32_Processor", "ProcessorId");
        string biosSerial = GetWmiValue("Win32_BIOS", "SerialNumber");
        string mac = GetPrimaryMacAddress();

        string rawSeed = $"\{mbUuid\}::\{cpuId\}::\{biosSerial\}::\{mac\}";
        using var sha256 = SHA256.Create();
        byte[] hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(rawSeed));
        string hex = BitConverter.ToString(hashBytes).Replace("-", "").ToUpperInvariant();

        return $"WIN-\{hex.Substring(0, 4)\}-\{hex.Substring(4, 4)\}-\{hex.Substring(8, 4)\}-\{hex.Substring(12, 4)\}";
    }
}`}
              </pre>
            </div>

            <div>
              <div className="text-xs font-mono text-sky-400 mb-1">
                DeviceEnrollmentService.cs (Check-in & Heartbeat)
              </div>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[220px] leading-relaxed">
{`public async Task<bool> EnrollDeviceAsync()
{
    var telemetry = HardwareTelemetryCollector.CollectFullTelemetry();
    var payload = new {
        enrollment_token = _enrollmentToken,
        device_uuid = telemetry.DeviceUuid,
        computer_name = telemetry.ComputerName,
        windows_user = telemetry.WindowsUser,
        os_version = telemetry.OsVersion,
        cpu = telemetry.CpuModel,
        ram_mb = telemetry.RamTotalMb
    };
    var response = await _httpClient.PostAsJsonAsync("/api/v1/devices/register", payload);
    return response.IsSuccessStatusCode;
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Modal to Add Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Registrar Nueva Empresa Cliente</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Nombre de la Empresa (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Nacional S.A."
                  value={newCustomerData.company_name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Persona de Contacto (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Ing. Marcos Castillo"
                  value={newCustomerData.contact_name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, contact_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Correo Electrónico (*):</label>
                <input
                  type="email"
                  required
                  placeholder="contacto@distribuidora.com"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Teléfono:</label>
                <input
                  type="text"
                  placeholder="809-555-9000"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Dirección:</label>
                <input
                  type="text"
                  placeholder="Av. 27 de Febrero #120"
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
