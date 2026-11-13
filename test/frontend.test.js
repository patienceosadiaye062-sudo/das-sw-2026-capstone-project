import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createBooking, listEvents, pay } from '../public/js/api.js';
import { resetMockData } from '../public/js/mockData.js';

afterEach(() => resetMockData());

test('mock event listing searches, filters by city and maximum price, and sorts', async () => {
  const { events } = await listEvents({
    q: 'forum',
    city: 'abuja',
    maxPriceCents: 180000,
    sort: 'price',
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].id, 'abuja-design-forum');
  assert.equal(events[0].tiers[0].priceCents, 400000);
});

test('mock booking rejects quantities above ten and does not reserve seats', async () => {
  await assert.rejects(
    createBooking({ eventId: 'lagos-tech-meetup', tierId: 'lagos-general', quantity: 11 }),
    (error) => error.error.code === 'VALIDATION',
  );
  const { events } = await listEvents({ city: 'Lagos' });
  assert.equal(events[0].tiers[0].remaining, 68);
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
  assert.equal(paidBooking.totalCents, 500000);
});
