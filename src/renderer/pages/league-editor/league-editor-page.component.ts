import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import type { SearchListOption } from "../../components/search-list/search-list.component";
import { LeagueEditorService } from "../../services/league-editor.service";
import type { LeagueEditorDraft, LeagueEditorFieldDraft, LeagueTeamLinkDraft } from "../../services/league-editor.service";
import { NationService } from "../../services/nation.service";

@Component({
  selector: "app-league-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent],
  templateUrl: "./league-editor-page.component.html",
  styleUrl: "./league-editor-page.component.scss"
})
export class LeagueEditorPageComponent implements OnChanges {
  @Input({ required: true }) project!: DbProject;
  @Input({ required: true }) rowIndex = 0;
  @Input() canSaveDatabase = false;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();
  @Output() appliedAndSave = new EventEmitter<string>();

  draft?: LeagueEditorDraft;
  nationOptions: SearchListOption[] = [];
  activeTab = "identity";
  lastApplied = "";
  lastAppliedTone: "info" | "error" = "info";

  constructor(
    private readonly leagueEditor: LeagueEditorService,
    private readonly nations: NationService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["project"] || changes["rowIndex"]) {
      this.loadDraft();
    }
  }

  get sections() {
    return this.draft?.sections ?? [];
  }

  addTeam(): void {
    if (!this.draft) {
      return;
    }
    try {
      this.lastApplied = this.leagueEditor.addTeamToDraft(this.draft, this.draft.teamToAdd);
      this.lastAppliedTone = "info";
    } catch (error) {
      this.lastApplied = error instanceof Error ? error.message : String(error);
      this.lastAppliedTone = "error";
    }
  }

  removeTeam(teamId: string): void {
    if (!this.draft) {
      return;
    }
    this.leagueEditor.removeTeamFromDraft(this.draft, teamId);
    this.lastApplied = "Team link removed from draft";
    this.lastAppliedTone = "info";
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

  setTab(tab: string): void {
    this.activeTab = tab;
  }

  trackBySection(_index: number, section: { id: string }): string {
    return section.id;
  }

  trackByField(_index: number, field: LeagueEditorFieldDraft): string {
    return field.column;
  }

  trackByTeamLink(_index: number, link: LeagueTeamLinkDraft): string {
    return link.teamId;
  }

  private commitDraft(action: "stay" | "back" | "save"): void {
    if (!this.draft || !this.project) {
      return;
    }

    try {
      const result = this.leagueEditor.applyDraft(this.project, this.draft);
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

  private loadDraft(resetTab = true): void {
    this.draft = this.project ? this.leagueEditor.createDraft(this.project, this.rowIndex) : undefined;
    this.nationOptions = this.nations.nationOptions(this.project);
    if (resetTab) {
      this.activeTab = "identity";
      this.lastApplied = "";
      this.lastAppliedTone = "info";
    }
  }
}
