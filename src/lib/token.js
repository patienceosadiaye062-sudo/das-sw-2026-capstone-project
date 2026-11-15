import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '../domain/errors.js';

const TOKEN_LIFETIME_SECONDS = 60 * 60;

function requireSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('TOKEN_SECRET must contain at least 32 bytes.');
  }
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function invalidToken() {
  throw new DomainError('A valid bearer token is required.', 'UNAUTHENTICATED');
}

export function signToken(user, secret, {
  expiresInSeconds = TOKEN_LIFETIME_SECONDS,
  now = Date.now(),
} = {}) {
  requireSecret(secret);
  if (!Number.isSafeInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new TypeError('Token lifetime must be a positive whole number of seconds.');
  }
  const issuedAt = Math.floor(now / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: issuedAt,
    exp: issuedAt + expiresInSeconds,
  });
  const input = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(input).digest('base64url');
  return `${input}.${signature}`;
}

export function verifyToken(token, secret, { now = Date.now() } = {}) {
  requireSecret(secret);
  if (typeof token !== 'string') invalidToken();
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) invalidToken();

  let header;
  let payload;
  let suppliedSignature;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    suppliedSignature = Buffer.from(parts[2], 'base64url');
  } catch {
    invalidToken();
  }
  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') invalidToken();

  const input = `${parts[0]}.${parts[1]}`;
  const expectedSignature = createHmac('sha256', secret).update(input).digest();
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) invalidToken();

  if (
    typeof payload?.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !['attendee', 'organizer', 'staff'].includes(payload.role) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp <= Math.floor(now / 1000)
  ) invalidToken();
  return payload;
}
