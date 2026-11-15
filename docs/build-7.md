# Build 7: Login, roles and a connected app

*Week 10 of the course. Starts from the finished state of Build 6.*

## Deliverables

- Signup and login with scrypt password hashes and expiring HS256 bearer tokens.
- Attendee, organizer, and staff roles enforced by protected API routes.
- Booking privacy and event ownership checks based on the authenticated account.
- A fetch-based website with login/signup, attendee tickets, and organizer pages.
- API and browser pages showing loading and error states.

## User stories

### S01: Sign up and log in

- A new account requires a valid email, password of at least eight characters,
  and one of the supported roles. The default role is attendee.
- Passwords are stored only as salted scrypt hashes and are never returned.
- Duplicate emails return `EMAIL_TAKEN`.
- Unknown email and wrong password both return `INVALID_CREDENTIALS`.
- Missing, edited, or expired bearer tokens return `UNAUTHENTICATED`.

### S13: See only my own bookings

- Attendees can list only their own bookings.
- A different attendee reading a booking receives `NOT_FOUND`.
- Only an organizer can create or change events, and an organizer can change
  only their own events.
- An attendee cannot create events; the server enforces all role rules.

### S02-S04: Organizer event screens

Organizers can create a draft event, add ticket tiers, and publish it from the
dashboard. API rules remain those documented in [Build 2](./build-2.md).

## Security and setup

Set `TOKEN_SECRET` to a private random value of at least 32 bytes before running
`npm start`. Do not commit the value. The frontend stores the signed token in
browser local storage and sends it as a bearer token. Mock payment accepts only
a decline flag; no card number is sent to the server.

## Definition of done

- Organizer signup, event creation, tier setup, and publishing work in the browser.
- Attendee signup, booking, and mock payment work in the browser.
- Tests cover signup/login, bad and expired tokens, wrong roles, and another
  attendee attempting to read a booking.
- `npm test` passes.
- The project Definition of Done in [user-stories.md](./user-stories.md) applies
  where available.

Note: `README.md` and `docs/user-stories.md` are not present in this workspace;
the Build 7 criteria supplied in the task are used here.