const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "routeGraph.js"), "utf8");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const api = sandbox.window.DarkRideRouteGraph;
if (!api) throw new Error("DarkRideRouteGraph API was not exposed.");

const graph = new api.RouteGraph(api.defaultLayout());

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log("PASS:", message);
}

assert(graph.mainline.length === 13, "default graph contains 13 mainline nodes");

const route = graph.mainlineCoordinates();
assert(route.length === 14, "mainline coordinate path closes the loop");
assert(route[0].id === route[route.length - 1].id, "mainline loop returns to station node");

const mainlineEdges = graph.mainlineEdges();
assert(mainlineEdges.length === 13, "default graph contains 13 directed mainline edges");

const maintenance = graph.maintenanceEdge();
assert(Boolean(maintenance), "maintenance branch edge exists");
assert(maintenance.id === "EM0", "maintenance branch uses EM0");
assert(maintenance.bidirectional === true, "maintenance branch supports controlled return");

const outgoingStation = graph.outgoing("N0").map((edge) => edge.id);
assert(outgoingStation.includes("E0"), "station has mainline outgoing edge");
assert(outgoingStation.includes("EM0"), "station has maintenance branch edge");

assert(graph.controlBlocks.length === 6, "control graph contains six exclusive blocks");
assert(graph.nextControlBlock("B0").id === "B1", "control topology advances B0 to B1");
assert(graph.nextControlBlock("B5").id === "B0", "control topology closes B5 back to B0");
assert(graph.setControlBoundary("B2", 0.52), "control boundary can be edited through graph API");
assert(graph.controlBlock("B2").endRatio === 0.52, "edited B2 boundary persists");
assert(graph.controlBlock("B3").startRatio === 0.52, "adjacent B3 boundary moves with B2");

assert(graph.setNodePosition("N1", 365, 615), "waypoint position can be edited");
assert(graph.node("N1").x === 365 && graph.node("N1").y === 615, "edited waypoint persists in graph");

const serialized = graph.toJSON();
const roundTrip = new api.RouteGraph(serialized);
assert(roundTrip.node("N1").x === 365, "serialized graph round-trips edited geometry");

const reservations = new api.ReservationTable();
assert(reservations.reserve("B3", "RV-01"), "first reservation succeeds");
assert(!reservations.reserve("B3", "RV-02"), "second vehicle cannot steal occupied reservation");
assert(reservations.reserve("B3", "RV-01"), "reservation owner can idempotently retain resource");
assert(!reservations.release("B3", "RV-02"), "non-owner cannot release reservation");
assert(reservations.release("B3", "RV-01"), "owner can release reservation");
assert(reservations.reserve("EM0", "RV-02"), "maintenance branch can be reserved");
const revoked = reservations.lock("EM0");
assert(revoked === "RV-02", "locking a resource returns and revokes prior owner");
assert(!reservations.reserve("EM0", "RV-03"), "locked switch edge rejects reservation");
reservations.unlock("EM0");
assert(reservations.reserve("EM0", "RV-03"), "unlocked switch edge accepts reservation");

console.log("\nRoute graph suite passed.");
