import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import { User, Technician, UserRole } from '../database/entities.ts';
import {
  createSessionId,
  generateAccessToken,
  generateRefreshToken,
  verifyJwtToken,
  registerActiveSession,
  revokeSession,
  getActiveSessionsList,
  activeSessions,
} from '../auth/jwt.ts';
import {
  authenticateToken,
  requireAdmin,
  requireTechnicianOrAdmin,
  AuthenticatedRequest,
} from '../auth/middleware.ts';

export const authRouter = Router();

// POST /api/v1/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'RemoteDesk Client/Console';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos', code: 'MISSING_CREDENTIALS' });
  }

  // Find user by email
  const user = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user || !user.is_active) {
    db.logAudit(
      undefined,
      'USER_LOGIN_FAILED',
      'User',
      email,
      { email, reason: 'Usuario inexistente o inactivo' },
      clientIp
    );
    return res.status(401).json({
      error: 'Credenciales inválidas o cuenta de usuario inactiva',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // Verify bcrypt password hash
  const isValidPassword = db.verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    db.logAudit(
      user.id,
      'USER_LOGIN_FAILED',
      'User',
      user.id,
      { email, reason: 'Contraseña incorrecta' },
      clientIp
    );
    return res.status(401).json({
      error: 'Credenciales inválidas o contraseña incorrecta',
      code: 'INVALID_CREDENTIALS',
    });
  }

  // Create session and JWT tokens
  const sessionId = createSessionId();
  const session = registerActiveSession(user, sessionId, clientIp, userAgent);
  const accessToken = generateAccessToken(user, sessionId);
  const refreshToken = generateRefreshToken(user, sessionId);

  db.logAudit(
    user.id,
    'USER_LOGIN_SUCCESS',
    'User',
    user.id,
    { email: user.email, role: user.role, sessionId },
    clientIp
  );

  // If technician, retrieve technician profile
  let technicianProfile = null;
  if (user.role === UserRole.TECHNICIAN) {
    technicianProfile = Array.from(db.technicians.values()).find((t) => t.user_id === user.id);
  }

  return res.json({
    message: 'Autenticación exitosa',
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour in seconds
    session_id: sessionId,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    technician: technicianProfile,
  });
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  const clientIp = req.ip || '127.0.0.1';

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token es requerido', code: 'MISSING_REFRESH_TOKEN' });
  }

  const payload = verifyJwtToken(refresh_token);
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({
      error: 'Refresh token inválido, expirado o revocado',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }

  const user = db.users.get(payload.userId);
  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'Usuario no encontrado o inactivo', code: 'USER_INACTIVE' });
  }

  // Rotate tokens
  const newAccessToken = generateAccessToken(user, payload.sessionId);
  const newRefreshToken = generateRefreshToken(user, payload.sessionId);

  db.logAudit(
    user.id,
    'TOKEN_REFRESHED',
    'User',
    user.id,
    { sessionId: payload.sessionId },
    clientIp
  );

  return res.json({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: 3600,
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const clientIp = req.ip || '127.0.0.1';

  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) {
      revokeSession(payload.sessionId, 'Cierre de sesión por el usuario');
      db.logAudit(
        payload.userId,
        'USER_LOGOUT',
        'User',
        payload.userId,
        { sessionId: payload.sessionId },
        clientIp
      );
    }
  }

  return res.json({ message: 'Sesión finalizada exitosamente y token revocado.' });
});

// GET /api/v1/auth/me (Protected)
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.get(req.user!.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  let technicianProfile = null;
  if (user.role === UserRole.TECHNICIAN) {
    technicianProfile = Array.from(db.technicians.values()).find((t) => t.user_id === user.id);
  }

  const session = activeSessions.get(req.user!.sessionId);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
    },
    technician: technicianProfile,
    session: session
      ? {
          sessionId: session.sessionId,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          lastActiveAt: session.lastActiveAt,
        }
      : null,
    claims: req.user,
  });
});

// GET /api/v1/auth/sessions (Protected - Lists active sessions)
authRouter.get('/sessions', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const allSessions = getActiveSessionsList();
  // If admin, return all sessions; otherwise return only user's own sessions
  if (req.user!.role === UserRole.ADMIN) {
    return res.json(allSessions);
  }
  const userSessions = allSessions.filter((s) => s.userId === req.user!.userId);
  return res.json(userSessions);
});

// POST /api/v1/auth/revoke-session (Protected - Immediate revocation)
authRouter.post('/revoke-session', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { session_id, reason } = req.body;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id es requerido' });
  }

  const targetSession = activeSessions.get(session_id);
  if (!targetSession) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  // Non-admins can only revoke their own sessions
  if (req.user!.role !== UserRole.ADMIN && targetSession.userId !== req.user!.userId) {
    return res.status(403).json({ error: 'No tiene permisos para revocar sesiones de otros usuarios' });
  }

  revokeSession(session_id, reason || `Revocado por ${req.user!.email}`);

  db.logAudit(
    req.user!.userId,
    'SESSION_REVOKED_IMMEDIATELY',
    'Session',
    session_id,
    {
      targetUserId: targetSession.userId,
      revokedBy: req.user!.email,
      reason: reason || 'Revocación manual',
    },
    req.ip || '127.0.0.1'
  );

  return res.json({
    message: `Sesión ${session_id} ha sido revocada inmediatamente. Todo token asociado queda invalidado.`,
    session: targetSession,
  });
});

