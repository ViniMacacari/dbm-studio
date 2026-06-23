import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { InputColorComponent } from "../../components/input-color/input-color.component";
import { InputListComponent } from "../../components/input-list/input-list.component";
import type { InputListOption } from "../../components/input-list/input-list.component";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import type { DbMasterApi } from "../../services/dbmaster-api";
import type { LocalizationFieldDraft } from "../../services/localization.service";
import { TeamEditorService } from "../../services/team-editor.service";
import type {
  TeamColorGroupDraft,
  TeamEditorDraft,
  TeamEditorFieldDraft,
  TeamKitColorDraft,
  TeamKitDraft,
  TeamKitFieldDraft,
  TeamNationLinkDraft,
  TeamRivalDraft,
  TeamStadiumLinkDraft
} from "../../services/team-editor.service";
import type { TeamPlayerLinkDraft } from "../../services/transfer.service";
import { TeamFormationEditorService } from "../../services/team-formation-editor.service";
import type { TeamSheetSlot } from "../../services/team-formation-editor.service";

@Component({
  selector: "app-team-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent, InputColorComponent, InputListComponent],
  templateUrl: "./team-editor-page.component.html",
  styleUrl: "./team-editor-page.component.scss"
})
export class TeamEditorPageComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) project!: DbProject;
  @Input({ required: true }) rowIndex = 0;
  @Input() isNew = false;
  @Input() canSaveDatabase = false;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();
  @Output() appliedAndSave = new EventEmitter<string>();

  draft?: TeamEditorDraft;
  activeTab = "identity";
  lastApplied = "";
  lastAppliedTone: "info" | "error" = "info";
  crestDataUrl = "";
  crestSource: "team" | "missing" = "missing";
  playerMinifaces: Record<string, { dataUrl: string; source: "player" | "generic" | "missing" | "loading" }> = {};
  formationPlayerSearch = "";
  selectedFormationSlot?: TeamSheetSlot;
  private readonly api: DbMasterApi = window.dbmaster;
  private crestRequestId = 0;
  private minifaceLoadGeneration = 0;
  private readonly playerImageBatchSize = 20;
  private readonly pitchHorizontalPadding = 5;
  private readonly pitchVerticalPadding = 4;

  constructor(
    private readonly teamEditor: TeamEditorService,
    private readonly formationEditor: TeamFormationEditorService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["project"] || changes["rowIndex"]) {
      this.loadDraft();
    }
  }

  ngOnDestroy(): void {
    this.minifaceLoadGeneration += 1;
  }

  get sections() {
    return this.draft?.sections ?? [];
  }

  get formationOptions(): InputListOption[] {
    return this.draft?.formation?.templates.map((template) => ({
      value: template.formationId,
      label: `${template.formationName} (ID ${template.formationId})`
    })) ?? [];
  }

  get filteredFormationBench(): TeamSheetSlot[] {
    return this.filterFormationSlots(this.draft?.formation?.bench ?? []);
  }

  get filteredFormationReserves(): TeamSheetSlot[] {
    return this.filterFormationSlots(this.draft?.formation?.reserves ?? []);
  }

  get filteredOtherSquadPlayers(): TeamSheetSlot[] {
    return this.filterFormationSlots(this.draft?.formation?.otherSquadPlayers ?? []);
  }

  apply(): void {
    this.commitDraft("stay");
  }

  applyAndBack(): void {
    this.commitDraft("back");
  }

  applyAndSave(): void {
    this.commitDraft("save");
  }

  private commitDraft(action: "stay" | "back" | "save"): void {
    if (!this.draft || !this.project) {
      return;
    }

    try {
      const result = this.teamEditor.applyDraft(this.project, this.draft);
      this.lastApplied = result.message;
      this.lastAppliedTone = "info";
      if (action === "save") {
        this.appliedAndSave.emit(result.message);
      } else {
        this.applied.emit(result.message);
      }
      this.loadDraft(false);
      if (action === "back") {
        this.closeEditor.emit();
      }
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  changeFormation(formationId: string): void {
    if (!this.draft?.formation) {
      return;
    }
    try {
      this.formationEditor.changeFormation(this.draft.formation, formationId);
      this.selectedFormationSlot = undefined;
      this.lastApplied = `Formation preview changed to ${this.draft.formation.selectedFormation.formationName}. Apply to commit.`;
      this.lastAppliedTone = "info";
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  selectFormationSlot(slot: TeamSheetSlot): void {
    if (!this.draft?.formation) {
      return;
    }
    if (!this.selectedFormationSlot) {
      this.selectedFormationSlot = slot;
      return;
    }
    if (this.formationSlotKey(this.selectedFormationSlot) === this.formationSlotKey(slot)) {
      this.selectedFormationSlot = undefined;
      return;
    }

    const sourceName = this.selectedFormationSlot.playerName;
    const targetName = slot.playerName;
    try {
      this.formationEditor.swapPlayers(this.draft.formation, this.selectedFormationSlot, slot);
      this.lastApplied = `${sourceName} and ${targetName} swapped in the formation preview. Apply to commit.`;
      this.lastAppliedTone = "info";
      this.selectedFormationSlot = undefined;
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  revertFormation(): void {
    if (!this.draft) {
      return;
    }
    const formation = this.formationEditor.loadTeamFormation(this.project, this.draft.teamId, this.draft.playerLinks);
    if (formation) {
      this.draft.formation = formation;
      this.selectedFormationSlot = undefined;
      this.formationPlayerSearch = "";
      this.lastApplied = "Formation changes reverted.";
      this.lastAppliedTone = "info";
    }
  }

  formationSlotKey(slot: TeamSheetSlot): string {
    return slot.slot >= 0 ? `${slot.type}:${slot.slot}` : `${slot.type}:${slot.playerId}`;
  }

  isFormationSlotSelected(slot: TeamSheetSlot): boolean {
    return Boolean(this.selectedFormationSlot && this.formationSlotKey(this.selectedFormationSlot) === this.formationSlotKey(slot));
  }

  pitchLeft(slot: TeamSheetSlot): number {
    return this.scalePitchOffset(this.clampOffset(slot.offsetX), this.pitchHorizontalPadding);
  }

  pitchTop(slot: TeamSheetSlot): number {
    return this.scalePitchOffset(1 - this.clampOffset(slot.offsetY), this.pitchVerticalPadding);
  }

  addPlayer(): void {
    if (!this.draft) {
      return;
    }

    try {
      const playerId = this.draft.playerToAdd;
      this.lastApplied = this.teamEditor.addPlayerToDraft(this.project, this.draft, playerId);
      this.lastAppliedTone = "info";
      void this.loadPlayerMinifaces([playerId]);
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  removePlayer(playerId: string): void {
    if (!this.draft) {
      return;
    }
    this.runDraftAction(() => {
      this.teamEditor.removePlayerFromDraft(this.project, this.draft!, playerId);
      this.selectedFormationSlot = undefined;
      return "Player removed from roster, formation, and set pieces draft";
    });
  }

  addNation(): void {
    if (!this.draft) {
      return;
    }
    this.runDraftAction(() => this.teamEditor.addNationToDraft(this.draft!, this.draft!.nationToAdd));
  }

  removeNation(key: string): void {
    if (!this.draft) {
      return;
    }
    this.teamEditor.removeNationFromDraft(this.draft, key);
  }

  addRival(): void {
    if (!this.draft) {
      return;
    }
    this.runDraftAction(() => this.teamEditor.addRivalToDraft(this.draft!, this.draft!.rivalToAdd));
  }

  removeRival(key: string): void {
    if (!this.draft) {
      return;
    }
    this.teamEditor.removeRivalFromDraft(this.draft, key);
  }

  assignStadium(): void {
    if (!this.draft) {
      return;
    }
    this.runDraftAction(() => this.teamEditor.assignStadiumToDraft(this.draft!, this.draft!.stadiumToAssign));
  }

  addKit(kitType: string): void {
    if (!this.draft) {
      return;
    }
    this.runDraftAction(() => this.teamEditor.addKitToDraft(this.project, this.draft!, kitType));
  }

  addKitFromInput(): void {
    if (!this.draft) {
      return;
    }
    this.addKit(this.draft.kitTypeToAdd);
  }

  removeKit(key: string): void {
    if (!this.draft) {
      return;
    }
    this.runDraftAction(() => this.teamEditor.removeKitFromDraft(this.draft!, key));
  }

  trackBySection(_index: number, section: { id: string }): string {
    return section.id;
  }

  trackByField(_index: number, field: TeamEditorFieldDraft): string {
    return field.column;
  }

  trackByColorGroup(_index: number, group: TeamColorGroupDraft): string {
    return group.id;
  }

  trackByTeamPlayer(_index: number, player: TeamPlayerLinkDraft): string {
    return `${player.rowIndex}:${player.playerId}`;
  }

  trackByNation(_index: number, link: TeamNationLinkDraft): string {
    return link.key;
  }

  trackByRival(_index: number, rival: TeamRivalDraft): string {
    return rival.key;
  }

  trackByStadium(_index: number, stadium: TeamStadiumLinkDraft): string {
    return stadium.key;
  }

  trackByKit(_index: number, kit: TeamKitDraft): string {
    return kit.key;
  }

  trackByKitField(_index: number, field: TeamKitFieldDraft): string {
    return field.column;
  }

  trackByKitColor(_index: number, color: TeamKitColorDraft): string {
    return color.id;
  }

  trackByLocalizationField(_index: number, field: LocalizationFieldDraft): string {
    return field.key;
  }

  trackByFormationSlot(_index: number, slot: TeamSheetSlot): string {
    return slot.slot >= 0 ? `${slot.type}:${slot.slot}` : `${slot.type}:${slot.playerId}`;
  }

  private runDraftAction(action: () => string): void {
    try {
      this.lastApplied = action();
      this.lastAppliedTone = "info";
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  private loadDraft(resetTab = true): void {
    this.draft = this.project ? this.teamEditor.createDraft(this.project, this.rowIndex, this.isNew) : undefined;
    if (resetTab) {
      this.minifaceLoadGeneration += 1;
      this.playerMinifaces = {};
      this.selectedFormationSlot = undefined;
      this.formationPlayerSearch = "";
    }
    if (this.draft) {
      void this.loadCrest(this.draft.teamId);
      void this.loadPlayerMinifaces(this.draft.playerLinks.map((player) => player.playerId));
    } else {
      this.crestDataUrl = "";
      this.crestSource = "missing";
    }
    if (resetTab) {
      this.activeTab = "identity";
      this.lastApplied = "";
      this.lastAppliedTone = "info";
    }
  }

  private async loadCrest(teamId: string): Promise<void> {
    const requestId = ++this.crestRequestId;
    try {
      const result = await this.api.getTeamCrest(teamId);
      if (requestId !== this.crestRequestId) {
        return;
      }
      this.crestDataUrl = result.dataUrl;
      this.crestSource = result.source;
    } catch {
      if (requestId !== this.crestRequestId) {
        return;
      }
      this.crestDataUrl = "";
      this.crestSource = "missing";
    }
  }

  private filterFormationSlots(slots: TeamSheetSlot[]): TeamSheetSlot[] {
    const query = this.normalizeSearch(this.formationPlayerSearch);
    if (!query) {
      return slots;
    }
    return slots.filter((slot) =>
      this.normalizeSearch(`${slot.playerName} ${slot.positionName ?? ""} ${slot.preferredPositionName ?? ""}`).includes(query)
    );
  }

  private normalizeSearch(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  private clampOffset(value: number | undefined): number {
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value as number)) : 0.5;
  }

  private scalePitchOffset(value: number, paddingPercent: number): number {
    return paddingPercent + value * (100 - paddingPercent * 2);
  }

  private async loadPlayerMinifaces(playerIds: string[]): Promise<void> {
    const generation = this.minifaceLoadGeneration;
    const idsToLoad = [...new Set(playerIds)].filter((playerId) => playerId && !this.playerMinifaces[playerId]);

    for (let start = 0; start < idsToLoad.length; start += this.playerImageBatchSize) {
      if (generation !== this.minifaceLoadGeneration) {
        return;
      }

      const batch = idsToLoad.slice(start, start + this.playerImageBatchSize);
      for (const playerId of batch) {
        this.playerMinifaces[playerId] = { dataUrl: "", source: "loading" };
      }

      const results = await Promise.all(batch.map(async (playerId) => {
        try {
          return await this.api.getPlayerMiniface(playerId);
        } catch {
          return { playerId, dataUrl: "", source: "missing" as const };
        }
      }));

      if (generation !== this.minifaceLoadGeneration) {
        return;
      }
      for (const result of results) {
        this.playerMinifaces[result.playerId] = result;
      }

      if (start + this.playerImageBatchSize < idsToLoad.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      }
    }
  }
}
