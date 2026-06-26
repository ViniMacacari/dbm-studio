import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { CompdataProject, DbProject } from "../../../shared/types";
import { InputListComponent, InputListOption } from "../../components/input-list/input-list.component";
import { CompObjDisplayService } from "../../services/compdata/compobj-display.service";
import { TeamEditorService } from "../../services/team-editor.service";
import { AdvancementService } from "../../services/compdata/advancement.service";
import { AdvancementDisplayService } from "../../services/compdata/advancement-display.service";
import { ScheduleDateService } from "../../services/compdata/schedule-date.service";
import { WeatherDisplayService } from "../../services/compdata/weather-display.service";
import { WeatherPresetKey, WeatherService } from "../../services/compdata/weather.service";
import type { TeamSearchResult } from "../../services/team-editor.service";
import type { CompdataAdvancement, CompdataObject } from "../../../shared/types";
import { nations } from "../../../utils/get-nations/get-nations";

export interface CreateTournamentCalendarRuleRequest {
  phaseCode: string;
  roundNumber: number;
  month: number;
  day: number;
  time: string;
  minGames: number;
  maxGames: number;
}

export interface CreateTournamentFixtureRequest {
  phaseCode: string;
  year: number;
  month: number;
  day: number;
  time: string;
  homeTeamId: string;
  awayTeamId: string;
}

export interface CreateTournamentCalendarRequest {
  mode: "generated" | "manual" | "fixtures" | "skip";
  seasonBaseDate: string;
  rules: CreateTournamentCalendarRuleRequest[];
  fixtures: CreateTournamentFixtureRequest[];
}

export interface CreateTournamentCountryWeatherRequest {
  mode: "default" | "copy" | "preset" | "skip";
  preset?: WeatherPresetKey;
  sourceCountryObjectId?: number;
}

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
  advancements?: CompdataAdvancement[];
  countryWeather?: CreateTournamentCountryWeatherRequest;
  calendar?: CreateTournamentCalendarRequest;
}

