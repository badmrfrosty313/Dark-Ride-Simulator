# Dark Ride Simulator

A systems-first simulator for trackless dark ride operations.

The project models the operational brain behind a modern dark ride: dispatch, vehicle routing, exclusive blocks, reservations, hold points, guest flow, maintenance routing, faults, operator lockouts, safety diagnostics, and recovery.

## Current build

The simulator currently includes:

- top-down trackless ride layout
- waypoint-based vehicle motion
- six exclusive operational blocks
- one-block-ahead reservation control
- safe hold points before block boundaries
- cascading upstream holds after faults
- downstream station dispatch interlocks
- proximity spacing as a secondary collision guard
- manual and automatic dispatch
- guest arrival queue and six-seat vehicle loading
- live hourly-throughput calculation using actual guest completions
- show-zone entry triggers
- station dwell timing
- individual vehicle telemetry
- fault injection and recovery
- operator block lockouts
- deterministic B3 cascade drill
- downstream station-jam scenario
- guest-surge scenario
- formal RouteGraph with directed mainline edges, control-block topology, and maintenance branch
- maintenance requests, graph switch/branch reservation, service bay, merge, and return-to-service flow
- ride stop
- safety invariants that assert ride stop on persistent block occupancy / reservation violations
- distinct manual, safety, design, and evacuation stop semantics
- autonomous full operations drill with PASS/FAIL state
- live block-status board
- active-alarm board
- operations event log

## Run

No build step is required.

Open `index.html` in a modern browser.

For the best local-development experience, use VS Code Live Server or any simple static HTTP server.

## Core controls

- **Dispatch Vehicle** adds a vehicle when station and downstream block conditions permit.
- **Auto Dispatch** releases vehicles automatically as capacity becomes available.
- **Ride Stop** freezes ride motion.
- **Inject Fault / Recover Vehicle** manipulate the selected vehicle.
- **Route to Maintenance** flags the selected vehicle to divert after its next completed circuit.
- **Return to Service** returns a vehicle from the service bay when the station path is available.
- **Toggle Lockout** removes or restores a selected operating block.
- **Arm B3 Cascade** faults the next vehicle that enters B3.
- **Jam Downstream** locks B1 to remove downstream station capacity.
- **Guest Surge** raises arrivals to 60 guests/min and enables auto dispatch.
- **Clear Scenario** returns scenario controls toward normal operation.

## Architecture

```
index.html
styles.css
src/
  app.js
docs/
  CONTROL_SYSTEM.md
  TEST_MATRIX.md
  PROJECT_STATE.md
  NEXT_SESSION_HANDOFF.md
```

The application intentionally remains dependency-free and directly openable while the operational model is evolving.

## Roadmap

1. Operational MVP
2. Block reservation / fault cascade control
3. Operations lab: guest flow, lockouts, maintenance, scenarios, safety diagnostics
4. Editable route and block geometry
5. Switches and true branching-path graph
6. Scene timing and synchronized show control
7. Evacuation and recovery procedures
8. Multi-station / multi-bay operations
9. Saveable ride layouts and scenarios
10. Optional 3D visualization

## Design Principle

**Simulation first, spectacle second.**

If the operating logic is believable in a simple top-down view, richer rendering can be layered on without rewriting the brain of the ride.


## Tests

On Windows, run:

```powershell
.\run-tests.cmd
```

The test runner checks JavaScript syntax, DOM contracts, graph topology, editable control boundaries, reservation exclusivity, lockout behavior, and maintenance switch-edge behavior.

## Credits drill

Use **Run Full Drill** in the Operations Lab. It automatically drives:

`fault → cascade → recovery → maintenance → return to service`

The drill reports PASS only if it reaches normal service without a safety stop.
