import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import { realtimeHub } from '../realtime.ts';
import {
  SupportTicket,
  TicketPriority,
  TicketStatus,
  RemoteSessionStatus,
  TicketCategory,
  TicketComment,
} from '../database/entities.ts';

export const ticketsRouter = Router();

// Helper to compute SLA duration based on priority
function computeSlaDueDate(priority: TicketPriority): string {
  const now = Date.now();
  switch (priority) {
    case TicketPriority.CRITICAL:
      return new Date(now + 2 * 3600000).toISOString(); // 2 hours
    case TicketPriority.HIGH:
      return new Date(now + 6 * 3600000).toISOString(); // 6 hours
    case TicketPriority.MEDIUM:
      return new Date(now + 24 * 3600000).toISOString(); // 24 hours
    case TicketPriority.LOW:
    default:
      return new Date(now + 48 * 3600000).toISOString(); // 48 hours
  }
}

// GET /api/v1/tickets/stats (Helpdesk analytics & SLA metrics)
ticketsRouter.get('/stats', (_req: Request, res: Response) => {
  const tickets = Array.from(db.tickets.values());

  const total = tickets.length;
  const pending = tickets.filter((t) => t.status === TicketStatus.PENDING).length;
  const assigned = tickets.filter((t) => t.status === TicketStatus.ASSIGNED).length;
  const inProgress = tickets.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;
  const waitingCustomer = tickets.filter((t) => t.status === TicketStatus.WAITING_CUSTOMER).length;
  const resolved = tickets.filter((t) => t.status === TicketStatus.RESOLVED).length;
  const closed = tickets.filter((t) => t.status === TicketStatus.CLOSED).length;
  const openTotal = pending + assigned + inProgress + waitingCustomer;

  const critical = tickets.filter((t) => t.priority === TicketPriority.CRITICAL && t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED).length;
  const high = tickets.filter((t) => t.priority === TicketPriority.HIGH && t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED).length;

  // SLA compliance calculation
  const now = new Date().getTime();
  let slaViolated = 0;
  tickets.forEach((t) => {
    if (t.sla_due_at && (t.status === TicketStatus.PENDING || t.status === TicketStatus.ASSIGNED || t.status === TicketStatus.IN_PROGRESS)) {
      if (new Date(t.sla_due_at).getTime() < now) {
        slaViolated += 1;
      }
    }
  });
  const slaCompliancePct = openTotal > 0 ? Math.max(0, Math.round(((openTotal - slaViolated) / openTotal) * 100)) : 100;

  // Distribution by Category
  const byCategory: Record<string, number> = {};
  Object.values(TicketCategory).forEach((cat) => {
    byCategory[cat] = tickets.filter((t) => t.category === cat).length;
  });

  // Distribution by Priority
  const byPriority = {
    [TicketPriority.CRITICAL]: tickets.filter((t) => t.priority === TicketPriority.CRITICAL).length,
    [TicketPriority.HIGH]: tickets.filter((t) => t.priority === TicketPriority.HIGH).length,
    [TicketPriority.MEDIUM]: tickets.filter((t) => t.priority === TicketPriority.MEDIUM).length,
    [TicketPriority.LOW]: tickets.filter((t) => t.priority === TicketPriority.LOW).length,
  };

  res.json({
    total,
    open_total: openTotal,
    pending,
    assigned,
    in_progress: inProgress,
    waiting_customer: waitingCustomer,
    resolved,
    closed,
    critical_open: critical,
    high_open: high,
    sla_compliance_pct: slaCompliancePct,
    sla_violated_count: slaViolated,
    by_category: byCategory,
    by_priority: byPriority,
  });
});

