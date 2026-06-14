import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DataTable, DbProject } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import type { DbMasterApi } from "../../services/dbmaster-api";
import { LeagueEditorService } from "../../services/league-editor.service";
import type { LeagueSearchResult } from "../../services/league-editor.service";
import { NationService } from "../../services/nation.service";
import { PlayerEditorService } from "../../services/player-editor.service";
import type { PlayerSearchResult } from "../../services/player-editor.service";
import { TeamEditorService } from "../../services/team-editor.service";
import type { TeamSearchResult } from "../../services/team-editor.service";
import { TransferService } from "../../services/transfer.service";
import type { TransferSearchResult } from "../../services/transfer.service";
import { LeagueEditorPageComponent } from "../league-editor/league-editor-page.component";
import { PlayerEditorPageComponent } from "../player-editor/player-editor-page.component";
import { TeamEditorPageComponent } from "../team-editor/team-editor-page.component";
import packageInfo from "../../../../package.json";

type ToastTone = "info" | "warn" | "error";
type ViewMode = "home" | "launcher" | "table" | "modules" | "playerEditor" | "teamEditor" | "leagueEditor";
type ModuleMode = "players" | "teams" | "leagues" | "transfers";

interface TableListItem {
  table: DataTable;
  index: number;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, PlayerEditorPageComponent, TeamEditorPageComponent, LeagueEditorPageComponent, SearchListComponent],
  templateUrl: "./app.component.html"
})
export class AppComponent implements AfterViewInit {
  @ViewChild("gridWrap") private gridWrap?: ElementRef<HTMLElement>;
  @ViewChild("dataGrid") private dataGrid?: ElementRef<HTMLTableElement>;
  @ViewChild("horizontalScroll") private horizontalScroll?: ElementRef<HTMLElement>;
  @ViewChild("horizontalScrollInner") private horizontalScrollInner?: ElementRef<HTMLElement>;

  private readonly api: DbMasterApi = window.dbmaster;
  private readonly minimumLoadingDurationMs = 400;
  readonly appName = "DBM Studio";
  readonly appVersion = packageInfo.version;

  constructor(
    private readonly leagueEditor: LeagueEditorService,
    private readonly nations: NationService,
    private readonly playerEditor: PlayerEditorService,
    private readonly teamEditor: TeamEditorService,
    private readonly transfers: TransferService
  ) {}

  project?: DbProject;
  currentTableIndex = 0;
  viewMode: ViewMode = "home";
  activeModule: ModuleMode = "players";
  playerEditorReturnMode: "table" | "modules" = "table";
  playerEditorRowIndex = 0;
  playerSearchTerm = "";
  playerSearchResults: PlayerSearchResult[] = [];
  teamEditorRowIndex = 0;
  teamSearchTerm = "";
  teamSearchResults: TeamSearchResult[] = [];
  leagueEditorRowIndex = 0;
  leagueSearchTerm = "";
  leagueCountryFilter = "";
  leagueSearchResults: LeagueSearchResult[] = [];
  transferSearchTerm = "";
  transferSearchResults: TransferSearchResult[] = [];
  transferDestinations: Record<number, string> = {};
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

  get canUsePlayerModule(): boolean {
    return Boolean(this.playerEditor.findPlayersTable(this.project));
  }

  get canUseTeamModule(): boolean {
    return Boolean(this.teamEditor.findTeamsTable(this.project));
  }

  get canUseLeagueModule(): boolean {
    return Boolean(this.leagueEditor.findLeaguesTable(this.project));
  }

  get canUseTransferModule(): boolean {
    return this.transfers.canUseTransferModule(this.project);
  }

  get canUseModules(): boolean {
    return this.canUsePlayerModule || this.canUseTeamModule || this.canUseLeagueModule || this.canUseTransferModule;
  }

  get playersCount(): number {
    return this.playerEditor.findPlayersTable(this.project)?.rows.length ?? 0;
  }

  get teamsCount(): number {
    return this.teamEditor.findTeamsTable(this.project)?.rows.length ?? 0;
  }

  get leaguesCount(): number {
    return this.leagueEditor.findLeaguesTable(this.project)?.rows.length ?? 0;
  }

  get transfersCount(): number {
    return this.transfers.findTeamPlayerLinksTable(this.project)?.rows.length ?? 0;
  }

  get nationOptions() {
    return this.nations.nationOptions(this.project);
  }

  get teamOptions() {
    return this.transfers.teamOptions(this.project);
  }

