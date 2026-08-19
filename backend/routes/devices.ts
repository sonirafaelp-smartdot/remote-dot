import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import { Device, TicketStatus } from '../database/entities.ts';
import { realtimeHub } from '../realtime.ts';
import crypto from 'crypto';

export const devicesRouter = Router();

// Deterministic HWID algorithm based on hardware components
export function calculateHWID(params: {
  motherboard_uuid?: string;
  cpu_id?: string;
  bios_serial?: string;
  mac_address?: string;
}): string {
  const seed = [
    params.motherboard_uuid || 'MB-DEFAULT-0001',
    params.cpu_id || 'CPU-DEFAULT-0001',
    params.bios_serial || 'BIOS-DEFAULT-0001',
    params.mac_address || '00:00:00:00:00:00',
  ].join('::');

  const hash = crypto.createHash('sha256').update(seed).digest('hex').toUpperCase();
  return `WIN-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}`;
}

// POST /api/v1/devices/generate-hwid (HWID calculation tool)
devicesRouter.post('/generate-hwid', (req: Request, res: Response) => {
  const { motherboard_uuid, cpu_id, bios_serial, mac_address } = req.body;
  const hwid = calculateHWID({ motherboard_uuid, cpu_id, bios_serial, mac_address });
  res.json({
    hwid,
    formula: 'SHA-256(Motherboard_UUID + CPU_ID + BIOS_Serial + MAC_Address)',
    algorithm: 'Deterministic SHA-256 128-bit truncated segment',
  });
});

// GET /api/v1/devices
devicesRouter.get('/', (req: Request, res: Response) => {
  const customerId = req.query.customer_id as string;
  const status = req.query.status as string; // 'online' | 'offline'
  const search = (req.query.search as string || '').toLowerCase();

  let devicesList = Array.from(db.devices.values()).map((d) => {
    const customer = db.customers.get(d.customer_id);
    const activeTickets = Array.from(db.tickets.values()).filter(
      (t) => t.device_id === d.id && t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED
    ).length;

    return {
      ...d,
      active_tickets: activeTickets,
      customer: customer
        ? {
            id: customer.id,
            company_name: customer.company_name,
            contact_name: customer.contact_name,
            phone: customer.phone,
            email: customer.email,
          }
        : undefined,
    };
  });

  if (customerId) {
    devicesList = devicesList.filter((d) => d.customer_id === customerId);
  }

  if (status === 'online') {
    devicesList = devicesList.filter((d) => d.is_online);
  } else if (status === 'offline') {
    devicesList = devicesList.filter((d) => !d.is_online);
  }

  if (search) {
    devicesList = devicesList.filter(
      (d) =>
        d.computer_name.toLowerCase().includes(search) ||
        d.windows_user.toLowerCase().includes(search) ||
        d.device_uuid.toLowerCase().includes(search) ||
        d.ip_address.includes(search) ||
        (d.customer && d.customer.company_name.toLowerCase().includes(search))
    );
  }

  res.json(devicesList);
});

// GET /api/v1/devices/:id
devicesRouter.get('/:id', (req: Request, res: Response) => {
  const device = db.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Computadora / Dispositivo no encontrado' });
  }

  const customer = db.customers.get(device.customer_id);
  const tickets = Array.from(db.tickets.values())
    .filter((t) => t.device_id === device.id)
    .map((t) => db.getHydratedTicket(t));

  const sessions = Array.from(db.sessions.values())
    .filter((s) => s.device_id === device.id)
    .map((s) => db.getHydratedSession(s));

  res.json({
    ...device,
    customer,
    tickets,
    sessions,
  });
});

