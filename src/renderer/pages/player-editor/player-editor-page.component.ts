import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { DbProject } from "../../../shared/types";
import type { VisualAssetType } from "../../../shared/types";
import { SearchListComponent } from "../../components/search-list/search-list.component";
import type { SearchListOption } from "../../components/search-list/search-list.component";
import { InputListComponent } from "../../components/input-list/input-list.component";
import type { InputListOption } from "../../components/input-list/input-list.component";
import type { DbMasterApi } from "../../services/dbmaster-api";
import { NationService } from "../../services/nation.service";
import { PlayerEditorService } from "../../services/player-editor.service";
import type { PlayerEditorDraft, PlayerEditorFieldDraft } from "../../services/player-editor.service";
import { PotentialCalculator } from "../../../utils/overall-calculator/potential-calculator";
import { positionInformation, positionNameToId, transfermarktPositionToFifaPosition } from "../../../utils/position-mapper/position-mapper";
import { VisualAssetPickerComponent } from "../../components/visual-asset-picker/visual-asset-picker.component";
import { TransfermarktPlayerImportModalComponent, type ImportedPlayerPayload } from "../../components/transfermarkt-player-import-modal/transfermarkt-player-import-modal.component";
import { getRandomGenericFaceId } from "../../../utils/get-generic-faces-ids/get-generic-face-id";

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
  readonly bodyTypeOptions: InputListOption[] = [
    { label: "Lean Normal", value: "1" },
    { label: "Average Normal", value: "2" },
    { label: "Stocky Normal", value: "3" },
    { label: "Lean Tall", value: "4" },
    { label: "Average Tall", value: "5" },
    { label: "Stocky Tall", value: "6" },
    { label: "Lean Short", value: "7" },
    { label: "Average Short", value: "8" },
    { label: "Stocky Short", value: "9" },
    { label: "Messi", value: "10" },
    { label: "Peter Crouch", value: "11" },
    { label: "Akinfenwa", value: "12" },
    { label: "Courtois", value: "13" },
    { label: "Neymar", value: "14" },
    { label: "Shaqiri", value: "15" },
    { label: "C. Ronaldo", value: "16" },
    { label: "Leroux (female footballer)", value: "18" }
  ];
  activeTab = "identity";
  lastApplied = "";
  lastAppliedTone: "info" | "error" = "info";
  minifaceDataUrl = "";
  minifaceSource: "player" | "generic" | "missing" = "missing";
  pickerVisible = false;
  pickerType: VisualAssetType = "hairs";
  pickerTargetField?: PlayerEditorFieldDraft;
  importModalVisible = false;
  private readonly api: DbMasterApi = window.dbmaster;
  private minifaceRequestId = 0;
  private readonly potentialCalculator = new PotentialCalculator();

  constructor(
    private readonly playerEditor: PlayerEditorService,
    private readonly nations: NationService,
    private readonly changeDetector: ChangeDetectorRef
  ) { }

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

  openPicker(type: VisualAssetType, field: PlayerEditorFieldDraft): void {
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
    this.importModalVisible = false;

    if (!this.draft) {
      return;
    }

    try {
      let importedNationalityId: string | undefined;
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
      const fullName = payload.profile.name ?? payload.overall.playerName ?? "";
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
        if (natName) {
          const natId = this.findNationId(natName);
          if (natId) {
            setField("nationality", natId);
            importedNationalityId = natId;
            this.draft.nationalityName = natName;
          }
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
          if (val !== undefined && val !== null) {
            setField(col, val.toString());
          }
        });
      }
      const potential = this.resolveImportedPotential(payload);
      if (potential !== undefined) {
        setField("potential", potential.toString());
      }

      // 8. Detected skin tone
      if (payload.skinTone) {
        setField("skintonecode", payload.skinTone.type.toString());
      }

      // 9. Generic head selected from skin tone and nationality
      let headTypeStatus = "";
      if (payload.skinTone) {
        const headTypeCode = getRandomGenericFaceId(
          payload.skinTone.type.toString(),
          importedNationalityId ?? ""
        );
        setField("headtypecode", headTypeCode.toString());
        setField("headclasscode", "1");
        headTypeStatus = ` Generic head ${headTypeCode} selected automatically.`;
      }

      // 10. Miniface update
      void this.loadMiniface(this.draft.playerId);

      const skinToneStatus = payload.skinTone
        ? ` Skin tone ${payload.skinTone.type} detected automatically.`
        : payload.skinToneWarning
          ? ` Skin tone was not detected: ${payload.skinToneWarning}`
          : "";
      this.lastApplied = `Successfully imported ${fullName} from Transfermarkt.${skinToneStatus}${headTypeStatus}`;
      this.lastAppliedTone = "info";
    } catch (err) {
      console.error("Error applying imported player data:", err);
      this.lastApplied = `Import completed with warning: ${err instanceof Error ? err.message : String(err)}`;
      this.lastAppliedTone = "error";
    } finally {
      this.changeDetector.detectChanges();
    }
  }

  private findNationId(nationalityName: string): string | undefined {
    const aliases: Record<string, string> = {
      netherlands: "holland"
    };
    const requestedNation = nationalityName.toLowerCase().trim();
    const normalizedSearch = aliases[requestedNation] ?? requestedNation;
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

  private resolveImportedPotential(payload: ImportedPlayerPayload): number | undefined {
    const importedPotential = this.ratingValue(payload.overall.potential);
    const overall = this.ratingValue(payload.overall.overall)
      ?? this.ratingValue(payload.overall.playerFields?.["overallrating"]);
    if (overall === undefined) {
      return importedPotential;
    }

    const age = payload.profile.age;
    const marketValue = this.positiveNumber(payload.profile.marketValue)
      ?? this.positiveNumber(payload.overall.breakdown?.marketValue);
    const position = payload.overall.position
      ?? transfermarktPositionToFifaPosition(payload.profile.position?.main);
    if (!Number.isFinite(age) || marketValue === undefined || !position) {
      return Math.max(importedPotential ?? overall, overall);
    }

    try {
      const calculatedPotential = this.potentialCalculator.calculate({
        overall,
        age: age as number,
        marketValue,
        position
      }).potential;
      return Math.max(importedPotential ?? calculatedPotential, calculatedPotential, overall);
    } catch {
      return Math.max(importedPotential ?? overall, overall);
    }
  }

  private ratingValue(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(Math.min(Math.max(parsed, 0), 99)) : undefined;
  }

  private positiveNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  ngOnDestroy(): void {
    if (this.isNew && !this.isNewApplied && this.draft) {
      this.playerEditor.cancelCreatedPlayer(this.project, this.draft.playerId, this.draft.rowIndex);
    }
  }
}
