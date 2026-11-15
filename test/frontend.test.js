import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  createBooking,
  listEvents,
  listMyBookings,
  logIn,
  pay,
  signUp,
} from '../public/js/api.js';
import {
  clearSession,
  getSession,
  getToken,
  getUser,
  setSession,
} from '../public/js/session.js';
import { formatDate, formatPrice } from '../public/js/ui.js';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

function installStorage() {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalLocalStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = originalLocalStorage;
});

test('formats whole-cent prices as NGN and omits unnecessary decimal zeros', () => {
  assert.equal(formatPrice(250000), '₦2,500');
  assert.equal(formatPrice(250050), '₦2,500.5');
});

test('formats event dates in the configured timezone and style', () => {
  assert.equal(formatDate('2026-12-05T17:00:00Z'), '5 Dec 2026, 18:00');
});

test('session stores only the signed token and safe user details', () => {
  installStorage();
  const session = {
    token: 'signed-token',
    user: { id: 'user-1', email: 'person@example.test', role: 'attendee' },
  };
  setSession(session);

  assert.deepEqual(getSession(), session);
  assert.equal(getToken(), 'signed-token');
  assert.equal(getUser().role, 'attendee');
  clearSession();
  assert.equal(getSession(), undefined);
});

test('signup and login send credentials to the API and store returned sessions', async () => {
  installStorage();
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return {
      ok: true,
      json: async () => ({
        token: 'api-token',
        user: { id: 'user-1', email: 'person@example.test', role: 'attendee' },
      }),
    };
  };
  await signUp({ email: 'person@example.test', password: 'strong-password', role: 'attendee' });
  assert.equal(calls[0].path, '/api/auth/signup');
  assert.equal(calls[0].options.headers.authorization, undefined);
  assert.equal(getToken(), 'api-token');

  await logIn({ email: 'person@example.test', password: 'strong-password' });
  assert.equal(calls[1].path, '/api/auth/login');
  assert.equal(getUser().email, 'person@example.test');
});

test('frontend API uses bearer auth, query parameters, and sends no payment-card data', async () => {
  installStorage();
  setSession({
    token: 'signed-token',
    user: { id: 'user-1', email: 'person@example.test', role: 'attendee' },
  });
  const calls = [];
  globalThis.fetch = async (path, options) => {
    calls.push({ path, options });
    return { ok: true, json: async () => ({ events: [], bookings: [] }) };
  };

  await listEvents({ q: 'jazz', city: 'Abuja', maxPriceCents: 800000 });
  assert.match(calls[0].path, /q=jazz/);
  assert.match(calls[0].path, /city=Abuja/);
  await createBooking({ eventId: 'event-1', tierId: 'tier-1', quantity: 1 });
  assert.equal(calls[1].options.headers.authorization, 'Bearer signed-token');
  await pay('booking-1', { decline: true });
  assert.deepEqual(JSON.parse(calls[2].options.body), { decline: true });
  assert.equal(calls[2].options.body.includes('card'), false);
  await listMyBookings();
  assert.equal(calls[3].path, '/api/bookings');
});

test('frontend surfaces structured API errors', async () => {
  installStorage();
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Sign in required.' } }),
  });
  await assert.rejects(listMyBookings(), (error) => (
    error.status === 401 &&
    error.error.code === 'UNAUTHENTICATED' &&
    error.message === 'Sign in required.'
  ));
});
