import { performance } from 'node:perf_hooks';

const BOOKINGS = 100_000;
const LOOKUPS = 500;

const bookings = Array.from({ length: BOOKINGS }, (_, index) => ({
  id: index,
  reference: `BOOK-${String(index).padStart(6, '0')}`,
}));
const bookingsByReference = new Map(
  bookings.map((booking) => [booking.reference, booking]),
);
const references = Array.from(
  { length: LOOKUPS },
  (_, index) => bookings[bookings.length - 1 - index].reference,
);

let resultCount = 0;
const arrayStart = performance.now();
for (const reference of references) {
  if (bookings.find((booking) => booking.reference === reference)) {
    resultCount += 1;
  }
}
const arrayDuration = performance.now() - arrayStart;

const mapStart = performance.now();
for (const reference of references) {
  if (bookingsByReference.get(reference)) {
    resultCount += 1;
  }
}
const mapDuration = performance.now() - mapStart;

console.log(`Bookings: ${BOOKINGS.toLocaleString()} | lookups: ${LOOKUPS.toLocaleString()}`);
console.log(`Array.find: ${arrayDuration.toFixed(2)} ms`);
console.log(`Map.get:    ${mapDuration.toFixed(2)} ms`);
console.log(`Map speedup: ${(arrayDuration / Math.max(mapDuration, 0.001)).toFixed(1)}x`);
console.log(`Results checked: ${resultCount}`);
