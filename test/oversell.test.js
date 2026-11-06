import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { SQLiteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

test('50 simultaneous SQLite bookings for the last ticket allow exactly one', async (t) => {
  const repository = new SQLiteRepository({ databasePath: ':memory:' });
  t.after(() => repository.close());

  const eventService = createEventService(repository);
  const bookingService = createBookingService(repository, createMockPaymentGateway());
  const event = await eventService.createEvent('organizer-1', {
    title: 'Last Ticket Test',
    city: 'Lagos',
    venue: 'Test Hall',
    date: '2027-01-15T17:00:00Z',
  });
  const tier = await eventService.addTier('organizer-1', event.id, {
    name: 'General',
    priceCents: 2500,
    capacity: 1,
  });
  await eventService.publishEvent('organizer-1', event.id);

  const results = await Promise.allSettled(Array.from({ length: 50 }, (_, index) => (
    bookingService.book(`attendee-${index}`, {
      eventId: event.id,
      tierId: tier.id,
      quantity: 1,
    })
  )));
  const succeeded = results.filter(({ status }) => status === 'fulfilled');
  const rejected = results.filter(({ status }) => status === 'rejected');

  assert.equal(succeeded.length, 1);
  assert.equal(rejected.length, 49);
  assert.ok(rejected.every(({ reason }) => reason.code === 'SOLD_OUT'));

  const [storedTier] = await repository.listTiersForEvent(event.id);
  assert.equal(storedTier.sold, 1);
  assert.equal(storedTier.remaining, 0);
  assert.ok(storedTier.sold <= storedTier.capacity);
});