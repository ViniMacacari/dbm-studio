import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { CompdataProject, DbProject } from "../../../shared/types";
import { InputListComponent, InputListOption } from "../../components/input-list/input-list.component";
import { CompObjDisplayService } from "../../services/compdata/compobj-display.service";
import { nations } from "../../../utils/get-nations/get-nations";

export interface CreateTournamentRequest {
  locationType: 0 | 1 | 2;
  locationId: number;
  internalCode: string;
  nameKey: string;
  customName?: string;
  template: "league" | "groupStage" | "cup" | "empty";
  leagueGroups?: number;
  leagueTeams?: number;
  groupStageGroups?: number;
  groupStageTeams?: number;
  cupInitialTeams?: number;
  initialTeams?: string[];
}

@Component({
  selector: "app-create-tournament-wizard",
  standalone: true,
  imports: [CommonModule, FormsModule, InputListComponent],
  template: `
    <div class="tse-modal-backdrop">
      <section class="tse-modal tse-wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <header class="tse-modal-header"><div><span>Step {{ step }} of 5</span><h2 id="wizard-title">{{ stepTitle }}</h2></div><button type="button" aria-label="Close" (click)="cancel.emit()">×</button></header>
        <div class="tse-step-track"><span *ngFor="let item of [1,2,3,4,5]" [class.active]="item <= step"></span></div>
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
              <div class="tse-selected-location" *ngIf="selectedParentName">
                <span>Selected</span><strong>{{ selectedParentName }}</strong>
                <small *ngIf="locationType === 2" [class.tse-warning]="willCreateCountry" [class.tse-success]="!willCreateCountry" style="display: block; margin-top: 4px;">
                  {{ willCreateCountry ? 'Will be added to compobj' : 'Already in compobj' }}
                </small>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 2">
            <p>Define the tournament ID and name.</p>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
              <label class="tse-field"><span>Tournament ID <span title="This is not the compobj objectId. The compobj objectId is generated automatically.">ⓘ</span></span><input type="number" min="1" [(ngModel)]="tournamentId" (ngModelChange)="onTournamentIdChange()" /></label>
              <label class="tse-field"><span>Tournament Name</span><input type="text" [(ngModel)]="customName" placeholder="e.g. Copa Inter. Masculina" /></label>
            </div>
            <div class="tse-field-error" *ngIf="isCodeAlreadyUsed" style="color: var(--tse-danger); font-size: 13px; margin-top: -12px; margin-bottom: 16px;">This tournament ID is already used by another competition.</div>
            
            <div class="tse-resolved">
              <small>Localization Key (Fixed):</small>
              <div style="margin-top: 4px; font-family: monospace;"><strong>{{ nameKey }}</strong></div>
              <ng-container *ngIf="nameKeyFound">
                <small style="display: block; margin-top: 8px;">Current name in language files:</small>
                <div style="margin-top: 4px; color: var(--tse-text-muted);"><strong>{{ resolvedName }}</strong></div>
              </ng-container>
            </div>

            <details class="tse-technical" style="margin-top: 16px;">
              <summary>Show advanced fields</summary>
              <label class="tse-field"><span>Internal code</span><input [(ngModel)]="internalCode" /></label>
            </details>
          </ng-container>

          <ng-container *ngIf="step === 3">
            <p>Choose the tournament structure.</p>
            <div class="tse-template-grid">
              <button type="button" [class.active]="template === 'league'" (click)="template = 'league'"><strong>League</strong><span>Best for points-table competitions.</span><small>League Phase<br />↳ Group 1</small></button>
              <button type="button" [class.active]="template === 'groupStage'" (click)="template = 'groupStage'"><strong>Group Stage</strong><span>Multiple groups of teams.</span><small>Group Phase<br />↳ Group 1-8</small></button>
              <button type="button" [class.active]="template === 'cup'" (click)="template = 'cup'"><strong>Simple Cup</strong><span>Best for basic knockout cups.</span><small>Team Setup Phase<br />First Round<br />Quarter Finals<br />Semi Finals<br />Final</small></button>
              <button type="button" [class.active]="template === 'empty'" (click)="template = 'empty'"><strong>Empty</strong><span>Create only the tournament and add phases manually.</span><small>No phases yet.</small></button>
            </div>
            <div *ngIf="template === 'league'" class="tse-template-settings" style="margin-top: 16px;">
              <strong>League settings</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px;">
                <label class="tse-field"><span>Number of groups</span><input type="number" min="1" [(ngModel)]="leagueGroups" /></label>
                <label class="tse-field"><span>Teams per group</span><input type="number" min="2" [(ngModel)]="leagueTeams" /></label>
              </div>
            </div>
            <div *ngIf="template === 'groupStage'" class="tse-template-settings" style="margin-top: 16px;">
              <strong>Group Stage settings</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px;">
                <label class="tse-field"><span>Number of groups</span><input type="number" min="1" [(ngModel)]="groupStageGroups" /></label>
                <label class="tse-field"><span>Teams per group</span><input type="number" min="2" [(ngModel)]="groupStageTeams" /></label>
              </div>
            </div>
            <div *ngIf="template === 'cup'" class="tse-template-settings" style="margin-top: 16px;">
              <strong>Cup settings</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px;">
                <label class="tse-field"><span>Initial teams</span><input type="number" min="2" [(ngModel)]="cupInitialTeams" /></label>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 4">
            <p>You can add initial teams now or leave this empty and configure them later.</p>
            <div class="tse-choice-grid">
              <button type="button" [class.active]="teamsChoice === 'skip'" (click)="teamsChoice = 'skip'"><strong>Skip for now</strong><span>Don't add teams yet.</span></button>
              <button type="button" [class.active]="teamsChoice === 'paste'" (click)="teamsChoice = 'paste'"><strong>Paste team IDs</strong><span>Paste a list of Team IDs.</span></button>
            </div>
            
            <div class="tse-template-settings" *ngIf="teamsChoice === 'paste'" style="margin-top: 16px;">
              <strong>Paste Team IDs</strong>
              <div style="margin-top: 8px;">
                <label class="tse-field"><textarea [(ngModel)]="pastedTeamIds" rows="5" placeholder="191&#10;254&#10;111821" style="width: 100%; resize: vertical; font-family: monospace;"></textarea></label>
                <small class="tse-entity-note">Enter one Team ID per line or comma-separated.</small>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 5">
            <div class="tse-review">
              <div><span>Tournament ID</span><strong>{{ tournamentId }}</strong></div>
              <div><span>Generated internal code</span><strong>{{ internalCode }}</strong></div>
              <div><span>Tournament Name</span><strong>{{ customName || 'None' }}</strong></div>
              <div><span>Localization key</span><strong>{{ nameKey }}</strong></div>
              <div>
                <span>Belongs to</span>
                <strong>{{ selectedParentName }}</strong>
                <small *ngIf="locationType === 2" style="display: block; opacity: 0.8; margin-top: 4px;">
                  Status: {{ willCreateCountry ? selectedParentName + ' will be added to compobj' : selectedParentName + ' already exists in compobj with objectId ' + (existingCountry?.id || '') }}
                </small>
              </div>
              <div><span>Structure</span><ul><li *ngFor="let phase of templatePhases">{{ phase }}</li><li *ngIf="!templatePhases.length">No phases yet</li></ul></div>
            </div>
            <details class="tse-technical">
              <summary>Show generated lines</summary>
              <div style="margin-bottom: 8px; font-weight: 500;">Generated compobj lines:</div>
              <code *ngFor="let line of generatedLines">{{ line }}</code>
              <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">Generated compids line:</div>
              <code>{{ generatedCompidsLine }}</code>
              <ng-container *ngIf="generatedStandingsLines.length">
                <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">Generated standings lines:</div>
                <code *ngFor="let line of generatedStandingsLines">{{ line }}</code>
              </ng-container>
              <ng-container *ngIf="generatedInitTeamsLines.length">
                <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">Generated initteams lines:</div>
                <code *ngFor="let line of generatedInitTeamsLines">{{ line }}</code>
              </ng-container>
            </details>
          </ng-container>
        </div>
        <footer class="tse-modal-actions"><button type="button" (click)="cancel.emit()">Cancel</button><button type="button" *ngIf="step > 1" (click)="step = step - 1">Back</button><button type="button" class="tse-primary" *ngIf="step < 5" [disabled]="!canContinue" (click)="step = step + 1">Continue</button><button type="button" class="tse-primary" *ngIf="step === 5" (click)="submit()">Create tournament</button></footer>
      </section>
    </div>
  `
})
export class CreateTournamentWizardComponent implements OnInit {
  @Input({ required: true }) project!: CompdataProject;
  @Input() reference?: DbProject;
  @Output() create = new EventEmitter<CreateTournamentRequest>();
  @Output() cancel = new EventEmitter<void>();

