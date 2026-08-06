const PRODUCT_MASTER = {
  "ST2-OAMF15": { name: "1500×900フェンス", listPrice: 20800, costPrice: 13520 },
  "ST2-OAMF09": { name: "900×900フェンス", listPrice: 16200, costPrice: 10530 },
  "ST2-OAMP15": { name: "ポール H1500", listPrice: 7800, costPrice: 5070 },
  "ST2-OAMJNT": { name: "ジョイント", listPrice: 1700, costPrice: 1105 },
  standard900: { name: "片開き門扉 900", listPrice: 16200, costPrice: 10530 },
  hinge: { name: "ヒンジ", listPrice: 2200, costPrice: 1430 },
  latch: { name: "ドアラッチ", listPrice: 2000, costPrice: 1300 }
};

const INITIAL_STATE = {
  shape: "line",
  selectedSegmentId: "A",
  segments: [
    createDefaultSegment("A")
  ]
};

const STORAGE_KEY = "americanFenceEstimateState_v2";
const TAX_RATE = 0.1;
const CUSTOMER_RATE = 0.8;
const urlState = window.AmericanFenceUrlState;
const fenceEngine = window.AmericanFenceEngine;
const $ = (id) => document.getElementById(id);

const elements = {
  segmentInputs: $("segmentInputs"),
  drawingCanvas: $("drawingCanvas"),
  selectedSegmentDetail: $("selectedSegmentDetail"),
  customerTotalTaxIn: $("customerTotalTaxIn"),
  startEstimateButton: $("startEstimateButton"),
  shippingButton: $("shippingButton"),
  shippingStatus: $("shippingStatus"),
  shippingModal: $("shippingModal"),
  closeShippingModal: $("closeShippingModal"),
  shippingConfirmed: $("shippingConfirmed"),
  caseModal: $("caseModal"),
  closeCaseModal: $("closeCaseModal"),
  caseModalTitle: $("caseModalTitle"),
  caseModalImage: $("caseModalImage"),
  partsSummary: $("partsSummary"),
  partsList: $("partsList"),
  noticeList: $("noticeList"),
  replyText: $("replyText"),
  copyButton: $("copyButton"),
  copyStatus: $("copyStatus"),
  shareUrl: $("shareUrl"),
  shareButton: $("shareButton"),
  shareStatus: $("shareStatus"),
  resetButton: $("resetButton")
};

let state = loadState();

