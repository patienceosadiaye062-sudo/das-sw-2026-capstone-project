import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

const SORT_OPTIONS = new Set(['date', 'price', 'availability']);
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

function fail(message) {
  throw new DomainError(message, 'VALIDATION');
}

function validateDate(value, label) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value) || !Number.isFinite(Date.parse(value))) {
    fail(`${label} must be a valid ISO date.`);
  }

  const dateOnly = value.slice(0, 10);
  const parsedDate = new Date(`${dateOnly}T00:00:00.000Z`);
  if (parsedDate.toISOString().slice(0, 10) !== dateOnly) {
    fail(`${label} must be a valid ISO date.`);
  }

  if (value.length > 10 && !Number.isFinite(Date.parse(value))) {
    fail(`${label} must be a valid ISO date.`);
  }
  return value;
}

function eventDateTime(value) {
  const validDate = validateDate(value, 'Event date');
  if (!validDate) fail('Event date must be a valid ISO date.');
  return Date.parse(validDate);
}

function getCheapestPrice(event) {
  if (!Array.isArray(event.tiers) || event.tiers.length === 0) return undefined;
  return Math.min(...event.tiers.map((tier) => tier.priceCents));
}

function getAvailability(event) {
  if (!Array.isArray(event.tiers)) return 0;
  return event.tiers.reduce((total, tier) => total + (tier.remaining ?? 0), 0);
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    sensitivity: 'base',
  });
}

function compareByTitleAndId(left, right) {
  return compareText(left.title, right.title) || compareText(left.id, right.id);
}

export function filterEvents(summaries, criteria = {}) {
  if (!Array.isArray(summaries)) fail('Event summaries must be an array.');
  if (criteria === null || typeof criteria !== 'object' || Array.isArray(criteria)) {
    fail('Search criteria must be an object.');
  }

  const { q, city, from, to, maxPriceCents, onlyAvailable } = criteria;
  const start = validateDate(from, 'From date');
  const end = validateDate(to, 'To date');
  if (start && end && Date.parse(start) > Date.parse(end.slice(0, 10) + (end.length === 10 ? 'T23:59:59.999Z' : ''))) {
    fail('From date must not be after the to date.');
  }
  if (
    maxPriceCents !== undefined &&
    (!Number.isSafeInteger(maxPriceCents) || maxPriceCents < 0)
  ) {
    fail('Maximum price must be a non-negative whole number of cents.');
  }
  if (onlyAvailable !== undefined && typeof onlyAvailable !== 'boolean') {
    fail('onlyAvailable must be a boolean.');
  }
  if (q !== undefined && typeof q !== 'string') fail('Search text must be a string.');
  if (city !== undefined && typeof city !== 'string') fail('City must be a string.');

  const startTime = start ? Date.parse(start) : undefined;
  const endTime = end
    ? Date.parse(end.length === 10 ? `${end}T23:59:59.999Z` : end)
    : undefined;

  return summaries.filter((event) => {
    if (q) {
      const query = q.toLocaleLowerCase();
      if (
        !String(event.title ?? '').toLocaleLowerCase().includes(query) &&
        !String(event.venue ?? '').toLocaleLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (city && String(event.city ?? '').toLocaleLowerCase() !== city.toLocaleLowerCase()) {
      return false;
    }

    if (startTime !== undefined || endTime !== undefined) {
      const timestamp = eventDateTime(event.date);
      if (!Number.isFinite(timestamp)) return false;
      if (startTime !== undefined && timestamp < startTime) return false;
      if (endTime !== undefined && timestamp > endTime) return false;
    }

    if (maxPriceCents !== undefined) {
      const cheapest = getCheapestPrice(event);
      if (cheapest === undefined || cheapest > maxPriceCents) return false;
    }
    if (onlyAvailable && getAvailability(event) <= 0) return false;
    return true;
  });
}

export function sortEvents(summaries, sortBy) {
  if (!Array.isArray(summaries)) fail('Event summaries must be an array.');
  if (!SORT_OPTIONS.has(sortBy)) {
    fail(`Unknown event sort option "${sortBy}".`);
  }

  const compare = (left, right) => {
    let result = 0;
    if (sortBy === 'date') {
      result = eventDateTime(left.date) - eventDateTime(right.date);
      if (result !== 0) {
        const leftDay = String(left.date).slice(0, 10);
        const rightDay = String(right.date).slice(0, 10);
        if (leftDay === rightDay) result = 0;
      }
    } else if (sortBy === 'price') {
      const leftPrice = getCheapestPrice(left);
      const rightPrice = getCheapestPrice(right);
      if (leftPrice === undefined && rightPrice !== undefined) return 1;
      if (leftPrice !== undefined && rightPrice === undefined) return -1;
      result = (leftPrice ?? 0) - (rightPrice ?? 0);
    } else {
      result = getAvailability(right) - getAvailability(left);
    }

    return result || compareByTitleAndId(left, right);
  };

  return mergeSort(summaries, compare);
}

export function searchEvents(summaries, criteria, sortBy) {
  return sortEvents(filterEvents(summaries, criteria), sortBy);
}