// POST /api/v1/auth/change-password (Protected)
authRouter.post('/change-password', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password y new_password son obligatorios' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const user = db.users.get(req.user!.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const isMatch = db.verifyPassword(current_password, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
  }

  // Hash new password and update user
  user.password_hash = db.hashPassword(new_password);
  user.updated_at = new Date().toISOString();

  db.logAudit(
    user.id,
    'USER_PASSWORD_CHANGED',
    'User',
    user.id,
    { email: user.email },
    req.ip || '127.0.0.1'
  );

  return res.json({ message: 'Contraseña actualizada exitosamente.' });
});

// RBAC Test Endpoint for Admin
authRouter.get('/test-protected/admin', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    status: 'success',
    message: '¡Acceso concedido al panel de Administración! Rol verificado: Admin.',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

// RBAC Test Endpoint for Technician or Admin
authRouter.get('/test-protected/technician', authenticateToken, requireTechnicianOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    status: 'success',
    message: '¡Acceso concedido a operaciones técnicas! Rol verificado: Técnico / Administrador.',
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/v1/auth/technicians
authRouter.get('/technicians', (_req: Request, res: Response) => {
  const techs = Array.from(db.technicians.values()).map((t) => {
    const user = db.users.get(t.user_id);
    return {
      ...t,
      full_name: user?.full_name || 'Desconocido',
      email: user?.email || '',
      is_active: user?.is_active ?? true,
    };
  });
  res.json(techs);
});

// POST /api/v1/auth/technicians (Create new technician)
authRouter.post('/technicians', (req: Request, res: Response) => {
  const { full_name, email, password, specialty, max_concurrent_sessions } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Nombre completo, email y contraseña son obligatorios' });
  }

  // Check if email already exists
  const existingUser = Array.from(db.users.values()).find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existingUser) {
    return res.status(400).json({ error: 'Ya existe un usuario con este correo electrónico' });
  }

  const userId = `u-${Date.now()}`;
  const techId = `tech-${Date.now().toString().slice(-4)}`;

  const newUser: User = {
    id: userId,
    email: email.toLowerCase().trim(),
    password_hash: db.hashPassword(password),
    full_name: full_name.trim(),
    role: UserRole.TECHNICIAN,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const newTechnician: Technician = {
    id: techId,
    user_id: userId,
    specialty: specialty || 'Soporte General & Help Desk',
    is_online: true,
    max_concurrent_sessions: Number(max_concurrent_sessions) || 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.set(userId, newUser);
  db.technicians.set(techId, newTechnician);

  db.logAudit(
    userId,
    'TECHNICIAN_REGISTERED',
    'Technician',
    techId,
    { full_name, email, specialty },
    req.ip || '127.0.0.1'
  );

  return res.status(201).json({
    message: 'Técnico operativo registrado con éxito.',
    technician: {
      ...newTechnician,
      full_name: newUser.full_name,
      email: newUser.email,
      is_active: newUser.is_active,
    },
  });
});

// PUT /api/v1/auth/technicians/:id (Update technician details)
authRouter.put('/technicians/:id', (req: Request, res: Response) => {
  const tech = db.technicians.get(req.params.id);
  if (!tech) {
    return res.status(404).json({ error: 'Técnico no encontrado' });
  }

  const user = db.users.get(tech.user_id);
  if (!user) {
    return res.status(404).json({ error: 'Usuario asociado no encontrado' });
  }

  const { full_name, email, specialty, max_concurrent_sessions, is_active, password } = req.body;

  if (full_name) user.full_name = full_name.trim();
  if (email) user.email = email.toLowerCase().trim();
  if (password && password.trim().length >= 4) {
    user.password_hash = db.hashPassword(password.trim());
  }
  if (is_active !== undefined) user.is_active = Boolean(is_active);
  user.updated_at = new Date().toISOString();

  if (specialty) tech.specialty = specialty.trim();
  if (max_concurrent_sessions !== undefined) tech.max_concurrent_sessions = Number(max_concurrent_sessions);
  tech.updated_at = new Date().toISOString();

  db.logAudit(
    user.id,
    'TECHNICIAN_UPDATED',
    'Technician',
    tech.id,
    { full_name: user.full_name, email: user.email, specialty: tech.specialty },
    req.ip || '127.0.0.1'
  );

  return res.json({
    message: 'Datos del técnico actualizados correctamente.',
    technician: {
      ...tech,
      full_name: user.full_name,
      email: user.email,
      is_active: user.is_active,
    },
  });
});

// DELETE /api/v1/auth/technicians/:id (Delete/Decommission technician)
authRouter.delete('/technicians/:id', (req: Request, res: Response) => {
  const tech = db.technicians.get(req.params.id);
  if (!tech) {
    return res.status(404).json({ error: 'Técnico no encontrado' });
  }

  const user = db.users.get(tech.user_id);
  const techName = user?.full_name || tech.id;

  db.technicians.delete(tech.id);
  if (user) {
    db.users.delete(user.id);
  }

  db.logAudit(
    undefined,
    'TECHNICIAN_DELETED',
    'Technician',
    tech.id,
    { full_name: techName },
    req.ip || '127.0.0.1'
  );

  return res.json({ message: `Técnico ${techName} eliminado con éxito del sistema.` });
});

// GET /api/v1/auth/users
authRouter.get('/users', (_req: Request, res: Response) => {
  const users = Array.from(db.users.values()).map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
  }));
  res.json(users);
});
