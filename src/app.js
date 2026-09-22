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
    vehicleLap: document.getElementById("vehicleLap"),
    faultBtn: document.getElementById("faultBtn"),
    recoverBtn: document.getElementById("recoverBtn"),
    activeMetric: document.getElementById("activeMetric"),
    completedMetric: document.getElementById("completedMetric"),
    throughputMetric: document.getElementById("throughputMetric"),
    faultMetric: document.getElementById("faultMetric"),
    eventLog: document.getElementById("eventLog"),
    clearLogBtn: document.getElementById("clearLogBtn"),
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

  let vehicles = [];
  let nextVehicleNumber = 1;
  let selectedVehicleId = null;
  let rideStopped = false;
  let autoDispatch = false;
  let autoDispatchClock = 0;
  let completedCycles = 0;
  let simulationSeconds = 0;
  let lastFrameTime = performance.now();

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
    };

    vehicles.push(vehicle);
    selectedVehicleId = id;

    if (announce) {
      logEvent("DISPATCH", `${id} released from Load / Unload.`, "good");
    }

    return vehicle;
  }

  function stationClear() {
    return !vehicles.some((vehicle) => {
      if (vehicle.faulted) return false;
      const outgoing = vehicle.distance;
      const incoming = totalLength - vehicle.distance;
      return outgoing < CONFIG.dispatchClearance || incoming < 95;
    });
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

    for (const other of vehicles) {
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
    if (vehicle.faulted) {
      vehicle.speed = 0;
      vehicle.state = "FAULT";
      return;
    }

    if (rideStopped) {
      vehicle.speed = 0;
      return;
    }

    if (vehicle.dwellRemaining > 0) {
      vehicle.dwellRemaining = Math.max(0, vehicle.dwellRemaining - dt);
      vehicle.speed = 0;
      vehicle.state = "STATION DWELL";

      if (vehicle.dwellRemaining === 0) {
        vehicle.state = "RUNNING";
        logEvent("DISPATCH", `${vehicle.id} station dwell complete; vehicle released.`, "good");
      }
      return;
    }

    const rideSpeedScale = Number(ui.speedRange.value) / 100;
    let targetSpeed = CONFIG.cruiseSpeed * rideSpeedScale;
    let spacingState = false;
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

    vehicle.state = spacingState ? "SPACING HOLD" : "RUNNING";

    const previousDistance = vehicle.distance;
    const rawNext = previousDistance + vehicle.speed * dt;

    if (rawNext >= totalLength) {
      vehicle.distance = rawNext - totalLength;
      vehicle.laps += 1;
      completedCycles += 1;
      vehicle.dwellRemaining = CONFIG.stationDwellSeconds;
      vehicle.speed = 0;
      vehicle.state = "STATION DWELL";
      logEvent("ARRIVAL", `${vehicle.id} returned to Load / Unload after lap ${vehicle.laps}.`, "good");
    } else {
      vehicle.distance = rawNext;
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

    for (const vehicle of vehicles) {
      updateVehicle(vehicle, dt);
    }

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
    const point = pointAtDistance(vehicle.distance);
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

    ctx.fillStyle = vehicle.faulted ? "#ff6471" : "#83d7e8";
    ctx.strokeStyle = vehicle.faulted ? "#8d2730" : "#254f5a";
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

    ui.activeMetric.textContent = String(vehicles.length);
    ui.completedMetric.textContent = String(completedCycles);
    ui.faultMetric.textContent = String(faultCount);

    const guestCompletions = completedCycles * CONFIG.seatsPerVehicle;
    const throughput = simulationSeconds >= 30
      ? Math.round(guestCompletions / (simulationSeconds / 3600))
      : 0;
    ui.throughputMetric.textContent = String(throughput);

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
    ui.vehicleLap.textContent = String(selected.laps);
    ui.faultBtn.disabled = selected.faulted;
    ui.recoverBtn.disabled = !selected.faulted;
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
    ui.eventLog.innerHTML = "";

    const seeded = [
      createVehicle(0, false),
      createVehicle(totalLength * 0.34, false),
      createVehicle(totalLength * 0.68, false),
    ];

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
    const vehicle = selectedVehicle();
    if (!vehicle || vehicle.faulted) return;

    vehicle.faulted = true;
    vehicle.speed = 0;
    vehicle.state = "FAULT";
    logEvent("FAULT", `${vehicle.id} fault injected. Vehicle immobilized.`, "error");
    updateUi();
  });

  ui.recoverBtn.addEventListener("click", () => {
    const vehicle = selectedVehicle();
    if (!vehicle || !vehicle.faulted) return;

    vehicle.faulted = false;
    vehicle.state = vehicle.dwellRemaining > 0 ? "STATION DWELL" : "RUNNING";
    logEvent("RECOVER", `${vehicle.id} fault cleared and vehicle returned to service.`, "good");
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
