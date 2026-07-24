const PRODUCT_MASTER = {
  panel1500: { name: "1500×900フェンス", listPrice: 20800, costPrice: 13520 },
  panel900: { name: "900×900フェンス", listPrice: 16200, costPrice: 10530 },
  post: { name: "ポール H1500", listPrice: 7800, costPrice: 5070 },
  joint: { name: "ジョイント", listPrice: 1700, costPrice: 1105 },
  hinge: { name: "ヒンジ", listPrice: 2200, costPrice: 1430 },
  latch: { name: "ドアラッチ", listPrice: 2000, costPrice: 1300 }
};

const INITIAL_STATE = {
  shape: "line",
  panel1500: 0,
  panel900: 0,
  gates: 0
};

// 開発中の計算確認用初期値。初回テストしたい場合は上の INITIAL_STATE に戻して使用。
// const TEST_INITIAL_STATE = {
//   shape: "u",
//   panel1500: 11,
//   panel900: 1,
//   gates: 1
// };

const STORAGE_KEY = "americanFenceEstimateState_v1";
const TAX_RATE = 0.1;
const CUSTOMER_RATE = 0.8;
const $ = (id) => document.getElementById(id);

const elements = {
  panel1500: $("panel1500"),
  panel900: $("panel900"),
  gates: $("gates"),
  customerTotalTaxIn: $("customerTotalTaxIn"),
  customerTotal: $("customerTotal"),
  listTotal: $("listTotal"),
  costTotal: $("costTotal"),
  profit: $("profit"),
  profitRate: $("profitRate"),
  partsList: $("partsList"),
  replyText: $("replyText"),
  copyButton: $("copyButton"),
  copyStatus: $("copyStatus"),
  resetButton: $("resetButton")
};

let state = loadState();

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

