const tableBody = document.querySelector("#parts-table");
const searchInput = document.querySelector("#search");
const typeFilter = document.querySelector("#type-filter");
const sortFilter = document.querySelector("#sort-filter");
const resultCount = document.querySelector("#result-count");
const dialog = document.querySelector("#part-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogContent = document.querySelector("#dialog-content");
const closeDialog = document.querySelector("#close-dialog");

let parts = [];

async function loadParts() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    parts = await response.json();
    renderParts();
  } catch (error) {
    tableBody.innerHTML = '<tr><td colspan="6">データを読み込めなかった。ローカルで確認する場合は、簡易HTTPサーバー経由で開くか、GitHub Pagesに公開して確認すること。</td></tr>';
    resultCount.textContent = "読み込みエラー";
    console.error("データ読み込みエラー:", error);
  }
}

function getFilteredParts() {
  const keyword = searchInput.value.trim().toLocaleLowerCase("ja");
  const type = typeFilter.value;
  const sort = sortFilter.value;

  const filtered = parts.filter((part) => {
    const searchable = [
      part.type, part.model, part.manufacturer, part.architecture,
      part.socket, part.memory_type?.join(" "), part.notes
    ].filter(Boolean).join(" ").toLocaleLowerCase("ja");

    return (type === "all" || part.type === type) && searchable.includes(keyword);
  });

  filtered.sort((a, b) => {
    if (sort === "power-asc") return numericPower(a) - numericPower(b);
    if (sort === "power-desc") return numericPower(b) - numericPower(a);
    return a.model.localeCompare(b.model, "ja");
  });
  return filtered;
}

function numericPower(part) {
  return Number.isFinite(part.power_w) ? part.power_w : Number.POSITIVE_INFINITY;
}

function renderParts() {
  const filtered = getFilteredParts();
  resultCount.textContent = `${filtered.length} 件 / 全 ${parts.length} 件`;

  if (filtered.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6">該当する製品はない。</td></tr>';
    return;
  }

  tableBody.replaceChildren();
  for (const part of filtered) {
    const row = document.createElement("tr");
    addCell(row, part.type || "未分類");
    addCell(row, part.model || "名称不明");
    addCell(row, part.manufacturer || "不明");
    addCell(row, part.socket || "—");
    addCell(row, formatPower(part));
    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "詳細";
    button.addEventListener("click", () => showDetails(part));
    actionCell.append(button);
    row.append(actionCell);
    tableBody.append(row);
  }
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.append(cell);
}

function formatPower(part) {
  if (!Number.isFinite(part.power_w)) return "未登録";
  return `${part.power_w} W${part.power_label ? `（${part.power_label}）` : ""}`;
}

function showDetails(part) {
  dialogTitle.textContent = part.model || "製品詳細";
  dialogContent.replaceChildren();

  const details = [
    ["種別", part.type],
    ["メーカー", part.manufacturer],
    ["アーキテクチャ", part.architecture],
    ["ソケット・接続", part.socket],
    ["コア数", part.cores],
    ["スレッド数", part.threads],
    ["基本クロック", part.base_clock_ghz ? `${part.base_clock_ghz} GHz` : null],
    ["最大ブーストクロック", part.max_clock_ghz ? `${part.max_clock_ghz} GHz` : null],
    ["電力値", Number.isFinite(part.power_w) ? `${part.power_w} W` : null],
    ["電力値の定義", part.power_label],
    ["メモリ規格", part.memory_type?.join("、")],
    ["最大メモリ容量", part.max_memory_gb ? `${part.max_memory_gb} GB` : null],
    ["発売時期", part.release_date],
    ["互換性メモ", part.notes],
  ];

  const list = document.createElement("dl");
  list.className = "detail-list";
  for (const [label, value] of details) {
    if (value === undefined || value === null || value === "") continue;
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = String(value);
    list.append(dt, dd);
  }
  dialogContent.append(list);

  if (part.source_url) {
    const paragraph = document.createElement("p");
    const link = document.createElement("a");
    link.href = part.source_url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "source-link";
    link.textContent = "出典を開く";
    paragraph.append(link);
    dialogContent.append(paragraph);
  } else {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = "出典URLは未登録。公開前に公式資料を確認して登録すること。";
    dialogContent.append(note);
  }

  if (typeof dialog.showModal === "function") dialog.showModal();
}

searchInput.addEventListener("input", renderParts);
typeFilter.addEventListener("change", renderParts);
sortFilter.addEventListener("change", renderParts);
closeDialog.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

loadParts();
