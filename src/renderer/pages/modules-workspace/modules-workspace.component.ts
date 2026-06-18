import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import { LeagueEditorService, LeagueSearchResult } from "../../services/league-editor.service";
import { NationService } from "../../services/nation.service";
import { PlayerEditorService, PlayerSearchResult } from "../../services/player-editor.service";
import { TeamEditorService, TeamSearchResult } from "../../services/team-editor.service";
import { TransferService, TransferSearchResult } from "../../services/transfer.service";
import { ToastService } from "../../services/toast.service";
import { LoadingService } from "../../services/loading.service";

@Component({
  selector: "app-modules-workspace",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent],
  templateUrl: "./modules-workspace.component.html",
  encapsulation: ViewEncapsulation.None
})
export class ModulesWorkspaceComponent implements OnInit {
  @Input() project?: DbProject;
  @Output() showHome = new EventEmitter<void>();
  @Output() showTable = new EventEmitter<void>();
  @Output() openPlayer = new EventEmitter<{ rowIndex: number, isNew: boolean }>();
  @Output() openTeam = new EventEmitter<{ rowIndex: number, isNew: boolean }>();
  @Output() openLeague = new EventEmitter<{ rowIndex: number, isNew: boolean }>();
  @Output() saveRequest = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<string>();

  activeModule: "players" | "teams" | "leagues" | "transfers" = "players";

  // Player search state
  playerSearchTerm = "";
  playerSearchResults: PlayerSearchResult[] = [];
  playerMinifaces: Record<string, { dataUrl: string; source: string }> = {};

  // Team search state
  teamSearchTerm = "";
  teamSearchResults: TeamSearchResult[] = [];

  // League search state
  leagueSearchTerm = "";
  leagueCountryFilter = "";
  leagueSearchResults: LeagueSearchResult[] = [];

  // Transfer search state
  transferSearchTerm = "";
  transferSearchResults: TransferSearchResult[] = [];
  transferDestinations: Record<number, string> = {};

  constructor(
    private readonly leagueEditor: LeagueEditorService,
    private readonly nations: NationService,
    private readonly playerEditor: PlayerEditorService,
    private readonly teamEditor: TeamEditorService,
    private readonly transfers: TransferService,
    private readonly toast: ToastService,
    private readonly loading: LoadingService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadActiveModule();
  }

  // Helper to run actions inside loading guard
  private async guarded(action: () => Promise<void>, title: string, detail: string): Promise<void> {
    try {
      this.loading.show(title, detail);
      // Wait for layout paint
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.toast.show(message, "error");
      this.statusChanged.emit("Error");
    } finally {
      this.loading.hide();
    }
  }

  get projectSubtitle(): string {
    if (!this.project) {
      return "No project loaded";
    }
    const mode = this.project.binaryReadMode && this.project.binaryReadMode !== "none" ? ` / ${this.project.binaryReadMode}` : "";
    const localization = this.project.localization ? " / loc" : "";
    return `${this.project.title} / ${this.project.sourceKind}${mode}${localization}`;
  }

  get canSaveDatabase(): boolean {
    return this.project?.sourceKind === "database" && this.project.databaseWritable === true && Boolean(this.project.dbPath);
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

  async selectModule(module: "players" | "teams" | "leagues" | "transfers"): Promise<void> {
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
    this.statusChanged.emit(`${this.playerSearchResults.length} player result(s)${suffix}`);
    void this.loadPlayerMinifaces(this.playerSearchResults);
  }

  async loadPlayerMinifaces(results: PlayerSearchResult[]): Promise<void> {
    const idsToLoad = results.map(r => r.playerId).filter(id => !this.playerMinifaces[id]);
    if (idsToLoad.length === 0) return;

    await Promise.all(
      idsToLoad.map(async (playerId) => {
        try {
          const res = await window.dbmaster.getPlayerMiniface(playerId);
          this.playerMinifaces[playerId] = res;
        } catch {
          this.playerMinifaces[playerId] = { dataUrl: "", source: "missing" };
        }
      })
    );
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
    this.statusChanged.emit(`${this.teamSearchResults.length} team result(s)${suffix}`);
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
    this.statusChanged.emit(`${this.leagueSearchResults.length} league result(s)${suffix}`);
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
    this.statusChanged.emit(`${this.transferSearchResults.length} transfer result(s)${suffix}`);
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
      this.statusChanged.emit(result.message);
    }, "Transferring player", "Updating teamplayerlinks");
  }

  openPlayerFromModule(player: PlayerSearchResult): void {
    this.openPlayer.emit({ rowIndex: player.rowIndex, isNew: false });
  }

  async createPlayerFromModule(): Promise<void> {
    await this.guarded(async () => {
      const result = this.playerEditor.createPlayer(this.project);
      this.playerSearchTerm = result.playerId;
      this.refreshPlayerSearch();
      this.openPlayer.emit({ rowIndex: result.rowIndex, isNew: true });
      this.statusChanged.emit(result.message);
    }, "Creating player", "Preparing players and edited names");
  }

  async createTeamFromModule(): Promise<void> {
    await this.guarded(async () => {
      const result = this.teamEditor.createTeam(this.project);
      this.teamSearchTerm = result.teamId;
      this.refreshTeamSearch();
      this.openTeam.emit({ rowIndex: result.rowIndex, isNew: true });
      this.statusChanged.emit(result.message);
    }, "Creating team", "Preparing teams table");
  }

  async createLeagueFromModule(): Promise<void> {
    await this.guarded(async () => {
      const result = this.leagueEditor.createLeague(this.project);
      this.leagueSearchTerm = result.leagueId;
      this.leagueCountryFilter = "";
      this.refreshLeagueSearch();
      this.openLeague.emit({ rowIndex: result.rowIndex, isNew: true });
      this.statusChanged.emit(result.message);
    }, "Creating league", "Preparing leagues table");
  }

  openTeamFromModule(team: TeamSearchResult): void {
    this.openTeam.emit({ rowIndex: team.rowIndex, isNew: false });
  }

  openLeagueFromModule(league: LeagueSearchResult): void {
    this.openLeague.emit({ rowIndex: league.rowIndex, isNew: false });
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
}
