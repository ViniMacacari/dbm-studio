import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Output, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { CompdataCompetitionSummary, CompdataObject, CompdataOpenProgress, CompdataProject, DbProject } from "../../../shared/types";
import type { DbMasterApi } from "../../services/dbmaster-api";
import { LoadingService } from "../../services/loading.service";
import { ToastService } from "../../services/toast.service";
import { CompObjAdvancedViewComponent } from "./compobj-advanced-view.component";
import { CompObjDisplayService, PHASE_OPTIONS } from "../../services/compdata/compobj-display.service";
import { CompObjTreeService } from "../../services/compdata/compobj-tree.service";
import { CompObjValidationIssue, CompObjValidationService } from "../../services/compdata/compobj-validation.service";
import { CreateTournamentRequest, CreateTournamentWizardComponent } from "./create-tournament-wizard.component";
import { TournamentOverviewComponent } from "./tournament-overview.component";
import { TournamentPhaseDetailsComponent } from "./tournament-phase-details.component";
import { TournamentSidebarComponent } from "./tournament-sidebar.component";

type EditorDialog = "create" | "addPhase" | "addChild" | "editTournament" | "editPhase" | "editChild" | "delete" | "validation" | "preview" | undefined;
type DeleteTarget = { kind: "tournament" | "phase" | "child"; object: CompdataObject };

@Component({
  selector: "app-compdata-editor-page",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TournamentSidebarComponent,
    TournamentOverviewComponent,
    TournamentPhaseDetailsComponent,
    CompObjAdvancedViewComponent,
    CreateTournamentWizardComponent
  ],
  templateUrl: "./compdata-editor-page.component.html",
  styleUrl: "./compdata-editor-page.component.scss",
  encapsulation: ViewEncapsulation.None
})
export class CompdataEditorPageComponent {
  @Output() showHome = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<string>();

  compdataProject?: CompdataProject;
  compdataReferenceProject?: DbProject;
  compdataDirty = false;
  view: "simple" | "advanced" = "simple";
  selectedTournamentId = 0;
  selectedPhaseId = 0;
  dialog: EditorDialog;
  deleteTarget?: DeleteTarget;

  readonly phaseOptions = PHASE_OPTIONS;
  phaseDraft = { key: "FCE_League_Stage", customKey: "", code: "S1", childCount: 1 };
  tournamentDraft = { nameKey: "", code: "", parentId: 0 };
  childDraft = { code: "G1", description: "" };

  private readonly api: DbMasterApi = window.dbmaster;
  private originalObjectIds = new Set<number>();
  private removedOriginalLines: string[] = [];
  private editingObjectId = 0;

  constructor(
    private readonly changeDetector: ChangeDetectorRef,
    public readonly display: CompObjDisplayService,
    public readonly tree: CompObjTreeService,
    private readonly validation: CompObjValidationService,
    private readonly toast: ToastService,
    private readonly loading: LoadingService
  ) {}

  get selectedCompetition(): CompdataCompetitionSummary | undefined {
    return this.compdataProject?.competitions.find((competition) => competition.id === this.selectedTournamentId);
  }

  get selectedTournamentObject(): CompdataObject | undefined {
    const object = this.display.object(this.compdataProject, this.selectedTournamentId);
    return object?.kind === 3 ? object : undefined;
  }

  get selectedPhase(): CompdataObject | undefined {
    if (this.selectedPhaseId <= 0) return undefined;
    const object = this.display.object(this.compdataProject, this.selectedPhaseId);
    return object?.kind === 4 && object.parentId === this.selectedTournamentId ? object : undefined;
  }

  get locationOptions(): CompdataObject[] {
    return this.compdataProject?.objects.filter((object) => object.kind <= 2) ?? [];
  }

  get effectivePhaseKey(): string {
    return this.phaseDraft.key === "custom" ? this.phaseDraft.customKey.trim() : this.phaseDraft.key;
  }

  get phaseDraftInfo() {
    return this.display.phaseInfo(this.effectivePhaseKey);
  }

  get phaseDraftChildNoun(): string {
    return this.display.childNoun({ id: 0, kind: 4, shortName: "", description: this.effectivePhaseKey, parentId: 0 }, 2);
  }

  get validationIssues(): CompObjValidationIssue[] {
    if (!this.compdataProject || !this.selectedCompetition) return [];
    return this.validation.validateTournament(this.compdataProject, this.selectedCompetition, this.compdataReferenceProject);
  }

