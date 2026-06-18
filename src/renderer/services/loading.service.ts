import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class LoadingService {
  active = false;
  title = "Loading";
  detail = "Please wait";
  percent?: number;
  progressLabel = "";

  show(title = "Loading", detail = "Please wait"): void {
    this.title = title;
    this.detail = detail;
    this.active = true;
    this.percent = undefined;
    this.progressLabel = "";
  }

  hide(): void {
    this.active = false;
    this.percent = undefined;
    this.progressLabel = "";
  }

  updateProgress(percent: number, progressLabel = ""): void {
    this.percent = percent;
    this.progressLabel = progressLabel;
  }
}
