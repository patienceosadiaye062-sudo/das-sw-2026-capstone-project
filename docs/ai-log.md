## Build 1 — Domain core

### Prompt 1 — Read the project brief

- **Asked:** Read `README.md` and `docs/build-1.md` before writing anything.
- **What came back:** `README.md` was not present in the workspace, and `docs/build-1.md` was empty.
- **What was wrong or changed:** The requested brief files did not provide readable requirements, so the Build 1 description supplied in the task was used as the specification.

### Prompt 2 — Build the domain core

- **Asked:** Implement the Build 1 terminal domain core: validated events, tiers, bookings and cancellations; a linked-list FIFO waitlist; secure IDs/references; a demo; and a Map-versus-Array lookup benchmark.
- **What came back:** Added the domain modules and both scripts. The existing `package.json` already had `"type": "module"` and the requested npm scripts.
- **What was wrong or changed:** Focused checks caught `null` inputs causing native `TypeError`s instead of `DomainError`s, so the inventory entry points now validate object inputs. Booking totals are also checked for safe-integer overflow. Added an explicit next-waitlist lookup so the demo can name the first person without removing them from the queue.

## Build 2 — Search, sorting, backlog, first tests

### Prompt 1 — Implement Build 2

- **Asked:** Add event creation/publication and summaries, stable merge sort, pure event search/filter/sort functions, Build 2 acceptance tests, and an `npm test` script, following the Build 2 brief supplied in the task.
- **What came back:** Added the event search and sorting modules, completed the inventory lifecycle for Build 2, and added automated tests.
- **What was wrong or changed:** The workspace's `docs/build-2.md` was empty, and `README.md` and `docs/user-stories.md` were absent. Used the acceptance criteria supplied in the prompt, wrote them into `docs/build-2.md`, and logged the missing inputs here. The terminal demo now creates an event with the required Build 2 fields.

### Prompt 2 — Review, separate tests, and verify Build 2

- **Asked:** Read the Build 2 code and supplied specification, align `docs/build-2.md` with its required sections, separate tests into individual files, and verify the behavior.
- **What came back:** The implementation and demo passed their checks, but booking did not require a published event and all tests were combined in one file.
- **What was wrong or changed:** Added an `INVALID_STATE` rejection for draft-event bookings with an inventory-unchanged test, and updated the demo to publish before selling. Organized the tests into `inventory.test.js`, `eventSearch.test.js`, and `sorting.test.js`, with descriptive test names and no story-code prefixes. Rewrote `docs/build-2.md` to match the supplied specification. A backlog document was added and later removed at the user's request. `npm test` discovers and passes all 27 tests across the three files.

## Build 3 — Architecture, state machine, server skeleton

### Prompt 1 — Implement Build 3

- **Asked:** Add architecture and state diagrams, a booking transition state machine, a Node HTTP router/server with `/health`, safe static files, JSON 400/404 errors, a configurable port, and built-in tests.
- **What came back:** Added the Build 3 domain, HTTP, config, server, documentation, static page, and test files.
- **What was wrong or changed:** The existing `docs/build-3.md` was empty, and `README.md` and `docs/user-stories.md` were not present (the latter had been removed at the user's request). Followed the Build 3 specification included in the prompt and documented that Build 3 introduces no new product stories.

### Prompt 2 — Review and verify Build 3

- **Asked:** Check every state transition and server requirement, run the tests, and verify the actual `npm start` server responds on `/health`.
- **What came back:** All required behaviors passed; the live health endpoint returned HTTP 200 with `{"status":"ok"}`.
- **What was wrong or changed:** Review found inherited JavaScript object property names could be treated as booking states. Transition lookup now checks own keys, and tests cover those names. Added a check that internal errors do not expose stack details. All 42 tests pass; the Build 1 demo and whitespace/syntax checks pass as well.