  get validationHeading(): string {
    if (!this.validationIssues.length) return "Structure looks valid";
    return this.validationIssues.some((issue) => issue.severity === "error") ? "Structure has errors" : "Structure has warnings";
  }

  get previewObjects(): CompdataObject[] {
    if (!this.compdataProject || !this.selectedTournamentId) return [];
    return this.tree.tournamentObjects(this.compdataProject, this.selectedTournamentId);
  }

  get previewAdded(): number { return this.previewObjects.filter((object) => !this.originalObjectIds.has(object.id)).length; }
  get previewEdited(): number { return this.previewObjects.filter((object) => this.originalObjectIds.has(object.id) && object.originalRawLine && object.originalRawLine !== this.display.rawLine(object)).length; }
  get previewRemoved(): number { return this.removedOriginalLines.length; }

  selectTournament(id: number): void {
    this.selectedTournamentId = id;
    this.selectedPhaseId = 0;
  }

  openPhase(id: number): void {
    const phase = this.display.object(this.compdataProject, id);
    this.selectedPhaseId = phase?.kind === 4 && phase.parentId === this.selectedTournamentId ? id : 0;
  }

  openCreateWizard(): void { this.dialog = "create"; }

  createTournament(request: CreateTournamentRequest): void {
    if (!this.compdataProject) return;
    const tournamentId = this.nextObjectId();
    this.compdataProject.objects.push({ id: tournamentId, kind: 3, shortName: request.internalCode, description: request.nameKey, parentId: request.parentId });
    this.compdataProject.compIds.push(tournamentId);
    if (request.template === "league") this.createPhase(tournamentId, "FCE_League_Stage", "S1", 1);
    if (request.template === "cup") {
      [
        ["FCE_Setup_Stage", 1], ["FCE_Round_1", 1], ["FCE_Quarter_Finals", 4], ["FCE_Semi_Finals", 2], ["FCE_Final", 1]
      ].forEach(([key, count], index) => this.createPhase(tournamentId, String(key), `S${index + 1}`, Number(count)));
    }
    this.afterStructureChange();
    this.selectTournament(tournamentId);
    this.dialog = undefined;
    this.statusChanged.emit("Tournament structure created");
  }

  openAddPhase(): void {
    if (!this.compdataProject || !this.selectedTournamentId) return;
    const phases = this.tree.phases(this.compdataProject, this.selectedTournamentId);
    this.phaseDraft = { key: "FCE_League_Stage", customKey: "", code: this.nextCode(phases, "S"), childCount: 1 };
    this.dialog = "addPhase";
  }

  addPhase(): void {
    if (!this.compdataProject || !this.selectedTournamentId || !this.effectivePhaseKey || !this.phaseDraft.code.trim()) return;
    const phase = this.createPhase(this.selectedTournamentId, this.effectivePhaseKey, this.phaseDraft.code.trim(), Math.max(0, Math.trunc(this.phaseDraft.childCount || 0)));
    this.afterStructureChange();
    this.dialog = undefined;
    this.openPhase(phase.id);
  }

  openAddChild(): void {
    if (!this.compdataProject || !this.selectedPhase) return;
    this.childDraft = { code: this.nextCode(this.tree.groups(this.compdataProject, this.selectedPhase.id), "G"), description: "" };
    this.dialog = "addChild";
  }

  addChild(): void {
    if (!this.compdataProject || !this.selectedPhase || !this.childDraft.code.trim()) return;
    this.compdataProject.objects.push({ id: this.nextObjectId(), kind: 5, shortName: this.childDraft.code.trim(), description: this.childDraft.description.trim(), parentId: this.selectedPhase.id });
    this.afterStructureChange();
    this.dialog = undefined;
  }

  openEditTournament(): void {
    const object = this.selectedTournamentObject;
    if (!object) return;
    this.editingObjectId = object.id;
    this.tournamentDraft = { nameKey: object.description, code: object.shortName, parentId: object.parentId };
    this.dialog = "editTournament";
  }

  saveTournamentEdit(): void {
    const object = this.display.object(this.compdataProject, this.editingObjectId);
    if (!object || !this.tournamentDraft.nameKey.trim() || !this.tournamentDraft.code.trim()) return;
    object.description = this.tournamentDraft.nameKey.trim();
    object.shortName = this.tournamentDraft.code.trim();
    object.parentId = Number(this.tournamentDraft.parentId);
    this.afterStructureChange();
    this.dialog = undefined;
  }

