import { DomainError } from '../domain/errors.js';
import { newId } from '../domain/ids.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/token.js';

const ROLES = new Set(['attendee', 'organizer', 'staff']);
const DUMMY_PASSWORD_HASH = hashPassword('not-a-real-user-password');

function fail(message, code = 'VALIDATION') {
  throw new DomainError(message, code);
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role };
}

export function createAuthService(repository, tokenSecret) {
  if (!repository) throw new TypeError('An authentication repository is required.');

  return {
    async signup(input) {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        fail('Signup input must be an object.');
      }
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fail('A valid email address is required.');
      }
      if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 1024) {
        fail('Password must be between 8 and 1024 characters.');
      }
      const role = input.role ?? 'attendee';
      if (!ROLES.has(role)) fail('Role must be attendee, organizer, or staff.');
      if (await repository.findUserByEmail(email)) {
        fail('An account with this email already exists.', 'EMAIL_TAKEN');
      }

      const user = {
        id: newId(),
        email,
        role,
        passwordHash: hashPassword(input.password),
      };
      await repository.saveUser(user);
      return { user: publicUser(user), token: signToken(user, tokenSecret) };
    },

    async login(input) {
      if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        fail('Login input must be an object.');
      }
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const user = await repository.findUserByEmail(email);
      if (!verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH) || !user) {
        fail('Email or password is incorrect.', 'INVALID_CREDENTIALS');
      }
      return { user: publicUser(user), token: signToken(user, tokenSecret) };
    },

    async getUser(id) {
      const user = await repository.findUserById(id);
      if (!user) throw new DomainError('User was not found.', 'NOT_FOUND');
      return publicUser(user);
    },
  };
}
