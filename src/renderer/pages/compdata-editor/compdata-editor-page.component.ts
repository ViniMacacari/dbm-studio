import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type {
  CompdataCompetitionSummary,
  CompdataOpenProgress,
  CompdataProject,
  CompdataScheduleEntry,
  CompdataStandingSlot,
  CompdataTask,
  CompdataObject,
  CompdataSetting,
  CompdataAdvancement,
  CompdataInitTeam,
  DbProject
} from "../../../shared/types";

import type { DbMasterApi } from "../../services/dbmaster-api";
import { LeagueEditorService } from "../../services/league-editor.service";
import { TeamEditorService } from "../../services/team-editor.service";

import { InputCheckboxComponent } from "../../components/input-checkbox/input-checkbox.component";
import { SearchListComponent } from "../../components/search-list/search-list.component";

export interface CompdataReferenceLeague {
  leagueId: string;
  displayName: string;
  countryName: string;
  teamsCount: number;
  alreadyInCompdata: boolean;
}

export interface CompdataOpenProgressEvent {
  loading: boolean;
  title?: string;
  detail?: string;
}

export interface CompdataToastEvent {
  message: string;
  tone: "info" | "warn" | "error";
}

const debugCompdataRenderer = (stage: string, detail?: unknown): void => {
  const timestamp = new Date().toISOString();
  if (detail === undefined) {
    console.log(`[compdata/renderer ${timestamp}] ${stage}`);
    return;
  }
  console.log(`[compdata/renderer ${timestamp}] ${stage}`, detail);
};

@Component({
  selector: "app-compdata-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, InputCheckboxComponent, SearchListComponent],
  templateUrl: "./compdata-editor-page.component.html",
  styleUrl: "./compdata-editor-page.component.scss"
})
export class CompdataEditorPageComponent {
  @Output() showHome = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<string>();
  @Output() toastTriggered = new EventEmitter<CompdataToastEvent>();
  @Output() loadingStateChanged = new EventEmitter<CompdataOpenProgressEvent>();

  compdataProject?: CompdataProject;
  compdataReferenceProject?: DbProject;
  selectedCompdataCompetitionId = 0;
  compdataCompetitionFilter = "";
  compdataDirty = false;
  
  markDirty(): void {
    this.compdataDirty = true;
  }
  
  activeTab: "hierarchy" | "summary" | "participants" | "stages" | "matches" | "advancements" | "builder" = "builder";

  compdataBuilder = {
    sourceLeagueId: "",
    name: "",
    format: "league",
    competitionType: "LEAGUE",
    assetId: "",
    parentId: "",
    groups: "4",
    teamsPerGroup: "4",
    qualifiersPerGroup: "2",
    rounds: "2",
    seasonStartMonth: "8",
    seasonStartYear: "2026",
    yearOffset: "1",
    startDay: "30",
    dayStep: "7",
    time: "20:00"
  };

