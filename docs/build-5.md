# Build 5: SQLite and the overselling fix

**You deliver:** API data stored in SQLite, and the last-ticket problem reproduced and fixed.

**You practise:** SQL, constraints, parameterised queries, atomic operations, and concurrency.

## Done when

- `npm run oversell` shows 50 simultaneous attempts, exactly one successful booking, 49 `SOLD_OUT` results, and one seat sold.
- `node --test test/oversell.test.js` proves the race behavior and fails if atomic reservation is removed.
- `node --test test/sqlite.test.js` proves data remains after the database is closed and reopened.
- The API started with `npm start` stores data in `data/ticketing.db`; `DATABASE_PATH` can select another database file.

## S08: last-ticket concurrency

- **Given** exactly one seat remains, **when** 50 attendees book at the same time, **then** one booking succeeds, 49 receive `SOLD_OUT`, and sold seats do not exceed capacity.
- **Given** the atomic reservation is removed, **when** the oversell test runs, **then** the test fails.

The repository reserves capacity with one conditional `UPDATE` and inserts the booking in the same SQLite transaction. A JavaScript lock is process-local and cannot coordinate separate server processes; checking availability twice still leaves a race between the check and the write. `npm run oversell` first demonstrates the old read/check/write flow, then prints the fixed SQLite result.

## Commands

```bash
npm run seed
npm start
npm run oversell
npm test
```

The seed command adds three published events only when the database has no events. The oversell demo uses an in-memory SQLite database, so it does not alter the server's data. Delete `data/ticketing.db` to start the server database from scratch.

## Input notes

The workspace did not contain `README.md` or `docs/user-stories.md`, and this Build 5 file was empty. This implementation follows the Build 5 brief supplied in the task and the repository/service conventions already present in `src/`.
