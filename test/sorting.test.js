import test from 'node:test';
import assert from 'node:assert/strict';
import { sortEvents } from '../src/domain/eventSearch.js';
import { mergeSort } from '../src/domain/sorting.js';

function makeSummary({ id, title, date = '2026-12-05T17:00:00', tiers = [] }) {
  return { id, title, date, tiers };
}

function assertCode(code, operation) {
  assert.throws(operation, (error) => error.code === code);
}

test('sorts events by date and breaks same-day ties by title, then id', () => {
  const events = [
    makeSummary({ id: '3', title: 'Earlier date', date: '2026-12-04T20:00:00' }),
    makeSummary({ id: '2', title: 'Zulu', date: '2026-12-05T09:00:00' }),
    makeSummary({ id: '1', title: 'Alpha', date: '2026-12-05T20:00:00' }),
  ];

  assert.deepEqual(sortEvents(events, 'date').map(({ title }) => title), [
    'Earlier date',
    'Alpha',
    'Zulu',
  ]);
});

test('sorts events by cheapest price with unpriced events last', () => {
  const events = [
    makeSummary({ id: '1', title: 'Unpriced' }),
    makeSummary({ id: '3', title: 'More expensive', tiers: [{ priceCents: 900, remaining: 1 }] }),
    makeSummary({ id: '2', title: 'Cheaper', tiers: [{ priceCents: 500, remaining: 1 }] }),
  ];

  assert.deepEqual(sortEvents(events, 'price').map(({ id }) => id), ['2', '3', '1']);
});

test('sorts events by remaining availability', () => {
  const events = [
    makeSummary({ id: '1', title: 'Few left', tiers: [{ priceCents: 1, remaining: 1 }] }),
    makeSummary({ id: '2', title: 'Many left', tiers: [{ priceCents: 1, remaining: 4 }] }),
    makeSummary({ id: '3', title: 'Sold out', tiers: [{ priceCents: 1, remaining: 0 }] }),
  ];

  assert.deepEqual(sortEvents(events, 'availability').map(({ id }) => id), ['2', '1', '3']);
});

test('rejects an unknown sort option', () => {
  assertCode('VALIDATION', () => sortEvents([], 'popularity'));
});

test('sorting does not mutate the source array', () => {
  const events = [
    makeSummary({ id: '2', title: 'Zulu' }),
    makeSummary({ id: '1', title: 'Alpha' }),
  ];
  const original = events.slice();

  sortEvents(events, 'date');
  assert.deepEqual(events, original);
});

test('merge sort is stable and returns a new array', () => {
  const events = [
    { key: 1, order: 'first' },
    { key: 1, order: 'second' },
    { key: 0, order: 'third' },
  ];
  const result = mergeSort(events, (left, right) => left.key - right.key);

  assert.notEqual(result, events);
  assert.deepEqual(result.map(({ order }) => order), ['third', 'first', 'second']);
  assert.deepEqual(events.map(({ order }) => order), ['first', 'second', 'third']);
});

test('sorts an empty event list', () => {
  assert.deepEqual(sortEvents([], 'date'), []);
});