  openEditPhase(id = this.selectedPhaseId): void {
    const phase = this.display.object(this.compdataProject, id);
    if (!phase) return;
    this.editingObjectId = phase.id;
    const known = PHASE_OPTIONS.some((option) => option.key === phase.description);
    this.phaseDraft = { key: known ? phase.description : "custom", customKey: known ? "" : phase.description, code: phase.shortName, childCount: 0 };
    this.dialog = "editPhase";
  }

  savePhaseEdit(): void {
    const phase = this.display.object(this.compdataProject, this.editingObjectId);
    if (!phase || !this.effectivePhaseKey || !this.phaseDraft.code.trim()) return;
    phase.description = this.effectivePhaseKey;
    phase.shortName = this.phaseDraft.code.trim();
    this.afterStructureChange();
    this.dialog = undefined;
  }

  openEditChild(id: number): void {
    const child = this.display.object(this.compdataProject, id);
    if (!child) return;
    this.editingObjectId = child.id;
    this.childDraft = { code: child.shortName, description: child.description };
    this.dialog = "editChild";
  }

  saveChildEdit(): void {
    const child = this.display.object(this.compdataProject, this.editingObjectId);
    if (!child || !this.childDraft.code.trim()) return;
    child.shortName = this.childDraft.code.trim();
    child.description = this.childDraft.description.trim();
    this.afterStructureChange();
    this.dialog = undefined;
  }

  requestDelete(kind: DeleteTarget["kind"], id: number): void {
    const object = this.display.object(this.compdataProject, id);
    if (!object) return;
    this.deleteTarget = { kind, object };
    this.dialog = "delete";
  }

  confirmDelete(): void {
    if (!this.compdataProject || !this.deleteTarget) return;
    const { kind, object } = this.deleteTarget;
    const targets = kind === "tournament" || kind === "phase" ? this.tree.tournamentObjects(this.compdataProject, object.id) : [object];
    const ids = new Set(targets.map((target) => target.id));
    targets.forEach((target) => { if (target.originalRawLine) this.removedOriginalLines.push(target.originalRawLine); });
    this.compdataProject.objects = this.compdataProject.objects.filter((candidate) => !ids.has(candidate.id));
    if (kind === "tournament") {
      this.compdataProject.compIds = this.compdataProject.compIds.filter((id) => id !== object.id);
      this.selectedTournamentId = 0;
      this.selectedPhaseId = 0;
    } else if (kind === "phase") {
      this.selectedPhaseId = 0;
    }
    this.afterStructureChange();
    this.dialog = undefined;
    this.deleteTarget = undefined;
  }

  openValidation(): void { this.dialog = "validation"; }
  openPreview(): void { this.dialog = "preview"; }
  closeDialog(): void { this.dialog = undefined; this.deleteTarget = undefined; }

