import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../src/config.js';

test('defaults the server port to 3000', () => {
  assert.deepEqual(getConfig({}), { port: 3000 });
});

test('reads a valid port from the environment', () => {
  assert.deepEqual(getConfig({ PORT: '4321' }), { port: 4321 });
});

test('rejects invalid server ports', () => {
  for (const PORT of ['0', '-1', '65536', 'not-a-port']) {
    assert.throws(() => getConfig({ PORT }), /PORT must be a whole number/);
  }
});