  step = 1;
  locationType?: 0 | 1 | 2;
  parentId = -1;
  selectedLocationValue = "";
  locationPickerOptions: InputListOption[] = [];
  tournamentId: number | null = null;
  nameKey = "";
  customName = "";
  internalCode = "";
  template: "league" | "groupStage" | "cup" | "empty" = "league";
  leagueGroups = 1;
  leagueTeams = 20;
  groupStageGroups = 8;
  groupStageTeams = 4;
  cupInitialTeams = 16;
  teamsChoice: "skip" | "paste" = "skip";
  pastedTeamIds = "";
  constructor(public readonly display: CompObjDisplayService) {}

  ngOnInit() {
    this.tournamentId = this.suggestedTournamentId;
    this.onTournamentIdChange();
  }

  get suggestedTournamentId(): number {
    let max = 0;
    this.project.objects.forEach((obj) => {
      if (obj.kind === 3) {
        const cMatch = /^C(\d+)$/i.exec(obj.shortName);
        if (cMatch && Number(cMatch[1]) > max) max = Number(cMatch[1]);
        const tMatch = /^TrophyName_Abbr15_(\d+)$/i.exec(obj.description);
        if (tMatch && Number(tMatch[1]) > max) max = Number(tMatch[1]);
      }
    });
    return max > 0 ? max + 1 : 1;
  }

