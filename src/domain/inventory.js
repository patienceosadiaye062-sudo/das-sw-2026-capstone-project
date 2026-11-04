import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';
import { Queue } from './waitlistQueue.js';

const MIN_BOOKING_QUANTITY = 1;
const MAX_BOOKING_QUANTITY = 10;

function fail(message, code = 'VALIDATION') {
  throw new DomainError(message, code);
}

function validateStore(store) {
  if (
    store === null ||
    typeof store !== 'object' ||
    !(store.events instanceof Map) ||
    !(store.bookingsById instanceof Map) ||
    !(store.bookingsByReference instanceof Map) ||
    !(store.waitlists instanceof Map)
  ) {
    fail('A valid store is required.');
  }
}

function validateInputObject(input, label) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    fail(`${label} must be an object.`);
  }
}

function validateNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(`${label} must be a non-empty string.`);
  }

  return value.trim();
}

function validatePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} must be a positive whole number.`);
  }
}

function validateQuantity(quantity) {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < MIN_BOOKING_QUANTITY ||
    quantity > MAX_BOOKING_QUANTITY
  ) {
    fail(`Quantity must be an integer from ${MIN_BOOKING_QUANTITY} to ${MAX_BOOKING_QUANTITY}.`);
  }
}

function findTier(store, eventId, tierId) {
  const event = store.events.get(eventId);
  if (!event) {
    fail(`Event "${eventId}" was not found.`, 'NOT_FOUND');
  }

  const tier = event.tiers.get(tierId);
  if (!tier) {
    fail(`Ticket tier "${tierId}" was not found for this event.`, 'NOT_FOUND');
  }

  return tier;
}

export function createStore() {
  return {
    events: new Map(),
    bookingsById: new Map(),
    bookingsByReference: new Map(),
    waitlists: new Map(),
  };
}

export function createEvent(store, input = {}) {
  validateStore(store);
  validateInputObject(input, 'Event input');
  const { name } = input;
  const eventName = validateNonEmptyString(name, 'Event name');
  const event = {
    id: newId(),
    name: eventName,
    tiers: new Map(),
  };

  store.events.set(event.id, event);
  return event;
}

export function addTier(store, eventId, input = {}) {
  validateStore(store);
  validateInputObject(input, 'Tier input');
  const { name, priceCents, capacity } = input;
  validateNonEmptyString(eventId, 'Event id');
  const tierName = validateNonEmptyString(name, 'Tier name');
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    fail('Price must be a non-negative whole number of cents.');
  }
  validatePositiveInteger(capacity, 'Capacity');

  const event = store.events.get(eventId);
  if (!event) {
    fail(`Event "${eventId}" was not found.`, 'NOT_FOUND');
  }

  const tier = {
    id: newId(),
    eventId,
    name: tierName,
    priceCents,
    capacity,
    remaining: capacity,
  };

  event.tiers.set(tier.id, tier);
  return tier;
}

export function bookTickets(store, input = {}) {
  validateStore(store);
  validateInputObject(input, 'Booking input');
  const { eventId, tierId, attendeeName, quantity } = input;
  validateNonEmptyString(eventId, 'Event id');
  validateNonEmptyString(tierId, 'Tier id');
  const name = validateNonEmptyString(attendeeName, 'Attendee name');
  validateQuantity(quantity);

  const tier = findTier(store, eventId, tierId);
  if (tier.remaining < quantity) {
    fail(
      `Only ${tier.remaining} ticket(s) remain in "${tier.name}", but ${quantity} requested.`,
      'SOLD_OUT',
    );
  }

  const totalCents = tier.priceCents * quantity;
  if (!Number.isSafeInteger(totalCents)) {
    fail('Booking total must be a safe whole number of cents.');
  }

  let reference = newReference();
  while (store.bookingsByReference.has(reference)) {
    reference = newReference();
  }

  const booking = {
    id: newId(),
    reference,
    eventId,
    tierId,
    attendeeName: name,
    quantity,
    totalCents,
    status: 'CONFIRMED',
  };

  tier.remaining -= quantity;
  store.bookingsById.set(booking.id, booking);
  store.bookingsByReference.set(booking.reference, booking);
  return booking;
}

export function cancelBooking(store, bookingId) {
  validateStore(store);
  validateNonEmptyString(bookingId, 'Booking id');

  const booking = store.bookingsById.get(bookingId);
  if (!booking) {
    fail(`Booking "${bookingId}" was not found.`, 'NOT_FOUND');
  }
  if (booking.status === 'CANCELLED') {
    fail(`Booking "${bookingId}" has already been cancelled.`, 'ALREADY_CANCELLED');
  }

  const tier = findTier(store, booking.eventId, booking.tierId);
  booking.status = 'CANCELLED';
  tier.remaining += booking.quantity;
  return booking;
}

export function findBookingByReference(store, reference) {
  validateStore(store);
  const bookingReference = validateNonEmptyString(reference, 'Booking reference');

  const booking = store.bookingsByReference.get(bookingReference);
  if (!booking) {
    fail(`Booking reference "${bookingReference}" was not found.`, 'NOT_FOUND');
  }

  return booking;
}

export function joinWaitlist(store, input = {}) {
  validateStore(store);
  validateInputObject(input, 'Waitlist input');
  const { eventId, tierId, attendeeName, quantity } = input;
  validateNonEmptyString(eventId, 'Event id');
  validateNonEmptyString(tierId, 'Tier id');
  const name = validateNonEmptyString(attendeeName, 'Attendee name');
  validateQuantity(quantity);

  const tier = findTier(store, eventId, tierId);
  if (tier.remaining >= quantity) {
    fail('There are enough tickets available; a waitlist entry is not needed.');
  }

  let queue = store.waitlists.get(tierId);
  if (!queue) {
    queue = new Queue();
    store.waitlists.set(tierId, queue);
  }

  const entry = {
    id: newId(),
    eventId,
    tierId,
    attendeeName: name,
    quantity,
  };
  queue.enqueue(entry);
  return entry;
}

export function getNextWaitlistEntry(store, eventId, tierId) {
  validateStore(store);
  validateNonEmptyString(eventId, 'Event id');
  validateNonEmptyString(tierId, 'Tier id');
  findTier(store, eventId, tierId);
  return store.waitlists.get(tierId)?.peek();
}
