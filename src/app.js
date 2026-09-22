(() => {
  "use strict";

  const canvas = document.getElementById("rideCanvas");
  const ctx = canvas.getContext("2d");

  const ui = {
    systemStatus: document.getElementById("systemStatus"),
    dispatchBtn: document.getElementById("dispatchBtn"),
    autoDispatchBtn: document.getElementById("autoDispatchBtn"),
    rideStopBtn: document.getElementById("rideStopBtn"),
    resetBtn: document.getElementById("resetBtn"),
    speedRange: document.getElementById("speedRange"),
    speedValue: document.getElementById("speedValue"),
    vehicleEmpty: document.getElementById("vehicleEmpty"),
    vehicleTelemetry: document.getElementById("vehicleTelemetry"),
    vehicleId: document.getElementById("vehicleId"),
    vehicleState: document.getElementById("vehicleState"),
    vehicleSpeed: document.getElementById("vehicleSpeed"),
    vehicleZone: document.getElementById("vehicleZone"),
    vehicleBlock: document.getElementById("vehicleBlock"),
    vehicleReservation: document.getElementById("vehicleReservation"),
    vehicleOnboard: document.getElementById("vehicleOnboard"),
    vehicleLap: document.getElementById("vehicleLap"),
    faultBtn: document.getElementById("faultBtn"),
    recoverBtn: document.getElementById("recoverBtn"),
    maintenanceBtn: document.getElementById("maintenanceBtn"),
    returnServiceBtn: document.getElementById("returnServiceBtn"),
    activeMetric: document.getElementById("activeMetric"),
    completedMetric: document.getElementById("completedMetric"),
    throughputMetric: document.getElementById("throughputMetric"),
    faultMetric: document.getElementById("faultMetric"),
    eventLog: document.getElementById("eventLog"),
    clearLogBtn: document.getElementById("clearLogBtn"),
    blockBoard: document.getElementById("blockBoard"),
    blockSelect: document.getElementById("blockSelect"),
    toggleBlockLockBtn: document.getElementById("toggleBlockLockBtn"),
    queueMetric: document.getElementById("queueMetric"),
    loadedMetric: document.getElementById("loadedMetric"),
    arrivalRateRange: document.getElementById("arrivalRateRange"),
    arrivalRateValue: document.getElementById("arrivalRateValue"),
    scenarioCascadeBtn: document.getElementById("scenarioCascadeBtn"),
    scenarioJamBtn: document.getElementById("scenarioJamBtn"),
    scenarioSurgeBtn: document.getElementById("scenarioSurgeBtn"),
    clearScenarioBtn: document.getElementById("clearScenarioBtn"),
    alarmList: document.getElementById("alarmList"),
  };

  const CONFIG = {
    cruiseSpeed: 112,
    minGap: 92,
    cautionGap: 165,
    dispatchClearance: 185,
    stationDwellSeconds: 4.5,
    autoDispatchInterval: 7,
    vehicleRadius: 13,
    seatsPerVehicle: 6,
    reservationRequestDistance: 125,
    blockHoldBuffer: 34,
    maintenanceTransitSeconds: 2.8,
    initialQueue: 24,
  };

  const route = [
    { x: 175, y: 610 },
    { x: 350, y: 610 },
    { x: 500, y: 555 },
    { x: 575, y: 455 },
    { x: 720, y: 420 },
    { x: 915, y: 465 },
    { x: 1015, y: 355 },
    { x: 930, y: 225 },
    { x: 765, y: 165 },
    { x: 595, y: 210 },
    { x: 475, y: 315 },
    { x: 310, y: 285 },
    { x: 190, y: 395 },
    { x: 175, y: 610 },
  ];

  const zones = [
    { name: "Load / Unload", x: 95, y: 555, w: 325, h: 105, fill: "rgba(41, 105, 124, 0.15)", stroke: "#28596a" },
    { name: "Scene 1 // The Gallery", x: 430, y: 405, w: 230, h: 175, fill: "rgba(88, 68, 119, 0.13)", stroke: "#574a70" },
    { name: "Scene 2 // Machine Hall", x: 700, y: 370, w: 285, h: 150, fill: "rgba(113, 73, 49, 0.12)", stroke: "#71503b" },
    { name: "Scene 3 // The Void", x: 715, y: 115, w: 265, h: 175, fill: "rgba(47, 73, 111, 0.14)", stroke: "#405b7d" },
    { name: "Finale", x: 250, y: 225, w: 300, h: 150, fill: "rgba(75, 104, 65, 0.12)", stroke: "#506d49" },
  ];

  const segments = [];
  let totalLength = 0;

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i];
    const b = route[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, length, start: totalLength });
    totalLength += length;
  }

  const blocks = [
    { id: "B0", name: "Station", startRatio: 0.00, endRatio: 0.15 },
    { id: "B1", name: "Gallery", startRatio: 0.15, endRatio: 0.32 },
    { id: "B2", name: "Machine Hall", startRatio: 0.32, endRatio: 0.49 },
    { id: "B3", name: "The Void", startRatio: 0.49, endRatio: 0.66 },
    { id: "B4", name: "Finale", startRatio: 0.66, endRatio: 0.84 },
    { id: "B5", name: "Return", startRatio: 0.84, endRatio: 1.00 },
  ].map((block) => ({
    ...block,
    start: block.startRatio * totalLength,
    end: block.endRatio * totalLength,
  }));

  let vehicles = [];
  let nextVehicleNumber = 1;
  let selectedVehicleId = null;
  let rideStopped = false;
  let autoDispatch = false;
  let autoDispatchClock = 0;
  let completedCycles = 0;
  let simulationSeconds = 0;
  let lastFrameTime = performance.now();
  const blockReservations = new Map();
  const blockHoldLog = new Set();
  const lockedBlocks = new Set();
  const safetyLatch = new Set();
  const maintenanceBay = { x: 82, y: 690 };

  let guestQueue = CONFIG.initialQueue;
  let guestsLoaded = 0;
  let guestCompletions = 0;
  let guestArrivalCarry = 0;
  let pendingScenario = null;

  function nowLabel() {
    const total = Math.floor(simulationSeconds);
    const minutes = Math.floor(total / 60).toString().padStart(2, "0");
    const seconds = (total % 60).toString().padStart(2, "0");
    return `T+${minutes}:${seconds}`;
  }

  function logEvent(type, message, severity = "") {
    const entry = document.createElement("div");
    entry.className = `log-entry ${severity}`.trim();
    entry.innerHTML = `
      <span class="log-time">${nowLabel()}</span>
      <span class="log-type">${type}</span>
      <span>${message}</span>
    `;
    ui.eventLog.prepend(entry);

    while (ui.eventLog.children.length > 180) {
      ui.eventLog.removeChild(ui.eventLog.lastChild);
    }
  }

  function normalizeDistance(distance) {
    return ((distance % totalLength) + totalLength) % totalLength;
  }

  function pointAtDistance(distance) {
    const d = normalizeDistance(distance);
    const segment = segments.find((item) => d >= item.start && d <= item.start + item.length) || segments[segments.length - 1];
    const t = Math.min(1, Math.max(0, (d - segment.start) / segment.length));
    return {
      x: segment.a.x + (segment.b.x - segment.a.x) * t,
      y: segment.a.y + (segment.b.y - segment.a.y) * t,
      heading: Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x),
    };
  }

  function blockAtDistance(distance) {
    const d = normalizeDistance(distance);
    return blocks.find((block) => d >= block.start && d < block.end) || blocks[blocks.length - 1];
  }

  function nextBlock(block) {
    const index = blocks.findIndex((candidate) => candidate.id === block.id);
    return blocks[(index + 1) % blocks.length];
  }

  function distanceToBlockEnd(distance, block) {
    const d = normalizeDistance(distance);
    return Math.max(0, block.end - d);
  }

  function blockOccupants(blockId) {
    return vehicles.filter(
      (vehicle) =>
        vehicle.maintenanceState === "NONE" &&
        blockAtDistance(vehicle.distance).id === blockId
    );
  }

  function mainlineVehicles() {
    return vehicles.filter((vehicle) => vehicle.maintenanceState === "NONE");
  }

  function loadVehicle(vehicle) {
    const capacity = Math.max(0, CONFIG.seatsPerVehicle - vehicle.onboardGuests);
    const loaded = Math.min(capacity, Math.floor(guestQueue));

    if (loaded <= 0) {
      logEvent("LOAD", `${vehicle.id} departed with no waiting guests.`, "warn");
      return 0;
    }

    vehicle.onboardGuests += loaded;
    guestQueue -= loaded;
    guestsLoaded += loaded;
    logEvent("LOAD", `${vehicle.id} loaded ${loaded} guest${loaded === 1 ? "" : "s"}.`, "good");
    return loaded;
  }

  function maintenancePoint(vehicle) {
    const station = pointAtDistance(0);
    const t = Math.max(0, Math.min(1, vehicle.maintenanceProgress));
    return {
      x: station.x + (maintenanceBay.x - station.x) * t,
      y: station.y + (maintenanceBay.y - station.y) * t,
      heading: Math.atan2(maintenanceBay.y - station.y, maintenanceBay.x - station.x),
    };
  }

  function updateMaintenanceVehicle(vehicle, dt) {
    vehicle.speed = 0;
    vehicle.zoneName = "Maintenance Bay";
    vehicle.reservedBlockId = null;

    if (vehicle.maintenanceState === "TO_BAY") {
      vehicle.state = "TO MAINTENANCE";
      vehicle.maintenanceProgress = Math.min(
        1,
        vehicle.maintenanceProgress + dt / CONFIG.maintenanceTransitSeconds
      );

      if (vehicle.maintenanceProgress >= 1) {
        vehicle.maintenanceState = "IN_BAY";
        vehicle.state = "MAINTENANCE";
        logEvent("SERVICE", `${vehicle.id} secured in maintenance bay.`, "warn");
      }
      return;
    }

    if (vehicle.maintenanceState === "IN_BAY") {
      vehicle.state = "MAINTENANCE";
      return;
    }

    if (vehicle.maintenanceState === "RETURNING") {
      vehicle.state = "RETURN TO SERVICE";
      vehicle.maintenanceProgress = Math.max(
        0,
        vehicle.maintenanceProgress - dt / CONFIG.maintenanceTransitSeconds
      );

      if (vehicle.maintenanceProgress <= 0) {
        vehicle.maintenanceState = "NONE";
        vehicle.distance = 0;
        vehicle.dwellRemaining = CONFIG.stationDwellSeconds;
        vehicle.state = "STATION DWELL";
        vehicle.zoneName = "Load / Unload";
        logEvent("SERVICE", `${vehicle.id} returned to the station for loading.`, "good");
      }
    }
  }

  function faultVehicle(vehicle, source = "Operator") {
    if (!vehicle || vehicle.faulted || vehicle.maintenanceState !== "NONE") return false;
    vehicle.faulted = true;
    vehicle.speed = 0;
    vehicle.state = "FAULT";
    releaseVehicleReservation(vehicle);
    blockHoldLog.delete(vehicle.id);
    logEvent("FAULT", `${vehicle.id} faulted by ${source}. Vehicle immobilized.`, "error");
    return true;
  }

  function recoverVehicle(vehicle) {
    if (!vehicle || !vehicle.faulted) return false;
    vehicle.faulted = false;
    vehicle.state = vehicle.dwellRemaining > 0 ? "STATION DWELL" : "RUNNING";
    updateBlockControl();
    logEvent("RECOVER", `${vehicle.id} fault cleared and vehicle returned to service.`, "good");
    return true;
  }

  function releaseVehicleReservation(vehicle) {
    if (!vehicle || !vehicle.reservedBlockId) return;
    if (blockReservations.get(vehicle.reservedBlockId) === vehicle.id) {
      blockReservations.delete(vehicle.reservedBlockId);
    }
    vehicle.reservedBlockId = null;
  }

  function updateBlockControl() {
    for (const [blockId, vehicleId] of [...blockReservations.entries()]) {
      const vehicle = vehicles.find((candidate) => candidate.id === vehicleId);

      if (!vehicle || vehicle.faulted || vehicle.maintenanceState !== "NONE") {
        blockReservations.delete(blockId);
        if (vehicle && vehicle.reservedBlockId === blockId) {
          vehicle.reservedBlockId = null;
        }
        continue;
      }

      if (blockAtDistance(vehicle.distance).id === blockId) {
        blockReservations.delete(blockId);
        if (vehicle.reservedBlockId === blockId) {
          vehicle.reservedBlockId = null;
        }
      }
    }

    const candidates = vehicles
      .filter(
        (vehicle) =>
          !vehicle.faulted &&
          vehicle.maintenanceState === "NONE" &&
          vehicle.dwellRemaining <= 0
      )
      .map((vehicle) => {
        const current = blockAtDistance(vehicle.distance);
        return {
          vehicle,
          current,
          next: nextBlock(current),
          distanceToEnd: distanceToBlockEnd(vehicle.distance, current),
        };
      })
      .sort((a, b) => a.distanceToEnd - b.distanceToEnd);

    for (const candidate of candidates) {
      const { vehicle, next, distanceToEnd } = candidate;
      if (distanceToEnd > CONFIG.reservationRequestDistance) continue;
      if (vehicle.reservedBlockId === next.id && blockReservations.get(next.id) === vehicle.id) continue;

      const occupants = blockOccupants(next.id).filter((occupant) => occupant.id !== vehicle.id);
      const owner = blockReservations.get(next.id);

      if (
        lockedBlocks.has(next.id) ||
        occupants.length > 0 ||
        (owner && owner !== vehicle.id)
      ) continue;

      releaseVehicleReservation(vehicle);
      blockReservations.set(next.id, vehicle.id);
      vehicle.reservedBlockId = next.id;

      logEvent("RESERVE", `${vehicle.id} reserved ${next.id} // ${next.name}.`, "good");

      if (blockHoldLog.has(vehicle.id)) {
        blockHoldLog.delete(vehicle.id);
        logEvent("RELEASE", `${vehicle.id} released from block hold into ${next.id}.`, "good");
      }
    }
  }

  function vehicleHasNextBlockReservation(vehicle) {
    const current = blockAtDistance(vehicle.distance);
    const next = nextBlock(current);
    return vehicle.reservedBlockId === next.id && blockReservations.get(next.id) === vehicle.id;
  }

  function zoneAtPoint(point) {
    return zones.find((zone) =>
      point.x >= zone.x &&
      point.x <= zone.x + zone.w &&
      point.y >= zone.y &&
      point.y <= zone.y + zone.h
    ) || null;
  }

  function createVehicle(distance = 0, announce = true) {
    const id = `RV-${String(nextVehicleNumber).padStart(2, "0")}`;
    nextVehicleNumber += 1;

    const vehicle = {
      id,
      distance: normalizeDistance(distance),
      speed: 0,
      state: "RUNNING",
      faulted: false,
      dwellRemaining: 0,
      laps: 0,
      zoneName: "Transit",
      lastZoneName: null,
      blockId: blockAtDistance(distance).id,
      reservedBlockId: null,
      onboardGuests: 0,
      maintenanceRequested: false,
      maintenanceState: "NONE",
      maintenanceProgress: 0,
    };

    vehicles.push(vehicle);
    selectedVehicleId = id;

    if (announce) {
      loadVehicle(vehicle);
      logEvent("DISPATCH", `${id} released from Load / Unload.`, "good");
    }

    return vehicle;
  }

  function stationClear() {
    const station = blocks[0];
    const downstream = blocks[1];

    const stationOccupied = blockOccupants(station.id).length > 0;
    const downstreamOccupied = blockOccupants(downstream.id).length > 0;
    const downstreamReserved = blockReservations.has(downstream.id);
    const locked = lockedBlocks.has(station.id) || lockedBlocks.has(downstream.id);

    return !locked && !stationOccupied && !downstreamOccupied && !downstreamReserved;
  }

  function dispatchVehicle() {
    if (rideStopped) {
      logEvent("DENIED", "Dispatch blocked while ride stop is active.", "warn");
      return false;
    }

    if (!stationClear()) {
      logEvent("DENIED", "Dispatch lane occupied. Waiting for station clearance.", "warn");
      return false;
    }

    createVehicle(0, true);
    return true;
  }

  function getVehicleAhead(vehicle) {
    if (vehicles.length < 2) return null;

    let best = null;
    let bestGap = Infinity;

    for (const other of mainlineVehicles()) {
      if (other.id === vehicle.id) continue;
      const gap = normalizeDistance(other.distance - vehicle.distance);
      if (gap > 0.001 && gap < bestGap) {
        best = other;
        bestGap = gap;
      }
    }

    return best ? { vehicle: best, gap: bestGap } : null;
  }

  function updateVehicle(vehicle, dt) {
    if (rideStopped) {
      vehicle.speed = 0;
      return;
    }

    if (vehicle.maintenanceState !== "NONE") {
      updateMaintenanceVehicle(vehicle, dt);
      return;
    }

    if (vehicle.faulted) {
      vehicle.speed = 0;
      vehicle.state = "FAULT";
      return;
    }

    if (vehicle.dwellRemaining > 0) {
      vehicle.dwellRemaining = Math.max(0, vehicle.dwellRemaining - dt);
      vehicle.speed = 0;
      vehicle.state = "STATION DWELL";

      if (vehicle.dwellRemaining === 0) {
        loadVehicle(vehicle);
        vehicle.state = "RUNNING";
        logEvent("DISPATCH", `${vehicle.id} station dwell complete; vehicle released.`, "good");
      }
      return;
    }

    const rideSpeedScale = Number(ui.speedRange.value) / 100;
    let targetSpeed = CONFIG.cruiseSpeed * rideSpeedScale;
    let spacingState = false;
    let blockState = "RUNNING";
    const currentBlock = blockAtDistance(vehicle.distance);
    const upcomingBlock = nextBlock(currentBlock);
    const boundaryDistance = distanceToBlockEnd(vehicle.distance, currentBlock);
    const hasReservation = vehicleHasNextBlockReservation(vehicle);
    const distanceToHold = Math.max(0, boundaryDistance - CONFIG.blockHoldBuffer);

    vehicle.blockId = currentBlock.id;

    if (!hasReservation) {
      if (distanceToHold <= 0.5) {
        targetSpeed = 0;
        blockState = "BLOCK HOLD";
      } else if (distanceToHold < 115) {
        targetSpeed = Math.min(targetSpeed, Math.max(10, distanceToHold * 1.25));
        blockState = "BLOCK APPROACH";
      }
    }

    const ahead = getVehicleAhead(vehicle);

    if (ahead) {
      if (ahead.gap <= CONFIG.minGap) {
        targetSpeed = 0;
        spacingState = true;
      } else if (ahead.gap < CONFIG.cautionGap) {
        const ratio = (ahead.gap - CONFIG.minGap) / (CONFIG.cautionGap - CONFIG.minGap);
        targetSpeed *= Math.max(0.15, ratio);
        spacingState = true;
      }
    }

    const acceleration = 95;
    if (vehicle.speed < targetSpeed) {
      vehicle.speed = Math.min(targetSpeed, vehicle.speed + acceleration * dt);
    } else {
      vehicle.speed = Math.max(targetSpeed, vehicle.speed - acceleration * 1.4 * dt);
    }

    vehicle.state = spacingState ? "SPACING HOLD" : blockState;

    const previousDistance = vehicle.distance;
    let movement = vehicle.speed * dt;

    if (!hasReservation) {
      const maxMovement = Math.max(0, boundaryDistance - CONFIG.blockHoldBuffer);

      if (movement >= maxMovement) {
        movement = maxMovement;
        vehicle.speed = 0;
        vehicle.state = "BLOCK HOLD";

        if (!blockHoldLog.has(vehicle.id)) {
          blockHoldLog.add(vehicle.id);
          logEvent(
            "HOLD",
            `${vehicle.id} holding in ${currentBlock.id}; ${upcomingBlock.id} unavailable.`,
            "warn"
          );
        }
      }
    }

    const rawNext = previousDistance + movement;

    if (rawNext >= totalLength) {
      vehicle.distance = rawNext - totalLength;
      vehicle.laps += 1;
      completedCycles += 1;
      guestCompletions += vehicle.onboardGuests;
      vehicle.onboardGuests = 0;
      vehicle.speed = 0;

      if (vehicle.maintenanceRequested) {
        vehicle.maintenanceRequested = false;
        vehicle.maintenanceState = "TO_BAY";
        vehicle.maintenanceProgress = 0;
        vehicle.state = "TO MAINTENANCE";
        releaseVehicleReservation(vehicle);
        blockHoldLog.delete(vehicle.id);
        logEvent("SERVICE", `${vehicle.id} diverted from station to maintenance bay.`, "warn");
        return;
      }

      vehicle.dwellRemaining = CONFIG.stationDwellSeconds;
      vehicle.state = "STATION DWELL";
      logEvent("ARRIVAL", `${vehicle.id} returned to Load / Unload after lap ${vehicle.laps}.`, "good");
    } else {
      vehicle.distance = rawNext;
    }

    const enteredBlock = blockAtDistance(vehicle.distance);
    vehicle.blockId = enteredBlock.id;

    if (enteredBlock.id !== currentBlock.id) {
      if (blockReservations.get(enteredBlock.id) === vehicle.id) {
        blockReservations.delete(enteredBlock.id);
      }
      vehicle.reservedBlockId = null;
      blockHoldLog.delete(vehicle.id);
      logEvent("BLOCK", `${vehicle.id} entered ${enteredBlock.id} // ${enteredBlock.name}.`);
    }

    const position = pointAtDistance(vehicle.distance);
    const zone = zoneAtPoint(position);
    const zoneName = zone ? zone.name : "Transit";
    vehicle.zoneName = zoneName;

    if (zoneName !== vehicle.lastZoneName) {
      if (zone) {
        logEvent("TRIGGER", `${vehicle.id} entered ${zone.name}.`);
      }
      vehicle.lastZoneName = zoneName;
    }
  }

  function update(dt) {
    simulationSeconds += dt;

    const arrivalRate = Number(ui.arrivalRateRange.value);
    guestArrivalCarry += (arrivalRate * dt) / 60;
    const arrivals = Math.floor(guestArrivalCarry);
    if (arrivals > 0) {
      guestQueue += arrivals;
      guestArrivalCarry -= arrivals;
    }

    updateBlockControl();

    for (const vehicle of vehicles) {
      updateVehicle(vehicle, dt);
    }

    if (pendingScenario && pendingScenario.type === "FAULT_ON_BLOCK") {
      const target = blockOccupants(pendingScenario.blockId).find((vehicle) => !vehicle.faulted);
      if (target) {
        faultVehicle(target, "B3 cascade drill");
        pendingScenario = null;
      }
    }

    runSafetyDiagnostics();

    if (autoDispatch && !rideStopped) {
      autoDispatchClock += dt;
      if (autoDispatchClock >= CONFIG.autoDispatchInterval) {
        if (stationClear()) {
          dispatchVehicle();
          autoDispatchClock = 0;
        }
      }
    }

    updateUi();
  }

  function drawBackground() {
    ctx.fillStyle = "#05090c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.strokeStyle = "rgba(84, 114, 128, 0.08)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawZones() {
    for (const zone of zones) {
      ctx.save();
      ctx.fillStyle = zone.fill;
      ctx.strokeStyle = zone.stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 7]);
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
      ctx.setLineDash([]);

      ctx.fillStyle = "#758f9c";
      ctx.font = "700 12px ui-sans-serif, system-ui";
      ctx.fillText(zone.name.toUpperCase(), zone.x + 12, zone.y + 22);
      ctx.restore();
    }
  }

  function drawRoute() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(route[0].x, route[0].y);
    for (let i = 1; i < route.length; i += 1) {
      ctx.lineTo(route[i].x, route[i].y);
    }

    ctx.strokeStyle = "#142a33";
    ctx.lineWidth = 22;
    ctx.stroke();

    ctx.strokeStyle = "#31515f";
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 13]);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < route.length - 1; i += 1) {
      const point = route[i];
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#5b7885";
      ctx.fill();
    }

    ctx.restore();
  }

  function drawBlockControls() {
    ctx.save();
    ctx.font = "800 10px ui-sans-serif, system-ui";
    ctx.textAlign = "left";

    for (const block of blocks) {
      const point = pointAtDistance(block.start);
      const occupied = blockOccupants(block.id).length > 0;
      const reserved = blockReservations.has(block.id);
      const locked = lockedBlocks.has(block.id);
      const color = occupied ? "#ff6471" : locked ? "#b88ad4" : reserved ? "#ffd66b" : "#68d49a";

      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(point.heading);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, 14);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = color;
      ctx.fillText(block.id, point.x + 8, point.y - 9);
    }

    ctx.restore();
  }

  function drawMaintenanceBay() {
    const station = pointAtDistance(0);

    ctx.save();
    ctx.strokeStyle = "#526270";
    ctx.lineWidth = 7;
    ctx.setLineDash([6, 7]);
    ctx.beginPath();
    ctx.moveTo(station.x, station.y);
    ctx.lineTo(maintenanceBay.x, maintenanceBay.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(82, 98, 112, 0.12)";
    ctx.strokeStyle = "#526270";
    ctx.lineWidth = 2;
    ctx.fillRect(35, 655, 115, 48);
    ctx.strokeRect(35, 655, 115, 48);
    ctx.fillStyle = "#8ea3ad";
    ctx.font = "800 10px ui-sans-serif, system-ui";
    ctx.fillText("MAINTENANCE", 45, 674);
    ctx.restore();
  }

  function drawStationGate() {
    const start = route[0];

    ctx.save();
    ctx.strokeStyle = stationClear() ? "#5aae80" : "#b48b45";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(start.x - 8, start.y - 30);
    ctx.lineTo(start.x - 8, start.y + 30);
    ctx.stroke();

    ctx.fillStyle = "#8ea3ad";
    ctx.font = "700 11px ui-sans-serif, system-ui";
    ctx.fillText("DISPATCH", start.x - 42, start.y + 49);
    ctx.restore();
  }

  function drawVehicle(vehicle) {
    const point =
      vehicle.maintenanceState === "NONE"
        ? pointAtDistance(vehicle.distance)
        : maintenancePoint(vehicle);
    const selected = vehicle.id === selectedVehicleId;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(point.heading);

    if (selected) {
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.vehicleRadius + 8, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffd66b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle =
      vehicle.maintenanceState !== "NONE"
        ? "#a894bd"
        : vehicle.faulted
          ? "#ff6471"
          : "#83d7e8";
    ctx.strokeStyle =
      vehicle.maintenanceState !== "NONE"
        ? "#5b496c"
        : vehicle.faulted
          ? "#8d2730"
          : "#254f5a";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-17, -12, 34, 24, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#081015";
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(4, -5);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.rotate(-point.heading);
    ctx.fillStyle = "#d9e8ee";
    ctx.font = "700 10px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(vehicle.id, 0, -24);

    ctx.restore();
  }

  function draw() {
    drawBackground();
    drawZones();
    drawRoute();
    drawMaintenanceBay();
    drawBlockControls();
    drawStationGate();

    for (const vehicle of vehicles) {
      drawVehicle(vehicle);
    }

    if (rideStopped) {
      ctx.save();
      ctx.fillStyle = "rgba(30, 4, 7, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff8a94";
      ctx.font = "800 36px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("RIDE STOP ACTIVE", canvas.width / 2, 62);
      ctx.restore();
    }
  }

  function selectedVehicle() {
    return vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || null;
  }

  function runSafetyDiagnostics() {
    for (const block of blocks) {
      const occupants = blockOccupants(block.id);
      const overlapKey = `OVERLAP:${block.id}`;

      if (occupants.length > 1) {
        if (!safetyLatch.has(overlapKey)) {
          safetyLatch.add(overlapKey);
          rideStopped = true;
          logEvent(
            "SAFETY",
            `${block.id} occupancy violation: ${occupants.map((vehicle) => vehicle.id).join(", ")}. Ride stop asserted.`,
            "error"
          );
        }
      } else {
        safetyLatch.delete(overlapKey);
      }

      const owner = blockReservations.get(block.id);
      const conflict = owner && occupants.some((vehicle) => vehicle.id !== owner);
      const conflictKey = `RESERVATION:${block.id}`;

      if (conflict) {
        if (!safetyLatch.has(conflictKey)) {
          safetyLatch.add(conflictKey);
          rideStopped = true;
          logEvent(
            "SAFETY",
            `${block.id} reservation conflict detected. Ride stop asserted.`,
            "error"
          );
        }
      } else {
        safetyLatch.delete(conflictKey);
      }
    }
  }

  function renderBlockBoard() {
    ui.blockBoard.innerHTML = blocks.map((block) => {
      const occupants = blockOccupants(block.id);
      const reservedBy = blockReservations.get(block.id);
      const locked = lockedBlocks.has(block.id);
      const status = occupants.length > 0
        ? "occupied"
        : locked
          ? "locked"
          : reservedBy
            ? "reserved"
            : "clear";
      const detail = occupants.length > 0
        ? `OCC: ${occupants.map((vehicle) => vehicle.id).join(", ")}`
        : locked
          ? "OPERATOR LOCKOUT"
          : reservedBy
            ? `RES: ${reservedBy}`
            : "AVAILABLE";

      return `<div class="block-card ${status}">
        <strong>${block.id} // ${block.name}</strong>
        <span>${detail}</span>
      </div>`;
    }).join("");
  }

  function renderAlarms() {
    const alarms = [];

    for (const vehicle of vehicles) {
      if (vehicle.faulted) alarms.push({ text: `${vehicle.id} FAULT`, warn: false });
      if (vehicle.maintenanceRequested) alarms.push({ text: `${vehicle.id} MAINTENANCE REQUEST`, warn: true });
    }

    for (const blockId of lockedBlocks) {
      alarms.push({ text: `${blockId} OPERATOR LOCKOUT`, warn: true });
    }

    if (pendingScenario) alarms.push({ text: "B3 CASCADE DRILL ARMED", warn: true });
    for (const key of safetyLatch) alarms.push({ text: `SAFETY ${key}`, warn: false });
    if (rideStopped) alarms.push({ text: "RIDE STOP ACTIVE", warn: false });

    ui.alarmList.innerHTML = alarms.length
      ? alarms.map((alarm) => `<div class="alarm-item ${alarm.warn ? "warn" : ""}">${alarm.text}</div>`).join("")
      : "No active alarms.";
  }

  function updateUi() {
    const selected = selectedVehicle();
    const faultCount = vehicles.filter((vehicle) => vehicle.faulted).length;

    ui.dispatchBtn.disabled = rideStopped || !stationClear();
    ui.rideStopBtn.textContent = rideStopped ? "Release Ride Stop" : "Ride Stop";
    ui.autoDispatchBtn.textContent = `Auto Dispatch: ${autoDispatch ? "ON" : "OFF"}`;
    ui.speedValue.textContent = `${ui.speedRange.value}%`;

    if (rideStopped) {
      ui.systemStatus.textContent = "RIDE STOP";
      ui.systemStatus.classList.add("stop");
    } else if (faultCount > 0) {
      ui.systemStatus.textContent = "SYSTEM DEGRADED";
      ui.systemStatus.classList.add("stop");
    } else {
      ui.systemStatus.textContent = "SYSTEM NORMAL";
      ui.systemStatus.classList.remove("stop");
    }

    ui.activeMetric.textContent = String(mainlineVehicles().length);
    ui.completedMetric.textContent = String(completedCycles);
    ui.faultMetric.textContent = String(faultCount);
    ui.queueMetric.textContent = String(Math.floor(guestQueue));
    ui.loadedMetric.textContent = String(guestsLoaded);
    ui.arrivalRateValue.textContent = `${ui.arrivalRateRange.value}/min`;

    const throughput = simulationSeconds >= 30
      ? Math.round(guestCompletions / (simulationSeconds / 3600))
      : 0;
    ui.throughputMetric.textContent = String(throughput);

    renderBlockBoard();
    renderAlarms();

    if (!selected) {
      ui.vehicleEmpty.classList.remove("hidden");
      ui.vehicleTelemetry.classList.add("hidden");
      return;
    }

    ui.vehicleEmpty.classList.add("hidden");
    ui.vehicleTelemetry.classList.remove("hidden");
    ui.vehicleId.textContent = selected.id;
    ui.vehicleState.textContent = selected.state;
    ui.vehicleSpeed.textContent = `${Math.round(selected.speed)} px/s`;
    ui.vehicleZone.textContent = selected.zoneName;
    const selectedBlock =
      selected.maintenanceState === "NONE" ? blockAtDistance(selected.distance) : null;
    ui.vehicleBlock.textContent = selectedBlock
      ? `${selectedBlock.id} // ${selectedBlock.name}`
      : "SERVICE BAY";
    ui.vehicleReservation.textContent = selected.reservedBlockId || "None";
    ui.vehicleOnboard.textContent = `${selected.onboardGuests}/${CONFIG.seatsPerVehicle}`;
    ui.vehicleLap.textContent = String(selected.laps);
    ui.faultBtn.disabled = selected.faulted || selected.maintenanceState !== "NONE";
    ui.recoverBtn.disabled = !selected.faulted;
    ui.maintenanceBtn.disabled =
      selected.faulted ||
      selected.maintenanceRequested ||
      selected.maintenanceState !== "NONE";
    ui.returnServiceBtn.disabled =
      selected.maintenanceState !== "IN_BAY" || !stationClear();
  }

  function selectVehicleFromPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

    let hit = null;
    let hitDistance = Infinity;

    for (const vehicle of vehicles) {
      const point = pointAtDistance(vehicle.distance);
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance <= 26 && distance < hitDistance) {
        hit = vehicle;
        hitDistance = distance;
      }
    }

    if (hit) {
      selectedVehicleId = hit.id;
      logEvent("SELECT", `${hit.id} selected for telemetry.`);
      updateUi();
    }
  }

  function resetSimulation() {
    vehicles = [];
    nextVehicleNumber = 1;
    selectedVehicleId = null;
    rideStopped = false;
    autoDispatch = false;
    autoDispatchClock = 0;
    completedCycles = 0;
    simulationSeconds = 0;
    guestQueue = CONFIG.initialQueue;
    guestsLoaded = 0;
    guestCompletions = 0;
    guestArrivalCarry = 0;
    pendingScenario = null;
    blockReservations.clear();
    blockHoldLog.clear();
    lockedBlocks.clear();
    safetyLatch.clear();
    ui.arrivalRateRange.value = "24";
    ui.eventLog.innerHTML = "";

    const seeded = [
      createVehicle(0, false),
      createVehicle(totalLength * 0.34, false),
      createVehicle(totalLength * 0.68, false),
    ];

    for (const vehicle of seeded) {
      vehicle.onboardGuests = CONFIG.seatsPerVehicle;
      guestsLoaded += CONFIG.seatsPerVehicle;
    }

    selectedVehicleId = seeded[0].id;
    logEvent("SYSTEM", "Simulation initialized with three ride vehicles.", "good");
    logEvent("SYSTEM", "Ride control online. Manual dispatch available when station is clear.");
    updateUi();
  }

  ui.dispatchBtn.addEventListener("click", dispatchVehicle);

  ui.autoDispatchBtn.addEventListener("click", () => {
    autoDispatch = !autoDispatch;
    autoDispatchClock = 0;
    logEvent("AUTO", `Automatic dispatch ${autoDispatch ? "enabled" : "disabled"}.`, autoDispatch ? "good" : "");
    updateUi();
  });

  ui.rideStopBtn.addEventListener("click", () => {
    rideStopped = !rideStopped;
    logEvent(
      rideStopped ? "STOP" : "RECOVER",
      rideStopped ? "Ride stop activated. All vehicle motion inhibited." : "Ride stop released. Vehicle motion restored.",
      rideStopped ? "error" : "good"
    );
    updateUi();
  });

  ui.resetBtn.addEventListener("click", resetSimulation);

  ui.faultBtn.addEventListener("click", () => {
    faultVehicle(selectedVehicle());
    updateUi();
  });

  ui.recoverBtn.addEventListener("click", () => {
    recoverVehicle(selectedVehicle());
    updateUi();
  });

  ui.maintenanceBtn.addEventListener("click", () => {
    const vehicle = selectedVehicle();
    if (!vehicle || vehicle.faulted || vehicle.maintenanceState !== "NONE") return;
    vehicle.maintenanceRequested = true;
    logEvent("SERVICE", `${vehicle.id} will divert to maintenance at next station arrival.`, "warn");
    updateUi();
  });

  ui.returnServiceBtn.addEventListener("click", () => {
    const vehicle = selectedVehicle();
    if (!vehicle || vehicle.maintenanceState !== "IN_BAY") return;

    if (!stationClear()) {
      logEvent("DENIED", `${vehicle.id} return blocked; station path is unavailable.`, "warn");
      return;
    }

    vehicle.maintenanceState = "RETURNING";
    vehicle.state = "RETURN TO SERVICE";
    logEvent("SERVICE", `${vehicle.id} released from maintenance bay.`, "good");
    updateUi();
  });

  ui.toggleBlockLockBtn.addEventListener("click", () => {
    const blockId = ui.blockSelect.value;

    if (lockedBlocks.has(blockId)) {
      lockedBlocks.delete(blockId);
      logEvent("LOCKOUT", `${blockId} returned to service.`, "good");
    } else {
      lockedBlocks.add(blockId);
      logEvent("LOCKOUT", `${blockId} removed from service by operator.`, "warn");
    }

    updateBlockControl();
    updateUi();
  });

  ui.scenarioCascadeBtn.addEventListener("click", () => {
    pendingScenario = { type: "FAULT_ON_BLOCK", blockId: "B3" };
    autoDispatch = true;
    logEvent("SCENARIO", "B3 cascade drill armed. Next vehicle entering B3 will fault.", "warn");
    updateUi();
  });

  ui.scenarioJamBtn.addEventListener("click", () => {
    lockedBlocks.add("B1");
    logEvent("SCENARIO", "B1 downstream station lockout applied.", "warn");
    updateUi();
  });

  ui.scenarioSurgeBtn.addEventListener("click", () => {
    ui.arrivalRateRange.value = "60";
    autoDispatch = true;
    logEvent("SCENARIO", "Guest surge active: arrivals set to 60/min with auto dispatch enabled.", "warn");
    updateUi();
  });

  ui.clearScenarioBtn.addEventListener("click", () => {
    pendingScenario = null;
    lockedBlocks.clear();
    autoDispatch = false;
    rideStopped = false;
    safetyLatch.clear();

    for (const vehicle of vehicles) {
      if (vehicle.faulted) recoverVehicle(vehicle);
    }

    logEvent("SCENARIO", "Scenario controls cleared and normal operations restored.", "good");
    updateUi();
  });

  ui.clearLogBtn.addEventListener("click", () => {
    ui.eventLog.innerHTML = "";
  });

  canvas.addEventListener("click", selectVehicleFromPointer);

  function frame(timestamp) {
    const rawDt = (timestamp - lastFrameTime) / 1000;
    const dt = Math.min(0.05, Math.max(0, rawDt));
    lastFrameTime = timestamp;

    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  resetSimulation();
  requestAnimationFrame((timestamp) => {
    lastFrameTime = timestamp;
    frame(timestamp);
  });
})();