function sanitizeCount(value) {
  const count = Number.parseInt(value, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return { ...INITIAL_STATE };
    return {
      shape: ["line", "u", "box"].includes(saved.shape) ? saved.shape : INITIAL_STATE.shape,
      panel1500: sanitizeCount(saved.panel1500),
      panel900: sanitizeCount(saved.panel900),
      gates: sanitizeCount(saved.gates)
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncInputs() {
  elements.panel1500.value = state.panel1500;
  elements.panel900.value = state.panel900;
  elements.gates.value = state.gates;

  document.querySelectorAll("[data-shape]").forEach((button) => {
    const active = button.dataset.shape === state.shape;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getLineItems() {
  const regularPanels = state.panel1500 + state.panel900;
  const totalSections = regularPanels + state.gates;
  const posts = totalSections === 0 ? 0 : state.shape === "box" ? totalSections : totalSections + 1;
  const joints = regularPanels * 4;
  const hinges = state.gates * 2;
  const latches = state.gates * 2;
  const gatePanels900 = state.gates;
  const totalPanels900 = state.panel900 + gatePanels900;

  return [
    {
      key: "panel1500",
      quantity: state.panel1500,
      note: "通常パネル"
    },
    {
      key: "panel900",
      quantity: totalPanels900,
      note: `通常${state.panel900}枚 + 門扉用${gatePanels900}枚`
    },
    {
      key: "post",
      quantity: posts,
      note: state.shape === "box" ? "閉じた形状: 総区画数と同数" : "直線・コの字: 総区画数 + 1"
    },
    {
      key: "joint",
      quantity: joints,
      note: "通常フェンスパネル × 4個"
    },
    {
      key: "hinge",
      quantity: hinges,
      note: "門扉 × 2個"
    },
    {
      key: "latch",
      quantity: latches,
      note: "門扉 × 2個"
    }
  ];
}

function calculate() {
  const lineItems = getLineItems().map((item) => {
    const product = PRODUCT_MASTER[item.key];
    return {
      ...item,
      name: product.name,
      listAmount: product.listPrice * item.quantity,
      costAmount: product.costPrice * item.quantity
    };
  });

  const listTotal = lineItems.reduce((total, item) => total + item.listAmount, 0);
  const costTotal = lineItems.reduce((total, item) => total + item.costAmount, 0);
  const customerTotal = Math.round(listTotal * CUSTOMER_RATE);
  const tax = Math.round(customerTotal * TAX_RATE);
  const customerTotalTaxIn = customerTotal + tax;
  const profit = customerTotal - costTotal;
  const profitRate = customerTotal > 0 ? (profit / customerTotal) * 100 : 0;

  return {
    lineItems,
    listTotal,
    costTotal,
    customerTotal,
    tax,
    customerTotalTaxIn,
    profit,
    profitRate
  };
}

function render() {
  const result = calculate();
  syncInputs();

  elements.customerTotalTaxIn.textContent = yenMark(result.customerTotalTaxIn);
  elements.customerTotal.textContent = yen(result.customerTotal);
  elements.listTotal.textContent = yen(result.listTotal);
  elements.costTotal.textContent = yen(result.costTotal);
  elements.profit.textContent = yen(result.profit);
  elements.profitRate.textContent = percent(result.profitRate);

  elements.partsList.innerHTML = result.lineItems.map((item) => `
    <div class="part-card">
      <h3>${item.name}<small class="parts-note">${item.note}</small></h3>
      <div class="part-values">
        <span><small>数量</small><strong>${item.quantity.toLocaleString("ja-JP")}</strong></span>
        <span><small>定価</small><strong>${yen(item.listAmount)}</strong></span>
        <span><small>仕入</small><strong>${yen(item.costAmount)}</strong></span>
      </div>
    </div>
  `).join("");

  elements.replyText.value = [
    "お問い合わせありがとうございます。",
    `こちらの仕様ですと、アメリカンフェンス材料一式で税込${yen(result.customerTotalTaxIn)}になります。`,
    "",
    "表示価格は材料のみの価格です。",
    "人工芝、基礎工事、アメリカンフェンスの設置費用は含まれておりません。"
  ].join("\n");

  saveState();
}

function updateCount(id, value) {
  state[id] = sanitizeCount(value);
  render();
}

function setupInputs() {
  let repeatTimer = null;
  let repeatDelayTimer = null;
  let didRepeat = false;

  function clearRepeat() {
    window.clearTimeout(repeatDelayTimer);
    window.clearInterval(repeatTimer);
    repeatDelayTimer = null;
    repeatTimer = null;
  }

  function applyStep(button) {
    const target = button.dataset.stepTarget;
    const step = Number.parseInt(button.dataset.step, 10);
    state[target] = Math.max(0, sanitizeCount(state[target]) + step);
    render();
  }

  ["panel1500", "panel900", "gates"].forEach((id) => {
    elements[id].addEventListener("input", () => updateCount(id, elements[id].value));
    elements[id].addEventListener("blur", render);
  });

  document.querySelectorAll("[data-step-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (didRepeat) {
        event.preventDefault();
        didRepeat = false;
        return;
      }
      applyStep(button);
    });

    button.addEventListener("pointerdown", () => {
      clearRepeat();
      didRepeat = false;
      repeatDelayTimer = window.setTimeout(() => {
        didRepeat = true;
        applyStep(button);
        repeatTimer = window.setInterval(() => applyStep(button), 115);
      }, 420);
    });

    button.addEventListener("pointerup", clearRepeat);
    button.addEventListener("pointercancel", clearRepeat);
    button.addEventListener("pointerleave", clearRepeat);
  });

  document.querySelectorAll("[data-shape]").forEach((button) => {
    button.addEventListener("click", () => {
      state.shape = button.dataset.shape;
      render();
    });
  });

  elements.resetButton.addEventListener("click", () => {
    state = { ...INITIAL_STATE };
    render();
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

setupInputs();
elements.copyButton.addEventListener("click", copyReply);
render();
