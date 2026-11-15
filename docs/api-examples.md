# API examples

Start the server with a private signing secret of at least 32 bytes:

```powershell
$env:TOKEN_SECRET = 'replace-with-a-random-secret-of-at-least-32-bytes'
npm start
```

The API listens at `http://localhost:3000`; its OpenAPI document is available at
`/openapi.json`. Passwords are stored as scrypt hashes. Never send or store card
details; payments use the mock gateway.

## Sign up and log in

Create an organizer account:

```sh
curl -s -X POST http://localhost:3000/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"organizer@example.test","password":"change-this-password","role":"organizer"}'
```

The response contains a safe `user` object and a signed `token`. Save the token
for protected requests:

```sh
TOKEN=paste-the-signed-token-here
```

Sign up an attendee the same way, using `"role":"attendee"`. Login returns a
fresh token:

```sh
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"organizer@example.test","password":"change-this-password"}'
```

All protected routes use `Authorization: Bearer $TOKEN`. The server enforces the
account role and event/booking ownership; a client-supplied user id is never
trusted.

## Create, tier, and publish an event

```sh
curl -s -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Lagos Tech Meetup","city":"Lagos","venue":"Landmark Centre","date":"2026-12-05T17:00:00Z"}'
```

Save the returned event `id`:

```sh
EVENT_ID=paste-the-id-here
```

Add a tier, then publish:

```sh
curl -s -X POST "http://localhost:3000/api/events/$EVENT_ID/tiers" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"General","priceCents":500000,"capacity":100}'

curl -s -X POST "http://localhost:3000/api/events/$EVENT_ID/publish" \
  -H "Authorization: Bearer $TOKEN"
```

An organizer can list only their own drafts and published events at
`GET /api/organizer/events`. Public search and event detail remain unauthenticated.

## Book and pay (attendee)

Sign in or sign up as an attendee and use that attendee's token:

```sh
curl -s -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" -H 'content-type: application/json' \
  -d "{\"eventId\":\"$EVENT_ID\",\"tierId\":\"$TIER_ID\",\"quantity\":2}"
```

Payment accepts only a mock decline flag, never card details:

```sh
curl -s -X POST "http://localhost:3000/api/bookings/$REFERENCE/pay" \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" -H 'content-type: application/json' \
  -d '{"decline":false}'
```

Use `{"decline":true}` to simulate a retryable declined payment. `GET
/api/bookings` returns only the signed-in attendee's bookings. Reading another
attendee's booking returns `404 NOT_FOUND`, so its existence is not disclosed.

## Health check

```sh
curl -s http://localhost:3000/health
```
