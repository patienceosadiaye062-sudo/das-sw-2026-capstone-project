## Build 1 completion

Build 1 is complete. The domain core supports events and ticket tiers, validated bookings with a capacity rule, cancellation with seats released exactly once, a linked-list FIFO waitlist, and O(1) booking lookup by reference.

### Definition of done

- [x] `npm run demo` shows an event selling out, a booking refused with `SOLD_OUT`, two people joining the waitlist, a booking found by reference, and the next person in line after a cancellation.
- [x] `npm run benchmark` compares `Array.find` and `Map.get` over 100,000 bookings and 500 lookups. In the recorded run, `Array.find` took 1,257.46 ms and `Map.get` took 0.09 ms.
- [x] Focused checks passed for capacity remaining unchanged after a refused booking, FIFO waitlist order, reference lookup, cancellation, rejecting a second cancellation, and invalid object inputs.

The benchmark illustrates the Big O difference: `Array.find` is O(n) per lookup, while `Map.get` is O(1) average per lookup. The measured timings depend on the machine and run.