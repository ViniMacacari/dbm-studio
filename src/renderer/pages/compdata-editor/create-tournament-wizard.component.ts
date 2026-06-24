import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { CompdataProject, DbProject } from "../../../shared/types";
import { InputListComponent, InputListOption } from "../../components/input-list/input-list.component";
import { CompObjDisplayService } from "../../services/compdata/compobj-display.service";

export interface CreateTournamentRequest {
  parentId: number;
  internalCode: string;
  nameKey: string;
  template: "league" | "cup" | "empty";
}

@Component({
  selector: "app-create-tournament-wizard",
  standalone: true,
  imports: [CommonModule, FormsModule, InputListComponent],
  template: `
    <div class="tse-modal-backdrop">
      <section class="tse-modal tse-wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <header class="tse-modal-header"><div><span>Step {{ step }} of 4</span><h2 id="wizard-title">{{ stepTitle }}</h2></div><button type="button" aria-label="Close" (click)="cancel.emit()">×</button></header>
        <div class="tse-step-track"><span *ngFor="let item of [1,2,3,4]" [class.active]="item <= step"></span></div>
        <div class="tse-modal-body">
          <ng-container *ngIf="step === 1">
            <p>Choose where this tournament will be placed in the compobj structure.</p>
            <div class="tse-choice-grid">
              <button type="button" [class.active]="locationType === 2" (click)="chooseLocationType(2)"><strong>Country</strong><span>For national leagues and cups.</span></button>
              <button type="button" [class.active]="locationType === 1" (click)="chooseLocationType(1)"><strong>Confederation</strong><span>For continental tournaments.</span></button>
              <button type="button" [class.active]="locationType === 0" (click)="chooseLocationType(0)"><strong>World/FIFA</strong><span>For international or world tournaments.</span></button>
            </div>
            <div class="tse-field tse-location-picker" *ngIf="locationType !== undefined">
              <span>Selected type: {{ locationTypeLabel }}</span>
              <app-input-list
                [value]="selectedLocationValue"
                [options]="locationPickerOptions"
                [placeholder]="locationPickerPlaceholder"
                [searchable]="true"
                [searchPlaceholder]="locationSearchPlaceholder"
                [emptyText]="locationEmptyText"
                [inlineDropdown]="true"
                (valueChange)="selectLocation($event)"
              ></app-input-list>
              <div class="tse-selected-location" *ngIf="selectedParentName"><span>Selected</span><strong>{{ selectedParentName }}</strong></div>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 2">
            <p>Choose the localization key and internal short code used by the game.</p>
            <label class="tse-field"><span>Name key</span><input [(ngModel)]="nameKey" placeholder="TrophyName_Abbr15_999" /></label>
            <div class="tse-resolved" *ngIf="nameKey"><span>Resolved name</span><strong>{{ resolvedName }}</strong><small *ngIf="reference && !nameKeyFound">This localization key was not found in the loaded language files. You can still use it, but the game may not display a translated name.</small><small *ngIf="!reference">Translated names are not loaded, so this key cannot be checked yet.</small></div>
            <label class="tse-field"><span>Internal code</span><input [(ngModel)]="internalCode" placeholder="C999" /></label>
          </ng-container>

          <ng-container *ngIf="step === 3">
            <p>Choose the tournament structure.</p>
            <div class="tse-template-grid">
              <button type="button" [class.active]="template === 'league'" (click)="template = 'league'"><strong>League</strong><span>Best for points-table competitions.</span><small>League Phase<br />↳ Group 1</small></button>
              <button type="button" [class.active]="template === 'cup'" (click)="template = 'cup'"><strong>Simple Cup</strong><span>Best for basic knockout cups.</span><small>Team Setup Phase<br />First Round<br />Quarter Finals<br />Semi Finals<br />Final</small></button>
              <button type="button" [class.active]="template === 'empty'" (click)="template = 'empty'"><strong>Empty</strong><span>Create only the tournament and add phases manually.</span><small>No phases yet.</small></button>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 4">
            <div class="tse-review"><div><span>Tournament</span><strong>{{ resolvedName }}</strong></div><div><span>Belongs to</span><strong>{{ selectedParentName }}</strong></div><div><span>Structure</span><ul><li *ngFor="let phase of templatePhases">{{ phase }}</li><li *ngIf="!templatePhases.length">No phases yet</li></ul></div></div>
            <details class="tse-technical"><summary>Show generated compobj lines</summary><code *ngFor="let line of generatedLines">{{ line }}</code></details>
          </ng-container>
        </div>
        <footer class="tse-modal-actions"><button type="button" (click)="cancel.emit()">Cancel</button><button type="button" *ngIf="step > 1" (click)="step = step - 1">Back</button><button type="button" class="tse-primary" *ngIf="step < 4" [disabled]="!canContinue" (click)="step = step + 1">Continue</button><button type="button" class="tse-primary" *ngIf="step === 4" (click)="submit()">Create tournament</button></footer>
      </section>
    </div>
  `
})
export class CreateTournamentWizardComponent {
  @Input({ required: true }) project!: CompdataProject;
  @Input() reference?: DbProject;
  @Output() create = new EventEmitter<CreateTournamentRequest>();
  @Output() cancel = new EventEmitter<void>();

