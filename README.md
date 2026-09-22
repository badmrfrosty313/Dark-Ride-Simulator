# Dark Ride Simulator

A systems-first simulator for trackless dark ride operations.

The goal is not just to animate ride vehicles. The simulator models the operational logic behind a modern dark ride: dispatch, routing, show zones, vehicle spacing, station dwell, trigger events, faults, holds, and recovery.

## MVP

The first playable build includes:

- top-down ride layout
- waypoint-based trackless vehicle routing
- load/unload station
- manual and automatic dispatch
- minimum vehicle spacing
- show-zone entry triggers
- station dwell timing
- vehicle selection and telemetry
- fault injection and recovery
- emergency ride stop
- live operations event log
- throughput and fleet metrics

## Run

No build step is required.

Open `index.html` in a modern browser.

For the best local-development experience, use VS Code Live Server or any simple static HTTP server.

## Controls

- **Dispatch Vehicle** adds a vehicle when the dispatch lane is clear.
- **Auto Dispatch** releases vehicles automatically when operational conditions permit.
- **Inject Fault** faults the selected vehicle.
- **Recover Vehicle** clears the selected vehicle's fault.
- **Ride Stop** freezes all ride motion.
- **Reset Simulation** returns the ride to its initial state.
- Click a vehicle on the map to inspect it.

## Architecture

```
index.html
styles.css
src/
  app.js
docs/
  PROJECT_STATE.md
  NEXT_SESSION_HANDOFF.md
```

The simulation intentionally starts dependency-free so the ride-control model can mature before choosing a heavier rendering or game engine.

## Roadmap

1. Operational MVP
2. Editable routes and zones
3. Switches / branching path logic
4. Block-zone and reservation-based traffic control
5. Scene timing and synchronized show control
6. Multiple stations and maintenance bays
7. Queue / guest loading model
8. Fault propagation, evacuation, and recovery procedures
9. Saveable ride layouts
10. Optional 3D visualization

## Design Principle

**Simulation first, spectacle second.**

If the operating logic is believable in a simple top-down view, prettier rendering can be layered on without rewriting the brain of the ride.
