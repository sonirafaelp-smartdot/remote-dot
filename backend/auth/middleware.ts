import { Request, Response, NextFunction } from 'express';
import { verifyJwtToken, JwtTokenPayload, activeSessions } from './jwt.ts';
import { UserRole } from '../database/entities.ts';

// Extend Express Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JwtTokenPayload;
}

/**
 * Middleware to authenticate requests via Bearer JWT token
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Token de acceso no proporcionado. Se requiere encabezado Authorization: Bearer <token>',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const payload = verifyJwtToken(token);

  if (!payload) {
    return res.status(401).json({
      error: 'Token inválido, expirado o revocado.',
      code: 'AUTH_TOKEN_INVALID_OR_REVOKED',
    });
  }

  if (payload.type !== 'access') {
    return res.status(401).json({
      error: 'Tipo de token inválido. Debe ser un token de acceso.',
      code: 'AUTH_TOKEN_TYPE_INVALID',
    });
  }

  // Update last active time for the session
  const session = activeSessions.get(payload.sessionId);
  if (session) {
    session.lastActiveAt = new Date().toISOString();
  }

  req.user = payload;
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuario no autenticado.',
        code: 'UNAUTHENTICATED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: [${allowedRoles.join(', ')}]. Su rol actual es: ${req.user.role}`,
        code: 'FORBIDDEN_INSUFFICIENT_ROLE',
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });
    }

    next();
  };
}

export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireTechnician = requireRole(UserRole.TECHNICIAN);
export const requireTechnicianOrAdmin = requireRole(UserRole.ADMIN, UserRole.TECHNICIAN);
