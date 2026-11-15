import { listMyBookings } from '../api.js';
import { clearSession, getUser } from '../session.js';
import { el, formatDate, formatPrice } from '../ui.js';

const message = document.querySelector('#tickets-message');
const ticketList = document.querySelector('#tickets');

function showMessage(text, type = 'error') {
  message.textContent = text;
  message.className = `notice ${type}`;
}

function signIn() {
  location.assign('/login.html?returnTo=%2Ftickets.html');
}

async function loadTickets() {
  const user = getUser();
  if (!user) {
    showMessage('Log in to see your tickets.');
    ticketList.replaceChildren(el('a', { className: 'button button-primary', href: '/login.html?returnTo=%2Ftickets.html' }, 'Log in'));
    return;
  }
  if (user.role !== 'attendee') {
    showMessage('This page is for attendee accounts.');
    return;
  }

  showMessage('Loading your tickets…', 'success');
  try {
    const { bookings } = await listMyBookings();
    message.textContent = '';
    ticketList.replaceChildren(...bookings.map((booking) => el('article', { className: 'ticket-card' }, [
      el('div', {}, [
        el('p', { className: 'eyebrow' }, booking.status),
        el('h2', {}, booking.eventTitle ?? 'Event'),
        el('p', { className: 'muted' }, `${booking.tierName ?? 'Ticket'} · ${booking.quantity} ticket(s)`),
        booking.eventDate ? el('p', { className: 'muted' }, formatDate(booking.eventDate)) : undefined,
      ]),
      el('div', {}, [
        el('strong', {}, formatPrice(booking.totalCents)),
        el('p', { className: 'muted' }, `Reference ${booking.reference}`),
      ]),
    ])));
    if (!bookings.length) {
      ticketList.append(el('p', { className: 'empty-state' }, 'You have no bookings yet.'));
    }
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      signIn();
      return;
    }
    showMessage(error.message);
  }
}

loadTickets();
