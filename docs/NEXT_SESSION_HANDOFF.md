# NEXT_SESSION_HANDOFF

## Canonical starting point

Read this file, `docs/PROJECT_STATE.md`, and `docs/CONTROL_SYSTEM.md` before changing the simulator.

Repository: `badmrfrosty313/Dark-Ride-Simulator`

## Current milestone

MVP-02.5 Operations Lab is implemented.

Key commits from this pass:

- `f7b76e0` operations-lab UI
- `e96a629` operations-lab styling
- `40052a5` guest flow, maintenance, scenarios, block lockouts, and safety diagnostics

## Current behavior to smoke test

After `git pull`, open `index.html`.

Verify:

1. original three vehicles run normally
2. block reservations still work
3. block holds still occur
4. block board matches the route markers
5. block lockout turns the block purple and prevents new reservation entry
6. B1 lockout inhibits station dispatch
7. B3 cascade drill arms, then faults the next vehicle entering B3
8. upstream traffic cascades behind the B3 fault
9. guest queue grows according to arrivals/min
10. station loading reduces the guest queue
11. onboard guest counts appear in vehicle telemetry
12. throughput uses actual completed guests
13. Route to Maintenance flags a vehicle
14. flagged vehicle finishes its ride, then diverts to the service bay
15. maintenance vehicle no longer occupies a mainline block
16. Return to Service only enables when the station path is clear
17. returned vehicle travels back to station and enters station dwell
18. a manual fault produces an active alarm
19. lockouts produce active alarms
20. ride stop appears in alarms
21. Guest Surge sets arrivals to 60/min and enables auto dispatch
22. Clear Scenario removes lockouts, clears the armed scenario, recovers faulted vehicles, disables auto dispatch, and releases ride stop
23. Reset Simulation restores the initial state

## Safety test

The simulator continuously asserts ride stop if it detects:

- double occupancy inside one exclusive mainline block
- reservation ownership that conflicts with an existing occupant

These should never occur in normal operation. If a SAFETY event appears during ordinary operation, treat it as a control-system bug.

## Static validation already completed

- JavaScript syntax: clean
- runtime DOM bindings: 40
- missing DOM IDs: 0
- duplicate DOM IDs: 0

## Next engineering target

Build a formal route graph.

Do not bolt true branching paths onto the scalar-loop model. The next structural move should introduce nodes, directed edges, switches, merges, and edge/block reservations while preserving current behavior.

First branch to migrate onto the graph: the maintenance spur.
