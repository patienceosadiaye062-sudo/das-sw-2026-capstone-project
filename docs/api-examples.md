# Build 4 API examples

Start the server with `npm start`; these examples use `http://localhost:3000`.
Until Build 7 adds login, send an `x-user-id` header with every write and with
private booking reads. Prices are whole cents.

## Use Hoppscotch

1. Start the API with `npm start`.
2. In the **Collections** panel, choose **Import** and import
   [`build-4.collection.json`](./hoppscotch/build-4.collection.json).
3. In the **Environments** panel, import
   [`local.environment.json`](./hoppscotch/local.environment.json), then select the
   **Local** environment.
4. Run the event requests in order: create, add tier, then publish. Copy each
   returned `id` into the matching `eventId` or `tierId` environment variable.
   Then search, create a booking, and copy its `reference` into
   `bookingReference` before reading, paying, or cancelling it.
5. To simulate a declined payment, run **Declined payment (retryable)**, then
   retry with **Pay booking**. Do not send card details; payment is mocked.

Requests use Hoppscotch environment variables like `<<baseUrl>>`. The API also
exposes an OpenAPI document at `/openapi.json` for OpenAPI-compatible clients.

## Create an event

```sh
curl -i -X POST http://localhost:3000/api/events \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1' \
  -d '{"title":"Lagos Tech Meetup","city":"Lagos","venue":"Civic Centre","date":"2026-12-05T17:00:00"}'
```

Save the returned event `id`.

## Add a ticket tier

```sh
curl -i -X POST http://localhost:3000/api/events/EVENT_ID/tiers \
  -H 'content-type: application/json' \
  -H 'x-user-id: organizer-1' \
  -d '{"name":"General","priceCents":2500,"capacity":100}'
```

Save the returned tier `id`.

## Publish the event

```sh
curl -i -X POST http://localhost:3000/api/events/EVENT_ID/publish \
  -H 'x-user-id: organizer-1'
```

## Search published events

```sh
curl -i 'http://localhost:3000/api/events?q=meetup&city=lagos&sort=date&maxPriceCents=5000&onlyAvailable=true'
```

## Book tickets

```sh
curl -i -X POST http://localhost:3000/api/bookings \
  -H 'content-type: application/json' \
  -H 'x-user-id: attendee-1' \
  -d '{"eventId":"EVENT_ID","tierId":"TIER_ID","quantity":2}'
```

Save the returned booking `reference`.

## Pay with the mock gateway

The gateway accepts a mock decline flag; it never receives card details.

```sh
curl -i -X POST http://localhost:3000/api/bookings/BOOKING_REFERENCE/pay \
  -H 'content-type: application/json' \
  -H 'x-user-id: attendee-1' \
  -d '{}'
```

To exercise a decline and retry, use `-d '{"decline":true}'`. A decline leaves
the booking pending.

## Read a booking

```sh
curl -i http://localhost:3000/api/bookings/BOOKING_REFERENCE \
  -H 'x-user-id: attendee-1'
```

## Cancel an unpaid booking

To try this flow, create a second booking and cancel it before paying:

```sh
curl -i -X POST http://localhost:3000/api/bookings/BOOKING_REFERENCE/cancel \
  -H 'x-user-id: attendee-1'
```

## Unpublish an event

```sh
curl -i -X POST http://localhost:3000/api/events/EVENT_ID/unpublish \
  -H 'x-user-id: organizer-1'
```

API errors use the shape `{"error":{"code":"...","message":"..."}}`.
