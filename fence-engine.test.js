const assert = require("node:assert/strict");
const {
  PRODUCT_MASTER,
  estimateFenceLayout,
  findFenceCombinations,
  findFenceLayoutCombinations,
  getPostCount,
  getJointCount,
  calculateAmounts
} = require("./fence-engine.js");

assert.equal(PRODUCT_MASTER.panels["ST2-OAMF09"].installSpanMm, 1055);
assert.equal(PRODUCT_MASTER.panels["ST2-OAMF15"].installSpanMm, 1655);
assert.equal(PRODUCT_MASTER.posts["ST2-OAMP15"].size, "φ32×1500");
assert.equal(PRODUCT_MASTER.posts["ST2-OAMP20"].size, "φ32×2000");
assert.equal(PRODUCT_MASTER.fittings["ST2-OAMJNT"].size, "約40×133");

const line = findFenceCombinations(3310, { limit: 5 });
assert.equal(line[0].achievedMm, 3310);
assert.equal(line[0].differenceMm, 0);
assert.equal(line[0].panelCounts["ST2-OAMF15"], 2);
assert.equal(line[0].panelCounts["ST2-OAMF09"], 0);

const onePanel900 = findFenceCombinations(1055, { limit: 1 });
assert.equal(onePanel900[0].differenceMm, 0);
assert.equal(onePanel900[0].panelCounts["ST2-OAMF09"], 1);

const onePanel1500 = findFenceCombinations(1655, { limit: 1 });
assert.equal(onePanel1500[0].differenceMm, 0);
assert.equal(onePanel1500[0].panelCounts["ST2-OAMF15"], 1);

const mixed = findFenceCombinations(2710, { limit: 3 });
assert.equal(mixed[0].achievedMm, 2710);
assert.equal(mixed[0].panelCounts["ST2-OAMF15"], 1);
assert.equal(mixed[0].panelCounts["ST2-OAMF09"], 1);

const near = findFenceCombinations(3000, { limit: 3 });
assert.deepEqual(
  near.map((item) => item.absDifferenceMm),
  [...near.map((item) => item.absDifferenceMm)].sort((a, b) => a - b)
);

const uniqueKeys = new Set(
  findFenceCombinations(2710, { limit: 20 }).map((item) => JSON.stringify(item.panelCounts))
);
assert.equal(uniqueKeys.size, findFenceCombinations(2710, { limit: 20 }).length);

assert.equal(getPostCount(3, "line"), 4);
assert.equal(getPostCount(3, "l"), 4);
assert.equal(getPostCount(3, "u"), 4);
assert.equal(getPostCount(3, "box"), 3);
assert.equal(getJointCount({ "ST2-OAMF09": 2, "ST2-OAMF15": 1 }), 16);

const zero = findFenceCombinations(0, { limit: 1 });
assert.equal(zero[0].achievedMm, 0);
assert.equal(zero[0].materials.posts.quantity, 0);
assert.equal(zero[0].materials.joints.quantity, 0);

const oneMm = findFenceCombinations(1, { limit: 1 });
assert.equal(oneMm[0].panelCount, 1);
assert.equal(oneMm[0].achievedMm, 1055);

const gate = findFenceCombinations(1000, {
  limit: 1,
  maxPanelCount: 0,
  gates: { count: 1, orientation: "vertical" },
  includeAmounts: true
});
assert.equal(gate[0].differenceMm, 0);
assert.equal(gate[0].materials.panels["ST2-OAMF09"], 1);
assert.equal(gate[0].materials.joints.quantity, 0);
assert.equal(gate[0].materials.additionalFittings.hinge, 2);
assert.equal(gate[0].materials.additionalFittings.latch, 2);
assert.ok(gate[0].amounts.lineItems.some((item) => item.sku === "hinge"));
assert.ok(gate[0].amounts.lineItems.some((item) => item.sku === "latch"));

const lShape = findFenceLayoutCombinations({
  shape: "l",
  segmentsMm: [1655, 2110],
  limit: 3,
  beamWidth: 1000,
  includeAmounts: true
});
assert.equal(lShape[0].differenceMm, 0);
assert.equal(lShape[0].materials.posts.quantity, 4);
assert.equal(lShape[0].segments.length, 2);
assert.ok(lShape[0].amounts.listTotal > 0);
assert.equal(lShape[0].search.pruned, false);

