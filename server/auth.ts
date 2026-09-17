import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const JWT_SECRET = process.env.JWT_SECRET || 'wirecraft_secret_jwt_key_2026_super_secure_auth';

export interface UserJWTPayload {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  exp?: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

export function createJWT(payload: Omit<UserJWTPayload, 'exp'>, expiresInDays = 7): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 3600;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyJWT(token: string): UserJWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as UserJWTPayload;
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }
    return decoded;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: IncomingMessage): UserJWTPayload | null {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  return verifyJWT(token);
}
