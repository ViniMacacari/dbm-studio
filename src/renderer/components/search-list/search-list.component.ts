import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";

export interface SearchListOption {
  value: string;
  label: string;
  meta?: string;
}

@Component({
  selector: "app-search-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-list" [class.open]="isOpen && filteredOptions.length > 0">
      <input
        type="search"
        autocomplete="off"
        spellcheck="false"
        [value]="displayValue"
        [placeholder]="placeholder"
        [disabled]="disabled"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
        (blur)="onBlur()"
      />

      <div class="search-list-panel" *ngIf="isOpen && filteredOptions.length > 0" role="listbox">
        <button
          *ngFor="let option of filteredOptions; let index = index; trackBy: trackByOption"
          type="button"
          role="option"
          [class.active]="index === activeIndex"
          (mousedown)="selectOption(option, $event)"
        >
          <span>{{ option.label }}</span>
          <small *ngIf="option.meta">{{ option.meta }}</small>
        </button>
      </div>
    </div>
  `
})
export class SearchListComponent implements OnChanges {
  @Input() value = "";
  @Input() options: SearchListOption[] = [];
  @Input() placeholder = "Search";
  @Input() disabled = false;
  @Input() maxResults = 40;
  @Output() valueChange = new EventEmitter<string>();

  displayValue = "";
  filteredOptions: SearchListOption[] = [];
  isOpen = false;
  activeIndex = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"] || changes["options"]) {
      this.syncDisplayValue();
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.displayValue = input.value;
    this.filteredOptions = this.filterOptions(input.value);
    this.activeIndex = 0;
    this.isOpen = input.value.trim().length > 0;
    if (!input.value.trim()) {
      this.emitValue("");
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen || this.filteredOptions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      this.activeIndex = Math.min(this.activeIndex + 1, this.filteredOptions.length - 1);
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      event.preventDefault();
      return;
    }

    if (event.key === "Enter") {
      this.choose(this.filteredOptions[this.activeIndex]);
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      this.closeAndRestore();
      event.preventDefault();
    }
  }

  onBlur(): void {
    window.setTimeout(() => this.closeAndRestore(), 120);
  }

  selectOption(option: SearchListOption, event: MouseEvent): void {
    event.preventDefault();
    this.choose(option);
  }

  trackByOption(_index: number, option: SearchListOption): string {
    return option.value;
  }

  private choose(option: SearchListOption | undefined): void {
    if (!option) {
      return;
    }
    this.displayValue = option.label;
    this.filteredOptions = [];
    this.isOpen = false;
    this.emitValue(option.value);
  }

  private closeAndRestore(): void {
    this.isOpen = false;
    this.filteredOptions = [];
    this.syncDisplayValue();
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

  private filterOptions(query: string): SearchListOption[] {
    const normalized = this.normalize(query);
    if (!normalized) {
      return [];
    }
    return this.options
      .filter((option) =>
        this.normalize(option.label).includes(normalized) ||
        this.normalize(option.value).includes(normalized) ||
        (option.meta ? this.normalize(option.meta).includes(normalized) : false)
      )
      .slice(0, this.maxResults);
  }

  private normalize(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  }
}
