import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { CompdataAdvancement, CompdataObject, CompdataProject, DbProject, CompdataCompetitionSummary } from "../../../shared/types";
import { AdvancementDisplayService } from "../../services/compdata/advancement-display.service";
import { AdvancementService, AdvancementValidationResult } from "../../services/compdata/advancement.service";
import { CompObjDisplayService } from "../../services/compdata/compobj-display.service";

@Component({
  selector: "app-tournament-advancement",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tse-panel" style="padding: 24px;">
      <header style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h2 style="margin: 0 0 8px 0; font-size: 20px;">Advancement</h2>
          <p style="margin: 0; color: var(--tse-text-muted);">Use this to decide where winners, runners-up or group positions go next.</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" (click)="autoGenerate()">Auto-generate</button>
          <button type="button" class="tse-primary" (click)="openAddModal()">Add rule</button>
          <button type="button" class="tse-danger-link" *ngIf="rules.length > 0" (click)="clearRules()">Clear rules</button>
        </div>
      </header>

      <div class="tse-stats-row" style="margin-bottom: 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
        <div class="tse-stat-card" style="padding: 16px; border: 1px solid var(--tse-border); border-radius: 6px;">
          <div style="font-size: 13px; color: var(--tse-text-muted); margin-bottom: 4px;">Rules</div>
          <div style="font-size: 24px; font-weight: 600;">{{ rules.length }}</div>
        </div>
      </div>

      <div *ngIf="rules.length === 0" class="tse-main-empty">
        <strong>No advancement rules configured yet</strong>
        <span>Add rules to define how teams move between phases.</span>
        <div>
          <button type="button" class="tse-primary" (click)="openAddModal()">Add rule manually</button>
          <button type="button" (click)="autoGenerate()">Auto-generate from structure</button>
        </div>
      </div>

      <div *ngIf="rules.length > 0" style="display: flex; flex-direction: column; gap: 12px;">
        <article *ngFor="let rule of rules; let i = index" style="padding: 16px; border: 1px solid var(--tse-border); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: var(--tse-bg-subtle);">
          <div>
            <div style="font-size: 15px; font-weight: 500; margin-bottom: 4px;">{{ describeRule(rule) }}</div>
            <div style="font-size: 12px; color: var(--tse-text-muted); font-family: monospace;">Raw line: {{ rule.fromGroupId }},{{ rule.fromPosition }},{{ rule.toGroupId }},{{ rule.toPosition }}</div>
            
            <div *ngIf="validations[i]?.errors?.length" style="color: var(--tse-danger); font-size: 12px; margin-top: 4px;">
              <div *ngFor="let err of validations[i].errors">⚠ {{ err }}</div>
            </div>
            <div *ngIf="validations[i]?.warnings?.length" style="color: var(--tse-warning); font-size: 12px; margin-top: 4px;">
              <div *ngFor="let warn of validations[i].warnings">⚠ {{ warn }}</div>
            </div>
          </div>
          <button type="button" class="tse-danger-link" (click)="deleteRule(i)" title="Delete rule">×</button>
        </article>
      </div>
    </div>

    <!-- Add Rule Modal -->
    <div class="tse-modal-backdrop" *ngIf="showAddModal">
      <section class="tse-modal tse-wizard">
        <header class="tse-modal-header">
          <div><h2 style="margin: 0; font-size: 18px;">Add advancement rule</h2></div>
          <button type="button" aria-label="Close" (click)="closeAddModal()">×</button>
        </header>
        <div class="tse-modal-body" style="display: flex; flex-direction: column; gap: 24px;">
          <div>
            <strong style="display: block; margin-bottom: 12px;">Step 1: Who moves?</strong>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
              <label class="tse-field">
                <span>From phase</span>
                <select [(ngModel)]="fromPhaseId" (ngModelChange)="onFromPhaseChange()">
                  <option [ngValue]="-1">Select a phase...</option>
                  <option *ngFor="let phase of phases" [ngValue]="phase.id">{{ display.objectName(phase, referenceProject, project) }}</option>
                </select>
              </label>
              <label class="tse-field">
                <span>From slot</span>
                <select [(ngModel)]="fromSlotId" [disabled]="fromPhaseId === -1">
                  <option [ngValue]="-1">Select a slot...</option>
                  <option *ngFor="let slot of fromSlots" [ngValue]="slot.id">{{ display.objectName(slot, referenceProject, project) }}</option>
                </select>
              </label>
              <label class="tse-field">
                <span>Position</span>
                <select [(ngModel)]="fromPosition">
                  <option [ngValue]="1">Winner / 1st place</option>
                  <option [ngValue]="2">Runner-up / 2nd place</option>
                  <option [ngValue]="3">3rd place</option>
                  <option [ngValue]="4">4th place</option>
                  <option [ngValue]="5">5th place</option>
                  <option [ngValue]="6">6th place</option>
                  <option [ngValue]="7">7th place</option>
                  <option [ngValue]="8">8th place</option>
                </select>
              </label>
            </div>
          </div>

          <div style="border-top: 1px solid var(--tse-border); margin: 0 -24px;"></div>

          <div>
            <strong style="display: block; margin-bottom: 12px;">Step 2: Where does it go?</strong>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
              <label class="tse-field">
                <span>To phase</span>
                <select [(ngModel)]="toPhaseId" (ngModelChange)="onToPhaseChange()">
                  <option [ngValue]="-1">Select a phase...</option>
                  <option *ngFor="let phase of phases" [ngValue]="phase.id">{{ display.objectName(phase, referenceProject, project) }}</option>
                </select>
              </label>
              <label class="tse-field">
                <span>To slot</span>
                <select [(ngModel)]="toSlotId" [disabled]="toPhaseId === -1">
                  <option [ngValue]="-1">Select a slot...</option>
                  <option *ngFor="let slot of toSlots" [ngValue]="slot.id">{{ display.objectName(slot, referenceProject, project) }}</option>
                </select>
              </label>
              <label class="tse-field">
                <span>Target position</span>
                <select [(ngModel)]="toPosition">
                  <option [ngValue]="1">Position 1</option>
                  <option [ngValue]="2">Position 2</option>
                  <option [ngValue]="3">Position 3</option>
                  <option [ngValue]="4">Position 4</option>
                </select>
              </label>
            </div>
          </div>
          
          <div *ngIf="fromSlotId !== -1 && toSlotId !== -1" style="padding: 16px; background: var(--tse-bg-subtle); border-radius: 6px;">
            <strong style="font-size: 13px; color: var(--tse-text-muted); display: block; margin-bottom: 4px;">Preview</strong>
            <div>{{ previewRule() }}</div>
          </div>
        </div>
        <footer class="tse-modal-actions">
          <button type="button" (click)="closeAddModal()">Cancel</button>
          <button type="button" class="tse-primary" [disabled]="!canAddRule" (click)="addRule()">Create rule</button>
        </footer>
      </section>
    </div>
  `
})
export class TournamentAdvancementComponent implements OnChanges {
  @Input({ required: true }) project!: CompdataProject;
  @Input() referenceProject?: DbProject;
  @Input({ required: true }) competition!: CompdataCompetitionSummary;
  @Output() structureChanged = new EventEmitter<void>();

  rules: CompdataAdvancement[] = [];
  validations: AdvancementValidationResult[] = [];
  
  phases: CompdataObject[] = [];
  
  showAddModal = false;
  fromPhaseId = -1;
  fromSlotId = -1;
  fromPosition = 1;
  fromSlots: CompdataObject[] = [];
  
  toPhaseId = -1;
  toSlotId = -1;
  toPosition = 1;
  toSlots: CompdataObject[] = [];

  constructor(
    public readonly display: CompObjDisplayService,
    private advDisplay: AdvancementDisplayService,
    private advService: AdvancementService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['competition'] || changes['project']) {
      this.loadData();
    }
  }

  loadData() {
    this.rules = this.advService.getRulesForCompetition(this.competition.id, this.project);
    this.validations = this.rules.map(r => this.advService.validateRule(r, this.project));
    
    // Load phases
    this.phases = this.project.objects.filter(o => o.parentId === this.competition.id && o.kind === 4).sort((a, b) => a.id - b.id);
  }

  describeRule(rule: CompdataAdvancement): string {
    return this.advDisplay.describeRule(rule, this.project, this.referenceProject);
  }

  deleteRule(index: number) {
    const ruleToRemove = this.rules[index];
    // Remove from the main project array
    const globalIndex = this.project.advancements.findIndex(r => 
      r.fromGroupId === ruleToRemove.fromGroupId &&
      r.fromPosition === ruleToRemove.fromPosition &&
      r.toGroupId === ruleToRemove.toGroupId &&
      r.toPosition === ruleToRemove.toPosition
    );
    if (globalIndex !== -1) {
      this.project.advancements.splice(globalIndex, 1);
    }
    
    this.loadData();
    this.structureChanged.emit();
  }

  clearRules() {
    if (!confirm("Are you sure you want to delete all advancement rules for this tournament?")) return;
    
    // Find rules belonging to this competition and remove them
    for (const rule of this.rules) {
      const globalIndex = this.project.advancements.findIndex(r => 
        r.fromGroupId === rule.fromGroupId &&
        r.fromPosition === rule.fromPosition &&
        r.toGroupId === rule.toGroupId &&
        r.toPosition === rule.toPosition
      );
      if (globalIndex !== -1) {
        this.project.advancements.splice(globalIndex, 1);
      }
    }
    
    this.loadData();
    this.structureChanged.emit();
  }

  autoGenerate() {
    if (this.rules.length > 0) {
      if (!confirm("This will add new generated rules to your existing ones. Continue?")) return;
    }
    const newRules = this.advService.autoGenerateKnockoutRules(this.phases, this.project);
    if (newRules.length === 0) {
      alert("No obvious knockout phase connections could be detected.");
      return;
    }
    
    this.project.advancements.push(...newRules);
    this.loadData();
    this.structureChanged.emit();
  }

  openAddModal() {
    this.fromPhaseId = -1;
    this.fromSlotId = -1;
    this.fromPosition = 1;
    this.fromSlots = [];
    
    this.toPhaseId = -1;
    this.toSlotId = -1;
    this.toPosition = 1;
    this.toSlots = [];
    
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  onFromPhaseChange() {
    this.fromSlotId = -1;
    this.fromSlots = this.project.objects.filter(o => o.parentId === this.fromPhaseId && o.kind === 5).sort((a, b) => a.id - b.id);
  }

  onToPhaseChange() {
    this.toSlotId = -1;
    this.toSlots = this.project.objects.filter(o => o.parentId === this.toPhaseId && o.kind === 5).sort((a, b) => a.id - b.id);
  }

  get canAddRule(): boolean {
    return this.fromSlotId !== -1 && this.toSlotId !== -1;
  }

  previewRule(): string {
    if (!this.canAddRule) return "";
    const mockRule: CompdataAdvancement = {
      fromGroupId: this.fromSlotId,
      fromPosition: this.fromPosition,
      toGroupId: this.toSlotId,
      toPosition: this.toPosition
    };
    return this.advDisplay.describeRule(mockRule, this.project, this.referenceProject);
  }

  addRule() {
    if (!this.canAddRule) return;
    
    const rule: CompdataAdvancement = {
      fromGroupId: this.fromSlotId,
      fromPosition: this.fromPosition,
      toGroupId: this.toSlotId,
      toPosition: this.toPosition
    };
    
    this.project.advancements.push(rule);
    this.loadData();
    this.structureChanged.emit();
    this.closeAddModal();
  }
}
