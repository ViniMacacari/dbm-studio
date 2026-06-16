import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

let nextInputCheckboxId = 0;

@Component({
  selector: "app-input-checkbox",
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="input-checkbox" [class.disabled]="disabled">
      <input
        class="checkbox-native"
        type="checkbox"
        [checked]="checked"
        [disabled]="disabled"
        [attr.aria-describedby]="description ? descriptionId : null"
        (change)="onCheckedChange($event)"
      />
      <span class="checkbox-box" aria-hidden="true"></span>
      <span class="checkbox-copy">
        <span class="checkbox-label">{{ label }}</span>
        <small *ngIf="description" [id]="descriptionId">{{ description }}</small>
      </span>
    </label>
  `,
  styleUrl: "./input-checkbox.component.scss"
})
export class InputCheckboxComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() label = "Checkbox";
  @Input() description = "";
  @Output() checkedChange = new EventEmitter<boolean>();

  readonly descriptionId = `input-checkbox-description-${nextInputCheckboxId++}`;

  onCheckedChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked !== this.checked) {
      this.checked = checked;
      this.checkedChange.emit(checked);
    }
  }
}
