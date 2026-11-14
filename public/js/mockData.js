const initialEvents = [
  {
    id: 'lagos-tech-meetup',
    title: 'Lagos Tech Meetup',
    city: 'Lagos',
    venue: 'Landmark Centre',
    date: '2026-12-05T17:00:00Z',
    status: 'published',
    tiers: [
      { id: 'lagos-general', name: 'General', priceCents: 500000, capacity: 100, remaining: 60, sold: 40 },
      { id: 'lagos-vip', name: 'VIP', priceCents: 800000, capacity: 25, remaining: 0, sold: 25 },
    ],
  },
  {
    id: 'abuja-jazz-night',
    title: 'Abuja Jazz Night',
    city: 'Abuja',
    venue: 'Transcorp Hilton',
    date: '2026-12-12T19:00:00Z',
    status: 'published',
    tiers: [
      { id: 'abuja-general', name: 'General', priceCents: 800000, capacity: 100, remaining: 67, sold: 33 },
    ],
  },
  {
    id: 'ibadan-food-fair',
    title: 'Ibadan Food Fair',
    city: 'Ibadan',
    venue: 'Cultural Centre Mokola',
    date: '2026-12-19T10:00:00Z',
    status: 'published',
    tiers: [
      { id: 'ibadan-entry', name: 'Entry', priceCents: 250000, capacity: 400, remaining: 380, sold: 20 },
    ],
  },
  {
    id: 'enugu-comedy-night',
    title: 'Enugu Comedy Night',
    city: 'Enugu',
    venue: 'Michael Okpara Square',
    date: '2026-12-26T18:30:00Z',
    status: 'published',
    tiers: [
      { id: 'lagos-comedy', name: 'General', priceCents: 1000000, capacity: 100, remaining: 4, sold: 96 },
    ],
  },
  {
    id: 'sold-out-live-concert',
    title: 'Sold Out Live Concert',
    city: 'Port Harcourt',
    venue: 'Hotel Presidential',
    date: '2027-01-09T20:00:00Z',
    status: 'published',
    tiers: [
      { id: 'ph-concert', name: 'General', priceCents: 1200000, capacity: 100, remaining: 0, sold: 100 },
    ],
  },
];

export const mockEvents = structuredClone(initialEvents);
export const mockBookings = [];

export function resetMockData() {
  mockEvents.splice(0, mockEvents.length, ...structuredClone(initialEvents));
  mockBookings.splice(0);
}
