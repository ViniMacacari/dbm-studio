import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { InputColorComponent } from "../../components/input-color/input-color.component";
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

@Component({
  selector: "app-team-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent, InputColorComponent],
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
  private readonly api: DbMasterApi = window.dbmaster;
  private crestRequestId = 0;
  private minifaceLoadGeneration = 0;
  private readonly playerImageBatchSize = 20;

  constructor(private readonly teamEditor: TeamEditorService) {}

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

  addPlayer(): void {
    if (!this.draft) {
      return;
    }

    try {
      const playerId = this.draft.playerToAdd;
      this.lastApplied = this.teamEditor.addPlayerToDraft(this.draft, playerId);
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
      this.teamEditor.removePlayerFromDraft(this.draft!, playerId);
      return "Player removed from roster draft";
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