@Component({
  selector: "app-create-tournament-wizard",
  standalone: true,
  imports: [CommonModule, FormsModule, InputListComponent],
  template: `
    <div class="tse-modal-backdrop">
      <section class="tse-modal tse-wizard" style="width: 800px; max-width: 90vw;" role="dialog" aria-modal="true" aria-labelledby="wizard-title">
        <header class="tse-modal-header"><div><span>Step {{ step }} of 8</span><h2 id="wizard-title">{{ stepTitle }}</h2></div><button type="button" aria-label="Close" (click)="cancel.emit()">×</button></header>
        <div class="tse-step-track"><span *ngFor="let item of [1,2,3,4,5,6,7,8]" [class.active]="item <= step"></span></div>
        <div class="tse-modal-body">
          <ng-container *ngIf="step === 1">
            <p>Choose where this tournament belongs.</p>
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
                  {{ willCreateCountry ? 'Will be added to tournament files' : 'Already available' }}
                </small>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 2">
            <p>Define the tournament ID and name.</p>
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
              <label class="tse-field"><span>Tournament ID <span title="A stable tournament number. Internal file IDs are generated automatically.">ⓘ</span></span><input type="number" min="1" [(ngModel)]="tournamentId" (ngModelChange)="onTournamentIdChange()" /></label>
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
            <p>Select the teams that will start in this tournament. The order below is used as the initial seed or previous-season ranking.</p>
            <div class="tse-choice-grid">
              <button type="button" [class.active]="teamsChoice === 'visual'" (click)="teamsChoice = 'visual'"><strong>Choose clubs</strong><span>Search and select clubs by name.</span></button>
              <button type="button" [class.active]="teamsChoice === 'auto'" (click)="teamsChoice = 'auto'" disabled title="Auto-fill requires club country data."><strong>Auto-fill</strong><span>Fill with clubs from the selected country.</span></button>
              <button type="button" [class.active]="teamsChoice === 'paste'" (click)="teamsChoice = 'paste'"><strong>Advanced import</strong><span>Paste Team IDs manually.</span></button>
              <button type="button" [class.active]="teamsChoice === 'skip'" (click)="teamsChoice = 'skip'"><strong>Skip for now</strong><span>Configure teams later.</span></button>
            </div>
            
            <div *ngIf="teamsChoice === 'visual'" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
              <div>
                <strong>Add Team</strong>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <label class="tse-field" style="flex: 1;">
                    <input type="number" min="0" [(ngModel)]="teamIdInput" placeholder="Team ID (e.g. 241)" (keyup.enter)="addTeamById()" />
                  </label>
                  <button type="button" class="tse-primary" (click)="addTeamById()">Add</button>
                </div>
              </div>
              <div>
                <strong>Selected teams</strong>
                <div class="tse-child-list" style="margin-top: 8px; max-height: 350px; overflow-y: auto;" *ngIf="selectedTeams.length > 0; else noSelectedTeams">
                  <article *ngFor="let team of selectedTeams; let index = index" style="padding: 12px; gap: 8px;">
                    <span class="tse-child-icon">{{ index + 1 }}</span>
                    <div style="flex: 1;">
                      <strong style="display: block;">{{ team.name }}</strong>
                      <span style="font-size: 12px; color: var(--tse-text-muted);">teamId {{ team.teamId }}</span>
                    </div>
                    <button type="button" (click)="moveTeamUp(index)" [disabled]="index === 0" title="Move up">↑</button>
                    <button type="button" (click)="moveTeamDown(index)" [disabled]="index === selectedTeams.length - 1" title="Move down">↓</button>
                    <button type="button" class="tse-danger-link" (click)="removeTeam(index)" title="Remove">×</button>
                  </article>
                </div>
                <ng-template #noSelectedTeams><div class="tse-inline-empty" style="margin-top: 8px;">No teams selected yet.</div></ng-template>
                <div style="margin-top: 8px; font-weight: 500; font-size: 13px;">{{ selectedTeams.length }} teams selected</div>
              </div>
            </div>

            <div class="tse-template-settings" *ngIf="teamsChoice === 'paste'" style="margin-top: 16px;">
              <strong>Advanced: import by Team IDs</strong>
              <div style="margin-top: 8px;">
                <label class="tse-field"><textarea [(ngModel)]="pastedTeamIds" rows="5" placeholder="191&#10;254&#10;111821" style="width: 100%; resize: vertical; font-family: monospace;"></textarea></label>
                <small class="tse-entity-note">Enter one Team ID per line or comma-separated. Use this only if you already know the internal team IDs.</small>
                <button type="button" style="margin-top: 8px;" (click)="parsePastedTeamIds()">Preview and Convert to Visual List</button>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 5">
            <p>Choose how teams move between phases. DBM Studio can generate this automatically for simple structures.</p>
            <div class="tse-choice-grid">
              <button type="button" [class.active]="advancementChoice === 'auto'" (click)="advancementChoice = 'auto'; generateAdvancementPreview()"><strong>Auto-generate</strong><span>Recommended for simple cups and knockout tournaments.</span></button>
              <button type="button" [class.active]="advancementChoice === 'skip'" (click)="advancementChoice = 'skip'"><strong>Skip for now</strong><span>Leave advancement empty and configure later.</span></button>
            </div>
            
            <div *ngIf="advancementChoice === 'auto'" style="margin-top: 24px;">
              <div *ngIf="generatedAdvancementRules.length > 0; else noAutoAdv" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="font-weight: 500; margin-bottom: 8px;">Auto-generated rules ({{ generatedAdvancementRules.length }}):</div>
                <article *ngFor="let rule of generatedAdvancementRules" style="padding: 12px; border: 1px solid var(--tse-border); border-radius: 6px; background: var(--tse-bg-subtle);">
                  <div style="font-size: 14px;">{{ describeMockRule(rule) }}</div>
                </article>
              </div>
              <ng-template #noAutoAdv>
                <div class="tse-inline-empty" style="margin-top: 16px;">
                  No obvious knockout phase connections could be detected for this template.
                </div>
              </ng-template>
            </div>
          </ng-container>

          <ng-container *ngIf="step === 6">
            <p>Country weather is a global country setting. It can affect every competition played in that country.</p>
            <ng-container *ngIf="locationType === 2; else noCountryWeatherStep">
              <div class="tse-resolved">
                <small>Global country setting</small>
                <strong>{{ selectedParentName }}</strong>
                <span>{{ countryWeatherStatusText }}</span>
              </div>
              <div class="tse-choice-grid">
                <button type="button" [class.active]="countryWeatherChoice === 'default'" (click)="countryWeatherChoice = 'default'"><strong>Use default weather</strong><span>Create a complete temperate profile for this country.</span></button>
                <button type="button" [class.active]="countryWeatherChoice === 'copy'" (click)="countryWeatherChoice = 'copy'" [disabled]="!countryWeatherSourceOptions.length"><strong>Copy from another country</strong><span>Useful when this country should match an existing climate.</span></button>
                <button type="button" [class.active]="countryWeatherChoice === 'preset'" (click)="countryWeatherChoice = 'preset'"><strong>Choose climate preset</strong><span>Pick temperate, cold, tropical, dry or rainy.</span></button>
                <button type="button" [class.active]="countryWeatherChoice === 'skip'" (click)="countryWeatherChoice = 'skip'"><strong>Skip for now</strong><span>Configure this later in Global Weather.</span></button>
              </div>
              <label class="tse-field" *ngIf="countryWeatherChoice === 'copy'"><span>Select source country</span><select [(ngModel)]="countryWeatherSourceId"><option *ngFor="let country of countryWeatherSourceOptions" [ngValue]="country.id">{{ weatherDisplay.countryObjectName(country, project, reference) }}</option></select></label>
              <div *ngIf="countryWeatherChoice === 'preset'" class="tse-choice-grid">
                <button type="button" *ngFor="let preset of weather.presets" [class.active]="countryWeatherPreset === preset.key" (click)="countryWeatherPreset = preset.key"><strong>{{ preset.label }}</strong><span>{{ preset.description }}</span></button>
              </div>
              <div class="tse-section-heading" *ngIf="countryWeatherChoice !== 'skip'">
                <div><h2>Weather preview</h2><p>Review the monthly climate before creating the tournament.</p></div>
              </div>
              <div class="tse-data-table weather compact" *ngIf="countryWeatherChoice !== 'skip'">
                <div class="head"><span>Month</span><span>Dry</span><span>Rain</span><span>Snow</span><span>Overcast</span><span>Sunset</span><span>Night</span><span></span></div>
                <div class="row" *ngFor="let entry of countryWeatherPreviewEntries">
                  <span>{{ weatherDisplay.monthName(entry.month) }}</span>
                  <span>{{ entry.dryChance }}%</span>
                  <span>{{ entry.rainChance }}%</span>
                  <span>{{ entry.snowChance }}%</span>
                  <span>{{ entry.overcastChance }}%</span>
                  <span>{{ weatherDisplay.formatTime(entry.sunsetTime) }}</span>
                  <span>{{ weatherDisplay.formatTime(entry.nightTime) }}</span>
                  <span></span>
                </div>
              </div>
              <details class="tse-technical" *ngIf="countryWeatherChoice !== 'skip'">
                <summary>Preview generated weather.txt lines</summary>
                <code *ngFor="let line of countryWeatherTechnicalPreviewLines">{{ line }}</code>
              </details>
            </ng-container>
            <ng-template #noCountryWeatherStep>
              <div class="tse-inline-empty">
                <strong>No single country weather profile</strong>
                <span>Weather depends on match country or stadium for continental and world tournaments. Use Global Weather after creation to edit countries.</span>
              </div>
            </ng-template>
          </ng-container>

          <ng-container *ngIf="step === 7">
            <p>Set when the tournament will be played. You can create generic matchday rules or exact fixtures.</p>
            <div class="tse-choice-grid">
              <button type="button" [class.active]="calendarChoice === 'generate'" (click)="calendarChoice = 'generate'; buildCalendarPreview()"><strong>Generate simple calendar</strong><span>Create matchdays from a start date and interval.</span></button>
              <button type="button" [class.active]="calendarChoice === 'manual'" (click)="calendarChoice = 'manual'"><strong>Add matchday rules manually</strong><span>Build rounds and dates yourself.</span></button>
              <button type="button" [class.active]="calendarChoice === 'fixtures'" (click)="calendarChoice = 'fixtures'"><strong>Add exact fixtures</strong><span>Use home and away teams for each match.</span></button>
              <button type="button" [class.active]="calendarChoice === 'skip'" (click)="calendarChoice = 'skip'"><strong>Skip for now</strong><span>Configure Calendar later.</span></button>
            </div>

            <ng-container *ngIf="calendarChoice === 'generate' || calendarChoice === 'manual'">
              <ng-container *ngIf="calendarChoice === 'generate'">
                <div *ngIf="template === 'cup'; else leagueCalendarFields" style="margin-top: 16px;">
                  <strong>Cup calendar</strong>
                  <div class="tse-form-grid three" style="margin-top: 8px;">
                    <label class="tse-field"><span>First round month</span><select [(ngModel)]="calendarStartMonth" (ngModelChange)="buildCalendarPreview()"><option *ngFor="let month of monthOptions" [ngValue]="month.value">{{ month.label }}</option></select></label>
                    <label class="tse-field"><span>First round day</span><input type="number" min="1" max="31" [(ngModel)]="calendarStartDay" (ngModelChange)="buildCalendarPreview()" /></label>
                    <label class="tse-field"><span>Days between rounds</span><input type="number" min="1" [(ngModel)]="calendarIntervalDays" (ngModelChange)="buildCalendarPreview()" /></label>
                  </div>
                  <div class="tse-form-grid two" style="margin-top: 8px;">
                    <label class="tse-field"><span>Default kick-off time</span><input type="time" [(ngModel)]="calendarDefaultTime" (ngModelChange)="buildCalendarPreview()" /></label>
                  </div>
                  <label class="tse-checkline" style="margin-top: 8px;"><input type="checkbox" [(ngModel)]="calendarIncludeSetupPhase" (ngModelChange)="buildCalendarPreview()" /> Include setup phase in calendar</label>
                </div>
                <ng-template #leagueCalendarFields>
                  <div style="margin-top: 16px;">
                    <strong>{{ template === 'groupStage' ? 'Group stage calendar' : 'League schedule' }}</strong>
                    <div class="tse-form-grid three" style="margin-top: 8px;">
                      <label class="tse-field"><span>First matchday month</span><select [(ngModel)]="calendarStartMonth" (ngModelChange)="buildCalendarPreview()"><option *ngFor="let month of monthOptions" [ngValue]="month.value">{{ month.label }}</option></select></label>
                      <label class="tse-field"><span>First matchday day</span><input type="number" min="1" max="31" [(ngModel)]="calendarStartDay" (ngModelChange)="buildCalendarPreview()" /></label>
                      <label class="tse-field"><span>Default kick-off time</span><input type="time" [(ngModel)]="calendarDefaultTime" (ngModelChange)="buildCalendarPreview()" /></label>
                    </div>
                    <div class="tse-form-grid three" style="margin-top: 8px;">
                      <label class="tse-field"><span>{{ template === 'groupStage' ? 'Rounds' : 'Matchdays' }}</span><input type="number" min="1" [(ngModel)]="calendarRounds" (ngModelChange)="buildCalendarPreview()" /></label>
                      <label class="tse-field"><span>Interval</span><input type="number" min="1" [(ngModel)]="calendarIntervalDays" (ngModelChange)="buildCalendarPreview()" /></label>
                      <label class="tse-field"><span>Matches per matchday</span><input type="number" min="0" [(ngModel)]="calendarMatches" (ngModelChange)="buildCalendarPreview()" /></label>
                    </div>
                  </div>
                </ng-template>
              </ng-container>

              <div class="tse-section-heading" style="margin-top: 16px;">
                <div><h2>Calendar preview</h2><p>Review and edit matchdays before creating the tournament.</p></div>
                <button type="button" (click)="addCalendarMatchday()">Add matchday</button>
              </div>
              <div class="tse-data-table preview" *ngIf="calendarRules.length; else noCalendarRules">
                <div class="head"><span>Phase</span><span>Round</span><span>Date</span><span>Time</span><span>Min</span><span>Max</span><span></span></div>
                <div class="row" *ngFor="let rule of calendarRules; let i = index">
                  <span>{{ calendarPhaseLabel(rule.phaseCode) }}</span>
                  <span><input type="number" min="1" [(ngModel)]="rule.roundNumber" /></span>
                  <span class="tse-season-date-edit"><select [(ngModel)]="rule.month"><option *ngFor="let month of monthOptions" [ngValue]="month.value">{{ month.label }}</option></select><input type="number" min="1" max="31" [(ngModel)]="rule.day" /></span>
                  <span><input type="time" [(ngModel)]="rule.time" /></span>
                  <span><input type="number" min="0" [(ngModel)]="rule.minGames" /></span>
                  <span><input type="number" min="0" [(ngModel)]="rule.maxGames" /></span>
                  <span><button type="button" class="tse-danger-link" (click)="calendarRules.splice(i, 1)">Delete</button></span>
                </div>
              </div>
              <ng-template #noCalendarRules><div class="tse-inline-empty"><strong>No matchdays yet</strong><span>Add a matchday or generate a preview.</span></div></ng-template>
              <details class="tse-technical" style="margin-top: 8px;">
                <summary>Advanced date conversion</summary>
                <p>Used only to convert day/month into schedule.txt day offsets.</p>
                <label class="tse-field"><span>Preview base year</span><input type="number" [ngModel]="dates.previewBaseYear(calendarBaseDate)" disabled /></label>
                <label class="tse-field"><span>Base date</span><input type="date" [(ngModel)]="calendarBaseDate" /></label>
                <code *ngFor="let line of calendarTechnicalPreviewLines">{{ line }}</code>
              </details>
            </ng-container>

            <ng-container *ngIf="calendarChoice === 'fixtures'">
              <div class="tse-section-heading" style="margin-top: 16px;">
                <div><h2>Exact fixtures</h2><p>Add fixtures with date, time, home team and away team.</p></div>
              </div>
              <div class="tse-form-grid three">
                <label class="tse-field"><span>Phase</span><select [(ngModel)]="fixturePhaseCode"><option *ngFor="let phase of calendarPhaseOptions" [value]="phase.code">{{ phase.label }}</option></select></label>
                <label class="tse-field"><span>Month</span><select [(ngModel)]="fixtureMonth"><option *ngFor="let month of monthOptions" [ngValue]="month.value">{{ month.label }}</option></select></label>
                <label class="tse-field"><span>Day</span><input type="number" min="1" max="31" [(ngModel)]="fixtureDay" /></label>
              </div>
              <div class="tse-form-grid two" style="margin-top: 8px;">
                <label class="tse-field"><span>Kick-off time</span><input type="time" [(ngModel)]="fixtureTime" /></label>
              </div>
              <div class="tse-form-grid two" style="margin-top: 8px;">
                <label class="tse-field"><span>Home team</span><input [(ngModel)]="fixtureHomeTeamId" placeholder="Team ID 1" /></label>
                <label class="tse-field"><span>Away team</span><input [(ngModel)]="fixtureAwayTeamId" placeholder="Team ID 106" /></label>
              </div>
              <div class="tse-actions" style="margin: 12px 0;"><button type="button" class="tse-primary" [disabled]="!canAddWizardFixture" (click)="addWizardFixture()">Add fixture</button><button type="button" disabled title="Advanced import will be available after creating the tournament.">Import fixtures</button><button type="button" (click)="calendarFixtures = []" [disabled]="!calendarFixtures.length">Clear fixtures</button></div>
              <div class="tse-data-table fixture" *ngIf="calendarFixtures.length; else noWizardFixtures">
                <div class="head"><span>Date</span><span>Time</span><span>Phase</span><span>Home</span><span>Away</span><span>File</span><span>Actions</span></div>
                <div class="row" *ngFor="let fixture of calendarFixtures; let i = index">
                  <span>{{ dates.formatMonthDay(fixture.month, fixture.day) }}</span>
                  <span>{{ dates.formatTimeHHMM(fixture.time) }}</span>
                  <span>{{ calendarPhaseLabel(fixture.phaseCode) }}</span>
                  <span>{{ teamLabel(fixture.homeTeamId) }}</span>
                  <span>{{ teamLabel(fixture.awayTeamId) }}</span>
                  <span><small class="tse-muted">{{ wizardFixtureFileName(fixture) }}</small></span>
                  <span><button type="button" class="tse-danger-link" (click)="calendarFixtures.splice(i, 1)">Delete</button></span>
                </div>
              </div>
              <ng-template #noWizardFixtures><div class="tse-inline-empty"><strong>No fixtures yet</strong><span>Add fixtures manually or skip for now.</span></div></ng-template>
              <details class="tse-technical" style="margin-top: 8px;">
                <summary>Show technical details</summary>
                <label class="tse-field"><span>Schedule file year</span><input type="number" min="1900" [(ngModel)]="fixtureYear" /></label>
              </details>
            </ng-container>
          </ng-container>

          <ng-container *ngIf="step === 8">
            <div class="tse-review">
              <div><span>Tournament ID</span><strong>{{ tournamentId }}</strong></div>
              <div><span>Generated internal code</span><strong>{{ internalCode }}</strong></div>
              <div><span>Tournament Name</span><strong>{{ customName || 'None' }}</strong></div>
              <div><span>Localization key</span><strong>{{ nameKey }}</strong></div>
              <div>
                <span>Belongs to</span>
                <strong>{{ selectedParentName }}</strong>
                <small *ngIf="locationType === 2" style="display: block; opacity: 0.8; margin-top: 4px;">
                  Status: {{ willCreateCountry ? selectedParentName + ' will be added to tournament files' : selectedParentName + ' already exists in the country list' }}
                </small>
              </div>
              <div><span>Structure</span><ul><li *ngFor="let phase of templatePhases">{{ phase }}</li><li *ngIf="!templatePhases.length">No phases yet</li></ul></div>
              
              <div>
                <span>Starting teams</span>
                <ul *ngIf="teamsChoice !== 'skip' && selectedTeams.length > 0; else skippedTeams">
                  <li *ngFor="let team of selectedTeams; let index = index">{{ index + 1 }}. {{ team.name }} <small style="color: var(--tse-text-muted);">({{ team.teamId }})</small></li>
                </ul>
                <ng-template #skippedTeams>
                  <div><strong>Not configured yet</strong><small style="display: block; color: var(--tse-text-muted); margin-top: 4px;">You can configure teams later in Teams / Seeding.</small></div>
                </ng-template>
              </div>
              <div>
                <span>Country weather</span>
                <strong>{{ countryWeatherReviewTitle }}</strong>
                <small *ngIf="locationType === 2" style="display: block; color: var(--tse-text-muted); margin-top: 4px;">Global country setting for {{ selectedParentName }}.</small>
              </div>
              <div>
                <span>Calendar</span>
                <strong>{{ calendarReviewTitle }}</strong>
                <small style="display: block; color: var(--tse-text-muted); margin-top: 4px;">Matchday rules: {{ calendarRules.length }} · Specific fixtures: {{ calendarFixtures.length }}</small>
                <small *ngIf="calendarRules.length" style="display: block; color: var(--tse-text-muted); margin-top: 4px;">First matchday: {{ dates.formatMonthDay(calendarRules[0].month, calendarRules[0].day) }} · Last matchday: {{ dates.formatMonthDay(calendarRules[calendarRules.length - 1].month, calendarRules[calendarRules.length - 1].day) }}</small>
              </div>
            </div>
            <details class="tse-technical" style="margin-top: 8px;">
              <summary>Show generated schedule lines</summary>
              <ng-container *ngIf="calendarTechnicalPreviewLines.length; else noCalendarLines">
                <code *ngFor="let line of calendarTechnicalPreviewLines">{{ line }}</code>
              </ng-container>
              <ng-template #noCalendarLines><p>No schedule.txt lines generated.</p></ng-template>
            </details>
            <details class="tse-technical" style="margin-top: 8px;">
              <summary>Show generated specific schedule files</summary>
              <ng-container *ngIf="calendarFixtures.length; else noSpecificCalendarLines">
                <div *ngFor="let fixture of calendarFixtures" style="margin-bottom: 8px;">
                  <div style="font-weight: 500;">File: {{ wizardFixtureFileName(fixture) }}</div>
                  <code>{{ dates.dateInputToSpecific(wizardFixtureDateInput(fixture)) }},{{ dates.parseTimeToHHMM(fixture.time) }},{{ fixture.homeTeamId }},{{ fixture.awayTeamId }}</code>
                </div>
              </ng-container>
              <ng-template #noSpecificCalendarLines><p>No specific fixture lines generated.</p></ng-template>
            </details>
            <details class="tse-technical">
              <summary>Show generated initteams lines</summary>
              <ng-container *ngIf="generatedInitTeamsLines.length; else noInitTeams">
                <code *ngFor="let line of generatedInitTeamsLines">{{ line }}</code>
              </ng-container>
              <ng-template #noInitTeams><p>No initteams lines generated.</p></ng-template>
            </details>
            <details class="tse-technical" style="margin-top: 8px;">
              <summary>Show generated advancement lines</summary>
              <ng-container *ngIf="generatedAdvancementRules.length > 0 && advancementChoice !== 'skip'; else noAdvLines">
                <code *ngFor="let rule of generatedAdvancementRules">{{ rule.fromGroupId }},{{ rule.fromPosition }},{{ rule.toGroupId }},{{ rule.toPosition }}</code>
              </ng-container>
              <ng-template #noAdvLines><p>No advancement lines generated.</p></ng-template>
            </details>
            <details class="tse-technical" style="margin-top: 8px;">
              <summary>Show all other generated lines</summary>
              <div style="margin-bottom: 8px; font-weight: 500;">Generated compobj lines:</div>
              <code *ngFor="let line of generatedLines">{{ line }}</code>
              <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">Generated compids line:</div>
              <code>{{ generatedCompidsLine }}</code>
              <ng-container *ngIf="generatedStandingsLines.length">
                <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">Generated standings lines:</div>
                <code *ngFor="let line of generatedStandingsLines">{{ line }}</code>
              </ng-container>
            </details>
          </ng-container>
        </div>
        <footer class="tse-modal-actions"><button type="button" (click)="cancel.emit()">Cancel</button><button type="button" *ngIf="step > 1" (click)="step = step - 1">Back</button><button type="button" class="tse-primary" *ngIf="step < 8" [disabled]="!canContinue" (click)="onContinue()">Continue</button><button type="button" class="tse-primary" *ngIf="step === 8" (click)="submit()">Create tournament</button></footer>
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
  teamsChoice: "visual" | "auto" | "paste" | "skip" = "visual";
  pastedTeamIds = "";
  
  teamIdInput = "";
  selectedTeams: { teamId: string, name: string }[] = [];
  
  advancementChoice: "auto" | "skip" = "skip";
  generatedAdvancementRules: CompdataAdvancement[] = [];
  mockObjectsForAdvancement: CompdataObject[] = [];
  readonly monthOptions = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, index) => ({ value: index + 1, label }));

  countryWeatherChoice: "default" | "copy" | "preset" | "skip" = "skip";
  countryWeatherPreset: WeatherPresetKey = "temperate";
  countryWeatherSourceId = 0;

  calendarChoice: "generate" | "manual" | "fixtures" | "skip" = "generate";
  calendarStartMonth = 8;
  calendarStartDay = 18;
  calendarDefaultTime = "20:00";
  calendarRounds = 38;
  calendarIntervalDays = 7;
  calendarMatches = 10;
  calendarIncludeSetupPhase = false;
  calendarBaseDate = "2011-12-25";
  calendarRules: CreateTournamentCalendarRuleRequest[] = [];
  calendarFixtures: CreateTournamentFixtureRequest[] = [];
  fixturePhaseCode = "S1";
  fixtureYear = new Date().getFullYear();
  fixtureMonth = 8;
  fixtureDay = 18;
  fixtureTime = "15:00";
  fixtureHomeTeamId = "";
  fixtureAwayTeamId = "";

  constructor(
    public readonly display: CompObjDisplayService, 
    private teamEditor: TeamEditorService,
    private advService: AdvancementService,
    private advDisplay: AdvancementDisplayService,
    public readonly dates: ScheduleDateService,
    public readonly weather: WeatherService,
    public readonly weatherDisplay: WeatherDisplayService
  ) {}

  ngOnInit() {
    const year = new Date().getFullYear();
    this.calendarBaseDate = this.dates.defaultSeasonBaseDate;
    this.fixtureYear = year;
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

  get stepTitle(): string { return ["", "Where does this tournament belong?", "Tournament information", "Choose the tournament structure", "Choose initial teams", "Configure advancement", "Configure country weather", "Configure calendar", "Review"][this.step]; }
  get locationTypeLabel(): string { return this.locationType === 2 ? "Country" : this.locationType === 1 ? "Confederation" : "World/FIFA"; }
  get locationPickerPlaceholder(): string { return `Choose ${this.locationType === 2 ? "a country" : this.locationType === 1 ? "a confederation" : "World/FIFA"}...`; }
  get locationSearchPlaceholder(): string { return `Search ${this.locationType === 2 ? "countries" : this.locationType === 1 ? "confederations" : "World/FIFA"}...`; }
  get locationEmptyText(): string { return `No ${this.locationType === 2 ? "countries" : this.locationType === 1 ? "confederations" : "World/FIFA entries"} were found in the tournament files.`; }
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
    if (this.step === 4) return this.teamsChoice === 'skip' || (this.teamsChoice === 'paste' && Boolean(this.pastedTeamIds.trim())) || this.selectedTeams.length > 0;
    if (this.step === 6) return this.countryWeatherChoice !== "copy" || this.countryWeatherSourceId > 0;
    if (this.step === 7) return this.calendarChoice === "skip" || (this.calendarChoice === "fixtures" ? this.calendarFixturesValid : this.calendarRulesValid);
    return true;
  }

  onContinue() {
    this.step++;
    if (this.step === 5) {
      if (this.template === "cup") {
        this.advancementChoice = "auto";
        this.generateAdvancementPreview();
      } else {
        this.advancementChoice = "skip";
      }
    }
    if (this.step === 6) {
      this.initializeCountryWeatherStep();
    }
    if (this.step === 7) {
      this.initializeCalendarStep();
    }
  }

  initializeCountryWeatherStep(): void {
    if (this.locationType !== 2) {
      this.countryWeatherChoice = "skip";
      return;
    }
    this.countryWeatherChoice = this.countryHasCompleteWeather ? "skip" : "default";
    this.countryWeatherPreset = "temperate";
    this.countryWeatherSourceId = this.countryWeatherSourceOptions[0]?.id ?? 0;
  }

  generateAdvancementPreview() {
    this.mockObjectsForAdvancement = this.generateMockObjects();
    const mockPhases = this.mockObjectsForAdvancement.filter(o => o.kind === 4).sort((a, b) => a.id - b.id);
    const mockProject: CompdataProject = {
      ...this.project,
      objects: this.mockObjectsForAdvancement
    };
    this.generatedAdvancementRules = this.advService.autoGenerateKnockoutRules(mockPhases, mockProject);
  }

  describeMockRule(rule: CompdataAdvancement): string {
    const mockProject: CompdataProject = { ...this.project, objects: this.mockObjectsForAdvancement };
    return this.advDisplay.describeRule(rule, mockProject, this.reference);
  }

  get calendarPhaseOptions(): Array<{ code: string; label: string; matches: number; setup?: boolean }> {
    if (this.template === "league") {
      return [{ code: "S1", label: "League Phase", matches: Math.max(1, this.leagueGroups * Math.floor(this.leagueTeams / 2)) }];
    }
    if (this.template === "groupStage") {
      return [{ code: "S1", label: "Group Phase", matches: Math.max(1, this.groupStageGroups * Math.floor(this.groupStageTeams / 2)) }];
    }
    if (this.template === "cup") {
      const phases: Array<{ code: string; label: string; matches: number; setup?: boolean }> = [
        { code: "S1", label: "Participant Setup", matches: 1, setup: true }
      ];
      let index = 2;
      if (this.cupInitialTeams >= 16) phases.push({ code: `S${index++}`, label: "Round of 16", matches: 8 });
      if (this.cupInitialTeams >= 8) phases.push({ code: `S${index++}`, label: "Quarter Finals", matches: 4 });
      if (this.cupInitialTeams >= 4) phases.push({ code: `S${index++}`, label: "Semi Finals", matches: 2 });
      if (this.cupInitialTeams >= 2) phases.push({ code: `S${index++}`, label: "Final", matches: 1 });
      return phases;
    }
    return [];
  }

  get calendarTechnicalPreviewLines(): string[] {
    const mockObjects = this.generateMockObjects();
    const phaseIds = new Map(mockObjects.filter((object) => object.kind === 4).map((phase) => [phase.shortName.toUpperCase(), phase.id]));
    return this.calendarRules.map((rule) => {
      const phaseId = phaseIds.get(rule.phaseCode.toUpperCase()) ?? rule.phaseCode;
      const time = this.dates.parseTimeToHHMM(rule.time);
      const date = this.wizardRuleDateInput(rule);
      const dayOffset = date && this.dates.isValidDateInput(this.calendarBaseDate) ? this.dates.dateToDayOffset(date, this.calendarBaseDate) : "dayOffset";
      return [phaseId, dayOffset, rule.roundNumber, rule.minGames, rule.maxGames, time || "time"].join(",");
    });
  }

  get calendarReviewTitle(): string {
    if (this.calendarChoice === "skip") return "Not configured yet";
    if (this.calendarChoice === "fixtures") return "Exact fixtures";
    if (this.calendarChoice === "manual") return "Manual matchday rules";
    return "Generated simple calendar";
  }

  get countryWeatherTargetObjectId(): number {
    if (this.locationType !== 2) return 0;
    if (this.existingCountry) return this.existingCountry.id;
    return Math.max(0, ...this.project.objects.map((object) => object.id)) + 1;
  }

  get countryHasCompleteWeather(): boolean {
    return this.locationType === 2 && this.existingCountry ? this.weather.hasCompleteWeather(this.project, this.existingCountry.id) : false;
  }

  get countryWeatherStatusText(): string {
    if (this.locationType !== 2) return "Weather depends on match country or stadium.";
    if (this.willCreateCountry) return `${this.selectedParentName} does not have a weather profile yet.`;
    const configured = this.existingCountry ? this.weather.configuredMonths(this.project, this.existingCountry.id).size : 0;
    return configured === 12 ? `${this.selectedParentName} already has weather settings.` : `${this.selectedParentName} has weather for ${configured} of 12 months.`;
  }

  get countryWeatherSourceOptions(): CompdataObject[] {
    const targetObjectId = this.countryWeatherTargetObjectId;
    return this.project.objects
      .filter((object) => object.kind === 2 && object.id !== targetObjectId && this.weather.configuredMonths(this.project, object.id).size > 0)
      .sort((a, b) => this.weatherDisplay.countryObjectName(a, this.project, this.reference).localeCompare(this.weatherDisplay.countryObjectName(b, this.project, this.reference)));
  }

  get countryWeatherPreviewEntries() {
    const targetObjectId = this.countryWeatherTargetObjectId;
    if (this.countryWeatherChoice === "copy") {
      return this.weather.countryProfile(this.project, this.countryWeatherSourceId).map((entry) => ({ ...entry, countryObjectId: targetObjectId, originalRawLine: undefined }));
    }
    const preset = this.countryWeatherChoice === "preset" ? this.countryWeatherPreset : "temperate";
    return this.weather.presetEntries(targetObjectId, preset);
  }

  get countryWeatherTechnicalPreviewLines(): string[] {
    return this.countryWeatherPreviewEntries.map((entry) => this.weather.rawLine(entry));
  }

  get countryWeatherReviewTitle(): string {
    if (this.locationType !== 2) return "Not a country-specific tournament";
    if (this.countryWeatherChoice === "skip") return this.countryHasCompleteWeather ? "Already configured" : "Not configured yet";
    if (this.countryWeatherChoice === "copy") {
      const source = this.project.objects.find((object) => object.id === this.countryWeatherSourceId);
      return source ? `Copy from ${this.weatherDisplay.countryObjectName(source, this.project, this.reference)}` : "Copy from another country";
    }
    if (this.countryWeatherChoice === "preset") return `${this.weather.presets.find((preset) => preset.key === this.countryWeatherPreset)?.label ?? "Custom"} preset`;
    return "Default weather";
  }

  get canAddWizardFixture(): boolean {
    return Boolean(
      this.fixturePhaseCode &&
      Boolean(this.wizardFixtureDateInput({ phaseCode: this.fixturePhaseCode, year: this.fixtureYear, month: this.fixtureMonth, day: this.fixtureDay, time: this.fixtureTime, homeTeamId: this.fixtureHomeTeamId, awayTeamId: this.fixtureAwayTeamId })) &&
      this.dates.isValidHHMM(this.fixtureTime) &&
      String(this.fixtureHomeTeamId).trim() &&
      String(this.fixtureAwayTeamId).trim() &&
      String(this.fixtureHomeTeamId).trim() !== String(this.fixtureAwayTeamId).trim()
    );
  }

  get calendarRulesValid(): boolean {
    return this.calendarRules.length > 0 && this.calendarRules.every((rule) =>
      this.calendarPhaseOptions.some((phase) => phase.code === rule.phaseCode) &&
      Number(rule.roundNumber) >= 1 &&
      Boolean(this.wizardRuleDateInput(rule)) &&
      this.dates.isValidHHMM(rule.time) &&
      Number(rule.minGames) >= 0 &&
      Number(rule.maxGames) >= Number(rule.minGames)
    );
  }

  get calendarFixturesValid(): boolean {
    return this.calendarFixtures.length > 0 && this.calendarFixtures.every((fixture) =>
      this.calendarPhaseOptions.some((phase) => phase.code === fixture.phaseCode) &&
      Number(fixture.year) > 1900 &&
      Boolean(this.wizardFixtureDateInput(fixture)) &&
      this.dates.isValidHHMM(fixture.time) &&
      Boolean(fixture.homeTeamId.trim()) &&
      Boolean(fixture.awayTeamId.trim()) &&
      fixture.homeTeamId.trim() !== fixture.awayTeamId.trim()
    );
  }

  initializeCalendarStep(): void {
    this.calendarChoice = this.template === "empty" ? "skip" : "generate";
    const year = new Date().getFullYear();
    this.calendarStartMonth = 8;
    this.calendarStartDay = 18;
    this.calendarDefaultTime = "20:00";
    this.calendarIntervalDays = 7;
    this.calendarRounds = this.defaultCalendarRounds();
    this.calendarMatches = this.defaultCalendarMatches();
    this.calendarBaseDate = this.dates.defaultSeasonBaseDate;
    this.fixturePhaseCode = this.calendarPhaseOptions[0]?.code ?? "S1";
    this.fixtureYear = year;
    this.fixtureMonth = this.calendarStartMonth;
    this.fixtureDay = this.calendarStartDay;
    this.fixtureTime = "15:00";
    this.fixtureHomeTeamId = this.selectedTeams[0]?.teamId ?? "";
    this.fixtureAwayTeamId = this.selectedTeams[1]?.teamId ?? "";
    this.buildCalendarPreview();
  }

  buildCalendarPreview(): void {
    if (this.calendarChoice !== "generate") return;
    const startDate = this.dates.monthDayToDateInput(Number(this.calendarStartMonth), Number(this.calendarStartDay), this.calendarBaseDate);
    if (!startDate) return;
    this.calendarRules = [];
    const phases = this.template === "cup"
      ? this.calendarPhaseOptions.filter((phase) => this.calendarIncludeSetupPhase || !phase.setup)
      : this.calendarPhaseOptions.slice(0, 1);

    if (this.template === "cup") {
      phases.forEach((phase, index) => {
        const monthDay = this.dates.dateInputToMonthDay(this.dates.addDays(startDate, index * Number(this.calendarIntervalDays || 7)));
        this.calendarRules.push({
          phaseCode: phase.code,
          roundNumber: 1,
          month: monthDay.month,
          day: monthDay.day,
          time: this.calendarDefaultTime,
          minGames: phase.matches,
          maxGames: phase.matches
        });
      });
      return;
    }

    const phaseCode = phases[0]?.code ?? "S1";
    for (let round = 1; round <= Number(this.calendarRounds || 1); round += 1) {
      const monthDay = this.dates.dateInputToMonthDay(this.dates.addDays(startDate, (round - 1) * Number(this.calendarIntervalDays || 7)));
      this.calendarRules.push({
        phaseCode,
        roundNumber: round,
        month: monthDay.month,
        day: monthDay.day,
        time: this.calendarDefaultTime,
        minGames: Number(this.calendarMatches || 0),
        maxGames: Number(this.calendarMatches || 0)
      });
    }
  }

  addCalendarMatchday(): void {
    const last = this.calendarRules[this.calendarRules.length - 1];
    const phaseCode = last?.phaseCode ?? this.calendarPhaseOptions[0]?.code ?? "S1";
    const monthDay = last
      ? this.dates.addDaysToMonthDay(last.month, last.day, Number(this.calendarIntervalDays || 7), this.calendarBaseDate)
      : { month: this.calendarStartMonth, day: this.calendarStartDay };
    this.calendarRules.push({
      phaseCode,
      roundNumber: (last?.roundNumber ?? 0) + 1,
      month: monthDay.month,
      day: monthDay.day,
      time: last?.time ?? this.calendarDefaultTime,
      minGames: last?.minGames ?? this.defaultCalendarMatches(),
      maxGames: last?.maxGames ?? this.defaultCalendarMatches()
    });
    if (this.calendarChoice === "generate") this.calendarChoice = "manual";
  }

  addWizardFixture(): void {
    if (!this.canAddWizardFixture) return;
    this.calendarFixtures.push({
      phaseCode: this.fixturePhaseCode,
      year: Number(this.fixtureYear) || new Date().getFullYear(),
      month: Number(this.fixtureMonth),
      day: Number(this.fixtureDay),
      time: this.fixtureTime,
      homeTeamId: String(this.fixtureHomeTeamId).trim(),
      awayTeamId: String(this.fixtureAwayTeamId).trim()
    });
    this.fixtureHomeTeamId = "";
    this.fixtureAwayTeamId = "";
  }

  calendarPhaseLabel(code: string): string {
    return this.calendarPhaseOptions.find((phase) => phase.code === code)?.label ?? code;
  }

  wizardFixtureFileName(fixture: CreateTournamentFixtureRequest): string {
    return `${this.internalCode}_${fixture.phaseCode}_${fixture.year}`.toLowerCase();
  }

  teamLabel(teamId: string): string {
    const selected = this.selectedTeams.find((team) => team.teamId === teamId);
    if (selected) return selected.name;
    const exact = this.teamEditor.findTeams(this.reference, teamId, 5).find((team) => team.teamId === teamId);
    return exact?.displayName ?? `Team ID ${teamId}`;
  }

  numberValue(value: string): number {
    return Number(value) || 0;
  }

  wizardRuleDateInput(rule: CreateTournamentCalendarRuleRequest): string {
    return this.dates.monthDayToDateInput(Number(rule.month), Number(rule.day), this.calendarBaseDate);
  }

  wizardFixtureDateInput(fixture: CreateTournamentFixtureRequest): string {
    return this.dates.dateFromParts(Number(fixture.year), Number(fixture.month), Number(fixture.day));
  }

  private defaultCalendarRounds(): number {
    if (this.template === "league") return Math.max(1, (Number(this.leagueTeams) - 1) * 2);
    if (this.template === "groupStage") return Number(this.groupStageTeams) <= 4 ? 6 : Math.max(1, Number(this.groupStageTeams) - 1);
    if (this.template === "cup") return Math.max(1, this.calendarPhaseOptions.filter((phase) => !phase.setup).length);
    return 1;
  }

  private defaultCalendarMatches(): number {
    return this.calendarPhaseOptions[0]?.matches ?? 1;
  }

  generateMockObjects(): CompdataObject[] {
    const objects: CompdataObject[] = [];
    let id = Math.max(0, ...this.project.objects.map((object) => object.id));
    let resolvedParentId = this.parentId;
    
    if (this.locationType === 2 && this.willCreateCountry) {
      id++;
      resolvedParentId = id;
    }
    
    id++;
    const compId = id;
    objects.push({ id: compId, kind: 3, shortName: this.internalCode, description: this.nameKey, parentId: resolvedParentId });
    
    if (this.template === "league") {
      id++;
      const phaseId = id;
      objects.push({ id: phaseId, kind: 4, shortName: "S1", description: "FCE_League_Stage", parentId: compId });
      for (let i = 0; i < this.leagueGroups; i++) {
        objects.push({ id: ++id, kind: 5, shortName: `G${i + 1}`, description: "", parentId: phaseId });
      }
    } else if (this.template === "groupStage") {
      id++;
      const phaseId = id;
      objects.push({ id: phaseId, kind: 4, shortName: "S1", description: "FCE_Group_Stage", parentId: compId });
      for (let i = 0; i < this.groupStageGroups; i++) {
        objects.push({ id: ++id, kind: 5, shortName: `G${i + 1}`, description: "", parentId: phaseId });
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
        objects.push({ id: phaseId, kind: 4, shortName: `S${index + 1}`, description: phase.key, parentId: compId });
        for (let i = 0; i < phase.slots; i++) {
          objects.push({ id: ++id, kind: 5, shortName: `G${i + 1}`, description: "", parentId: phaseId });
        }
      });
    }
    return objects;
  }

  addTeamById() {
    const tid = this.teamIdInput?.toString().trim();
    if (!tid) return;
    
    // Attempt to resolve name if database is loaded
    const results = this.teamEditor.findTeams(this.reference, tid, 1);
    const exact = results.find(r => r.teamId === tid);
    
    this.selectedTeams.push({ 
      teamId: tid, 
      name: exact ? exact.displayName : `Team ID ${tid}` 
    });
    this.teamIdInput = "";
  }

  removeTeam(index: number) {
    this.selectedTeams.splice(index, 1);
  }

  moveTeamUp(index: number) {
    if (index > 0) {
      const temp = this.selectedTeams[index - 1];
      this.selectedTeams[index - 1] = this.selectedTeams[index];
      this.selectedTeams[index] = temp;
    }
  }

  moveTeamDown(index: number) {
    if (index < this.selectedTeams.length - 1) {
      const temp = this.selectedTeams[index + 1];
      this.selectedTeams[index + 1] = this.selectedTeams[index];
      this.selectedTeams[index] = temp;
    }
  }

  parsePastedTeamIds() {
    if (!this.pastedTeamIds.trim()) return;
    const tokens = this.pastedTeamIds.split(/[\s,]+/).map(t => t.trim()).filter(t => t);
    for (const token of tokens) {
      const results = this.teamEditor.findTeams(this.reference, token, 1);
      const exact = results.find(r => r.teamId === token);
      this.selectedTeams.push({
        teamId: token,
        name: exact ? exact.displayName : `Team ID ${token}`
      });
    }
    this.pastedTeamIds = "";
    this.teamsChoice = "visual"; // switch to visual view to see them
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
    if (this.selectedTeams.length === 0) return [];
    
    let id = Math.max(0, ...this.project.objects.map((object) => object.id));
    if (this.locationType === 2 && this.willCreateCountry) id++;
    id++; // compId
    
    const lines: string[] = [];
    this.selectedTeams.forEach((team, i) => {
      lines.push(`${id},${i},${team.teamId}`);
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
          detail: `Country · ${exists ? 'Already available' : 'Can be added'}`,
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
            detail: `${typeName} · ${object.shortName || "no code"}`,
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
        groupStageTeams: this.template === "groupStage" ? this.groupStageTeams : undefined,
        cupInitialTeams: this.template === "cup" ? this.cupInitialTeams : undefined,
        initialTeams: this.teamsChoice !== "skip" && this.selectedTeams.length > 0 ? this.selectedTeams.map(t => t.teamId) : undefined,
        advancements: this.advancementChoice === "auto" ? this.generatedAdvancementRules : undefined,
        countryWeather: this.createCountryWeatherRequest(),
        calendar: this.createCalendarRequest()
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
      groupStageTeams: this.template === "groupStage" ? this.groupStageTeams : undefined,
      cupInitialTeams: this.template === "cup" ? this.cupInitialTeams : undefined,
      initialTeams: this.teamsChoice !== "skip" && this.selectedTeams.length > 0 ? this.selectedTeams.map(t => t.teamId) : undefined,
      advancements: this.advancementChoice === "auto" ? this.generatedAdvancementRules : undefined,
      countryWeather: this.createCountryWeatherRequest(),
      calendar: this.createCalendarRequest()
    });
  }

  private createCountryWeatherRequest(): CreateTournamentCountryWeatherRequest | undefined {
    if (this.locationType !== 2) return undefined;
    if (this.countryWeatherChoice === "skip") return { mode: "skip" };
    if (this.countryWeatherChoice === "copy") {
      return { mode: "copy", sourceCountryObjectId: this.countryWeatherSourceId };
    }
    if (this.countryWeatherChoice === "preset") {
      return { mode: "preset", preset: this.countryWeatherPreset };
    }
    return { mode: "default", preset: "temperate" };
  }

  private createCalendarRequest(): CreateTournamentCalendarRequest | undefined {
    if (this.calendarChoice === "skip") return undefined;
    return {
      mode: this.calendarChoice === "generate" ? "generated" : this.calendarChoice,
      seasonBaseDate: this.calendarBaseDate,
      rules: this.calendarChoice === "fixtures" ? [] : [...this.calendarRules],
      fixtures: this.calendarChoice === "fixtures" ? [...this.calendarFixtures] : []
    };
  }
}
