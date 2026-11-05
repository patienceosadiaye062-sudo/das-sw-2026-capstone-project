import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOKING_STATES,
  assertTransition,
  canTransition,
} from '../src/domain/bookingStateMachine.js';

const allowedTransitions = [
  ['pending', 'paid'],
  ['pending', 'cancelled'],
  ['paid', 'checked_in'],
  ['paid', 'refunded'],
  ['paid', 'cancelled'],
];

test('allows every documented booking state transition', () => {
  for (const [from, to] of allowedTransitions) {
    assert.equal(canTransition(from, to), true, `${from} -> ${to}`);
    assert.doesNotThrow(() => assertTransition(from, to));
  }
});

test('rejects every undocumented transition with INVALID_TRANSITION', () => {
  const allowed = new Set(allowedTransitions.map(([from, to]) => `${from}:${to}`));
  for (const from of BOOKING_STATES) {
    for (const to of BOOKING_STATES) {
      if (allowed.has(`${from}:${to}`)) continue;

      assert.equal(canTransition(from, to), false, `${from} -> ${to}`);
      assert.throws(
        () => assertTransition(from, to),
        (error) => error.code === 'INVALID_TRANSITION',
      );
    }
  }
});

test('rejects unknown booking states', () => {
  for (const state of ['unknown', 'toString', '__proto__']) {
    assert.equal(canTransition(state, 'paid'), false);
    assert.throws(
      () => assertTransition(state, 'paid'),
      (error) => error.code === 'INVALID_TRANSITION',
    );
  }
});
