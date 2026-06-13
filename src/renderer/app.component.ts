import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DataTable, DbProject } from "../shared/types";
import type { DbMasterApi } from "./dbmaster-api";
import { PlayerEditorPageComponent } from "./player-editor-page.component";
import { PlayerEditorService } from "./player-editor.service";

type ToastTone = "info" | "warn" | "error";

interface TableListItem {
  table: DataTable;
  index: number;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, PlayerEditorPageComponent],
  templateUrl: "./app.component.html"
})
export class AppComponent implements AfterViewInit {
  @ViewChild("gridWrap") private gridWrap?: ElementRef<HTMLElement>;
  @ViewChild("dataGrid") private dataGrid?: ElementRef<HTMLTableElement>;
  @ViewChild("horizontalScroll") private horizontalScroll?: ElementRef<HTMLElement>;
  @ViewChild("horizontalScrollInner") private horizontalScrollInner?: ElementRef<HTMLElement>;

  private readonly api: DbMasterApi = window.dbmaster;

  constructor(private readonly playerEditor: PlayerEditorService) {}

  project?: DbProject;
  currentTableIndex = 0;
  viewMode: "table" | "playerEditor" = "table";
  playerEditorRowIndex = 0;
  page = 0;
  pageSize = 100;
  selectedColumnIndex = 0;
  selectedRows = new Set<number>();
  copied?: { tableName: string; rows: string[][] };
  sort?: { column: number; direction: 1 | -1 };
  tableFilter = "";
  searchTerm = "";
  searchExact = false;
  statusLine = "Ready";
  toastMessage = "";
  toastTone: ToastTone = "info";
  toastVisible = false;
  loadingActive = false;
  loadingTitle = "Loading";
  loadingDetail = "Please wait";

  ngAfterViewInit(): void {
    this.syncHorizontalScrollbar();
  }

  get projectSubtitle(): string {
    if (!this.project) {
      return "No project loaded";
    }
    const mode = this.project.binaryReadMode && this.project.binaryReadMode !== "none" ? ` / ${this.project.binaryReadMode}` : "";
    return `${this.project.title} / ${this.project.sourceKind}${mode}`;
  }

  get hasProject(): boolean {
    return Boolean(this.project);
  }

  get canSaveDatabase(): boolean {
    return this.project?.sourceKind === "database" && this.project.binaryReadMode !== "none" && Boolean(this.project.dbPath);
  }

  get hasTable(): boolean {
    return Boolean(this.currentTable());
  }

  get isPlayersTable(): boolean {
    return this.playerEditor.isPlayersTable(this.currentTable());
  }

  get canOpenPlayerEditor(): boolean {
    return this.isPlayersTable && this.selectedRows.size === 1;
  }

  get selectedPlayerName(): string {
    if (!this.project || !this.isPlayersTable || this.selectedRows.size !== 1) {
      return "";
    }
    return this.playerEditor.resolvePlayerName(this.project, this.selectedRowIndexes()[0]);
  }

  get hasSelection(): boolean {
    return this.selectedRows.size > 0;
  }

  get canPaste(): boolean {
    return this.hasTable && Boolean(this.copied);
  }

  get canReplace(): boolean {
    return this.hasSelection && this.canPaste;
  }

  get fieldInfo(): string {
    const table = this.currentTable();
    if (!table) {
      return "-";
    }
    const field = table.fields[this.selectedColumnIndex];
    if (!field) {
      return table.warning || `${table.rows.length} records`;
    }
    const range = field.rangeHigh >= field.rangeLow ? ` / ${field.rangeLow}..${field.rangeHigh}` : "";
    const depth = field.depth ? ` / ${field.depth} bits` : "";
    return `${field.kind}${range}${depth}`;
  }

  get pageInfo(): string {
    const table = this.currentTable();
    if (!table || table.rows.length === 0) {
      return "0 - 0 / 0";
    }
    const { start, end, total } = this.pageBounds(table);
    return `${start + 1} - ${end} / ${total}`;
  }

  get isPrevDisabled(): boolean {
    return this.page === 0;
  }

  get isNextDisabled(): boolean {
    const table = this.currentTable();
    if (!table) {
      return true;
    }
    return this.pageBounds(table).end >= table.rows.length;
  }

  filteredTables(): TableListItem[] {
    const filter = this.tableFilter.trim().toLowerCase();
    return (this.project?.tables ?? [])
      .map((table, index) => ({ table, index }))
      .filter((item) => !filter || item.table.name.toLowerCase().includes(filter));
  }

  currentTable(): DataTable | undefined {
    return this.project?.tables[this.currentTableIndex];
  }

