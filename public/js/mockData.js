const initialEvents = [
  {
    id: 'lagos-tech-meetup',
    title: 'Lagos Tech Meetup',
    city: 'Lagos',
    venue: 'Civic Centre',
    date: '2026-12-05T17:00:00Z',
    status: 'published',
    tiers: [
      { id: 'lagos-general', name: 'General', priceCents: 250000, capacity: 100, remaining: 68, sold: 32 },
      { id: 'lagos-vip', name: 'VIP', priceCents: 500000, capacity: 25, remaining: 0, sold: 25 },
    ],
  },
  {
    id: 'abuja-design-forum',
    title: 'Abuja Design Forum',
    city: 'Abuja',
    venue: 'Thought Pyramid Art Centre',
    date: '2026-12-12T10:00:00Z',
    status: 'published',
    tiers: [
      { id: 'abuja-standard', name: 'Standard', priceCents: 400000, capacity: 75, remaining: 75, sold: 0 },
      { id: 'abuja-student', name: 'Student', priceCents: 180000, capacity: 30, remaining: 12, sold: 18 },
    ],
  },
  {
    id: 'port-harcourt-book-fair',
    title: 'Port Harcourt Book Fair',
    city: 'Port Harcourt',
    venue: 'The Atrium',
    date: '2027-01-19T11:00:00Z',
    status: 'published',
    tiers: [
      { id: 'ph-entry', name: 'Entry', priceCents: 150000, capacity: 120, remaining: 120, sold: 0 },
    ],
  },
];

export const mockEvents = structuredClone(initialEvents);
export const mockBookings = [];

export function resetMockData() {
  mockEvents.splice(0, mockEvents.length, ...structuredClone(initialEvents));
  mockBookings.splice(0);
}
