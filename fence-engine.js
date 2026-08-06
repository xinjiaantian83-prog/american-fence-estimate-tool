(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.AmericanFenceEngine = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PRODUCT_MASTER = Object.freeze({
    panels: Object.freeze({
      "ST2-OAMF09": Object.freeze({
        sku: "ST2-OAMF09",
        name: "オンリーワン アメリカンフェンス フェンス 900×900",
        nominalWidthMm: 900,
        nominalHeightMm: 900,
        pipeDiameterMm: 32,
        orientation: "vertical",
        installSpanMm: 1055,
        installSpanLabel: "縦張り時の柱芯々",
        listPrice: 16200,
        costPrice: 10530,
        source: "公式図面 m20-st2-oamz.pdf P.1 / 公式商品ページ ST2-OAMF09"
      }),
      "ST2-OAMF15": Object.freeze({
        sku: "ST2-OAMF15",
        name: "オンリーワン アメリカンフェンス フェンス 1500×900",
        nominalWidthMm: 1500,
        nominalHeightMm: 900,
        pipeDiameterMm: 32,
        orientation: "horizontal",
        installSpanMm: 1655,
        installSpanLabel: "横張り時の柱芯々",
        listPrice: 20800,
        costPrice: 13520,
        source: "公式図面 m20-st2-oamz.pdf P.1 / 公式商品ページ ST2-OAMF15"
      })
    }),
    posts: Object.freeze({
      "ST2-OAMP15": Object.freeze({
        sku: "ST2-OAMP15",
        name: "オンリーワン アメリカンフェンス ポール H1500",
        size: "φ32×1500",
        recommendedUse: "横張り推奨",
        listPrice: 7800,
        costPrice: 5070,
        source: "公式商品ページ ST2-OAMP15"
      }),
      "ST2-OAMP20": Object.freeze({
        sku: "ST2-OAMP20",
        name: "オンリーワン アメリカンフェンス ポール H2000",
        size: "φ32×2000",
        recommendedUse: "縦張り推奨",
        listPrice: 9600,
        costPrice: 6240,
        source: "公式商品ページ ST2-OAMP20"
      })
    }),
    gates: Object.freeze({
      standard900: Object.freeze({
        sku: "standard900",
        name: "片開き門扉",
        panelSku: "ST2-OAMF09",
        installSpanMmByOrientation: Object.freeze({ vertical: 1000, horizontal: 1600 }),
        hingeQuantity: 2,
        latchQuantity: 2,
        source: "既存見積ツール仕様 / 公式図面 m20-st2-oamz.pdf P.1"
      })
    }),
    fittings: Object.freeze({
      "ST2-OAMJNT": Object.freeze({
        sku: "ST2-OAMJNT",
        name: "オンリーワン アメリカンフェンス ジョイント",
        size: "約40×133",
        usePerPanel: Object.freeze({ vertical: 6, horizontal: 4 }),
        listPrice: 1700,
        costPrice: 1105,
        source: "公式商品ページ ST2-OAMJNT"
      }),
      hinge: Object.freeze({
        sku: "hinge",
        name: "ヒンジ",
        listPrice: 2200,
        costPrice: 1430,
        source: "既存見積ツールの商品マスタ"
      }),
      latch: Object.freeze({
        sku: "latch",
        name: "ドアラッチ",
        listPrice: 2000,
        costPrice: 1300,
        source: "既存見積ツールの商品マスタ"
      })
    })
  });

  const DEFAULT_PANEL_SKUS = Object.freeze(["ST2-OAMF09", "ST2-OAMF15"]);
  const OPEN_SHAPES = new Set(["line", "straight", "l", "u"]);
  const CLOSED_SHAPES = new Set(["box", "rectangle", "closed"]);
  const TAX_RATE = 0.1;

  function assertNonNegativeNumber(value, name) {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(`${name} must be a non-negative number.`);
    }
  }

  function toSafeInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  }

  function getPanels(panelSkus) {
    const skus = panelSkus && panelSkus.length ? panelSkus : DEFAULT_PANEL_SKUS;
    return skus.map((sku) => {
      const panel = PRODUCT_MASTER.panels[sku];
      if (!panel) {
        throw new Error(`Unknown panel SKU: ${sku}`);
      }
      return panel;
    });
  }

  function getPost(postSku) {
    const post = PRODUCT_MASTER.posts[postSku];
    if (!post) {
      throw new Error(`Unknown post SKU: ${postSku}`);
    }
    return post;
  }

  function getFitting(fittingSku) {
    const fitting = PRODUCT_MASTER.fittings[fittingSku];
    if (!fitting) {
      throw new Error(`Unknown fitting SKU: ${fittingSku}`);
    }
    return fitting;
  }

  function getGate(gateSku) {
    const gate = PRODUCT_MASTER.gates[gateSku];
    if (!gate) {
      throw new Error(`Unknown gate SKU: ${gateSku}`);
    }
    return gate;
  }

  function getShapeKind(shape) {
    const normalized = String(shape || "line").toLowerCase();
    if (CLOSED_SHAPES.has(normalized)) return "closed";
    if (OPEN_SHAPES.has(normalized)) return "open";
    throw new Error(`Unknown fence shape: ${shape}`);
  }

  function getPostCount(sectionCount, shape) {
    if (sectionCount <= 0) return 0;
    return getShapeKind(shape) === "closed" ? sectionCount : sectionCount + 1;
  }

  function getJointCount(panelCountsBySku) {
    const joint = PRODUCT_MASTER.fittings["ST2-OAMJNT"];
    return Object.entries(panelCountsBySku).reduce((total, entry) => {
      const sku = entry[0];
      const count = entry[1];
      const panel = PRODUCT_MASTER.panels[sku];
      if (!panel) {
        throw new Error(`Unknown panel SKU: ${sku}`);
      }
      const orientation = panel.orientation;
      return total + count * joint.usePerPanel[orientation];
    }, 0);
  }

  function buildMaterialSummary(panelCountsBySku, shape, postSku, gateSpec) {
    getPost(postSku);
    const panels = {};
    let panelCount = 0;
    const gate = normalizeGateSpec(gateSpec);

    Object.entries(panelCountsBySku).forEach(([sku, quantity]) => {
      if (!PRODUCT_MASTER.panels[sku]) {
        throw new Error(`Unknown panel SKU: ${sku}`);
      }
      if (quantity > 0) {
        panels[sku] = quantity;
        panelCount += quantity;
      }
    });

    if (gate.count > 0) {
      panels[gate.item.panelSku] = (panels[gate.item.panelSku] || 0) + gate.count;
    }

    const sectionCount = panelCount + gate.count;

    return {
      panels,
      gates: gate.count > 0 ? {
        sku: gate.item.sku,
        quantity: gate.count,
        orientation: gate.orientation
      } : null,
      posts: {
        sku: postSku,
        quantity: getPostCount(sectionCount, shape)
      },
      joints: {
        sku: "ST2-OAMJNT",
        quantity: getJointCount(panelCountsBySku)
      },
      additionalFittings: gate.count > 0 ? {
        hinge: gate.count * gate.item.hingeQuantity,
        latch: gate.count * gate.item.latchQuantity
      } : {}
    };
  }

  function calculateAmounts(materials) {
    if (!materials || !materials.panels || !materials.posts || !materials.joints) {
      throw new TypeError("materials must contain panels, posts, and joints.");
    }

    let listTotal = 0;
    let costTotal = 0;
    const lineItems = [];

    Object.entries(materials.panels).forEach(([sku, quantity]) => {
      const item = PRODUCT_MASTER.panels[sku];
      if (!item) throw new Error(`Unknown panel SKU: ${sku}`);
      const listAmount = item.listPrice * quantity;
      const costAmount = item.costPrice * quantity;
      lineItems.push({ sku, name: item.name, quantity, listAmount, costAmount });
      listTotal += listAmount;
      costTotal += costAmount;
    });

    const post = getPost(materials.posts.sku);
    const postListAmount = post.listPrice * materials.posts.quantity;
    const postCostAmount = post.costPrice * materials.posts.quantity;
    if (materials.posts.quantity > 0) {
      lineItems.push({
        sku: post.sku,
        name: post.name,
        quantity: materials.posts.quantity,
        listAmount: postListAmount,
        costAmount: postCostAmount
      });
    }
    listTotal += postListAmount;
    costTotal += postCostAmount;

    const joint = getFitting(materials.joints.sku);
    const jointListAmount = joint.listPrice * materials.joints.quantity;
    const jointCostAmount = joint.costPrice * materials.joints.quantity;
    if (materials.joints.quantity > 0) {
      lineItems.push({
        sku: joint.sku,
        name: joint.name,
        quantity: materials.joints.quantity,
        listAmount: jointListAmount,
        costAmount: jointCostAmount
      });
    }
    listTotal += jointListAmount;
    costTotal += jointCostAmount;

    Object.entries(materials.additionalFittings || {}).forEach(([sku, quantity]) => {
      const fitting = getFitting(sku);
      const listAmount = fitting.listPrice * quantity;
      const costAmount = fitting.costPrice * quantity;
      if (quantity > 0) {
        lineItems.push({ sku, name: fitting.name, quantity, listAmount, costAmount });
      }
      listTotal += listAmount;
      costTotal += costAmount;
    });

    return { listTotal, costTotal, lineItems };
  }

  function createEmptyPanelCounts(panels) {
    return panels.reduce((counts, panel) => {
      counts[panel.sku] = 0;
      return counts;
    }, {});
  }

  function enumeratePanelCounts(panels, maxPanelCount, visit) {
    const counts = createEmptyPanelCounts(panels);

    function walk(index, remaining) {
      if (index === panels.length - 1) {
        counts[panels[index].sku] = remaining;
        visit({ ...counts });
        return;
      }

      for (let count = 0; count <= remaining; count += 1) {
        counts[panels[index].sku] = count;
        walk(index + 1, remaining - count);
      }
    }

    for (let totalPanels = 0; totalPanels <= maxPanelCount; totalPanels += 1) {
      walk(0, totalPanels);
    }
  }

  function normalizeGateSpec(gateSpec) {
    if (!gateSpec) {
      return { count: 0, orientation: "vertical", item: PRODUCT_MASTER.gates.standard900 };
    }

    const item = getGate(gateSpec.sku || "standard900");
    const orientation = gateSpec.orientation || "vertical";
    if (!item.installSpanMmByOrientation[orientation]) {
      throw new Error(`Unknown gate orientation: ${orientation}`);
    }

    return {
      count: toSafeInteger(gateSpec.count, 0),
      orientation,
      item
    };
  }

  function normalizeSegmentOptions(targetMm, options) {
    assertNonNegativeNumber(targetMm, "targetMm");
    const panels = getPanels(options.panelSkus);
    getPost(options.postSku || "ST2-OAMP15");
    const gates = normalizeGateSpec(options.gates);
    const minSpan = Math.min(...panels.map((panel) => panel.installSpanMm));
    const defaultMinimumPanelCount = targetMm === 0 || gates.count > 0 ? 0 : 1;
    const minimumPanelCount = toSafeInteger(options.minPanelCount, defaultMinimumPanelCount);
    const maxPanelCount = toSafeInteger(
      options.maxPanelCount,
      Math.max(minimumPanelCount, Math.ceil(targetMm / minSpan) + toSafeInteger(options.extraPanelCount, 3))
    );

    return {
      panels,
      maxPanelCount,
      minimumPanelCount,
      limit: toSafeInteger(options.limit, 20),
      toleranceMm: Number.isFinite(options.toleranceMm) ? Math.abs(options.toleranceMm) : Infinity,
      includeAmounts: Boolean(options.includeAmounts),
      shape: options.shape || "line",
      postSku: options.postSku || "ST2-OAMP15",
      gates
    };
  }

  function makeSegmentResult(targetMm, panelCountsBySku, options) {
    const achievedMm = options.panels.reduce((total, panel) => {
      return total + panelCountsBySku[panel.sku] * panel.installSpanMm;
    }, options.gates.count * options.gates.item.installSpanMmByOrientation[options.gates.orientation]);
    const panelCount = Object.values(panelCountsBySku).reduce((total, count) => total + count, 0);
    const sectionCount = panelCount + options.gates.count;
    const differenceMm = achievedMm - targetMm;
    const materials = buildMaterialSummary(panelCountsBySku, options.shape, options.postSku, options.gates);
    const result = {
      targetMm,
      achievedMm,
      differenceMm,
      absDifferenceMm: Math.abs(differenceMm),
      panelCount,
      sectionCount,
      panelCounts: panelCountsBySku,
      materials
    };

    if (options.includeAmounts) {
      result.amounts = calculateAmounts(materials);
    }

    return result;
  }

  function sortResults(a, b) {
    return (
      a.absDifferenceMm - b.absDifferenceMm ||
      a.panelCount - b.panelCount ||
      (b.panelCounts["ST2-OAMF15"] || 0) - (a.panelCounts["ST2-OAMF15"] || 0) ||
      a.achievedMm - b.achievedMm
    );
  }

  function findFenceCombinations(targetMm, options) {
    const normalizedOptions = normalizeSegmentOptions(targetMm, options || {});
    const results = [];

    enumeratePanelCounts(normalizedOptions.panels, normalizedOptions.maxPanelCount, (panelCounts) => {
      const panelCount = Object.values(panelCounts).reduce((total, count) => total + count, 0);
      if (panelCount < normalizedOptions.minimumPanelCount) return;
      const result = makeSegmentResult(targetMm, panelCounts, normalizedOptions);
      if (result.absDifferenceMm <= normalizedOptions.toleranceMm) {
        results.push(result);
      }
    });

    return results.sort(sortResults).slice(0, normalizedOptions.limit);
  }

  function combineCounts(left, right) {
    const combined = { ...left };
    Object.entries(right).forEach(([sku, count]) => {
      combined[sku] = (combined[sku] || 0) + count;
    });
    return combined;
  }

  function findFenceLayoutCombinations(config) {
    const options = config || {};
    const segmentsMm = Array.isArray(options.segmentsMm) ? options.segmentsMm : [options.targetMm];
    if (!segmentsMm.length) {
      throw new TypeError("segmentsMm must contain at least one target length.");
    }
    if (options.gates && segmentsMm.length > 1) {
      throw new Error("gates are supported for single-segment searches only. Use per-segment gate placement before quoting multi-segment layouts.");
    }

    const shape = options.shape || (segmentsMm.length === 1 ? "line" : "l");
    const limit = toSafeInteger(options.limit, 20);
    const beamWidth = toSafeInteger(options.beamWidth, Math.max(limit * 50, 200));
    const postSku = options.postSku || "ST2-OAMP15";
    const segmentOptions = {
      ...options,
      limit: Number.MAX_SAFE_INTEGER,
      shape: "line",
      postSku,
      gates: segmentsMm.length === 1 ? options.gates : null,
      includeAmounts: false
    };
    getShapeKind(shape);

    const segmentResults = segmentsMm.map((targetMm) => findFenceCombinations(targetMm, segmentOptions));
    if (segmentResults.some((results) => results.length === 0)) return [];

    let layouts = [
      {
        segments: [],
        targetMm: 0,
        achievedMm: 0,
        panelCount: 0,
        sectionCount: 0,
        panelCounts: {}
      }
    ];
    let pruned = false;

    segmentResults.forEach((resultsForSegment, segmentIndex) => {
      const nextLayouts = [];
      layouts.forEach((layout) => {
        resultsForSegment.forEach((segment) => {
          nextLayouts.push({
            segments: layout.segments.concat([{ index: segmentIndex, ...segment }]),
            targetMm: layout.targetMm + segment.targetMm,
            achievedMm: layout.achievedMm + segment.achievedMm,
            panelCount: layout.panelCount + segment.panelCount,
            sectionCount: layout.sectionCount + segment.sectionCount,
            panelCounts: combineCounts(layout.panelCounts, segment.panelCounts)
          });
        });
      });
      pruned = pruned || nextLayouts.length > beamWidth;
      layouts = nextLayouts.sort((a, b) => {
        const aDiff = Math.abs(a.achievedMm - a.targetMm);
        const bDiff = Math.abs(b.achievedMm - b.targetMm);
        return aDiff - bDiff || a.panelCount - b.panelCount;
      }).slice(0, beamWidth);
    });

    return layouts.map((layout) => {
      const differenceMm = layout.achievedMm - layout.targetMm;
      const gates = segmentsMm.length === 1 ? normalizeGateSpec(options.gates) : normalizeGateSpec(null);
      const materials = buildMaterialSummary(layout.panelCounts, shape, postSku, gates);
      const result = {
        shape,
        targetMm: layout.targetMm,
        achievedMm: layout.achievedMm,
        differenceMm,
        absDifferenceMm: Math.abs(differenceMm),
        panelCount: layout.panelCount,
        sectionCount: layout.sectionCount + gates.count,
        panelCounts: layout.panelCounts,
        segments: layout.segments,
        materials,
        search: {
          pruned,
          beamWidth,
          segmentCandidateCounts: segmentResults.map((results) => results.length)
        }
      };

      if (options.includeAmounts) {
        result.amounts = calculateAmounts(materials);
      }

      return result;
    }).sort(sortResults).slice(0, limit);
  }

  function formatMm(value) {
    return `約${Math.round(value).toLocaleString("ja-JP")}mm`;
  }

  function normalizeShape(shape) {
    const normalized = String(shape || "line").toLowerCase();
    if (normalized === "straight") return "line";
    if (normalized === "rectangle" || normalized === "closed") return "box";
    getShapeKind(normalized);
    return normalized;
  }

  function getSharedCornerCount(shape) {
    const normalized = normalizeShape(shape);
    if (normalized === "l") return 1;
    if (normalized === "u") return 2;
    if (normalized === "box") return 4;
    return 0;
  }

  function getExpectedSegmentCount(shape) {
    const normalized = normalizeShape(shape);
    if (normalized === "l") return 2;
    if (normalized === "u") return 3;
    if (normalized === "box") return 4;
    return 1;
  }

  function getSegmentVector(shape, index) {
    const normalized = normalizeShape(shape);
    const vectors = {
      line: [
        { orientation: "horizontal", direction: "right", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }
      ],
      l: [
        { orientation: "horizontal", direction: "right", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
        { orientation: "vertical", direction: "down", start: { x: 1, y: 0 }, end: { x: 1, y: 1 } }
      ],
      u: [
        { orientation: "horizontal", direction: "right", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
        { orientation: "vertical", direction: "down", start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
        { orientation: "horizontal", direction: "left", start: { x: 1, y: 1 }, end: { x: 0, y: 1 } }
      ],
      box: [
        { orientation: "horizontal", direction: "right", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
        { orientation: "vertical", direction: "down", start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
        { orientation: "horizontal", direction: "left", start: { x: 1, y: 1 }, end: { x: 0, y: 1 } },
        { orientation: "vertical", direction: "up", start: { x: 0, y: 1 }, end: { x: 0, y: 0 } }
      ]
    };

    return vectors[normalized][index] || vectors.line[0];
  }

  function pushWarning(warnings, code, message, context) {
    warnings.push({ code, message, ...(context || {}) });
  }

  function normalizePanelEntries(panelEntries, warnings, segmentId) {
    if (!Array.isArray(panelEntries)) return [];

    return panelEntries.reduce((items, entry) => {
      const sku = entry && entry.sku;
      const qty = toSafeInteger(entry && entry.qty, 0);
      const product = PRODUCT_MASTER.panels[sku];
      if (!product) {
        pushWarning(warnings, "UNSUPPORTED_SKU", `未対応SKUです: ${sku}`, { segmentId, sku });
        return items;
      }
      if (qty <= 0) return items;
      items.push({ sku, qty, installSpanMm: product.installSpanMm });
      return items;
    }, []);
  }

  function panelEntriesToCounts(panelEntries) {
    return panelEntries.reduce((counts, item) => {
      counts[item.sku] = (counts[item.sku] || 0) + item.qty;
      return counts;
    }, createEmptyPanelCounts(getPanels(DEFAULT_PANEL_SKUS)));
  }

  function expandPanels(panelEntries) {
    const expanded = [];
    panelEntries.forEach((item) => {
      for (let index = 0; index < item.qty; index += 1) {
        expanded.push({ type: "panel", sku: item.sku, spanMm: item.installSpanMm });
      }
    });
    return expanded;
  }

  function countsToPanelEntries(panelCounts) {
    return DEFAULT_PANEL_SKUS
      .filter((sku) => panelCounts[sku] > 0)
      .map((sku) => ({
        sku,
        qty: panelCounts[sku],
        installSpanMm: PRODUCT_MASTER.panels[sku].installSpanMm
      }));
  }

  function normalizeGateEntries(gateEntries, warnings, segmentId) {
    if (!Array.isArray(gateEntries)) return [];

    return gateEntries.reduce((items, entry) => {
      const sku = entry && entry.sku ? entry.sku : "standard900";
      const gate = PRODUCT_MASTER.gates[sku];
      if (!gate) {
        pushWarning(warnings, "UNSUPPORTED_SKU", `未対応SKUです: ${sku}`, { segmentId, sku });
        return items;
      }
      const orientation = entry.orientation || "vertical";
      const spanMm = gate.installSpanMmByOrientation[orientation];
      if (!Number.isFinite(spanMm)) {
        pushWarning(warnings, "UNSUPPORTED_SKU", `未対応の門扉向きです: ${orientation}`, {
          segmentId,
          sku
        });
        return items;
      }
      items.push({
        sku,
        position: Number.isInteger(entry.position) ? entry.position : Number.parseInt(entry.position, 10),
        orientation,
        spanMm,
        item: gate
      });
      return items;
    }, []);
  }

  function filterValidGatePositions(gateEntries, panelCount, warnings, segmentId) {
    return gateEntries.filter((gate) => {
      if (!Number.isInteger(gate.position) || gate.position < 0 || gate.position > panelCount) {
        pushWarning(warnings, "INVALID_GATE_POSITION", `門扉位置が不正です: ${gate.position}`, {
          segmentId,
          position: gate.position
        });
        return false;
      }
      return true;
    });
  }

  function buildSequence(panelEntries, gateEntries) {
    const panelSections = expandPanels(panelEntries);
    const byPosition = new Map();

    gateEntries.forEach((gate) => {
      const gates = byPosition.get(gate.position) || [];
      gates.push(gate);
      byPosition.set(gate.position, gates);
    });

    const sequence = [{ type: "post" }];
    for (let index = 0; index <= panelSections.length; index += 1) {
      (byPosition.get(index) || []).forEach((gate) => {
        sequence.push({ type: "gate", sku: gate.sku, spanMm: gate.spanMm });
        sequence.push({ type: "post" });
      });
      if (index < panelSections.length) {
        sequence.push(panelSections[index]);
        sequence.push({ type: "post" });
      }
    }

    return sequence;
  }

  function getSequenceStats(sequence) {
    return sequence.reduce((stats, item) => {
      if (item.type === "post") stats.posts += 1;
      if (item.type === "panel") stats.panels += 1;
      if (item.type === "gate") stats.gates += 1;
      if (item.type === "panel" || item.type === "gate") stats.actualMm += item.spanMm;
      return stats;
    }, { posts: 0, panels: 0, gates: 0, actualMm: 0 });
  }

  function getSegmentJoints(panelEntries) {
    return getJointCount(panelEntriesToCounts(panelEntries));
  }

  function addItem(itemsBySku, item, segmentId) {
    if (!item.qty) return;
    const existing = itemsBySku.get(item.sku) || {
      sku: item.sku,
      name: item.name,
      category: item.category,
      qty: 0,
      unitPrice: item.unitPrice,
      subtotal: 0,
      segmentIds: []
    };
    existing.qty += item.qty;
    existing.subtotal += item.unitPrice * item.qty;
    if (!existing.segmentIds.includes(segmentId)) existing.segmentIds.push(segmentId);
    itemsBySku.set(item.sku, existing);
  }

  function addSegmentItems(itemsBySku, segment) {
    segment.items.forEach((item) => addItem(itemsBySku, item, segment.id));
  }

  function buildSegmentItems(segmentId, panelEntries, gateEntries, postSku, segmentPosts, segmentJoints) {
    const itemsBySku = new Map();
    const pushItem = (item) => addItem(itemsBySku, item, segmentId);

    panelEntries.forEach((entry) => {
      const product = PRODUCT_MASTER.panels[entry.sku];
      pushItem({
        sku: entry.sku,
        name: product.name,
        category: "panel",
        qty: entry.qty,
        unitPrice: product.listPrice,
        subtotal: product.listPrice * entry.qty
      });
    });

    gateEntries.forEach((gate) => {
      const gatePanel = PRODUCT_MASTER.panels[gate.item.panelSku];
      pushItem({
        sku: gate.item.panelSku,
        name: gatePanel.name,
        category: "panel",
        qty: 1,
        unitPrice: gatePanel.listPrice,
        subtotal: gatePanel.listPrice
      });
      [
        { sku: "hinge", qty: gate.item.hingeQuantity },
        { sku: "latch", qty: gate.item.latchQuantity }
      ].forEach((fittingEntry) => {
        const fitting = PRODUCT_MASTER.fittings[fittingEntry.sku];
        pushItem({
          sku: fitting.sku,
          name: fitting.name,
          category: "gate-fitting",
          qty: fittingEntry.qty,
          unitPrice: fitting.listPrice,
          subtotal: fitting.listPrice * fittingEntry.qty
        });
      });
    });

    const post = getPost(postSku);
    pushItem({
      sku: post.sku,
      name: post.name,
      category: "post",
      qty: segmentPosts,
      unitPrice: post.listPrice,
      subtotal: post.listPrice * segmentPosts
    });

    const joint = getFitting("ST2-OAMJNT");
    pushItem({
      sku: joint.sku,
      name: joint.name,
      category: "joint",
      qty: segmentJoints,
      unitPrice: joint.listPrice,
      subtotal: joint.listPrice * segmentJoints
    });

    return Array.from(itemsBySku.values()).filter((item) => item.qty > 0);
  }

  function warnForDifference(warnings, segmentId, differenceMm) {
    if (differenceMm > 0) {
      pushWarning(warnings, "LONGER_THAN_TARGET", "希望寸法より長い構成です。", { segmentId, differenceMm });
    } else if (differenceMm < 0) {
      pushWarning(warnings, "SHORTER_THAN_TARGET", "希望寸法より短い構成です。", { segmentId, differenceMm });
    }
  }

  function estimateSegment(inputSegment, index, config) {
    const segment = inputSegment || {};
    const warnings = [];
    const id = segment.id || String.fromCharCode(65 + index);
    const mode = segment.mode || "auto";
    const targetMm = Number(segment.targetMm);
    const postSku = config.postSku || "ST2-OAMP15";
    let panelEntries = [];
    let search = { pruned: false };

    if (!Number.isFinite(targetMm) || targetMm <= 0) {
      pushWarning(warnings, "NON_POSITIVE_DIMENSION", "寸法0以下です。", { segmentId: id, targetMm: segment.targetMm });
    }

    const gateEntries = normalizeGateEntries(segment.gates || [], warnings, id);
    const gateSpanMm = gateEntries.reduce((total, gate) => total + (Number.isFinite(gate.spanMm) ? gate.spanMm : 0), 0);

    if (mode === "manual") {
      panelEntries = normalizePanelEntries(segment.panels || [], warnings, id);
      if (panelEntries.length === 0 && gateEntries.length === 0) {
        pushWarning(warnings, "EMPTY_MANUAL_CONFIGURATION", "手入力構成が空です。", { segmentId: id });
      }
    } else {
      const searchTargetMm = Math.max(0, (Number.isFinite(targetMm) ? targetMm : 0) - gateSpanMm);
      const combinations = findFenceCombinations(searchTargetMm, {
        limit: 1,
        maxPanelCount: segment.maxPanelCount,
        extraPanelCount: segment.extraPanelCount,
        panelSkus: segment.panelSkus,
        postSku,
        minPanelCount: searchTargetMm === 0 ? 0 : undefined
      });
      if (!combinations.length) {
        pushWarning(warnings, "NO_AUTO_COMBINATION", "自動探索で候補が見つかりません。", { segmentId: id });
      } else {
        panelEntries = countsToPanelEntries(combinations[0].panelCounts);
      }
      search = { pruned: false };
    }

    const panelSectionCount = panelEntries.reduce((total, entry) => total + entry.qty, 0);
    const validGateEntries = filterValidGatePositions(gateEntries, panelSectionCount, warnings, id);
    const sequence = buildSequence(panelEntries, validGateEntries);
    const stats = getSequenceStats(sequence);
    const actualMm = stats.actualMm;
    const safeTargetMm = Number.isFinite(targetMm) ? targetMm : 0;
    const differenceMm = actualMm - safeTargetMm;
    const joints = getSegmentJoints(panelEntries);
    const items = buildSegmentItems(id, panelEntries, validGateEntries, postSku, stats.posts, joints);
    const vector = getSegmentVector(config.shape, index);

    warnForDifference(warnings, id, differenceMm);

    return {
      id,
      targetMm: safeTargetMm,
      actualMm,
      differenceMm,
      mode,
      panels: panelEntries,
      gates: validGateEntries.map((gate) => ({
        sku: gate.sku,
        position: gate.position,
        spanMm: gate.spanMm,
        orientation: gate.orientation
      })),
      posts: stats.posts,
      joints,
      items,
      warnings,
      drawing: {
        id,
        orientation: vector.orientation,
        direction: vector.direction,
        start: vector.start,
        end: vector.end,
        sequence,
        dimensionLabel: formatMm(actualMm)
      },
      search
    };
  }

  function aggregateItems(segments, totalPosts, postSku) {
    const itemsBySku = new Map();
    segments.forEach((segment) => addSegmentItems(itemsBySku, segment));

    const post = getPost(postSku);
    const postItem = itemsBySku.get(post.sku);
    if (postItem) {
      postItem.qty = totalPosts;
      postItem.subtotal = postItem.unitPrice * totalPosts;
    }

    return Array.from(itemsBySku.values());
  }

  function validateClosedShape(config, segments, warnings) {
    const shape = normalizeShape(config.shape);
    if (shape !== "box" || segments.length !== 4) return;

    const firstPairDiff = Math.abs(segments[0].actualMm - segments[2].actualMm);
    const secondPairDiff = Math.abs(segments[1].actualMm - segments[3].actualMm);
    if (firstPairDiff > 0 || secondPairDiff > 0) {
      pushWarning(warnings, "BOX_CLOSURE_MISMATCH", "四角囲いで向かい合う辺の閉じ寸法に矛盾があります。", {
        pairDifferencesMm: [firstPairDiff, secondPairDiff]
      });
    }
  }

  function estimateFenceLayout(config) {
    const input = config || {};
    const shape = normalizeShape(input.shape);
    const inputSegments = Array.isArray(input.segments)
      ? input.segments
      : (Array.isArray(input.segmentsMm) ? input.segmentsMm.map((targetMm, index) => ({
        id: String.fromCharCode(65 + index),
        targetMm,
        mode: "auto",
        panels: null,
        gates: []
      })) : []);

    const warnings = [];
    const expectedSegmentCount = getExpectedSegmentCount(shape);
    if (inputSegments.length !== expectedSegmentCount) {
      pushWarning(warnings, "SEGMENT_COUNT_MISMATCH", "形状と辺数が一致していません。", {
        shape,
        expected: expectedSegmentCount,
        actual: inputSegments.length
      });
    }

    const postSku = input.postSku || "ST2-OAMP15";
    getPost(postSku);

    const segments = inputSegments.map((segment, index) => estimateSegment(segment, index, { ...input, shape, postSku }));
    segments.forEach((segment) => {
      segment.warnings.forEach((warning) => warnings.push(warning));
    });

    const segmentPosts = segments.reduce((total, segment) => total + segment.posts, 0);
    const sharedCorners = Math.min(getSharedCornerCount(shape), Math.max(0, segmentPosts));
    const totalPosts = Math.max(0, segmentPosts - sharedCorners);
    const totalTargetMm = segments.reduce((total, segment) => total + segment.targetMm, 0);
    const totalActualMm = segments.reduce((total, segment) => total + segment.actualMm, 0);
    const totalJoints = segments.reduce((total, segment) => total + segment.joints, 0);

    validateClosedShape(input, segments, warnings);

    const items = aggregateItems(segments, totalPosts, postSku);
    const amountExTax = items.reduce((total, item) => total + item.subtotal, 0);
    const tax = Math.round(amountExTax * TAX_RATE);

    return {
      shape,
      segments: segments.map(({ drawing, search, ...segment }) => segment),
      totals: {
        targetMm: totalTargetMm,
        actualMm: totalActualMm,
        differenceMm: totalActualMm - totalTargetMm,
        posts: totalPosts,
        joints: totalJoints,
        amountExTax,
        tax,
        amountIncTax: amountExTax + tax
      },
      items,
      drawing: {
        shape,
        segments: segments.map((segment) => segment.drawing)
      },
      warnings,
      search: {
        pruned: segments.some((segment) => segment.search.pruned)
      }
    };
  }

  return Object.freeze({
    PRODUCT_MASTER,
    findFenceCombinations,
    findFenceLayoutCombinations,
    estimateFenceLayout,
    getPostCount,
    getJointCount,
    calculateAmounts
  });
});
