import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import type { CompdataObject, CompdataProject, DbProject } from "../../../shared/types";
import { CompObjDisplayService } from "../../services/compdata/compobj-display.service";
import { CompObjTreeService } from "../../services/compdata/compobj-tree.service";

@Component({
  selector: "app-compobj-advanced-view",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tse-advanced-layout">
      <aside class="tse-advanced-tree">
        <header><strong>compobj.txt objects</strong><span>{{ project.objects.length }} objects</span></header>
        <button
          *ngFor="let row of rows"
          type="button"
          [class.active]="row.object.id === selectedId"
          [style.padding-left.px]="10 + row.depth * 18"
          (click)="selectedId = row.object.id"
        >
          <span class="tse-tree-type">{{ row.object.kind }}</span>
          <span><strong>{{ display.objectName(row.object, reference, project) }}</strong><small>{{ display.typeLabel(row.object.kind) }} · {{ row.object.shortName || '—' }}</small></span>
        </button>
      </aside>
      <main class="tse-advanced-main" *ngIf="selectedObject as object; else selectObject">
        <div class="tse-entity-header"><div><div class="tse-breadcrumb">Advanced View / {{ display.typeLabel(object.kind) }}</div><h1>{{ display.objectName(object, reference, project) }}</h1><p>Technical compobj object details</p></div></div>
        <dl class="tse-advanced-fields">
          <div><dt>objectId</dt><dd>{{ object.id }}</dd></div><div><dt>type</dt><dd>{{ object.kind }}</dd></div>
          <div><dt>shortDescription</dt><dd>{{ object.shortName }}</dd></div><div><dt>description</dt><dd>{{ object.description }}</dd></div>
          <div><dt>parentId</dt><dd>{{ object.parentId }}</dd></div><div><dt>parent</dt><dd>{{ display.parentName(object, project, reference) }}</dd></div>
        </dl>
        <section class="tse-code-panel"><span>Raw line</span><code>{{ object.originalRawLine || display.rawLine(object) }}</code></section>
        <section class="tse-code-panel"><span>Generated line</span><code>{{ display.rawLine(object) }}</code></section>
        <details class="tse-technical tse-full-preview"><summary>Preview complete compobj.txt</summary><div class="tse-generated-lines"><code *ngFor="let candidate of project.objects">{{ display.rawLine(candidate) }}</code></div></details>
        <details class="tse-technical tse-full-preview">
          <summary>Preview compids.txt</summary>
          <div class="tse-warning" *ngFor="let warning of compidsWarnings" style="margin-bottom: 8px;">{{ warning }}</div>
          <div class="tse-generated-lines">
            <code *ngFor="let id of compidsPreview">{{ id }}</code>
            <code *ngIf="!compidsPreview.length">No Competition IDs found.</code>
          </div>
        </details>
        <details class="tse-technical tse-full-preview">
          <summary>Preview standings.txt</summary>
          <div class="tse-warning" *ngFor="let warning of standingsWarnings" style="margin-bottom: 8px;">{{ warning }}</div>
          <div class="tse-generated-lines">
            <code *ngFor="let standing of standingsPreview">{{ standing }}</code>
            <code *ngIf="!standingsPreview.length">No standings found.</code>
          </div>
        </details>
        <details class="tse-technical tse-full-preview">
          <summary>Preview initteams.txt</summary>
          <div class="tse-warning" *ngFor="let warning of initteamsWarnings" style="margin-bottom: 8px;">{{ warning }}</div>
          <div class="tse-generated-lines">
            <code *ngFor="let team of initteamsPreview">{{ team }}</code>
            <code *ngIf="!initteamsPreview.length">No initial teams found.</code>
          </div>
        </details>
        <details class="tse-technical tse-full-preview">
          <summary>Preview schedule.txt</summary>
          <div class="tse-generated-lines">
            <code *ngFor="let schedule of schedulePreview">{{ schedule }}</code>
            <code *ngIf="!schedulePreview.length">No matchday rules found.</code>
          </div>
        </details>
        <details class="tse-technical tse-full-preview">
          <summary>Preview schedules/ files</summary>
          <div class="tse-code-panel" *ngFor="let file of specificSchedulePreview">
            <span>{{ file.fileName }}</span>
            <code *ngFor="let line of file.lines">{{ line }}</code>
            <code *ngIf="!file.lines.length">No fixture lines.</code>
          </div>
          <div class="tse-generated-lines" *ngIf="!specificSchedulePreview.length">
            <code>No specific schedule files found.</code>
          </div>
        </details>
      </main>
      <ng-template #selectObject><main class="tse-main-empty"><strong>Select an object</strong><span>Choose an object from the technical tree.</span></main></ng-template>
    </div>
  `
})
export class CompObjAdvancedViewComponent {
  @Input({ required: true }) project!: CompdataProject;
  @Input() reference?: DbProject;
  selectedId = 0;
  constructor(public readonly display: CompObjDisplayService, private readonly tree: CompObjTreeService) {}
  get rows() { return this.tree.fullTree(this.project); }
  get selectedObject(): CompdataObject | undefined { return this.display.object(this.project, this.selectedId) ?? this.rows[0]?.object; }

  get compidsPreview(): number[] {
    return this.project.objects.filter(obj => obj.kind === 3).map(obj => obj.id);
  }

  get compidsWarnings(): string[] {
    const warnings: string[] = [];
    const type3Ids = new Set(this.project.objects.filter(o => o.kind === 3).map(o => o.id));
    const compIdsSet = new Set(this.project.compIds);

    if (compIdsSet.size !== this.project.compIds.length) {
      warnings.push("compids.txt contains duplicate IDs.");
    }
    for (const id of compIdsSet) {
      const obj = this.project.objects.find(o => o.id === id);
      if (!obj) warnings.push(`compids.txt references missing object ${id}.`);
      else if (obj.kind !== 3) warnings.push(`compids.txt references object ${id} which is not a Competition (type 3).`);
    }
    for (const id of type3Ids) {
      if (!compIdsSet.has(id)) warnings.push(`compobj.txt contains Competition ${id} that is missing from compids.txt.`);
    }
    return warnings;
  }

  get standingsPreview(): string[] {
    return this.project.standings
      .slice()
      .sort((a, b) => {
        if (a.groupId !== b.groupId) {
          const idxA = this.project.objects.findIndex(o => o.id === a.groupId);
          const idxB = this.project.objects.findIndex(o => o.id === b.groupId);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.groupId - b.groupId;
        }
        return a.position - b.position;
      })
      .map(s => `${s.groupId},${s.position}`);
  }

  get standingsWarnings(): string[] {
    const warnings: string[] = [];
    const allObjectIds = new Set(this.project.objects.map(o => o.id));
    const allType5Ids = new Set(this.project.objects.filter(o => o.kind === 5).map(o => o.id));
    const duplicateOrphanCheck = new Set<number>();
    
    this.project.standings.forEach(s => {
      if (!allObjectIds.has(s.groupId)) {
        if (!duplicateOrphanCheck.has(s.groupId)) {
          duplicateOrphanCheck.add(s.groupId);
          warnings.push(`standing groupObjectId ${s.groupId} not found in compobj`);
        }
      } else if (!allType5Ids.has(s.groupId)) {
        if (!duplicateOrphanCheck.has(s.groupId)) {
          duplicateOrphanCheck.add(s.groupId);
          warnings.push(`standing groupObjectId ${s.groupId} points to an object that is not a group/slot (type 5)`);
        }
      }
    });

    return warnings;
  }

  get initteamsPreview(): string[] {
    return this.project.initTeams
      .slice()
      .sort((a, b) => {
        if (a.competitionId !== b.competitionId) {
          const idxA = this.project.objects.findIndex(o => o.id === a.competitionId);
          const idxB = this.project.objects.findIndex(o => o.id === b.competitionId);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.competitionId - b.competitionId;
        }
        return a.position - b.position;
      })
      .map(t => `${t.competitionId},${t.position},${t.teamId}`);
  }

  get initteamsWarnings(): string[] {
    const warnings: string[] = [];
    const allObjectIds = new Set(this.project.objects.map(o => o.id));
    const duplicateOrphanCheck = new Set<number>();
    
    this.project.initTeams.forEach(t => {
      if (!allObjectIds.has(t.competitionId)) {
        if (!duplicateOrphanCheck.has(t.competitionId)) {
          duplicateOrphanCheck.add(t.competitionId);
          warnings.push(`initteams competitionId ${t.competitionId} not found in compobj`);
        }
      }
    });

    return warnings;
  }

  get schedulePreview(): string[] {
    return this.project.schedules.map((schedule) => [schedule.objectId, schedule.day, schedule.round, schedule.minGames, schedule.maxGames, schedule.time].join(","));
  }

  get specificSchedulePreview(): Array<{ fileName: string; lines: string[] }> {
    return (this.project.specificSchedules ?? []).map((file) => ({
      fileName: `schedules/${file.fileName}`,
      lines: file.fixtures.map((fixture) => [fixture.date, fixture.time, fixture.homeTeamId, fixture.awayTeamId].join(","))
    }));
  }
}
