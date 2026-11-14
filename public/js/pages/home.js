import { listEvents } from '../api.js';
import { el, formatDate, formatPrice } from '../ui.js';

const filters = document.querySelector('#filters');
const eventList = document.querySelector('#events');
const resultsCount = document.querySelector('#results-count');
const citySelect = document.querySelector('#city');

function renderCard(event) {
  const available = event.tiers.reduce((sum, tier) => sum + tier.remaining, 0);
  const price = Math.min(...event.tiers.map((tier) => tier.priceCents));
  return el('article', { className: 'event-card' }, [
    el('div', { className: 'card-art', 'aria-hidden': 'true' }, [
      el('span', { className: 'card-art-label' }, event.city),
      el('span', { className: 'card-art-mark' }, 'G.'),
    ]),
    el('div', { className: 'card-content' }, [
      el('p', { className: 'card-date' }, formatDate(event.date)),
      el('h3', {}, event.title),
      el('p', { className: 'card-venue' }, `${event.venue} · ${event.city}`),
      el('div', { className: 'card-bottom' }, [
        el('p', { className: 'card-price' }, [
          el('span', { className: 'muted' }, 'From '),
          formatPrice(price),
        ]),
        el('p', { className: 'availability' }, available ? `${available} seats left` : 'Sold out'),
      ]),
      el('a', { className: 'button button-secondary', href: `/event.html?id=${encodeURIComponent(event.id)}` }, 'Explore event'),
    ]),
  ]);
}

function populateCities(events) {
  const selected = citySelect.value;
  const cities = [...new Set(events.map((event) => event.city))].sort();
  citySelect.replaceChildren(el('option', { value: '' }, 'All cities'));
  for (const city of cities) citySelect.append(el('option', { value: city }, city));
  citySelect.value = cities.includes(selected) ? selected : '';
}

async function updateEvents() {
  const data = new FormData(filters);
  const maximum = data.get('maxPrice');
  const maxPriceCents = maximum === '' ? undefined : Math.round(Number(maximum) * 100);
  try {
    const { events } = await listEvents({
      q: data.get('q'),
      city: data.get('city'),
      maxPriceCents,
      sort: data.get('sort'),
    });
    eventList.replaceChildren(...events.map(renderCard));
    resultsCount.textContent = `${events.length} event(s) found`;
    if (!events.length) {
      eventList.append(el('p', { className: 'empty-state' }, 'No events match those filters. Try broadening your search.'));
    }
  } catch (error) {
    resultsCount.textContent = error.error?.message ?? 'Events could not be loaded.';
    eventList.replaceChildren();
  }
}

const { events: allEvents } = await listEvents();
populateCities(allEvents);
filters.addEventListener('submit', (event) => {
  event.preventDefault();
  updateEvents();
});
updateEvents();
