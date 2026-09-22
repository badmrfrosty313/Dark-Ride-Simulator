# CONTROL_SYSTEM

## Purpose

The simulator treats vehicle movement as permissioned movement through exclusive operating blocks.

A vehicle does not enter a downstream block merely because geometric space exists. It must own permission for that block.

## Mainline blocks

| Block | Function |
| --- | --- |
| B0 | Station |
| B1 | Gallery |
| B2 | Machine Hall |
| B3 | The Void |
| B4 | Finale |
| B5 | Return |

## Reservation lifecycle

1. Vehicle approaches the end of its current block.
2. It requests the next block.
3. Request is denied if the block is occupied, reserved by another vehicle, or operator-locked.
4. Vehicle decelerates toward the safe hold point.
5. If permission remains unavailable, vehicle stops in BLOCK HOLD.
6. When permission becomes available, the reservation is granted.
7. Vehicle crosses the boundary.
8. Reservation is consumed and released on entry.

## Fault behavior

A faulted mainline vehicle:

- stops immediately
- continues occupying its current block
- releases any future reservation
- causes the following vehicle to hold upstream
- can eventually cause multi-block queue propagation
- can remove station dispatch capacity

## Lockout behavior

An operator lockout removes a block from reservation service.

An already occupied block may be locked, but no additional vehicle receives permission to enter it.

## Station dispatch

Dispatch requires:

- B0 Station clear
- B1 Gallery clear
- B1 not reserved
- B0 not locked
- B1 not locked
- ride stop released

## Maintenance

Maintenance is currently modeled as a controlled service spur outside the mainline block system.

A selected vehicle can be flagged for maintenance.

At its next completed circuit it:

1. unloads guests
2. exits mainline occupancy
3. travels to the maintenance bay
4. remains MAINTENANCE until operator release
5. may return only when the station path is clear
6. travels back to B0
7. enters normal station dwell and loading

The next route-graph milestone should turn this service spur into a real branch with switch and merge reservations.

## Safety invariants

The runtime checks:

### Exclusive occupancy

No exclusive mainline block may contain more than one vehicle.

Violation response:

- latch safety alarm
- log SAFETY event
- assert ride stop

### Reservation conflict

A downstream reservation may not belong to one vehicle while a different vehicle already occupies that same block.

Violation response is identical.

## Secondary spacing guard

Distance-based spacing remains active even though blocks are authoritative.

This gives the model two layers:

1. block permission
2. local separation

## Scenario hooks

### B3 Cascade Drill

Arms a one-shot fault trigger.

The next non-faulted vehicle entering B3 faults automatically, allowing repeatable cascade testing.

### Jam Downstream

Locks B1, removing downstream station capacity.

### Guest Surge

Sets guest arrivals to 60/min and enables automatic dispatch.

## Future control architecture

The next graph model should separate:

- RouteGraph
- Edge
- Switch
- Merge
- BlockController
- ReservationController
- VehicleController
- StationController
- MaintenanceController
- GuestFlow
- ScenarioController
- SafetyMonitor
- ShowController
