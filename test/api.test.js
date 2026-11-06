import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { createApp } from '../src/http/app.js';

async function startServer(t, options) {
  const server = createApp(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function jsonRequest(baseUrl, path, { method = 'GET', userId, body } = {}) {
  const headers = {};
  if (userId) headers['x-user-id'] = userId;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

async function createPublishedEvent(baseUrl, owner = 'organizer-1', capacity = 3) {
  const created = await jsonRequest(baseUrl, '/api/events', {
    method: 'POST',
    userId: owner,
    body: {
      title: 'Lagos Tech Meetup',
      city: 'Lagos',
      venue: 'Civic Centre',
      date: '2026-12-05T17:00:00',
    },
  });
  assert.equal(created.response.status, 201);

  const tierResult = await jsonRequest(baseUrl, `/api/events/${created.body.id}/tiers`, {
    method: 'POST',
    userId: owner,
    body: { name: 'General', priceCents: 2500, capacity },
  });
  assert.equal(tierResult.response.status, 201);

  const published = await jsonRequest(baseUrl, `/api/events/${created.body.id}/publish`, {
    method: 'POST',
    userId: owner,
  });
  assert.equal(published.response.status, 200);
  return { event: published.body, tier: tierResult.body };
}

test('Build 4 API supports creating, publishing, searching, booking, and paying', async (t) => {
  const baseUrl = await startServer(t);
  const { event, tier } = await createPublishedEvent(baseUrl);

  const search = await jsonRequest(baseUrl, '/api/events?q=meetup&city=lagos&maxPriceCents=3000');
  assert.equal(search.response.status, 200);
  assert.deepEqual(search.body.events.map(({ id }) => id), [event.id]);

  const booked = await jsonRequest(baseUrl, '/api/bookings', {
    method: 'POST',
    userId: 'attendee-1',
    body: { eventId: event.id, tierId: tier.id, quantity: 2 },
  });
  assert.equal(booked.response.status, 201);
  assert.equal(booked.body.status, 'pending');
  assert.equal(booked.body.totalCents, 5000);
  assert.ok(booked.body.reference);

  const paid = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/pay`, {
    method: 'POST',
    userId: 'attendee-1',
    body: {},
  });
  assert.equal(paid.response.status, 200);
  assert.equal(paid.body.status, 'paid');
  assert.equal(paid.body.reference, booked.body.reference);

  const repeatedPayment = await jsonRequest(
    baseUrl,
    `/api/bookings/${booked.body.reference}/pay`,
    { method: 'POST', userId: 'attendee-1', body: {} },
  );
  assert.equal(repeatedPayment.response.status, 409);
  assert.equal(repeatedPayment.body.error.code, 'INVALID_TRANSITION');

  const eventDetails = await jsonRequest(baseUrl, `/api/events/${event.id}`);
  assert.equal(eventDetails.body.tiers[0].remaining, 1);
});

test('declined payment leaves booking pending and can be retried', async (t) => {
  const baseUrl = await startServer(t);
  const { event, tier } = await createPublishedEvent(baseUrl);
  const booked = await jsonRequest(baseUrl, '/api/bookings', {
    method: 'POST',
    userId: 'attendee-1',
    body: { eventId: event.id, tierId: tier.id, quantity: 1 },
  });

  const declined = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/pay`, {
    method: 'POST',
    userId: 'attendee-1',
    body: { decline: true },
  });
  assert.equal(declined.response.status, 402);
  assert.equal(declined.body.error.code, 'PAYMENT_DECLINED');

  const stillPending = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}`, {
    userId: 'attendee-1',
  });
  assert.equal(stillPending.body.status, 'pending');

  const retry = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/pay`, {
    method: 'POST',
    userId: 'attendee-1',
    body: {},
  });
  assert.equal(retry.response.status, 200);
  assert.equal(retry.body.status, 'paid');
});

