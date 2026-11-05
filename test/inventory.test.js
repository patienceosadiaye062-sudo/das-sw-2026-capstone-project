import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  listEventSummaries,
  publishEvent,
  unpublishEvent,
} from '../src/domain/inventory.js';

function makeEvent(store, overrides = {}) {
  return createEvent(store, {
    title: 'Lagos Tech Meetup',
    city: 'Lagos',
    venue: 'Civic Centre',
    date: '2026-12-05T17:00:00',
    ...overrides,
  });
}

function assertCode(code, operation) {
  assert.throws(operation, (error) => error.code === code);
}

test('creates a draft event with a new id and required event details', () => {
  const store = createStore();
  const event = makeEvent(store);

  assert.ok(event.id);
  assert.equal(event.status, 'draft');
  assert.equal(event.title, 'Lagos Tech Meetup');
  assert.deepEqual(listEventSummaries(store), []);
  assert.deepEqual(listEventSummaries(store, { publishedOnly: false }).map(({ id }) => id), [event.id]);
});

test('rejects missing title, city, or invalid date without saving', () => {
  for (const input of [
    { city: 'Lagos', venue: 'Hall', date: '2026-12-05' },
    { title: 'Meetup', venue: 'Hall', date: '2026-12-05' },
    { title: 'Meetup', city: 'Lagos', venue: 'Hall', date: '2026-02-30' },
  ]) {
    const store = createStore();
    assertCode('VALIDATION', () => createEvent(store, input));
    assert.equal(store.events.size, 0);
  }
});

test('adds a tier with its full capacity and no tickets sold', () => {
  const store = createStore();
  const event = makeEvent(store);
  const tier = addTier(store, event.id, { name: 'General', priceCents: 500000, capacity: 100 });

  assert.equal(tier.sold, 0);
  assert.equal(tier.remaining, 100);
});

test('rejects non-whole prices and capacities below one', () => {
  const store = createStore();
  const event = makeEvent(store);

  assertCode('VALIDATION', () => addTier(store, event.id, {
    name: 'General',
    priceCents: 500000.5,
    capacity: 100,
  }));
  assertCode('VALIDATION', () => addTier(store, event.id, {
    name: 'General',
    priceCents: 500000,
    capacity: 0,
  }));
});

test('reports a missing event when adding a tier', () => {
  assertCode('NOT_FOUND', () => addTier(createStore(), 'missing', {
    name: 'General',
    priceCents: 500000,
    capacity: 100,
  }));
});

test('publishes tiered events and unpublishes them without deleting', () => {
  const store = createStore();
  const event = makeEvent(store);

  assertCode('INVALID_STATE', () => publishEvent(store, event.id));
  addTier(store, event.id, { name: 'General', priceCents: 1000, capacity: 5 });
  assert.equal(publishEvent(store, event.id).status, 'published');
  assert.equal(listEventSummaries(store).length, 1);
  assert.equal(unpublishEvent(store, event.id).status, 'draft');
  assert.equal(listEventSummaries(store).length, 0);
  assert.equal(store.events.has(event.id), true);
});

test('reports missing events when publishing or unpublishing', () => {
  const store = createStore();
  assertCode('NOT_FOUND', () => publishEvent(store, 'missing'));
  assertCode('NOT_FOUND', () => unpublishEvent(store, 'missing'));
});

test('books published-event tickets at whole-cent prices and reserves seats', () => {
  const store = createStore();
  const event = makeEvent(store);
  const tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 3 });
  publishEvent(store, event.id);
  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: 'Ada',
    quantity: 2,
  });

  assert.equal(booking.status, 'PENDING');
  assert.equal(booking.totalCents, 5000);
  assert.equal(tier.remaining, 1);
  assert.equal(tier.sold, 2);
});

test('rejects bookings for draft events without changing inventory', () => {
  const store = createStore();
  const event = makeEvent(store);
  const tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 3 });
  const before = { ...tier };

  assertCode('INVALID_STATE', () => bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: 'Ada',
    quantity: 1,
  }));
  assert.deepEqual(tier, before);
  assert.equal(store.bookingsById.size, 0);
});

test('refuses bookings exceeding capacity without changing inventory', () => {
  const store = createStore();
  const event = makeEvent(store);
  const tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 1 });
  publishEvent(store, event.id);
  const before = { ...tier };

  assertCode('SOLD_OUT', () => bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: 'Bayo',
    quantity: 2,
  }));
  assert.deepEqual(tier, before);
});

test('rejects zero, negative, fractional, and over-limit booking quantities', () => {
  const store = createStore();
  const event = makeEvent(store);
  const tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 20 });
  publishEvent(store, event.id);

  for (const quantity of [0, -1, 1.5, 11]) {
    assertCode('VALIDATION', () => bookTickets(store, {
      eventId: event.id,
      tierId: tier.id,
      attendeeName: 'Ada',
      quantity,
    }));
  }
});

test('cancellation releases seats exactly once', () => {
  const store = createStore();
  const event = makeEvent(store);
  const tier = addTier(store, event.id, { name: 'General', priceCents: 2500, capacity: 2 });
  publishEvent(store, event.id);
  const booking = bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: 'Ada',
    quantity: 1,
  });

  cancelBooking(store, booking.id);
  assert.equal(tier.remaining, 2);
  assert.equal(tier.sold, 0);
  assertCode('ALREADY_CANCELLED', () => cancelBooking(store, booking.id));
});
