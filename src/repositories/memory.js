function copy(value) {
  return structuredClone(value);
}

export class MemoryRepository {
  #events = new Map();
  #tiers = new Map();
  #bookings = new Map();

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

  async saveBooking(booking) {
    this.#bookings.set(booking.reference, copy(booking));
    return copy(booking);
  }
}
