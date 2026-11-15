import {
  addTicketTier,
  createEvent,
  listOrganizerEvents,
  publishEvent,
  unpublishEvent,
} from '../api.js';
import { clearSession, getUser } from '../session.js';
import { el, formatDate, formatPrice } from '../ui.js';

const message = document.querySelector('#organizer-message');
const eventForm = document.querySelector('#event-form');
const eventList = document.querySelector('#organizer-events');

function showMessage(text, type = 'error') {
  message.textContent = text;
  message.className = `notice ${type}`;
}

function signIn() {
  location.assign('/login.html?returnTo=%2Forganizer.html');
}

function renderEvent(event) {
  const card = el('article', { className: 'ticket-card organizer-card' }, [
    el('div', {}, [
      el('p', { className: 'eyebrow' }, event.status),
      el('h3', {}, event.title),
      el('p', { className: 'muted' }, `${event.city} · ${event.venue} · ${formatDate(event.date)}`),
      el('ul', { className: 'tier-summary' }, event.tiers.map((tier) => (
        el('li', {}, `${tier.name} · ${formatPrice(tier.priceCents)} · ${tier.remaining}/${tier.capacity} left`)
      ))),
    ]),
  ]);
  if (event.status === 'draft') {
    const tierForm = el('form', { className: 'inline-form' }, [
      el('label', { className: 'field' }, [
        'Tier name',
        el('input', { name: 'name', required: true }),
      ]),
      el('label', { className: 'field' }, [
        'Price (NGN)',
        el('input', { name: 'price', type: 'number', min: 0, step: '0.01', required: true }),
      ]),
      el('label', { className: 'field' }, [
        'Capacity',
        el('input', { name: 'capacity', type: 'number', min: 1, step: 1, required: true }),
      ]),
      el('button', { className: 'button button-secondary', type: 'submit' }, 'Add tier'),
    ]);
    tierForm.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      const button = tierForm.querySelector('button');
      button.disabled = true;
      try {
        const values = new FormData(tierForm);
        await addTicketTier(event.id, {
          name: values.get('name'),
          priceCents: Math.round(Number(values.get('price')) * 100),
          capacity: Number(values.get('capacity')),
        });
        await loadEvents();
        showMessage('Ticket tier added.', 'success');
      } catch (error) {
        showMessage(error.message);
      } finally {
        button.disabled = false;
      }
    });
    const publishButton = el('button', {
      className: 'button button-primary',
      type: 'button',
      disabled: event.tiers.length === 0,
    }, event.tiers.length ? 'Publish event' : 'Add a tier to publish');
    publishButton.addEventListener('click', async () => {
      publishButton.disabled = true;
      try {
        await publishEvent(event.id);
        await loadEvents();
        showMessage('Event published.', 'success');
      } catch (error) {
        showMessage(error.message);
        publishButton.disabled = false;
      }
    });
    card.append(tierForm, publishButton);
  } else {
    const unpublishButton = el('button', {
      className: 'button button-secondary',
      type: 'button',
    }, 'Unpublish event');
    unpublishButton.addEventListener('click', async () => {
      unpublishButton.disabled = true;
      try {
        await unpublishEvent(event.id);
        await loadEvents();
        showMessage('Event unpublished.', 'success');
      } catch (error) {
        showMessage(error.message);
        unpublishButton.disabled = false;
      }
    });
    card.append(unpublishButton);
  }
  return card;
}

async function loadEvents() {
  const { events } = await listOrganizerEvents();
  eventList.replaceChildren(...events.map(renderEvent));
  if (!events.length) {
    eventList.append(el('p', { className: 'empty-state' }, 'You have not created any events yet.'));
  }
}

eventForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = eventForm.querySelector('button');
  button.disabled = true;
  showMessage('Creating your event…', 'success');
  try {
    const values = new FormData(eventForm);
    await createEvent({
      title: values.get('title'),
      city: values.get('city'),
      venue: values.get('venue'),
      date: new Date(values.get('date')).toISOString(),
    });
    eventForm.reset();
    await loadEvents();
    showMessage('Draft event created.', 'success');
  } catch (error) {
    showMessage(error.message);
  } finally {
    button.disabled = false;
  }
});

async function init() {
  const user = getUser();
  if (!user) {
    showMessage('Log in with an organizer account to manage your events.');
    eventForm.hidden = true;
    signIn();
    return;
  }
  if (user.role !== 'organizer') {
    showMessage('Only organizer accounts can use this dashboard.');
    eventForm.hidden = true;
    return;
  }

  showMessage('Loading your events…', 'success');
  try {
    await loadEvents();
    message.textContent = '';
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      signIn();
    } else {
      showMessage(error.message);
    }
  }
}

init();
