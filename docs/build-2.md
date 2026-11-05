# Build 2 - Event Search, Sorting, Backlog, and First Tests

## Goal

Add event creation and publication rules, pure event search/filter/sort functions, and the project's first automated tests using Node's built-in test runner.

## Delivered

- Event creation validates title, city, venue, and date; new events are drafts.
- Ticket tiers validate whole-cent prices and positive capacity, and expose seats left and sold count.
- Events can be published when they have at least one tier and unpublished back to draft.
- Public event summaries exclude drafts by default.
- Event filtering supports case-insensitive title/venue search and city matching, inclusive date ranges, maximum cheapest-tier price, and availability.
- A stable, non-mutating merge sort orders events by date, price, or availability, with title and id tie-breakers.
- Ticket booking requires a published event, enforces quantity and availability, and stores pending booking prices as whole cents.
- `npm test` runs the built-in Node test suite without external packages.

## User Stories and Acceptance Criteria

### S02: Create an event

- **Given** an organizer, **when** they create an event with a title, city, venue, and valid date, **then** it is saved as a draft with a new id and is not included in the public event list.
- **Given** a missing title or city, or a date that is not real, **when** the organizer creates the event, **then** the request is rejected with `VALIDATION` and nothing is saved.

### S03: Add ticket tiers

- **Given** a draft event, **when** the organizer adds a tier named General for 500000 cents with capacity 100, **then** it has zero sold and 100 seats left.
- **Given** any event, **when** the price is not a whole number or capacity is less than one, **then** the request is rejected with `VALIDATION`.
- **Given** an event id that does not exist, **when** the organizer adds a tier, **then** the request is rejected with `NOT_FOUND`.

### S04: Publish and unpublish an event

- **Given** a draft event with at least one tier, **when** the organizer publishes it, **then** it becomes published and appears in the public event list.
- **Given** a published event, **when** the organizer unpublishes it, **then** it becomes a draft and is hidden from the public list without being deleted.
- **Given** a draft event without tiers, **when** the organizer publishes it, **then** the request is rejected with `INVALID_STATE`.
- **Given** an event id that does not exist, **when** the organizer publishes or unpublishes it, **then** the request is rejected with `NOT_FOUND`.

### S05: Search, filter, and sort events

- **Given** events titled Lagos Tech Meetup and Abuja Jazz Night, **when** an attendee searches for JAZZ, **then** only Abuja Jazz Night is returned; search also matches venue, ignoring case.
- **Given** events in Lagos and Abuja, **when** an attendee filters by city `lagos`, **then** only Lagos events are returned, regardless of capitalization.
- **Given** events with different ticket prices, **when** an attendee sets a maximum price and sorts by price, **then** events whose cheapest tier is within the maximum are returned cheapest first, and events without tiers are excluded from price filtering.
- **Given** events on different dates, **when** an attendee sorts by date, **then** earlier dates come first; same-day events are ordered by title, then id.
- **Given** an event at 5 PM on 5 December, **when** an attendee filters through `2026-12-05`, **then** that event is included.
- **Given** events with different remaining ticket counts, **when** an attendee sorts by availability, **then** the event with the most seats left comes first.
- **Given** a bad date, a price that is not a whole number, or an unknown sort option, **when** an attendee searches, **then** the request is rejected with `VALIDATION`.
- **Given** any event list, **when** it is filtered or sorted, **then** the original list is unchanged; sorting is stable and an empty list returns an empty list.

### S06: Book tickets

- **Given** a published event with 3 seats left in General, **when** an attendee books 2, **then** a pending booking is created for 2 seats, its price is stored in whole cents, and 1 seat is left.
- **Given** a draft event, **when** an attendee tries to book, **then** the request is rejected and inventory is unchanged.
- **Given** 1 seat left, **when** an attendee books 2, **then** the request is rejected with `SOLD_OUT` and nothing changes.
- **Given** any tier, **when** the quantity is 0, negative, fractional, or more than 10, **then** the request is rejected with `VALIDATION`.

### S16: Run tests

- **Given** the project, **when** someone runs `npm test`, **then** all tests run and the command fails if any test fails. Running tests automatically on every GitHub push is scheduled for Build 9.

## Done When

- [x] Search, filter and sort work and never change the original list.
- [x] Every user story being built has acceptance criteria.
- [x] `npm test` runs and passes (27 tests).
