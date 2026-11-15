import { createBooking, getEvent, pay } from '../api.js';
import { getUser } from '../session.js';
import { el, formatDate, formatPrice } from '../ui.js';

const eventId = new URLSearchParams(location.search).get('id');
const content = document.querySelector('#event-content');
const pageMessage = document.querySelector('#page-message');
const HOLD_SECONDS = 10 * 60;
let bookingInProgress = false;
let bookingComplete = false;

function showMessage(message, type = 'error') {
  pageMessage.textContent = message;
  pageMessage.className = `notice ${type}`;
}

function getErrorMessage(error) {
  return error.error?.message ?? error.message ?? 'Something went wrong. Please try again.';
}

function renderTier(event, tier) {
  const soldOut = tier.remaining === 0;
  const user = getUser();
  if (!user || user.role !== 'attendee') {
    const signInLink = el('a', {
      className: 'button button-secondary',
      href: `/login.html?returnTo=${encodeURIComponent(`/event.html?id=${event.id}`)}`,
    }, user ? 'Attendee account required' : 'Log in to book');
    return el('article', { className: 'tier-card' }, [
      el('div', {}, [
        el('h3', {}, tier.name),
        el('p', { className: 'tier-price' }, formatPrice(tier.priceCents)),
        el('p', { className: 'muted' }, soldOut ? 'Sold out' : `${tier.remaining} available`),
      ]),
      signInLink,
    ]);
  }
  const quantityId = `quantity-${tier.id}`;
  const status = soldOut
    ? el('span', { className: 'status-pill sold-out' }, 'Sold out')
    : el('span', { className: 'status-pill available' }, `${tier.remaining} available`);
  const quantityLabel = el('label', { htmlFor: quantityId }, 'Tickets');
  const quantityPicker = el('input', {
    id: quantityId,
    name: 'quantity',
    type: 'number',
    min: 1,
    max: Math.min(10, tier.remaining),
    value: 1,
    disabled: soldOut,
    required: true,
  });
  const bookingButton = el('button', {
    className: 'button button-primary',
    type: 'submit',
    disabled: soldOut,
  }, soldOut ? 'Sold out' : 'Choose tickets');
  const form = el('form', { className: 'tier-card', 'data-tier-id': tier.id }, [
    el('div', { className: 'tier-heading' }, [
      el('div', {}, [
        el('h3', {}, tier.name),
        el('p', { className: 'tier-price' }, formatPrice(tier.priceCents)),
      ]),
      status,
    ]),
    el('div', { className: 'tier-booking' }, [quantityLabel, quantityPicker, bookingButton]),
  ]);

  form.addEventListener('submit', async (eventSubmit) => {
    eventSubmit.preventDefault();
    if (bookingInProgress || bookingComplete) return;
    showMessage('');
    const quantity = Number(quantityPicker.value);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 || quantity > tier.remaining) {
      showMessage(`Choose between 1 and ${Math.min(10, tier.remaining)} tickets.`);
      return;
    }
    bookingInProgress = true;
    for (const picker of content.querySelectorAll('.tier-card input, .tier-card button')) {
      picker.disabled = true;
    }
    try {
      const booking = await createBooking({
        eventId: event.id,
        tierId: tier.id,
        quantity,
      });
      bookingInProgress = false;
      bookingComplete = true;
      renderCheckout(event, tier, booking);
      showMessage('Your tickets are reserved. Complete your mock payment before the timer ends.', 'success');
    } catch (error) {
      bookingInProgress = false;
      for (const formElement of content.querySelectorAll('.tier-card')) {
        const formTier = event.tiers.find((item) => item.id === formElement.dataset.tierId);
        const input = formElement.querySelector('input');
        const button = formElement.querySelector('button');
        const unavailable = formTier.remaining === 0;
        input.disabled = unavailable;
        button.disabled = unavailable;
      }
      showMessage(getErrorMessage(error));
    }
  });
  return form;
}

