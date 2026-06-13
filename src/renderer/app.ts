interface FieldDescriptor {
  name: string;
  kind: string;
  rangeLow: number;
  rangeHigh: number;
  depth?: number;
}

interface DataTable {
  name: string;
  columns: string[];
  fields: FieldDescriptor[];
  rows: string[][];
  changed?: boolean;
  warning?: string;
}

interface DbProject {
  title: string;
  sourceKind: string;
  xmlPath?: string;
  dbPath?: string;
  folderPath?: string;
  tables: DataTable[];
  descriptors: unknown[];
  warnings: string[];
  binaryReadMode?: string;
}

interface DbMasterApi {
  openXml(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openDatabase(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openTextFolder(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  saveSnapshot(project: DbProject): Promise<{ canceled?: boolean; filePath?: string }>;
  exportTable(table: DataTable): Promise<{ canceled?: boolean; filePath?: string }>;
  exportAll(project: DbProject): Promise<{ canceled?: boolean; folderPath?: string; count?: number }>;
  importTable(expectedName?: string): Promise<{ canceled?: boolean; table?: DataTable }>;
  importAll(): Promise<{ canceled?: boolean; project?: DbProject }>;
  computeLanguageHashes(values: string[]): Promise<number[]>;
  extractDatabasesFromBig(): Promise<{ canceled?: boolean; message?: string; entries?: unknown[]; warnings?: string[] }>;
}

interface Window {
  dbmaster: DbMasterApi;
}

const api = window.dbmaster;

const state: {
  project?: DbProject;
  currentTableIndex: number;
  page: number;
  pageSize: number;
  selectedRows: Set<number>;
  copied?: { tableName: string; rows: string[][] };
  sort?: { column: number; direction: 1 | -1 };
} = {
  currentTableIndex: 0,
  page: 0,
  pageSize: 100,
  selectedRows: new Set()
};

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
};

const tableList = $("table-list");
const projectSubtitle = $("project-subtitle");
const tableFilter = $("table-filter") as HTMLInputElement;
const gridWrap = $("grid-wrap");
const emptyState = $("empty-state");
const dataGrid = $("data-grid") as HTMLTableElement;
const columnSelect = $("column-select") as HTMLSelectElement;
const searchInput = $("search-input") as HTMLInputElement;
const searchExact = $("search-exact") as HTMLInputElement;
const fieldInfo = $("field-info");
const statusLine = $("status-line");
const pageInfo = $("page-info");
const pageSize = $("page-size") as HTMLSelectElement;
const toast = $("toast");

function currentTable(): DataTable | undefined {
  return state.project?.tables[state.currentTableIndex];
}

function setStatus(message: string): void {
  statusLine.textContent = message;
}

function showToast(message: string, tone: "info" | "warn" | "error" = "info"): void {
  toast.textContent = message;
  toast.className = `toast ${tone === "info" ? "" : tone}`;
  window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 5200);
}

function setEnabled(ids: string[], enabled: boolean): void {
  for (const id of ids) {
    ($<HTMLButtonElement>(id)).disabled = !enabled;
  }
}

function updateButtons(): void {
  const hasProject = Boolean(state.project);
  const hasTable = Boolean(currentTable());
  const hasSelection = state.selectedRows.size > 0;
  setEnabled(["save-project"], hasProject);
  setEnabled(["export-table", "export-all", "import-table", "copy-row", "count-row", "hash-table"], hasTable);
  setEnabled(["delete-row"], hasTable && hasSelection);
  setEnabled(["paste-row"], hasTable && Boolean(state.copied));
  setEnabled(["replace-row"], hasTable && hasSelection && Boolean(state.copied));
  ($<HTMLButtonElement>("find-next")).disabled = !hasTable;
  searchInput.disabled = !hasTable;
  columnSelect.disabled = !hasTable;
}

function renderProjectMeta(): void {
  if (!state.project) {
    projectSubtitle.textContent = "No project loaded";
    return;
  }
  const project = state.project;
  const mode = project.binaryReadMode && project.binaryReadMode !== "none" ? ` / ${project.binaryReadMode}` : "";
  projectSubtitle.textContent = `${project.title} / ${project.sourceKind}${mode}`;
}

function renderTableList(): void {
  tableList.textContent = "";
  const project = state.project;
  if (!project) {
    return;
  }

  const filter = tableFilter.value.trim().toLowerCase();
  project.tables.forEach((table, index) => {
    if (filter && !table.name.toLowerCase().includes(filter)) {
      return;
    }

    const button = document.createElement("button");
    button.className = `table-item ${index === state.currentTableIndex ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `<span class="table-name"></span><span class="table-count"></span>`;
    button.querySelector(".table-name")!.textContent = table.name;
    button.querySelector(".table-count")!.textContent = String(table.rows.length);
    button.addEventListener("click", () => {
      state.currentTableIndex = index;
      state.page = 0;
      state.selectedRows.clear();
      render();
    });
    tableList.appendChild(button);
  });
}

function renderColumns(table: DataTable): void {
  columnSelect.textContent = "";
  table.columns.forEach((column, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = column;
    columnSelect.appendChild(option);
  });
  renderFieldInfo();
}

function renderFieldInfo(): void {
  const table = currentTable();
  if (!table) {
    fieldInfo.textContent = "-";
    return;
  }
  const index = Number(columnSelect.value || 0);
  const field = table.fields[index];
  if (!field) {
    fieldInfo.textContent = table.warning || `${table.rows.length} records`;
    return;
  }
  const range = field.rangeHigh >= field.rangeLow ? ` / ${field.rangeLow}..${field.rangeHigh}` : "";
  const depth = field.depth ? ` / ${field.depth} bits` : "";
  fieldInfo.textContent = `${field.kind}${range}${depth}`;
}

function pageBounds(table: DataTable): { start: number; end: number; total: number } {
  const total = table.rows.length;
  const maxPage = Math.max(0, Math.ceil(total / state.pageSize) - 1);
  state.page = Math.min(state.page, maxPage);
  const start = state.page * state.pageSize;
  const end = Math.min(total, start + state.pageSize);
  return { start, end, total };
}

function renderGrid(): void {
  const table = currentTable();
  dataGrid.textContent = "";

  if (!table) {
    emptyState.classList.remove("hidden");
    gridWrap.classList.add("hidden");
    pageInfo.textContent = "0 - 0 / 0";
    return;
  }

  emptyState.classList.add("hidden");
  gridWrap.classList.remove("hidden");
  renderColumns(table);

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const rowHeader = document.createElement("th");
  rowHeader.className = "row-select";
  rowHeader.textContent = "#";
  headerRow.appendChild(rowHeader);

  table.columns.forEach((column, index) => {
    const th = document.createElement("th");
    const button = document.createElement("button");
    button.type = "button";
    button.title = column;
    button.textContent = state.sort?.column === index ? `${column} ${state.sort.direction === 1 ? "up" : "down"}` : column;
    button.addEventListener("click", () => sortByColumn(index));
    th.appendChild(button);
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  dataGrid.appendChild(thead);

  const tbody = document.createElement("tbody");
  const { start, end, total } = pageBounds(table);
  for (let rowIndex = start; rowIndex < end; rowIndex += 1) {
    const row = table.rows[rowIndex];
    const tr = document.createElement("tr");
    if (state.selectedRows.has(rowIndex)) {
      tr.classList.add("row-selected");
    }

    const selectCell = document.createElement("td");
    selectCell.className = "row-select";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.selectedRows.has(rowIndex);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedRows.add(rowIndex);
      } else {
        state.selectedRows.delete(rowIndex);
      }
      renderGrid();
      updateButtons();
    });
    selectCell.appendChild(checkbox);
    tr.appendChild(selectCell);

    table.columns.forEach((_column, columnIndex) => {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.className = "cell-input";
      input.value = row[columnIndex] ?? "";
      input.addEventListener("change", () => {
        row[columnIndex] = input.value;
        table.changed = true;
        setStatus(`${table.name} changed`);
        renderTableList();
      });
      input.addEventListener("focus", () => {
        columnSelect.value = String(columnIndex);
        renderFieldInfo();
      });
      td.appendChild(input);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
  dataGrid.appendChild(tbody);

  pageInfo.textContent = total === 0 ? "0 - 0 / 0" : `${start + 1} - ${end} / ${total}`;
  ($<HTMLButtonElement>("prev-page")).disabled = state.page === 0;
  ($<HTMLButtonElement>("next-page")).disabled = end >= total;
}

function render(): void {
  renderProjectMeta();
  renderTableList();
  renderGrid();
  updateButtons();
}

function loadProject(project: DbProject): void {
  state.project = project;
  state.currentTableIndex = 0;
  state.page = 0;
  state.selectedRows.clear();
  state.copied = undefined;
  render();
  const warning = project.warnings.find(Boolean);
  if (warning) {
    showToast(warning, "warn");
  }
  setStatus(project.warnings.length > 0 ? `${project.title} loaded with ${project.warnings.length} warning(s)` : `${project.title} loaded`);
}

async function guarded(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showToast(message, "error");
    setStatus("Error");
  }
}

function sortByColumn(column: number): void {
  const table = currentTable();
  if (!table) {
    return;
  }
  const direction = state.sort?.column === column ? (state.sort.direction * -1) as 1 | -1 : 1;
  state.sort = { column, direction };
  table.rows.sort((left, right) => {
    const a = left[column] ?? "";
    const b = right[column] ?? "";
    const na = Number(a);
    const nb = Number(b);
    const result = Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b);
    return result * direction;
  });
  table.changed = true;
  renderGrid();
}

function selectedRowIndexes(): number[] {
  return [...state.selectedRows].sort((left, right) => left - right);
}

function copyRows(): void {
  const table = currentTable();
  if (!table) {
    return;
  }
  const rows = selectedRowIndexes().map((index) => [...table.rows[index]]);
  if (rows.length === 0) {
    showToast("Select at least one row.", "warn");
    return;
  }
  state.copied = { tableName: table.name, rows };
  setStatus(`${rows.length} row(s) copied`);
  updateButtons();
}

function pasteRows(replace = false): void {
  const table = currentTable();
  if (!table || !state.copied) {
    return;
  }
  if (state.copied.tableName !== table.name) {
    showToast("Copied rows belong to another table.", "warn");
    return;
  }
  if (replace) {
    deleteRows(false);
  }
  table.rows.push(...state.copied.rows.map((row) => [...row]));
  table.changed = true;
  render();
  setStatus(`${state.copied.rows.length} row(s) pasted`);
}

function deleteRows(showMessage = true): void {
  const table = currentTable();
  if (!table) {
    return;
  }
  const selected = new Set(selectedRowIndexes());
  if (selected.size === 0) {
    if (showMessage) {
      showToast("Select at least one row.", "warn");
    }
    return;
  }
  table.rows = table.rows.filter((_row, index) => !selected.has(index));
  table.changed = true;
  state.selectedRows.clear();
  render();
  if (showMessage) {
    setStatus(`${selected.size} row(s) deleted`);
  }
}

function countRows(): void {
  const table = currentTable();
  if (table) {
    showToast(`Record counter = ${table.rows.length}`);
  }
}

function findNext(): void {
  const table = currentTable();
  if (!table) {
    return;
  }
  const term = searchInput.value.toLowerCase();
  const column = Number(columnSelect.value || 0);
  if (!term) {
    showToast("Type a search value.", "warn");
    return;
  }

  const total = table.rows.length;
  const current = state.selectedRows.size > 0 ? selectedRowIndexes()[0] : state.page * state.pageSize;
  for (let step = 1; step <= total; step += 1) {
    const index = (current + step) % total;
    const value = String(table.rows[index][column] ?? "").toLowerCase();
    const ok = searchExact.checked ? value === term : value.includes(term);
    if (ok) {
      state.selectedRows.clear();
      state.selectedRows.add(index);
      state.page = Math.floor(index / state.pageSize);
      renderGrid();
      updateButtons();
      return;
    }
  }
  showToast("Not found", "warn");
}

async function calculateHashes(): Promise<void> {
  const table = currentTable();
  if (!table) {
    return;
  }
  const hashIndex = table.columns.findIndex((column) => column.toLowerCase() === "hashid");
  const stringIndex = table.columns.findIndex((column) => column.toLowerCase() === "stringid");
  if (hashIndex < 0 || stringIndex < 0) {
    showToast("This table needs hashid and stringid columns.", "warn");
    return;
  }

  const hashes = await api.computeLanguageHashes(table.rows.map((row) => row[stringIndex] ?? ""));
  hashes.forEach((hash: number, index: number) => {
    table.rows[index][hashIndex] = String(hash);
  });
  table.changed = true;
  renderGrid();
  setStatus(`Calculated ${hashes.length} hash value(s)`);
}

function mergeImportedTable(imported: DataTable): void {
  const project = state.project;
  const table = currentTable();
  if (!project || !table) {
    return;
  }

  if (imported.columns.join("\t") !== table.columns.join("\t")) {
    showToast("Imported columns do not match the current table.", "warn");
    return;
  }

  imported.name = table.name;
  imported.fields = table.fields;
  imported.changed = true;
  project.tables[state.currentTableIndex] = imported;
  render();
  setStatus(`${table.name} imported`);
}

$("open-db").addEventListener("click", () => guarded(async () => {
  const result = await api.openDatabase();
  if (result.project) {
    loadProject(result.project);
  }
}));

$("open-xml").addEventListener("click", () => guarded(async () => {
  const result = await api.openXml();
  if (result.project) {
    loadProject(result.project);
  }
}));

$("open-text").addEventListener("click", () => guarded(async () => {
  const result = await api.openTextFolder();
  if (result.project) {
    loadProject(result.project);
  }
}));

$("save-project").addEventListener("click", () => guarded(async () => {
  if (!state.project) {
    return;
  }
  const result = await api.saveSnapshot(state.project);
  if (result.filePath) {
    setStatus("Project saved");
  }
}));

$("export-table").addEventListener("click", () => guarded(async () => {
  const table = currentTable();
  if (!table) {
    return;
  }
  const result = await api.exportTable(table);
  if (result.filePath) {
    setStatus(`${table.name} exported`);
  }
}));

$("export-all").addEventListener("click", () => guarded(async () => {
  if (!state.project) {
    return;
  }
  const result = await api.exportAll(state.project);
  if (result.folderPath) {
    setStatus(`${result.count ?? 0} table(s) exported`);
  }
}));

$("import-table").addEventListener("click", () => guarded(async () => {
  const table = currentTable();
  const result = await api.importTable(table?.name);
  if (result.table) {
    mergeImportedTable(result.table);
  }
}));

$("import-all").addEventListener("click", () => guarded(async () => {
  const result = await api.importAll();
  if (result.project) {
    loadProject(result.project);
  }
}));

$("extract-big").addEventListener("click", () => guarded(async () => {
  const result = await api.extractDatabasesFromBig();
  if (!result.canceled) {
    const warnings = result.warnings?.length ? ` ${result.warnings.length} warning(s).` : "";
    showToast(`${result.message ?? "Extraction complete."}${warnings}`, result.warnings?.length ? "warn" : "info");
  }
}));

$("copy-row").addEventListener("click", copyRows);
$("paste-row").addEventListener("click", () => pasteRows(false));
$("replace-row").addEventListener("click", () => pasteRows(true));
$("delete-row").addEventListener("click", () => deleteRows(true));
$("count-row").addEventListener("click", countRows);
$("find-next").addEventListener("click", findNext);
$("hash-table").addEventListener("click", () => guarded(calculateHashes));

$("prev-page").addEventListener("click", () => {
  state.page = Math.max(0, state.page - 1);
  renderGrid();
});

$("next-page").addEventListener("click", () => {
  state.page += 1;
  renderGrid();
});

pageSize.addEventListener("change", () => {
  state.pageSize = Number(pageSize.value);
  state.page = 0;
  renderGrid();
});

tableFilter.addEventListener("input", renderTableList);
columnSelect.addEventListener("change", renderFieldInfo);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    findNext();
  }
});

render();
