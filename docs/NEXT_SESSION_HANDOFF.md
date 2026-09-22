# NEXT_SESSION_HANDOFF

## Canonical starting point

Read this file and `docs/PROJECT_STATE.md` before changing the simulator.

Repository: `badmrfrosty313/Dark-Ride-Simulator`

## Current milestone

MVP-02 block control has been implemented.

Important commit:

`c4b11f1a79312f57152ccd8acf6def20dab4b4df`

Index telemetry update:

`b9200bf2952cec98e8252532590e295e4fdb2634`

## What changed

The simulator now uses six operational blocks with reservation-based movement.

Vehicles must reserve the next block before crossing a boundary. If the next block is occupied or already reserved, the vehicle slows and stops at a hold point.

A faulted vehicle keeps its current block occupied and releases any future block reservation.

Station dispatch is inhibited when:

- B0 Station is occupied
- B1 Gallery is occupied
- B1 Gallery is reserved

This creates an upstream traffic cascade instead of relying only on distance-based vehicle spacing.

## Local smoke-test checklist

After `git pull`, open `index.html` exactly as before.

Confirm:

1. the original three vehicles still move
2. six block boundary markers appear on the route
3. markers show green when clear
4. markers show yellow when reserved
5. markers show red when occupied
6. selected vehicle telemetry shows current block
7. selected vehicle telemetry shows its next-block reservation
8. vehicles cross block boundaries only after reservation
9. a vehicle approaching an unavailable block slows down
10. it stops before the boundary in BLOCK HOLD
11. injecting a fault causes the following car to hold upstream
12. continued operation causes the queue to propagate through additional blocks
13. dispatch becomes unavailable when the downstream station block is constrained
14. recovering the faulted vehicle releases the chain in order
15. ride stop / release still works
16. completed laps still produce station dwell
17. auto dispatch still operates when block capacity permits
18. reset returns the simulator to the three-vehicle initial state

## Static validation already completed

- JavaScript parses successfully
- all 25 DOM IDs expected by the runtime exist
- all six blocks are present
- reservation controller is present
- hold-point movement clamp is present
- faults release future reservations
- downstream dispatch interlock is present

## Next engineering target

If MVP-02 passes the browser smoke test, move toward MVP-03.

Recommended order:

1. add a compact block-status board to the operations UI
2. add a deterministic test harness for block reservation / cascade behavior
3. make block boundaries editable
4. make waypoints draggable
5. save and load layout JSON
6. add switches and alternate paths

Do not jump to 3D yet. The traffic-control brain is now valuable enough to protect.
