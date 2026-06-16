import { CommonModule } from "@angular/common";
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type {
  CompdataCompetitionSummary,
  CompdataOpenProgress,
  CompdataProject,
  CompdataScheduleEntry,
  CompdataStandingSlot,
  CompdataTask,
  DataTable,
  DbProject,
  FieldDescriptor,
  VisualDependenciesStatus,
  VisualDependencyProgress
} from "../../../shared/types";
import { InputCheckboxComponent } from "../../components/input-checkbox/input-checkbox.component";
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
type ViewMode = "home" | "launcher" | "table" | "modules" | "compdata" | "playerEditor" | "teamEditor" | "leagueEditor";
type ModuleMode = "players" | "teams" | "leagues" | "transfers";

interface TableListItem {
  table: DataTable;
  index: number;
}

interface CompdataReferenceLeague {
  leagueId: string;
  displayName: string;
  countryName: string;
  teamsCount: number;
  alreadyInCompdata: boolean;
}

interface CompdataBuilderDraft {
  name: string;
  sourceLeagueId: string;
  assetId: string;
  parentId: string;
  competitionType: "LEAGUE" | "CUP" | "INTERCUP" | "PLAYOFF";
  format: "league" | "group-knockout" | "cup";
  seasonStartMonth: string;
  seasonStartYear: string;
  yearOffset: string;
  groups: string;
  teamsPerGroup: string;
  qualifiersPerGroup: string;
  rounds: string;
  startDay: string;
  dayStep: string;
  time: string;
}

