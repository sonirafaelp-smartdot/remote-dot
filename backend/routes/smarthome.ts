import { Router, Request, Response } from 'express';
import { SmartHomeDevice, SpeedTestResult } from '../../src/types.ts';
import { realtimeHub } from '../realtime.ts';
import os from 'os';

export const smarthomeRouter = Router();

// In-Memory state for SmartHome Devices
let smartDevices: SmartHomeDevice[] = [
  {
    id: 'sh-01',
    name: 'Luz Principal Sala de Estar',
    room: 'Sala Principal',
    type: 'light',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    brightness: 85,
    colorHex: '#FFA500',
    powerConsumptionWatts: 14.5,
    model: 'Philips Hue White & Color Ambiance',
    ipAddress: '192.168.1.110',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-02',
    name: 'Google Nest Hub Max',
    room: 'Cocina & Comedor',
    type: 'hub',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    volume: 60,
    model: 'Google Nest Hub Max 10"',
    ipAddress: '192.168.1.115',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-03',
    name: 'Termostato Inteligente Nest',
    room: 'Pasillo Central',
    type: 'thermostat',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    targetTemperature: 22,
    currentTemperature: 23.5,
    powerConsumptionWatts: 3.2,
    model: 'Google Nest Learning Thermostat v3',
    ipAddress: '192.168.1.120',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-04',
    name: 'Cerradura Principal de Entrada',
    room: 'Puerta Principal',
    type: 'lock',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    isLocked: true,
    batteryLevel: 88,
    model: 'Yale Assure Lock 2 with Wi-Fi & Matter',
    ipAddress: '192.168.1.135',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-05',
    name: 'Smart TV QLED 65"',
    room: 'Sala Principal',
    type: 'tv',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: false,
    volume: 25,
    powerConsumptionWatts: 0.8,
    model: 'Samsung Neo QLED 4K QN90C (Google Cast Enabled)',
    ipAddress: '192.168.1.140',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-06',
    name: 'Enchufe Inteligente Aire Acondicionado',
    room: 'Dormitorio Principal',
    type: 'plug',
    ecosystem: 'matter',
    isOnline: true,
    isOn: true,
    powerConsumptionWatts: 920,
    model: 'TP-Link Kasa Matter Smart Plug 16A',
    ipAddress: '192.168.1.145',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-07',
    name: 'Robot Aspirador Roborock S8',
    room: 'Pasillo Central',
    type: 'vacuum',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: false,
    batteryLevel: 95,
    model: 'Roborock S8 Pro Ultra (Auto-Docked)',
    ipAddress: '192.168.1.150',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-08',
    name: 'Google Nest Audio Speaker',
    room: 'Estudio / Oficina',
    type: 'speaker',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    volume: 45,
    model: 'Google Nest Audio Smart Speaker',
    ipAddress: '192.168.1.155',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-09',
    name: 'Luz Cálida Lámpara de Noche',
    room: 'Dormitorio Principal',
    type: 'light',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    brightness: 40,
    colorHex: '#FFD700',
    powerConsumptionWatts: 8.0,
    model: 'Nanoleaf Essentials Matter A19',
    ipAddress: '192.168.1.160',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sh-10',
    name: 'Cámara Google Nest Cam Outdoor',
    room: 'Patio & Garaje',
    type: 'camera',
    ecosystem: 'google_home',
    isOnline: true,
    isOn: true,
    batteryLevel: 92,
    model: 'Google Nest Cam (Battery) 1080p HDR',
    ipAddress: '192.168.1.170',
    lastUpdated: new Date().toISOString(),
  },
];

// GET /api/v1/smarthome/devices
smarthomeRouter.get('/devices', (_req: Request, res: Response) => {
  res.json(smartDevices);
});

