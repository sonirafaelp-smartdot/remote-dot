import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './backend/routes/auth.ts';
import { customersRouter } from './backend/routes/customers.ts';
import { devicesRouter } from './backend/routes/devices.ts';
import { ticketsRouter } from './backend/routes/tickets.ts';
import { sessionsRouter } from './backend/routes/sessions.ts';
import { auditRouter } from './backend/routes/audit.ts';
import { healthRouter } from './backend/routes/health.ts';
import { notificationsRouter } from './backend/routes/notifications.ts';
import { filesRouter } from './backend/routes/files.ts';
import { installersRouter } from './backend/routes/installers.ts';
import { testingRouter } from './backend/routes/testing.ts';
import { realtimeHub } from './backend/realtime.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createHttpServer(app);

  // Setup WebSocket Server for Real-Time Notifications and Telemetry
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    realtimeHub.registerClient(ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        // If client sends an event, broadcast it
        if (data && data.title && data.message) {
          realtimeHub.broadcast({
            type: data.type || 'CLIENT_BROADCAST',
            topic: data.topic || 'alerts',
            severity: data.severity || 'info',
            title: data.title,
            message: data.message,
            data: data.data,
          });
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      realtimeHub.unregisterClient(ws);
    });
  });

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // REST API Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/customers', customersRouter);
  app.use('/api/v1/devices', devicesRouter);
  app.use('/api/v1/tickets', ticketsRouter);
  app.use('/api/v1/sessions', sessionsRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/files', filesRouter);
  app.use('/api/v1/installers', installersRouter);
  app.use('/api/v1/testing', testingRouter);

  // Quick API Overview endpoint
  app.get('/api/v1', (_req, res) => {
    res.json({
      name: 'DOT-Desk Enterprise REST & WebSocket API',
      version: '1.5.0',
      phase: 'FASE 12: Pruebas, Stress Testing, NAT Traversal & Hardening (Producción Lista)',
      endpoints: {
        health: '/api/v1/health',
        auth: '/api/v1/auth',
        customers: '/api/v1/customers',
        devices: '/api/v1/devices',
        tickets: '/api/v1/tickets',
        sessions: '/api/v1/sessions',
        files: '/api/v1/files',
        installers: '/api/v1/installers',
        testing: {
          stunTurnServers: '/api/v1/testing/stun-turn-servers',
          natCheck: '/api/v1/testing/nat-check',
          loadTest: '/api/v1/testing/load-test',
          securityAudit: '/api/v1/testing/security-audit',
          unitTests: '/api/v1/testing/run-unit-tests',
        },
        audit: {
          events: '/api/v1/audit/events',
          sessions: '/api/v1/audit/sessions',
          reports: '/api/v1/audit/reports/customer-service',
          verifyChain: '/api/v1/audit/verify-chain',
          exportCsv: '/api/v1/audit/export/csv',
        },
        websocket: 'ws://HOST/ws',
      },
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[RemoteDesk Server] Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
