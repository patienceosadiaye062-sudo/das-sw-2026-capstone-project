import { DomainError } from '../domain/errors.js';
import { verifyToken } from '../lib/token.js';

export function requireUser(request, secret) {
  const authorization = request.headers.authorization;
  const match = typeof authorization === 'string'
    ? /^Bearer ([^\s]+)$/i.exec(authorization)
    : null;
  if (!match) {
    throw new DomainError('A bearer token is required.', 'UNAUTHENTICATED');
  }
  return verifyToken(match[1], secret);
}

export function requireRole(user, ...roles) {
  if (!user) throw new DomainError('A bearer token is required.', 'UNAUTHENTICATED');
  if (!roles.includes(user.role)) {
    throw new DomainError('You do not have permission to perform this action.', 'FORBIDDEN');
  }
  return user;
}
