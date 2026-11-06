import { openApiDocument } from './openapi.js';

const userId = (request) => request.headers['x-user-id'];

function toNumber(value) {
  return value === undefined || value === '' ? undefined : Number(value);
}

function searchCriteria(query) {
  return {
    q: query.q,
    city: query.city,
    from: query.from,
    to: query.to,
    maxPriceCents: toNumber(query.maxPriceCents),
    onlyAvailable: query.onlyAvailable === undefined
      ? undefined
      : query.onlyAvailable === 'true' || query.onlyAvailable === '1'
        ? true
        : query.onlyAvailable === 'false' || query.onlyAvailable === '0'
          ? false
          : query.onlyAvailable,
  };
}

export function registerApiRoutes(router, { eventService, bookingService }) {
  router.add('GET', '/openapi.json', () => ({ status: 200, body: openApiDocument }));

  router.add('POST', '/api/events', async ({ request, body }) => ({
    status: 201,
    body: await eventService.createEvent(userId(request), body),
  }));
  router.add('GET', '/api/events', async ({ url }) => ({
    status: 200,
    body: {
      events: await eventService.searchPublishedEvents(
        searchCriteria(Object.fromEntries(url.searchParams)),
        url.searchParams.get('sort') || 'date',
      ),
    },
  }));
  router.add('GET', '/api/events/:id', async ({ request, params }) => ({
    status: 200,
    body: await eventService.getEvent(userId(request), params.id),
  }));
  router.add('POST', '/api/events/:id/tiers', async ({ request, params, body }) => ({
    status: 201,
    body: await eventService.addTier(userId(request), params.id, body),
  }));
  router.add('POST', '/api/events/:id/publish', async ({ request, params }) => ({
    status: 200,
    body: await eventService.publishEvent(userId(request), params.id),
  }));
  router.add('POST', '/api/events/:id/unpublish', async ({ request, params }) => ({
    status: 200,
    body: await eventService.unpublishEvent(userId(request), params.id),
  }));
  router.add('POST', '/api/bookings', async ({ request, body }) => ({
    status: 201,
    body: await bookingService.book(userId(request), body),
  }));
  router.add('GET', '/api/bookings/:reference', async ({ request, params }) => ({
    status: 200,
    body: await bookingService.getBooking(userId(request), params.reference),
  }));
  router.add('POST', '/api/bookings/:reference/pay', async ({ request, params, body }) => ({
    status: 200,
    body: await bookingService.pay(userId(request), params.reference, body),
  }));
  router.add('POST', '/api/bookings/:reference/cancel', async ({ request, params }) => ({
    status: 200,
    body: await bookingService.cancel(userId(request), params.reference),
  }));
  return router;
}
