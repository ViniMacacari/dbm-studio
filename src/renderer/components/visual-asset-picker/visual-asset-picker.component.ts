import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewEncapsulation } from "@angular/core";
import { FormsModule } from "@angular/forms";
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
  @Input() type: "hairs" | "beards" = "hairs";
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

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible) {
      this.resetPicker();
    }
    if (changes["type"] && this.visible) {
      this.resetPicker();
    }
  }

  private async resetPicker(): Promise<void> {
    this.searchTerm = "";
    this.visibleCount = 48;
    this.loadedThumbnails = {};
    try {
      this.allIds = await this.api.listAssets(this.type);
      this.filteredIds = [...this.allIds];
      if (this.currentValue) {
        this.scrollToSelected();
      } else {
        void this.loadThumbnailsForVisible();
      }
    } catch (err) {
      console.error("Error listing assets:", err);
      this.allIds = [];
      this.filteredIds = [];
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
    const visibleIds = this.filteredIds.slice(0, this.visibleCount);
    const idsToLoad = visibleIds.filter(id => !this.loadedThumbnails[id]);
    
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
            const res = await this.api.getHairBeardAsset(this.type, id);
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
    if (!this.currentValue) {
      return;
    }
    const selectedIndex = this.filteredIds.indexOf(this.currentValue);
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
