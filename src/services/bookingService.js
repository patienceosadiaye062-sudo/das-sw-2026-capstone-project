import { assertTransition } from '../domain/bookingStateMachine.js';
import { DomainError } from '../domain/errors.js';
import { newId, newReference } from '../domain/ids.js';

const MAX_QUANTITY = 10;

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

function requireBookingOwner(booking, userId) {
  if (booking.userId !== userId) {
    fail('This booking belongs to another user.', 'FORBIDDEN');
  }
}

function bookingOrFail(booking) {
  if (!booking) fail('Booking was not found.', 'NOT_FOUND');
  return booking;
}

export function createBookingService(repository, paymentGateway) {
  if (!repository) throw new TypeError('A booking repository is required.');
  if (!paymentGateway || typeof paymentGateway.charge !== 'function') {
    throw new TypeError('A payment gateway with a charge method is required.');
  }

  return {
    async book(userId, input) {
      const attendeeId = requireUserId(userId);
      requireObject(input, 'Booking input');
      if (typeof input.eventId !== 'string' || input.eventId.trim() === '') {
        fail('Event id must be a non-empty string.');
      }
      if (typeof input.tierId !== 'string' || input.tierId.trim() === '') {
        fail('Tier id must be a non-empty string.');
      }
      if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY) {
        fail(`Quantity must be an integer from 1 to ${MAX_QUANTITY}.`);
      }

      const event = await repository.findEventById(input.eventId);
      if (!event) fail(`Event "${input.eventId}" was not found.`, 'NOT_FOUND');
      if (event.status !== 'published') {
        fail('Tickets can only be booked for published events.', 'INVALID_STATE');
      }
      const tier = await repository.findTierForEvent(event.id, input.tierId);
      if (!tier) fail(`Ticket tier "${input.tierId}" was not found for this event.`, 'NOT_FOUND');
      if (tier.remaining < input.quantity) {
        fail(`Only ${tier.remaining} ticket(s) remain in "${tier.name}".`, 'SOLD_OUT');
      }

      const totalCents = tier.priceCents * input.quantity;
      if (!Number.isSafeInteger(totalCents)) {
        fail('Booking total must be a safe whole number of cents.');
      }

      let reference = newReference();
      while (await repository.findBookingByReference(reference)) {
        reference = newReference();
      }
      const booking = {
        id: newId(),
        reference,
        eventId: event.id,
        tierId: tier.id,
        userId: attendeeId,
        quantity: input.quantity,
        totalCents,
        status: 'pending',
      };

      tier.remaining -= input.quantity;
      tier.sold += input.quantity;
      await repository.saveTier(tier);
      await repository.saveBooking(booking);
      return booking;
    },

    async getBooking(userId, reference) {
      const attendeeId = requireUserId(userId);
      const booking = bookingOrFail(await repository.findBookingByReference(reference));
      requireBookingOwner(booking, attendeeId);
      return booking;
    },

    async pay(userId, reference, input = {}) {
      const attendeeId = requireUserId(userId);
      const booking = bookingOrFail(await repository.findBookingByReference(reference));
      requireBookingOwner(booking, attendeeId);
      assertTransition(booking.status, 'paid');
      if (input !== undefined) requireObject(input, 'Payment input');
      if (input?.decline !== undefined && typeof input.decline !== 'boolean') {
        fail('decline must be a boolean.');
      }

      const result = await paymentGateway.charge({ decline: input?.decline === true });
      if (result?.status === 'declined') {
        fail('The mock payment was declined.', 'PAYMENT_DECLINED');
      }
      if (result?.status !== 'succeeded') {
        throw new Error('The payment gateway returned an invalid result.');
      }

      booking.status = 'paid';
      if (result.reference) booking.paymentReference = result.reference;
      await repository.saveBooking(booking);
      return booking;
    },

    async cancel(userId, reference) {
      const attendeeId = requireUserId(userId);
      const booking = bookingOrFail(await repository.findBookingByReference(reference));
      requireBookingOwner(booking, attendeeId);
      assertTransition(booking.status, 'cancelled');

      const tier = await repository.findTierForEvent(booking.eventId, booking.tierId);
      if (!tier) throw new Error('The booking ticket tier is missing.');
      tier.remaining += booking.quantity;
      tier.sold -= booking.quantity;
      booking.status = 'cancelled';
      await repository.saveTier(tier);
      await repository.saveBooking(booking);
      return booking;
    },
  };
}
