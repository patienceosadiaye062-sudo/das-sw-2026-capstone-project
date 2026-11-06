import { createDatabase } from '../db/connection.js';

function eventFromRow(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    organizerId: row.organizerId,
    title: row.title,
    city: row.city,
    venue: row.venue,
    date: row.date,
    status: row.status,
  };
}

function tierFromRow(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    eventId: row.eventId,
    name: row.name,
    priceCents: row.priceCents,
    capacity: row.capacity,
    remaining: row.capacity - row.sold,
    sold: row.sold,
  };
}

function bookingFromRow(row) {
  if (!row) return undefined;
  const booking = {
    id: row.id,
    reference: row.reference,
    eventId: row.eventId,
    tierId: row.tierId,
    userId: row.userId,
    quantity: row.quantity,
    totalCents: row.totalCents,
    status: row.status,
  };
  if (row.paymentReference !== null) booking.paymentReference = row.paymentReference;
  return booking;
}

export class SQLiteRepository {
  #database;

  constructor({ databasePath, database } = {}) {
    this.#database = database ?? createDatabase({ databasePath });
  }

  async findEventById(id) {
    return eventFromRow(this.#database.prepare(`
      SELECT id, organizer_id AS organizerId, title, city, venue,
        event_date AS date, status
      FROM events WHERE id = ?
    `).get(id));
  }

  async listEvents() {
    return this.#database.prepare(`
      SELECT id, organizer_id AS organizerId, title, city, venue,
        event_date AS date, status
      FROM events ORDER BY rowid
    `).all().map(eventFromRow);
  }

  async saveEvent(event) {
    this.#database.prepare(
      'INSERT OR IGNORE INTO users (id, role) VALUES (?, ?)',
    ).run(event.organizerId, 'organizer');
    this.#database.prepare(`
      INSERT INTO events (id, organizer_id, title, city, venue, event_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        organizer_id = excluded.organizer_id,
        title = excluded.title,
        city = excluded.city,
        venue = excluded.venue,
        event_date = excluded.event_date,
        status = excluded.status
    `).run(
      event.id,
      event.organizerId,
      event.title,
      event.city,
      event.venue,
      event.date,
      event.status,
    );
    return this.findEventById(event.id);
  }

  async findTierById(id) {
    return tierFromRow(this.#database.prepare(`
      SELECT id, event_id AS eventId, name, price_cents AS priceCents,
        capacity, sold
      FROM ticket_tiers WHERE id = ?
    `).get(id));
  }

  async findTierForEvent(eventId, tierId) {
    return tierFromRow(this.#database.prepare(`
      SELECT id, event_id AS eventId, name, price_cents AS priceCents,
        capacity, sold
      FROM ticket_tiers WHERE event_id = ? AND id = ?
    `).get(eventId, tierId));
  }

  async listTiersForEvent(eventId) {
    return this.#database.prepare(`
      SELECT id, event_id AS eventId, name, price_cents AS priceCents,
        capacity, sold
      FROM ticket_tiers WHERE event_id = ? ORDER BY rowid
    `).all(eventId).map(tierFromRow);
  }

  async saveTier(tier) {
    this.#database.prepare(`
      INSERT INTO ticket_tiers (id, event_id, name, price_cents, capacity, sold)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        event_id = excluded.event_id,
        name = excluded.name,
        price_cents = excluded.price_cents,
        capacity = excluded.capacity,
        sold = excluded.sold
    `).run(tier.id, tier.eventId, tier.name, tier.priceCents, tier.capacity, tier.sold);
    return this.findTierById(tier.id);
  }

  async findBookingByReference(reference) {
    return bookingFromRow(this.#database.prepare(`
      SELECT id, reference, event_id AS eventId, tier_id AS tierId,
        user_id AS userId, quantity, total_cents AS totalCents, status,
        payment_reference AS paymentReference
      FROM bookings WHERE reference = ?
    `).get(reference));
  }

  async saveBooking(booking) {
    this.#database.prepare(
      'INSERT OR IGNORE INTO users (id, role) VALUES (?, ?)',
    ).run(booking.userId, 'attendee');
    this.#database.prepare(`
      INSERT INTO bookings (
        id, reference, event_id, tier_id, user_id, quantity, total_cents,
        status, payment_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        reference = excluded.reference,
        event_id = excluded.event_id,
        tier_id = excluded.tier_id,
        user_id = excluded.user_id,
        quantity = excluded.quantity,
        total_cents = excluded.total_cents,
        status = excluded.status,
        payment_reference = excluded.payment_reference
    `).run(
      booking.id,
      booking.reference,
      booking.eventId,
      booking.tierId,
      booking.userId,
      booking.quantity,
      booking.totalCents,
      booking.status,
      booking.paymentReference ?? null,
    );
    return this.findBookingByReference(booking.reference);
  }

  async reserveAndSaveBooking(tierId, quantity, booking) {
    this.#database.exec('BEGIN IMMEDIATE');
    try {
      const reservation = this.#database.prepare(`
        UPDATE ticket_tiers
        SET sold = sold + ?
        WHERE id = ? AND sold + ? <= capacity
      `).run(quantity, tierId, quantity);
      if (Number(reservation.changes) !== 1) {
        this.#database.exec('ROLLBACK');
        return undefined;
      }

      this.#database.prepare(
        'INSERT OR IGNORE INTO users (id, role) VALUES (?, ?)',
      ).run(booking.userId, 'attendee');
      this.#database.prepare(`
        INSERT INTO bookings (
          id, reference, event_id, tier_id, user_id, quantity, total_cents,
          status, payment_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        booking.id,
        booking.reference,
        booking.eventId,
        booking.tierId,
        booking.userId,
        booking.quantity,
        booking.totalCents,
        booking.status,
        booking.paymentReference ?? null,
      );
      this.#database.exec('COMMIT');
      return { ...booking };
    } catch (error) {
      this.#database.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.#database.close();
  }
}