  get tableCount(): number {
    return this.project?.tables.length ?? 0;
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

  trackByPlayerResult(_index: number, player: PlayerSearchResult): string {
    return `${player.rowIndex}:${player.playerId}`;
  }

  trackByTeamResult(_index: number, team: TeamSearchResult): string {
    return `${team.rowIndex}:${team.teamId}`;
  }

  trackByLeagueResult(_index: number, league: LeagueSearchResult): string {
    return `${league.rowIndex}:${league.leagueId}`;
  }

  trackByTransferResult(_index: number, player: TransferSearchResult): string {
    return `${player.rowIndex}:${player.playerId}`;
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

  async saveProject(title = "Saving database", detail = "Writing .db file and backup"): Promise<void> {
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
    }, title, detail);
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

  showLauncher(): void {
    if (!this.project) {
      this.viewMode = "home";
      return;
    }
    this.viewMode = "launcher";
  }

  openTableWorkspace(): void {
    if (!this.project) {
      this.showToast("Open a DB/XML pair first.", "warn");
      this.viewMode = "home";
      return;
    }
    this.viewMode = "table";
    this.resetHorizontalScroll();
  }

  async openModulesWorkspace(module: ModuleMode = this.activeModule): Promise<void> {
    if (!this.project) {
      this.showToast("Open a DB/XML pair first.", "warn");
      this.viewMode = "home";
      return;
    }
    this.activeModule = module;
    this.viewMode = "modules";
    await this.loadActiveModule();
  }

  async selectModule(module: ModuleMode): Promise<void> {
    this.activeModule = module;
    await this.loadActiveModule();
  }

  async loadActiveModule(): Promise<void> {
    if (this.activeModule === "teams") {
      await this.searchTeams("Loading teams", "Reading team rows");
      return;
    }
    if (this.activeModule === "leagues") {
      await this.searchLeagues("Loading leagues", "Resolving countries and team links");
      return;
    }
    if (this.activeModule === "transfers") {
      await this.searchTransfers("Loading transfers", "Reading player club links");
      return;
    }
    await this.searchPlayers("Loading players", "Resolving names and relations");
  }

  async searchPlayers(title = "Searching players", detail = "Resolving names and relations"): Promise<void> {
    await this.guarded(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      this.refreshPlayerSearch();
    }, title, detail);
  }

  refreshPlayerSearch(): void {
    this.playerSearchResults = this.playerEditor.findPlayers(this.project, this.playerSearchTerm, this.playerSearchTerm.trim() ? 80 : 30);
    const suffix = this.playerSearchTerm.trim() ? ` for "${this.playerSearchTerm.trim()}"` : "";
    this.setStatus(`${this.playerSearchResults.length} player result(s)${suffix}`);
  }

