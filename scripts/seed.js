import { SQLiteRepository } from '../src/repositories/sqlite.js';
import { createEventService } from '../src/services/eventService.js';

const repository = new SQLiteRepository();

try {
  if ((await repository.listEvents()).length > 0) {
    console.log('The database already contains events; no seed data was added.');
  } else {
    const eventService = createEventService(repository);
    const seedEvents = [
      {
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        venue: 'Civic Centre',
        date: '2027-02-14T17:00:00Z',
        tier: { name: 'General', priceCents: 2500, capacity: 100 },
      },
      {
        title: 'Abuja Design Forum',
        city: 'Abuja',
        venue: 'Thought Pyramid Art Centre',
        date: '2027-03-08T10:00:00Z',
        tier: { name: 'Standard', priceCents: 4000, capacity: 75 },
      },
      {
        title: 'Port Harcourt Book Fair',
        city: 'Port Harcourt',
        venue: 'The Atrium',
        date: '2027-04-19T11:00:00Z',
        tier: { name: 'Entry', priceCents: 1500, capacity: 120 },
      },
    ];

    for (const [index, seedEvent] of seedEvents.entries()) {
      const { tier, ...eventInput } = seedEvent;
      const event = await eventService.createEvent(`seed-organizer-${index + 1}`, eventInput);
      await eventService.addTier(`seed-organizer-${index + 1}`, event.id, tier);
      await eventService.publishEvent(`seed-organizer-${index + 1}`, event.id);
    }
    console.log(`Seeded ${seedEvents.length} published events.`);
  }
} finally {
  repository.close();
}