const assert = require("node:assert/strict");
const {
  PARAM_NAME,
  sanitizeState,
  encodeState,
  decodeState,
  readStateFromUrl,
  writeStateToUrl
} = require("./url-state.js");

const initialState = {
  shape: "line",
  selectedSegmentId: "A",
  segments: [
    {
      id: "A",
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
    }
  ]
};

const state = {
  shape: "u",
  selectedSegmentId: "B",
  segments: [
    { id: "A", mode: "auto", targetMm: 3000, adoptedProposal: "large", panels: [], gateEnabled: false, gateSku: "standard900", gatePositionPreset: "left", gatePosition: 0, gates: [] },
    {
      id: "B",
      mode: "manual",
      targetMm: 2500,
      adoptedProposal: "small",
      panels: [
        { sku: "ST2-OAMF09", qty: 1 },
        { sku: "ST2-OAMF15", qty: 1 }
      ],
      gateEnabled: true,
      gateSku: "standard900",
      gatePositionPreset: "custom",
      gatePosition: 1,
      gates: [{ sku: "standard900", position: 1 }]
    },
    { id: "C", mode: "auto", targetMm: 3000, adoptedProposal: "small", panels: [], gateEnabled: false, gateSku: "standard900", gatePositionPreset: "left", gatePosition: 0, gates: [] }
  ]
};

const encoded = encodeState(state);
assert.equal(typeof encoded, "string");
assert.ok(encoded.length > 0);
assert.deepEqual(decodeState(encoded, initialState), state);
assert.equal(decodeState(encodeState({ ...state, shape: "l" }), initialState).shape, "l");
assert.equal(decodeState(encodeState({ ...state, shape: "l" }), initialState).segments.length, 2);

const url = writeStateToUrl("https://example.test/tool/?foo=1#summary", state);
assert.ok(url.startsWith("/tool/?foo=1&"));
assert.ok(url.includes(`${PARAM_NAME}=`));
assert.ok(url.endsWith("#summary"));
assert.deepEqual(readStateFromUrl(url.split("?")[1].split("#")[0], initialState), state);

assert.equal(decodeState("broken", initialState), null);
assert.equal(readStateFromUrl("?foo=1", initialState), null);
assert.deepEqual(
  sanitizeState({ shape: "bad", segments: [{ id: "A", mode: "manual", targetMm: -1, panels: [{ sku: "ST2-OAMF09", qty: "4" }], gates: [] }] }, initialState),
  {
    shape: "line",
    selectedSegmentId: "A",
    segments: [
      {
        id: "A",
        mode: "manual",
        targetMm: 3000,
        adoptedProposal: "large",
        panels: [{ sku: "ST2-OAMF09", qty: 4 }],
        gateEnabled: false,
        gateSku: "standard900",
        gatePositionPreset: "left",
        gatePosition: 0,
        gates: []
      }
    ]
  }
);

const legacy = decodeState("eyJ2IjoxLCJzIjoiYm94IiwicDE1IjoyLCJwMDkiOjUsImciOjF9", initialState);
assert.equal(legacy.shape, "box");
assert.equal(legacy.segments.length, 4);
assert.deepEqual(legacy.segments[0].panels, [
  { sku: "ST2-OAMF09", qty: 5 },
  { sku: "ST2-OAMF15", qty: 2 }
]);
assert.equal(legacy.segments[0].gateEnabled, true);
assert.equal(legacy.segments[0].gatePositionPreset, "custom");
assert.equal(legacy.segments[0].gates.length, 1);

console.log("url-state tests passed");
