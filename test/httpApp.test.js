import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/http/app.js';
import { Router } from '../src/http/router.js';

async function listen(t, options) {
  const server = createApp(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('serves GET /health as JSON over real HTTP', async (t) => {
  const baseUrl = await listen(t);
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('serves the public index file', async (t) => {
  const baseUrl = await listen(t);
  const response = await fetch(baseUrl);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(await response.text(), /Event Ticketing/);
});

test('returns JSON 404 responses for unknown API routes', async (t) => {
  const baseUrl = await listen(t);
  const response = await fetch(`${baseUrl}/api/not-a-route`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_FOUND', message: 'API route not found.' },
  });
});

test('returns a consistent JSON 400 response for malformed JSON', async (t) => {
  const baseUrl = await listen(t);
  const response = await fetch(`${baseUrl}/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"title":',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' },
  });
});

test('does not serve paths that escape the public directory', async (t) => {
  const baseUrl = await listen(t);
  const response = await fetch(`${baseUrl}/%2e%2e%2f..%2fpackage.json`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_FOUND', message: 'Resource not found.' },
  });
});

test('returns a consistent error response without exposing internal stack traces', async (t) => {
  const router = new Router().add('GET', '/api/failure', () => {
    throw new Error('private implementation detail');
  });
  const baseUrl = await listen(t, { router });
  const originalConsoleError = console.error;
  const loggedErrors = [];
  console.error = (error) => loggedErrors.push(error);

  let response;
  try {
    response = await fetch(`${baseUrl}/api/failure`);
  } finally {
    console.error = originalConsoleError;
  }

  const responseText = await response.text();
  assert.equal(response.status, 500);
  assert.deepEqual(JSON.parse(responseText), {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' },
  });
  assert.equal(responseText.includes('private implementation detail'), false);
  assert.equal(loggedErrors.length, 1);
});
