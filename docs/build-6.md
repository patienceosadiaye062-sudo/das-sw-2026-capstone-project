# Build 6: Frontend on mock data

The browser app is served from `public/` by `npm start`. It uses plain HTML,
CSS and browser ES modules; its `api.js` adapter reads and updates fake data
without making network requests.

## What it includes

- Browse events with title/venue search, city and maximum-price filters, and
  date, price or availability sorting.
- Filters are applied when the Apply button is submitted.
- The mock event list starts with five sample events and shows availability in
  seats.
- Open an event, see its ticket tiers and remaining availability, and choose
  up to 10 tickets (never more than are left).
- See sold-out tiers marked and disabled.
- Reserve tickets, see a 10-minute countdown, and check out with a mock card.
  A test number ending in `0000` simulates a decline; retry with a different
  test number. Card numbers are not sent or stored.
- Prices are stored as whole cents and formatted as NGN in one UI function
  (`250000` displays as `₦2,500`).

## Acceptance checks

- Browse, filter, sort, book and pay in the browser.
- A sold-out tier is clearly marked and cannot be booked.
- A declined mock payment shows an error and can be retried.
- The checkout countdown shows the ticket-hold time.
- Controls have labels, navigation uses links, actions use buttons, and event
  data is rendered as text rather than HTML.

Run `npm test` for the mock API behavior checks.