  visibleRowIndexes(): number[] {
    const table = this.currentTable();
    if (!table) {
      return [];
    }
    const { start, end } = this.pageBounds(table);
    const indexes: number[] = [];
    for (let index = start; index < end; index += 1) {
      indexes.push(index);
    }
    return indexes;
  }

  trackByTable(_index: number, item: TableListItem): string {
    return `${item.index}:${item.table.name}`;
  }

  trackByColumn(index: number): number {
    return index;
  }

  trackByRowIndex(_index: number, rowIndex: number): number {
    return rowIndex;
  }

  async openDatabase(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openDatabase();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Opening database", "Reading XML and DB tables");
  }

  async openXml(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openXml();
      if (result.project) {
        this.loadProject(result.project);
      }
    });
  }

  async openTextFolder(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openTextFolder();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Opening text tables", "Reading exported .txt files");
  }

  async saveProject(): Promise<void> {
    await this.guarded(async () => {
      if (!this.project) {
        return;
      }
      const result = await this.api.saveDatabase(this.project);
      if (result.filePath) {
        if (result.tablesWritten === 0) {
          this.setStatus("No changes to save");
          return;
        }
        for (const table of this.project.tables) {
          table.changed = false;
        }
        const warnings = result.warnings.length > 0 ? ` ${result.warnings.length} warning(s).` : "";
        this.setStatus(`${result.tablesWritten} table(s) saved to DB.${warnings}`);
      }
    }, "Saving database", "Writing .db file and backup");
  }

  async exportTable(): Promise<void> {
    await this.guarded(async () => {
      const table = this.currentTable();
      if (!table) {
        return;
      }
      const result = await this.api.exportTable(table);
      if (result.filePath) {
        this.setStatus(`${table.name} exported`);
      }
    });
  }

  async exportAll(): Promise<void> {
    await this.guarded(async () => {
      if (!this.project) {
        return;
      }
      const result = await this.api.exportAll(this.project);
      if (result.folderPath) {
        this.setStatus(`${result.count ?? 0} table(s) exported`);
      }
    }, "Exporting tables", "Writing .txt files");
  }

  async importTable(): Promise<void> {
    await this.guarded(async () => {
      const table = this.currentTable();
      const result = await this.api.importTable(table?.name);
      if (result.table) {
        this.mergeImportedTable(result.table);
      }
    });
  }

  async importAll(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.importAll();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Importing tables", "Reading .txt files");
  }

  async extractBig(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.extractDatabasesFromBig();
      if (!result.canceled) {
        const warnings = result.warnings?.length ? ` ${result.warnings.length} warning(s).` : "";
        this.showToast(`${result.message ?? "Extraction complete."}${warnings}`, result.warnings?.length ? "warn" : "info");
      }
    });
  }

  async calculateHashes(): Promise<void> {
    await this.guarded(async () => {
      const table = this.currentTable();
      if (!table) {
        return;
      }
      const hashIndex = table.columns.findIndex((column) => column.toLowerCase() === "hashid");
      const stringIndex = table.columns.findIndex((column) => column.toLowerCase() === "stringid");
      if (hashIndex < 0 || stringIndex < 0) {
        this.showToast("This table needs hashid and stringid columns.", "warn");
        return;
      }

      const hashes = await this.api.computeLanguageHashes(table.rows.map((row) => row[stringIndex] ?? ""));
      hashes.forEach((hash, index) => {
        table.rows[index][hashIndex] = String(hash);
      });
      table.changed = true;
      this.syncHorizontalScrollbar();
      this.setStatus(`Calculated ${hashes.length} hash value(s)`);
    }, "Calculating hashes", "Updating hashid values");
  }

  selectTable(index: number): void {
    this.currentTableIndex = index;
    this.viewMode = "table";
    this.page = 0;
    this.selectedColumnIndex = 0;
    this.selectedRows.clear();
    this.resetHorizontalScroll();
  }

  selectColumn(index: number): void {
    this.selectedColumnIndex = index;
  }

  sortByColumn(column: number): void {
    const table = this.currentTable();
    if (!table) {
      return;
    }
    const direction = this.sort?.column === column ? (this.sort.direction * -1) as 1 | -1 : 1;
    this.sort = { column, direction };
    table.rows.sort((left, right) => {
      const a = left[column] ?? "";
      const b = right[column] ?? "";
      const na = Number(a);
      const nb = Number(b);
      const result = Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b);
      return result * direction;
    });
    table.changed = true;
    this.syncHorizontalScrollbar();
  }

  updateCell(rowIndex: number, columnIndex: number, event: Event): void {
    const table = this.currentTable();
    const input = event.target as HTMLInputElement;
    if (!table) {
      return;
    }
    table.rows[rowIndex][columnIndex] = input.value;
    table.changed = true;
    this.setStatus(`${table.name} changed`);
  }

  toggleRow(rowIndex: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedRows.add(rowIndex);
    } else {
      this.selectedRows.delete(rowIndex);
    }
  }

  selectGridRow(rowIndex: number, event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey) {
      if (this.selectedRows.has(rowIndex)) {
        this.selectedRows.delete(rowIndex);
      } else {
        this.selectedRows.add(rowIndex);
      }
      return;
    }

    this.selectedRows.clear();
    this.selectedRows.add(rowIndex);
    if (this.isPlayersTable) {
      const name = this.selectedPlayerName;
      this.setStatus(name ? `${name} selected` : `Player row ${rowIndex + 1} selected`);
    }
  }

  openPlayerEditor(): void {
    if (!this.canOpenPlayerEditor) {
      this.showToast("Select one player row.", "warn");
      return;
    }
    this.playerEditorRowIndex = this.selectedRowIndexes()[0];
    this.viewMode = "playerEditor";
  }

  closePlayerEditor(): void {
    this.viewMode = "table";
    this.resetHorizontalScroll();
  }

  onPlayerEditorApplied(message: string): void {
    this.setStatus(message);
    this.syncHorizontalScrollbar();
  }

  copyRows(): void {
    const table = this.currentTable();
    if (!table) {
      return;
    }
    const rows = this.selectedRowIndexes().map((index) => [...table.rows[index]]);
    if (rows.length === 0) {
      this.showToast("Select at least one row.", "warn");
      return;
    }
    this.copied = { tableName: table.name, rows };
    this.setStatus(`${rows.length} row(s) copied`);
  }

  pasteRows(replace = false): void {
    const table = this.currentTable();
    if (!table || !this.copied) {
      return;
    }
    if (this.copied.tableName !== table.name) {
      this.showToast("Copied rows belong to another table.", "warn");
      return;
    }
    if (replace) {
      this.deleteRows(false);
    }
    table.rows.push(...this.copied.rows.map((row) => [...row]));
    table.changed = true;
    this.syncHorizontalScrollbar();
    this.setStatus(`${this.copied.rows.length} row(s) pasted`);
  }

  deleteRows(showMessage = true): void {
    const table = this.currentTable();
    if (!table) {
      return;
    }
    const selected = new Set(this.selectedRowIndexes());
    if (selected.size === 0) {
      if (showMessage) {
        this.showToast("Select at least one row.", "warn");
      }
      return;
    }
    table.rows = table.rows.filter((_row, index) => !selected.has(index));
    table.changed = true;
    this.selectedRows.clear();
    this.syncHorizontalScrollbar();
    if (showMessage) {
      this.setStatus(`${selected.size} row(s) deleted`);
    }
  }

  countRows(): void {
    const table = this.currentTable();
    if (table) {
      this.showToast(`Record counter = ${table.rows.length}`);
    }
  }

  findNext(): void {
    const table = this.currentTable();
    if (!table) {
      return;
    }
    const term = this.searchTerm.toLowerCase();
    const column = this.selectedColumnIndex;
    if (!term) {
      this.showToast("Type a search value.", "warn");
      return;
    }

    const total = table.rows.length;
    const current = this.selectedRows.size > 0 ? this.selectedRowIndexes()[0] : this.page * this.pageSize;
    for (let step = 1; step <= total; step += 1) {
      const index = (current + step) % total;
      const value = String(table.rows[index][column] ?? "").toLowerCase();
      const ok = this.searchExact ? value === term : value.includes(term);
      if (ok) {
        this.selectedRows.clear();
        this.selectedRows.add(index);
        this.page = Math.floor(index / this.pageSize);
        this.syncHorizontalScrollbar();
        return;
      }
    }
    this.showToast("Not found", "warn");
  }

  previousPage(): void {
    this.page = Math.max(0, this.page - 1);
    this.syncHorizontalScrollbar();
  }

  nextPage(): void {
    this.page += 1;
    this.syncHorizontalScrollbar();
  }

  onPageSizeChange(): void {
    this.page = 0;
    this.syncHorizontalScrollbar();
  }

  onHorizontalScroll(): void {
    const gridWrap = this.gridWrap?.nativeElement;
    const horizontalScroll = this.horizontalScroll?.nativeElement;
    if (!gridWrap || !horizontalScroll) {
      return;
    }
    if (Math.abs(gridWrap.scrollLeft - horizontalScroll.scrollLeft) > 1) {
      gridWrap.scrollLeft = horizontalScroll.scrollLeft;
    }
  }

  onGridScroll(): void {
    const gridWrap = this.gridWrap?.nativeElement;
    const horizontalScroll = this.horizontalScroll?.nativeElement;
    if (!gridWrap || !horizontalScroll) {
      return;
    }
    if (Math.abs(horizontalScroll.scrollLeft - gridWrap.scrollLeft) > 1) {
      horizontalScroll.scrollLeft = gridWrap.scrollLeft;
    }
  }

  onGridWheel(event: WheelEvent): void {
    const gridWrap = this.gridWrap?.nativeElement;
    const horizontalScroll = this.horizontalScroll?.nativeElement;
    if (!gridWrap || !horizontalScroll || !event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }
    gridWrap.scrollLeft += event.deltaY;
    horizontalScroll.scrollLeft = gridWrap.scrollLeft;
    event.preventDefault();
  }

  @HostListener("window:resize")
  onWindowResize(): void {
    this.syncHorizontalScrollbar();
  }

  private loadProject(project: DbProject): void {
    this.project = project;
    this.currentTableIndex = 0;
    this.page = 0;
    this.selectedColumnIndex = 0;
    this.selectedRows.clear();
    this.copied = undefined;
    this.sort = undefined;
    const warning = project.warnings.find(Boolean);
    if (warning) {
      this.showToast(warning, "warn");
    }
    this.setStatus(project.warnings.length > 0 ? `${project.title} loaded with ${project.warnings.length} warning(s)` : `${project.title} loaded`);
    this.resetHorizontalScroll();
  }

  private mergeImportedTable(imported: DataTable): void {
    const project = this.project;
    const table = this.currentTable();
    if (!project || !table) {
      return;
    }

    if (imported.columns.join("\t") !== table.columns.join("\t")) {
      this.showToast("Imported columns do not match the current table.", "warn");
      return;
    }

    imported.name = table.name;
    imported.fields = table.fields;
    imported.changed = true;
    project.tables[this.currentTableIndex] = imported;
    this.syncHorizontalScrollbar();
    this.setStatus(`${table.name} imported`);
  }

  private selectedRowIndexes(): number[] {
    return [...this.selectedRows].sort((left, right) => left - right);
  }

  private pageBounds(table: DataTable): { start: number; end: number; total: number } {
    const total = table.rows.length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize) - 1);
    this.page = Math.min(this.page, maxPage);
    const start = this.page * this.pageSize;
    const end = Math.min(total, start + this.pageSize);
    return { start, end, total };
  }

  private async guarded(action: () => Promise<void>, title?: string, detail?: string): Promise<void> {
    try {
      if (title) {
        await this.setLoading(true, title, detail ?? "Please wait");
      }
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
      this.setStatus("Error");
    } finally {
      if (title) {
        await this.setLoading(false);
      }
    }
  }

  private async setLoading(loading: boolean, title = "Loading", detail = "Please wait"): Promise<void> {
    this.loadingTitle = title;
    this.loadingDetail = detail;
    this.loadingActive = loading;
    if (loading) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  }

  private setStatus(message: string): void {
    this.statusLine = message;
  }

  private showToast(message: string, tone: ToastTone = "info"): void {
    this.toastMessage = message;
    this.toastTone = tone;
    this.toastVisible = true;
    window.setTimeout(() => {
      this.toastVisible = false;
    }, 5200);
  }

  private resetHorizontalScroll(): void {
    requestAnimationFrame(() => {
      if (this.gridWrap?.nativeElement) {
        this.gridWrap.nativeElement.scrollLeft = 0;
      }
      if (this.horizontalScroll?.nativeElement) {
        this.horizontalScroll.nativeElement.scrollLeft = 0;
      }
      this.syncHorizontalScrollbar();
    });
  }

  private syncHorizontalScrollbar(): void {
    requestAnimationFrame(() => {
      const table = this.currentTable();
      const gridWrap = this.gridWrap?.nativeElement;
      const dataGrid = this.dataGrid?.nativeElement;
      const horizontalScroll = this.horizontalScroll?.nativeElement;
      const horizontalScrollInner = this.horizontalScrollInner?.nativeElement;
      if (!table || !gridWrap || !dataGrid || !horizontalScroll || !horizontalScrollInner) {
        return;
      }

      const scrollWidth = dataGrid.scrollWidth;
      const clientWidth = gridWrap.clientWidth;
      horizontalScrollInner.style.width = `${Math.max(scrollWidth, clientWidth)}px`;
      horizontalScroll.classList.toggle("hidden", scrollWidth <= clientWidth + 1);
      horizontalScroll.scrollLeft = gridWrap.scrollLeft;
    });
  }
}
