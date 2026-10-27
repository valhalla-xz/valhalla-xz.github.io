
const $ = (selector) => document.querySelector(selector);

const results = $("#results");
const search = $("#search");
const category = $("#category");
const sort = $("#sort");
const count = $("#count");
const dialog = $("#details");

let database = [];

const categoryNames = {
  CPU: "CPU",
  GPU: "GPU",
  Motherboard: "マザーボード"
};

async function loadDatabase() {
  try {
    const response = await fetch("./data.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("JSONのルートは配列である必要がある");
    }

    database = data;
    render();
  } catch (error) {
    console.error(error);
    count.textContent = "データの読み込みに失敗";
    results.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.textContent =
      "data.jsonを読み込めない。JSONの構文とファイルの配置を確認すること。";

    row.append(cell);
    results.append(row);
  }
}

function allText(part) {
  return JSON.stringify(part).toLocaleLowerCase("ja");
}

function power(part) {
  return Number.isFinite(part.power_w)
    ? part.power_w
    : Number.POSITIVE_INFINITY;
}

function getSpecs(part) {
  if (part.type === "CPU") {
    const cores = `${part.cores ?? "?"}コア`;
    const threads = `${part.threads ?? "?"}スレッド`;
    const watts = Number.isFinite(part.power_w)
      ? `${part.power_w} W (${part.power_type || "定義不明"})`
      : "電力値未登録";

    return `${cores} / ${threads} / ${watts}`;
  }

  if (part.type === "GPU") {
    const memory = part.vram_gb
      ? `${part.vram_gb} GB ${part.vram_type || ""}`
      : "VRAM未登録";

    const watts = Number.isFinite(part.power_w)
      ? ` / ${part.power_w} W`
      : "";

    return `${memory} / ${part.pcie || "PCIe未登録"}${watts}`;
  }

  const slots = Array.isArray(part.pcie_slots)
    ? part.pcie_slots.reduce(
        (sum, slot) => sum + (slot.count || 1),
        0
      )
    : 0;

  return [
    part.chipset,
    part.form_factor,
    part.memory_type,
    `${part.ram_slots ?? "?"} RAMスロット`,
    `PCIeスロット ${slots}`
  ].filter(Boolean).join(" / ");
}

function render() {
  const keyword = search.value.trim().toLocaleLowerCase("ja");
  const selectedCategory = category.value;

  const filtered = database.filter((part) => {
    const matchesCategory =
      selectedCategory === "all" ||
      part.type === selectedCategory;

    const matchesKeyword =
      allText(part).includes(keyword);

    return matchesCategory && matchesKeyword;
  });

  if (sort.value === "power-asc") {
    filtered.sort((a, b) => power(a) - power(b));
  } else if (sort.value === "power-desc") {
    filtered.sort((a, b) => power(b) - power(a));
  } else {
    filtered.sort((a, b) =>
      a.model.localeCompare(b.model, "ja")
    );
  }

  count.textContent =
    `${filtered.length} 件 / 全 ${database.length} 件`;

  results.replaceChildren();

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.textContent = "該当する製品はない。";

    row.append(cell);
    results.append(row);
    return;
  }

  for (const part of filtered) {
    const row = document.createElement("tr");

    addCell(row, categoryNames[part.type] || part.type);
    addCell(row, part.model || "名称未登録");
    addCell(row, part.manufacturer || "不明");
    addCell(row, part.socket || part.pcie || "—");
    addCell(row, getSpecs(part));

    const actionCell = document.createElement("td");
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = "詳細";
    button.addEventListener("click", () => showDetails(part));

    actionCell.append(button);
    row.append(actionCell);
    results.append(row);
  }
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = String(value);
  row.append(cell);
}

function showDetails(part) {
  $("#detail-title").textContent = part.model || "製品詳細";

  const container = $("#detail-content");
  container.replaceChildren();

  const list = document.createElement("dl");
  list.className = "detail-list";

  const excluded = new Set([
    "type",
    "model",
    "manufacturer",
    "source_url"
  ]);

  const labels = {
    architecture: "アーキテクチャ",
    chipset: "チップセット",
    socket: "ソケット",
    form_factor: "フォームファクタ",
    cores: "コア数",
    threads: "スレッド数",
    p_cores: "Pコア数",
    e_cores: "Eコア数",
    base_clock_ghz: "基本クロック (GHz)",
    boost_clock_ghz: "最大ブーストクロック (GHz)",
    power_w: "電力値 (W)",
    power_type: "電力値の定義",
    max_turbo_power_w: "最大ターボ電力 (W)",
    memory_types: "対応メモリ規格",
    memory_type: "メモリ規格",
    max_memory_gb: "最大メモリ容量 (GB)",
    pcie: "PCIe接続",
    vram_gb: "VRAM容量 (GB)",
    vram_type: "VRAM規格",
    ram_slots: "RAMスロット数",
    pcie_slots: "PCIeスロット構成",
    wifi: "Wi-Fi",
    wifi_standard: "Wi-Fi規格",
    bluetooth: "Bluetooth",
    wired_lan: "有線LAN",
    m2_slots: "M.2スロット数",
    sata_ports: "SATAポート数",
    power_connectors: "電源コネクタ"
  };

  for (const [key, value] of Object.entries(part)) {
    if (
      excluded.has(key) ||
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const dt = document.createElement("dt");
    const dd = document.createElement("dd");

    dt.textContent = labels[key] || key;

    if (key === "pcie_slots" && Array.isArray(value)) {
      dd.textContent = value.map((slot) => {
        return [
          `${slot.count ?? 1} × ${slot.physical}`,
          slot.generation,
          `電気的接続: ${slot.electrical_lanes}`
        ].filter(Boolean).join(" / ");
      }).join("\n");
    } else if (Array.isArray(value)) {
      dd.textContent = value.join("、");
    } else if (typeof value === "boolean") {
      dd.textContent = value ? "対応" : "非対応";
    } else if (typeof value === "object") {
      dd.textContent = JSON.stringify(value);
    } else {
      dd.textContent = String(value);
    }

    list.append(dt, dd);
  }

  container.append(list);

  if (part.source_url) {
    const paragraph = document.createElement("p");
    const link = document.createElement("a");

    link.href = part.source_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "source-link";
    link.textContent = "メーカー公式の仕様ページ";

    paragraph.append(link);
    container.append(paragraph);
  }

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  }
}

search.addEventListener("input", render);
category.addEventListener("change", render);
sort.addEventListener("change", render);

$("#close").addEventListener("click", () => {
  dialog.close();
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

loadDatabase();
