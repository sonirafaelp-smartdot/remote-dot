import { SupportTicket, TicketPriority } from '../database/entities.ts';

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'twilio' | 'meta' | 'webhook' | 'browser_direct';
  recipientNumber: string; // e.g. "+18095550199" or "18095550199"
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string; // e.g. "whatsapp:+14155238886"
  metaApiToken?: string;
  metaPhoneNumberId?: string;
  webhookUrl?: string;
  notifyOnCritical: boolean;
  notifyOnHigh: boolean;
  notifyOnMedium: boolean;
  notifyOnLow: boolean;
}

export interface WhatsAppDispatchLog {
  id: string;
  timestamp: string;
  ticketNumber: string;
  recipient: string;
  provider: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED' | 'READY_LINK';
  messagePreview: string;
  directWhatsAppWebUrl: string;
  details?: string;
}

// In-Memory persistent config with sensible defaults
let currentConfig: WhatsAppConfig = {
  enabled: true,
  provider: 'browser_direct',
  recipientNumber: process.env.WHATSAPP_TECH_NUMBER || '+18095550199',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFromNumber: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
  metaApiToken: process.env.WHATSAPP_API_TOKEN || '',
  metaPhoneNumberId: '',
  webhookUrl: process.env.WHATSAPP_API_URL || '',
  notifyOnCritical: true,
  notifyOnHigh: true,
  notifyOnMedium: true,
  notifyOnLow: false,
};

const dispatchLogs: WhatsAppDispatchLog[] = [];

export function getWhatsAppConfig(): WhatsAppConfig {
  return { ...currentConfig };
}

export function updateWhatsAppConfig(newConfig: Partial<WhatsAppConfig>): WhatsAppConfig {
  currentConfig = { ...currentConfig, ...newConfig };
  return { ...currentConfig };
}

export function getWhatsAppDispatchLogs(): WhatsAppDispatchLog[] {
  return [...dispatchLogs].slice(-50).reverse();
}

/**
 * Formats a clean, high-priority WhatsApp alert message for technicians
 */
export function formatTicketWhatsAppMessage(ticket: SupportTicket, computerName?: string, customerName?: string): string {
  const priorityEmoji = {
    [TicketPriority.CRITICAL]: '🚨 *URGENTE / CRÍTICA*',
    [TicketPriority.HIGH]: '🔴 *PRIORIDAD ALTA*',
    [TicketPriority.MEDIUM]: '🟡 *PRIORIDAD MEDIA*',
    [TicketPriority.LOW]: '🟢 *PRIORIDAD BAJA*',
  }[ticket.priority] || '🎫 *NUEVO TICKET*';

  const cleanPhone = ticket.contact_info || 'No especificado';
  const cleanName = ticket.contact_name || 'Usuario';
  const device = computerName || ticket.device_id || 'Equipo Remoto';
  const clientCompany = customerName || ticket.customer_id;

  return [
    `🔔 *DOTDESK - NUEVA SOLICITUD DE ASISTENCIA*`,
    `----------------------------------------`,
    `🎫 *Ticket:* #${ticket.ticket_number}`,
    `⚡ *Nivel:* ${priorityEmoji}`,
    `🏢 *Cliente:* ${clientCompany}`,
    `💻 *Equipo:* ${device}`,
    `👤 *Usuario:* ${cleanName}`,
    `📞 *Contacto:* ${cleanPhone}`,
    `📝 *Problema:*`,
    `"${ticket.problem_description}"`,
    `----------------------------------------`,
    `⏰ *Hora:* ${new Date().toLocaleTimeString()} - ${new Date().toLocaleDateString()}`,
    `👉 _Abrir consola de soporte DOTDESK para iniciar sesion remota._`
  ].join('\n');
}

/**
 * Generates an instant WhatsApp Click-to-Chat URL (wa.me)
 */
