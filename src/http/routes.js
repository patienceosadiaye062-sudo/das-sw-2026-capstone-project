import { openApiDocument } from './openapi.js';
import { requireRole, requireUser } from './guards.js';

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

export function registerApiRoutes(router, {
  eventService,
  bookingService,
  tokenSecret,
}) {
  router.add('GET', '/openapi.json', () => ({ status: 200, body: openApiDocument }));

  router.add('POST', '/api/events', async ({ request, body }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'organizer');
    return {
      status: 201,
      body: await eventService.createEvent(user.sub, body),
    };
  });
  router.add('GET', '/api/organizer/events', async ({ request }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'organizer');
    return { status: 200, body: { events: await eventService.listOrganizerEvents(user.sub) } };
  });
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
    body: await eventService.getEvent(
      request.headers.authorization ? requireUser(request, tokenSecret).sub : undefined,
      params.id,
    ),
  }));
  router.add('POST', '/api/events/:id/tiers', async ({ request, params, body }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'organizer');
    return { status: 201, body: await eventService.addTier(user.sub, params.id, body) };
  });
  router.add('POST', '/api/events/:id/publish', async ({ request, params }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'organizer');
    return { status: 200, body: await eventService.publishEvent(user.sub, params.id) };
  });
  router.add('POST', '/api/events/:id/unpublish', async ({ request, params }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'organizer');
    return { status: 200, body: await eventService.unpublishEvent(user.sub, params.id) };
  });
  router.add('POST', '/api/bookings', async ({ request, body }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'attendee');
    return { status: 201, body: await bookingService.book(user.sub, body) };
  });
  router.add('GET', '/api/bookings', async ({ request }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'attendee');
    return { status: 200, body: { bookings: await bookingService.listBookings(user.sub) } };
  });
  router.add('GET', '/api/bookings/:reference', async ({ request, params }) => ({
    status: 200,
    body: await bookingService.getBooking(
      requireRole(requireUser(request, tokenSecret), 'attendee').sub,
      params.reference,
    ),
  }));
  router.add('POST', '/api/bookings/:reference/pay', async ({ request, params, body }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'attendee');
    return { status: 200, body: await bookingService.pay(user.sub, params.reference, body) };
  });
  router.add('POST', '/api/bookings/:reference/cancel', async ({ request, params }) => {
    const user = requireRole(requireUser(request, tokenSecret), 'attendee');
    return { status: 200, body: await bookingService.cancel(user.sub, params.reference) };
  });
  return router;
}
