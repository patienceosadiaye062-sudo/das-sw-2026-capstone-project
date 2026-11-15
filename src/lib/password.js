import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;

export function hashPassword(password) {
  if (typeof password !== 'string') throw new TypeError('Password must be a string.');
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(password, salt, KEY_BYTES);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') return false;
  const [algorithm, saltHex, keyHex, ...extra] = passwordHash.split('$');
  if (
    algorithm !== 'scrypt' ||
    extra.length > 0 ||
    !/^[\da-f]{32}$/i.test(saltHex ?? '') ||
    !/^[\da-f]{128}$/i.test(keyHex ?? '')
  ) return false;

  const expected = Buffer.from(keyHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_BYTES);
  return timingSafeEqual(actual, expected);
}