export function generateDirectWhatsAppUrl(phoneNumber: string, text: string): string {
  const normalizedNumber = phoneNumber.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${normalizedNumber}?text=${encodedText}`;
}

/**
 * Dispatches the notification across configured providers
 */
export async function sendTicketWhatsAppNotification(
  ticket: SupportTicket,
  computerName?: string,
  customerName?: string
): Promise<{ success: boolean; provider: string; directUrl: string; error?: string }> {
  const cfg = currentConfig;

  if (!cfg.enabled) {
    return {
      success: false,
      provider: 'disabled',
      directUrl: '',
      error: 'Notificaciones por WhatsApp desactivadas en la configuración',
    };
  }

  // Priority filter check
  if (ticket.priority === TicketPriority.CRITICAL && !cfg.notifyOnCritical) return { success: false, provider: 'filtered', directUrl: '' };
  if (ticket.priority === TicketPriority.HIGH && !cfg.notifyOnHigh) return { success: false, provider: 'filtered', directUrl: '' };
  if (ticket.priority === TicketPriority.MEDIUM && !cfg.notifyOnMedium) return { success: false, provider: 'filtered', directUrl: '' };
  if (ticket.priority === TicketPriority.LOW && !cfg.notifyOnLow) return { success: false, provider: 'filtered', directUrl: '' };

  const messageText = formatTicketWhatsAppMessage(ticket, computerName, customerName);
  const directUrl = generateDirectWhatsAppUrl(cfg.recipientNumber, messageText);
  const logId = `wa-log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  // 1. Twilio Provider
  if (cfg.provider === 'twilio' && cfg.twilioAccountSid && cfg.twilioAuthToken) {
    try {
      const auth = Buffer.from(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`).toString('base64');
      const formattedTo = cfg.recipientNumber.startsWith('whatsapp:')
        ? cfg.recipientNumber
        : `whatsapp:${cfg.recipientNumber.startsWith('+') ? cfg.recipientNumber : `+${cfg.recipientNumber}`}`;

      const params = new URLSearchParams();
      params.append('From', cfg.twilioFromNumber || 'whatsapp:+14155238886');
      params.append('To', formattedTo);
      params.append('Body', messageText);

      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.message || `Twilio HTTP Error ${resp.status}`);
      }

      dispatchLogs.push({
        id: logId,
        timestamp: new Date().toISOString(),
        ticketNumber: ticket.ticket_number,
        recipient: cfg.recipientNumber,
        provider: 'Twilio API',
        status: 'SENT',
        messagePreview: messageText.substring(0, 120) + '...',
        directWhatsAppWebUrl: directUrl,
        details: `SID: ${data.sid || 'ok'}`,
      });

      return { success: true, provider: 'twilio', directUrl };
    } catch (err: any) {
      console.error('[WhatsApp Service] Twilio dispatch failed:', err.message);
      dispatchLogs.push({
        id: logId,
        timestamp: new Date().toISOString(),
        ticketNumber: ticket.ticket_number,
        recipient: cfg.recipientNumber,
        provider: 'Twilio API',
        status: 'FAILED',
        messagePreview: messageText.substring(0, 120) + '...',
        directWhatsAppWebUrl: directUrl,
        details: `Error: ${err.message}`,
      });
      return { success: false, provider: 'twilio', directUrl, error: err.message };
    }
  }

  // 2. Meta Cloud API
  if (cfg.provider === 'meta' && cfg.metaApiToken && cfg.metaPhoneNumberId) {
    try {
      const cleanPhone = cfg.recipientNumber.replace(/[^0-9]/g, '');
      const resp = await fetch(
        `https://graph.facebook.com/v18.0/${cfg.metaPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.metaApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone,
            type: 'text',
            text: { body: messageText },
          }),
        }
      );

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error?.message || `Meta API Error ${resp.status}`);
      }

      dispatchLogs.push({
        id: logId,
        timestamp: new Date().toISOString(),
        ticketNumber: ticket.ticket_number,
        recipient: cfg.recipientNumber,
        provider: 'Meta Cloud API',
        status: 'SENT',
        messagePreview: messageText.substring(0, 120) + '...',
        directWhatsAppWebUrl: directUrl,
      });

      return { success: true, provider: 'meta', directUrl };
    } catch (err: any) {
      console.error('[WhatsApp Service] Meta dispatch failed:', err.message);
      dispatchLogs.push({
        id: logId,
        timestamp: new Date().toISOString(),
        ticketNumber: ticket.ticket_number,
        recipient: cfg.recipientNumber,
        provider: 'Meta Cloud API',
        status: 'FAILED',
        messagePreview: messageText.substring(0, 120) + '...',
        directWhatsAppWebUrl: directUrl,
        details: `Error: ${err.message}`,
      });
      return { success: false, provider: 'meta', directUrl, error: err.message };
    }
  }

  // 3. Webhook Relay (e.g. n8n, Make.com, Evolution API, Baileys, Zapier)
  if (cfg.provider === 'webhook' && cfg.webhookUrl) {
    try {
      const resp = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'TICKET_CREATED',
          recipientNumber: cfg.recipientNumber,
          ticketNumber: ticket.ticket_number,
          priority: ticket.priority,
          customer: customerName,
          device: computerName,
          problem: ticket.problem_description,
          formattedMessage: messageText,
          directWhatsAppUrl: directUrl,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!resp.ok) {
        throw new Error(`Webhook responded with status ${resp.status}`);
      }

      dispatchLogs.push({
        id: logId,
        timestamp: new Date().toISOString(),
        ticketNumber: ticket.ticket_number,
        recipient: cfg.recipientNumber,
        provider: 'Webhook Relay',
        status: 'SENT',
        messagePreview: messageText.substring(0, 120) + '...',
        directWhatsAppWebUrl: directUrl,
      });

      return { success: true, provider: 'webhook', directUrl };
    } catch (err: any) {
      console.error('[WhatsApp Service] Webhook dispatch failed:', err.message);
      dispatchLogs.push({
        id: logId,
        timestamp: new Date().toISOString(),
        ticketNumber: ticket.ticket_number,
        recipient: cfg.recipientNumber,
        provider: 'Webhook Relay',
        status: 'FAILED',
        messagePreview: messageText.substring(0, 120) + '...',
        directWhatsAppWebUrl: directUrl,
        details: `Error: ${err.message}`,
      });
      return { success: false, provider: 'webhook', directUrl, error: err.message };
    }
  }

  // 4. Default: Browser Direct Link / Simulated Dispatch with immediate click-to-chat
  dispatchLogs.push({
    id: logId,
    timestamp: new Date().toISOString(),
    ticketNumber: ticket.ticket_number,
    recipient: cfg.recipientNumber,
    provider: 'Direct Click-to-Chat / Instant Link',
    status: 'READY_LINK',
    messagePreview: messageText.substring(0, 120) + '...',
    directWhatsAppWebUrl: directUrl,
    details: 'Enlace generado para apertura instantánea en WhatsApp Web o Móvil',
  });

  return { success: true, provider: 'browser_direct', directUrl };
}
