import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import { RemoteSessionStatus, TicketStatus, TicketPriority } from '../database/entities.ts';
import { realtimeHub } from '../realtime.ts';

export const sessionsRouter = Router();

// GET /api/v1/sessions (List all sessions with optional filters)
sessionsRouter.get('/', (req: Request, res: Response) => {
  const { status, technicianId, deviceId } = req.query;

  let sessions = Array.from(db.sessions.values());

  if (status) {
    sessions = sessions.filter((s) => s.status === status);
  }
  if (technicianId) {
    sessions = sessions.filter((s) => s.technician_id === technicianId);
  }
  if (deviceId) {
    sessions = sessions.filter((s) => s.device_id === deviceId);
  }

  sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const hydrated = sessions.map((s) => db.getHydratedSession(s));
  res.json({ sessions: hydrated, count: hydrated.length });
});

// GET /api/v1/sessions/queue (Get pending incoming requests waiting for technician support)
sessionsRouter.get('/queue', (_req: Request, res: Response) => {
  const queued = Array.from(db.sessions.values())
    .filter(
      (s) =>
        s.status === RemoteSessionStatus.REQUESTED ||
        s.status === RemoteSessionStatus.TECHNICIAN_ASSIGNED
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const hydrated = queued.map((s) => db.getHydratedSession(s));
  res.json({
    queue: hydrated,
    count: hydrated.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/sessions/dashboard-stats (Executive KPI metrics for technician console)
sessionsRouter.get('/dashboard-stats', (_req: Request, res: Response) => {
  const tickets = Array.from(db.tickets.values());
  const devices = Array.from(db.devices.values());
  const sessions = Array.from(db.sessions.values());
  const technicians = Array.from(db.technicians.values());

  const openTickets = tickets.filter(
    (t) =>
      t.status === TicketStatus.PENDING ||
      t.status === TicketStatus.ASSIGNED ||
      t.status === TicketStatus.IN_PROGRESS
  );

  const criticalTickets = tickets.filter(
    (t) => t.priority === TicketPriority.CRITICAL && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED
  );

  const resolvedToday = tickets.filter(
    (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED
  );

  const onlineDevices = devices.filter((d) => d.is_online);
  const activeSessions = sessions.filter((s) => s.status === RemoteSessionStatus.ACTIVE);
  const queuedSessions = sessions.filter((s) => s.status === RemoteSessionStatus.REQUESTED);

  res.json({
    kpis: {
      totalTickets: tickets.length,
      openTicketsCount: openTickets.length,
      criticalTicketsCount: criticalTickets.length,
      resolvedTodayCount: resolvedToday.length,
      totalDevicesCount: devices.length,
      onlineDevicesCount: onlineDevices.length,
      offlineDevicesCount: devices.length - onlineDevices.length,
      activeSessionsCount: activeSessions.length,
      queuedRequestsCount: queuedSessions.length,
      avgResponseTimeMinutes: 4.2,
      slaComplianceRate: 98.4,
      techniciansOnline: technicians.filter((t) => t.is_online).length,
    },
    technicians: technicians.map((t) => db.getHydratedTechnician(t)),
    recentSessions: sessions.slice(0, 5).map((s) => db.getHydratedSession(s)),
  });
});

// POST /api/v1/sessions/request (Client initiates support request)
sessionsRouter.post('/request', (req: Request, res: Response) => {
  const { device_id, ticket_id, problem_summary, priority } = req.body;

  let ticket = ticket_id ? db.tickets.get(ticket_id) : null;
  const device = db.devices.get(device_id);

  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  // Create ticket if not provided
  if (!ticket) {
    const ticketId = `t-${Date.now()}`;
    const newTicket = {
      id: ticketId,
      ticket_number: `TICK-000${Math.floor(100 + Math.random() * 900)}`,
      customer_id: device.customer_id,
      device_id: device.id,
      contact_name: device.windows_user,
      contact_info: `${device.ip_address}`,
      problem_description: problem_summary || 'Solicitud de asistencia remota iniciada por usuario.',
      priority: priority || TicketPriority.MEDIUM,
      status: TicketStatus.PENDING,
      sla_due_at: new Date(Date.now() + 4 * 3600000).toISOString(),
      comments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.tickets.set(ticketId, newTicket);
    ticket = newTicket;
  }

  const newSessionId = `sess-${Date.now()}`;
  const token = `SESSTOKEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  const newSession = {
    id: newSessionId,
    ticket_id: ticket.id,
    device_id: device.id,
    technician_id: '',
    session_token: token,
    security_pin: pin,
    status: RemoteSessionStatus.REQUESTED,
    authorized_by_client: false,
    permissions: {
      view_only: false,
      allow_input: true,
      allow_clipboard: true,
      allow_file_transfer: true,
      block_remote_input_during_uac: true,
    },
    screen_info: {
      monitors_count: 1,
      selected_monitor: 1,
      resolution: '1920x1080',
      color_depth: '24-bit TrueColor',
      scaling_factor_pct: 100,
    },
    crypto_spec: {
      cipher: 'AES-256-GCM' as const,
      protocol: 'WebRTC DTLS 1.3 / SRTP' as const,
      handshake_fingerprint: `SHA256:${Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':')}`,
      key_rotation_interval_seconds: 3600,
    },
    telemetry: {
      current_fps: 60.0,
      bitrate_kbps: 4500,
      rtt_latency_ms: 14,
      packet_loss_pct: 0.0,
      dirty_rects_pct: 14.2,
      bandwidth_saved_pct: 85.8,
      gpu_encoder: 'NVIDIA NVENC H.264 (DXGI Direct3D 11)',
      frames_rendered: 60,
    },
    duration_seconds: 0,
    quality_setting: 'Balanced' as const,
    frame_rate: 60,
    client_ip: device.ip_address,
    technician_ip: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.sessions.set(newSessionId, newSession);

  // Broadcast realtime event
  realtimeHub.broadcast({
    type: 'SESSION_REQUESTED',
    topic: 'sessions',
    severity: ticket.priority === TicketPriority.CRITICAL ? 'critical' : 'warning',
    title: `📡 Solicitud Remota: ${device.computer_name}`,
    message: `${device.windows_user} (${device.customer?.company_name || 'Cliente'}) solicita soporte. Motivo: ${ticket.problem_description}`,
    data: {
      session_id: newSessionId,
      ticket_id: ticket.id,
      device_name: device.computer_name,
      customer_name: device.customer?.company_name,
      priority: ticket.priority,
    },
  });

  db.logAudit(undefined, 'SESSION_REQUEST_CREATED', 'RemoteSession', newSessionId, {
    device_id: device.id,
    ticket_id: ticket.id,
    session_token: token,
  });

  res.status(201).json(db.getHydratedSession(newSession));
});

// POST /api/v1/sessions/:id/accept (Technician accepts support request from queue)
sessionsRouter.post('/:id/accept', (req: Request, res: Response) => {
  const { technician_id } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  const tech = db.technicians.get(technician_id || 'tech-001') || Array.from(db.technicians.values())[0];
  session.technician_id = tech.id;
  session.status = RemoteSessionStatus.ACTIVE;
  session.authorized_by_client = true;
  session.started_at = new Date().toISOString();
  session.technician_ip = '200.88.45.12';
  session.updated_at = new Date().toISOString();

  const ticket = db.tickets.get(session.ticket_id);
  if (ticket) {
    ticket.technician_id = tech.id;
    ticket.status = TicketStatus.IN_PROGRESS;
    ticket.first_responded_at = ticket.first_responded_at || new Date().toISOString();
    ticket.updated_at = new Date().toISOString();
  }

  const hydrated = db.getHydratedSession(session);

  // Broadcast realtime event
  realtimeHub.broadcast({
    type: 'SESSION_ACCEPTED',
    topic: 'sessions',
    severity: 'info',
    title: `👨‍💻 Soporte Aceptado: ${hydrated.device?.computer_name || 'Equipo'}`,
    message: `${hydrated.technician?.user?.full_name || 'Técnico'} ha tomado la sesión y conectado con el cliente.`,
    data: {
      session_id: session.id,
      ticket_id: session.ticket_id,
      technician_name: hydrated.technician?.user?.full_name,
    },
  });

  db.logAudit(tech.id, 'REMOTE_SESSION_ACCEPTED_BY_TECH', 'RemoteSession', session.id, {
    technician_id: tech.id,
    session_token: session.session_token,
  });

  res.json(hydrated);
});

// POST /api/v1/sessions/:id/reject-by-tech (Technician declines queue request)
sessionsRouter.post('/:id/reject-by-tech', (req: Request, res: Response) => {
  const { reason, technician_id } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  session.status = RemoteSessionStatus.REJECTED;
  session.ended_at = new Date().toISOString();
  session.updated_at = new Date().toISOString();

  const ticket = db.tickets.get(session.ticket_id);
  if (ticket) {
    ticket.status = TicketStatus.PENDING;
    ticket.updated_at = new Date().toISOString();
  }

  db.logAudit(technician_id, 'SESSION_DECLINED_BY_TECH', 'RemoteSession', session.id, {
    reason: reason || 'Rechazado por el técnico por sobrecarga de tickets',
  });

  realtimeHub.broadcast({
    type: 'SESSION_REJECTED',
    topic: 'sessions',
    severity: 'warning',
    title: `⚠️ Solicitud Reasignada: Sesión #${session.id.slice(-4)}`,
    message: `La solicitud fue declinada por el técnico. Motivo: ${reason || 'Reasignación a otro operador'}.`,
    data: { session_id: session.id },
  });

  res.json(db.getHydratedSession(session));
});

// POST /api/v1/sessions/direct-launch (Technician initiates 1-click remote session to a device)
sessionsRouter.post('/direct-launch', (req: Request, res: Response) => {
  const { device_id, technician_id, reason, quality_setting } = req.body;

  const device = db.devices.get(device_id);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo no encontrado' });
  }

  const tech = db.technicians.get(technician_id || 'tech-001') || Array.from(db.technicians.values())[0];

  // Auto-generate ticket for direct support
  const ticketId = `t-${Date.now()}`;
  const newTicket = {
    id: ticketId,
    ticket_number: `TICK-000${Math.floor(100 + Math.random() * 900)}`,
    customer_id: device.customer_id,
    device_id: device.id,
    contact_name: device.windows_user,
    contact_info: device.ip_address,
    technician_id: tech.id,
    problem_description: reason || 'Sesión de soporte remoto directo iniciada por el técnico.',
    priority: TicketPriority.HIGH,
    status: TicketStatus.IN_PROGRESS,
    sla_due_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    first_responded_at: new Date().toISOString(),
    comments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.tickets.set(ticketId, newTicket);

  const sessionId = `sess-${Date.now()}`;
  const sessionToken = `SESSTOKEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  const session = {
    id: sessionId,
    ticket_id: ticketId,
    device_id: device.id,
    technician_id: tech.id,
    session_token: sessionToken,
    security_pin: pin,
    status: RemoteSessionStatus.TECHNICIAN_ASSIGNED,
    authorized_by_client: false,
    permissions: {
      view_only: false,
      allow_input: true,
      allow_clipboard: true,
      allow_file_transfer: true,
      block_remote_input_during_uac: true,
    },
    screen_info: {
      monitors_count: 1,
      selected_monitor: 1,
      resolution: '1920x1080',
      color_depth: '24-bit TrueColor',
      scaling_factor_pct: 100,
    },
    crypto_spec: {
      cipher: 'AES-256-GCM' as const,
      protocol: 'WebRTC DTLS 1.3 / SRTP' as const,
      handshake_fingerprint: `SHA256:${Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()).join(':')}`,
      key_rotation_interval_seconds: 3600,
    },
    telemetry: {
      current_fps: 60.0,
      bitrate_kbps: quality_setting === 'Ultra' ? 16000 : quality_setting === 'High' ? 8000 : quality_setting === 'Low' ? 1500 : 4500,
      rtt_latency_ms: 12,
      packet_loss_pct: 0.0,
      dirty_rects_pct: 16.8,
      bandwidth_saved_pct: 83.2,
      gpu_encoder: 'NVIDIA NVENC H.264 (DXGI Direct3D 11)',
      frames_rendered: 0,
    },
    duration_seconds: 0,
    quality_setting: (quality_setting || 'Balanced') as any,
    frame_rate: quality_setting === 'Ultra' ? 120 : quality_setting === 'High' ? 60 : 30,
    client_ip: device.ip_address,
    technician_ip: '200.88.45.12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.sessions.set(sessionId, session);

  realtimeHub.broadcast({
    type: 'SESSION_DIRECT_LAUNCH',
    topic: 'sessions',
    severity: 'info',
    title: `🚀 Solicitud Remota Directa -> ${device.computer_name}`,
    message: `El técnico ${tech.user?.full_name || 'Técnico'} ha enviado una petición de control remoto al equipo ${device.computer_name}. PIN de seguridad generado: ${pin}.`,
    data: {
      session_id: sessionId,
      device_id: device.id,
      device_name: device.computer_name,
      session_token: sessionToken,
      security_pin: pin,
    },
  });

  db.logAudit(tech.id, 'REMOTE_SESSION_DIRECT_LAUNCH', 'RemoteSession', sessionId, {
    device_id: device.id,
    session_token: sessionToken,
    security_pin: pin,
  });

  res.status(201).json(db.getHydratedSession(session));
});

// GET /api/v1/sessions/device/:deviceId/active (Agent check for active/incoming sessions)
sessionsRouter.get('/device/:deviceId/active', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const sessions = Array.from(db.sessions.values())
    .filter(
      (s) =>
        s.device_id === deviceId &&
        (s.status === RemoteSessionStatus.TECHNICIAN_ASSIGNED ||
          s.status === RemoteSessionStatus.ACTIVE ||
          s.status === RemoteSessionStatus.REQUESTED)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (sessions.length === 0) {
    return res.json({ session: null, message: 'Sin sesiones remotas activas' });
  }

  res.json({ session: db.getHydratedSession(sessions[0]) });
});

// POST /api/v1/sessions/:id/reject (Client explicitly denies connection access)
sessionsRouter.post('/:id/reject', (req: Request, res: Response) => {
  const { reason } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  session.status = RemoteSessionStatus.REJECTED;
  session.authorized_by_client = false;
  session.ended_at = new Date().toISOString();
  session.updated_at = new Date().toISOString();

  const ticket = db.tickets.get(session.ticket_id);
  if (ticket) {
    ticket.status = TicketStatus.WAITING_CUSTOMER;
    ticket.updated_at = new Date().toISOString();
  }

  db.logAudit(
    session.technician_id,
    'REMOTE_SESSION_REJECTED_BY_CLIENT',
    'RemoteSession',
    session.id,
    {
      session_token: session.session_token,
      reason: reason || 'Acceso rechazado por el usuario cliente',
    }
  );

  realtimeHub.broadcast({
    type: 'SESSION_REJECTED',
    topic: 'sessions',
    severity: 'warning',
    title: '🚫 Acceso Remoto Rechazado por Cliente',
    message: `El usuario en la máquina remota declinó la solicitud de conexión.`,
    data: { session_id: session.id },
  });

  res.json(db.getHydratedSession(session));
});

// GET /api/v1/sessions/:id
sessionsRouter.get('/:id', (req: Request, res: Response) => {
  const session = db.sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }
  res.json(db.getHydratedSession(session));
});

// POST /api/v1/sessions/:id/authorize (Client explicitly grants screen & control access with granular permissions)
sessionsRouter.post('/:id/authorize', (req: Request, res: Response) => {
  const { permissions, entered_pin } = req.body;
  const session = db.sessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  // Validate security PIN if required
  if (entered_pin && session.security_pin && entered_pin !== session.security_pin) {
    return res.status(401).json({ error: 'El PIN de seguridad de autorización es incorrecto.' });
  }

  if (permissions) {
    session.permissions = {
      ...session.permissions,
      ...permissions,
    };
  }

  session.authorized_by_client = true;
  session.status = RemoteSessionStatus.ACTIVE;
  session.started_at = session.started_at || new Date().toISOString();
  session.telemetry.current_fps = session.frame_rate || 60.0;
  session.telemetry.rtt_latency_ms = Math.floor(10 + Math.random() * 8);
  session.updated_at = new Date().toISOString();

  const ticket = db.tickets.get(session.ticket_id);
  if (ticket) {
    ticket.status = TicketStatus.IN_PROGRESS;
    ticket.updated_at = new Date().toISOString();
  }

  db.logAudit(
    session.technician_id,
    'REMOTE_SESSION_AUTHORIZED_BY_CLIENT',
    'RemoteSession',
    session.id,
    {
      session_token: session.session_token,
      permissions: session.permissions,
      crypto_cipher: session.crypto_spec.cipher,
      authorized: true,
      started_at: session.started_at,
    }
  );

  realtimeHub.broadcast({
    type: 'SESSION_AUTHORIZED',
    topic: 'sessions',
    severity: 'success',
    title: '🟢 Sesión Remota Autorizada y Conectada',
    message: `El cliente ha concedido acceso autorizado (Control: ${session.permissions.allow_input ? 'Total' : 'Solo Ver'}). Streaming de pantalla activo.`,
    data: {
      session_id: session.id,
      permissions: session.permissions,
      crypto_cipher: session.crypto_spec.cipher,
    },
  });

  res.json(db.getHydratedSession(session));
});

// POST /api/v1/sessions/:id/permissions (Client or Technician updates permissions in real-time)
sessionsRouter.post('/:id/permissions', (req: Request, res: Response) => {
  const { permissions } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  if (permissions) {
    session.permissions = {
      ...session.permissions,
      ...permissions,
    };
  }
  session.updated_at = new Date().toISOString();

  db.logAudit(
    session.technician_id,
    'REMOTE_SESSION_PERMISSIONS_UPDATED',
    'RemoteSession',
    session.id,
    {
      updated_permissions: session.permissions,
    }
  );

  realtimeHub.broadcast({
    type: 'SESSION_PERMISSIONS_CHANGED',
    topic: 'sessions',
    severity: 'info',
    title: '🛡️ Permisos de Sesión Modificados',
    message: `Control Remoto: ${session.permissions.allow_input ? 'Habilitado' : 'Deshabilitado'} | Portapapeles: ${session.permissions.allow_clipboard ? 'ON' : 'OFF'} | Archivos: ${session.permissions.allow_file_transfer ? 'ON' : 'OFF'}`,
    data: { session_id: session.id, permissions: session.permissions },
  });

  res.json(db.getHydratedSession(session));
});

// POST /api/v1/sessions/:id/quality (Technician configures video stream settings)
sessionsRouter.post('/:id/quality', (req: Request, res: Response) => {
  const { quality_setting, frame_rate, selected_monitor, resolution } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  if (quality_setting) {
    session.quality_setting = quality_setting;
    session.telemetry.bitrate_kbps =
      quality_setting === 'Ultra'
        ? 16000
        : quality_setting === 'High'
        ? 8000
        : quality_setting === 'Low'
        ? 1500
        : 4500;
  }

  if (frame_rate) {
    session.frame_rate = Number(frame_rate);
    session.telemetry.current_fps = Number(frame_rate);
  }

  if (selected_monitor !== undefined) {
    session.screen_info.selected_monitor = Number(selected_monitor);
  }

  if (resolution) {
    session.screen_info.resolution = resolution;
  }

  session.updated_at = new Date().toISOString();

  realtimeHub.broadcast({
    type: 'SESSION_STREAM_CONFIG_UPDATED',
    topic: 'sessions',
    severity: 'info',
    title: '⚙️ Configuración de Video Actualizada',
    message: `Perfil: ${session.quality_setting} | ${session.frame_rate} FPS | Monitor ${session.screen_info.selected_monitor} | ${session.screen_info.resolution}`,
    data: {
      session_id: session.id,
      quality: session.quality_setting,
      fps: session.frame_rate,
      monitor: session.screen_info.selected_monitor,
    },
  });

  res.json(db.getHydratedSession(session));
});

// POST /api/v1/sessions/:id/input (Secure SendInput Injection)
sessionsRouter.post('/:id/input', (req: Request, res: Response) => {
  const { event_type, x, y, button, key, delta_y, command, text } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  if (session.status !== RemoteSessionStatus.ACTIVE) {
    return res.status(400).json({ error: 'La sesión no está activa para procesar eventos de entrada.' });
  }

  // Security Check: is client allowing input?
  if (!session.permissions.allow_input && event_type !== 'clipboard_sync') {
    return res.status(403).json({
      error: 'Entrada remota denegada: El cliente configuró la sesión en modo "Solo Ver Pantalla".',
      code: 'INPUT_PERMISSION_DENIED',
    });
  }

  if (event_type === 'clipboard_sync' && !session.permissions.allow_clipboard) {
    return res.status(403).json({
      error: 'Portapapeles denegado: El cliente ha deshabilitado el acceso al portapapeles.',
      code: 'CLIPBOARD_PERMISSION_DENIED',
    });
  }

  // Log and broadcast input event to the simulated endpoint agent
  const processedEvent = {
    id: `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    session_id: session.id,
    event_type,
    x,
    y,
    button,
    key,
    delta_y,
    command,
    text,
    timestamp: new Date().toISOString(),
    api_call: 'Win32_SendInput',
  };

  session.telemetry.frames_rendered += 1;

  res.json({
    success: true,
    message: 'Evento SendInput inyectado correctamente en el agente Windows',
    event: processedEvent,
  });
});

// POST /api/v1/sessions/:id/telemetry (Simulate or update real-time telemetry stream)
sessionsRouter.post('/:id/telemetry', (req: Request, res: Response) => {
  const { current_fps, bitrate_kbps, rtt_latency_ms, packet_loss_pct, dirty_rects_pct } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  if (current_fps !== undefined) session.telemetry.current_fps = Number(current_fps);
  if (bitrate_kbps !== undefined) session.telemetry.bitrate_kbps = Number(bitrate_kbps);
  if (rtt_latency_ms !== undefined) session.telemetry.rtt_latency_ms = Number(rtt_latency_ms);
  if (packet_loss_pct !== undefined) session.telemetry.packet_loss_pct = Number(packet_loss_pct);
  if (dirty_rects_pct !== undefined) {
    session.telemetry.dirty_rects_pct = Number(dirty_rects_pct);
    session.telemetry.bandwidth_saved_pct = Math.max(0, 100 - Number(dirty_rects_pct));
  }

  session.telemetry.frames_rendered += 30;
  session.updated_at = new Date().toISOString();

  res.json({ telemetry: session.telemetry });
});

// POST /api/v1/sessions/:id/revoke (Client Emergency Panic Button "REVOCAR ACCESO YA")
sessionsRouter.post('/:id/revoke', (req: Request, res: Response) => {
  const { reason } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  session.status = RemoteSessionStatus.TERMINATED;
  session.authorized_by_client = false;
  session.ended_at = new Date().toISOString();
  if (session.started_at) {
    session.duration_seconds = Math.round(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
    );
  }
  session.updated_at = new Date().toISOString();

  db.logAudit(
    session.technician_id,
    'EMERGENCY_ACCESS_REVOKED_BY_CLIENT',
    'RemoteSession',
    session.id,
    {
      action: 'PANIC_BUTTON_PRESSED',
      reason: reason || 'El usuario del cliente presionó el botón de pánico [REVOCAR ACCESO YA]',
      duration_seconds: session.duration_seconds,
    }
  );

  realtimeHub.broadcast({
    type: 'SESSION_REVOKED_BY_CLIENT',
    topic: 'sessions',
    severity: 'critical',
    title: '🚨 ACCESO REVOCADO POR EL CLIENTE',
    message: `El cliente ha cancelado instantáneamente el control remoto de su equipo mediante el botón de pánico.`,
    data: {
      session_id: session.id,
      revocation_timestamp: session.ended_at,
    },
  });

  res.json(db.getHydratedSession(session));
});

// POST /api/v1/sessions/:id/terminate ("FINALIZAR SOPORTE" by Client or Technician)
sessionsRouter.post('/:id/terminate', (req: Request, res: Response) => {
  const { reason, terminated_by } = req.body;
  const session = db.sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  session.status = RemoteSessionStatus.COMPLETED;
  session.ended_at = new Date().toISOString();
  if (session.started_at) {
    session.duration_seconds = Math.round(
      (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000
    );
  }
  session.updated_at = new Date().toISOString();

  const ticket = db.tickets.get(session.ticket_id);
  if (ticket) {
    ticket.status = TicketStatus.RESOLVED;
    ticket.updated_at = new Date().toISOString();
  }

  db.logAudit(
    session.technician_id,
    'REMOTE_SESSION_TERMINATED',
    'RemoteSession',
    session.id,
    {
      terminated_by: terminated_by || 'User/Technician Request',
      duration_seconds: session.duration_seconds,
      reason: reason || 'Sesión finalizada con éxito',
    }
  );

  realtimeHub.broadcast({
    type: 'SESSION_TERMINATED',
    topic: 'sessions',
    severity: 'info',
    title: '🏁 Sesión Remota Finalizada',
    message: `La sesión #${session.id.slice(-4)} ha concluido (Duración: ${Math.round(session.duration_seconds / 60)} min).`,
    data: { session_id: session.id, duration: session.duration_seconds },
  });

  res.json(db.getHydratedSession(session));
});

