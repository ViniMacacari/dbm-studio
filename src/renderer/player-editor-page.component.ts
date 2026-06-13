import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../shared/types";
import { PlayerEditorService } from "./player-editor.service";
import type { PlayerEditorDraft, PlayerEditorFieldDraft } from "./player-editor.service";

@Component({
  selector: "app-player-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./player-editor-page.component.html"
})
export class PlayerEditorPageComponent implements OnChanges {
  @Input({ required: true }) project!: DbProject;
  @Input({ required: true }) rowIndex = 0;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();

  draft?: PlayerEditorDraft;
  activeTab = "identity";
  lastApplied = "";

  constructor(private readonly playerEditor: PlayerEditorService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["project"] || changes["rowIndex"]) {
      this.loadDraft();
    }
  }

  get sections() {
    return this.draft?.sections ?? [];
  }

  apply(): void {
    if (!this.draft || !this.project) {
      return;
    }
    const result = this.playerEditor.applyDraft(this.project, this.draft);
    this.lastApplied = result.message;
    this.applied.emit(result.message);
    this.loadDraft(false);
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
    if (resetTab) {
      this.activeTab = "identity";
      this.lastApplied = "";
    }
  }
}
