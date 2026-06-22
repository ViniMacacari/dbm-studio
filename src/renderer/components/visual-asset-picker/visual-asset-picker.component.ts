import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { VisualAssetType } from "../../../shared/types";
import type { DbMasterApi } from "../../services/dbmaster-api";

@Component({
  selector: "app-visual-asset-picker",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./visual-asset-picker.component.html",
  styleUrl: "./visual-asset-picker.component.scss",
  encapsulation: ViewEncapsulation.None
})
export class VisualAssetPickerComponent implements OnChanges {
  @Input() visible = false;
  @Input() type: VisualAssetType = "hairs";
  @Input() currentValue = "";
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() selected = new EventEmitter<string>();

  private readonly api: DbMasterApi = window.dbmaster;

  allIds: string[] = [];
  filteredIds: string[] = [];
  searchTerm = "";
  visibleCount = 48;
  loadedThumbnails: Record<string, string> = {};
  private currentSessionId = 0;

  get normalizedCurrentValue(): string {
    const value = String(this.currentValue ?? "").trim();
    if (!value) {
      return "";
    }
    if (this.type === "skin-tones") {
      const numericValue = Number(value);
      return Number.isInteger(numericValue) ? String(numericValue) : value;
    }
    return value.padStart(4, "0");
  }

  get assetLabel(): string {
    if (this.type === "skin-tones") {
      return "Skin Tone";
    }
    return this.type === "hairs" ? "Hair Style" : "Beard Style";
  }

  get visibleIds(): string[] {
    return this.filteredIds.slice(0, this.visibleCount);
  }

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    const visibleChanged = changes["visible"] && this.visible;
    const typeChanged = changes["type"] && this.visible;
    if (visibleChanged || typeChanged) {
      void this.resetPicker();
    }
  }

  private async resetPicker(): Promise<void> {
    const sessionId = ++this.currentSessionId;
    this.searchTerm = "";
    this.visibleCount = 48;
    this.loadedThumbnails = {};
    try {
      const ids = await this.api.listAssets(this.type);
      if (sessionId !== this.currentSessionId) {
        return;
      }
      this.allIds = ids;
      this.filteredIds = [...this.allIds];
      if (this.normalizedCurrentValue) {
        this.scrollToSelected();
      } else {
        void this.loadThumbnailsForVisible();
      }
    } catch (err) {
      console.error("Error listing assets:", err);
      if (sessionId === this.currentSessionId) {
        this.allIds = [];
        this.filteredIds = [];
      }
    }
  }

  onSearchChange(): void {
    const query = this.searchTerm.trim();
    if (!query) {
      this.filteredIds = [...this.allIds];
    } else {
      this.filteredIds = this.allIds.filter((id) => id.includes(query));
    }
    this.visibleCount = 48;
    void this.loadThumbnailsForVisible();
  }

  loadMore(): void {
    this.visibleCount += 48;
    void this.loadThumbnailsForVisible();
  }

  private async loadThumbnailsForVisible(): Promise<void> {
    const sessionId = ++this.currentSessionId;
    const currentVisibleIds = this.visibleIds;
    const idsToLoad = currentVisibleIds.filter(id => !this.loadedThumbnails[id]);
    
    if (idsToLoad.length === 0) {
      return;
    }

    idsToLoad.forEach(id => {
      this.loadedThumbnails[id] = "loading";
    });

    const chunkSize = 6;
    for (let i = 0; i < idsToLoad.length; i += chunkSize) {
      if (sessionId !== this.currentSessionId) {
        return;
      }
      const chunk = idsToLoad.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (id) => {
          try {
            const res = await this.api.getVisualAsset(this.type, id);
            if (sessionId === this.currentSessionId) {
              this.loadedThumbnails[id] = res.found ? res.dataUrl : "";
            }
          } catch {
            if (sessionId === this.currentSessionId) {
              this.loadedThumbnails[id] = "";
            }
          }
        })
      );
      if (sessionId !== this.currentSessionId) {
        return;
      }
      this.changeDetector.detectChanges();
    }
  }

  private scrollToSelected(): void {
    if (!this.normalizedCurrentValue) {
      return;
    }
    const selectedIndex = this.filteredIds.indexOf(this.normalizedCurrentValue);
    if (selectedIndex >= 0) {
      if (selectedIndex >= this.visibleCount) {
        this.visibleCount = Math.ceil((selectedIndex + 1) / 12) * 12;
      }
      
      void this.loadThumbnailsForVisible();

      setTimeout(() => {
        const selectedEl = document.querySelector(".asset-card.selected");
        if (selectedEl) {
          selectedEl.scrollIntoView({ block: "center", behavior: "auto" });
          (selectedEl as HTMLElement).focus();
        }
      }, 150);
    } else {
      void this.loadThumbnailsForVisible();
    }
  }

  trackById(_index: number, id: string): string {
    return id;
  }

  selectAsset(id: string): void {
    this.selected.emit(id);
    this.close();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
