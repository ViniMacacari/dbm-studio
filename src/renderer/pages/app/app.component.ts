import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import type { DbMasterApi } from "../../services/dbmaster-api";
import { LeagueEditorService } from "../../services/league-editor.service";
import { NationService } from "../../services/nation.service";
import { PlayerEditorService } from "../../services/player-editor.service";
import { TeamEditorService } from "../../services/team-editor.service";
import { TransferService } from "../../services/transfer.service";
import { ToastService, ToastTone } from "../../services/toast.service";
import { LoadingService } from "../../services/loading.service";
import { ProjectService } from "../../services/project.service";
import { LeagueEditorPageComponent } from "../league-editor/league-editor-page.component";
import { PlayerEditorPageComponent } from "../player-editor/player-editor-page.component";
import { TeamEditorPageComponent } from "../team-editor/team-editor-page.component";
import { CompdataEditorPageComponent } from "../compdata-editor/compdata-editor-page.component";
import { VisualDependencyModalComponent } from "../../components/visual-dependency-modal/visual-dependency-modal.component";
import { ModulesWorkspaceComponent } from "../modules-workspace/modules-workspace.component";
import { TableWorkspaceComponent } from "../table-workspace/table-workspace.component";
import packageInfo from "../../../../package.json";

type ViewMode = "home" | "launcher" | "table" | "modules" | "compdata" | "playerEditor" | "teamEditor" | "leagueEditor";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PlayerEditorPageComponent,
    TeamEditorPageComponent,
    LeagueEditorPageComponent,
    CompdataEditorPageComponent,
    VisualDependencyModalComponent,
    ModulesWorkspaceComponent,
    TableWorkspaceComponent
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
  @ViewChild(CompdataEditorPageComponent) compdataEditor?: CompdataEditorPageComponent;
  @ViewChild(ModulesWorkspaceComponent) modulesWorkspace?: ModulesWorkspaceComponent;
  @ViewChild(TableWorkspaceComponent) tableWorkspace?: TableWorkspaceComponent;

  private readonly api: DbMasterApi = window.dbmaster;
  readonly appName = "DBM Studio";
  readonly appVersion = packageInfo.version;

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    private readonly leagueEditor: LeagueEditorService,
    private readonly nations: NationService,
    private readonly playerEditor: PlayerEditorService,
    private readonly teamEditor: TeamEditorService,
    private readonly transfers: TransferService,
    public readonly projectService: ProjectService,
    public readonly toastService: ToastService,
    public readonly loadingService: LoadingService
  ) { }

  viewMode: ViewMode = "home";

  playerEditorReturnMode: "table" | "modules" = "table";
  playerEditorRowIndex = 0;
  playerEditorIsNew = false;
  teamEditorRowIndex = 0;
  teamEditorIsNew = false;
  leagueEditorRowIndex = 0;
  leagueEditorIsNew = false;

  visualDependencyModalVisible = false;

  ngOnInit(): void {
    void this.checkVisualDependencyStatus();
  }

  get project(): DbProject | undefined {
    return this.projectService.project;
  }

  get projectSubtitle(): string {
    return this.projectService.projectSubtitle;
  }

  get hasProject(): boolean {
    return this.projectService.hasProject;
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

  get tableCount(): number {
    return this.projectService.tableCount;
  }

  get canSaveDatabase(): boolean {
    return this.projectService.canSaveDatabase;
  }

  get statusLine(): string {
    return this.projectService.statusLine;
  }

  async openDatabase(): Promise<void> {
    await this.projectService.openDatabase();
    if (this.project) {
      this.viewMode = "launcher";
    }
  }

  async openDatabaseWithLocalization(): Promise<void> {
    await this.projectService.openDatabaseWithLocalization();
    if (this.project) {
      this.viewMode = "launcher";
    }
  }

  async openXml(): Promise<void> {
    await this.projectService.openXml();
    if (this.project) {
      this.viewMode = "launcher";
    }
  }

  async openTextFolder(): Promise<void> {
    await this.projectService.openTextFolder();
    if (this.project) {
      this.viewMode = "launcher";
    }
  }

  async saveProject(): Promise<void> {
    await this.projectService.saveProject();
  }

  async exportAll(): Promise<void> {
    await this.projectService.exportAll();
  }

  async importAll(): Promise<void> {
    await this.projectService.importAll();
    if (this.project) {
      this.viewMode = "launcher";
    }
  }

  async extractBig(): Promise<void> {
    await this.projectService.extractBig();
  }

  showLauncher(): void {
    if (!this.project) {
      this.viewMode = "home";
      return;
    }
    this.viewMode = "launcher";
  }

  openCompdataWorkspace(): void {
    this.viewMode = "compdata";
    this.setStatus("Compdata workspace ready");
    setTimeout(() => {
      if (this.compdataEditor && !this.compdataEditor.compdataProject) {
        void this.compdataEditor.openCompdataFolder();
      }
    }, 0);
  }

  openTableWorkspace(): void {
    if (!this.project) {
      this.showToast("Open a DB/XML pair first.", "warn");
      this.viewMode = "home";
      return;
    }
    this.viewMode = "table";
  }

  async openModulesWorkspace(module?: "players" | "teams" | "leagues" | "transfers"): Promise<void> {
    if (!this.project) {
      this.showToast("Open a DB/XML pair first.", "warn");
      this.viewMode = "home";
      return;
    }
    this.viewMode = "modules";
    if (module && this.modulesWorkspace) {
      await this.modulesWorkspace.selectModule(module);
    }
  }

  openPlayerFromModule(event: { rowIndex: number, isNew: boolean }): void {
    this.playerEditorRowIndex = event.rowIndex;
    this.playerEditorIsNew = event.isNew;
    this.playerEditorReturnMode = "modules";
    this.viewMode = "playerEditor";
  }

  openPlayerFromTable(event: { rowIndex: number }): void {
    this.playerEditorRowIndex = event.rowIndex;
    this.playerEditorIsNew = false;
    this.playerEditorReturnMode = "table";
    this.viewMode = "playerEditor";
  }

  openTeamFromModule(event: { rowIndex: number, isNew: boolean }): void {
    this.teamEditorRowIndex = event.rowIndex;
    this.teamEditorIsNew = event.isNew;
    this.viewMode = "teamEditor";
  }

  openLeagueFromModule(event: { rowIndex: number, isNew: boolean }): void {
    this.leagueEditorRowIndex = event.rowIndex;
    this.leagueEditorIsNew = event.isNew;
    this.viewMode = "leagueEditor";
  }

  closePlayerEditor(): void {
    this.viewMode = this.playerEditorReturnMode;
    if (this.viewMode === "modules") {
      this.modulesWorkspace?.refreshPlayerSearch();
    }
  }

  closeTeamEditor(): void {
    this.viewMode = "modules";
    void this.modulesWorkspace?.selectModule("teams");
  }

  closeLeagueEditor(): void {
    this.viewMode = "modules";
    void this.modulesWorkspace?.selectModule("leagues");
  }

  onPlayerEditorApplied(message: string): void {
    this.setStatus(message);
    if (this.playerEditorReturnMode === "modules") {
      this.modulesWorkspace?.refreshPlayerSearch();
    }
  }

  async onPlayerEditorAppliedAndSave(message: string): Promise<void> {
    this.onPlayerEditorApplied(message);
    await this.saveProject();
  }

  onTeamEditorApplied(message: string): void {
    this.setStatus(message);
    this.modulesWorkspace?.refreshTeamSearch();
  }

  async onTeamEditorAppliedAndSave(message: string): Promise<void> {
    this.onTeamEditorApplied(message);
    await this.saveProject();
  }

  onLeagueEditorApplied(message: string): void {
    this.setStatus(message);
    this.modulesWorkspace?.refreshLeagueSearch();
  }

  async onLeagueEditorAppliedAndSave(message: string): Promise<void> {
    this.onLeagueEditorApplied(message);
    await this.saveProject();
  }

  private async checkVisualDependencyStatus(): Promise<void> {
    try {
      const status = await this.api.getVisualDependenciesStatus();
      this.visualDependencyModalVisible = !status.allCurrent;
    } catch (error) {
      console.error("[checkVisualDependencyStatus] Error fetching status:", error);
    }
  }

  async setLoading(loading: boolean, title = "Loading", detail = "Please wait"): Promise<void> {
    if (loading) {
      this.loadingService.show(title, detail);
    } else {
      this.loadingService.hide();
    }
    this.changeDetector.detectChanges();
  }

  setStatus(message: string): void {
    this.projectService.statusLine = message;
  }

  showToast(message: string, tone: ToastTone = "info"): void {
    this.toastService.show(message, tone);
  }
}