function renderCheckout(event, tier, booking) {
  let secondsLeft = HOLD_SECONDS;
  const countdown = el('p', { className: 'countdown', role: 'timer', 'aria-live': 'off' });
  const paymentError = el('p', { className: 'payment-error', role: 'alert' });
  const paymentStatus = el('p', { className: 'payment-status', role: 'status', 'aria-live': 'polite' });
  const cardNumber = el('input', {
    id: 'mock-card',
    name: 'mock-card',
    type: 'text',
    inputMode: 'numeric',
    autocomplete: 'off',
    placeholder: '4242424242424242',
    required: true,
    pattern: '[0-9]{12,19}',
  });
  const payButton = el('button', { className: 'button button-primary', type: 'submit' }, `Pay ${formatPrice(booking.totalCents)}`);
  const paymentForm = el('form', { className: 'payment-form' }, [
    el('div', { className: 'checkout-total' }, [
      el('span', {}, `${booking.quantity} × ${tier.name}`),
      el('strong', {}, formatPrice(booking.totalCents)),
    ]),
    countdown,
    el('div', { className: 'field' }, [
      el('label', { htmlFor: 'mock-card' }, 'Mock card number'),
      cardNumber,
      el('small', { className: 'help-text' }, 'Use any 12–19 digit test number. End it in 0000 to simulate a decline. No card details are sent or stored.'),
    ]),
    paymentError,
    paymentStatus,
    payButton,
  ]);

  function updateCountdown() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    countdown.textContent = `Your seats are held for ${minutes}:${String(seconds).padStart(2, '0')}`;
    if (secondsLeft <= 0) {
      paymentError.textContent = 'Your ticket hold has expired. Please start a new booking.';
      cardNumber.disabled = true;
      payButton.disabled = true;
      window.clearInterval(timer);
      bookingInProgress = false;
      bookingComplete = false;
      getEvent(event.id).then((updatedEvent) => {
        renderEvent(updatedEvent);
        showMessage('Your ticket hold expired. Choose tickets again to start a new booking.');
      }).catch((error) => {
        showMessage(getErrorMessage(error));
      });
      return;
    }
    secondsLeft -= 1;
  }

  updateCountdown();
  const timer = window.setInterval(updateCountdown, 1000);
  paymentForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    paymentError.textContent = '';
    paymentStatus.textContent = '';
    const decline = cardNumber.value.endsWith('0000');
    payButton.disabled = true;
    try {
      await pay(booking.reference, { decline });
      window.clearInterval(timer);
      countdown.textContent = 'Payment complete. Your tickets are confirmed.';
      paymentStatus.textContent = `Booking ${booking.reference} is confirmed. See you there!`;
      paymentStatus.className = 'payment-status success';
      cardNumber.disabled = true;
      payButton.remove();
    } catch (error) {
      paymentError.textContent = getErrorMessage(error);
      payButton.disabled = false;
      cardNumber.focus();
    }
  });

  content.append(el('section', { className: 'checkout-panel', 'aria-labelledby': 'checkout-heading' }, [
    el('div', { className: 'checkout-title' }, [
      el('p', { className: 'eyebrow' }, 'Almost there'),
      el('h2', { id: 'checkout-heading' }, 'Checkout'),
      el('p', {}, `${event.title} · ${tier.name}`),
    ]),
    paymentForm,
  ]));
}

function renderEvent(event) {
  const tiers = event.tiers.map((tier) => renderTier(event, tier));
  content.replaceChildren(
    el('section', { className: 'event-hero' }, [
      el('p', { className: 'eyebrow' }, event.city),
      el('h1', {}, event.title),
      el('p', { className: 'event-meta' }, `${formatDate(event.date)} · ${event.venue}`),
      el('p', { className: 'event-description' }, `Join us at ${event.venue} for a memorable day in ${event.city}. Choose your ticket below to reserve your place.`),
    ]),
    el('section', { className: 'ticket-section', 'aria-labelledby': 'ticket-heading' }, [
      el('div', { className: 'section-heading' }, [
        el('div', {}, [
          el('p', { className: 'eyebrow' }, 'Choose your experience'),
          el('h2', { id: 'ticket-heading' }, 'Tickets'),
        ]),
      ]),
      el('div', { className: 'tier-list' }, tiers),
    ]),
  );
}

if (!eventId) {
  showMessage('No event was selected.');
} else {
  showMessage('Loading event details…', 'success');
  try {
    renderEvent(await getEvent(eventId));
    pageMessage.textContent = '';
  } catch (error) {
    showMessage(getErrorMessage(error));
  }
}
