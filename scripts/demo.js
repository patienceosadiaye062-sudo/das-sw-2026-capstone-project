import {
  addTier,
  bookTickets,
  cancelBooking,
  createEvent,
  createStore,
  findBookingByReference,
  getNextWaitlistEntry,
  joinWaitlist,
  publishEvent,
} from '../src/domain/inventory.js';

const store = createStore();
const event = createEvent(store, {
  title: 'Summer Sounds',
  city: 'Lagos',
  venue: 'Freedom Park',
  date: '2026-12-05T17:00:00',
});
const tier = addTier(store, event.id, {
  name: 'General admission',
  priceCents: 2500,
  capacity: 3,
});
publishEvent(store, event.id);

console.log(`Event: ${event.name} — ${tier.capacity} ${tier.name} tickets`);

const adaBooking = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: 'Ada',
  quantity: 2,
});
console.log(`Ada books ${adaBooking.quantity}; ${tier.remaining} seat(s) remain.`);

try {
  bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: 'Bayo',
    quantity: 2,
  });
} catch (error) {
  if (error.code !== 'SOLD_OUT') {
    throw error;
  }
  console.log(`Bayo's booking is refused (${error.code}): ${error.message}`);
}

const bayoBooking = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: 'Bayo',
  quantity: 1,
});
console.log(`Bayo books the last seat. Event sold out: ${tier.remaining === 0}.`);

const chikaEntry = joinWaitlist(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: 'Chika',
  quantity: 1,
});
const dapoEntry = joinWaitlist(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: 'Dapo',
  quantity: 1,
});
console.log(`${chikaEntry.attendeeName} and ${dapoEntry.attendeeName} join the waitlist.`);

const foundBooking = findBookingByReference(store, bayoBooking.reference);
console.log(`Booking lookup ${foundBooking.reference}: ${foundBooking.attendeeName}.`);

cancelBooking(store, adaBooking.id);
const nextEntry = getNextWaitlistEntry(store, event.id, tier.id);
console.log(`Ada cancels. ${tier.remaining} seat(s) are free; next in line: ${nextEntry.attendeeName}.`);