  onTournamentIdChange() {
    if (this.tournamentId !== null && this.tournamentId > 0) {
      this.internalCode = `C${this.tournamentId}`;
      this.nameKey = `TrophyName_Abbr15_${this.tournamentId}`;
    } else {
      this.internalCode = "";
      this.nameKey = "";
    }
  }

  get isCodeAlreadyUsed(): boolean {
    const c = this.internalCode.trim().toLowerCase();
    const t = this.nameKey.trim().toLowerCase();
    if (!c || !t) return false;
    return this.project.objects.some((obj) => 
      obj.kind === 3 && (obj.shortName.toLowerCase() === c || obj.description.toLowerCase() === t)
    );
  }

  get stepTitle(): string { return ["", "Where does this tournament belong?", "Tournament information", "Choose the tournament structure", "Choose initial teams", "Review"][this.step]; }
  get locationTypeLabel(): string { return this.locationType === 2 ? "Country" : this.locationType === 1 ? "Confederation" : "World/FIFA"; }
  get locationPickerPlaceholder(): string { return `Choose ${this.locationType === 2 ? "a country" : this.locationType === 1 ? "a confederation" : "World/FIFA"}...`; }
  get locationSearchPlaceholder(): string { return `Search ${this.locationType === 2 ? "countries" : this.locationType === 1 ? "confederations" : "World/FIFA"}...`; }
  get locationEmptyText(): string { return `No ${this.locationType === 2 ? "countries" : this.locationType === 1 ? "confederations" : "World/FIFA objects"} were found in compobj.txt.`; }
  get selectedParentName(): string {
    if (this.parentId >= 0) {
      if (this.locationType === 2) return nations.find((n) => n.id === this.parentId)?.name || "";
      return this.display.objectName(this.display.object(this.project, this.parentId), this.reference, this.project);
    }
    return "";
  }
  get nameKeyFound(): boolean { return this.display.hasResolvedText(this.reference, this.nameKey); }
  get resolvedName(): string { return this.nameKeyFound ? this.display.resolvedText(this.reference, this.nameKey) : (this.nameKey || "Unnamed tournament"); }
  get canContinue(): boolean {
    if (this.step === 1) {
      if (this.locationType === 2) return nations.some((n) => n.id === this.parentId);
      const parent = this.display.object(this.project, this.parentId);
      return Boolean(parent && parent.kind === this.locationType && parent.kind >= 0 && parent.kind <= 2);
    }
    if (this.step === 2) return Boolean(this.tournamentId && this.tournamentId > 0 && this.nameKey.trim() && this.internalCode.trim() && !this.isCodeAlreadyUsed);
    if (this.step === 4) return this.teamsChoice === 'skip' || (this.teamsChoice === 'paste' && Boolean(this.pastedTeamIds.trim()));
    return true;
  }
  get existingCountry() {
    if (this.locationType !== 2) return undefined;
    const targetDesc = `NationName_${this.parentId}`.toLowerCase();
    return this.project.objects.find(obj => obj.kind === 2 && obj.description.toLowerCase() === targetDesc);
  }

  get willCreateCountry(): boolean {
    return this.locationType === 2 && !this.existingCountry;
  }

  get inferredConfederationObjectId(): number {
    return 0; // Fallback to World/FIFA since we don't have confederation in the constant
  }

  get generatedCountryShortCode(): string {
    const nation = nations.find(n => n.id === this.parentId);
    return nation ? nation.name.substring(0, 4).toUpperCase() : "UNKN";
  }