  async searchTeams(title = "Searching teams", detail = "Reading team rows"): Promise<void> {
    await this.guarded(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      this.refreshTeamSearch();
    }, title, detail);
  }

  refreshTeamSearch(): void {
    this.teamSearchResults = this.teamEditor.findTeams(this.project, this.teamSearchTerm, this.teamSearchTerm.trim() ? 80 : 30);
    const suffix = this.teamSearchTerm.trim() ? ` for "${this.teamSearchTerm.trim()}"` : "";
    this.setStatus(`${this.teamSearchResults.length} team result(s)${suffix}`);
  }

  async searchLeagues(title = "Searching leagues", detail = "Resolving countries and team links"): Promise<void> {
    await this.guarded(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      this.refreshLeagueSearch();
    }, title, detail);
  }

  refreshLeagueSearch(): void {
    this.leagueSearchResults = this.leagueEditor.findLeagues(
      this.project,
      this.leagueSearchTerm,
      this.leagueCountryFilter,
      this.leagueSearchTerm.trim() || this.leagueCountryFilter ? 120 : 60
    );
    const suffix = this.leagueSearchTerm.trim() ? ` for "${this.leagueSearchTerm.trim()}"` : "";
    this.setStatus(`${this.leagueSearchResults.length} league result(s)${suffix}`);
  }

  clearLeagueCountryFilter(): void {
    this.leagueCountryFilter = "";
    this.refreshLeagueSearch();
  }

  async searchTransfers(title = "Searching transfers", detail = "Resolving players and clubs"): Promise<void> {
    await this.guarded(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      this.refreshTransferSearch();
    }, title, detail);
  }

  refreshTransferSearch(): void {
    this.transferSearchResults = this.transfers.findTransferPlayers(this.project, this.transferSearchTerm, this.transferSearchTerm.trim() ? 100 : 40);
    this.transferDestinations = Object.fromEntries(
      this.transferSearchResults.map((player) => [player.rowIndex, this.transferDestinations[player.rowIndex] ?? ""])
    );
    const suffix = this.transferSearchTerm.trim() ? ` for "${this.transferSearchTerm.trim()}"` : "";
    this.setStatus(`${this.transferSearchResults.length} transfer result(s)${suffix}`);
  }

  transferDestination(player: TransferSearchResult): string {
    return this.transferDestinations[player.rowIndex] ?? "";
  }

  setTransferDestination(player: TransferSearchResult, teamId: string): void {
    this.transferDestinations = {
      ...this.transferDestinations,
      [player.rowIndex]: teamId
    };
  }

  async transferPlayer(player: TransferSearchResult): Promise<void> {
    await this.guarded(async () => {
      const result = this.transfers.transferPlayer(this.project, player.rowIndex, this.transferDestination(player));
      this.refreshTransferSearch();
      this.setStatus(result.message);
    }, "Transferring player", "Updating teamplayerlinks");
  }

  openPlayerFromModule(player: PlayerSearchResult): void {
    this.playerEditorRowIndex = player.rowIndex;
    this.playerEditorReturnMode = "modules";
    this.viewMode = "playerEditor";
  }

  async createPlayerFromModule(): Promise<void> {
    await this.guarded(async () => {
      const result = this.playerEditor.createPlayer(this.project);
      this.playerSearchTerm = result.playerId;
      this.refreshPlayerSearch();
      this.playerEditorRowIndex = result.rowIndex;
      this.playerEditorReturnMode = "modules";
      this.viewMode = "playerEditor";
      this.setStatus(result.message);
    }, "Creating player", "Preparing players and edited names");
  }

  openTeamFromModule(team: TeamSearchResult): void {
    this.teamEditorRowIndex = team.rowIndex;
    this.viewMode = "teamEditor";
  }

  openLeagueFromModule(league: LeagueSearchResult): void {
    this.leagueEditorRowIndex = league.rowIndex;
    this.viewMode = "leagueEditor";
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
    this.leagueEditor.invalidateTable(table);
    this.nations.invalidateTable(table);
    this.playerEditor.invalidateTable(table);
    this.teamEditor.invalidateTable(table);
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
    this.playerEditorReturnMode = "table";
    this.viewMode = "playerEditor";
  }

  closePlayerEditor(): void {
    this.viewMode = this.playerEditorReturnMode;
    if (this.viewMode === "modules") {
      this.refreshPlayerSearch();
    }
    this.resetHorizontalScroll();
  }

  closeTeamEditor(): void {
    this.viewMode = "modules";
    this.activeModule = "teams";
    this.refreshTeamSearch();
    this.resetHorizontalScroll();
  }

  closeLeagueEditor(): void {
    this.viewMode = "modules";
    this.activeModule = "leagues";
    this.refreshLeagueSearch();
    this.resetHorizontalScroll();
  }

  onPlayerEditorApplied(message: string): void {
    this.setStatus(message);
    if (this.playerEditorReturnMode === "modules") {
      this.refreshPlayerSearch();
    }
    this.syncHorizontalScrollbar();
  }

  async onPlayerEditorAppliedAndSave(message: string): Promise<void> {
    this.onPlayerEditorApplied(message);
    await this.saveProject("Applying and saving", "Updating player rows and writing .db file");
  }

  onTeamEditorApplied(message: string): void {
    this.setStatus(message);
    this.refreshTeamSearch();
    this.syncHorizontalScrollbar();
  }

  async onTeamEditorAppliedAndSave(message: string): Promise<void> {
    this.onTeamEditorApplied(message);
    await this.saveProject("Applying and saving", "Updating team rows and writing .db file");
  }

  onLeagueEditorApplied(message: string): void {
    this.setStatus(message);
    this.refreshLeagueSearch();
    this.syncHorizontalScrollbar();
  }

  async onLeagueEditorAppliedAndSave(message: string): Promise<void> {
    this.onLeagueEditorApplied(message);
    await this.saveProject("Applying and saving", "Updating league rows and writing .db file");
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
    this.leagueEditor.invalidateTable(table);
    this.nations.invalidateTable(table);
    this.playerEditor.invalidateTable(table);
    this.teamEditor.invalidateTable(table);
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
    this.leagueEditor.invalidateTable(table);
    this.nations.invalidateTable(table);
    this.playerEditor.invalidateTable(table);
    this.teamEditor.invalidateTable(table);
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
    this.leagueEditor.invalidateProject(project);
    this.nations.invalidateProject(project);
    this.playerEditor.invalidateProject(project);
    this.teamEditor.invalidateProject(project);
    this.viewMode = "launcher";
    this.activeModule = "players";
    this.currentTableIndex = 0;
    this.playerSearchTerm = "";
    this.playerSearchResults = [];
    this.teamSearchTerm = "";
    this.teamSearchResults = [];
    this.leagueSearchTerm = "";
    this.leagueCountryFilter = "";
    this.leagueSearchResults = [];
    this.transferSearchTerm = "";
    this.transferSearchResults = [];
    this.transferDestinations = {};
    this.page = 0;
    this.selectedColumnIndex = 0;
    this.selectedRows.clear();
    this.copied = undefined;
    this.sort = undefined;
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
    this.leagueEditor.invalidateTable(imported);
    this.nations.invalidateTable(imported);
    this.playerEditor.invalidateTable(imported);
    this.teamEditor.invalidateTable(imported);
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
    let loadingStartedAt = 0;
    try {
      if (title) {
        await this.setLoading(true, title, detail ?? "Please wait");
        loadingStartedAt = performance.now();
      }
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "error");
      this.setStatus("Error");
    } finally {
      if (title) {
        const elapsed = performance.now() - loadingStartedAt;
        const remaining = Math.max(0, this.minimumLoadingDurationMs - elapsed);
        if (remaining > 0) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
        }
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
