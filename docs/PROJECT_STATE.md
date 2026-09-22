# PROJECT_STATE

## Current milestone

**MVP-02: Block-controlled ride operations**

Status: implemented in browser simulator; local smoke test required after pull.

## Implemented

### MVP-01 foundation

- zero-build browser application
- responsive operations dashboard
- Canvas-based top-down ride floor
- closed waypoint route
- three seeded ride vehicles
- acceleration / deceleration
- configurable ride speed
- manual and automatic dispatch
- station dwell after a completed circuit
- named show zones and entry triggers
- vehicle selection and telemetry
- injected vehicle faults and recovery
- global ride stop / release
- live event log
- active fleet, completed-cycle, throughput, and fault metrics

### MVP-02 traffic control

- six explicit operational blocks:
  - B0 Station
  - B1 Gallery
  - B2 Machine Hall
  - B3 The Void
  - B4 Finale
  - B5 Return
- one-block-ahead reservation requests
- explicit block ownership / occupancy
- reservation arbitration
- hold points before each block boundary
- automatic deceleration approaching an unavailable block
- BLOCK APPROACH and BLOCK HOLD states
- reservation release when a vehicle enters the reserved block
- reservation release when a vehicle faults
- visible block boundary status:
  - green = clear
  - yellow = reserved
  - red = occupied
- selected-vehicle block and reservation telemetry
- downstream dispatch interlock
- cascading upstream holds after a stopped or faulted vehicle
- proximity spacing retained as a secondary collision guard

## Current traffic-control behavior

A ride vehicle may not cross into its next block unless it owns that block's reservation.

When a vehicle approaches the end of its current block:

1. it requests the next block
2. if the next block is clear and unreserved, the reservation is granted
3. if the next block is unavailable, the vehicle decelerates
4. the vehicle stops at the block hold point before the boundary
5. once the downstream block clears, the waiting vehicle receives the reservation and proceeds

A faulted vehicle remains an occupant of its current block and releases any future reservation it held.

This creates the desired cascade:

- faulted vehicle blocks its current block
- following vehicle holds one block upstream
- the next following vehicle eventually holds another block upstream
- B1 occupancy or reservation inhibits new station dispatches
- recovery releases the chain in order as blocks become available

## Current vehicle states

- RUNNING
- SPACING HOLD
- BLOCK APPROACH
- BLOCK HOLD
- STATION DWELL
- FAULT

Global ride stop inhibits motion without destroying the underlying vehicle state.

## Architecture

The project intentionally remains zero-build for now so `index.html` can still be opened directly.

MVP-02 separates the traffic-control concepts logically inside `src/app.js` without yet introducing browser ES modules.

Primary logical components now are:

1. route / distance model
2. block model
3. reservation controller
4. station dispatch interlock
5. vehicle motion controller
6. show-zone event layer
7. Canvas renderer
8. UI controls

Physical file separation can happen later with a local server or bundling step once the behavioral model stabilizes.

## Known limitations

- path is fixed in source
- block boundaries are defined as route-distance ratios
- all vehicles follow one loop
- no switches or alternate routes yet
- station loading remains timer-based
- no guest queue model
- no evacuation workflow
- no maintenance bay
- no save/load
- no scene animation beyond trigger zones
- no show audio / lighting synchronization
- no automated unit tests yet

## Next milestone

### MVP-03: Editable ride layout

Target capabilities:

- draggable waypoints
- route editing
- editable show zones
- editable block boundaries
- switch nodes
- alternate paths
- save/load ride layout JSON

Before the full editor, consider adding a compact block-status panel and a deterministic traffic-control test harness.

## Design rule

**Simulation first, spectacle second.**

Rendering visualizes the ride-control model. It must not dictate it.