// GET /api/v1/tickets (List with advanced filtering and search)
ticketsRouter.get('/', (req: Request, res: Response) => {
  const { status, priority, category, customer_id, technician_id, q, sort_by, order } = req.query;

  let list = Array.from(db.tickets.values());

  if (status) {
    list = list.filter((t) => t.status === status);
  }
  if (priority) {
    list = list.filter((t) => t.priority === priority);
  }
  if (category) {
    list = list.filter((t) => t.category === category);
  }
  if (customer_id) {
    list = list.filter((t) => t.customer_id === customer_id);
  }
  if (technician_id) {
    list = list.filter((t) => t.technician_id === technician_id);
  }

  // Text search query
  if (q && typeof q === 'string') {
    const term = q.toLowerCase().trim();
    list = list.filter((t) => {
      const device = db.devices.get(t.device_id);
      const customer = db.customers.get(t.customer_id);
      return (
        t.ticket_number.toLowerCase().includes(term) ||
        t.problem_description.toLowerCase().includes(term) ||
        (t.contact_name && t.contact_name.toLowerCase().includes(term)) ||
        (t.contact_info && t.contact_info.toLowerCase().includes(term)) ||
        (device && device.computer_name.toLowerCase().includes(term)) ||
        (customer && customer.company_name.toLowerCase().includes(term))
      );
    });
  }

  // Sorting
  list.sort((a, b) => {
    if (sort_by === 'priority') {
      const pWeights = {
        [TicketPriority.CRITICAL]: 4,
        [TicketPriority.HIGH]: 3,
        [TicketPriority.MEDIUM]: 2,
        [TicketPriority.LOW]: 1,
      };
      const diff = (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
      return order === 'asc' ? -diff : diff;
    }
    if (sort_by === 'sla' && a.sla_due_at && b.sla_due_at) {
      const diff = new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime();
      return order === 'desc' ? -diff : diff;
    }
    // Default: Created at descending
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return order === 'asc' ? -diff : diff;
  });

  const hydrated = list.map((t) => db.getHydratedTicket(t));
  res.json(hydrated);
});

// GET /api/v1/tickets/:id
ticketsRouter.get('/:id', (req: Request, res: Response) => {
  const ticket = db.tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }
  res.json(db.getHydratedTicket(ticket));
});

