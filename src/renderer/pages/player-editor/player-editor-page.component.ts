import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import type { SearchListOption } from "../../components/search-list/search-list.component";
import { InputListComponent } from "../../components/input-list/input-list.component";
import type { DbMasterApi } from "../../services/dbmaster-api";
import { NationService } from "../../services/nation.service";
import { PlayerEditorService } from "../../services/player-editor.service";
import type { PlayerEditorDraft, PlayerEditorFieldDraft } from "../../services/player-editor.service";
import { positionInformation, positionNameToId, transfermarktPositionToFifaPosition } from "../../../utils/position-mapper/position-mapper";
import { VisualAssetPickerComponent } from "../../components/visual-asset-picker/visual-asset-picker.component";
import { TransfermarktPlayerImportModalComponent, type ImportedPlayerPayload } from "../../components/transfermarkt-player-import-modal/transfermarkt-player-import-modal.component";

@Component({
  selector: "app-player-editor-page",
  standalone: true,
  imports: [CommonModule, FormsModule, SearchListComponent, InputListComponent, VisualAssetPickerComponent, TransfermarktPlayerImportModalComponent],
  templateUrl: "./player-editor-page.component.html",
  styleUrl: "./player-editor-page.component.scss"
})
export class PlayerEditorPageComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) project!: DbProject;
  @Input({ required: true }) rowIndex = 0;
  @Input() isNew = false;
  @Input() canSaveDatabase = false;
  @Output() closeEditor = new EventEmitter<void>();
  @Output() applied = new EventEmitter<string>();
  @Output() appliedAndSave = new EventEmitter<string>();

  draft?: PlayerEditorDraft;
  nationOptions: SearchListOption[] = [];
  isNewApplied = false;
  positionOptions = positionInformation.map(pos => ({ label: pos.name, value: pos.id.toString() }));
  activeTab = "identity";
  lastApplied = "";
  lastAppliedTone: "info" | "error" = "info";
  minifaceDataUrl = "";
  minifaceSource: "player" | "generic" | "missing" = "missing";
  pickerVisible = false;
  pickerType: "hairs" | "beards" = "hairs";
  pickerTargetField?: PlayerEditorFieldDraft;
  importModalVisible = false;
  private readonly api: DbMasterApi = window.dbmaster;
  private minifaceRequestId = 0;

  constructor(
    private readonly playerEditor: PlayerEditorService,
    private readonly nations: NationService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["project"] || changes["rowIndex"] || changes["isNew"]) {
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
      this.isNewApplied = true;
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
    this.draft = this.project ? this.playerEditor.createDraft(this.project, this.rowIndex, this.isNew) : undefined;
    this.nationOptions = this.nations.nationOptions(this.project);
    if (this.draft) {
      void this.loadMiniface(this.draft.playerId);
    } else {
      this.minifaceDataUrl = "";
      this.minifaceSource = "missing";
    }
    if (resetTab) {
      this.activeTab = "identity";
      this.lastApplied = "";
      this.lastAppliedTone = "info";
    }
  }

  private async loadMiniface(playerId: string): Promise<void> {
    const requestId = ++this.minifaceRequestId;
    try {
      const result = await this.api.getPlayerMiniface(playerId);
      if (requestId !== this.minifaceRequestId) {
        return;
      }
      this.minifaceDataUrl = result.dataUrl;
      this.minifaceSource = result.source;
    } catch {
      if (requestId !== this.minifaceRequestId) {
        return;
      }
      this.minifaceDataUrl = "";
      this.minifaceSource = "missing";
    }
  }

  openPicker(type: "hairs" | "beards", field: PlayerEditorFieldDraft): void {
    this.pickerType = type;
    this.pickerTargetField = field;
    this.pickerVisible = true;
  }

  onPickerSelected(assetId: string): void {
    if (this.pickerTargetField) {
      this.pickerTargetField.value = assetId;
    }
  }

  onPlayerImported(payload: ImportedPlayerPayload): void {
    if (!this.draft) {
      return;
    }

    const setField = (column: string, val: string) => {
      let field = this.draft!.identityFields.find(f => f.column.toLowerCase() === column.toLowerCase());
      if (!field) {
        for (const sec of this.draft!.sections) {
          field = sec.fields.find(f => f.column.toLowerCase() === column.toLowerCase());
          if (field) {
            break;
          }
        }
      }
      if (field) {
        field.value = val;
      }
    };

    // 1. Names
    const fullName = payload.profile.name ?? payload.overall.playerName;
    const parts = fullName.trim().split(/\s+/);
    let first = fullName;
    let last = "";
    if (parts.length > 1) {
      first = parts.slice(0, -1).join(" ");
      last = parts[parts.length - 1];
    }
    this.draft.names.firstname = first;
    this.draft.names.surname = last;
    this.draft.names.playerjerseyname = last || fullName;
    this.draft.names.commonname = fullName;
    this.draft.displayName = fullName;

    // 2. Age / Birthdate
    if (payload.profile.dateOfBirth) {
      this.draft.birthDateIso = payload.profile.dateOfBirth;
      setField("birthdate", payload.profile.dateOfBirth);
    }
    if (payload.profile.age !== null && payload.profile.age !== undefined) {
      this.draft.age = payload.profile.age;
    }

    // 3. Height
    if (payload.profile.height) {
      setField("height", payload.profile.height.toString());
    }

    // 4. Nationality
    if (payload.profile.citizenship && payload.profile.citizenship.length > 0) {
      const natName = payload.profile.citizenship[0];
      const natId = this.findNationId(natName);
      if (natId) {
        setField("nationality", natId);
        this.draft.nationalityName = natName;
      }
    }

    // 5. Preferred Foot
    if (payload.profile.foot) {
      const f = payload.profile.foot.toLowerCase();
      if (f.includes("left")) {
        setField("preferredfoot", "1");
      } else if (f.includes("right")) {
        setField("preferredfoot", "2");
      }
    }

    // 6. Primary Position
    if (payload.profile.position && payload.profile.position.main) {
      const fifaPos = transfermarktPositionToFifaPosition(payload.profile.position.main);
      if (fifaPos) {
        const posId = positionNameToId(fifaPos);
        if (posId !== -1) {
          setField("preferredposition1", posId.toString());
        }
      }
    }

    // 7. Overall / Attributes
    if (payload.overall.playerFields) {
      Object.entries(payload.overall.playerFields).forEach(([col, val]) => {
        setField(col, val.toString());
      });
    }

    // 8. Visual Head / Miniface update
    void this.loadMiniface(this.draft.playerId);

    this.lastApplied = `Successfully imported ${fullName} from Transfermarkt.`;
    this.lastAppliedTone = "info";
  }

  private findNationId(nationalityName: string): string | undefined {
    const normalizedSearch = nationalityName.toLowerCase().trim();
    let match = this.nationOptions.find(opt => opt.label.toLowerCase().startsWith(normalizedSearch));
    if (match) {
      return match.value;
    }
    match = this.nationOptions.find(opt => {
      const countryPart = opt.label.split(" (")[0].toLowerCase().trim();
      return countryPart === normalizedSearch || countryPart.includes(normalizedSearch) || normalizedSearch.includes(countryPart);
    });
    return match?.value;
  }

  ngOnDestroy(): void {
    if (this.isNew && !this.isNewApplied && this.draft) {
      this.playerEditor.cancelCreatedPlayer(this.project, this.draft.playerId, this.draft.rowIndex);
    }
  }
}
