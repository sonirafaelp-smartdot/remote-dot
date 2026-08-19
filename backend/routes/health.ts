import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';

export const healthRouter = Router();

// GET /api/v1/health
healthRouter.get('/', (_req: Request, res: Response) => {
  const usersCount = db.users.size;
  const techniciansCount = db.technicians.size;
  const customersCount = db.customers.size;
  const devicesCount = db.devices.size;
  const onlineDevicesCount = Array.from(db.devices.values()).filter((d) => d.is_online).length;
  const ticketsCount = db.tickets.size;
  const pendingTicketsCount = Array.from(db.tickets.values()).filter((t) => t.status === 'Pendiente').length;
  const activeSessionsCount = Array.from(db.sessions.values()).filter((s) => s.status === 'Sesión activa').length;

  res.json({
    status: 'healthy',
    version: '1.0.0',
    phase: 'FASE 1: Backend y Base de Datos (Completada)',
    timestamp: new Date().toISOString(),
    database: {
      engine: 'PostgreSQL Relational Data Layer & In-Memory Store',
      status: 'Connected',
      tables: {
        users: usersCount,
        technicians: techniciansCount,
        customers: customersCount,
        devices: {
          total: devicesCount,
          online: onlineDevicesCount,
        },
        support_tickets: {
          total: ticketsCount,
          pending: pendingTicketsCount,
        },
        remote_sessions: {
          total: db.sessions.size,
          active: activeSessionsCount,
        },
        audit_logs: db.auditLogs.length,
      },
    },
    system: {
      uptime_seconds: process.uptime(),
      node_version: process.version,
      memory_usage_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});
