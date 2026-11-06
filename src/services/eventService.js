import { filterEvents, sortEvents } from '../domain/eventSearch.js';
import { DomainError } from '../domain/errors.js';
import { newId } from '../domain/ids.js';

function fail(message, code = 'VALIDATION') {
  throw new DomainError(message, code);
}

function requireUserId(userId) {
  if (typeof userId !== 'string' || userId.trim() === '') {
    fail('The x-user-id header is required.', 'UNAUTHENTICATED');
  }
  return userId.trim();
}

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function validateDate(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    fail('Event date must be a valid ISO date.');
  }

  const dateOnly = value.slice(0, 10);
  if (new Date(`${dateOnly}T00:00:00.000Z`).toISOString().slice(0, 10) !== dateOnly) {
    fail('Event date must be a valid ISO date.');
  }
}

function eventView(event, tiers) {
  return {
    id: event.id,
    title: event.title,
    city: event.city,
    venue: event.venue,
    date: event.date,
    status: event.status,
    tiers,
  };
}

export function createEventService(repository) {
  if (!repository) throw new TypeError('An event repository is required.');

  async function getEventOrFail(id) {
    const eventId = requireText(id, 'Event id');
    const event = await repository.findEventById(eventId);
    if (!event) fail(`Event "${eventId}" was not found.`, 'NOT_FOUND');
    return event;
  }

  function requireOrganizer(event, userId) {
    if (event.organizerId !== userId) {
      fail('Only the event organizer can make this change.', 'FORBIDDEN');
    }
  }

  return {
    async createEvent(userId, input) {
      const organizerId = requireUserId(userId);
      requireObject(input, 'Event input');
      const event = {
        id: newId(),
        organizerId,
        title: requireText(input.title, 'Event title'),
        city: requireText(input.city, 'Event city'),
        venue: requireText(input.venue, 'Event venue'),
        date: input.date,
        status: 'draft',
      };
      validateDate(event.date);
      await repository.saveEvent(event);
      return eventView(event, []);
    },

    async addTier(userId, eventId, input) {
      const organizerId = requireUserId(userId);
      const event = await getEventOrFail(eventId);
      requireOrganizer(event, organizerId);
      requireObject(input, 'Tier input');
      const name = requireText(input.name, 'Tier name');
      if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0) {
        fail('Price must be a non-negative whole number of cents.');
      }
      if (!Number.isSafeInteger(input.capacity) || input.capacity <= 0) {
        fail('Capacity must be a positive whole number.');
      }

      const tier = {
        id: newId(),
        eventId: event.id,
        name,
        priceCents: input.priceCents,
        capacity: input.capacity,
        remaining: input.capacity,
        sold: 0,
      };
      await repository.saveTier(tier);
      return tier;
    },

    async publishEvent(userId, eventId) {
      const organizerId = requireUserId(userId);
      const event = await getEventOrFail(eventId);
      requireOrganizer(event, organizerId);
      if ((await repository.listTiersForEvent(event.id)).length === 0) {
        fail('An event must have at least one ticket tier before it can be published.', 'INVALID_STATE');
      }
      event.status = 'published';
      await repository.saveEvent(event);
      return eventView(event, await repository.listTiersForEvent(event.id));
    },

    async unpublishEvent(userId, eventId) {
      const organizerId = requireUserId(userId);
      const event = await getEventOrFail(eventId);
      requireOrganizer(event, organizerId);
      event.status = 'draft';
      await repository.saveEvent(event);
      return eventView(event, await repository.listTiersForEvent(event.id));
    },

    async searchPublishedEvents(criteria, sortBy = 'date') {
      const events = (await repository.listEvents()).filter((event) => event.status === 'published');
      const summaries = await Promise.all(events.map(async (event) => (
        eventView(event, await repository.listTiersForEvent(event.id))
      )));
      return sortEvents(filterEvents(summaries, criteria), sortBy);
    },

    async getEvent(userId, eventId) {
      const event = await getEventOrFail(eventId);
      if (event.status !== 'published') {
        requireOrganizer(event, requireUserId(userId));
      }
      return eventView(event, await repository.listTiersForEvent(event.id));
    },
  };
}
