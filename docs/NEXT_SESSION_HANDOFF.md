# NEXT_SESSION_HANDOFF

## Canonical starting point

Read this file and `docs/PROJECT_STATE.md` before changing the simulator.

Repository: `badmrfrosty313/Dark-Ride-Simulator`

## Current objective

Complete a local smoke test of MVP-01, fix any runtime issues, then begin MVP-02 by extracting the simulation model away from the renderer.

## What exists now

The repository contains a dependency-free browser simulator:

- `index.html`
- `styles.css`
- `src/app.js`
- `README.md`
- `docs/PROJECT_STATE.md`

Open `index.html` directly or through VS Code Live Server.

## Smoke-test checklist

Confirm all of the following:

1. three vehicles appear and move
2. vehicles follow the complete route
3. clicking a vehicle selects it
4. selected telemetry updates
5. ride-speed slider changes vehicle speed
6. vehicles slow / stop when spacing compresses
7. manual dispatch is blocked while the station is occupied
8. manual dispatch becomes available after clearance
9. auto dispatch adds vehicles over time
10. vehicles dwell after completing a lap
11. show-zone trigger entries appear in the log
12. injecting a fault stops one vehicle
13. following vehicles queue behind the fault
14. recovering the vehicle restores movement
15. ride stop freezes the fleet
16. releasing ride stop restores movement
17. reset returns to the initial three-vehicle state

## Next engineering move

Do **not** jump to 3D yet.

Refactor `src/app.js` into modules while preserving behavior:

```
src/
  main.js
  sim/
    Simulation.js
    Route.js
    Vehicle.js
    TrafficController.js
    StationController.js
    EventBus.js
  ui/
    Renderer.js
    Controls.js
```

Then replace the single closed-path traffic rule with explicit route segments / blocks and reservations.

## First real systems target

A stopped vehicle should cause a believable cascade:

- occupied block becomes unavailable
- following vehicle stops at its safe hold point
- vehicles behind it stop progressively
- dispatch becomes inhibited if downstream capacity is unavailable
- recovery releases the chain in order

That behavior will be the foundation for faults, evacuations, and realistic capacity simulation.