  async openCompdataFolder(): Promise<void> {
    const selection = await this.api.pickCompdataFolder();
    if (!selection.folderPath) return;
    let removeListener: (() => void) | undefined;
    try {
      this.loading.show("Opening tournament files", "Reading compobj.txt");
      removeListener = this.api.onCompdataOpenProgress((progress: CompdataOpenProgress) => this.loading.show("Opening tournament files", progress.message));
      const result = await this.api.openCompdataFolder(selection.folderPath);
      if (!result.projectJson) {
        if (result.error) this.toast.show(result.error, "error");
        return;
      }
      this.compdataProject = JSON.parse(result.projectJson) as CompdataProject;
      this.compdataReferenceProject = undefined;
      this.originalObjectIds = new Set(this.compdataProject.objects.map((object) => object.id));
      this.removedOriginalLines = [];
      this.compdataDirty = false;
      this.selectedTournamentId = this.compdataProject.competitions[0]?.id ?? 0;
      this.selectedPhaseId = 0;
      this.view = "simple";
      this.statusChanged.emit(`${this.compdataProject.title} loaded`);
      if (this.compdataProject.warnings.length) this.toast.show(this.compdataProject.warnings[0], "warn");
      await this.loadTranslatedNames();
      this.loading.show("Preparing tournament editor", "Indexing tournament structure");
      this.tree.prime(this.compdataProject);
      this.validation.prime(this.compdataProject, this.compdataReferenceProject);
      this.changeDetector.detectChanges();
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : String(error), "error");
    } finally {
      removeListener?.();
      this.loading.hide();
    }
  }

  async loadTranslatedNames(): Promise<void> {
    try {
      this.loading.show("Loading translated names", "Select the localization reference files");
      const result = await this.api.openCompdataLocalizationReference();
      if (result.referenceProject) {
        this.display.primeLocalization(result.referenceProject);
        this.compdataReferenceProject = result.referenceProject;
        if (this.compdataProject) {
          this.validation.invalidate(this.compdataProject);
          this.validation.prime(this.compdataProject, result.referenceProject);
        }
        this.statusChanged.emit("Translated tournament names loaded");
      }
      if (result.warnings.length) this.toast.show(result.warnings[0], "warn");
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : String(error), "error");
    } finally {
      this.loading.hide();
    }
  }

  async saveCompdata(): Promise<void> {
    if (!this.compdataProject) return;
    try {
      this.loading.show("Saving tournament structure", "Writing compobj.txt");
      const result = await this.api.saveCompdata(this.compdataProject);
      this.compdataDirty = false;
      this.originalObjectIds = new Set(this.compdataProject.objects.map((object) => object.id));
      this.compdataProject.objects.forEach((object) => object.originalRawLine = this.display.rawLine(object));
      this.removedOriginalLines = [];
      this.statusChanged.emit(`${result.filesWritten} compdata file(s) saved`);
      if (result.warnings.length) this.toast.show(result.warnings[0], "warn");
    } catch (error) {
      this.toast.show(error instanceof Error ? error.message : String(error), "error");
    } finally {
      this.loading.hide();
    }
  }

  private createPhase(tournamentId: number, key: string, code: string, childCount: number): CompdataObject {
    if (!this.compdataProject) throw new Error("No tournament files loaded.");
    const phase: CompdataObject = { id: this.nextObjectId(), kind: 4, shortName: code, description: key, parentId: tournamentId };
    this.compdataProject.objects.push(phase);
    for (let index = 0; index < childCount; index += 1) {
      this.compdataProject.objects.push({ id: this.nextObjectId(), kind: 5, shortName: `G${index + 1}`, description: "", parentId: phase.id });
    }
    return phase;
  }

  private nextObjectId(): number {
    return Math.max(0, ...(this.compdataProject?.objects.map((object) => object.id) ?? [0])) + 1;
  }

  private nextCode(objects: CompdataObject[], prefix: string): string {
    const used = new Set(objects.map((object) => object.shortName.toUpperCase()));
    let index = 1;
    while (used.has(`${prefix}${index}`)) index += 1;
    return `${prefix}${index}`;
  }

  private afterStructureChange(): void {
    if (this.compdataProject) {
      this.tree.invalidate(this.compdataProject);
      this.validation.invalidateTournament(this.compdataProject, this.selectedTournamentId);
    }
    this.compdataDirty = true;
    this.refreshCompetitionSummaries();
  }

  private refreshCompetitionSummaries(): void {
    if (!this.compdataProject) return;
    const project = this.compdataProject;
    const competitionIds = [...new Set([...project.compIds, ...project.objects.filter((object) => object.kind === 3).map((object) => object.id)])];
    project.competitions = competitionIds.map((id) => {
      const competition = this.display.object(project, id);
      if (!competition) return undefined;
      const objects = this.tree.tournamentObjects(project, id);
      const objectIds = new Set(objects.map((object) => object.id));
      const stages = objects.filter((object) => object.kind === 4);
      const groups = objects.filter((object) => object.kind === 5);
      const groupIds = new Set(groups.map((group) => group.id));
      return {
        id,
        shortName: competition.shortName,
        description: competition.description,
        parentId: competition.parentId,
        stages,
        groups,
        settingsCount: project.settings.filter((setting) => objectIds.has(setting.objectId)).length,
        tasksCount: project.tasks.filter((task) => task.competitionId === id).length,
        scheduleCount: project.schedules.filter((schedule) => objectIds.has(schedule.objectId)).length,
        standingsCount: project.standings.filter((standing) => groupIds.has(standing.groupId)).length,
        advancementCount: project.advancements.filter((advancement) => groupIds.has(advancement.fromGroupId) || groupIds.has(advancement.toGroupId)).length,
        initTeamsCount: project.initTeams.filter((team) => team.competitionId === id).length
      } satisfies CompdataCompetitionSummary;
    }).filter((competition): competition is CompdataCompetitionSummary => Boolean(competition));
  }
}
