import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, NgZone, ChangeDetectorRef } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { PlayerProfileResponse, PlayerSearchResult } from "../../../utils/transfermarkt-services/transfermarkt";
import type { SkinToneResult } from "../../../utils/skin-tone-detector/skin-tone-detector";
import { LoadingService } from "../../services/loading.service";
import { SkinToneDetectorService } from "../../services/skin-tone-detector.service";
import { GetPlayerOverallService, type CompletePlayerOverall } from "../../services/transfermarkt-services/get-player-overall/get-player-overall.service";

export interface ImportedPlayerPayload {
  overall: CompletePlayerOverall;
  profile: PlayerProfileResponse;
  skinTone?: SkinToneResult;
  skinToneWarning?: string;
  facialHairTypeCode?: number;
  facialHairWarning?: string;
}

@Component({
  selector: "app-transfermarkt-player-import-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./transfermarkt-player-import-modal.component.html",
  styleUrl: "./transfermarkt-player-import-modal.component.scss"
})
export class TransfermarktPlayerImportModalComponent {
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<ImportedPlayerPayload>();

  query = "";
  searching = false;
  error = "";
  results: PlayerSearchResult[] = [];

  constructor(
    private readonly loadingService: LoadingService,
    private readonly getPlayerOverallService: GetPlayerOverallService,
    private readonly skinToneDetectorService: SkinToneDetectorService,
    private readonly ngZone: NgZone,
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  onSubmit(): void {
    const q = this.query.trim();
    if (!q) {
      return;
    }

    if (/^\d+$/.test(q)) {
      void this.importPlayerById(q);
    } else {
      void this.searchPlayers(q);
    }
  }

  async searchPlayers(query: string): Promise<void> {
    this.searching = true;
    this.error = "";
    this.results = [];
    this.changeDetector.detectChanges();
    try {
      const response = await window.dbmaster.searchTransfermarktPlayers(query);
      this.ngZone.run(() => {
        if (response.error) {
          this.error = response.error;
        } else {
          this.results = response.results ?? [];
          if (this.results.length === 0) {
            this.error = "No players found matching your search.";
          }
        }
      });
    } catch (err) {
      console.error(err);
      this.ngZone.run(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    } finally {
      this.searching = false;
      this.changeDetector.detectChanges();
    }
  }

  selectPlayer(player: PlayerSearchResult): void {
    if (player.id) {
      void this.importPlayerById(player.id);
    }
  }

  async importPlayerById(playerId: string | number): Promise<void> {
    this.error = "";
    // Close the search modal before showing the global loading overlay. The
    // search backdrop has a higher z-index and would otherwise cover it while
    // the Transfermarkt requests are running.
    this.onClose();
    this.loadingService.show("Importing Player", "Fetching and calculating player overall details from Transfermarkt...");
    try {
      const [overall, profileResponse] = await Promise.all([
        this.getPlayerOverallService.getPlayerOverall(playerId),
        window.dbmaster.getTransfermarktPlayerProfile(playerId)
      ]);

      if (profileResponse.error || !profileResponse.result) {
        throw new Error(profileResponse.error ?? `Could not retrieve profile for player ID ${playerId}.`);
      }

      const profile = profileResponse.result;
      let skinTone: SkinToneResult | undefined;
      let skinToneWarning: string | undefined;
      let facialHairTypeCode: number | undefined;
      let facialHairWarning: string | undefined;
      const imageUrl = profile.imageUrl;
      if (imageUrl) {
        await Promise.all([
          (async () => {
            try {
              skinTone = await this.skinToneDetectorService.detect(imageUrl);
            } catch (error) {
              skinToneWarning = error instanceof Error ? error.message : String(error);
              console.warn("Could not detect the imported player's skin tone:", error);
            }
          })(),
          (async () => {
            try {
              const response = await window.dbmaster.detectBeard(imageUrl);
              if (response.error || response.result === undefined) {
                throw new Error(response.error ?? "Beard detection returned no result.");
              }
              facialHairTypeCode = response.result;
            } catch (error) {
              facialHairWarning = error instanceof Error ? error.message : String(error);
              console.warn("Could not detect the imported player's facial hair:", error);
            }
          })()
        ]);
      } else {
        skinToneWarning = "Transfermarkt did not return a profile image.";
        facialHairWarning = "Transfermarkt did not return a profile image.";
      }

      this.ngZone.run(() => {
        this.imported.emit({
          overall,
          profile,
          skinTone,
          skinToneWarning,
          facialHairTypeCode,
          facialHairWarning
        });
      });
    } catch (err) {
      console.error(err);
      this.ngZone.run(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    } finally {
      this.loadingService.hide();
      this.changeDetector.detectChanges();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
