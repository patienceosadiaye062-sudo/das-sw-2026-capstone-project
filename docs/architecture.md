# Build 3 Architecture and Booking States

## Layers

```mermaid
flowchart TD
  Client[Browser or API client] --> HTTP[HTTP: router, routes, server]
  HTTP --> Services[Services]
  Services --> Domain[Domain rules]
  Services --> Repositories[Repositories]
  Repositories --> Storage[In-memory store now; SQLite in Build 5]
```

- **HTTP** translates requests and responses; it may call services and must not contain business rules or access storage directly.
- **Services** coordinate use cases; they may call domain rules and repositories, but must not depend on HTTP request/response details.
- **Domain** contains plain business rules and state transitions; it must not perform I/O or depend on HTTP, services, or repositories.
- **Repositories** read and write data; they must not decide business policy or call services/routes.

Arrows show allowed dependencies only; no layer calls upward.

## Data model

```mermaid
erDiagram
  USER ||--o{ EVENT : organizes
  EVENT ||--o{ TICKET_TIER : offers
  USER ||--o{ BOOKING : makes
  TICKET_TIER ||--o{ BOOKING : reserves

  USER {
    string id
    string role
  }
  EVENT {
    string id
    string organizerId
    string title
    string city
    string venue
    datetime date
    string status
  }
  TICKET_TIER {
    string id
    string eventId
    string name
    integer priceCents
    integer capacity
    integer sold
  }
  BOOKING {
    string id
    string userId
    string tierId
    integer quantity
    integer totalCents
    string status
  }
```

## Booking life cycle

```mermaid
stateDiagram-v2
  [*] --> pending
  pending --> paid
  pending --> cancelled
  paid --> checked_in
  paid --> refunded
  paid --> cancelled
  cancelled --> [*]
  refunded --> [*]
  checked_in --> [*]
```

`cancelled`, `refunded`, and `checked_in` are final states. The domain state machine in `src/domain/bookingStateMachine.js` defines and validates these transitions.
