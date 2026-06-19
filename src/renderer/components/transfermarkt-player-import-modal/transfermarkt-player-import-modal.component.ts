import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { PlayerProfileResponse, PlayerSearchResult } from "../../../utils/transfermarkt-services/transfermarkt";
import { LoadingService } from "../../services/loading.service";
import { GetPlayerOverallService, type CompletePlayerOverall } from "../../services/transfermarkt-services/get-player-overall/get-player-overall.service";

export interface ImportedPlayerPayload {
  overall: CompletePlayerOverall;
  profile: PlayerProfileResponse;
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
    private readonly getPlayerOverallService: GetPlayerOverallService
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
    try {
      const response = await window.dbmaster.searchTransfermarktPlayers(query);
      if (response.error) {
        this.error = response.error;
      } else {
        this.results = response.results ?? [];
        if (this.results.length === 0) {
          this.error = "No players found matching your search.";
        }
      }
    } catch (err) {
      console.error(err);
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.searching = false;
    }
  }

  selectPlayer(player: PlayerSearchResult): void {
    if (player.id) {
      void this.importPlayerById(player.id);
    }
  }

  async importPlayerById(playerId: string | number): Promise<void> {
    this.error = "";
    this.loadingService.show("Importing Player", "Fetching and calculating player overall details from Transfermarkt...");
    try {
      const [overall, profileResponse] = await Promise.all([
        this.getPlayerOverallService.getPlayerOverall(playerId),
        window.dbmaster.getTransfermarktPlayerProfile(playerId)
      ]);

      if (profileResponse.error || !profileResponse.result) {
        throw new Error(profileResponse.error ?? `Could not retrieve profile for player ID ${playerId}.`);
      }

      this.imported.emit({
        overall,
        profile: profileResponse.result
      });
      this.onClose();
    } catch (err) {
      console.error(err);
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loadingService.hide();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
