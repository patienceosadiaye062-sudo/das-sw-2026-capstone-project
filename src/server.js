import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createApp } from './http/app.js';
import { getConfig } from './config.js';
import { SQLiteRepository } from './repositories/sqlite.js';

export function startServer({
  port = getConfig().port,
  host = '0.0.0.0',
  repository = new SQLiteRepository(),
} = {}) {
  const server = createApp({ repository });
  server.once('close', () => repository.close?.());
  server.listen(port, host, () => {
    console.log(`Ticketing server listening on http://${host}:${server.address().port}`);
  });
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  startServer();
}