// POST /api/v1/tickets (Create Support Ticket)
ticketsRouter.post('/', (req: Request, res: Response) => {
  const {
    device_id,
    customer_id,
    problem_description,
    priority,
    category,
    requested_by_user_id,
    contact_name,
    contact_info,
  } = req.body;

  if (!problem_description) {
    return res.status(400).json({ error: 'problem_description es obligatorio' });
  }

  let finalDeviceId = device_id;
  let finalCustomerId = customer_id;

  if (finalDeviceId) {
    const device = db.devices.get(finalDeviceId);
    if (!device) {
      return res.status(404).json({ error: 'El dispositivo especificado no existe' });
    }
    finalCustomerId = device.customer_id;
  } else if (finalCustomerId) {
    // Pick the first registered device for this customer
    const dev = Array.from(db.devices.values()).find((d) => d.customer_id === finalCustomerId);
    if (dev) {
      finalDeviceId = dev.id;
    } else {
      return res.status(400).json({ error: 'El cliente no posee dispositivos enrolados' });
    }
  } else {
    // Default to first device
    const firstDev = Array.from(db.devices.values())[0];
    if (!firstDev) {
      return res.status(400).json({ error: 'No hay dispositivos registrados en el sistema' });
    }
    finalDeviceId = firstDev.id;
    finalCustomerId = firstDev.customer_id;
  }

  const device = db.devices.get(finalDeviceId)!;
  const ticketNumber = db.generateTicketNumber();
  const ticketId = `t-${Date.now()}`;

  const validPriority = Object.values(TicketPriority).includes(priority)
    ? priority
    : TicketPriority.MEDIUM;

  const validCategory = Object.values(TicketCategory).includes(category)
    ? category
    : TicketCategory.GENERAL;

  const newTicket: SupportTicket = {
    id: ticketId,
    ticket_number: ticketNumber,
    customer_id: finalCustomerId,
    device_id: finalDeviceId,
    requested_by_user_id,
    contact_name: contact_name || device.windows_user || 'Usuario Local',
    contact_info: contact_info || '',
    technician_id: undefined,
    category: validCategory,
    problem_description,
    priority: validPriority,
    status: TicketStatus.PENDING,
    sla_due_at: computeSlaDueDate(validPriority),
    comments: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.tickets.set(ticketId, newTicket);

  db.logAudit(
    requested_by_user_id,
    'SUPPORT_TICKET_CREATED',
    'SupportTicket',
    ticketId,
    {
      ticket_number: ticketNumber,
      computer_name: device.computer_name,
      contact_name: newTicket.contact_name,
      contact_info: newTicket.contact_info,
      priority: validPriority,
      category: validCategory,
    }
  );

  // Broadcast real-time event
  const severityMap = {
    [TicketPriority.CRITICAL]: 'critical' as const,
    [TicketPriority.HIGH]: 'warning' as const,
    [TicketPriority.MEDIUM]: 'info' as const,
    [TicketPriority.LOW]: 'info' as const,
  };

  realtimeHub.broadcast({
    type: 'TICKET_CREATED',
    topic: 'tickets',
    severity: severityMap[validPriority] || 'info',
    title: `🎫 Nuevo Ticket ${ticketNumber} (${validPriority})`,
    message: `${newTicket.contact_name} en ${device.computer_name}: ${problem_description.substring(0, 100)}...`,
    data: {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      priority: validPriority,
      device_name: device.computer_name,
    },
  });

  const hydrated = db.getHydratedTicket(newTicket);
  res.status(201).json(hydrated);
});

// PATCH /api/v1/tickets/:id (Update ticket metadata)
ticketsRouter.patch('/:id', (req: Request, res: Response) => {
  const ticket = db.tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  const { priority, status, category, problem_description, resolution_notes, technician_id } = req.body;

  if (priority && Object.values(TicketPriority).includes(priority)) {
    ticket.priority = priority;
    ticket.sla_due_at = computeSlaDueDate(priority);
  }
  if (status && Object.values(TicketStatus).includes(status)) {
    ticket.status = status;
    if (status === TicketStatus.RESOLVED && !ticket.resolved_at) {
      ticket.resolved_at = new Date().toISOString();
    }
    if (status === TicketStatus.CLOSED && !ticket.closed_at) {
      ticket.closed_at = new Date().toISOString();
    }
  }
  if (category && Object.values(TicketCategory).includes(category)) {
    ticket.category = category;
  }
  if (problem_description) {
    ticket.problem_description = problem_description;
  }
  if (resolution_notes !== undefined) {
    ticket.resolution_notes = resolution_notes;
  }
  if (technician_id !== undefined) {
    ticket.technician_id = technician_id;
  }

  ticket.updated_at = new Date().toISOString();

  db.logAudit(ticket.technician_id, 'TICKET_METADATA_UPDATED', 'SupportTicket', ticket.id, {
    ticket_number: ticket.ticket_number,
    changes: req.body,
  });

  if (status === TicketStatus.RESOLVED) {
    realtimeHub.broadcast({
      type: 'TICKET_RESOLVED',
      topic: 'tickets',
      severity: 'success',
      title: `✅ Ticket ${ticket.ticket_number} Resuelto`,
      message: `El ticket ha sido marcado como Resuelto con notas técnicas actualizadas.`,
      data: { ticket_id: ticket.id, ticket_number: ticket.ticket_number },
    });
  } else {
    realtimeHub.broadcast({
      type: 'TICKET_UPDATED',
      topic: 'tickets',
      severity: 'info',
      title: `🔄 Ticket ${ticket.ticket_number} Actualizado`,
      message: `Estado: ${ticket.status} | Prioridad: ${ticket.priority}`,
      data: { ticket_id: ticket.id, ticket_number: ticket.ticket_number, status: ticket.status },
    });
  }

  res.json(db.getHydratedTicket(ticket));
});

// POST /api/v1/tickets/:id/comments (Add comment or internal technician note)
ticketsRouter.post('/:id/comments', (req: Request, res: Response) => {
  const { author_name, author_role, author_id, message, is_internal_note } = req.body;
  const ticket = db.tickets.get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'El mensaje del comentario es obligatorio' });
  }

  const comment: TicketComment = {
    id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ticket_id: ticket.id,
    author_name: author_name || 'Técnico Especialista',
    author_role: author_role || 'Technician',
    author_id,
    message: message.trim(),
    is_internal_note: !!is_internal_note,
    created_at: new Date().toISOString(),
  };

  if (!ticket.comments) {
    ticket.comments = [];
  }
  ticket.comments.push(comment);
  ticket.updated_at = new Date().toISOString();

  db.logAudit(author_id, 'TICKET_COMMENT_ADDED', 'SupportTicket', ticket.id, {
    ticket_number: ticket.ticket_number,
    is_internal_note: comment.is_internal_note,
    author_name: comment.author_name,
  });

  realtimeHub.broadcast({
    type: 'TICKET_COMMENT',
    topic: 'tickets',
    severity: is_internal_note ? 'warning' : 'info',
    title: is_internal_note
      ? `🔒 Nota Interna en ${ticket.ticket_number}`
      : `💬 Comentario de Soporte en ${ticket.ticket_number}`,
    message: `${comment.author_name}: "${comment.message.substring(0, 80)}..."`,
    data: { ticket_id: ticket.id, ticket_number: ticket.ticket_number, is_internal_note: !!is_internal_note },
  });

  res.status(201).json({
    comment,
    ticket: db.getHydratedTicket(ticket),
  });
});

