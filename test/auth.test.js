import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/http/app.js';
import { hashPassword, verifyPassword } from '../src/lib/password.js';
import { signToken, verifyToken } from '../src/lib/token.js';

const TOKEN_SECRET = 'test-secret-with-more-than-thirty-two-bytes';

async function startServer(t) {
  const server = createApp({ tokenSecret: TOKEN_SECRET });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function request(baseUrl, path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test('password hashes use a per-password random salt and verify safely', () => {
  const firstHash = hashPassword('correct horse battery');
  const secondHash = hashPassword('correct horse battery');

  assert.notEqual(firstHash, secondHash);
  assert.match(firstHash, /^scrypt\$[\da-f]{32}\$[\da-f]{128}$/);
  assert.equal(verifyPassword('correct horse battery', firstHash), true);
  assert.equal(verifyPassword('wrong password', firstHash), false);
  assert.equal(verifyPassword('correct horse battery', 'not-a-hash'), false);
});

test('signed HS256 tokens reject edits, non-HS256 algorithms and expiration', () => {
  const user = { id: 'user-1', email: 'person@example.test', role: 'attendee' };
  const token = signToken(user, TOKEN_SECRET, { now: 1_000_000 });

  assert.equal(verifyToken(token, TOKEN_SECRET, { now: 1_000_500 }).sub, user.id);
  assert.throws(() => verifyToken(`${token.slice(0, -1)}x`, TOKEN_SECRET), {
    code: 'UNAUTHENTICATED',
  });

  const [header, payload] = token.split('.');
  const wrongAlgorithmHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const editedHeaderToken = `${wrongAlgorithmHeader}.${payload}.${token.split('.')[2]}`;
  assert.throws(() => verifyToken(editedHeaderToken, TOKEN_SECRET), {
    code: 'UNAUTHENTICATED',
  });

  const expiredToken = signToken(user, TOKEN_SECRET, {
    now: 1_000_000,
    expiresInSeconds: 1,
  });
  assert.throws(() => verifyToken(expiredToken, TOKEN_SECRET, { now: 1_002_000 }), {
    code: 'UNAUTHENTICATED',
  });
});

test('signup and login return safe user objects and consistent credential failures', async (t) => {
  const baseUrl = await startServer(t);
  const signup = await request(baseUrl, '/api/auth/signup', {
    method: 'POST',
    body: {
      email: 'Organizer@Example.test',
      password: 'strong-password',
      role: 'organizer',
    },
  });
  assert.equal(signup.response.status, 201);
  assert.deepEqual(signup.body.user, {
    id: signup.body.user.id,
    email: 'organizer@example.test',
    role: 'organizer',
  });
  assert.equal('password' in signup.body, false);
  assert.equal(JSON.stringify(signup.body).includes('strong-password'), false);

  const duplicate = await request(baseUrl, '/api/auth/signup', {
    method: 'POST',
    body: { email: 'organizer@example.test', password: 'another-password' },
  });
  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.body.error.code, 'EMAIL_TAKEN');

  const success = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: 'organizer@example.test', password: 'strong-password' },
  });
  assert.equal(success.response.status, 200);
  assert.equal(success.body.user.id, signup.body.user.id);

  const wrongPassword = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: 'organizer@example.test', password: 'wrong-password' },
  });
  const unknownEmail = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: { email: 'unknown@example.test', password: 'wrong-password' },
  });
  assert.equal(wrongPassword.response.status, 401);
  assert.equal(unknownEmail.response.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
  assert.equal(wrongPassword.body.error.code, 'INVALID_CREDENTIALS');

  const me = await request(baseUrl, '/api/auth/me', { token: success.body.token });
  assert.equal(me.response.status, 200);
  assert.deepEqual(me.body, signup.body.user);
});

test('protected routes reject bad or expired tokens and wrong roles', async (t) => {
  const baseUrl = await startServer(t);
  const attendee = await request(baseUrl, '/api/auth/signup', {
    method: 'POST',
    body: {
      email: 'attendee@example.test',
      password: 'attendee-password',
      role: 'attendee',
    },
  });
  const missing = await request(baseUrl, '/api/bookings');
  assert.equal(missing.response.status, 401);
  assert.equal(missing.body.error.code, 'UNAUTHENTICATED');

  const edited = await request(baseUrl, '/api/bookings', {
    token: `${attendee.body.token.slice(0, -1)}x`,
  });
  assert.equal(edited.response.status, 401);
  assert.equal(edited.body.error.code, 'UNAUTHENTICATED');

  const expiredToken = signToken(attendee.body.user, TOKEN_SECRET, {
    now: 1_000_000,
    expiresInSeconds: 1,
  });
  const expired = await request(baseUrl, '/api/bookings', { token: expiredToken });
  assert.equal(expired.response.status, 401);
  assert.equal(expired.body.error.code, 'UNAUTHENTICATED');

  const wrongRole = await request(baseUrl, '/api/events', {
    method: 'POST',
    token: attendee.body.token,
    body: {
      title: 'Forbidden event',
      city: 'Lagos',
      venue: 'Hall',
      date: '2027-01-15T17:00:00Z',
    },
  });
  assert.equal(wrongRole.response.status, 403);
  assert.equal(wrongRole.body.error.code, 'FORBIDDEN');
});
