import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_DATABASE_PATH = resolve(process.cwd(), 'data', 'ticketing.db');
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

export function createDatabase({
  databasePath = process.env.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
} = {}) {
  if (typeof databasePath !== 'string' || databasePath.trim() === '') {
    throw new TypeError('databasePath must be a non-empty string.');
  }

  const filename = databasePath === ':memory:' ? databasePath : resolve(databasePath);
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });

  const database = new DatabaseSync(filename);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  database.exec(schema);
  return database;
}