  get templatePhases(): string[] {
    if (this.template === "league") return [`League Phase (${this.leagueGroups} group(s), ${this.leagueTeams} teams/pos)`];
    if (this.template === "groupStage") return [`Group Phase (${this.groupStageGroups} group(s), ${this.groupStageTeams} teams/pos)`];
    if (this.template === "cup") {
      const p = [`Participant Setup (1 group, ${this.cupInitialTeams} teams/pos)`];
      if (this.cupInitialTeams >= 16) p.push("Round of 16 (8 slots, 2 teams/pos)");
      if (this.cupInitialTeams >= 8) p.push("Quarter Finals (4 slots, 2 teams/pos)");
      if (this.cupInitialTeams >= 4) p.push("Semi Finals (2 slots, 2 teams/pos)");
      if (this.cupInitialTeams >= 2) p.push("Final (1 slot, 2 teams/pos)");
      return p;
    }
    return [];
  }
  
  get generatedLines(): string[] {
    let id = Math.max(0, ...this.project.objects.map((object) => object.id));
    const lines: string[] = [];
    let resolvedParentId = this.parentId;
    
    if (this.locationType === 2) {
      if (this.willCreateCountry) {
        id++;
        resolvedParentId = id;
        lines.push(`${id},2,${this.generatedCountryShortCode},NationName_${this.parentId},${this.inferredConfederationObjectId}`);
      } else {
        resolvedParentId = this.existingCountry!.id;
      }
    }
    
    id++;
    const compId = id;
    lines.push(`${id},3,${this.internalCode},${this.nameKey},${resolvedParentId}`);
    
    if (this.template === "league") {
      id++;
      const phaseId = id;
      lines.push(`${phaseId},4,S1,FCE_League_Stage,${compId}`);
      for (let i = 0; i < this.leagueGroups; i++) {
        lines.push(`${++id},5,G${i + 1},,${phaseId}`);
      }
    } else if (this.template === "groupStage") {
      id++;
      const phaseId = id;
      lines.push(`${phaseId},4,S1,FCE_Group_Stage,${compId}`);
      for (let i = 0; i < this.groupStageGroups; i++) {
        lines.push(`${++id},5,G${i + 1},,${phaseId}`);
      }
    } else if (this.template === "cup") {
      const phasesToCreate: Array<{key: string, slots: number}> = [{ key: "FCE_Setup_Stage", slots: 1 }];
      if (this.cupInitialTeams >= 16) phasesToCreate.push({ key: "FCE_Round_1", slots: 8 });
      if (this.cupInitialTeams >= 8) phasesToCreate.push({ key: "FCE_Quarter_Finals", slots: 4 });
      if (this.cupInitialTeams >= 4) phasesToCreate.push({ key: "FCE_Semi_Finals", slots: 2 });
      if (this.cupInitialTeams >= 2) phasesToCreate.push({ key: "FCE_Final", slots: 1 });
      
      phasesToCreate.forEach((phase, index) => {
        id++;
        const phaseId = id;
        lines.push(`${phaseId},4,S${index + 1},${phase.key},${compId}`);
        for (let i = 0; i < phase.slots; i++) {
          lines.push(`${++id},5,G${i + 1},,${phaseId}`);
        }
      });
    }
    return lines;
  }

  get generatedStandingsLines(): string[] {
    let id = Math.max(0, ...this.project.objects.map((object) => object.id));
    if (this.locationType === 2 && this.willCreateCountry) id++;
    id++; // compId
    const lines: string[] = [];
    if (this.template === "league") {
      id++; // phaseId
      for (let i = 0; i < this.leagueGroups; i++) {
        id++; // groupId
        for (let t = 0; t < this.leagueTeams; t++) {
          lines.push(`${id},${t}`);
        }
      }
    } else if (this.template === "groupStage") {
      id++; // phaseId
      for (let i = 0; i < this.groupStageGroups; i++) {
        id++; // groupId
        for (let t = 0; t < this.groupStageTeams; t++) {
          lines.push(`${id},${t}`);
        }
      }
    } else if (this.template === "cup") {
      const phasesToCreate: Array<{key: string, slots: number, teamsPerSlot: number}> = [
        { key: "FCE_Setup_Stage", slots: 1, teamsPerSlot: this.cupInitialTeams }
      ];
      if (this.cupInitialTeams >= 16) phasesToCreate.push({ key: "FCE_Round_1", slots: 8, teamsPerSlot: 2 });
      if (this.cupInitialTeams >= 8) phasesToCreate.push({ key: "FCE_Quarter_Finals", slots: 4, teamsPerSlot: 2 });
      if (this.cupInitialTeams >= 4) phasesToCreate.push({ key: "FCE_Semi_Finals", slots: 2, teamsPerSlot: 2 });
      if (this.cupInitialTeams >= 2) phasesToCreate.push({ key: "FCE_Final", slots: 1, teamsPerSlot: 2 });

      phasesToCreate.forEach(phase => {
        id++; // phaseId
        for (let i = 0; i < phase.slots; i++) {
          id++; // groupId
          for (let t = 0; t < phase.teamsPerSlot; t++) {
            lines.push(`${id},${t}`);
          }
        }
      });
    }
    return lines;
  }

