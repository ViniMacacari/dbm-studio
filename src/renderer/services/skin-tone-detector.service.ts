import { Injectable } from "@angular/core";
import type { SkinToneResult } from "../../utils/skin-tone-detector/skin-tone-detector";
import type { DbMasterApi } from "./dbmaster-api";

@Injectable({ providedIn: "root" })
export class SkinToneDetectorService {
  private readonly api: DbMasterApi = window.dbmaster;

  async detect(imageUrl: string): Promise<SkinToneResult> {
    const response = await this.api.detectSkinTone(imageUrl);
    if (response.error || !response.result) {
      throw new Error(response.error ?? "Skin tone detection returned no result.");
    }
    return response.result;
  }
}
