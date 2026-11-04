## Build 1 — Domain core

### Prompt 1 — Read the project brief

- **Asked:** Read `README.md` and `docs/build-1.md` before writing anything.
- **What came back:** `README.md` was not present in the workspace, and `docs/build-1.md` was empty.
- **What was wrong or changed:** The requested brief files did not provide readable requirements, so the Build 1 description supplied in the task was used as the specification.

### Prompt 2 — Build the domain core

- **Asked:** Implement the Build 1 terminal domain core: validated events, tiers, bookings and cancellations; a linked-list FIFO waitlist; secure IDs/references; a demo; and a Map-versus-Array lookup benchmark.
- **What came back:** Added the domain modules and both scripts. The existing `package.json` already had `"type": "module"` and the requested npm scripts.
- **What was wrong or changed:** Focused checks caught `null` inputs causing native `TypeError`s instead of `DomainError`s, so the inventory entry points now validate object inputs. Booking totals are also checked for safe-integer overflow. Added an explicit next-waitlist lookup so the demo can name the first person without removing them from the queue.