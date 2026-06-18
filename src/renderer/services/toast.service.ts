import { Injectable } from "@angular/core";

export type ToastTone = "info" | "warn" | "error";

@Injectable({
  providedIn: "root"
})
export class ToastService {
  message = "";
  tone: ToastTone = "info";
  visible = false;

  private timeoutId?: number;

  show(message: string, tone: ToastTone = "info"): void {
    this.message = message;
    this.tone = tone;
    this.visible = true;

    if (this.timeoutId !== undefined) {
      window.clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.visible = false;
    }, 5200);
  }
}
