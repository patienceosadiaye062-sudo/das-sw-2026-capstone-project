import { DomainError } from '../domain/errors.js';

function copy(value) {
  return structuredClone(value);
}

export class MemoryRepository {
  #events = new Map();
  #tiers = new Map();
  #bookings = new Map();
  #users = new Map();

  async findUserByEmail(email) {
    const user = [...this.#users.values()].find((item) => item.email === email);
    return user ? copy(user) : undefined;
  }

  async findUserById(id) {
    const user = this.#users.get(id);
    if (!user) return undefined;
    const { passwordHash, ...safeUser } = user;
    return copy(safeUser);
  }

  async saveUser(user) {
    if ([...this.#users.values()].some((item) => item.email === user.email)) {
      throw new DomainError('An account with this email already exists.', 'EMAIL_TAKEN');
    }
    this.#users.set(user.id, copy(user));
    return copy(user);
  }

  async findEventById(id) {
    const event = this.#events.get(id);
    return event ? copy(event) : undefined;
  }

  async listEvents() {
    return [...this.#events.values()].map(copy);
  }

  async saveEvent(event) {
    this.#events.set(event.id, copy(event));
    return copy(event);
  }

  async findTierById(id) {
    const tier = this.#tiers.get(id);
    return tier ? copy(tier) : undefined;
  }

  async findTierForEvent(eventId, tierId) {
    const tier = this.#tiers.get(tierId);
    return tier?.eventId === eventId ? copy(tier) : undefined;
  }

  async listTiersForEvent(eventId) {
    return [...this.#tiers.values()]
      .filter((tier) => tier.eventId === eventId)
      .map(copy);
  }

  async saveTier(tier) {
    this.#tiers.set(tier.id, copy(tier));
    return copy(tier);
  }

  async findBookingByReference(reference) {
    const booking = this.#bookings.get(reference);
    return booking ? copy(booking) : undefined;
  }

  async listBookingsForUser(userId) {
    return [...this.#bookings.values()].filter((booking) => booking.userId === userId).map(copy);
  }

  async saveBooking(booking) {
    this.#bookings.set(booking.reference, copy(booking));
    return copy(booking);
  }

  async reserveAndSaveBooking(tierId, quantity, booking) {
    const tier = this.#tiers.get(tierId);
    if (!tier || tier.remaining < quantity) return undefined;

    tier.remaining -= quantity;
    tier.sold += quantity;
    this.#bookings.set(booking.reference, copy(booking));
    return copy(booking);
  }
}
