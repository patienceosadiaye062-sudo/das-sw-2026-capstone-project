import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createBooking, listEvents, pay } from '../public/js/api.js';
import { resetMockData } from '../public/js/mockData.js';
import { formatDate, formatPrice } from '../public/js/ui.js';

afterEach(() => resetMockData());

test('formats whole-cent prices as NGN and omits unnecessary decimal zeros', () => {
  assert.equal(formatPrice(250000), '₦2,500');
  assert.equal(formatPrice(250050), '₦2,500.5');
});

test('formats event dates in the boss example timezone and style', () => {
  assert.equal(formatDate('2026-12-05T17:00:00Z'), '5 Dec 2026, 18:00');
});

test('mock event listing searches, filters by city and maximum price, and sorts', async () => {
  const { events } = await listEvents({
    q: 'jazz',
    city: 'abuja',
    maxPriceCents: 800000,
    sort: 'price',
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'abuja-jazz-night');
  assert.equal(events[0].tiers[0].priceCents, 800000);
});

test('mock event list matches the five Build 6 sample events', async () => {
  const { events } = await listEvents();

  assert.deepEqual(events.map((event) => event.title), [
    'Lagos Tech Meetup',
    'Abuja Jazz Night',
    'Ibadan Food Fair',
    'Enugu Comedy Night',
    'Sold Out Live Concert',
  ]);
  assert.deepEqual(events.map((event) => event.tiers.reduce((sum, tier) => sum + tier.remaining, 0)), [
    60, 67, 380, 4, 0,
  ]);
  assert.equal(events[3].city, 'Enugu');
  assert.equal(events[3].venue, 'Michael Okpara Square');
});

test('mock booking rejects quantities above ten and does not reserve seats', async () => {
  await assert.rejects(
    createBooking({ eventId: 'lagos-tech-meetup', tierId: 'lagos-general', quantity: 11 }),
    (error) => error.error.code === 'VALIDATION',
  );
  const { events } = await listEvents({ city: 'Lagos' });
  assert.equal(events[0].tiers[0].remaining, 60);
});

test('sold-out tiers reject bookings without changing inventory', async () => {
  await assert.rejects(
    createBooking({ eventId: 'lagos-tech-meetup', tierId: 'lagos-vip', quantity: 1 }),
    (error) => error.error.code === 'SOLD_OUT',
  );
  const { events } = await listEvents({ city: 'Lagos' });
  assert.equal(events[0].tiers[1].remaining, 0);
});

test('declined payment leaves a booking pending and successful retry confirms it', async () => {
  const booking = await createBooking({
    eventId: 'lagos-tech-meetup',
    tierId: 'lagos-general',
    quantity: 2,
  });

  await assert.rejects(pay(booking.reference, { decline: true }), (error) => (
    error.error.code === 'PAYMENT_DECLINED' && error.status === 402
  ));
  const paidBooking = await pay(booking.reference);
  assert.equal(paidBooking.status, 'paid');
  assert.equal(paidBooking.totalCents, 1000000);
});
