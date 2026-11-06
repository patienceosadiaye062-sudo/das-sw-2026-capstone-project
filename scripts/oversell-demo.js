import { createMockPaymentGateway } from '../src/lib/mockPaymentGateway.js';
import { MemoryRepository } from '../src/repositories/memory.js';
import { SQLiteRepository } from '../src/repositories/sqlite.js';
import { createBookingService } from '../src/services/bookingService.js';
import { createEventService } from '../src/services/eventService.js';

class ReadThenWriteRepository extends MemoryRepository {
  async reserveAndSaveBooking(tierId, quantity, booking) {
    const tier = await this.findTierById(tierId);
    if (!tier || tier.remaining < quantity) return undefined;

    tier.remaining -= quantity;
    tier.sold += quantity;
    await this.saveTier(tier);
    await this.saveBooking(booking);
    return booking;
  }
}

async function runRace(repository, attendeePrefix) {
  const eventService = createEventService(repository);
  const bookingService = createBookingService(repository, createMockPaymentGateway());
  const event = await eventService.createEvent('demo-organizer', {
    title: 'Last Ticket Race',
    city: 'Lagos',
    venue: 'Test Hall',
    date: '2027-01-15T17:00:00Z',
  });
  const tier = await eventService.addTier('demo-organizer', event.id, {
    name: 'General',
    priceCents: 2500,
    capacity: 1,
  });
  await eventService.publishEvent('demo-organizer', event.id);

  const results = await Promise.allSettled(Array.from({ length: 50 }, (_, index) => (
    bookingService.book(`${attendeePrefix}-${index}`, {
      eventId: event.id,
      tierId: tier.id,
      quantity: 1,
    })
  )));
  const succeeded = results.filter(({ status }) => status === 'fulfilled').length;
  const soldOut = results.filter(({ status, reason }) => (
    status === 'rejected' && reason.code === 'SOLD_OUT'
  )).length;
  const [storedTier] = await repository.listTiersForEvent(event.id);
  return { attempts: results.length, succeeded, soldOut, sold: storedTier.sold, capacity: storedTier.capacity };
}

const before = await runRace(new ReadThenWriteRepository(), 'before-attendee');
console.log('Before (read/check/write):');
console.log(`Attempts: ${before.attempts}`);
console.log(`Bookings succeeded: ${before.succeeded}`);
console.log(`Rejected as SOLD_OUT: ${before.soldOut}`);
console.log(`Successful bookings for capacity: ${before.succeeded}/${before.capacity}`);

const repository = new SQLiteRepository({ databasePath: ':memory:' });
try {
  const after = await runRace(repository, 'after-attendee');
  console.log('After (atomic SQLite reservation):');
  console.log(`Attempts: ${after.attempts}`);
  console.log(`Bookings succeeded: ${after.succeeded}`);
  console.log(`Rejected as SOLD_OUT: ${after.soldOut}`);
  console.log(`Tickets sold: ${after.sold}/${after.capacity}`);
} finally {
  repository.close();
}