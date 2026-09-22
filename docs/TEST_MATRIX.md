# TEST_MATRIX

Run after meaningful control-system changes.

## Normal operation

- [ ] Three seeded vehicles move.
- [ ] No SAFETY alarms appear.
- [ ] A vehicle only crosses a block boundary after reservation.
- [ ] Reserved block marker becomes yellow.
- [ ] Occupied block marker becomes red.
- [ ] Cleared block marker becomes green.
- [ ] Station dwell completes and vehicle reloads.
- [ ] Guest queue changes with arrival rate.

## Fault cascade

- [ ] Arm B3 Cascade.
- [ ] Next vehicle entering B3 faults.
- [ ] Faulted vehicle remains in B3.
- [ ] Following vehicle stops before B3.
- [ ] Additional vehicles progressively hold upstream.
- [ ] Station dispatch becomes inhibited when downstream capacity is lost.
- [ ] Recover faulted vehicle.
- [ ] Traffic releases in order.
- [ ] No double occupancy occurs.

## Block lockout

- [ ] Lock B2.
- [ ] B2 displays lockout state.
- [ ] New B2 reservations are denied.
- [ ] Upstream vehicle holds safely.
- [ ] Unlock B2.
- [ ] Waiting vehicle eventually receives reservation.
- [ ] Lock B1.
- [ ] Dispatch becomes unavailable.

## Guest operations

- [ ] Set arrival rate to zero.
- [ ] Queue stops growing.
- [ ] Restore arrivals.
- [ ] Queue grows.
- [ ] Vehicles load no more than six guests.
- [ ] Completed guest throughput increases only after completed rides.
- [ ] Guest Surge sets arrivals to 60/min and enables auto dispatch.

## Maintenance

- [ ] Select active vehicle.
- [ ] Route to Maintenance.
- [ ] Vehicle continues current circuit.
- [ ] On station return, passengers unload.
- [ ] Vehicle diverts onto maintenance spur.
- [ ] Mainline block occupancy no longer includes the maintenance vehicle.
- [ ] Vehicle reaches MAINTENANCE.
- [ ] Return to Service remains unavailable while station path is constrained.
- [ ] With station path clear, return is permitted.
- [ ] Vehicle travels back to station.
- [ ] Vehicle enters STATION DWELL.
- [ ] Vehicle reloads and resumes operation.

## Ride stop

- [ ] Ride Stop freezes mainline vehicles.
- [ ] Maintenance transit also freezes.
- [ ] Guest arrivals continue during downtime.
- [ ] Releasing ride stop resumes motion.

## Safety invariants

Normal operation must never produce:

- [ ] double occupancy in an exclusive mainline block
- [ ] reservation owned by one vehicle while another vehicle occupies that block

If either appears, a SAFETY event and ride stop are expected.

## Reset

- [ ] Reset clears faults.
- [ ] Reset clears block lockouts.
- [ ] Reset clears pending scenarios.
- [ ] Reset clears safety latches.
- [ ] Reset restores arrival rate to 24/min.
- [ ] Reset restores three seeded vehicles.
- [ ] Reset restores initial guest queue.