test('payment is charged once and only the booking owner can access it', async (t) => {
  let charges = 0;
  const paymentGateway = {
    async charge() {
      charges += 1;
      return { status: 'succeeded' };
    },
  };
  const baseUrl = await startServer(t, { paymentGateway });
  const { event, tier } = await createPublishedEvent(baseUrl);
  const booked = await jsonRequest(baseUrl, '/api/bookings', {
    method: 'POST',
    userId: 'attendee-1',
    body: { eventId: event.id, tierId: tier.id, quantity: 1 },
  });

  const forbidden = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/pay`, {
    method: 'POST',
    userId: 'attendee-2',
    body: {},
  });
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.body.error.code, 'FORBIDDEN');
  assert.equal(charges, 0);

  await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/pay`, {
    method: 'POST',
    userId: 'attendee-1',
    body: {},
  });
  const repeated = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/pay`, {
    method: 'POST',
    userId: 'attendee-1',
    body: {},
  });
  assert.equal(repeated.body.error.code, 'INVALID_TRANSITION');
  assert.equal(charges, 1);
});

test('cancel releases seats only for the owner and only once', async (t) => {
  const baseUrl = await startServer(t);
  const { event, tier } = await createPublishedEvent(baseUrl, 'organizer-1', 1);
  const booked = await jsonRequest(baseUrl, '/api/bookings', {
    method: 'POST',
    userId: 'attendee-1',
    body: { eventId: event.id, tierId: tier.id, quantity: 1 },
  });

  const cancelled = await jsonRequest(baseUrl, `/api/bookings/${booked.body.reference}/cancel`, {
    method: 'POST',
    userId: 'attendee-1',
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.status, 'cancelled');

  const soldAgain = await jsonRequest(baseUrl, '/api/bookings', {
    method: 'POST',
    userId: 'attendee-2',
    body: { eventId: event.id, tierId: tier.id, quantity: 1 },
  });
  assert.equal(soldAgain.response.status, 201);

  const repeatedCancel = await jsonRequest(
    baseUrl,
    `/api/bookings/${booked.body.reference}/cancel`,
    { method: 'POST', userId: 'attendee-1' },
  );
  assert.equal(repeatedCancel.response.status, 409);
  assert.equal(repeatedCancel.body.error.code, 'INVALID_TRANSITION');

  const paymentAfterCancel = await jsonRequest(
    baseUrl,
    `/api/bookings/${booked.body.reference}/pay`,
    { method: 'POST', userId: 'attendee-1', body: {} },
  );
  assert.equal(paymentAfterCancel.response.status, 409);
  assert.equal(paymentAfterCancel.body.error.code, 'INVALID_TRANSITION');
});

test('unpublishing hides an event from public search but retains it for its organizer', async (t) => {
  const baseUrl = await startServer(t);
  const { event } = await createPublishedEvent(baseUrl);

  const unpublished = await jsonRequest(baseUrl, `/api/events/${event.id}/unpublish`, {
    method: 'POST',
    userId: 'organizer-1',
  });
  assert.equal(unpublished.response.status, 200);
  assert.equal(unpublished.body.status, 'draft');

  const publicSearch = await jsonRequest(baseUrl, '/api/events');
  assert.deepEqual(publicSearch.body.events, []);
  const ownerRead = await jsonRequest(baseUrl, `/api/events/${event.id}`, {
    userId: 'organizer-1',
  });
  assert.equal(ownerRead.body.status, 'draft');
});

test('API returns a consistent JSON error shape for validation and missing identity', async (t) => {
  const baseUrl = await startServer(t);
  const missingIdentity = await jsonRequest(baseUrl, '/api/events', {
    method: 'POST',
    body: { title: 'Meetup' },
  });
  assert.equal(missingIdentity.response.status, 401);
  assert.deepEqual(Object.keys(missingIdentity.body), ['error']);
  assert.equal(missingIdentity.body.error.code, 'UNAUTHENTICATED');

  const invalidDate = await jsonRequest(baseUrl, '/api/events', {
    method: 'POST',
    userId: 'organizer-1',
    body: { title: 'Meetup', city: 'Lagos', venue: 'Hall', date: '2026-02-30' },
  });
  assert.equal(invalidDate.response.status, 400);
  assert.equal(invalidDate.body.error.code, 'VALIDATION');
  assert.equal(typeof invalidDate.body.error.message, 'string');

  const openapi = await jsonRequest(baseUrl, '/openapi.json');
  assert.equal(openapi.response.status, 200);
  assert.equal(openapi.body.openapi, '3.0.3');
  assert.equal(openapi.body.servers[0].url, 'http://localhost:3000');
  assert.equal(openapi.body.components.securitySchemes.userId.name, 'x-user-id');
  assert.ok(openapi.body.paths['/api/events'].post.requestBody);
  assert.ok(openapi.body.paths['/api/bookings/{reference}/pay'].post);
});

test('Hoppscotch collection and local environment contain the Build 4 API workflow', async () => {
  const [collectionText, environmentText] = await Promise.all([
    readFile(new URL('../docs/hoppscotch/build-4.collection.json', import.meta.url), 'utf8'),
    readFile(new URL('../docs/hoppscotch/local.environment.json', import.meta.url), 'utf8'),
  ]);
  const collection = JSON.parse(collectionText);
  const environment = JSON.parse(environmentText);
  const requests = collection.folders.flatMap((folder) => folder.requests);
  const requestNames = new Set(requests.map(({ name }) => name));
  const environmentVariables = new Set(environment.variables.map(({ key }) => key));

  assert.equal(collection.v, 2);
  assert.equal(environment.v, 1);
  for (const name of [
    'Create event',
    'Add ticket tier',
    'Publish event',
    'Search published events',
    'Create booking',
    'Pay booking',
    'Declined payment (retryable)',
    'Cancel unpaid booking',
  ]) {
    assert.ok(requestNames.has(name), `missing Hoppscotch request: ${name}`);
  }
  for (const key of ['baseUrl', 'organizerId', 'attendeeId', 'eventId', 'tierId', 'bookingReference']) {
    assert.ok(environmentVariables.has(key), `missing Hoppscotch environment variable: ${key}`);
  }
  assert.ok(requests.every(({ endpoint }) => endpoint.includes('<<baseUrl>>')));
});
