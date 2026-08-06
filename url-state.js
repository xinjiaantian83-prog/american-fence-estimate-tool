(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AmericanFenceUrlState = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PARAM_NAME = "estimate";
  const VERSION = 2;
  const VALID_SHAPES = new Set(["line", "l", "u", "box"]);

  function sanitizeCount(value) {
    const count = Number.parseInt(value, 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  function sanitizeDimension(value) {
    const dimension = Number.parseInt(value, 10);
    return Number.isFinite(dimension) && dimension > 0 ? dimension : 0;
  }

  function getShapeSegmentCount(shape) {
    if (shape === "l") return 2;
    if (shape === "u") return 3;
    if (shape === "box") return 4;
    return 1;
  }

  function getSegmentId(index) {
    return String.fromCharCode(65 + index);
  }

  function createSegment(id) {
    return {
      id,
      mode: "auto",
      targetMm: 3000,
      adoptedProposal: "large",
      panels: [
        { sku: "ST2-OAMF09", qty: 0 },
        { sku: "ST2-OAMF15", qty: 0 }
      ],
      gateEnabled: false,
      gateSku: "standard900",
      gatePositionPreset: "left",
      gatePosition: 0,
      gates: []
    };
  }

  function sanitizePanels(panels) {
    if (!Array.isArray(panels)) return createSegment("A").panels;
    return panels
      .filter((panel) => panel && typeof panel.sku === "string")
      .map((panel) => ({ sku: panel.sku, qty: sanitizeCount(panel.qty) }));
  }

  function sanitizeGates(gates) {
    if (!Array.isArray(gates)) return [];
    return gates
      .filter((gate) => gate && typeof gate.sku === "string")
      .map((gate) => ({
        sku: gate.sku,
        position: sanitizeCount(gate.position)
      }));
  }

  function sanitizeGatePositionPreset(value) {
    return ["left", "center", "right", "custom"].includes(value) ? value : "left";
  }

  function sanitizeSegments(segments, shape) {
    const count = getShapeSegmentCount(shape);
    const source = Array.isArray(segments) ? segments : [];
    return Array.from({ length: count }, (_, index) => {
      const fallback = createSegment(getSegmentId(index));
      const segment = source[index] || fallback;
      const gates = sanitizeGates(segment.gates);
      return {
        id: segment.id || fallback.id,
        mode: segment.mode === "manual" ? "manual" : "auto",
        targetMm: sanitizeDimension(segment.targetMm) || fallback.targetMm,
        adoptedProposal: segment.adoptedProposal === "small" ? "small" : "large",
        panels: sanitizePanels(segment.panels),
        gateEnabled: Boolean(segment.gateEnabled || gates.length > 0),
        gateSku: typeof segment.gateSku === "string" ? segment.gateSku : "standard900",
        gatePositionPreset: segment.gatePositionPreset
          ? sanitizeGatePositionPreset(segment.gatePositionPreset)
          : gates.length > 0 ? "custom" : "left",
        gatePosition: sanitizeCount(segment.gatePosition !== undefined ? segment.gatePosition : gates[0] && gates[0].position),
        gates
      };
    });
  }

  function sanitizeState(value, fallback) {
    const source = value && typeof value === "object" ? value : {};
    const base = fallback && typeof fallback === "object" ? fallback : {};
    const shape = VALID_SHAPES.has(source.shape) ? source.shape : base.shape || "line";
    const segments = sanitizeSegments(source.segments || base.segments, shape);

    return {
      shape,
      selectedSegmentId: segments.some((segment) => segment.id === source.selectedSegmentId)
        ? source.selectedSegmentId
        : segments[0].id,
      segments
    };
  }

  function base64UrlEncode(text) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(text, "utf8").toString("base64url");
    }

    const binary = btoa(unescape(encodeURIComponent(text)));
    return binary.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlDecode(text) {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(text, "base64url").toString("utf8");
    }

    const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return decodeURIComponent(escape(atob(padded)));
  }

  function encodeState(state) {
    const normalized = sanitizeState(state, {});
    return base64UrlEncode(JSON.stringify({
      v: VERSION,
      shape: normalized.shape,
      selectedSegmentId: normalized.selectedSegmentId,
      segments: normalized.segments
    }));
  }

  function decodeLegacyState(parsed, fallback) {
    const shape = VALID_SHAPES.has(parsed.s) ? parsed.s : fallback.shape || "line";
    const count = getShapeSegmentCount(shape);
    const firstSegment = createSegment("A");
    firstSegment.mode = "manual";
    firstSegment.targetMm = 0;
    firstSegment.panels = [
      { sku: "ST2-OAMF09", qty: sanitizeCount(parsed.p09) },
      { sku: "ST2-OAMF15", qty: sanitizeCount(parsed.p15) }
    ];
    firstSegment.gates = Array.from({ length: sanitizeCount(parsed.g) }, (_, index) => ({
      sku: "standard900",
      position: index
    }));
    firstSegment.gateEnabled = firstSegment.gates.length > 0;
    firstSegment.gatePositionPreset = "custom";
    firstSegment.gatePosition = 0;

    return {
      shape,
      selectedSegmentId: "A",
      segments: [firstSegment, ...Array.from({ length: count - 1 }, (_, index) => createSegment(getSegmentId(index + 1)))]
    };
  }

  function decodeState(serialized, fallback) {
    if (!serialized) return null;

    try {
      const parsed = JSON.parse(base64UrlDecode(serialized));
      if (!parsed || !parsed.v) return null;
      if (parsed.v === 1) return decodeLegacyState(parsed, fallback || {});
      if (parsed.v !== VERSION) return null;
      return sanitizeState(parsed, fallback);
    } catch {
      return null;
    }
  }

  function readStateFromUrl(search, fallback) {
    const params = new URLSearchParams(search || "");
    return decodeState(params.get(PARAM_NAME), fallback);
  }

  function writeStateToUrl(url, state) {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set(PARAM_NAME, encodeState(state));
    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  }

  return Object.freeze({
    PARAM_NAME,
    sanitizeState,
    encodeState,
    decodeState,
    readStateFromUrl,
    writeStateToUrl
  });
});