// POST /api/v1/tickets/:id/assign (Assign Technician + Create or Update Remote Session)
ticketsRouter.post('/:id/assign', (req: Request, res: Response) => {
  const { technician_id } = req.body;
  const ticket = db.tickets.get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  let techId = technician_id;
  if (!techId) {
    const onlineTech = Array.from(db.technicians.values()).find((t) => t.is_online);
    techId = onlineTech ? onlineTech.id : Array.from(db.technicians.values())[0]?.id;
  }

  ticket.technician_id = techId;
  ticket.status = TicketStatus.IN_PROGRESS;
  if (!ticket.first_responded_at) {
    ticket.first_responded_at = new Date().toISOString();
  }
  ticket.updated_at = new Date().toISOString();

  // Create a corresponding RemoteSession
  const sessionId = `sess-${Date.now()}`;
  const sessionToken = `STOKEN-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${ticket.ticket_number}`;

  const sessionPin = Math.floor(100000 + Math.random() * 900000).toString();
  const session = {
    id: sessionId,
    ticket_id: ticket.id,
    device_id: ticket.device_id,
    technician_id: techId,
    session_token: sessionToken,
    security_pin: sessionPin,
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
      handshake_fingerprint: 'SHA256:7B:3A:99:F1:4E:22:90:DA:55:18:2C:EE:88:41:9B:04',
      key_rotation_interval_seconds: 3600,
    },
    telemetry: {
      current_fps: 60,
      bitrate_kbps: 4500,
      rtt_latency_ms: 14,
      packet_loss_pct: 0.0,
      dirty_rects_pct: 15.0,
      bandwidth_saved_pct: 85.0,
      gpu_encoder: 'NVIDIA NVENC H.264 (DXGI Desktop Duplication)',
      frames_rendered: 0,
    },
    duration_seconds: 0,
    quality_setting: 'High' as const,
    frame_rate: 60,
    client_ip: db.devices.get(ticket.device_id)?.ip_address || '127.0.0.1',
    technician_ip: '200.88.45.12',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.sessions.set(sessionId, session);

  db.logAudit(
    techId,
    'TICKET_ASSIGNED_TECHNICIAN',
    'SupportTicket',
    ticket.id,
    {
      ticket_number: ticket.ticket_number,
      technician_id: techId,
      session_id: sessionId,
    }
  );

  res.json({
    ticket: db.getHydratedTicket(ticket),
    session: db.getHydratedSession(session),
  });
});

// POST /api/v1/tickets/:id/resolve (Resolve ticket)
ticketsRouter.post('/:id/resolve', (req: Request, res: Response) => {
  const { resolution_notes } = req.body;
  const ticket = db.tickets.get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  ticket.status = TicketStatus.RESOLVED;
  ticket.resolution_notes = resolution_notes || 'Problema resuelto satisfactoriamente por el técnico.';
  ticket.resolved_at = new Date().toISOString();
  ticket.updated_at = new Date().toISOString();

  db.logAudit(ticket.technician_id, 'TICKET_RESOLVED', 'SupportTicket', ticket.id, {
    ticket_number: ticket.ticket_number,
    resolution_notes: ticket.resolution_notes,
  });

  res.json(db.getHydratedTicket(ticket));
});

// POST /api/v1/tickets/:id/close (Close ticket)
ticketsRouter.post('/:id/close', (req: Request, res: Response) => {
  const { notes } = req.body;
  const ticket = db.tickets.get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  ticket.status = TicketStatus.CLOSED;
  ticket.closed_at = new Date().toISOString();
  if (notes) {
    ticket.resolution_notes = (ticket.resolution_notes ? ticket.resolution_notes + '\n\n' : '') + `Cierre: ${notes}`;
  }
  ticket.updated_at = new Date().toISOString();

  db.logAudit(ticket.technician_id, 'TICKET_CLOSED', 'SupportTicket', ticket.id, {
    ticket_number: ticket.ticket_number,
  });

  res.json(db.getHydratedTicket(ticket));
});

// POST /api/v1/tickets/:id/reopen (Reopen ticket)
ticketsRouter.post('/:id/reopen', (req: Request, res: Response) => {
  const { reason } = req.body;
  const ticket = db.tickets.get(req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  ticket.status = TicketStatus.IN_PROGRESS;
  ticket.resolved_at = undefined;
  ticket.closed_at = undefined;
  ticket.updated_at = new Date().toISOString();

  if (!ticket.comments) ticket.comments = [];
  ticket.comments.push({
    id: `c-${Date.now()}`,
    ticket_id: ticket.id,
    author_name: 'Sistema / Helpdesk',
    author_role: 'System',
    message: `Ticket reabierto: ${reason || 'El cliente indicó que el fallo persiste.'}`,
    is_internal_note: false,
    created_at: new Date().toISOString(),
  });

  db.logAudit(ticket.technician_id, 'TICKET_REOPENED', 'SupportTicket', ticket.id, {
    ticket_number: ticket.ticket_number,
    reason: reason || 'Reabierto por persistencia del fallo',
  });

  res.json(db.getHydratedTicket(ticket));
});

// DELETE /api/v1/tickets/:id
ticketsRouter.delete('/:id', (req: Request, res: Response) => {
  const ticket = db.tickets.get(req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket no encontrado' });
  }

  db.tickets.delete(req.params.id);

  db.logAudit(undefined, 'TICKET_DELETED', 'SupportTicket', req.params.id, {
    ticket_number: ticket.ticket_number,
  });

  res.json({ message: 'Ticket eliminado correctamente' });
});