// POST /api/v1/smarthome/devices
smarthomeRouter.post('/devices', (req: Request, res: Response) => {
  const { name, room, type, ecosystem, ipAddress, model } = req.body;
  if (!name || !room || !type) {
    return res.status(400).json({ error: 'Nombre, habitación y tipo de dispositivo son requeridos' });
  }

  const newDevice: SmartHomeDevice = {
    id: `sh-${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    room: room.trim(),
    type: type || 'plug',
    ecosystem: ecosystem || 'google_home',
    isOnline: true,
    isOn: false,
    brightness: type === 'light' ? 100 : undefined,
    colorHex: type === 'light' ? '#FFFFFF' : undefined,
    targetTemperature: type === 'thermostat' ? 22 : undefined,
    currentTemperature: type === 'thermostat' ? 24 : undefined,
    isLocked: type === 'lock' ? true : undefined,
    volume: type === 'speaker' || type === 'tv' ? 50 : undefined,
    powerConsumptionWatts: 0,
    model: model || 'Dispositivo SmartHome Genérico',
    ipAddress: ipAddress || `192.168.1.${Math.floor(Math.random() * 100) + 100}`,
    lastUpdated: new Date().toISOString(),
  };

  smartDevices.push(newDevice);

  realtimeHub.broadcast({
    type: 'SMARTHOME_DEVICE_ADDED',
    topic: 'alerts',
    severity: 'success',
    title: 'Dispositivo SmartHome Agregado',
    message: `Se ha vinculado el dispositivo "${newDevice.name}" en "${newDevice.room}".`,
    data: newDevice,
  });

  res.status(201).json(newDevice);
});

// PUT /api/v1/smarthome/devices/:id
smarthomeRouter.put('/devices/:id', (req: Request, res: Response) => {
  const device = smartDevices.find((d) => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  const { name, room, isOn, brightness, colorHex, targetTemperature, volume, isLocked, isOnline } = req.body;

  if (name !== undefined) device.name = name;
  if (room !== undefined) device.room = room;
  if (isOn !== undefined) device.isOn = isOn;
  if (brightness !== undefined) device.brightness = brightness;
  if (colorHex !== undefined) device.colorHex = colorHex;
  if (targetTemperature !== undefined) device.targetTemperature = targetTemperature;
  if (volume !== undefined) device.volume = volume;
  if (isLocked !== undefined) device.isLocked = isLocked;
  if (isOnline !== undefined) device.isOnline = isOnline;
  device.lastUpdated = new Date().toISOString();

  realtimeHub.broadcast({
    type: 'SMARTHOME_STATE_CHANGED',
    topic: 'alerts',
    severity: 'info',
    title: 'Control SmartHome',
    message: `${device.name} cambió de estado (${device.isOn ? 'ENCENDIDO' : 'APAGADO'})`,
    data: device,
  });

  res.json(device);
});

// DELETE /api/v1/smarthome/devices/:id
smarthomeRouter.delete('/devices/:id', (req: Request, res: Response) => {
  const idx = smartDevices.findIndex((d) => d.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  const removed = smartDevices.splice(idx, 1)[0];
  res.json({ message: `Dispositivo ${removed.name} desvinculado con éxito.` });
});

// POST /api/v1/smarthome/devices/:id/toggle
smarthomeRouter.post('/devices/:id/toggle', (req: Request, res: Response) => {
  const device = smartDevices.find((d) => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  if (device.type === 'lock') {
    device.isLocked = !device.isLocked;
  } else {
    device.isOn = !device.isOn;
  }
  device.lastUpdated = new Date().toISOString();

  res.json(device);
});

// GET /api/v1/smarthome/server-and-network-stats
smarthomeRouter.get('/server-and-network-stats', (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  const cpus = os.cpus();
  const uptime = process.uptime();

  // Simulated live internet telemetry and real backend metrics
  res.json({
    server: {
      status: 'ONLINE',
      uptime_formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      uptime_seconds: uptime,
      node_version: process.version,
      platform: `${os.platform()} (${os.arch()})`,
      cpu_model: cpus[0]?.model || 'Intel Core / AMD Server Processor',
      cpu_cores: cpus.length,
      memory_used_mb: Math.round(memory.rss / (1024 * 1024)),
      memory_heap_mb: Math.round(memory.heapUsed / (1024 * 1024)),
      memory_total_heap_mb: Math.round(memory.heapTotal / (1024 * 1024)),
      port: 3000,
      active_connections: 18,
      timestamp: new Date().toISOString(),
    },
    internet: {
      status: 'CONNECTED',
      download_speed_mbps: 384.6,
      upload_speed_mbps: 94.2,
      latency_ping_ms: 8,
      jitter_ms: 1.2,
      isp: 'Fibra Óptica Directa / Claro Dominicana - Altice',
      gateway_ip: '192.168.1.1',
      public_ip: '190.166.42.18',
      dns_primary: '1.1.1.1 (Cloudflare Ultra Fast)',
      dns_secondary: '8.8.8.8 (Google DNS)',
      packet_loss_pct: 0.0,
      wifi_band: 'Wi-Fi 6E (6GHz Tri-Band Mesh)',
      connected_home_devices: smartDevices.length,
      online_home_devices: smartDevices.filter((d) => d.isOnline).length,
    }
  });
});

// POST /api/v1/smarthome/speedtest (Run Real-Time Speedtest Simulation)
smarthomeRouter.post('/speedtest', (_req: Request, res: Response) => {
  // Generate realistic fiber speed fluctuations
  const download = Number((350 + Math.random() * 80).toFixed(1));
  const upload = Number((85 + Math.random() * 25).toFixed(1));
  const ping = Math.floor(6 + Math.random() * 6);
  const jitter = Number((0.8 + Math.random() * 1.4).toFixed(1));

  const result: SpeedTestResult = {
    downloadMbps: download,
    uploadMbps: upload,
    pingMs: ping,
    jitterMs: jitter,
    isp: 'Claro Dominicana / Altice Fibra Óptica 400M',
    serverLocation: 'Santo Domingo / Miami Gateway POP',
    testedAt: new Date().toISOString(),
    status: download > 250 ? 'optimal' : 'good',
  };

  res.json(result);
});
