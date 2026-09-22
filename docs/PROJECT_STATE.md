# PROJECT_STATE

## Current milestone

**MVP-02.5: Operations Lab**

Status: implemented and statically validated; browser smoke test required after pull.

## Implemented systems

### Vehicle and route model

- closed waypoint route
- per-vehicle scalar route position
- acceleration / deceleration
- configurable ride speed
- selected-vehicle telemetry
- six-seat guest capacity
- maintenance request and maintenance lifecycle

### Traffic control

- B0 Station
- B1 Gallery
- B2 Machine Hall
- B3 The Void
- B4 Finale
- B5 Return
- exclusive block occupancy
- one-block-ahead reservations
- reservation arbitration
- hold points
- BLOCK APPROACH and BLOCK HOLD behavior
- cascading upstream holds
- station/downstream dispatch interlocks
- operator block lockouts
- proximity spacing as secondary collision protection

### Guest operations

- continuously arriving guest queue
- configurable arrivals per minute
- loading at dispatch / station dwell completion
- onboard guest telemetry
- actual guest completions
- actual projected guests/hour based on simulation runtime
- guest-surge scenario

### Maintenance operations

- Route to Maintenance request on selected vehicle
- diversion after next completed ride cycle
- visible maintenance spur
- service bay
- TO MAINTENANCE
- MAINTENANCE
- RETURN TO SERVICE
- safe station-path check before return to service
- maintenance vehicles removed from mainline block occupancy

### Faults and scenarios

- manual fault injection
- manual recovery
- B3 cascade drill that faults the next vehicle entering B3
- B1 downstream station-jam scenario
- guest-surge scenario
- clear-scenario recovery control

### Safety diagnostics

The runtime now checks safety invariants continuously.

Current asserted violations:

- more than one mainline vehicle occupying an exclusive block
- a block reservation owned by one vehicle while a different vehicle occupies that block

A newly detected safety violation:

1. latches a safety alarm
2. writes a SAFETY event
3. asserts ride stop

### Operator UI

- live floor
- block boundary state
- block board
- selected vehicle telemetry
- guest-flow panel
- scenario panel
- active alarms
- event log

## Block colors

- green: clear
- yellow: reserved
- red: occupied
- purple: operator lockout

## Current vehicle states

- RUNNING
- SPACING HOLD
- BLOCK APPROACH
- BLOCK HOLD
- STATION DWELL
- FAULT
- TO MAINTENANCE
- MAINTENANCE
- RETURN TO SERVICE

## Static validation

Latest static pass confirmed:

- JavaScript parses successfully
- 40 runtime DOM bindings exist
- zero missing DOM IDs
- zero duplicate DOM IDs
- maintenance system present
- guest-flow system present
- lockout controller present
- deterministic scenario hook present
- safety diagnostics present

## Architecture direction

The browser remains zero-build.

Logical subsystems inside `src/app.js` are now mature enough to extract later:

1. route model
2. block / reservation controller
3. vehicle controller
4. guest-flow controller
5. maintenance controller
6. scenario controller
7. safety diagnostics
8. show trigger layer
9. renderer
10. operator UI

Do not physically modularize merely for aesthetics. Extract when route editing / branching requires it.

## Known limitations

- the main route is still one fixed loop
- block geometry is route-distance based
- maintenance is modeled as a controlled service spur, not yet a full graph branch
- no editable waypoints
- no true switch nodes
- no alternate ride paths
- no evacuation workflow
- no synchronized show cue timing/reset system
- no persistence
- automated browser tests are not yet wired to CI

## Next milestone

### MVP-03: Route Graph + Editor

Recommended order:

1. create formal node/edge route graph
2. preserve existing block safety logic on graph edges
3. convert maintenance spur into a real branch
4. add switch / merge reservations
5. make waypoints draggable
6. make block boundaries editable
7. save/load layout JSON
8. add scene cue timelines tied to graph zones

## Design rule

**Simulation first, spectacle second.**
