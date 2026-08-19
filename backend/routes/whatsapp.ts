import { Router, Request, Response } from 'express';
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  getWhatsAppDispatchLogs,
  sendTicketWhatsAppNotification,
  formatTicketWhatsAppMessage,
  generateDirectWhatsAppUrl,
} from '../services/whatsapp.ts';
import { db } from '../database/db.ts';
import { TicketPriority, TicketStatus } from '../database/entities.ts';

export const whatsappRouter = Router();

// GET /api/v1/whatsapp/config
whatsappRouter.get('/config', (_req: Request, res: Response) => {
  res.json(getWhatsAppConfig());
});

// POST /api/v1/whatsapp/config
whatsappRouter.post('/config', (req: Request, res: Response) => {
  const updated = updateWhatsAppConfig(req.body);
  res.json({ message: 'Configuración de WhatsApp actualizada exitosamente', config: updated });
});

// GET /api/v1/whatsapp/logs
whatsappRouter.get('/logs', (_req: Request, res: Response) => {
  res.json(getWhatsAppDispatchLogs());
});

// POST /api/v1/whatsapp/test-notification
whatsappRouter.post('/test-notification', async (req: Request, res: Response) => {
  const { customNumber, priority = TicketPriority.HIGH } = req.body;
  const cfg = getWhatsAppConfig();
  const recipient = customNumber || cfg.recipientNumber;

  const mockTicket = {
    id: 't-test-whatsapp',
    ticket_number: `T-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    customer_id: 'cust-abc-01',
    device_id: 'dev-001-ws',
    contact_name: 'Rafael Martínez (Usuario de Prueba)',
    contact_info: '+1 (809) 555-0199',
    problem_description: 'Prueba de alerta instantánea por WhatsApp desde DOTDESK Help Desk.',
    priority: priority as TicketPriority,
    status: TicketStatus.PENDING,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const formatted = formatTicketWhatsAppMessage(
    mockTicket as any,
    'WS-CONTABILIDAD-01',
    'ABC Solutions S.R.L.'
  );

  const directUrl = generateDirectWhatsAppUrl(recipient, formatted);

  const result = await sendTicketWhatsAppNotification(
    mockTicket as any,
    'WS-CONTABILIDAD-01',
    'ABC Solutions S.R.L.'
  );

  res.json({
    message: 'Notificación de prueba procesada',
    result,
    preview: formatted,
    directUrl,
  });
});
