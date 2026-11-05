import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, searchEvents } from '../src/domain/eventSearch.js';
import { mergeSort } from '../src/domain/sorting.js';

function makeSummary({
  id,
  title,
  city = 'Lagos',
  venue = 'Civic Centre',
  date = '2026-12-05T17:00:00',
  tiers = [],
}) {
  return { id, title, city, venue, date, tiers };
}

function assertCode(code, operation) {
  assert.throws(operation, (error) => error.code === code);
}

test('searches title and venue case-insensitively', () => {
  const events = [
    makeSummary({ id: '1', title: 'Lagos Tech Meetup' }),
    makeSummary({ id: '2', title: 'Abuja Jazz Night', venue: 'City Hall' }),
  ];

  assert.deepEqual(filterEvents(events, { q: 'JAZZ' }).map(({ id }) => id), ['2']);
  assert.deepEqual(filterEvents(events, { q: 'cItY hAlL' }).map(({ id }) => id), ['2']);
});

test('filters city case-insensitively', () => {
  const events = [
    makeSummary({ id: '1', title: 'Lagos Event', city: 'Lagos' }),
    makeSummary({ id: '2', title: 'Abuja Event', city: 'Abuja' }),
  ];

  assert.deepEqual(filterEvents(events, { city: 'lagos' }).map(({ id }) => id), ['1']);
});

test('filters by cheapest tier price and excludes events without tiers', () => {
  const events = [
    makeSummary({ id: '1', title: 'Affordable', tiers: [{ priceCents: 2000, remaining: 5 }] }),
    makeSummary({ id: '2', title: 'Expensive', tiers: [{ priceCents: 5000, remaining: 5 }] }),
    makeSummary({ id: '3', title: 'No tiers' }),
  ];

  assert.deepEqual(
    searchEvents(events, { maxPriceCents: 3000 }, 'price').map(({ id }) => id),
    ['1'],
  );
});

test('includes the complete day for a date-only upper bound and uses inclusive date bounds', () => {
  const events = [
    makeSummary({ id: '1', title: 'Evening event', date: '2026-12-05T17:00:00' }),
    makeSummary({ id: '2', title: 'Next day', date: '2026-12-06T09:00:00' }),
  ];

  assert.deepEqual(
    filterEvents(events, { from: '2026-12-05', to: '2026-12-05' }).map(({ id }) => id),
    ['1'],
  );
});

test('filters events with available tickets', () => {
  const events = [
    makeSummary({ id: '1', title: 'Few left', tiers: [{ priceCents: 1, remaining: 1 }] }),
    makeSummary({ id: '2', title: 'Sold out', tiers: [{ priceCents: 1, remaining: 0 }] }),
  ];

  assert.deepEqual(filterEvents(events, { onlyAvailable: true }).map(({ id }) => id), ['1']);
});

test('rejects invalid dates and fractional maximum prices', () => {
  const events = [makeSummary({ id: '1', title: 'Event' })];

  assertCode('VALIDATION', () => filterEvents(events, { from: 'not-a-date' }));
  assertCode('VALIDATION', () => filterEvents(events, { to: '' }));
  assertCode('VALIDATION', () => filterEvents(events, { maxPriceCents: 10.5 }));
});

test('filtering does not mutate the source array', () => {
  const events = [
    makeSummary({ id: '2', title: 'Zulu' }),
    makeSummary({ id: '1', title: 'Alpha' }),
  ];
  const original = events.slice();

  filterEvents(events, { city: 'lagos' });
  assert.deepEqual(events, original);
});

test('returns an empty result for an empty event list', () => {
  assert.deepEqual(filterEvents([], {}), []);
});
