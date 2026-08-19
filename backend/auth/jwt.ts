import jwt from 'jsonwebtoken';
import { User, UserRole } from '../database/entities.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'remotedesk_super_secret_jwt_key_2026_change_in_production';
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour access token
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days refresh token

export interface JwtTokenPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  isRevoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
}

// In-Memory store of active and revoked sessions
export const activeSessions = new Map<string, ActiveSession>();
export const revokedSessionTokens = new Set<string>();

export function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateAccessToken(user: User, sessionId: string): string {
  const payload: JwtTokenPayload = {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    sessionId,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(user: User, sessionId: string): string {
  const payload: JwtTokenPayload = {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    sessionId,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyJwtToken(token: string): JwtTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtTokenPayload;
    
    // Check if session has been revoked
    if (decoded.sessionId && revokedSessionTokens.has(decoded.sessionId)) {
      return null;
    }

    const session = activeSessions.get(decoded.sessionId);
    if (session && session.isRevoked) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

export function registerActiveSession(
  user: User,
  sessionId: string,
  ipAddress: string,
  userAgent: string
): ActiveSession {
  const session: ActiveSession = {
    sessionId,
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isRevoked: false,
  };

  activeSessions.set(sessionId, session);
  return session;
}

export function revokeSession(sessionId: string, reason = 'Cierre de sesión manual o revocación'): boolean {
  revokedSessionTokens.add(sessionId);
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isRevoked = true;
    session.revokedAt = new Date().toISOString();
    session.revokedReason = reason;
    return true;
  }
  return false;
}

export function getActiveSessionsList(): ActiveSession[] {
  return Array.from(activeSessions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
