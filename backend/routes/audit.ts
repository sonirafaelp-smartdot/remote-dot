import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import { realtimeHub } from '../realtime.ts';

export const auditRouter = Router();

// 1. GET /api/v1/audit/events - Query structured, HMAC-signed audit events
auditRouter.get('/events', (req: Request, res: Response) => {
  try {
    const { category, severity, search, actorId, entityType, limit, offset } = req.query;

    const data = db.getStructuredAuditEvents({
      category: category ? String(category) : undefined,
      severity: severity ? String(severity) : undefined,
      search: search ? String(search) : undefined,
      actorId: actorId ? String(actorId) : undefined,
      entityType: entityType ? String(entityType) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 100,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Error fetching audit events', details: err.message });
  }
});

// 2. GET /api/v1/audit/sessions - Query remote session audit records (IPs, consent, duration, MAC/HWID)
auditRouter.get('/sessions', (req: Request, res: Response) => {
  try {
    const { customerId, technicianId, search, terminationReason } = req.query;

    const records = db.getSessionAuditRecords({
      customerId: customerId ? String(customerId) : undefined,
      technicianId: technicianId ? String(technicianId) : undefined,
      search: search ? String(search) : undefined,
      terminationReason: terminationReason ? String(terminationReason) : undefined,
    });

    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: 'Error fetching session audit records', details: err.message });
  }
});

// 3. GET /api/v1/audit/reports/customer-service - Generate comprehensive customer service report
auditRouter.get('/reports/customer-service', (req: Request, res: Response) => {
  try {
    const { customerId, period } = req.query;
    const targetCustomerId = customerId ? String(customerId) : (Array.from(db.customers.values())[0]?.id || 'cust-abc-01');
    const periodLabel = period ? String(period) : 'Últimos 30 días';

    const report = db.generateCustomerServiceReport(targetCustomerId, periodLabel);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'Error generating customer service report', details: err.message });
  }
});

// 4. POST /api/v1/audit/verify-chain - Cryptographically verify ledger integrity (HMAC-SHA256 Merkle chain)
auditRouter.post('/verify-chain', (_req: Request, res: Response) => {
  try {
    const result = db.verifyAuditChain();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Error verifying audit chain', details: err.message });
  }
});

// 5. POST /api/v1/audit/log-event - Record a new audit event from technician console or Windows agent
auditRouter.post('/log-event', (req: Request, res: Response) => {
  try {
    const { category, action, actionTitle, severity, actor, target, details, diffs } = req.body;

    if (!action || !category) {
      return res.status(400).json({ error: 'action and category are required fields' });
    }

    const newEvent = db.recordAuditEvent({
      timestamp: new Date().toISOString(),
      category: category || 'DEVICE_ACTION',
      action,
      actionTitle: actionTitle || action,
      severity: severity || 'info',
      actor: actor || {
        id: 'u-1002-tech1',
        name: 'Ing. Roberto Ramírez',
        role: 'Technician',
        ip: req.ip || '127.0.0.1',
      },
      target: target || {
        entityType: 'System',
        entityId: 'SYS',
        label: 'System Action',
      },
      details: details || {},
      diffs: diffs || [],
    });

    // Broadcast audit event notification in real-time
    realtimeHub.broadcast({
      type: 'AUDIT_EVENT_RECORDED',
      topic: 'alerts',
      severity: newEvent.severity,
      title: `[Auditoría] ${newEvent.actionTitle}`,
      message: `Registrado por ${newEvent.actor.name} (${newEvent.actor.ip}) en ${newEvent.target.label}`,
      data: newEvent,
    });

    res.status(201).json(newEvent);
  } catch (err: any) {
    res.status(500).json({ error: 'Error recording audit event', details: err.message });
  }
});

// 6. GET /api/v1/audit/export/csv - Export CSV of audit events or session records
auditRouter.get('/export/csv', (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    if (type === 'sessions') {
      const sessions = db.sessionAuditRecords;
      const headers = [
        'ID_Auditoría',
        'Sesión_ID',
        'Ticket',
        'Cliente_Empresa',
        'Dispositivo_Nombre',
        'IP_Dispositivo',
        'Técnico',
        'IP_Técnico',
        'Inicio_UTC',
        'Fin_UTC',
        'Duración_Segundos',
        'Resolución',
        'FPS_Medio',
        'Bitrate_Kbps',
        'Pulsaciones_Teclado',
        'Clics_Ratón',
        'Archivos_Transferidos',
        'Motivo_Cierre',
        'Firma_HMAC_SHA256',
      ];

      const rows = sessions.map((s) => [
        `"${s.id}"`,
        `"${s.sessionId}"`,
        `"${s.ticketNumber}"`,
        `"${s.customerCompany}"`,
        `"${s.deviceComputerName}"`,
        `"${s.deviceIp}"`,
        `"${s.technicianName}"`,
        `"${s.technicianIp}"`,
        `"${s.startedAt}"`,
        `"${s.endedAt}"`,
        s.durationSeconds,
        `"${s.resolution}"`,
        s.avgFps,
        s.avgBitrateKbps,
        s.keystrokesCount,
        s.mouseClicksCount,
        s.fileTransfersCount,
        `"${s.terminationReason}"`,
        `"${s.hmacSignature}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="remotedesk_session_audit_log.csv"');
      return res.send(csvContent);
    }

    // Default: Export audit events
    const events = db.structuredAuditEvents;
    const headers = [
      'Seq',
      'ID_Evento',
      'Timestamp_UTC',
      'Categoría',
      'Acción',
      'Título',
      'Severidad',
      'Actor_Nombre',
      'Actor_Rol',
      'Actor_IP',
      'Target_Tipo',
      'Target_ID',
      'Target_Etiqueta',
      'Target_Cliente',
      'Firma_HMAC_SHA256',
      'Hash_Bloque_Previo',
    ];

    const rows = events.map((e) => [
      e.sequenceNumber,
      `"${e.id}"`,
      `"${e.timestamp}"`,
      `"${e.category}"`,
      `"${e.action}"`,
      `"${e.actionTitle.replace(/"/g, '""')}"`,
      `"${e.severity}"`,
      `"${e.actor.name}"`,
      `"${e.actor.role}"`,
      `"${e.actor.ip}"`,
      `"${e.target.entityType}"`,
      `"${e.target.entityId}"`,
      `"${(e.target.label || '').replace(/"/g, '""')}"`,
      `"${(e.target.customerName || '').replace(/"/g, '""')}"`,
      `"${e.hmacSignature}"`,
      `"${e.previousBlockSha256}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="remotedesk_immutable_audit_events.csv"');
    return res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Error exporting audit CSV', details: err.message });
  }
});

// Legacy backward-compatibility endpoint: GET /api/v1/audit
auditRouter.get('/', (req: Request, res: Response) => {
  const { action, entity_type, limit } = req.query;
  let logs = [...db.auditLogs];

  if (action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes(String(action).toLowerCase()));
  }
  if (entity_type) {
    logs = logs.filter((l) => l.entity_type.toLowerCase() === String(entity_type).toLowerCase());
  }

  const max = limit ? parseInt(String(limit), 10) : 50;
  res.json(logs.slice(0, max));
});

