import { randomBytes, randomUUID } from 'node:crypto';

const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const REFERENCE_LENGTH = 8;

export function newId() {
  return randomUUID();
}

export function newReference() {
  const bytes = randomBytes(REFERENCE_LENGTH);
  let reference = '';

  for (const byte of bytes) {
    reference += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }

  return `${reference.slice(0, 4)}-${reference.slice(4)}`;
}