function createDefaultSegment(id) {
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

function yen(value) {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

function yenMark(value) {
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

function percent(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function normalizePanels(panels) {
  const counts = { "ST2-OAMF09": 0, "ST2-OAMF15": 0 };
  if (Array.isArray(panels)) {
    panels.forEach((panel) => {
      if (panel && Object.prototype.hasOwnProperty.call(counts, panel.sku)) {
        counts[panel.sku] += sanitizeCount(panel.qty);
      }
    });
  }
  return Object.entries(counts).map(([sku, qty]) => ({ sku, qty }));
}

function normalizeGates(gates) {
  if (!Array.isArray(gates)) return [];
  return gates
    .map((gate) => ({
      sku: gate && gate.sku ? gate.sku : "standard900",
      position: sanitizeCount(gate && gate.position)
    }))
    .filter((gate) => gate.position >= 0);
}

function sanitizeGatePositionPreset(value) {
  return ["left", "center", "right", "custom"].includes(value) ? value : "left";
}

function normalizeSegment(segment, index) {
  const id = segment && segment.id ? String(segment.id) : getSegmentId(index);
  const gates = normalizeGates(segment && segment.gates);
  const firstGate = gates[0] || {};
  return {
    id,
    mode: segment && segment.mode === "manual" ? "manual" : "auto",
    targetMm: sanitizeDimension(segment && segment.targetMm) || 3000,
    adoptedProposal: segment && segment.adoptedProposal === "small" ? "small" : "large",
    panels: normalizePanels(segment && segment.panels),
    gateEnabled: Boolean((segment && segment.gateEnabled) || gates.length > 0),
    gateSku: segment && segment.gateSku ? segment.gateSku : firstGate.sku || "standard900",
    gatePositionPreset: segment && segment.gatePositionPreset
      ? sanitizeGatePositionPreset(segment.gatePositionPreset)
      : gates.length > 0 ? "custom" : "left",
    gatePosition: sanitizeCount(segment && segment.gatePosition !== undefined ? segment.gatePosition : firstGate.position),
    gates
  };
}

function normalizeState(rawState) {
  const validShapes = ["line", "l", "u", "box"];
  const shape = validShapes.includes(rawState && rawState.shape) ? rawState.shape : "line";
  const count = getShapeSegmentCount(shape);
  const sourceSegments = Array.isArray(rawState && rawState.segments) ? rawState.segments : [];
  const segments = Array.from({ length: count }, (_, index) => {
    return normalizeSegment(sourceSegments[index] || createDefaultSegment(getSegmentId(index)), index);
  });
  const selectedSegmentId = segments.some((segment) => segment.id === rawState.selectedSegmentId)
    ? rawState.selectedSegmentId
    : segments[0].id;

  return { shape, selectedSegmentId, segments };
}

function migrateLegacyState(legacy) {
  const shape = ["line", "l", "u", "box"].includes(legacy && legacy.shape) ? legacy.shape : "line";
  const count = getShapeSegmentCount(shape);
  const segment = createDefaultSegment("A");
  segment.mode = "manual";
  segment.targetMm = 0;
  segment.panels = [
    { sku: "ST2-OAMF09", qty: sanitizeCount(legacy && legacy.panel900) },
    { sku: "ST2-OAMF15", qty: sanitizeCount(legacy && legacy.panel1500) }
  ];
  segment.gates = Array.from({ length: sanitizeCount(legacy && legacy.gates) }, (_, index) => ({
    sku: "standard900",
    position: index
  }));
  segment.gateEnabled = segment.gates.length > 0;
  segment.gatePositionPreset = "custom";
  segment.gatePosition = 0;
  return normalizeState({
    shape,
    selectedSegmentId: "A",
    segments: [segment, ...Array.from({ length: count - 1 }, (_, index) => createDefaultSegment(getSegmentId(index + 1)))]
  });
}

function loadState() {
  const stateFromUrl = urlState.readStateFromUrl(window.location.search, INITIAL_STATE);
  if (stateFromUrl) return normalizeState(stateFromUrl);

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return { ...INITIAL_STATE };
    if (Array.isArray(saved.segments)) return normalizeState(saved);
    return migrateLegacyState(saved);
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState() {
  const serializableState = getSerializableState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState));
  const nextUrl = urlState.writeStateToUrl(window.location.href, serializableState);
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState({ estimateState: serializableState }, "", nextUrl);
  }
}

function getPanelQty(segment, sku) {
  const panel = segment.panels.find((item) => item.sku === sku);
  return panel ? panel.qty : 0;
}

function setPanelQty(segment, sku, qty) {
  const panel = segment.panels.find((item) => item.sku === sku);
  if (panel) panel.qty = sanitizeCount(qty);
}

function getManualPanelCount(segment) {
  return segment.panels.reduce((total, panel) => total + sanitizeCount(panel.qty), 0);
}

function getProposal(segment, side) {
  const gates = segment.gateEnabled ? { count: 1, sku: segment.gateSku || "standard900", orientation: "vertical" } : null;
  const candidates = fenceEngine.findFenceCombinations(segment.targetMm, {
    limit: 200,
    maxPanelCount: 30,
    gates
  });
  const filtered = candidates.filter((candidate) => side === "small"
    ? candidate.achievedMm <= segment.targetMm
    : candidate.achievedMm >= segment.targetMm);
  return filtered[0] || candidates[0] || null;
}

function proposalToPanels(proposal) {
  if (!proposal) return [];
  return Object.entries(proposal.panelCounts)
    .filter(([, qty]) => qty > 0)
    .map(([sku, qty]) => ({ sku, qty }));
}

function formatProposal(proposal) {
  if (!proposal) return "候補なし";
  const parts = proposalToPanels(proposal).map((panel) => {
    return `${panel.sku === "ST2-OAMF09" ? "900" : "1500"}×${panel.qty}`;
  });
  if (proposal.materials && proposal.materials.gates) parts.unshift(`門扉×${proposal.materials.gates.quantity}`);
  return `${parts.join(" + ") || "なし"} / 約${proposal.achievedMm.toLocaleString("ja-JP")}mm`;
}

function resolveGatePosition(segment, panelCount) {
  if (!segment.gateEnabled) return null;
  if (segment.gatePositionPreset === "center") return Math.round(panelCount / 2);
  if (segment.gatePositionPreset === "right") return panelCount;
  if (segment.gatePositionPreset === "custom") return sanitizeCount(segment.gatePosition);
  return 0;
}

function buildGatesForSegment(segment, panelCount) {
  if (!segment.gateEnabled) return [];
  const position = resolveGatePosition(segment, panelCount);
  return [{
    sku: segment.gateSku || "standard900",
    position,
    orientation: "vertical"
  }];
}

function resolveSegmentForEstimate(segment) {
  if (segment.mode === "manual") {
    const panels = segment.panels.filter((panel) => panel.qty > 0);
    return {
      id: segment.id,
      targetMm: segment.targetMm,
      mode: "manual",
      panels,
      gates: buildGatesForSegment(segment, panels.reduce((total, panel) => total + panel.qty, 0))
    };
  }

  const proposal = getProposal(segment, segment.adoptedProposal);
  const panels = proposalToPanels(proposal);
  return {
    id: segment.id,
    targetMm: segment.targetMm,
    mode: "manual",
    panels,
    gates: buildGatesForSegment(segment, proposal ? proposal.panelCount : 0)
  };
}

function buildLayoutInput() {
  return {
    shape: state.shape,
    segments: state.segments.map(resolveSegmentForEstimate)
  };
}

function getSerializableState() {
  return {
    ...state,
    segments: state.segments.map((segment) => {
      const proposal = segment.mode === "auto" ? getProposal(segment, segment.adoptedProposal) : null;
      const panelCount = segment.mode === "auto" && proposal ? proposal.panelCount : getManualPanelCount(segment);
      return {
        ...segment,
        gates: buildGatesForSegment(segment, panelCount)
      };
    })
  };
}

function calculateLayout() {
  return fenceEngine.estimateFenceLayout(buildLayoutInput());
}

function calculatePrice(layout) {
  const listTotal = layout.items.reduce((total, item) => total + item.subtotal, 0);
  const costTotal = layout.items.reduce((total, item) => {
    const product = PRODUCT_MASTER[item.sku];
    return total + (product ? product.costPrice * item.qty : 0);
  }, 0);
  const customerTotal = Math.round(listTotal * CUSTOMER_RATE);
  const tax = Math.round(customerTotal * TAX_RATE);
  const customerTotalTaxIn = customerTotal + tax;
  const profit = customerTotal - costTotal;
  const profitRate = customerTotal > 0 ? (profit / customerTotal) * 100 : 0;

  return {
    listTotal,
    costTotal,
    customerTotal,
    tax,
    customerTotalTaxIn,
    profit,
    profitRate
  };
}

function syncShapeButtons() {
  document.querySelectorAll("[data-shape]").forEach((button) => {
    const active = button.dataset.shape === state.shape;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderGateControls(segment, panelCount) {
  const customClass = segment.gateEnabled && segment.gatePositionPreset === "custom" ? "" : " is-hidden";
  const maxPosition = Math.max(0, panelCount);
  return `
    <div class="gate-controls">
      <label class="toggle-row">
        <input type="checkbox" data-segment="${segment.id}" data-field="gateEnabled"${segment.gateEnabled ? " checked" : ""}>
        <span>門扉を付ける</span>
      </label>
      ${segment.gateEnabled ? `
      <div class="gate-grid">
        <label class="field-row">
          <span>門扉の種類</span>
          <select data-segment="${segment.id}" data-field="gateSku">
            <option value="standard900"${segment.gateSku === "standard900" ? " selected" : ""}>片開き門扉 900</option>
          </select>
        </label>
        <label class="field-row">
          <span>門扉位置</span>
          <select data-segment="${segment.id}" data-field="gatePositionPreset">
            <option value="left"${segment.gatePositionPreset === "left" ? " selected" : ""}>左端</option>
            <option value="center"${segment.gatePositionPreset === "center" ? " selected" : ""}>中央付近</option>
            <option value="right"${segment.gatePositionPreset === "right" ? " selected" : ""}>右端</option>
            <option value="custom"${segment.gatePositionPreset === "custom" ? " selected" : ""}>区画番号指定</option>
          </select>
        </label>
        <label class="field-row gate-custom-position${customClass}">
          <span>区画番号 0〜${maxPosition}</span>
          <input type="number" inputmode="numeric" min="0" step="1" value="${segment.gatePosition}" data-segment="${segment.id}" data-field="gatePosition">
        </label>
      </div>
      ` : ""}
    </div>
  `;
}

function formatSegmentSummary(segment) {
  if (!segment || segment.actualMm <= 0) return "未入力";
  const parts = segment.panels.map((panel) => `${panel.sku === "ST2-OAMF09" ? "900" : "1500"}×${panel.qty}`);
  if (segment.gates.length) parts.push(`門扉×${segment.gates.length}`);
  return `約${segment.actualMm.toLocaleString("ja-JP")}mm${parts.length ? ` ・ ${parts.join(" + ")}` : ""}`;
}

function renderSegmentInputs(layout) {
  elements.segmentInputs.innerHTML = state.segments.map((segment) => {
    const estimatedSegment = layout.segments.find((item) => item.id === segment.id);
    const small = getProposal(segment, "small");
    const large = getProposal(segment, "large");
    const selectedProposal = segment.adoptedProposal === "small" ? small : large;
    const proposalPanelCount = selectedProposal ? selectedProposal.panelCount : 0;
    const manualPanelCount = getManualPanelCount(segment);
    const active = segment.id === state.selectedSegmentId ? " is-selected" : "";
    const open = segment.id === state.selectedSegmentId;
    const complete = estimatedSegment && estimatedSegment.actualMm > 0;
    return `
      <article class="segment-input-card${active}${open ? " is-open" : ""}" data-segment-card="${segment.id}">
        <button class="segment-input-head" type="button" aria-expanded="${open}" aria-controls="segment-panel-${segment.id}">
          <h3>${complete ? "✓ " : ""}${segment.id}辺</h3>
          <small>${formatSegmentSummary(estimatedSegment)}</small>
          <span>${segment.mode === "auto" ? "希望寸法から提案" : "パネル枚数を指定"}</span>
        </button>
        <div id="segment-panel-${segment.id}" class="segment-input-body"${open ? "" : " hidden"}>
        <label class="field-row">
          <span>入力方法</span>
          <select data-segment="${segment.id}" data-field="mode">
            <option value="auto"${segment.mode === "auto" ? " selected" : ""}>希望寸法から提案</option>
            <option value="manual"${segment.mode === "manual" ? " selected" : ""}>パネル枚数を指定</option>
          </select>
        </label>
        ${segment.mode === "auto" ? `
          <label class="field-row">
            <span>希望寸法 mm</span>
            <input type="number" inputmode="numeric" min="1" step="1" value="${segment.targetMm}" data-segment="${segment.id}" data-field="targetMm">
          </label>
          ${renderGateControls(segment, proposalPanelCount)}
          <div class="proposal-grid">
            <label class="proposal-option">
              <input type="radio" name="proposal-${segment.id}" value="small" data-segment="${segment.id}" data-field="adoptedProposal"${segment.adoptedProposal === "small" ? " checked" : ""}>
              <span>小さい側</span>
              <strong>${formatProposal(small)}</strong>
            </label>
            <label class="proposal-option">
              <input type="radio" name="proposal-${segment.id}" value="large" data-segment="${segment.id}" data-field="adoptedProposal"${segment.adoptedProposal === "large" ? " checked" : ""}>
              <span>大きい側</span>
              <strong>${formatProposal(large)}</strong>
            </label>
          </div>
        ` : `
          <div class="manual-grid">
            <label class="field-row">
              <span>900パネル 数量</span>
              <input type="number" inputmode="numeric" min="0" step="1" value="${getPanelQty(segment, "ST2-OAMF09")}" data-segment="${segment.id}" data-field="panel900">
            </label>
            <label class="field-row">
              <span>1500パネル 数量</span>
              <input type="number" inputmode="numeric" min="0" step="1" value="${getPanelQty(segment, "ST2-OAMF15")}" data-segment="${segment.id}" data-field="panel1500">
            </label>
          </div>
          ${renderGateControls(segment, manualPanelCount)}
        `}
        </div>
      </article>
    `;
  }).join("");
}

function selectSegment(segmentId) {
  if (!state.segments.some((segment) => segment.id === segmentId)) return;
  state.selectedSegmentId = segmentId;
  render();
}

function updateSegmentField(segmentId, field, value) {
  const segment = state.segments.find((item) => item.id === segmentId);
  if (!segment) return;

  if (field === "mode") {
    segment.mode = value === "manual" ? "manual" : "auto";
  } else if (field === "targetMm") {
    segment.targetMm = sanitizeDimension(value);
  } else if (field === "adoptedProposal") {
    segment.adoptedProposal = value === "small" ? "small" : "large";
  } else if (field === "panel900") {
    setPanelQty(segment, "ST2-OAMF09", value);
  } else if (field === "panel1500") {
    setPanelQty(segment, "ST2-OAMF15", value);
  } else if (field === "gateEnabled") {
    segment.gateEnabled = value === true || value === "true" || value === "on";
    if (!segment.gateEnabled) segment.gates = [];
    if (segment.gateEnabled) {
      segment.gateSku = segment.gateSku || "standard900";
      segment.gatePositionPreset = segment.gatePositionPreset || "left";
    }
  } else if (field === "gateSku") {
    segment.gateSku = value || "standard900";
  } else if (field === "gatePositionPreset") {
    segment.gatePositionPreset = sanitizeGatePositionPreset(value);
  } else if (field === "gatePosition") {
    segment.gatePosition = sanitizeCount(value);
  }

  state.selectedSegmentId = segmentId;
  render();
}

function handleSegmentInput(event) {
  const control = event.target.closest("[data-segment][data-field]");
  if (!control) return;
  const value = control.type === "checkbox" ? control.checked : control.value;
  updateSegmentField(control.dataset.segment, control.dataset.field, value);
}

function handleSegmentClick(event) {
  if (event.target.closest("[data-field]")) return;
  const card = event.target.closest("[data-segment-card]");
  if (card) selectSegment(card.dataset.segmentCard);
}

function updateShape(shape) {
  const currentById = new Map(state.segments.map((segment) => [segment.id, segment]));
  const count = getShapeSegmentCount(shape);
  state.shape = shape;
  state.segments = Array.from({ length: count }, (_, index) => {
    const id = getSegmentId(index);
    return currentById.get(id) || createDefaultSegment(id);
  });
  state.selectedSegmentId = state.segments[0].id;
  render();
}

function getSequenceSpan(sequence) {
  return sequence.reduce((total, item) => {
    return item.type === "panel" || item.type === "gate" ? total + item.spanMm : total;
  }, 0);
}

function createSvgElement(tag, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
}

function appendText(svg, text, x, y, className, anchor = "middle", segmentId = null, style = null) {
  const element = createSvgElement("text", {
    x,
    y,
    class: className,
    "text-anchor": anchor
  });
  if (segmentId) element.setAttribute("data-drawing-segment", segmentId);
  if (style) element.setAttribute("style", style);
  element.textContent = text;
  svg.appendChild(element);
}

function getDirectionVector(direction) {
  return {
    right: { x: 1, y: 0 },
    left: { x: -1, y: 0 },
    down: { x: 0, y: 1 },
    up: { x: 0, y: -1 }
  }[direction] || { x: 1, y: 0 };
}

function buildRawDrawingLines(drawing) {
  let cursor = { x: 0, y: 0 };
  return drawing.segments.map((segment) => {
    const spanMm = getSequenceSpan(segment.sequence);
    const vector = getDirectionVector(segment.direction);
    const line = {
      segment,
      start: { ...cursor },
      end: {
        x: cursor.x + vector.x * spanMm,
        y: cursor.y + vector.y * spanMm
      },
      vector,
      spanMm
    };
    cursor = { ...line.end };
    return line;
  });
}

function getRawBounds(lines) {
  const xs = [];
  const ys = [];
  lines.forEach((line) => {
    xs.push(line.start.x, line.end.x);
    ys.push(line.start.y, line.end.y);
  });
  return {
    minX: Math.min(0, ...xs),
    maxX: Math.max(1, ...xs),
    minY: Math.min(0, ...ys),
    maxY: Math.max(1, ...ys)
  };
}

function getDimensionGeometry(line, segment, drawingStyle) {
  const horizontal = segment.orientation === "horizontal";
  const offsetUnit = drawingStyle.offsetUnit;
  const offset = horizontal
    ? { x: 0, y: segment.direction === "left" ? offsetUnit * 1.18 : -offsetUnit }
    : { x: segment.direction === "up" ? -offsetUnit * 1.42 : offsetUnit * 1.35, y: 0 };
  const textYOffset = horizontal
    ? (segment.direction === "left" ? drawingStyle.fontSize * 1.45 : -drawingStyle.fontSize * 0.55)
    : drawingStyle.fontSize * 0.35;
  const x1 = line.start.x + offset.x;
  const y1 = line.start.y + offset.y;
  const x2 = line.end.x + offset.x;
  const y2 = line.end.y + offset.y;
  const label = `${segment.id}辺 ${segment.dimensionLabel}`;
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 + textYOffset;

  return { x1, y1, x2, y2, label, labelX, labelY };
}

function drawDimension(svg, line, segment, drawingStyle) {
  const geometry = getDimensionGeometry(line, segment, drawingStyle);
  svg.appendChild(createSvgElement("line", {
    x1: geometry.x1,
    y1: geometry.y1,
    x2: geometry.x2,
    y2: geometry.y2,
    class: "svg-dimension-line",
    fill: "none",
    "data-drawing-segment": segment.id
  }));
  appendText(
    svg,
    geometry.label,
    geometry.labelX,
    geometry.labelY,
    "svg-dimension-text",
    "middle",
    segment.id,
    `font-size:${drawingStyle.fontSize}px`
  );
}

function registerPost(postMap, point, selected) {
  const key = `${Math.round(point.x * 10) / 10}:${Math.round(point.y * 10) / 10}`;
  const existing = postMap.get(key);
  postMap.set(key, {
    x: point.x,
    y: point.y,
    selected: Boolean(existing && existing.selected) || selected
  });
}

function drawPosts(svg, postMap, drawingStyle) {
  postMap.forEach((point) => {
    svg.appendChild(createSvgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: point.selected ? drawingStyle.selectedPostRadius : drawingStyle.postRadius,
      style: `stroke-width:${drawingStyle.postStroke}`,
      class: point.selected ? "svg-post is-selected" : "svg-post"
    }));
  });
}

function expandBounds(bounds, x, y) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function includeDimensionBounds(bounds, lines, drawingStyle) {
  lines.forEach((line) => {
    const geometry = getDimensionGeometry(line, line.segment, drawingStyle);
    const labelHalfWidth = geometry.label.length * drawingStyle.fontSize * 0.34;
    const labelHalfHeight = drawingStyle.fontSize * 0.9;

    expandBounds(bounds, geometry.x1, geometry.y1);
    expandBounds(bounds, geometry.x2, geometry.y2);
    expandBounds(bounds, geometry.labelX - labelHalfWidth, geometry.labelY - labelHalfHeight);
    expandBounds(bounds, geometry.labelX + labelHalfWidth, geometry.labelY + labelHalfHeight);
  });
  return bounds;
}

function createViewportFromBounds(bounds) {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const targetRatio = 360 / 260;
  let minX = bounds.minX;
  let maxX = bounds.maxX;
  let minY = bounds.minY;
  let maxY = bounds.maxY;
  let viewWidth = width;
  let viewHeight = height;
  const currentRatio = viewWidth / viewHeight;

  if (currentRatio > targetRatio) {
    const nextHeight = viewWidth / targetRatio;
    const extra = (nextHeight - viewHeight) / 2;
    minY -= extra;
    maxY += extra;
    viewHeight = nextHeight;
  } else {
    const nextWidth = viewHeight * targetRatio;
    const extra = (nextWidth - viewWidth) / 2;
    minX -= extra;
    maxX += extra;
    viewWidth = nextWidth;
  }

  const unit = viewWidth / 360;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: viewWidth,
    height: viewHeight,
    unit
  };
}

function createDrawingStyle(unit) {
  return {
    postRadius: unit * 5.8,
    selectedPostRadius: unit * 6,
    postStroke: unit * 2,
    fontSize: unit * 12,
    offsetUnit: unit * 30
  };
}

function drawFenceSegment(svg, line, selected, postMap, drawingStyle) {
  const segment = line.segment;
  let cursor = { ...line.start };

  segment.sequence.forEach((item) => {
    if (item.type === "post") {
      registerPost(postMap, cursor, selected);
      return;
    }

    const span = item.spanMm;
    const next = {
      x: cursor.x + line.vector.x * span,
      y: cursor.y + line.vector.y * span
    };
    const className = [
      item.type === "gate" ? "svg-gate" : item.sku === "ST2-OAMF15" ? "svg-panel svg-panel-1500" : "svg-panel svg-panel-900",
      selected ? "is-selected" : ""
    ].join(" ");

    svg.appendChild(createSvgElement("line", {
      x1: cursor.x,
      y1: cursor.y,
      x2: next.x,
      y2: next.y,
      class: className,
      fill: "none",
      "data-drawing-segment": segment.id
    }));
    cursor = next;
  });

  const hit = createSvgElement("line", {
    x1: line.start.x,
    y1: line.start.y,
    x2: line.end.x,
    y2: line.end.y,
    class: "svg-segment-hit",
    fill: "none",
    "data-drawing-segment": segment.id
  });
  svg.appendChild(hit);

  drawDimension(svg, line, segment, drawingStyle);
}

function getDrawingViewport(lines) {
  const bounds = getRawBounds(lines);
  const bodyPadding = Math.max(700, Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.18);
  const paddedBounds = {
    minX: bounds.minX - bodyPadding,
    maxX: bounds.maxX + bodyPadding,
    minY: bounds.minY - bodyPadding,
    maxY: bounds.maxY + bodyPadding
  };
  const preliminaryViewport = createViewportFromBounds(paddedBounds);
  const preliminaryStyle = createDrawingStyle(preliminaryViewport.unit);
  const decoratedBounds = includeDimensionBounds({ ...paddedBounds }, lines, preliminaryStyle);
  const horizontalLabelPadding = Math.max(320, preliminaryStyle.fontSize * 1.4);
  const verticalLabelPadding = Math.max(700, preliminaryStyle.fontSize * 2.4);
  const finalViewport = createViewportFromBounds({
    minX: decoratedBounds.minX - horizontalLabelPadding,
    maxX: decoratedBounds.maxX + horizontalLabelPadding,
    minY: decoratedBounds.minY - verticalLabelPadding,
    maxY: decoratedBounds.maxY + verticalLabelPadding
  });
  const style = createDrawingStyle(finalViewport.unit);

  return {
    minX: finalViewport.minX,
    minY: finalViewport.minY,
    width: finalViewport.width,
    height: finalViewport.height,
    unit: finalViewport.unit,
    style
  };
}

function renderDrawing(layout) {
  const rawLines = buildRawDrawingLines(layout.drawing);
  const viewport = getDrawingViewport(rawLines);
  const svg = createSvgElement("svg", {
    viewBox: `${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`,
    role: "img",
    "aria-label": "フェンス配置図"
  });

  svg.appendChild(createSvgElement("rect", {
    x: viewport.minX,
    y: viewport.minY,
    width: viewport.width,
    height: viewport.height,
    rx: viewport.unit * 8,
    class: "svg-paper"
  }));

  if (layout.totals.actualMm === 0) {
    appendText(
      svg,
      "各辺の寸法または枚数を入力してください",
      viewport.minX + viewport.width / 2,
      viewport.minY + viewport.height / 2,
      "svg-empty",
      "middle",
      null,
      `font-size:${viewport.style.fontSize}px`
    );
  } else {
    const postMap = new Map();
    rawLines.forEach((rawLine) => {
      drawFenceSegment(svg, rawLine, rawLine.segment.id === state.selectedSegmentId, postMap, viewport.style);
    });
    drawPosts(svg, postMap, viewport.style);
  }

  elements.drawingCanvas.replaceChildren(svg);
}

function renderSelectedSegmentDetail(layout) {
  const segment = layout.segments.find((item) => item.id === state.selectedSegmentId) || layout.segments[0];
  if (!segment) {
    elements.selectedSegmentDetail.innerHTML = "";
    return;
  }

  const panelLines = segment.panels.length
    ? segment.panels.map((panel) => `<li>${panel.sku === "ST2-OAMF09" ? "900パネル" : "1500パネル"} × ${panel.qty}</li>`).join("")
    : "<li>パネルなし</li>";
  const gateLine = segment.gates.length ? `<li>門扉 × ${segment.gates.length}</li>` : "";
  const diff = segment.differenceMm === 0 ? "差なし" : `${segment.differenceMm > 0 ? "+" : ""}${segment.differenceMm.toLocaleString("ja-JP")}mm`;
  const warningMessages = getCustomerWarnings({ ...layout, warnings: segment.warnings }, segment);
  const warningLines = warningMessages.length
    ? `
      <div class="segment-warnings" role="alert">
        ${warningMessages.map((message) => `<p>${escapeHtml(message)}</p>`).join("")}
      </div>
    `
    : "";

  elements.selectedSegmentDetail.innerHTML = `
    <div class="selected-segment-card">
      <h3>${segment.id}辺</h3>
      <ul>
        ${panelLines}
        ${gateLine}
        <li>設置時の幅目安 約${segment.actualMm.toLocaleString("ja-JP")}mm</li>
        <li>希望寸法との差 ${diff}</li>
        <li>柱 ${segment.posts}本</li>
        <li>ジョイント ${segment.joints}個</li>
      </ul>
      ${warningLines}
    </div>
  `;
}

function isGateRelatedItem(item) {
  const name = item.name || "";
  return item.category === "gate" || item.sku === "hinge" || item.sku === "latch" || name.includes("門扉") || name.includes("ヒンジ") || name.includes("ラッチ");
}

function renderParts(layout) {
  const itemCount = layout.items.length;
  elements.partsSummary.textContent = itemCount > 0 ? `部材一覧を見る（${itemCount}品目）` : "部材一覧を見る";
  elements.partsList.innerHTML = layout.items.map((item) => {
    const segmentLabel = item.segmentIds && item.segmentIds.length ? `${item.segmentIds.join("・")}辺` : "全体";
    const gateNote = isGateRelatedItem(item) ? '<span class="parts-note parts-gate-note">門扉用</span>' : "";
    const customerSubtotalTaxIn = Math.round(item.subtotal * CUSTOMER_RATE * (1 + TAX_RATE));
    return `
      <div class="part-card">
        <h3>${escapeHtml(item.name)}${gateNote}<small class="parts-note">対象辺：${escapeHtml(segmentLabel)}</small></h3>
        <div class="part-values customer-part-values">
          <span><small>数量</small><strong>${item.qty.toLocaleString("ja-JP")}</strong></span>
          <span><small>税込小計</small><strong>${yen(customerSubtotalTaxIn)}</strong></span>
        </div>
      </div>
    `;
  }).join("");
}

function renderPrice(price) {
  elements.customerTotalTaxIn.textContent = yenMark(price.customerTotalTaxIn);
}

function getCustomerWarningMessage(warning, segment) {
  const code = warning && warning.code;
  const differenceMm = Number(warning && warning.differenceMm);
  if (code === "LONGER_THAN_TARGET") {
    const diff = Number.isFinite(differenceMm) ? Math.abs(differenceMm) : Math.abs(segment && segment.differenceMm);
    return `ご希望寸法より約${diff.toLocaleString("ja-JP")}mm長くなります。`;
  }
  if (code === "SHORTER_THAN_TARGET") {
    const diff = Number.isFinite(differenceMm) ? Math.abs(differenceMm) : Math.abs(segment && segment.differenceMm);
    return `ご希望寸法より約${diff.toLocaleString("ja-JP")}mm短くなります。`;
  }
  if (code === "INVALID_GATE_POSITION") return "門扉の位置をもう一度ご確認ください。";
  if (code === "EMPTY_MANUAL_CONFIGURATION") return "パネル枚数を入力してください。";
  if (code === "NON_POSITIVE_DIMENSION") return "希望寸法を1mm以上で入力してください。";
  if (code === "NO_AUTO_COMBINATION") return "この寸法に近い組み合わせが見つかりませんでした。";
  if (code === "BOX_CLOSURE_MISMATCH") return "四角囲いの向かい合う辺の寸法をご確認ください。";
  if (code === "SEGMENT_COUNT_MISMATCH") return "形状に対する辺の数をご確認ください。";
  if (code === "UNSUPPORTED_SKU") return "選択中の部材を確認してください。";
  return "入力内容をご確認ください。";
}

function getCustomerWarnings(layout, segment = null) {
  const warnings = segment ? segment.warnings : layout.warnings;
  const messages = warnings.map((warning) => getCustomerWarningMessage(warning, segment));
  return Array.from(new Set(messages));
}

function renderNotices(layout) {
  const messages = getCustomerWarnings(layout);
  if (!messages.length) {
    elements.noticeList.innerHTML = "";
    return;
  }
  elements.noticeList.innerHTML = `
    <div class="segment-warnings" role="alert">
      ${messages.map((message) => `<p>${escapeHtml(message)}</p>`).join("")}
    </div>
  `;
}

function renderReply(price) {
  elements.replyText.value = [
    "お問い合わせありがとうございます。",
    `こちらの仕様ですと、アメリカンフェンス材料一式で税込${yen(price.customerTotalTaxIn)}になります。`,
    "",
    "表示価格は材料のみの価格です。",
    "人工芝、基礎工事、アメリカンフェンスの設置費用は含まれておりません。"
  ].join("\n");
}

function render() {
  const layout = calculateLayout();
  const price = calculatePrice(layout);

  syncShapeButtons();
  renderSegmentInputs(layout);
  renderDrawing(layout);
  renderSelectedSegmentDetail(layout);
  renderParts(layout);
  renderPrice(price);
  renderNotices(layout);
  renderReply(price);
  saveState();
  elements.shareUrl.value = window.location.href;
}

function setupInputs() {
  elements.startEstimateButton.addEventListener("click", () => {
    document.getElementById("estimateInput").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-shape]").forEach((button) => {
    button.addEventListener("click", () => updateShape(button.dataset.shape));
  });

  elements.segmentInputs.addEventListener("input", handleSegmentInput);
  elements.segmentInputs.addEventListener("change", handleSegmentInput);
  elements.segmentInputs.addEventListener("click", handleSegmentClick);
  elements.drawingCanvas.addEventListener("click", (event) => {
    const line = event.target.closest("[data-drawing-segment]");
    if (line) selectSegment(line.dataset.drawingSegment);
  });

  elements.resetButton.addEventListener("click", () => {
    state = normalizeState(INITIAL_STATE);
    render();
  });

  elements.shippingButton.addEventListener("click", () => {
    elements.shippingStatus.textContent = "";
    elements.shippingModal.hidden = false;
    elements.shippingConfirmed.focus();
  });

  elements.closeShippingModal.addEventListener("click", () => {
    elements.shippingModal.hidden = true;
    elements.shippingButton.focus();
  });

  elements.shippingModal.addEventListener("click", (event) => {
    if (event.target === elements.shippingModal) {
      elements.shippingModal.hidden = true;
      elements.shippingButton.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.shippingModal.hidden) {
      elements.shippingModal.hidden = true;
      elements.shippingButton.focus();
    }
    if (event.key === "Escape" && !elements.caseModal.hidden) {
      elements.caseModal.hidden = true;
    }
  });

}

function setupImages() {
  document.querySelectorAll(".image-frame img").forEach((image) => {
    image.addEventListener("error", () => {
      image.closest(".image-frame")?.classList.add("is-missing");
    });
    image.addEventListener("load", () => {
      image.closest(".image-frame")?.classList.remove("is-missing");
    });
    if (image.complete && image.naturalWidth === 0) {
      image.closest(".image-frame")?.classList.add("is-missing");
    }
  });

  document.querySelectorAll(".case-card").forEach((card) => {
    card.addEventListener("click", () => {
      elements.caseModalTitle.textContent = card.dataset.caseTitle || "施工事例";
      elements.caseModalImage.srcset = card.dataset.caseSrcset || "";
      elements.caseModalImage.src = card.dataset.caseImage || "";
      elements.caseModalImage.alt = `${elements.caseModalTitle.textContent}の施工事例`;
      elements.caseModalImage.closest(".image-frame")?.classList.remove("is-missing");
      elements.caseModal.hidden = false;
      elements.closeCaseModal.focus();
    });
  });

  elements.closeCaseModal.addEventListener("click", () => {
    elements.caseModal.hidden = true;
  });

  elements.caseModal.addEventListener("click", (event) => {
    if (event.target === elements.caseModal) {
      elements.caseModal.hidden = true;
    }
  });
}

async function copyReply() {
  elements.copyStatus.textContent = "";

  try {
    await navigator.clipboard.writeText(elements.replyText.value);
    elements.copyStatus.textContent = "コピーしました。";
  } catch {
    elements.replyText.focus();
    elements.replyText.select();
    elements.copyStatus.textContent = "コピーできませんでした。返信文を選択したので手動でコピーしてください。";
  }
}

async function copyShareUrl() {
  elements.shareStatus.textContent = "";

  try {
    await navigator.clipboard.writeText(elements.shareUrl.value);
    elements.shareStatus.textContent = "共有URLをコピーしました。";
  } catch {
    elements.shareUrl.focus();
    elements.shareUrl.select();
    elements.shareStatus.textContent = "コピーできませんでした。URLを選択したので手動でコピーしてください。";
  }
}

setupInputs();
setupImages();
elements.copyButton.addEventListener("click", copyReply);
elements.shareButton.addEventListener("click", copyShareUrl);
window.addEventListener("popstate", () => {
  state = loadState();
  render();
});
render();
