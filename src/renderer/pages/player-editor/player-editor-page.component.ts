import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import type { SearchListOption } from "../../components/search-list/search-list.component";
import { NationService } from "../../services/nation.service";
import { PlayerEditorService } from "../../services/player-editor.service";
import type { PlayerEditorDraft, PlayerEditorFieldDraft } from "../../services/player-editor.service";

@Component({
  selector: "app-player-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent],
  templateUrl: "./player-editor-page.component.html",
  styleUrl: "./player-editor-page.component.scss"
})
export class PlayerEditorPageComponent implements OnChanges {
  @Input({ required: true }) project!: DbProject;
  @Input({ required: true }) rowIndex = 0;
  @Input() canSaveDatabase = false;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();
  @Output() appliedAndSave = new EventEmitter<string>();

  draft?: PlayerEditorDraft;
  nationOptions: SearchListOption[] = [];
  activeTab = "identity";
  lastApplied = "";
  lastAppliedTone: "info" | "error" = "info";

  constructor(
    private readonly playerEditor: PlayerEditorService,
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
      const result = this.playerEditor.applyDraft(this.project, this.draft);
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

  trackBySection(_index: number, section: { id: string }): string {
    return section.id;
  }

  trackByField(_index: number, field: PlayerEditorFieldDraft): string {
    return field.column;
  }

  private loadDraft(resetTab = true): void {
    this.draft = this.project ? this.playerEditor.createDraft(this.project, this.rowIndex) : undefined;
    this.nationOptions = this.nations.nationOptions(this.project);
    if (resetTab) {
      this.activeTab = "identity";
      this.lastApplied = "";
      this.lastAppliedTone = "info";
    }
  }
}
