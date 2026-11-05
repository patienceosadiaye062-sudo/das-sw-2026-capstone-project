# Build 3: Architecture, state machine, server skeleton

*Week 6 of the course. Starts from the finished state of Build 2.*

## You deliver

- A layered design for HTTP routes, services, domain rules, and data access.
- The booking life cycle as an explicit state machine.
- A Node.js HTTP server with `/health` and safe static-file serving from `public/`.
- A method-and-path router with named `:params`.
- JSON error responses for unknown API routes and malformed request JSON.

## Architecture and state machine

See [architecture.md](./architecture.md) for the layer dependency diagram, data model, and booking state diagram.

## User stories

There are no new product stories in this Build. The booking state machine designed here supports S07, S09, and S10 in later Builds.

## Done when

- [x] Architecture, data model, and booking-state diagrams are in `docs/`.
- [x] Every allowed and disallowed booking state transition is tested; illegal transitions return `INVALID_TRANSITION`.
- [x] The server starts and a real HTTP `GET /health` request returns `{"status":"ok"}`.
- [x] Static paths cannot escape `public/`, and unknown API routes and invalid JSON return consistent JSON errors.

## Run

```sh
npm test
npm start
```

The server uses `PORT` when set and otherwise listens on port 3000.