function debugCompdataRenderer(stage: string, detail?: unknown): void {
  const timestamp = new Date().toISOString();
  if (detail === undefined) {
    console.log(`[compdata/renderer ${timestamp}] ${stage}`);
    return;
  }
  console.log(`[compdata/renderer ${timestamp}] ${stage}`, detail);
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule, PlayerEditorPageComponent, TeamEditorPageComponent, LeagueEditorPageComponent, SearchListComponent, InputCheckboxComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss"
})
export class AppComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild("gridWrap") private gridWrap?: ElementRef<HTMLElement>;
  @ViewChild("dataGrid") private dataGrid?: ElementRef<HTMLTableElement>;
  @ViewChild("horizontalScroll") private horizontalScroll?: ElementRef<HTMLElement>;
  @ViewChild("horizontalScrollInner") private horizontalScrollInner?: ElementRef<HTMLElement>;

  private readonly api: DbMasterApi = window.dbmaster;
  private readonly minimumLoadingDurationMs = 400;
  private removeVisualDependencyProgressListener?: () => void;
  private openingCompdataFolderPath?: string;
  private queuedCompdataLocalizationFolderPath?: string;
  readonly appName = "DBM Studio";
  readonly appVersion = packageInfo.version;

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
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
  loadingPercent?: number;
  loadingProgressLabel = "";
  visualDependencyModalVisible = false;
  visualDependencyInstalling = false;
  visualDependencyStatus?: VisualDependenciesStatus;
  visualDependencyProgress?: VisualDependencyProgress;
  visualDependencyMessage = "";
  visualDependencyError = "";
  compdataProject?: CompdataProject;
  compdataReferenceProject?: DbProject;
  selectedCompdataCompetitionId = 0;
  compdataCompetitionFilter = "";
  compdataDirty = false;
  compdataBuilder: CompdataBuilderDraft = {
    name: "",
    sourceLeagueId: "",
    assetId: "",
    parentId: "0",
    competitionType: "LEAGUE",
    format: "league",
    seasonStartMonth: "AUG",
    seasonStartYear: "2024",
    yearOffset: "1",
    groups: "4",
    teamsPerGroup: "4",
    qualifiersPerGroup: "2",
    rounds: "2",
    startDay: "30",
    dayStep: "7",
    time: "1500"
  };

  ngOnInit(): void {
    this.removeVisualDependencyProgressListener = this.api.onVisualDependenciesProgress((progress) => {
      this.visualDependencyProgress = progress;
      this.visualDependencyMessage = progress.message;
      this.changeDetector.detectChanges();
    });
    void this.loadVisualDependencyStatus();
  }

  ngAfterViewInit(): void {
    this.syncHorizontalScrollbar();
  }

  ngOnDestroy(): void {
    this.removeVisualDependencyProgressListener?.();
  }

  get projectSubtitle(): string {
    if (!this.project) {
      return "No project loaded";
    }
    const mode = this.project.binaryReadMode && this.project.binaryReadMode !== "none" ? ` / ${this.project.binaryReadMode}` : "";
    const localization = this.project.localization ? " / loc" : "";
    return `${this.project.title} / ${this.project.sourceKind}${mode}${localization}`;
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
    return this.project?.sourceKind === "database" && this.project.databaseWritable === true && Boolean(this.project.dbPath);
  }

  get visualDependencyProgressPercent(): number {
    return Math.max(0, Math.min(100, Math.round(this.visualDependencyProgress?.percent ?? 0)));
  }

  get visualDependencyPrimaryActionLabel(): string {
    if (this.visualDependencyInstalling) {
      return "Downloading...";
    }
    if (this.visualDependencyStatus?.dependencies.some((dependency) => dependency.updateAvailable)) {
      return "Update";
    }
    if (this.visualDependencyStatus?.allInstalled) {
      return "Check";
    }
    return "Download";
  }

  get selectedCompdataCompetition(): CompdataCompetitionSummary | undefined {
    return this.compdataProject?.competitions.find((competition) => competition.id === this.selectedCompdataCompetitionId)
      ?? this.compdataProject?.competitions[0];
  }

  get selectedCompdataObject() {
    const selected = this.selectedCompdataCompetition;
    return selected ? this.compdataProject?.objects.find((object) => object.id === selected.id) : undefined;
  }

  get filteredCompdataCompetitions(): CompdataCompetitionSummary[] {
    const filter = this.compdataCompetitionFilter.trim().toLowerCase();
    return (this.compdataProject?.competitions ?? []).filter((competition) => {
      if (!filter) {
        return true;
      }
      return [
        competition.shortName,
        competition.description,
        this.resolveCompdataText(competition.description),
        String(competition.id)
      ].some((value) => value.toLowerCase().includes(filter));
    });
  }

  get compdataReferenceLabel(): string {
    if (!this.compdataReferenceProject) {
      return "No LOC reference loaded";
    }
    return this.compdataReferenceProject.localization?.title ?? this.compdataReferenceProject.title;
  }

  get compdataLeagueOptions(): CompdataReferenceLeague[] {
    if (!this.compdataReferenceProject) {
      return [];
    }
    const existingAssetIds = new Set(
      this.compdataProject?.settings
        .filter((setting) => setting.key === "asset_id")
        .map((setting) => setting.value) ?? []
    );
    return this.leagueEditor.findLeagues(this.compdataReferenceProject, "", "", 10000).map((league) => ({
      leagueId: league.leagueId,
      displayName: league.displayName,
      countryName: league.countryName,
      teamsCount: league.teamsCount,
      alreadyInCompdata: existingAssetIds.has(league.leagueId)
    }));
  }

  get compdataReferenceTeamsCount(): number {
    return this.teamEditor.findTeamsTable(this.compdataReferenceProject)?.rows.length ?? 0;
  }

  get selectedBuilderLeague(): CompdataReferenceLeague | undefined {
    return this.compdataLeagueOptions.find((league) => league.leagueId === this.compdataBuilder.sourceLeagueId);
  }

  get compdataParentOptions() {
    return (this.compdataProject?.objects ?? [])
      .filter((object) => object.kind <= 2)
      .map((object) => ({
        value: String(object.id),
        label: `${object.shortName || object.id} / ${this.resolveCompdataText(object.description)}`
      }));
  }

  get compdataStageSettings(): Array<{ stage: CompdataCompetitionSummary["stages"][number]; settings: string[]; groups: CompdataCompetitionSummary["groups"] }> {
    const competition = this.selectedCompdataCompetition;
    if (!competition || !this.compdataProject) {
      return [];
    }
    return competition.stages.map((stage) => ({
      stage,
      settings: this.compdataProject?.settings
        .filter((setting) => setting.objectId === stage.id)
        .map((setting) => `${setting.key}: ${setting.value}`) ?? [],
      groups: competition.groups.filter((group) => group.parentId === stage.id)
    }));
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

  async openDatabaseWithLocalization(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openDatabaseWithLocalization();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Opening database and language files", "Reading main DB/XML and loc DB/XML");
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

  openCompdataWorkspace(): void {
    this.viewMode = "compdata";
    this.setStatus("Compdata workspace ready");
  }

  async openCompdataFolder(): Promise<void> {
    debugCompdataRenderer("openCompdataFolder:start");
    const selection = await this.api.pickCompdataFolder();
    debugCompdataRenderer("openCompdataFolder:selection", selection);
    const folderPath = selection.folderPath;
    if (!folderPath) {
      debugCompdataRenderer("openCompdataFolder:canceled");
      return;
    }
    try {
      this.openingCompdataFolderPath = folderPath;
      this.queuedCompdataLocalizationFolderPath = undefined;
      debugCompdataRenderer("openCompdataFolder:setLoading:true", { folderPath });
      await this.setLoading(true, "Opening compdata", "Reading tournament text files");
      const result = await this.openCompdataFolderWithProgress(folderPath);
      debugCompdataRenderer("openCompdataFolder:result", {
        canceled: result.canceled,
        hasProject: Boolean(result.project),
        error: result.error
      });
      debugCompdataRenderer("openCompdataFolder:setLoading:false");
      await this.setLoading(false);

      if (!result.project) {
        debugCompdataRenderer("openCompdataFolder:noProject");
        return;
      }

      this.compdataProject = result.project;
      this.compdataReferenceProject = undefined;
      this.selectedCompdataCompetitionId = result.project.competitions[0]?.id ?? 0;
      if (result.project.warnings.length > 0) {
        this.showToast(result.project.warnings[0], "warn");
      }
      debugCompdataRenderer("openCompdataFolder:projectApplied", {
        title: result.project.title,
        competitions: result.project.competitions.length,
        objects: result.project.objects.length
      });
      this.setStatus(`${result.project.title} loaded with ${result.project.competitions.length} competition(s)`);
      this.queueCompdataLocalizationReferencePrompt(folderPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[compdata/renderer] openCompdataFolder:error", error);
      this.showToast(message, "error");
      this.setStatus("Error");
      await this.setLoading(false);
    } finally {
      this.openingCompdataFolderPath = undefined;
    }
  }

  private async openCompdataFolderWithProgress(folderPath: string): Promise<{ canceled?: boolean; project?: CompdataProject; error?: string }> {
    debugCompdataRenderer("openCompdataFolderWithProgress:start", { folderPath });
    let removeProgressListener: (() => void) | undefined;

    try {
      removeProgressListener = this.api.onCompdataOpenProgress((progress) => {
        debugCompdataRenderer("openCompdataFolderWithProgress:progress", progress);
        this.applyCompdataOpenProgress(progress);
      });

      debugCompdataRenderer("openCompdataFolderWithProgress:invoke");
      const result = await this.api.openCompdataFolder(folderPath);
      debugCompdataRenderer("openCompdataFolderWithProgress:resolved", {
        canceled: result.canceled,
        hasProjectJson: Boolean(result.projectJson),
        error: result.error,
        projectJsonBytes: result.projectJson?.length ?? 0
      });

      if (!result.projectJson) {
        return { canceled: result.canceled, error: result.error };
      }

      debugCompdataRenderer("openCompdataFolderWithProgress:jsonParse:start");
      const project = JSON.parse(result.projectJson) as CompdataProject;
      debugCompdataRenderer("openCompdataFolderWithProgress:jsonParse:done", {
        title: project.title,
        competitions: project.competitions.length
      });
      return {
        canceled: result.canceled,
        error: result.error,
        project
      };
    } finally {
      debugCompdataRenderer("openCompdataFolderWithProgress:finally");
      removeProgressListener?.();
    }
  }

  private applyCompdataOpenProgress(progress: CompdataOpenProgress): void {
    this.loadingPercent = progress.percent;
    this.loadingProgressLabel = `${progress.currentStep}/${progress.totalSteps}`;
    this.loadingDetail = progress.fileName
      ? `${progress.message} (${progress.fileName})`
      : progress.message;
    this.changeDetector.detectChanges();
  }

  async openCompdataReferenceDatabase(withLocalization = true): Promise<void> {
    await this.guarded(async () => {
      const result = withLocalization ? await this.api.openDatabaseWithLocalization() : await this.api.openDatabase();
      if (result.project) {
        this.compdataReferenceProject = result.project;
        this.setStatus(`${this.compdataReferenceLabel} loaded as read-only reference`);
        this.selectFirstCompdataReferenceLeague();
      }
    }, "Opening DB reference", withLocalization ? "Reading DB/XML and LOC for names" : "Reading DB/XML for names");
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, "/").toLowerCase();
  }

  private async promptCompdataLocalizationReference(folderPath: string): Promise<void> {
    const projectTitle = this.compdataProject?.title ?? "Compdata";
    const normalizedFolderPath = this.normalizePath(folderPath);
    const projectPath = this.compdataProject ? this.normalizePath(this.compdataProject.folderPath) : "";
    const openingPath = this.openingCompdataFolderPath ? this.normalizePath(this.openingCompdataFolderPath) : "";
    
    if (projectPath !== normalizedFolderPath && openingPath !== normalizedFolderPath) {
      debugCompdataRenderer("promptCompdataLocalizationReference:skipped", { folderPath, projectPath, openingPath });
      return;
    }

    debugCompdataRenderer("promptCompdataLocalizationReference:start", { folderPath });
    this.setStatus(`${projectTitle} loaded. Select LOC XML, then LOC DB/.loc.`);
    const result = await this.api.openCompdataLocalizationReference();
    debugCompdataRenderer("promptCompdataLocalizationReference:result", {
      canceled: result.canceled,
      hasReferenceProject: Boolean(result.referenceProject),
      warnings: result.warnings
    });
    
    const currentProjectPath = this.compdataProject ? this.normalizePath(this.compdataProject.folderPath) : "";
    if (currentProjectPath !== normalizedFolderPath) {
      debugCompdataRenderer("promptCompdataLocalizationReference:projectChanged", { folderPath, currentProjectPath });
      return;
    }
    if (result.canceled) {
      this.setStatus(`${projectTitle} loaded without LOC reference`);
      return;
    }
    if (result.referenceProject) {
      this.compdataReferenceProject = result.referenceProject;
      this.setStatus(`${projectTitle} loaded / ${this.compdataReferenceLabel} localization`);
    } else {
      const reason = result.warnings[0] ?? "LOC reference was not loaded";
      this.setStatus(`${projectTitle} loaded without LOC reference. ${reason}`);
    }
    if (result.warnings.length > 0) {
      this.showToast(result.warnings[0], "warn");
    }
  }

  private queueCompdataLocalizationReferencePrompt(folderPath: string): void {
    window.setTimeout(() => {
      void this.runQueuedCompdataLocalizationReferencePrompt(folderPath);
    }, 0);
  }

  private async runQueuedCompdataLocalizationReferencePrompt(folderPath: string): Promise<void> {
    const normalizedFolderPath = this.normalizePath(folderPath);
    const projectPath = this.compdataProject ? this.normalizePath(this.compdataProject.folderPath) : "";
    
    if (projectPath !== normalizedFolderPath) {
      debugCompdataRenderer("runQueuedCompdataLocalizationReferencePrompt:skipped", { folderPath, projectPath });
      return;
    }
    debugCompdataRenderer("runQueuedCompdataLocalizationReferencePrompt:start", { folderPath });
    try {
      await this.promptCompdataLocalizationReference(folderPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[compdata/renderer] runQueuedCompdataLocalizationReferencePrompt:error", error);
      const currentProjectPath = this.compdataProject ? this.normalizePath(this.compdataProject.folderPath) : "";
      if (currentProjectPath === normalizedFolderPath) {
        this.showToast(message, "error");
        this.setStatus(`${this.compdataProject?.title} loaded without LOC reference`);
      }
    }
  }

  private selectFirstCompdataReferenceLeague(force = false): void {
    const options = this.compdataLeagueOptions;
    const firstLeague = options.find((league) => !league.alreadyInCompdata) ?? options[0];
    const currentLeagueExists = options.some((league) => league.leagueId === this.compdataBuilder.sourceLeagueId);
    if (firstLeague && (force || !this.compdataBuilder.sourceLeagueId || !currentLeagueExists)) {
      this.compdataBuilder.sourceLeagueId = firstLeague.leagueId;
      this.syncCompdataBuilderFromLeague();
    }
  }

  private async loadCompdataFolderReference(folderPath: string): Promise<void> {
    const currentProject = this.compdataProject;
    if (!currentProject || currentProject.folderPath !== folderPath) {
      return;
    }
    this.setStatus(`${currentProject.title} loaded. Checking same-folder LOC reference...`);
    try {
      const result = await this.api.openCompdataFolderReference(folderPath);
      if (this.compdataProject?.folderPath !== folderPath) {
        return;
      }
      if (result.referenceProject) {
        this.compdataReferenceProject = result.referenceProject;
        this.setStatus(`${this.compdataProject.title} loaded / ${this.compdataReferenceLabel} localization`);
      } else {
        const reason = result.warnings[0] ?? "No same-folder LOC/XML reference was found";
        this.setStatus(`${this.compdataProject.title} loaded without same-folder LOC reference. ${reason}`);
      }
      if (result.warnings.length > 0) {
        this.showToast(result.warnings[0], "warn");
      }
    } catch (error) {
      if (this.compdataProject?.folderPath !== folderPath) {
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.showToast(message, "warn");
      this.setStatus(`${this.compdataProject.title} loaded. LOC reference was not loaded.`);
    }
  }

  async saveCompdata(): Promise<void> {
    await this.guarded(async () => {
      if (!this.compdataProject) {
        return;
      }
      const result = await this.api.saveCompdata(this.compdataProject);
      this.compdataDirty = false;
      this.setStatus(`${result.filesWritten} compdata file(s) saved`);
      if (result.warnings.length > 0) {
        this.showToast(result.warnings[0], "warn");
      }
    }, "Saving compdata", "Writing tournament text files");
  }

  selectCompdataCompetition(competition: CompdataCompetitionSummary): void {
    this.selectedCompdataCompetitionId = competition.id;
  }

  compdataCompetitionTitle(competition: CompdataCompetitionSummary): string {
    return `${competition.shortName || `C${competition.id}`} / ${this.resolveCompdataText(competition.description || "No description")}`;
  }

  compdataSettingsForObject(objectId: number): string[] {
    return this.compdataProject?.settings
      .filter((setting) => setting.objectId === objectId)
      .map((setting) => `${setting.key}: ${setting.value}`) ?? [];
  }

  compdataSettingsForSelectedObject() {
    const object = this.selectedCompdataObject;
    return object && this.compdataProject ? this.compdataProject.settings.filter((setting) => setting.objectId === object.id) : [];
  }

  compdataTasksForSelectedCompetition(): CompdataTask[] {
    const competition = this.selectedCompdataCompetition;
    return competition && this.compdataProject ? this.compdataProject.tasks.filter((task) => task.competitionId === competition.id) : [];
  }

  compdataSchedulesForSelectedCompetition(): CompdataScheduleEntry[] {
    const competition = this.selectedCompdataCompetition;
    if (!competition || !this.compdataProject) {
      return [];
    }
    const ids = new Set<number>([competition.id, ...competition.stages.map((stage) => stage.id), ...competition.groups.map((group) => group.id)]);
    return this.compdataProject.schedules.filter((schedule) => ids.has(schedule.objectId));
  }

  compdataStandingsForGroup(groupId: number): CompdataStandingSlot[] {
    return this.compdataProject?.standings.filter((standing) => standing.groupId === groupId) ?? [];
  }

  syncCompdataBuilderFromLeague(): void {
    const league = this.selectedBuilderLeague;
    if (!league) {
      return;
    }
    this.compdataBuilder.name = league.displayName;
    this.compdataBuilder.assetId = league.leagueId;
    const parentId = this.findCompdataCountryObjectId(league.countryName);
    if (parentId !== undefined) {
      this.compdataBuilder.parentId = String(parentId);
    }
  }

  createCompdataCompetitionFromBuilder(): void {
    const compdata = this.compdataProject;
    const league = this.selectedBuilderLeague;
    if (!compdata) {
      this.showToast("Open a compdata folder first.", "warn");
      return;
    }
    if (!league) {
      this.showToast("Open a DB reference and choose a source league.", "warn");
      return;
    }

    const firstId = this.nextCompdataObjectId();
    const assetId = this.numericDraftValue(this.compdataBuilder.assetId, Number(league.leagueId) || firstId);
    const parentId = this.numericDraftValue(this.compdataBuilder.parentId, 0);
    const competitionId = firstId;
    compdata.objects.push({
      id: competitionId,
      kind: 3,
      shortName: `C${assetId}`,
      description: `TrophyName_Abbr15_${assetId}`,
      parentId
    });
    compdata.compIds.push(competitionId);
    this.addCompdataSetting(competitionId, "asset_id", String(assetId));
    this.addCompdataSetting(competitionId, "comp_type", this.compdataBuilder.competitionType);
    this.addCompdataSetting(competitionId, "schedule_seasonstartmonth", this.compdataBuilder.seasonStartMonth);
    this.addCompdataSetting(competitionId, "schedule_year_start", this.compdataBuilder.seasonStartYear);
    this.addCompdataSetting(competitionId, "schedule_year_offset", this.compdataBuilder.yearOffset);
    this.addCompdataSetting(competitionId, "match_matchimportance", this.compdataBuilder.competitionType === "LEAGUE" ? "17" : "80");

    if (this.compdataBuilder.format === "group-knockout") {
      this.createGroupKnockoutFormat(competitionId, league);
    } else if (this.compdataBuilder.format === "cup") {
      this.createCupFormat(competitionId, league);
    } else {
      this.createLeagueFormat(competitionId, league);
    }

    this.compdataDirty = true;
    this.refreshCompdataSummaries();
    this.selectedCompdataCompetitionId = competitionId;
    this.setStatus(`${league.displayName} imported as ${this.compdataBuilder.format} competition`);
  }

  markCompdataDirty(): void {
    this.compdataDirty = true;
    this.refreshCompdataSummaries();
  }

  resolveCompdataText(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    const localization = this.compdataReferenceProject?.localization;
    const languageTables = localization?.tables ?? [];
    for (const table of languageTables) {
      const stringIdColumn = table.columns.findIndex((column) => column.toLowerCase() === "stringid");
      const sourceTextColumn = table.columns.findIndex((column) => column.toLowerCase() === "sourcetext");
      if (stringIdColumn < 0 || sourceTextColumn < 0) {
        continue;
      }
      const row = table.rows.find((candidate) => candidate[stringIdColumn] === trimmed);
      if (row?.[sourceTextColumn]) {
        return row[sourceTextColumn];
      }
    }
    return trimmed;
  }

  async saveProject(title = "Saving database", detail = "Writing .db file and backup"): Promise<void> {
    await this.guarded(async () => {
      if (!this.project) {
        return;
      }
      const result = await this.api.saveDatabase(this.project);
      if (result.filePath) {
        if (result.tablesWritten === 0) {
          const warning = result.warnings[0];
          if (warning) {
            this.showToast(warning, "warn");
            this.setStatus(warning);
          } else {
            this.setStatus("No changes to save");
          }
          return;
        }
        for (const table of this.project.tables) {
          table.changed = false;
        }
        if (!result.localizationSkipped) {
          for (const table of this.project.localization?.tables ?? []) {
            table.changed = false;
          }
        }
        const warnings = result.warnings.length > 0 ? ` ${result.warnings.length} warning(s).` : "";
        if (result.localizationSkipped && result.warnings.length > 0) {
          this.showToast(result.warnings[result.warnings.length - 1], "warn");
        }
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

  async installVisualDependencies(): Promise<void> {
    this.visualDependencyInstalling = true;
    this.visualDependencyError = "";
    this.visualDependencyMessage = "Downloading visual dependencies";
    this.visualDependencyProgress = {
      id: "visual-dependencies",
      label: "Visual dependencies",
      phase: "queued",
      receivedBytes: 0,
      percent: 0,
      message: "Preparing visual dependency download"
    };
    try {
      const result = await this.api.installVisualDependencies();
      this.visualDependencyStatus = result;
      this.visualDependencyMessage = result.warnings.length > 0
        ? `Installed with ${result.warnings.length} warning(s).`
        : result.installed.length > 0
          ? `Installed ${result.installed.length} visual package(s).`
          : result.skipped.length > 0
            ? "Visual packages are already up to date."
            : "No visual packages needed downloading.";
      if (result.warnings.length > 0) {
        this.visualDependencyError = result.warnings.join(" ");
      }
      const dependency = result.dependencies.find((candidate) => candidate.id === result.installed[0]) ?? result.dependencies[0];
      this.visualDependencyProgress = {
        id: dependency?.id ?? "visual-dependencies",
        label: dependency?.label ?? "Visual dependencies",
        phase: result.warnings.length > 0 ? "error" : "installed",
        receivedBytes: 0,
        percent: result.warnings.length > 0 ? this.visualDependencyProgressPercent : 100,
        message: this.visualDependencyMessage
      };
    } catch (error) {
      this.visualDependencyError = error instanceof Error ? error.message : String(error);
      this.visualDependencyMessage = "Visual dependency download failed";
      this.visualDependencyProgress = {
        id: this.visualDependencyProgress?.id ?? "visual-dependencies",
        label: this.visualDependencyProgress?.label ?? "Visual dependencies",
        phase: "error",
        receivedBytes: 0,
        percent: this.visualDependencyProgressPercent,
        message: this.visualDependencyMessage
      };
    } finally {
      this.visualDependencyInstalling = false;
    }
  }

  closeVisualDependencyModal(): void {
    this.visualDependencyModalVisible = false;
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

  async createTeamFromModule(): Promise<void> {
    await this.guarded(async () => {
      const result = this.teamEditor.createTeam(this.project);
      this.teamSearchTerm = result.teamId;
      this.refreshTeamSearch();
      this.teamEditorRowIndex = result.rowIndex;
      this.viewMode = "teamEditor";
      this.setStatus(result.message);
    }, "Creating team", "Preparing teams table");
  }

  async createLeagueFromModule(): Promise<void> {
    await this.guarded(async () => {
      const result = this.leagueEditor.createLeague(this.project);
      this.leagueSearchTerm = result.leagueId;
      this.leagueCountryFilter = "";
      this.refreshLeagueSearch();
      this.leagueEditorRowIndex = result.rowIndex;
      this.viewMode = "leagueEditor";
      this.setStatus(result.message);
    }, "Creating league", "Preparing leagues table");
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

  addRow(): void {
    const table = this.currentTable();
    if (!table) {
      return;
    }

    const row = table.columns.map((_column, columnIndex) => this.defaultCellValue(table.fields[columnIndex]));
    table.rows.push(row);
    table.changed = true;
    this.sort = undefined;
    this.invalidateTableCaches(table);

    const rowIndex = table.rows.length - 1;
    this.page = Math.floor(rowIndex / this.pageSize);
    this.selectedRows.clear();
    this.selectedRows.add(rowIndex);
    this.selectedColumnIndex = 0;
    this.scrollToLastRow();
    this.setStatus(`New row added to ${table.name}`);
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
    if (project.warnings.length > 0) {
      this.showToast(project.warnings[0], "warn");
    }
    this.setStatus(project.warnings.length > 0 ? `${project.title} loaded with ${project.warnings.length} warning(s)` : `${project.title} loaded`);
    this.resetHorizontalScroll();
  }

  private createLeagueFormat(competitionId: number, league: CompdataReferenceLeague): void {
    const stageId = this.nextCompdataObjectId();
    const groupId = stageId + 1;
    const teamsCount = Math.max(2, league.teamsCount);
    const rounds = this.numericDraftValue(this.compdataBuilder.rounds, 2);
    this.addCompdataObject(stageId, 4, "S1", "FCE_League_Stage", competitionId);
    this.addCompdataObject(groupId, 5, "G1", "", stageId);
    this.addCompdataSetting(stageId, "match_stagetype", "LEAGUE");
    this.addCompdataSetting(stageId, "match_matchsituation", "LEAGUE");
    this.addCompdataSetting(groupId, "num_games", String(rounds));
    this.addCompdataSetting(groupId, "info_slot_champ", "1");
    this.addStandings(groupId, teamsCount);
    this.compdataProject?.tasks.push({
      competitionId,
      timing: "start",
      action: "FillFromLeague",
      targetId: groupId,
      param1: league.leagueId,
      param2: "0",
      param3: "0"
    });
    this.compdataProject?.tasks.push({
      competitionId,
      timing: "end",
      action: "UpdateLeagueTable",
      targetId: stageId,
      param1: league.leagueId,
      param2: "0",
      param3: "0"
    });
    const scheduleRounds = Math.max(1, (teamsCount - 1) * rounds);
    this.addSchedule(stageId, scheduleRounds, Math.floor(teamsCount / 2), Math.floor(teamsCount / 2));
  }

  private createGroupKnockoutFormat(competitionId: number, league: CompdataReferenceLeague): void {
    const teamsCount = Math.max(4, league.teamsCount);
    const groupsCount = Math.max(1, this.numericDraftValue(this.compdataBuilder.groups, 4));
    const teamsPerGroup = Math.max(2, this.numericDraftValue(this.compdataBuilder.teamsPerGroup, Math.ceil(teamsCount / groupsCount)));
    const qualifiers = Math.max(1, this.numericDraftValue(this.compdataBuilder.qualifiersPerGroup, 2));
    const setupStageId = this.nextCompdataObjectId();
    const setupGroupId = setupStageId + 1;
    const groupStageId = setupStageId + 2;
    this.addCompdataObject(setupStageId, 4, "S1", "FCE_Setup_Stage", competitionId);
    this.addCompdataObject(setupGroupId, 5, "G1", "", setupStageId);
    this.addCompdataObject(groupStageId, 4, "S2", "FCE_Group_Stage", competitionId);
    this.addCompdataSetting(setupStageId, "match_stagetype", "SETUP");
    this.addCompdataSetting(groupStageId, "match_stagetype", "LEAGUE");
    this.addCompdataSetting(groupStageId, "match_matchsituation", "GROUP");
    this.addStandings(setupGroupId, teamsCount);

    const groupIds: number[] = [];
    for (let index = 0; index < groupsCount; index += 1) {
      const groupId = groupStageId + 1 + index;
      groupIds.push(groupId);
      this.addCompdataObject(groupId, 5, `G${index + 1}`, `FCE_Group_${String.fromCharCode(65 + index)}`, groupStageId);
      this.addCompdataSetting(groupId, "num_games", "1");
      this.addStandings(groupId, teamsPerGroup);
    }

    this.compdataProject?.tasks.push({
      competitionId,
      timing: "start",
      action: "FillFromLeague",
      targetId: setupGroupId,
      param1: league.leagueId,
      param2: "0",
      param3: "0"
    });

    let sourcePosition = 1;
    for (let slot = 0; slot < groupsCount * teamsPerGroup; slot += 1) {
      this.compdataProject?.advancements.push({
        fromGroupId: setupGroupId,
        fromPosition: sourcePosition,
        toGroupId: groupIds[slot % groupsCount],
        toPosition: Math.floor(slot / groupsCount) + 1
      });
      sourcePosition += 1;
    }
    this.addSchedule(groupStageId, Math.max(1, teamsPerGroup - 1), Math.floor((groupsCount * teamsPerGroup) / 2), Math.floor((groupsCount * teamsPerGroup) / 2));

    const knockoutTeams = Math.max(2, groupsCount * qualifiers);
    const firstKnockoutGroups = this.createKnockoutStages(competitionId, 3, knockoutTeams);
    if (firstKnockoutGroups.length > 0) {
      let targetIndex = 0;
      for (const groupId of groupIds) {
        for (let rank = 1; rank <= qualifiers; rank += 1) {
          const targetGroupId = firstKnockoutGroups[targetIndex % firstKnockoutGroups.length];
          this.compdataProject?.advancements.push({
            fromGroupId: groupId,
            fromPosition: rank,
            toGroupId: targetGroupId,
            toPosition: targetIndex % 2 + 1
          });
          targetIndex += 1;
        }
      }
    }
  }

  private createCupFormat(competitionId: number, league: CompdataReferenceLeague): void {
    const teamsCount = Math.max(2, league.teamsCount);
    const setupStageId = this.nextCompdataObjectId();
    const setupGroupId = setupStageId + 1;
    this.addCompdataObject(setupStageId, 4, "S1", "FCE_Setup_Stage", competitionId);
    this.addCompdataObject(setupGroupId, 5, "G1", "", setupStageId);
    this.addCompdataSetting(setupStageId, "match_stagetype", "SETUP");
    this.addStandings(setupGroupId, teamsCount);
    this.compdataProject?.tasks.push({
      competitionId,
      timing: "start",
      action: "FillFromLeague",
      targetId: setupGroupId,
      param1: league.leagueId,
      param2: "0",
      param3: "0"
    });

    const firstRoundGroups = this.createKnockoutStages(competitionId, 2, teamsCount);
    for (let index = 0; index < teamsCount; index += 1) {
      this.compdataProject?.advancements.push({
        fromGroupId: setupGroupId,
        fromPosition: index + 1,
        toGroupId: firstRoundGroups[Math.floor(index / 2)],
        toPosition: index % 2 + 1
      });
    }
  }

  private createKnockoutStages(competitionId: number, startStageNumber: number, teamsCount: number): number[] {
    let teamsInRound = this.highestPowerOfTwo(Math.max(2, teamsCount));
    let stageNumber = startStageNumber;
    let previousGroups: number[] = [];
    let firstRoundGroups: number[] = [];

    while (teamsInRound >= 2) {
      const stageId = this.nextCompdataObjectId();
      const groupsInStage = Math.max(1, Math.floor(teamsInRound / 2));
      const stageDescription = this.knockoutStageDescription(teamsInRound);
      this.addCompdataObject(stageId, 4, `S${stageNumber}`, stageDescription, competitionId);
      this.addCompdataSetting(stageId, "match_stagetype", "KO1LEG");
      this.addCompdataSetting(stageId, "match_matchsituation", this.knockoutSituation(teamsInRound));
      const currentGroups: number[] = [];
      for (let index = 0; index < groupsInStage; index += 1) {
        const groupId = stageId + index + 1;
        currentGroups.push(groupId);
        this.addCompdataObject(groupId, 5, `G${index + 1}`, "", stageId);
        this.addCompdataSetting(groupId, "num_games", "1");
        this.addStandings(groupId, 2);
      }
      this.addSchedule(stageId, 1, Math.max(0, groupsInStage === 1 ? 0 : 1), groupsInStage);
      if (firstRoundGroups.length === 0) {
        firstRoundGroups = currentGroups;
      }
      if (previousGroups.length > 0) {
        previousGroups.forEach((fromGroupId, index) => {
          this.compdataProject?.advancements.push({
            fromGroupId,
            fromPosition: 1,
            toGroupId: currentGroups[Math.floor(index / 2)],
            toPosition: index % 2 + 1
          });
        });
      }
      previousGroups = currentGroups;
      teamsInRound = Math.floor(teamsInRound / 2);
      stageNumber += 1;
    }

    return firstRoundGroups;
  }

  private addCompdataObject(id: number, kind: number, shortName: string, description: string, parentId: number): void {
    this.compdataProject?.objects.push({ id, kind, shortName, description, parentId });
  }

  private addCompdataSetting(objectId: number, key: string, value: string): void {
    this.compdataProject?.settings.push({ objectId, key, value });
  }

  private addStandings(groupId: number, count: number): void {
    for (let position = 0; position < count; position += 1) {
      this.compdataProject?.standings.push({ groupId, position });
    }
  }

  private addSchedule(objectId: number, rounds: number, minGames: number, maxGames: number): void {
    const startDay = this.numericDraftValue(this.compdataBuilder.startDay, 30);
    const dayStep = this.numericDraftValue(this.compdataBuilder.dayStep, 7);
    for (let round = 1; round <= rounds; round += 1) {
      this.compdataProject?.schedules.push({
        objectId,
        day: startDay + (round - 1) * dayStep,
        round,
        minGames,
        maxGames,
        time: this.compdataBuilder.time
      });
    }
  }

  private nextCompdataObjectId(): number {
    return (this.compdataProject?.objects.reduce((highest, object) => Math.max(highest, object.id), 0) ?? 0) + 1;
  }

  private numericDraftValue(value: string, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  }

  private highestPowerOfTwo(value: number): number {
    let output = 1;
    while (output * 2 <= value) {
      output *= 2;
    }
    return Math.max(2, output);
  }

  private knockoutStageDescription(teamsCount: number): string {
    if (teamsCount === 2) {
      return "FCE_Final";
    }
    if (teamsCount === 4) {
      return "FCE_Semi_Finals";
    }
    if (teamsCount === 8) {
      return "FCE_Quarter_Finals";
    }
    if (teamsCount === 16) {
      return "FCE_Round_of_16";
    }
    return "FCE_Round_of_32";
  }

  private knockoutSituation(teamsCount: number): string {
    if (teamsCount === 2) {
      return "FINAL";
    }
    if (teamsCount === 4) {
      return "SEMI";
    }
    if (teamsCount === 8) {
      return "QUARTER";
    }
    if (teamsCount === 16) {
      return "ROUND16";
    }
    return "ROUNDX";
  }

  private findCompdataCountryObjectId(countryName: string): number | undefined {
    const normalized = countryName.toLowerCase();
    const country = this.compdataProject?.objects.find((object) => object.kind === 2 && this.resolveCompdataText(object.description).toLowerCase() === normalized);
    return country?.id;
  }

  private refreshCompdataSummaries(): void {
    if (!this.compdataProject) {
      return;
    }
    const byParent = new Map<number, CompdataCompetitionSummary["stages"]>();
    for (const object of this.compdataProject.objects) {
      const children = byParent.get(object.parentId) ?? [];
      children.push(object);
      byParent.set(object.parentId, children);
    }
    const collectIds = (rootId: number): Set<number> => {
      const ids = new Set<number>([rootId]);
      const stack = [...(byParent.get(rootId) ?? [])];
      while (stack.length > 0) {
        const object = stack.pop();
        if (!object || ids.has(object.id)) {
          continue;
        }
        ids.add(object.id);
        stack.push(...(byParent.get(object.id) ?? []));
      }
      return ids;
    };
    this.compdataProject.competitions = this.compdataProject.compIds
      .map((id) => {
        const competition = this.compdataProject?.objects.find((object) => object.id === id);
        if (!competition || !this.compdataProject) {
          return undefined;
        }
        const descendantIds = collectIds(id);
        const stages = (byParent.get(id) ?? []).filter((object) => object.kind === 4);
        const groups = [...descendantIds]
          .map((candidate) => this.compdataProject?.objects.find((object) => object.id === candidate))
          .filter((object): object is CompdataCompetitionSummary["groups"][number] => Boolean(object && object.kind === 5));
        const groupIds = new Set(groups.map((group) => group.id));
        return {
          id,
          shortName: competition.shortName,
          description: competition.description,
          parentId: competition.parentId,
          stages,
          groups,
          settingsCount: this.compdataProject.settings.filter((setting) => descendantIds.has(setting.objectId)).length,
          tasksCount: this.compdataProject.tasks.filter((task) => task.competitionId === id).length,
          scheduleCount: this.compdataProject.schedules.filter((schedule) => descendantIds.has(schedule.objectId)).length,
          standingsCount: this.compdataProject.standings.filter((standing) => groupIds.has(standing.groupId)).length,
          advancementCount: this.compdataProject.advancements.filter((advancement) => groupIds.has(advancement.fromGroupId) || groupIds.has(advancement.toGroupId)).length,
          initTeamsCount: this.compdataProject.initTeams.filter((team) => team.competitionId === id).length
        };
      })
      .filter((competition): competition is CompdataCompetitionSummary => Boolean(competition));
  }

  private async loadVisualDependencyStatus(): Promise<void> {
    try {
      this.visualDependencyStatus = await this.api.getVisualDependenciesStatus();
      this.visualDependencyProgress = undefined;
      const hasUpdate = this.visualDependencyStatus.dependencies.some((dependency) => dependency.updateAvailable);
      this.visualDependencyMessage = this.visualDependencyStatus.allCurrent
        ? "Visual dependencies are already installed."
        : hasUpdate
          ? "A newer visual dependency package is available."
          : "Visual dependencies are optional and can be downloaded now.";
      this.visualDependencyModalVisible = !this.visualDependencyStatus.allCurrent;
    } catch (error) {
      this.visualDependencyError = error instanceof Error ? error.message : String(error);
    }
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

  private invalidateTableCaches(table: DataTable): void {
    this.leagueEditor.invalidateTable(table);
    this.nations.invalidateTable(table);
    this.playerEditor.invalidateTable(table);
    this.teamEditor.invalidateTable(table);
  }

  private defaultCellValue(field: FieldDescriptor | undefined): string {
    if (!field) {
      return "";
    }
    if (field.kind === "string" || field.kind === "shortCompressedString" || field.kind === "longCompressedString" || field.kind === "unknown") {
      return "";
    }
    if (field.rangeHigh >= field.rangeLow) {
      if (field.rangeLow <= 0 && field.rangeHigh >= 0) {
        return "0";
      }
      return String(Math.trunc(field.rangeLow));
    }
    return "0";
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
    debugCompdataRenderer("setLoading:before", {
      nextLoading: loading,
      title,
      detail,
      currentLoading: this.loadingActive
    });
    this.loadingTitle = title;
    this.loadingDetail = detail;
    this.loadingActive = loading;
    if (!loading) {
      this.loadingPercent = undefined;
      this.loadingProgressLabel = "";
    }
    this.changeDetector.detectChanges();
    debugCompdataRenderer("setLoading:after", {
      loadingActive: this.loadingActive,
      title: this.loadingTitle,
      detail: this.loadingDetail
    });
    if (loading) {
      await this.waitForLoadingPaint();
    }
  }

  private async waitForLoadingPaint(): Promise<void> {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    await this.waitForAnimationFrameOrTimeout();
    await this.waitForAnimationFrameOrTimeout();
  }

  private async waitForAnimationFrameOrTimeout(timeoutMs = 120): Promise<void> {
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = window.setTimeout(finish, timeoutMs);
      // Native dialogs can temporarily throttle RAF in Electron; fall back to a short timeout.
      requestAnimationFrame(() => finish());
    });
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

  private scrollToLastRow(): void {
    requestAnimationFrame(() => {
      if (this.gridWrap?.nativeElement) {
        this.gridWrap.nativeElement.scrollTop = this.gridWrap.nativeElement.scrollHeight;
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
