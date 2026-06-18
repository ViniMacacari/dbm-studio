import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ElementRef, HostListener } from "@angular/core";

export interface InputListOption {
  value: string;
  label: string;
}

@Component({
  selector: "app-input-list",
  standalone: true,
  imports: [CommonModule],
  styleUrl: "./input-list.component.scss",
  template: `
    <div class="input-list-container" [class.open]="isOpen" [class.disabled]="disabled">
      <div 
        class="input-list-trigger" 
        (click)="toggleOpen($event)" 
        tabindex="0"
        (keydown)="onKeydown($event)"
      >
        <span class="trigger-value">{{ displayLabel || placeholder }}</span>
        <span class="trigger-arrow"></span>
      </div>

      <div class="input-list-dropdown" *ngIf="isOpen" role="listbox">
        <button
          *ngFor="let option of options; let index = index; trackBy: trackByOption"
          type="button"
          role="option"
          [class.active]="option.value === value"
          (mousedown)="selectOption(option, $event)"
        >
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>
  `
})
export class InputListComponent implements OnChanges {
  @Input() value = "";
  @Input() options: InputListOption[] = [];
  @Input() placeholder = "Select option";
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();

  displayLabel = "";
  isOpen = false;

  constructor(private readonly elementRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["value"] || changes["options"]) {
      this.syncDisplayLabel();
    }
  }

  toggleOpen(event: MouseEvent): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      this.isOpen = !this.isOpen;
      event.preventDefault();
    } else if (event.key === "Escape") {
      this.isOpen = false;
      event.preventDefault();
    }
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  selectOption(option: InputListOption, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.value = option.value;
    this.displayLabel = option.label;
    this.isOpen = false;
    this.valueChange.emit(option.value);
  }

  trackByOption(_index: number, option: InputListOption): string {
    return option.value;
  }

  private syncDisplayLabel(): void {
    const matched = this.options.find(opt => opt.value === this.value);
    this.displayLabel = matched ? matched.label : this.value;
  }
}
