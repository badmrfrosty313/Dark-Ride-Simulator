const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "index.html");
const appPath = path.join(root, "src", "app.js");
const graphPath = path.join(root, "src", "routeGraph.js");

const index = fs.readFileSync(indexPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const graph = fs.readFileSync(graphPath, "utf8");

function fail(message) {
  console.error("FAIL:", message);
  process.exitCode = 1;
}

function pass(message) {
  console.log("PASS:", message);
}

try {
  new Function(app);
  pass("src/app.js parses");
} catch (error) {
  fail(`src/app.js syntax: ${error.message}`);
}

try {
  new Function(graph);
  pass("src/routeGraph.js parses");
} catch (error) {
  fail(`src/routeGraph.js syntax: ${error.message}`);
}

const expectedIds = [...app.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
const htmlIds = [...index.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const htmlIdSet = new Set(htmlIds);

const missing = expectedIds.filter((id) => !htmlIdSet.has(id));
if (missing.length) fail(`Missing DOM IDs: ${missing.join(", ")}`);
else pass(`All ${expectedIds.length} runtime DOM bindings exist`);

const duplicates = [...htmlIdSet].filter((id) => htmlIds.filter((candidate) => candidate === id).length > 1);
if (duplicates.length) fail(`Duplicate DOM IDs: ${duplicates.join(", ")}`);
else pass("No duplicate DOM IDs");

if (index.indexOf("src/routeGraph.js") < index.indexOf("src/app.js")) {
  pass("Route graph loads before app runtime");
} else {
  fail("routeGraph.js must load before app.js");
}

const contracts = [
  ["safety debounce", "safetyViolationFrames"],
  ["evacuation recovery", "Evacuation recovery check passed"],
  ["layout persistence", "dark-ride-layout"],
  ["show control", "showTimelines"],
  ["maintenance branch reservation", "maintenanceBranchOwner"],
  ["design mode", "blockBoundaryRange"],
];

for (const [name, token] of contracts) {
  if (app.includes(token)) pass(name);
  else fail(`Missing contract: ${name}`);
}

if (!process.exitCode) {
  console.log("\nStatic contract suite passed.");
}
