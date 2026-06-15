import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

type ColorChannel = "red" | "green" | "blue";

@Component({
  selector: "app-input-color",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="input-color">
      <span class="color-title">{{ label }}</span>
      <div class="color-row">
        <input class="color-picker" type="color" [value]="hexValue" [disabled]="disabled" (input)="setHex($event)" />
        <label>
          <span>R</span>
          <input type="number" min="0" max="255" [disabled]="disabled" [ngModel]="red" (ngModelChange)="setChannel('red', $event)" />
        </label>
        <label>
          <span>G</span>
          <input type="number" min="0" max="255" [disabled]="disabled" [ngModel]="green" (ngModelChange)="setChannel('green', $event)" />
        </label>
        <label>
          <span>B</span>
          <input type="number" min="0" max="255" [disabled]="disabled" [ngModel]="blue" (ngModelChange)="setChannel('blue', $event)" />
        </label>
      </div>
    </div>
  `,
  styleUrl: "./input-color.component.scss"
})
export class InputColorComponent {
  @Input() label = "Color";
  @Input() red = "0";
  @Input() green = "0";
  @Input() blue = "0";
  @Input() disabled = false;
  @Output() redChange = new EventEmitter<string>();
  @Output() greenChange = new EventEmitter<string>();
  @Output() blueChange = new EventEmitter<string>();

  get hexValue(): string {
    return `#${this.toHex(this.red)}${this.toHex(this.green)}${this.toHex(this.blue)}`;
  }

  setHex(event: Event): void {
    const value = (event.target as HTMLInputElement).value.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(value)) {
      return;
    }

    this.emitChannel("red", String(Number.parseInt(value.slice(0, 2), 16)));
    this.emitChannel("green", String(Number.parseInt(value.slice(2, 4), 16)));
    this.emitChannel("blue", String(Number.parseInt(value.slice(4, 6), 16)));
  }

  setChannel(channel: ColorChannel, value: string | number): void {
    this.emitChannel(channel, String(this.clamp(value)));
  }

  private emitChannel(channel: ColorChannel, value: string): void {
    if (channel === "red" && value !== this.red) {
      this.red = value;
      this.redChange.emit(value);
      return;
    }
    if (channel === "green" && value !== this.green) {
      this.green = value;
      this.greenChange.emit(value);
      return;
    }
    if (channel === "blue" && value !== this.blue) {
      this.blue = value;
      this.blueChange.emit(value);
    }
  }

  private toHex(value: string): string {
    return this.clamp(value).toString(16).padStart(2, "0");
  }

  private clamp(value: string | number): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.min(255, Math.max(0, Math.trunc(numeric)));
  }
}