  step = 1;
  locationType?: 0 | 1 | 2;
  parentId = -1;
  selectedLocationValue = "";
  locationPickerOptions: InputListOption[] = [];
  nameKey = "";
  internalCode = "";
  template: "league" | "cup" | "empty" = "league";
  constructor(public readonly display: CompObjDisplayService) {}

  get stepTitle(): string { return ["", "Where does this tournament belong?", "Tournament information", "Choose the tournament structure", "Review"][this.step]; }
  get locationTypeLabel(): string { return this.locationType === 2 ? "Country" : this.locationType === 1 ? "Confederation" : "World/FIFA"; }
  get locationPickerPlaceholder(): string { return `Choose ${this.locationType === 2 ? "a country" : this.locationType === 1 ? "a confederation" : "World/FIFA"}...`; }
  get locationSearchPlaceholder(): string { return `Search ${this.locationType === 2 ? "countries" : this.locationType === 1 ? "confederations" : "World/FIFA"}...`; }
  get locationEmptyText(): string { return `No ${this.locationType === 2 ? "countries" : this.locationType === 1 ? "confederations" : "World/FIFA objects"} were found in compobj.txt.`; }
  get selectedParentName(): string { return this.parentId >= 0 ? this.display.objectName(this.display.object(this.project, this.parentId), this.reference, this.project) : ""; }
  get nameKeyFound(): boolean { return this.display.hasResolvedText(this.reference, this.nameKey); }
  get resolvedName(): string { return this.nameKeyFound ? this.display.resolvedText(this.reference, this.nameKey) : (this.nameKey || "Unnamed tournament"); }
  get canContinue(): boolean {
    if (this.step === 1) {
      const parent = this.display.object(this.project, this.parentId);
      return Boolean(parent && parent.kind === this.locationType && parent.kind >= 0 && parent.kind <= 2);
    }
    return this.step === 2 ? Boolean(this.nameKey.trim() && this.internalCode.trim()) : true;
  }
  get templatePhases(): string[] { return this.template === "league" ? ["League Phase"] : this.template === "cup" ? ["Team Setup Phase", "First Round", "Quarter Finals", "Semi Finals", "Final"] : []; }
  get generatedLines(): string[] {
    let id = Math.max(0, ...this.project.objects.map((object) => object.id)) + 1;
    const lines = [`${id},3,${this.internalCode},${this.nameKey},${this.parentId}`];
    if (this.template === "league") lines.push(`${++id},4,S1,FCE_League_Stage,${id - 1}`, `${++id},5,G1,,${id - 1}`);
    if (this.template === "cup") ["FCE_Setup_Stage", "FCE_Round_1", "FCE_Quarter_Finals", "FCE_Semi_Finals", "FCE_Final"].forEach((key, index) => lines.push(`${++id},4,S${index + 1},${key},${lines[0].split(",")[0]}`));
    return lines;
  }

  chooseLocationType(type: 0 | 1 | 2): void {
    if (this.locationType === type && this.locationPickerOptions.length > 0) return;
    this.locationType = type;
    this.parentId = -1;
    this.selectedLocationValue = "";
    this.locationPickerOptions = this.project.objects
      .filter((object) => object.kind === type)
      .map((object) => {
        const label = this.display.objectName(object, this.reference, this.project);
        const typeName = type === 2 ? "Country" : type === 1 ? "Confederation" : "World/FIFA";
        return {
          value: String(object.id),
          label,
          detail: `${typeName} · ${object.shortName || "no code"} · objectId ${object.id}`,
          searchText: `${object.description} ${object.shortName} ${object.id}`
        };
      });
  }

  selectLocation(value: string): void {
    const id = Number(value);
    const parent = this.display.object(this.project, id);
    if (!parent || parent.kind !== this.locationType || parent.kind < 0 || parent.kind > 2) return;
    this.parentId = id;
    this.selectedLocationValue = value;
  }

  submit(): void {
    const parent = this.display.object(this.project, this.parentId);
    if (!parent || parent.kind !== this.locationType || parent.kind < 0 || parent.kind > 2) return;
    this.create.emit({ parentId: parent.id, internalCode: this.internalCode.trim(), nameKey: this.nameKey.trim(), template: this.template });
  }
}
