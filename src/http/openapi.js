export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Event Ticketing API',
    version: '1.0.0',
    description: 'Build 4 event ticketing API. Mock payment does not use card details.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      userId: { type: 'apiKey', in: 'header', name: 'x-user-id' },
    },
    schemas: {
      EventInput: {
        type: 'object',
        required: ['title', 'city', 'venue', 'date'],
        properties: {
          title: { type: 'string', example: 'Lagos Tech Meetup' },
          city: { type: 'string', example: 'Lagos' },
          venue: { type: 'string', example: 'Civic Centre' },
          date: { type: 'string', format: 'date-time', example: '2026-12-05T17:00:00Z' },
        },
      },
      TierInput: {
        type: 'object',
        required: ['name', 'priceCents', 'capacity'],
        properties: {
          name: { type: 'string', example: 'General' },
          priceCents: { type: 'integer', minimum: 0, example: 2500 },
          capacity: { type: 'integer', minimum: 1, example: 100 },
        },
      },
      BookingInput: {
        type: 'object',
        required: ['eventId', 'tierId', 'quantity'],
        properties: {
          eventId: { type: 'string' },
          tierId: { type: 'string' },
          quantity: { type: 'integer', minimum: 1, maximum: 10, example: 2 },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/events': {
      get: {
        summary: 'Search published events',
        parameters: [
          { in: 'query', name: 'q', schema: { type: 'string' } },
          { in: 'query', name: 'city', schema: { type: 'string' } },
          { in: 'query', name: 'from', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'to', schema: { type: 'string', format: 'date' } },
          { in: 'query', name: 'maxPriceCents', schema: { type: 'integer', minimum: 0 } },
          { in: 'query', name: 'onlyAvailable', schema: { type: 'boolean' } },
          {
            in: 'query',
            name: 'sort',
            schema: { type: 'string', enum: ['date', 'price', 'availability'], default: 'date' },
          },
        ],
        responses: {
          200: {
            description: 'Matching published events',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
      post: {
        summary: 'Create an event',
        security: [{ userId: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EventInput' } } },
        },
        responses: {
          201: { description: 'Event created' },
          400: {
            description: 'Invalid event',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/api/events/{id}': {
      get: {
        summary: 'Get an event',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Event details' } },
      },
    },
    '/api/events/{id}/tiers': {
      post: {
        summary: 'Add a ticket tier',
        security: [{ userId: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TierInput' } } },
        },
        responses: { 201: { description: 'Ticket tier created' } },
      },
    },
    '/api/events/{id}/publish': {
      post: {
        summary: 'Publish an event',
        security: [{ userId: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Event published' } },
      },
    },
    '/api/events/{id}/unpublish': {
      post: {
        summary: 'Unpublish an event',
        security: [{ userId: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Event unpublished' } },
      },
    },
    '/api/bookings': {
      post: {
        summary: 'Book tickets',
        security: [{ userId: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingInput' } } },
        },
        responses: { 201: { description: 'Booking created' } },
      },
    },
    '/api/bookings/{reference}': {
      get: {
        summary: 'Get a booking',
        security: [{ userId: [] }],
        parameters: [{ in: 'path', name: 'reference', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Booking details' } },
      },
    },
    '/api/bookings/{reference}/pay': {
      post: {
        summary: 'Pay for a booking with the mock gateway',
        security: [{ userId: [] }],
        parameters: [{ in: 'path', name: 'reference', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { decline: { type: 'boolean', default: false } },
                description: 'Set decline to true to simulate a declined payment; do not send card details.',
              },
            },
          },
        },
        responses: {
          200: { description: 'Payment succeeded' },
          402: { description: 'Mock payment declined' },
        },
      },
    },
    '/api/bookings/{reference}/cancel': {
      post: {
        summary: 'Cancel an unpaid booking',
        security: [{ userId: [] }],
        parameters: [{ in: 'path', name: 'reference', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Booking cancelled' } },
      },
    },
  },
};
