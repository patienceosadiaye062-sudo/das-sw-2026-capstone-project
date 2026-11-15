import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createApp } from './http/app.js';
import { getConfig } from './config.js';
import { SQLiteRepository } from './repositories/sqlite.js';

export function startServer({
  port = getConfig().port,
  host = '0.0.0.0',
  repository,
  tokenSecret = process.env.TOKEN_SECRET,
} = {}) {
  if (typeof tokenSecret !== 'string' || Buffer.byteLength(tokenSecret) < 32) {
    throw new Error('Set TOKEN_SECRET to a random value of at least 32 bytes before starting the server.');
  }
  const activeRepository = repository ?? new SQLiteRepository();
  const server = createApp({ repository: activeRepository, tokenSecret });
  server.once('close', () => activeRepository.close?.());
  server.listen(port, host, () => {
    console.log(`Ticketing server listening on http://${host}:${server.address().port}`);
  });
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  startServer();
}
