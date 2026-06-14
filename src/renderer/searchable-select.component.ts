import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";

export interface SearchableOption {
  value: string;
  label: string;
  meta?: string;
}

let searchableSelectId = 0;

@Component({
  selector: "app-searchable-select",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="searchable-select">
      <input
        type="search"
        [value]="displayValue"
        [attr.list]="listId"
        [placeholder]="placeholder"
        [disabled]="disabled"
        (focus)="focused = true"
        (input)="onInput($event)"
        (change)="commitDisplayValue()"
        (blur)="onBlur()"
      />
      <datalist [id]="listId">
        <option *ngFor="let option of options; trackBy: trackByOption" [value]="option.label"></option>
      </datalist>
    </div>
  `
})
export class SearchableSelectComponent implements OnChanges {
  @Input() value = "";
  @Input() options: SearchableOption[] = [];
  @Input() placeholder = "Search";
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  readonly listId = `searchable-select-${++searchableSelectId}`;
  displayValue = "";
  focused = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"] || changes["options"]) {
      this.syncDisplayValue();
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.displayValue = input.value;
    const option = this.findOption(input.value);
    if (option) {
      this.emitValue(option.value);
    } else if (!input.value.trim()) {
      this.emitValue("");
    }
  }

  onBlur(): void {
    this.focused = false;
    this.commitDisplayValue();
  }

  commitDisplayValue(): void {
    const option = this.findOption(this.displayValue);
    if (option) {
      this.emitValue(option.value);
    }
    this.syncDisplayValue();
  }

  trackByOption(_index: number, option: SearchableOption): string {
    return option.value;
  }

  private syncDisplayValue(): void {
    const option = this.options.find((candidate) => candidate.value === this.value);
    this.displayValue = option?.label ?? this.value ?? "";
  }

  private emitValue(value: string): void {
    if (value !== this.value) {
      this.value = value;
      this.valueChange.emit(value);
    }
  }

  private findOption(input: string): SearchableOption | undefined {
    const normalized = this.normalize(input);
    if (!normalized) {
      return undefined;
    }
    return this.options.find((option) =>
      this.normalize(option.label) === normalized ||
      this.normalize(option.value) === normalized ||
      (option.meta ? this.normalize(option.meta) === normalized : false)
    );
  }

  private normalize(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  }
}
