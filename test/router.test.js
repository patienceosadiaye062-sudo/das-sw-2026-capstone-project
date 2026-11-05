import test from 'node:test';
import assert from 'node:assert/strict';
import { Router } from '../src/http/router.js';

test('matches routes by HTTP method and path and extracts named parameters', () => {
  const handler = () => {};
  const router = new Router().add('GET', '/events/:eventId/bookings/:bookingId', handler);

  assert.deepEqual(router.match('GET', '/events/event-1/bookings/booking-2'), {
    handler,
    params: { eventId: 'event-1', bookingId: 'booking-2' },
    path: '/events/:eventId/bookings/:bookingId',
  });
  assert.equal(router.match('POST', '/events/event-1/bookings/booking-2'), null);
  assert.equal(router.match('GET', '/events/event-1'), null);
});

test('decodes route parameters and accepts a trailing slash', () => {
  const router = new Router().add('GET', '/events/:eventId', () => {});

  assert.deepEqual(router.match('GET', '/events/summer%20sounds/').params, {
    eventId: 'summer sounds',
  });
  assert.equal(router.match('GET', '/events/%E0%A4%A'), null);
});

test('rejects invalid route definitions', () => {
  const router = new Router();

  assert.throws(() => router.add('GET', 'events', () => {}), TypeError);
  assert.throws(() => router.add('GET', '/events/:bad-name', () => {}), TypeError);
  assert.throws(() => router.add('GET', '/events', null), TypeError);
});
