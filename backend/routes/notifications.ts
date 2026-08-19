import { Router, Request, Response } from 'express';
import { realtimeHub } from '../realtime.ts';
import { db } from '../database/db.ts';

export const notificationsRouter = Router();

// GET /api/v1/notifications (Get recent notifications & hub stats)
notificationsRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    connected_clients: realtimeHub.getConnectedClientsCount(),
    events: realtimeHub.getRecentEvents(),
  });
});

// POST /api/v1/notifications/broadcast (Send broadcast event)
notificationsRouter.post('/broadcast', (req: Request, res: Response) => {
  const { type, topic, severity, title, message, data } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'title y message son obligatorios' });
  }

  const event = realtimeHub.broadcast({
    type: type || 'NOTIFICATION_ALERT',
    topic: topic || 'alerts',
    severity: severity || 'info',
    title,
    message,
    data,
  });

  db.logAudit(undefined, 'REALTIME_NOTIFICATION_BROADCAST', 'RealtimeHub', event.type, {
    title,
    severity,
    topic,
  });

  res.status(201).json(event);
});

// POST /api/v1/notifications/simulate (Preset triggers for testing real-time events)
notificationsRouter.post('/simulate', (req: Request, res: Response) => {
  const { scenario } = req.body;

  let event;
  switch (scenario) {
    case 'CRITICAL_TICKET':
      event = realtimeHub.broadcast({
        type: 'TICKET_CREATED',
        topic: 'tickets',
        severity: 'critical',
        title: '🚨 NUEVO TICKET CRÍTICO: Caída de Servidor BD',
        message: 'Farmacia Los Álamos reporta caída total del servidor de base de datos SQL. SLA de atención: 2 Horas.',
        data: {
          ticket_number: 'TICK-000199',
          customer_name: 'Farmacia Los Álamos',
          priority: 'Crítica',
          device_name: 'SRV-BD-PRIMARY',
        },
      });
      break;

    case 'REMOTE_SESSION_REQUEST':
      event = realtimeHub.broadcast({
        type: 'REMOTE_SESSION_REQUESTED',
        topic: 'sessions',
        severity: 'warning',
        title: '💻 Solicitud de Soporte Remoto en Vivo',
        message: 'El usuario Dr. Miguel Gómez (PC-CONSULTORIO-02) está solicitando asistencia remota inmediata.',
        data: {
          session_id: `sess-${Date.now()}`,
          device_name: 'PC-CONSULTORIO-02',
          contact_name: 'Dr. Miguel Gómez',
        },
      });
      break;

    case 'DEVICE_OFFLINE_ALERT':
      event = realtimeHub.broadcast({
        type: 'DEVICE_STATUS_CHANGED',
        topic: 'devices',
        severity: 'error',
        title: '⚠️ Dispositivo Desconectado Inesperadamente',
        message: 'El equipo CONTABILIDAD-03 ha dejado de emitir latidos (Heartbeat timeout > 60s).',
        data: {
          device_name: 'CONTABILIDAD-03',
          customer: 'ABC Solutions SRL',
          status: 'OFFLINE',
        },
      });
      break;

    case 'DEVICE_ONLINE_ALERT':
      event = realtimeHub.broadcast({
        type: 'DEVICE_STATUS_CHANGED',
        topic: 'devices',
        severity: 'success',
        title: '🟢 Dispositivo Conectado a la Red',
        message: 'El equipo RECEPCION-MAIN se ha conectado exitosamente y está listo para soporte.',
        data: {
          device_name: 'RECEPCION-MAIN',
          customer: 'Clínica Dental del Este',
          status: 'ONLINE',
        },
      });
      break;

    case 'SLA_BREACH_WARNING':
      event = realtimeHub.broadcast({
        type: 'SLA_WARNING',
        topic: 'tickets',
        severity: 'critical',
        title: '⏰ Alerta de SLA: Menos de 30 minutos para expiración',
        message: 'El ticket #TICK-000125 para ABC Solutions SRL está a punto de vencer el acuerdo SLA.',
        data: {
          ticket_number: 'TICK-000125',
          sla_minutes_left: 28,
        },
      });
      break;

    case 'SESSION_ENDED_SUCCESS':
      event = realtimeHub.broadcast({
        type: 'REMOTE_SESSION_ENDED',
        topic: 'sessions',
        severity: 'success',
        title: '✅ Sesión de Control Remoto Finalizada',
        message: 'El Ing. Roberto Ramírez ha finalizado con éxito el soporte en PC-VENTAS-01 (Duración: 14m 32s).',
        data: {
          technician: 'Ing. Roberto Ramírez',
          device: 'PC-VENTAS-01',
          duration: '14m 32s',
        },
      });
      break;

    default:
      event = realtimeHub.broadcast({
        type: 'SYSTEM_ANNOUNCEMENT',
        topic: 'system',
        severity: 'info',
        title: 'ℹ️ Anuncio del Sistema Helpdesk',
        message: 'Mantenimiento preventivo programado para las 23:00 hrs GMT-4.',
      });
  }

  res.json({ success: true, event });
});
