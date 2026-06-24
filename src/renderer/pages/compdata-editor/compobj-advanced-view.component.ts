import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import type { CompdataObject, CompdataProject, DbProject } from "../../../shared/types";
import { CompObjDisplayService, CompObjTreeService } from "./compobj-display.service";

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
}
