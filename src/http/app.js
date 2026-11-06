import { createServer } from 'node:http';
import { realpath, readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError } from '../domain/errors.js';
import { createMockPaymentGateway } from '../lib/mockPaymentGateway.js';
import { MemoryRepository } from '../repositories/memory.js';
import { createBookingService } from '../services/bookingService.js';
import { createEventService } from '../services/eventService.js';
import { Router } from './router.js';
import { registerApiRoutes } from './routes.js';

const DEFAULT_PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));
const MAX_BODY_BYTES = 1024 * 1024;
const STATUS_BY_CODE = {
  VALIDATION: 400,
  INVALID_JSON: 400,
  BAD_PATH: 400,
  UNAUTHENTICATED: 401,
  PAYMENT_DECLINED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SOLD_OUT: 409,
  INVALID_STATE: 409,
  INVALID_TRANSITION: 409,
};
const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;

  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    }
    chunks.push(chunk);
  }

  if (length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must contain valid JSON.');
  }
}

function isWithinDirectory(root, target) {
  const pathFromRoot = relative(root, target);
  return pathFromRoot === '' || (
    pathFromRoot !== '..' &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  );
}

async function serveStatic(request, response, pathname, publicDir) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'BAD_PATH', 'Request path is invalid.');
  }
  if (decodedPath.includes('\0')) {
    throw new HttpError(400, 'BAD_PATH', 'Request path is invalid.');
  }

  const root = await realpath(publicDir);
  const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^[/\\]+/, '');
  const candidate = resolve(root, relativePath);
  if (!isWithinDirectory(root, candidate)) {
    throw new HttpError(404, 'NOT_FOUND', 'Resource not found.');
  }

  let filePath;
  try {
    filePath = await realpath(candidate);
    if (!isWithinDirectory(root, filePath) || !(await stat(filePath)).isFile()) {
      throw new HttpError(404, 'NOT_FOUND', 'Resource not found.');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new HttpError(404, 'NOT_FOUND', 'Resource not found.');
    }
    throw error;
  }

  const content = await readFile(filePath);
  const contentType = CONTENT_TYPES.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream';
  response.writeHead(200, {
    'content-length': content.length,
    'content-type': contentType,
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

export function createApp({
  publicDir = DEFAULT_PUBLIC_DIR,
  router = new Router(),
  repository = new MemoryRepository(),
  paymentGateway = createMockPaymentGateway(),
} = {}) {
  if (!(router instanceof Router)) {
    throw new TypeError('router must be a Router.');
  }

  if (!router.match('GET', '/health')) {
    router.add('GET', '/health', ({ response }) => {
      sendJson(response, 200, { status: 'ok' });
    });
  }
  registerApiRoutes(router, {
    eventService: createEventService(repository),
    bookingService: createBookingService(repository, paymentGateway),
  });

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const body = await readJsonBody(request);
      const match = router.match(request.method, url.pathname);
      if (match) {
        const result = await match.handler({
          request,
          response,
          params: match.params,
          body,
          url,
        });
        if (!response.writableEnded && result !== undefined) {
          if (result && Number.isInteger(result.status) && Object.hasOwn(result, 'body')) {
            sendJson(response, result.status, result.body);
          } else {
            sendJson(response, 200, result);
          }
        }
        return;
      }

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        sendJson(response, 404, {
          error: { code: 'NOT_FOUND', message: 'API route not found.' },
        });
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 404, {
          error: { code: 'NOT_FOUND', message: 'Resource not found.' },
        });
        return;
      }

      await serveStatic(request, response, url.pathname, publicDir);
    } catch (error) {
      if (response.headersSent) {
        response.destroy(error);
        return;
      }

      const status = error instanceof DomainError
        ? STATUS_BY_CODE[error.code] ?? 400
        : Number.isInteger(error.status) ? error.status : 500;
      const code = typeof error.code === 'string' ? error.code : 'INTERNAL_ERROR';
      const message = status === 500 ? 'Internal server error.' : error.message;
      if (status === 500) console.error(error);
      sendJson(response, status, { error: { code, message } });
    }
  });
}
