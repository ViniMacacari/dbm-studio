import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import { TeamEditorService } from "../../services/team-editor.service";
import type { TeamEditorDraft, TeamEditorFieldDraft } from "../../services/team-editor.service";
import type { TeamPlayerLinkDraft } from "../../services/transfer.service";

@Component({
  selector: "app-team-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent],
  templateUrl: "./team-editor-page.component.html",
  styleUrl: "./team-editor-page.component.scss"
})
export class TeamEditorPageComponent implements OnChanges {
  @Input({ required: true }) project!: DbProject;
  @Input({ required: true }) rowIndex = 0;
  @Input() canSaveDatabase = false;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();
  @Output() appliedAndSave = new EventEmitter<string>();

  draft?: TeamEditorDraft;
  activeTab = "identity";
  lastApplied = "";
  lastAppliedTone: "info" | "error" = "info";

  constructor(private readonly teamEditor: TeamEditorService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["project"] || changes["rowIndex"]) {
      this.loadDraft();
    }
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
      this.lastApplied = this.teamEditor.addPlayerToDraft(this.draft, this.draft.playerToAdd);
      this.lastAppliedTone = "info";
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  removePlayer(playerId: string): void {
    if (!this.draft) {
      return;
    }
    this.teamEditor.removePlayerFromDraft(this.draft, playerId);
  }

  trackBySection(_index: number, section: { id: string }): string {
    return section.id;
  }

  trackByField(_index: number, field: TeamEditorFieldDraft): string {
    return field.column;
  }

  trackByTeamPlayer(_index: number, player: TeamPlayerLinkDraft): string {
    return `${player.rowIndex}:${player.playerId}`;
  }

  private loadDraft(resetTab = true): void {
    this.draft = this.project ? this.teamEditor.createDraft(this.project, this.rowIndex) : undefined;
    if (resetTab) {
      this.activeTab = "identity";
      this.lastApplied = "";
      this.lastAppliedTone = "info";
    }
  }
}
