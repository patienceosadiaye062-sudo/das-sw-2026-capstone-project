import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteRepository } from '../src/repositories/sqlite.js';
import { startServer } from '../src/server.js';

async function startPersistentServer(databasePath) {
  const server = startServer({
    port: 0,
    host: '127.0.0.1',
    repository: new SQLiteRepository({ databasePath }),
  });
  await once(server, 'listening');
  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test('SQLite data remains available after closing and reopening the database', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'ticketing-sqlite-'));
  let repository;
  t.after(async () => {
    repository?.close();
    await rm(directory, { recursive: true, force: true });
  });
  const databasePath = join(directory, 'ticketing.db');

  repository = new SQLiteRepository({ databasePath });
  const event = {
    id: 'event-1',
    organizerId: 'organizer-1',
    title: 'Persistent Event',
    city: 'Lagos',
    venue: 'Test Hall',
    date: '2027-01-15T17:00:00Z',
    status: 'published',
  };
  await repository.saveEvent(event);
  await repository.saveTier({
    id: 'tier-1',
    eventId: event.id,
    name: 'General',
    priceCents: 2500,
    capacity: 2,
    remaining: 2,
    sold: 0,
  });
  await repository.saveBooking({
    id: 'booking-1',
    reference: 'ABCD-2345',
    eventId: event.id,
    tierId: 'tier-1',
    userId: 'attendee-1',
    quantity: 1,
    totalCents: 2500,
    status: 'pending',
  });
  repository.close();
  repository = new SQLiteRepository({ databasePath });
  assert.deepEqual(await repository.findEventById(event.id), event);
  assert.deepEqual(await repository.findTierById('tier-1'), {
    id: 'tier-1',
    eventId: event.id,
    name: 'General',
    priceCents: 2500,
    capacity: 2,
    remaining: 2,
    sold: 0,
  });
  assert.equal(
    (await repository.findBookingByReference('ABCD-2345')).userId,
    'attendee-1',
  );
});

test('the SQLite-backed API retains events after the server restarts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ticketing-server-'));
  const databasePath = join(directory, 'ticketing.db');

  try {
    const first = await startPersistentServer(databasePath);
    let eventId;
    try {
      const eventResponse = await fetch(`${first.baseUrl}/api/events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'organizer-1',
        },
        body: JSON.stringify({
          title: 'Restart Test Event',
          city: 'Lagos',
          venue: 'Test Hall',
          date: '2027-01-15T17:00:00Z',
        }),
      });
      assert.equal(eventResponse.status, 201);
      eventId = (await eventResponse.json()).id;

      const tierResponse = await fetch(`${first.baseUrl}/api/events/${eventId}/tiers`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'organizer-1',
        },
        body: JSON.stringify({ name: 'General', priceCents: 2500, capacity: 2 }),
      });
      assert.equal(tierResponse.status, 201);
      const publishResponse = await fetch(`${first.baseUrl}/api/events/${eventId}/publish`, {
        method: 'POST',
        headers: { 'x-user-id': 'organizer-1' },
      });
      assert.equal(publishResponse.status, 200);
    } finally {
      await closeServer(first.server);
    }

    const restarted = await startPersistentServer(databasePath);
    try {
      const response = await fetch(`${restarted.baseUrl}/api/events`);
      const result = await response.json();
      assert.equal(response.status, 200);
      assert.ok(result.events.some(({ id }) => id === eventId));
    } finally {
      await closeServer(restarted.server);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('SQLite rejects a tier whose sold count exceeds capacity', async (t) => {
  const repository = new SQLiteRepository({ databasePath: ':memory:' });
  t.after(() => repository.close());
  await repository.saveEvent({
    id: 'event-1',
    organizerId: 'organizer-1',
    title: 'Constraint Test',
    city: 'Lagos',
    venue: 'Test Hall',
    date: '2027-01-15T17:00:00Z',
    status: 'draft',
  });

  await assert.rejects(repository.saveTier({
    id: 'tier-1',
    eventId: 'event-1',
    name: 'General',
    priceCents: 2500,
    capacity: 1,
    remaining: 0,
    sold: 2,
  }));
});