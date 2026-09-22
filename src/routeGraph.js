(() => {
  "use strict";

  const DEFAULT_LAYOUT = {
    version: 1,
    nodes: [
      { id: "N0", x: 175, y: 610, kind: "station" },
      { id: "N1", x: 350, y: 610 },
      { id: "N2", x: 500, y: 555 },
      { id: "N3", x: 575, y: 455 },
      { id: "N4", x: 720, y: 420 },
      { id: "N5", x: 915, y: 465 },
      { id: "N6", x: 1015, y: 355 },
      { id: "N7", x: 930, y: 225 },
      { id: "N8", x: 765, y: 165 },
      { id: "N9", x: 595, y: 210 },
      { id: "N10", x: 475, y: 315 },
      { id: "N11", x: 310, y: 285 },
      { id: "N12", x: 190, y: 395 },
      { id: "M0", x: 82, y: 690, kind: "maintenance" },
    ],
    edges: [
      { id: "E0", from: "N0", to: "N1", kind: "mainline" },
      { id: "E1", from: "N1", to: "N2", kind: "mainline" },
      { id: "E2", from: "N2", to: "N3", kind: "mainline" },
      { id: "E3", from: "N3", to: "N4", kind: "mainline" },
      { id: "E4", from: "N4", to: "N5", kind: "mainline" },
      { id: "E5", from: "N5", to: "N6", kind: "mainline" },
      { id: "E6", from: "N6", to: "N7", kind: "mainline" },
      { id: "E7", from: "N7", to: "N8", kind: "mainline" },
      { id: "E8", from: "N8", to: "N9", kind: "mainline" },
      { id: "E9", from: "N9", to: "N10", kind: "mainline" },
      { id: "E10", from: "N10", to: "N11", kind: "mainline" },
      { id: "E11", from: "N11", to: "N12", kind: "mainline" },
      { id: "E12", from: "N12", to: "N0", kind: "mainline" },
      { id: "EM0", from: "N0", to: "M0", kind: "maintenance", bidirectional: true },
    ],
    mainline: ["N0","N1","N2","N3","N4","N5","N6","N7","N8","N9","N10","N11","N12"],
    maintenance: { switchNodeId: "N0", bayNodeId: "M0", edgeId: "EM0" },
  };

  class RouteGraph {
    constructor(layout = DEFAULT_LAYOUT) {
      this.load(layout);
    }

    load(layout) {
      const clone = JSON.parse(JSON.stringify(layout));
      this.version = clone.version || 1;
      this.nodes = new Map(clone.nodes.map((node) => [node.id, node]));
      this.edges = clone.edges;
      this.mainline = clone.mainline;
      this.maintenance = clone.maintenance;
      this.validate();
    }

    validate() {
      if (!Array.isArray(this.mainline) || this.mainline.length < 3) {
        throw new Error("Route graph requires at least three mainline nodes.");
      }

      for (const nodeId of this.mainline) {
        if (!this.nodes.has(nodeId)) {
          throw new Error(`Mainline node ${nodeId} is missing.`);
        }
      }

      for (const edge of this.edges) {
        if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
          throw new Error(`Edge ${edge.id} references a missing node.`);
        }
      }

      return true;
    }

    node(id) {
      return this.nodes.get(id) || null;
    }

    edge(id) {
      return this.edges.find((edge) => edge.id === id) || null;
    }

    outgoing(nodeId) {
      return this.edges.filter((edge) => edge.from === nodeId || (edge.bidirectional && edge.to === nodeId));
    }

    incoming(nodeId) {
      return this.edges.filter((edge) => edge.to === nodeId || (edge.bidirectional && edge.from === nodeId));
    }

    mainlineEdges() {
      return this.edges.filter((edge) => edge.kind === "mainline");
    }

    maintenanceEdge() {
      return this.edge(this.maintenance.edgeId);
    }

    setNodePosition(id, x, y) {
      const node = this.node(id);
      if (!node) return false;
      node.x = Number(x);
      node.y = Number(y);
      return Number.isFinite(node.x) && Number.isFinite(node.y);
    }

    mainlineCoordinates() {
      const points = this.mainline.map((id) => {
        const node = this.node(id);
        return { id, x: node.x, y: node.y };
      });
      return [...points, { ...points[0] }];
    }

    maintenanceCoordinates() {
      const from = this.node(this.maintenance.switchNodeId);
      const to = this.node(this.maintenance.bayNodeId);
      return [
        { id: this.maintenance.switchNodeId, x: from.x, y: from.y },
        { id: this.maintenance.bayNodeId, x: to.x, y: to.y },
      ];
    }

    closestMainlineNode(x, y, maxDistance = 28) {
      let best = null;
      let distance = Infinity;

      for (const id of this.mainline) {
        const node = this.node(id);
        const candidate = Math.hypot(x - node.x, y - node.y);
        if (candidate <= maxDistance && candidate < distance) {
          best = node;
          distance = candidate;
        }
      }

      return best;
    }

    toJSON() {
      return {
        version: this.version,
        nodes: [...this.nodes.values()].map((node) => ({ ...node })),
        edges: this.edges.map((edge) => ({ ...edge })),
        mainline: [...this.mainline],
        maintenance: { ...this.maintenance },
      };
    }
  }

  window.DarkRideRouteGraph = {
    RouteGraph,
    defaultLayout: () => JSON.parse(JSON.stringify(DEFAULT_LAYOUT)),
  };
})();