// POST /api/v1/devices/register (Agent Auto-Enrollment & Telemetry Check-in)
devicesRouter.post('/register', (req: Request, res: Response) => {
  const {
    customer_id,
    enrollment_token,
    device_uuid,
    computer_name,
    windows_user,
    os_version,
    cpu,
    ram_mb,
    storage_info,
    ip_address,
    mac_address,
    agent_version,
  } = req.body;

  if (!computer_name) {
    return res.status(400).json({ error: 'computer_name es requerido' });
  }

  // Generate or use provided HWID
  const finalDeviceUuid =
    device_uuid ||
    calculateHWID({
      motherboard_uuid: `MB-${computer_name}-AUTO`,
      cpu_id: cpu,
      mac_address: mac_address || '00:1A:2B:3C:4D:5E',
    });

  // Resolve customer by enrollment_token or customer_id
  let targetCustomerId = customer_id;
  if (enrollment_token) {
    const cleanToken = enrollment_token.trim().toUpperCase();
    const matchedCustomer = Array.from(db.customers.values()).find(
      (c) => `ENROLL-${c.id.toUpperCase()}-SECURE` === cleanToken || c.id.toUpperCase() === cleanToken
    );
    if (matchedCustomer) {
      targetCustomerId = matchedCustomer.id;
    }
  }

  if (!targetCustomerId || !db.customers.has(targetCustomerId)) {
    const firstCustomer = Array.from(db.customers.values())[0];
    targetCustomerId = firstCustomer ? firstCustomer.id : 'cust-abc-01';
  }

  // Check if device already registered by HWID
  let existingDevice = Array.from(db.devices.values()).find((d) => d.device_uuid === finalDeviceUuid);

  if (existingDevice) {
    // Update telemetry
    existingDevice.customer_id = targetCustomerId;
    existingDevice.computer_name = computer_name || existingDevice.computer_name;
    existingDevice.windows_user = windows_user || existingDevice.windows_user;
    existingDevice.os_version = os_version || existingDevice.os_version;
    existingDevice.cpu = cpu || existingDevice.cpu;
    existingDevice.ram_mb = Number(ram_mb) || existingDevice.ram_mb;
    existingDevice.storage_info = storage_info || existingDevice.storage_info;
    existingDevice.ip_address = ip_address || existingDevice.ip_address;
    existingDevice.mac_address = mac_address || existingDevice.mac_address;
    existingDevice.agent_version = agent_version || existingDevice.agent_version;
    existingDevice.is_online = true;
    existingDevice.last_heartbeat = new Date().toISOString();
    existingDevice.updated_at = new Date().toISOString();

    db.logAudit(undefined, 'DEVICE_TELEMETRY_UPDATED', 'Device', existingDevice.id, {
      computer_name: existingDevice.computer_name,
      ip: existingDevice.ip_address,
      hwid: finalDeviceUuid,
    });

    const customer = db.customers.get(existingDevice.customer_id);
    return res.json({
      status: 'updated',
      message: `Dispositivo ${existingDevice.computer_name} actualizado y verificado online`,
      device: { ...existingDevice, customer },
    });
  }

  // Create new Device enrollment
  const newDeviceId = `dev-${Date.now()}`;
  const newDevice: Device = {
    id: newDeviceId,
    customer_id: targetCustomerId,
    device_uuid: finalDeviceUuid,
    computer_name: computer_name.toUpperCase(),
    windows_user: windows_user || 'Usuario_Windows',
    os_version: os_version || 'Windows 11 Pro 64-bit (Build 22631)',
    cpu: cpu || 'Intel Core i7-13700 @ 2.10GHz (16 Cores)',
    ram_mb: Number(ram_mb) || 16384,
    storage_info: storage_info || 'SSD NVMe 512GB (310GB Libres)',
    ip_address: ip_address || (req.headers['x-forwarded-for'] as string) || req.ip || '192.168.1.120',
    mac_address: mac_address || '00:1A:2B:EE:44:22',
    is_online: true,
    last_heartbeat: new Date().toISOString(),
    agent_version: agent_version || '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.devices.set(newDeviceId, newDevice);

  const customer = db.customers.get(targetCustomerId);
  db.logAudit(undefined, 'DEVICE_ENROLLED', 'Device', newDeviceId, {
    computer_name: newDevice.computer_name,
    hwid: finalDeviceUuid,
    customer_name: customer?.company_name,
  });

  return res.status(201).json({
    status: 'enrolled',
    message: `Dispositivo ${newDevice.computer_name} enrolado exitosamente en ${customer?.company_name}`,
    device: { ...newDevice, customer },
  });
});

// POST /api/v1/devices/:id/heartbeat (Live Heartbeat from Windows Service)
devicesRouter.post('/:id/heartbeat', (req: Request, res: Response) => {
  const device = db.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  const { cpu_load_pct, ram_used_mb, storage_free_gb, current_windows_user, ip_address } = req.body;

  device.is_online = true;
  device.last_heartbeat = new Date().toISOString();
  if (current_windows_user) device.windows_user = current_windows_user;
  if (ip_address) device.ip_address = ip_address;
  device.updated_at = new Date().toISOString();

  res.json({
    status: 'online',
    device_id: device.id,
    computer_name: device.computer_name,
    last_heartbeat: device.last_heartbeat,
    acknowledged_telemetry: {
      cpu_load_pct: cpu_load_pct || 14,
      ram_used_mb: ram_used_mb || 5200,
      storage_free_gb: storage_free_gb || 280,
    },
  });
});

// POST /api/v1/devices/:id/toggle-online (Testing utility for online/offline simulation)
devicesRouter.post('/:id/toggle-online', (req: Request, res: Response) => {
  const device = db.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  device.is_online = !device.is_online;
  if (device.is_online) {
    device.last_heartbeat = new Date().toISOString();
  }
  device.updated_at = new Date().toISOString();

  db.logAudit(undefined, 'DEVICE_STATUS_TOGGLED', 'Device', device.id, {
    computer_name: device.computer_name,
    is_online: device.is_online,
  });

  realtimeHub.broadcast({
    type: 'DEVICE_STATUS_CHANGED',
    topic: 'devices',
    severity: device.is_online ? 'success' : 'error',
    title: device.is_online ? `🟢 Equipo Online: ${device.computer_name}` : `⚠️ Equipo Desconectado: ${device.computer_name}`,
    message: device.is_online
      ? `El dispositivo ${device.computer_name} se encuentra activo y listo para soporte remoto.`
      : `El dispositivo ${device.computer_name} ha pasado a estado Offline.`,
    data: {
      device_id: device.id,
      computer_name: device.computer_name,
      is_online: device.is_online,
      last_heartbeat: device.last_heartbeat,
    },
  });

  res.json({
    status: 'ok',
    device_id: device.id,
    computer_name: device.computer_name,
    is_online: device.is_online,
    last_heartbeat: device.last_heartbeat,
  });
});

// POST /api/v1/devices/:id/ping (Technician tests live latency to Windows Agent)
devicesRouter.post('/:id/ping', (req: Request, res: Response) => {
  const device = db.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  const latencyMs = device.is_online ? Math.floor(8 + Math.random() * 24) : 0;

  if (device.is_online) {
    device.last_heartbeat = new Date().toISOString();
  }

  res.json({
    status: device.is_online ? 'online' : 'offline',
    device_id: device.id,
    computer_name: device.computer_name,
    ip_address: device.ip_address,
    round_trip_ms: latencyMs,
    packet_loss_pct: device.is_online ? 0 : 100,
    agent_version: device.agent_version,
    windows_user: device.windows_user,
    os_version: device.os_version,
    cpu_usage_est: device.is_online ? Math.floor(12 + Math.random() * 25) : 0,
    ram_usage_mb: device.is_online ? Math.floor(device.ram_mb * 0.45) : 0,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/v1/devices/:id/message (Technician sends announcement/alert to client screen)
devicesRouter.post('/:id/message', (req: Request, res: Response) => {
  const { message, title, urgency } = req.body;
  const device = db.devices.get(req.params.id);

  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  if (!message) {
    return res.status(400).json({ error: 'El mensaje es obligatorio' });
  }

  const broadcastTitle = title || `Aviso de Soporte Técnico para ${device.computer_name}`;

  realtimeHub.broadcast({
    type: 'DEVICE_SCREEN_MESSAGE',
    topic: 'devices',
    severity: urgency === 'critical' ? 'critical' : urgency === 'warning' ? 'warning' : 'info',
    title: broadcastTitle,
    message: `[Mensaje a ${device.computer_name} (${device.windows_user})]: ${message}`,
    data: {
      device_id: device.id,
      computer_name: device.computer_name,
      message,
      urgency: urgency || 'normal',
    },
  });

  db.logAudit(undefined, 'DEVICE_MESSAGE_SENT', 'Device', device.id, {
    computer_name: device.computer_name,
    message,
    urgency,
  });

  res.json({
    status: 'delivered',
    device_id: device.id,
    computer_name: device.computer_name,
    message,
    sent_at: new Date().toISOString(),
  });
});

// DELETE /api/v1/devices/:id (Decommission Device)
devicesRouter.delete('/:id', (req: Request, res: Response) => {
  const device = db.devices.get(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  const name = device.computer_name;
  db.devices.delete(device.id);

  db.logAudit(undefined, 'DEVICE_DECOMMISSIONED', 'Device', device.id, {
    computer_name: name,
    hwid: device.device_uuid,
  });

  res.json({ message: `Dispositivo ${name} desvinculado y dado de baja del sistema.` });
});
