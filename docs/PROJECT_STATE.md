# PROJECT_STATE

## Current milestone

**MVP-01: Operational floor simulator**

Status: implemented, pending local browser smoke test.

## Implemented

- zero-build browser application
- responsive operations dashboard
- Canvas-based top-down ride floor
- closed waypoint route
- three seeded ride vehicles
- per-vehicle state machine
- acceleration / deceleration
- configurable ride speed
- nearest-vehicle-ahead spacing logic
- minimum-gap stop behavior
- caution-gap speed reduction
- manual dispatch with station-clearance interlock
- automatic dispatch mode
- station dwell after a completed circuit
- named show zones
- zone-entry trigger events
- vehicle selection
- per-vehicle telemetry
- injected vehicle faults
- individual fault recovery
- global ride stop / release
- live event bus
- active fleet, completed-cycle, throughput, and fault metrics

## Simulation model

Each ride vehicle currently owns:

- route distance
- instantaneous speed
- operating state
- fault state
- station dwell timer
- completed lap count
- current show zone
- previous show zone for edge-trigger detection

The route is represented as a closed polyline. Vehicle motion is stored as scalar distance along that route, which keeps routing logic independent from rendering.

## Current vehicle states

- RUNNING
- SPACING HOLD
- STATION DWELL
- FAULT

Global ride stop inhibits motion without destroying each vehicle's underlying state.

## Known limitations

- path is fixed in source
- all vehicles follow one loop
- no switches or alternate routes yet
- no formal block reservation system yet
- station loading is a timer rather than a guest model
- throughput is a simple projection from completed six-seat vehicle cycles
- faults are manual and binary
- no evacuation workflow
- no save/load
- no scene animation beyond operational zones
- no audio / show-control synchronization
- no unit tests yet

## Architecture direction

Keep simulation state independent from drawing.

The next major architectural split should separate:

1. simulation clock
2. route graph
3. vehicle controller
4. traffic / block controller
5. station controller
6. show-control event bus
7. renderer / UI

That separation matters before editable layouts or branching paths are added.

## Near-term roadmap

### MVP-02
- formal route graph instead of a single polyline
- block / reservation occupancy
- stop points
- station controller
- better operational states

### MVP-03
- route editor
- draggable waypoints
- editable show zones
- switch nodes and alternate paths
- save/load layout JSON

### MVP-04
- scene triggers with timed show cues
- synchronized doors / lighting / audio abstractions
- show reset rules
- faulted-scene behavior

### MVP-05
- guest queue and loading
- vehicle capacity
- dispatch interval optimization
- hourly capacity reporting
- downtime / reliability metrics

### Later
- maintenance bay
- evacuation
- cascaded fault scenarios
- multiple stations
- randomized operations
- scenario scripting
- optional 3D presentation layer

## Design rule

Do not let prettier graphics dictate the simulation architecture.

The ride-control model is the product. Rendering is a view of that model.