  get generatedCompidsLine(): string {
    let id = Math.max(0, ...this.project.objects.map((object) => object.id));
    if (this.locationType === 2 && this.willCreateCountry) {
      id++; // For the new Country
    }
    id++; // For the new Competition
    return String(id);
  }

  get generatedInitTeamsLines(): string[] {
    if (this.teamsChoice !== 'paste' || !this.pastedTeamIds.trim()) return [];
    
    let id = Math.max(0, ...this.project.objects.map((object) => object.id));
    if (this.locationType === 2 && this.willCreateCountry) id++;
    id++; // compId
    
    const lines: string[] = [];
    const rawIds = this.pastedTeamIds.split(/[\n,]/).map(s => s.trim()).filter(s => s);
    rawIds.forEach((tid, i) => {
      lines.push(`${id},${i},${tid}`);
    });
    return lines;
  }

  chooseLocationType(type: 0 | 1 | 2): void {
    if (this.locationType === type && this.locationPickerOptions.length > 0) return;
    this.locationType = type;
    this.parentId = -1;
    this.selectedLocationValue = "";
    
    if (type === 2) {
      this.locationPickerOptions = nations.map((nation) => {
        const targetDesc = `NationName_${nation.id}`.toLowerCase();
        const exists = this.project.objects.some(obj => obj.kind === 2 && obj.description.toLowerCase() === targetDesc);
        return {
          value: String(nation.id),
          label: nation.name,
          detail: `Country · nationid ${nation.id} · ${exists ? 'Existing in compobj' : 'Available from nations'}`,
          searchText: `${nation.name} ${nation.id}`
        };
      });
    } else {
      this.locationPickerOptions = this.project.objects
        .filter((object) => object.kind === type)
        .map((object) => {
          const label = this.display.objectName(object, this.reference, this.project);
          const typeName = type === 1 ? "Confederation" : "World/FIFA";
          return {
            value: String(object.id),
            label,
            detail: `${typeName} · ${object.shortName || "no code"} · objectId ${object.id}`,
            searchText: `${object.description} ${object.shortName} ${object.id}`
          };
        });
    }
  }

  selectLocation(value: string): void {
    const id = Number(value);
    if (this.locationType === 2) {
      const nation = nations.find((n) => n.id === id);
      if (!nation) return;
      this.parentId = id;
      this.selectedLocationValue = value;
      return;
    }
    const parent = this.display.object(this.project, id);
    if (!parent || parent.kind !== this.locationType || parent.kind < 0 || parent.kind > 2) return;
    this.parentId = id;
    this.selectedLocationValue = value;
  }

  submit(): void {
    if (this.locationType === 2) {
      const nation = nations.find((n) => n.id === this.parentId);
      if (!nation) return;
      this.create.emit({ 
        locationType: this.locationType,
        locationId: nation.id,
        internalCode: this.internalCode.trim(), 
        nameKey: this.nameKey.trim(), 
        template: this.template,
        leagueGroups: this.leagueGroups,
        leagueTeams: this.leagueTeams,
        groupStageGroups: this.groupStageGroups,
        groupStageTeams: this.groupStageTeams,
        cupInitialTeams: this.cupInitialTeams,
        initialTeams: this.teamsChoice === 'paste' ? this.pastedTeamIds.split(/[\n,]/).map(s => s.trim()).filter(s => s) : []
      });
      return;
    }
    const parent = this.display.object(this.project, this.parentId);
    if (!parent || parent.kind !== this.locationType || parent.kind < 0 || parent.kind > 2) return;
    this.create.emit({ 
      locationType: this.locationType,
      locationId: this.parentId,
      internalCode: this.internalCode.trim(), 
      nameKey: this.nameKey.trim(), 
      customName: this.customName.trim(),
      template: this.template,
      leagueGroups: this.leagueGroups,
      leagueTeams: this.leagueTeams,
      groupStageGroups: this.groupStageGroups,
      groupStageTeams: this.groupStageTeams,
      cupInitialTeams: this.cupInitialTeams,
      initialTeams: this.teamsChoice === 'paste' ? this.pastedTeamIds.split(/[\n,]/).map(s => s.trim()).filter(s => s) : []
    });
  }
}