const box = findFenceLayoutCombinations({
  shape: "box",
  segmentsMm: [1655, 1655, 1055, 1055],
  limit: 1
});
assert.equal(box[0].materials.posts.quantity, box[0].panelCount);

const quoted = calculateAmounts({
  panels: { "ST2-OAMF15": 2 },
  posts: { sku: "ST2-OAMP15", quantity: 3 },
  joints: { sku: "ST2-OAMJNT", quantity: 8 },
  additionalFittings: {}
});
assert.equal(quoted.listTotal, 2 * 20800 + 3 * 7800 + 8 * 1700);
assert.equal(quoted.costTotal, 2 * 13520 + 3 * 5070 + 8 * 1105);

const longStart = Date.now();
const long = findFenceCombinations(100000, { limit: 10 });
assert.equal(long.length, 10);
assert.ok(Date.now() - longStart < 1000);

assert.throws(() => findFenceCombinations(-1), /non-negative number/);
assert.throws(() => findFenceLayoutCombinations({ segmentsMm: [] }), /at least one/);
assert.throws(() => findFenceCombinations(1000, { panelSkus: ["missing"] }), /Unknown panel SKU/);
assert.throws(() => findFenceCombinations(1000, { postSku: "missing" }), /Unknown post SKU/);
assert.throws(
  () => findFenceLayoutCombinations({ segmentsMm: [1000, 1000], gates: { count: 1 } }),
  /single-segment/
);

const mixedLayout = estimateFenceLayout({
  shape: "u",
  segments: [
    {
      id: "A",
      targetMm: 3000,
      mode: "auto",
      panels: null,
      gates: []
    },
    {
      id: "B",
      targetMm: 2500,
      mode: "manual",
      panels: [
        { sku: "ST2-OAMF09", qty: 1 },
        { sku: "ST2-OAMF15", qty: 1 }
      ],
      gates: [
        {
          sku: "standard900",
          position: 1
        }
      ]
    },
    {
      id: "C",
      targetMm: 3000,
      mode: "auto",
      panels: null,
      gates: []
    }
  ]
});
assert.equal(mixedLayout.shape, "u");
assert.equal(mixedLayout.segments.length, 3);
assert.equal(mixedLayout.segments[0].mode, "auto");
assert.equal(mixedLayout.segments[1].mode, "manual");
assert.equal(mixedLayout.segments[0].actualMm, 3165);
assert.equal(mixedLayout.segments[1].actualMm, 3710);
assert.equal(mixedLayout.segments[1].gates.length, 1);
assert.equal(mixedLayout.segments[1].posts, 4);
assert.equal(mixedLayout.segments[1].items.find((item) => item.sku === "ST2-OAMF09").qty, 2);
assert.equal(mixedLayout.totals.posts, 10);
assert.equal(mixedLayout.totals.joints, 46);
assert.equal(mixedLayout.drawing.segments[0].direction, "right");
assert.equal(mixedLayout.drawing.segments[1].direction, "down");
assert.equal(mixedLayout.drawing.segments[2].direction, "left");
assert.equal(mixedLayout.drawing.segments[1].sequence.filter((item) => item.type === "gate").length, 1);
assert.equal(
  mixedLayout.drawing.segments.reduce((total, segment) => {
    return total + segment.sequence.filter((item) => item.type === "panel").length;
  }, 0),
  mixedLayout.segments.reduce((total, segment) => {
    return total + segment.panels.reduce((panelTotal, panel) => panelTotal + panel.qty, 0);
  }, 0)
);

const itemBySku = new Map(mixedLayout.items.map((item) => [item.sku, item]));
assert.deepEqual(itemBySku.get("ST2-OAMF15").segmentIds, ["B"]);
assert.deepEqual(itemBySku.get("ST2-OAMJNT").segmentIds, ["A", "B", "C"]);
assert.equal(itemBySku.get("ST2-OAMP15").qty, 10);
assert.equal(itemBySku.get("hinge").qty, 2);
assert.equal(mixedLayout.totals.amountExTax, mixedLayout.items.reduce((total, item) => total + item.subtotal, 0));
assert.ok(mixedLayout.warnings.some((warning) => warning.code === "LONGER_THAN_TARGET"));

