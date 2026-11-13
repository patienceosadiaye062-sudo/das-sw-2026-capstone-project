import { mockBookings, mockEvents } from './mockData.js';

const MAX_QUANTITY = 10;
const HOLD_MILLISECONDS = 10 * 60 * 1000;
const bookingExpiry = new Map();

function apiError(code, message, status) {
  return Object.assign(new Error(message), { error: { code, message }, status });
}

function copy(value) {
  return structuredClone(value);
}

function cheapestPrice(event) {
  return event.tiers.length
    ? Math.min(...event.tiers.map((tier) => tier.priceCents))
    : Infinity;
}

function availability(event) {
  return event.tiers.reduce((sum, tier) => sum + tier.remaining, 0);
}

function expireBookings(now = Date.now()) {
  for (const booking of mockBookings) {
    if (booking.status !== 'pending' || bookingExpiry.get(booking.reference) > now) continue;
    const event = mockEvents.find((item) => item.id === booking.eventId);
    const tier = event?.tiers.find((item) => item.id === booking.tierId);
    if (tier) {
      tier.remaining += booking.quantity;
      tier.sold -= booking.quantity;
    }
    booking.status = 'expired';
    bookingExpiry.delete(booking.reference);
  }
}

export async function listEvents(criteria = {}) {
  expireBookings();
  const query = String(criteria.q ?? '').trim().toLocaleLowerCase();
  const city = String(criteria.city ?? '').trim().toLocaleLowerCase();
  const maxPriceCents = criteria.maxPriceCents === '' || criteria.maxPriceCents === undefined
    ? undefined
    : Number(criteria.maxPriceCents);
  if (maxPriceCents !== undefined && (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)) {
    throw apiError('VALIDATION', 'Maximum price must be a non-negative whole number of cents.', 400);
  }

  const events = mockEvents
    .filter((event) => event.status === 'published')
    .filter((event) => !query ||
      `${event.title} ${event.venue}`.toLocaleLowerCase().includes(query))
    .filter((event) => !city || event.city.toLocaleLowerCase() === city)
    .filter((event) => maxPriceCents === undefined || cheapestPrice(event) <= maxPriceCents)
    .filter((event) => !criteria.onlyAvailable || availability(event) > 0);

  const sort = criteria.sort ?? 'date';
  if (!['date', 'price', 'availability'].includes(sort)) {
    throw apiError('VALIDATION', `Unknown event sort option "${sort}".`, 400);
  }
  events.sort((left, right) => {
    if (sort === 'price') return cheapestPrice(left) - cheapestPrice(right);
    if (sort === 'availability') return availability(right) - availability(left);
    return Date.parse(left.date) - Date.parse(right.date);
  });
  return { events: copy(events) };
}

export async function getEvent(eventId) {
  expireBookings();
  const event = mockEvents.find((item) => item.id === eventId && item.status === 'published');
  if (!event) throw apiError('NOT_FOUND', 'Event was not found.', 404);
  return copy(event);
}

export async function createBooking({ eventId, tierId, quantity }, userId = 'attendee-1') {
  expireBookings();
  if (typeof eventId !== 'string' || typeof tierId !== 'string' ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    throw apiError('VALIDATION', `Quantity must be an integer from 1 to ${MAX_QUANTITY}.`, 400);
  }
  const event = mockEvents.find((item) => item.id === eventId && item.status === 'published');
  if (!event) throw apiError('NOT_FOUND', 'Event was not found.', 404);
  const tier = event.tiers.find((item) => item.id === tierId);
  if (!tier) throw apiError('NOT_FOUND', 'Ticket tier was not found for this event.', 404);
  if (tier.remaining < quantity) {
    throw apiError('SOLD_OUT', `Only ${tier.remaining} ticket(s) left in ${tier.name}.`, 409);
  }

  tier.remaining -= quantity;
  tier.sold += quantity;
  const booking = {
    id: `booking-${crypto.randomUUID()}`,
    reference: `GTH-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    eventId,
    tierId,
    userId,
    quantity,
    totalCents: tier.priceCents * quantity,
    status: 'pending',
  };
  mockBookings.push(booking);
  bookingExpiry.set(booking.reference, Date.now() + HOLD_MILLISECONDS);
  return copy(booking);
}

export async function pay(reference, { decline = false } = {}, userId = 'attendee-1') {
  expireBookings();
  const booking = mockBookings.find((item) => item.reference === reference);
  if (!booking) throw apiError('NOT_FOUND', 'Booking was not found.', 404);
  if (booking.userId !== userId) throw apiError('FORBIDDEN', 'This booking belongs to another user.', 403);
  if (booking.status !== 'pending') {
    throw apiError('INVALID_TRANSITION', `Cannot pay for a ${booking.status} booking.`, 409);
  }
  if (typeof decline !== 'boolean') {
    throw apiError('VALIDATION', 'decline must be a boolean.', 400);
  }
  if (decline) throw apiError('PAYMENT_DECLINED', 'The mock payment was declined.', 402);

  booking.status = 'paid';
  bookingExpiry.delete(booking.reference);
  booking.paymentReference = `mock-payment-${crypto.randomUUID()}`;
  return copy(booking);
}
