# Build 4: Working REST API (in memory)

*Week 7 of the course. Starts from the finished state of Build 3.*

## Deliverables

- An end-to-end REST API for event and ticket-tier creation, publishing, event
  search, booking, mock payment, and cancellation of unpaid bookings.
- An asynchronous in-memory repository, with business operations coordinated
  by services and exposed through HTTP routes.
- Consistent JSON errors and API-level tests against the real HTTP server.
- `docs/api-examples.md` with `curl` examples for the API.
- An OpenAPI document at `/openapi.json` that can be imported into Hoppscotch.
- A Hoppscotch collection and local environment in `docs/hoppscotch/`.

## User stories

Stories S02 to S06 must work through the API using the acceptance criteria in
[Build 2](./build-2.md). The API also delivers S07.

### S07: Pay for a booking with mock payment

- **Given** a pending booking, **when** the attendee pays successfully, **then**
  it becomes paid and its booking reference is returned.
- **Given** a pending booking, **when** mock payment is declined, **then** the
  API returns `PAYMENT_DECLINED`, the booking remains pending, and payment can
  be retried.
- **Given** a cancelled booking, **when** someone tries to pay, **then** the
  API returns `INVALID_TRANSITION`.
- **Given** a paid booking, **when** someone pays again, **then** the request is
  rejected and the gateway is not charged again.

Until Build 7 adds login, requests identify users with the `x-user-id` header.
Only the user who created a booking can read, pay for, or cancel it. The mock
payment gateway never receives card numbers.

## Definition of done

- Every call in [API examples](./api-examples.md) works with `curl`.
- The OpenAPI document is available for importing and trying requests in Hoppscotch.
- The [Hoppscotch collection](./hoppscotch/build-4.collection.json) and
  [local environment](./hoppscotch/local.environment.json) cover the Build 4 API workflow.
- Errors use the same JSON shape.
- `npm test` includes API-level tests using the real server.
- The project Definition of Done in `user-stories.md` applies where available.

Note: `README.md` and `docs/user-stories.md` are not present in this workspace;
the Build 2 and Build 4 criteria supplied in the task are used here.