const lNew = estimateFenceLayout({
  shape: "l",
  segments: [
    { id: "A", targetMm: 1055, mode: "manual", panels: [{ sku: "ST2-OAMF09", qty: 1 }], gates: [] },
    { id: "B", targetMm: 1655, mode: "manual", panels: [{ sku: "ST2-OAMF15", qty: 1 }], gates: [] }
  ]
});
assert.equal(lNew.segments[0].posts + lNew.segments[1].posts, 4);
assert.equal(lNew.totals.posts, 3);

const boxNew = estimateFenceLayout({
  shape: "box",
  segments: [
    { id: "A", targetMm: 1655, mode: "manual", panels: [{ sku: "ST2-OAMF15", qty: 1 }], gates: [] },
    { id: "B", targetMm: 1055, mode: "manual", panels: [{ sku: "ST2-OAMF09", qty: 1 }], gates: [] },
    { id: "C", targetMm: 1655, mode: "manual", panels: [{ sku: "ST2-OAMF15", qty: 1 }], gates: [] },
    { id: "D", targetMm: 1055, mode: "manual", panels: [{ sku: "ST2-OAMF09", qty: 1 }], gates: [] }
  ]
});
assert.equal(boxNew.totals.posts, 4);
assert.ok(!boxNew.warnings.some((warning) => warning.code === "BOX_CLOSURE_MISMATCH"));

const boxMismatch = estimateFenceLayout({
  shape: "box",
  segments: [
    { id: "A", targetMm: 1655, mode: "manual", panels: [{ sku: "ST2-OAMF15", qty: 1 }], gates: [] },
    { id: "B", targetMm: 1055, mode: "manual", panels: [{ sku: "ST2-OAMF09", qty: 1 }], gates: [] },
    { id: "C", targetMm: 1055, mode: "manual", panels: [{ sku: "ST2-OAMF09", qty: 1 }], gates: [] },
    { id: "D", targetMm: 1055, mode: "manual", panels: [{ sku: "ST2-OAMF09", qty: 1 }], gates: [] }
  ]
});
assert.ok(boxMismatch.warnings.some((warning) => warning.code === "BOX_CLOSURE_MISMATCH"));

const invalidGate = estimateFenceLayout({
  shape: "line",
  segments: [
    {
      id: "A",
      targetMm: 1055,
      mode: "manual",
      panels: [{ sku: "ST2-OAMF09", qty: 1 }],
      gates: [{ sku: "standard900", position: 99 }]
    }
  ]
});
assert.ok(invalidGate.warnings.some((warning) => warning.code === "INVALID_GATE_POSITION"));
assert.equal(invalidGate.segments[0].gates.length, 0);

const emptyManual = estimateFenceLayout({
  shape: "line",
  segments: [{ id: "A", targetMm: 1000, mode: "manual", panels: [], gates: [] }]
});
assert.ok(emptyManual.warnings.some((warning) => warning.code === "EMPTY_MANUAL_CONFIGURATION"));
assert.ok(emptyManual.warnings.some((warning) => warning.code === "SHORTER_THAN_TARGET"));

const unsupported = estimateFenceLayout({
  shape: "line",
  segments: [
    {
      id: "A",
      targetMm: 1000,
      mode: "manual",
      panels: [{ sku: "UNKNOWN", qty: 1 }],
      gates: [{ sku: "UNKNOWN_GATE", position: 0 }]
    }
  ]
});
assert.ok(unsupported.warnings.some((warning) => warning.code === "UNSUPPORTED_SKU"));

const nonPositive = estimateFenceLayout({
  shape: "line",
  segments: [{ id: "A", targetMm: 0, mode: "auto", panels: null, gates: [] }]
});
assert.ok(nonPositive.warnings.some((warning) => warning.code === "NON_POSITIVE_DIMENSION"));

console.log("fence-engine tests passed");