  openingCompdataFolderPath?: string;
  private queuedCompdataLocalizationFolderPath?: string;
  private readonly api: DbMasterApi = window.dbmaster;

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly leagueEditor: LeagueEditorService,
    private readonly teamEditor: TeamEditorService
  ) {}

  get selectedCompdataCompetition(): CompdataCompetitionSummary | undefined {
    return this.compdataProject?.competitions.find((competition) => competition.id === this.selectedCompdataCompetitionId);
  }

  get selectedCompdataObject(): CompdataObject | undefined {
    const selected = this.selectedCompdataCompetition;
    return selected ? this.compdataProject?.objects.find((object) => object.id === selected.id) : undefined;
  }

  setTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
  }

  private _cachedFilteredCompetitions: CompdataCompetitionSummary[] = [];
  private _lastFilterString = "";
  private _lastProjectForFilteredCompetitions?: CompdataProject;

  get filteredCompdataCompetitions(): CompdataCompetitionSummary[] {
    const filter = this.compdataCompetitionFilter.trim().toLowerCase();
    if (
      this.compdataProject === this._lastProjectForFilteredCompetitions &&
      filter === this._lastFilterString &&
      this._cachedFilteredCompetitions.length > 0 // basic sanity check
    ) {
      return this._cachedFilteredCompetitions;
    }
    
    this._cachedFilteredCompetitions = (this.compdataProject?.competitions ?? []).filter((competition) => {
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
    
    this._lastFilterString = filter;
    this._lastProjectForFilteredCompetitions = this.compdataProject;
    return this._cachedFilteredCompetitions;
  }

  get compdataReferenceLabel(): string {
    if (!this.compdataReferenceProject) {
      return "No LOC reference loaded";
    }
    return this.compdataReferenceProject.localization?.title ?? this.compdataReferenceProject.title;
  }

  private _cachedLeagueOptions: CompdataReferenceLeague[] = [];
  private _lastReferenceProjectForLeagues?: DbProject;

  get compdataLeagueOptions(): CompdataReferenceLeague[] {
    if (!this.compdataReferenceProject) {
      return [];
    }
    if (this.compdataReferenceProject === this._lastReferenceProjectForLeagues) {
      return this._cachedLeagueOptions;
    }
    const existingAssetIds = new Set(
      this.compdataProject?.settings
        .filter((setting) => setting.key === "asset_id")
        .map((setting) => setting.value) ?? []
    );
    this._cachedLeagueOptions = this.leagueEditor.findLeagues(this.compdataReferenceProject, "", "", 10000).map((league) => ({
      leagueId: league.leagueId,
      displayName: league.displayName,
      countryName: league.countryName,
      teamsCount: league.teamsCount,
      alreadyInCompdata: existingAssetIds.has(league.leagueId)
    }));
    this._lastReferenceProjectForLeagues = this.compdataReferenceProject;
    return this._cachedLeagueOptions;
  }

  get compdataReferenceTeamsCount(): number {
    return this.teamEditor.findTeamsTable(this.compdataReferenceProject)?.rows.length ?? 0;
  }

  get selectedBuilderLeague(): CompdataReferenceLeague | undefined {
    return this.compdataLeagueOptions.find((league) => league.leagueId === this.compdataBuilder.sourceLeagueId);
  }

  private _cachedParentOptions: Array<{ value: string; label: string }> = [];
  private _lastProjectForParentOptions?: CompdataProject;

  get compdataParentOptions() {
    if (!this.compdataProject) {
      return [];
    }
    if (this.compdataProject === this._lastProjectForParentOptions) {
      return this._cachedParentOptions;
    }
    this._cachedParentOptions = this.compdataProject.objects
      .filter((object) => object.kind <= 2)
      .map((object) => ({
        value: String(object.id),
        label: `${object.shortName || object.id} / ${this.resolveCompdataText(object.description)}`
      }));
    this._lastProjectForParentOptions = this.compdataProject;
    return this._cachedParentOptions;
  }

  private _cachedStageSettings: Array<{ stage: CompdataCompetitionSummary["stages"][number]; settings: string[]; groups: CompdataCompetitionSummary["groups"] }> = [];
  private _lastCompetitionForStageSettings?: CompdataCompetitionSummary;

  get compdataStageSettings(): Array<{ stage: CompdataCompetitionSummary["stages"][number]; settings: string[]; groups: CompdataCompetitionSummary["groups"] }> {
    const competition = this.selectedCompdataCompetition;
    if (!competition || !this.compdataProject) {
      return [];
    }
    if (competition === this._lastCompetitionForStageSettings) {
      return this._cachedStageSettings;
    }
    this._cachedStageSettings = competition.stages.map((stage) => ({
      stage,
      settings: this.compdataProject?.settings
        .filter((setting) => setting.objectId === stage.id)
        .map((setting) => `${setting.key}: ${setting.value}`) ?? [],
      groups: competition.groups.filter((group) => group.parentId === stage.id)
    }));
    this._lastCompetitionForStageSettings = competition;
    return this._cachedStageSettings;
  }

  private _cachedTeamOptions: Array<{ value: string; label: string }> = [];
  private _lastReferenceProjectForTeams?: DbProject;

  get compdataTeamOptions(): Array<{ value: string; label: string }> {
    if (!this.compdataReferenceProject) {
      return [];
    }
    if (this.compdataReferenceProject === this._lastReferenceProjectForTeams) {
      return this._cachedTeamOptions;
    }
    const table = this.teamEditor.findTeamsTable(this.compdataReferenceProject);
    if (!table) {
      this._cachedTeamOptions = [];
    } else {
      const teamIdIndex = table.fields.findIndex((f) => f.name === "teamid");
      const teamNameIndex = table.fields.findIndex((f) => f.name === "teamname");
      this._cachedTeamOptions = table.rows.map((row) => ({
        value: row[teamIdIndex] ?? "",
        label: `${row[teamNameIndex] ?? "Unknown"} (${row[teamIdIndex] ?? ""})`
      }));
    }
    this._lastReferenceProjectForTeams = this.compdataReferenceProject;
    return this._cachedTeamOptions;
  }

  get competitionSettings() {
    const id = this.selectedCompdataObject?.id;
    if (id === undefined) return [];
    return this.compdataProject?.settings.filter(s => s.objectId === id) ?? [];
  }

  addSetting(): void {
    if (!this.compdataProject || !this.selectedCompdataObject) return;
    this.compdataProject.settings.push({
      objectId: this.selectedCompdataObject.id,
      key: "new_setting",
      value: "0"
    });
    this.markDirty();
  }

  removeSetting(setting: CompdataSetting): void {
    if (!this.compdataProject) return;
    const index = this.compdataProject.settings.indexOf(setting);
    if (index >= 0) {
      this.compdataProject.settings.splice(index, 1);
      this.markDirty();
    }
  }

  updateSetting(key: string, value: string): void {
    if (!this.compdataProject || !this.selectedCompdataObject) return;
    const existing = this.competitionSettings.find(s => s.key === key);
    if (existing) {
      existing.value = value;
    } else {
      this.compdataProject.settings.push({
        objectId: this.selectedCompdataObject.id,
        key,
        value
      });
    }
    this.markDirty();
  }

  getSetting(key: string, fallback = ""): string {
    return this.competitionSettings.find(s => s.key === key)?.value ?? fallback;
  }

  get competitionStandings() {
    const id = this.selectedCompdataObject?.id;
    if (id === undefined) return [];
    return this.compdataProject?.standings.filter(s => s.groupId === id).sort((a, b) => a.position - b.position) ?? [];
  }

  addStanding(): void {
    if (!this.compdataProject || !this.selectedCompdataObject) return;
    const position = this.competitionStandings.length > 0 ? Math.max(...this.competitionStandings.map(s => s.position)) + 1 : 1;
    this.compdataProject.standings.push({
      groupId: this.selectedCompdataObject.id,
      position
    });
    this.markDirty();
  }

  removeStanding(standing: CompdataStandingSlot): void {
    if (!this.compdataProject) return;
    const index = this.compdataProject.standings.indexOf(standing);
    if (index >= 0) {
      this.compdataProject.standings.splice(index, 1);
      this.markDirty();
    }
  }

  get competitionAdvancements() {
    const id = this.selectedCompdataObject?.id;
    if (id === undefined) return [];
    return this.compdataProject?.advancements.filter(a => a.fromGroupId === id).sort((a, b) => a.fromPosition - b.fromPosition) ?? [];
  }

  addAdvancement(): void {
    if (!this.compdataProject || !this.selectedCompdataObject) return;
    this.compdataProject.advancements.push({
      fromGroupId: this.selectedCompdataObject.id,
      fromPosition: 1,
      toGroupId: 0,
      toPosition: 1
    });
    this.markDirty();
  }

  removeAdvancement(advancement: CompdataAdvancement): void {
    if (!this.compdataProject) return;
    const index = this.compdataProject.advancements.indexOf(advancement);
    if (index >= 0) {
      this.compdataProject.advancements.splice(index, 1);
      this.markDirty();
    }
  }

  get competitionSchedules() {
    const id = this.selectedCompdataObject?.id;
    if (id === undefined) return [];
    return this.compdataProject?.schedules.filter(s => s.objectId === id).sort((a, b) => a.day - b.day) ?? [];
  }

  addScheduleEntry(): void {
    if (!this.compdataProject || !this.selectedCompdataObject) return;
    const round = this.competitionSchedules.length > 0 ? Math.max(...this.competitionSchedules.map(s => s.round)) + 1 : 1;
    this.compdataProject.schedules.push({
      objectId: this.selectedCompdataObject.id,
      day: 30 + (round - 1) * 7,
      round,
      minGames: 1,
      maxGames: 10,
      time: "20:00"
    });
    this.markDirty();
  }

  removeScheduleEntry(schedule: CompdataScheduleEntry): void {
    if (!this.compdataProject) return;
    const index = this.compdataProject.schedules.indexOf(schedule);
    if (index >= 0) {
      this.compdataProject.schedules.splice(index, 1);
      this.markDirty();
    }
  }

  get competitionTasks() {
    const id = this.selectedCompdataCompetitionId;
    return this.compdataProject?.tasks.filter(t => t.competitionId === id) ?? [];
  }

  addTask(): void {
    if (!this.compdataProject || !this.selectedCompdataCompetitionId) return;
    this.compdataProject.tasks.push({
      competitionId: this.selectedCompdataCompetitionId,
      timing: "start",
      action: "FillFromLeague",
      targetId: this.selectedCompdataObject?.id ?? 0,
      param1: "0",
      param2: "0",
      param3: "0"
    });
    this.markDirty();
  }

  removeTask(task: CompdataTask): void {
    if (!this.compdataProject) return;
    const index = this.compdataProject.tasks.indexOf(task);
    if (index >= 0) {
      this.compdataProject.tasks.splice(index, 1);
      this.markDirty();
    }
  }
  
  teamToAdd = "";

  get competitionInitTeams() {
    const id = this.selectedCompdataCompetitionId;
    return this.compdataProject?.initTeams.filter(t => t.competitionId === id).sort((a, b) => a.position - b.position) ?? [];
  }

  addInitTeam(): void {
    if (!this.compdataProject || !this.selectedCompdataCompetitionId || !this.teamToAdd) return;
    const position = this.competitionInitTeams.length > 0 ? Math.max(...this.competitionInitTeams.map(t => t.position)) + 1 : 1;
    this.compdataProject.initTeams.push({
      competitionId: this.selectedCompdataCompetitionId,
      position,
      teamId: this.teamToAdd
    });
    this.teamToAdd = "";
    this.markDirty();
  }

  removeInitTeam(team: CompdataInitTeam): void {
    if (!this.compdataProject) return;
    const index = this.compdataProject.initTeams.indexOf(team);
    if (index >= 0) {
      this.compdataProject.initTeams.splice(index, 1);
      this.markDirty();
    }
  }

  resolveTeamName(teamId: string): string {
    if (!teamId) return "No team";
    const opt = this.compdataTeamOptions.find(o => o.value === teamId);
    return opt ? opt.label : teamId;
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
      this.loadingStateChanged.emit({ loading: true, title: "Opening compdata", detail: "Reading tournament text files" });
      const result = await this.openCompdataFolderWithProgress(folderPath);
      debugCompdataRenderer("openCompdataFolder:result", {
        canceled: result.canceled,
        hasProject: Boolean(result.project),
        error: result.error
      });

      if (!result.project) {
        debugCompdataRenderer("openCompdataFolder:noProject");
        return;
      }

      // Delay applying the project to the UI until AFTER the localization reference is loaded
      // This matches the user's requested flow: load txt -> open xml -> open db -> load db -> show editor

      // Ensure the UI updates to show the prompt before blocking the thread
      this.loadingStateChanged.emit({ loading: true, title: "LOC Reference", detail: "Please select LOC XML and DB/.loc when prompted" });
      await new Promise(resolve => setTimeout(resolve, 350));

      const locPromise = this.api.openCompdataLocalizationReference();
      
      const locTimer = setTimeout(() => {
        this.loadingStateChanged.emit({ loading: true, title: "Reading LOC Database", detail: "Please wait... this may take up to 30 seconds" });
      }, 800);

      const locResult = await locPromise;
      clearTimeout(locTimer);
      
      // Now that everything is loaded, we apply to the UI
      this.compdataProject = result.project;
      this.compdataReferenceProject = undefined;
      this.selectedCompdataCompetitionId = result.project.competitions[0]?.id ?? 0;

      if (locResult.referenceProject) {
        this.compdataReferenceProject = locResult.referenceProject;
        this.statusChanged.emit(`${result.project.title} loaded / ${this.compdataReferenceLabel} localization`);
      } else {
        const reason = locResult.warnings?.[0] ?? "LOC reference was not loaded";
        this.statusChanged.emit(`${result.project.title} loaded without LOC reference. ${reason}`);
      }
      
      if (result.project.warnings.length > 0) {
        this.toastTriggered.emit({ message: result.project.warnings[0], tone: "warn" });
      }
      if (locResult.warnings && locResult.warnings.length > 0) {
        this.toastTriggered.emit({ message: locResult.warnings[0], tone: "warn" });
      }
      debugCompdataRenderer("openCompdataFolder:projectApplied", {
        title: result.project.title,
        competitions: result.project.competitions.length,
        objects: result.project.objects.length
      });

      this.changeDetector.detectChanges();

      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[compdata/renderer] openCompdataFolder:error", error);
      this.toastTriggered.emit({ message, tone: "error" });
      this.statusChanged.emit("Error");
    } finally {
      this.openingCompdataFolderPath = undefined;
      this.loadingStateChanged.emit({ loading: false });
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
    this.loadingStateChanged.emit({
      loading: true,
      title: "Opening compdata",
      detail: progress.fileName ? `${progress.message} (${progress.fileName})` : progress.message
    });
  }

  async openCompdataReferenceDatabase(withLocalization = true): Promise<void> {
    try {
      this.loadingStateChanged.emit({
        loading: true,
        title: "Opening DB reference",
        detail: withLocalization ? "Reading DB/XML and LOC for names" : "Reading DB/XML for names"
      });
      const result = withLocalization ? await this.api.openDatabaseWithLocalization() : await this.api.openDatabase();
      if (result.project) {
        this.compdataReferenceProject = result.project;
        this.statusChanged.emit(`${this.compdataReferenceLabel} loaded as read-only reference`);
        this.selectFirstCompdataReferenceLeague();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.toastTriggered.emit({ message, tone: "error" });
      this.statusChanged.emit("Error");
    } finally {
      this.loadingStateChanged.emit({ loading: false });
    }
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, "/").toLowerCase();
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

  async saveCompdata(): Promise<void> {
    try {
      if (!this.compdataProject) {
        return;
      }
      this.loadingStateChanged.emit({ loading: true, title: "Saving compdata", detail: "Writing tournament text files" });
      const result = await this.api.saveCompdata(this.compdataProject);
      this.compdataDirty = false;
      this.statusChanged.emit(`${result.filesWritten} compdata file(s) saved`);
      if (result.warnings.length > 0) {
        console.warn("[saveCompdata] Warnings during save:");
        for (const w of result.warnings) {
          console.warn(` - ${w}`);
        }
        this.toastTriggered.emit({ message: result.warnings[0], tone: "warn" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.toastTriggered.emit({ message, tone: "error" });
      this.statusChanged.emit("Error");
    } finally {
      this.loadingStateChanged.emit({ loading: false });
    }
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
      this.toastTriggered.emit({ message: "Open a compdata folder first.", tone: "warn" });
      return;
    }
    if (!league) {
      this.toastTriggered.emit({ message: "Open a DB reference and choose a source league.", tone: "warn" });
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
    this.addCompdataSetting(competitionId, "schedule_year_offset", this.compdataBuilder.yearOffset ?? "0");
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
    this.statusChanged.emit(`${league.displayName} imported as ${this.compdataBuilder.format} competition`);
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
}
