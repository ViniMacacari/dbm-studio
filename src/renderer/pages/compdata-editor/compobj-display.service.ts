import { Injectable } from "@angular/core";
import type { CompdataCompetitionSummary, CompdataObject, CompdataProject, DbProject } from "../../../shared/types";
import { LocalizationService } from "../../services/localization.service";

export interface PhaseDisplayInfo {
  key: string;
  label: string;
  description: string;
  knockout: boolean;
}

export interface CompObjTreeRow {
  object: CompdataObject;
  depth: number;
}

export const PHASE_OPTIONS: PhaseDisplayInfo[] = [
  { key: "FCE_Setup_Stage", label: "Team Setup Phase", description: "Preparation phase used to organize teams before the real tournament phases.", knockout: false },
  { key: "FCE_Setup_Stage_2", label: "Team Setup Phase 2", description: "Second preparation phase used to organize teams.", knockout: false },
  { key: "FCE_League_Stage", label: "League Phase", description: "Teams usually play in a league table format.", knockout: false },
  { key: "FCE_Group_Stage", label: "Group Phase", description: "Teams are split into groups.", knockout: false },
  { key: "FCE_Group_Stage_Setup", label: "Group Stage Setup", description: "Preparation phase for group stage.", knockout: false },
  { key: "FCE_Round_1", label: "First Round", description: "Knockout round.", knockout: true },
  { key: "FCE_Round_2", label: "Second Round", description: "Knockout round.", knockout: true },
  { key: "FCE_Round_3", label: "Third Round", description: "Knockout round.", knockout: true },
  { key: "FCE_Round_4", label: "Fourth Round", description: "Knockout round.", knockout: true },
  { key: "FCE_Round_5", label: "Fifth Round", description: "Knockout round.", knockout: true },
  { key: "FCE_Round_of_32", label: "Round of 32", description: "Knockout phase with 32 teams or slots.", knockout: true },
  { key: "FCE_Round_of_16", label: "Round of 16", description: "Knockout phase with 16 teams or slots.", knockout: true },
  { key: "FCE_Quarter_Final", label: "Quarter Finals", description: "Knockout quarter-final phase.", knockout: true },
  { key: "FCE_Quarter_Finals", label: "Quarter Finals", description: "Knockout quarter-final phase.", knockout: true },
  { key: "FCE_Semi_Final", label: "Semi Finals", description: "Knockout semi-final phase.", knockout: true },
  { key: "FCE_Semi_Finals", label: "Semi Finals", description: "Knockout semi-final phase.", knockout: true },
  { key: "FCE_Final", label: "Final", description: "Final match of the tournament.", knockout: true },
  { key: "FCE_Third_Place", label: "Third Place Match", description: "Match that decides third place.", knockout: true },
  { key: "Friendly", label: "Friendly", description: "Friendly match or phase.", knockout: false }
];

@Injectable({ providedIn: "root" })
export class CompObjDisplayService {
  constructor(private readonly localization: LocalizationService) {}

  object(project: CompdataProject | undefined, id: number): CompdataObject | undefined {
    return project?.objects.find((candidate) => candidate.id === id);
  }

  resolvedText(reference: DbProject | undefined, key: string): string {
    const normalizedKey = key.trim();
    if (!normalizedKey) return "";
    for (const table of reference?.localization?.tables ?? []) {
      const stringIdColumn = table.columns.findIndex((column) => column.toLowerCase() === "stringid");
      const sourceTextColumn = table.columns.findIndex((column) => column.toLowerCase() === "sourcetext");
      if (stringIdColumn < 0 || sourceTextColumn < 0) continue;
      const row = table.rows.find((candidate) => candidate[stringIdColumn]?.trim().toLowerCase() === normalizedKey.toLowerCase());
      const resolved = row?.[sourceTextColumn]?.trim();
      if (resolved) return resolved;
    }
    return this.localization.resolveString(reference, normalizedKey, normalizedKey).trim();
  }

  hasResolvedText(reference: DbProject | undefined, key: string): boolean {
    return Boolean(key.trim() && this.resolvedText(reference, key) !== key.trim());
  }

  objectName(object: CompdataObject | undefined, reference?: DbProject, project?: CompdataProject): string {
    if (!object) return "Unknown item";
    if (object.kind === 4) return this.phaseInfo(object.description).label;
    if (object.kind === 5) return this.childLabel(object, project);
    const resolved = this.resolvedText(reference, object.description);
    if (resolved && resolved !== object.description) return resolved;
    if (object.kind === 3) return this.looksTechnical(object.description) ? `Tournament ${object.id}` : (object.description || `Tournament ${object.id}`);
    return resolved || object.shortName || this.typeLabel(object.kind);
  }

  phaseInfo(key: string): PhaseDisplayInfo {
    const known = PHASE_OPTIONS.find((option) => option.key === key);
    if (known) return known;
    const label = key
      .replace(/^FCE_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Custom Phase";
    return { key, label, description: "Custom tournament phase.", knockout: /Round|Final|Place/i.test(key) };
  }

  isKnockoutPhase(phase: CompdataObject): boolean {
    return this.phaseInfo(phase.description).knockout;
  }

  isGroupPhase(phase: CompdataObject): boolean {
    return ["FCE_League_Stage", "FCE_Group_Stage", "FCE_Apertura", "FCE_Clausura"].includes(phase.description);
  }

  childNoun(phase: CompdataObject, count = 1): string {
    if (phase.description === "FCE_Final") return count === 1 ? "final match" : "final matches";
    if (this.isKnockoutPhase(phase)) return count === 1 ? "match slot" : "match slots";
    if (this.isGroupPhase(phase)) return count === 1 ? "group" : "groups";
    return count === 1 ? "slot" : "slots";
  }

  childLabel(child: CompdataObject, project?: CompdataProject): string {
    const parent = this.object(project, child.parentId);
    const number = /\d+/.exec(child.shortName)?.[0] ?? "1";
    const described = /^FCE_Group_([A-Z0-9]+)$/i.exec(child.description);
    if (parent?.description === "FCE_Final") return "Final match";
    if (parent && this.isKnockoutPhase(parent)) return `Match slot ${number}`;
    if (parent && this.isGroupPhase(parent)) return described ? `Group ${described[1].toUpperCase()}` : `Group ${number}`;
    return `Slot ${number}`;
  }

  parentName(object: CompdataObject, project: CompdataProject, reference?: DbProject): string {
    return this.objectName(this.object(project, object.parentId), reference, project);
  }

  locationName(competition: CompdataCompetitionSummary, project: CompdataProject, reference?: DbProject): string {
    return this.parentName(this.object(project, competition.id)!, project, reference);
  }

  locationCategory(competition: CompdataCompetitionSummary, project: CompdataProject): "countries" | "continental" | "world" {
    const parent = this.object(project, competition.parentId);
    if (parent?.kind === 2) return "countries";
    if (parent?.kind === 1) return "continental";
    return "world";
  }

  typeLabel(kind: number): string {
    return ({ 0: "World/FIFA", 1: "Confederation", 2: "Country", 3: "Competition", 4: "Stage", 5: "Group" } as Record<number, string>)[kind] ?? "Object";
  }

  rawLine(object: CompdataObject): string {
    return [object.id, object.kind, object.shortName, object.description, object.parentId].join(",");
  }

  private looksTechnical(value: string): boolean {
    return /^(FCE_|TrophyName_|[A-Z]\d+$)/.test(value);
  }
}

@Injectable({ providedIn: "root" })
export class CompObjTreeService {
  children(project: CompdataProject, parentId: number, kind?: number): CompdataObject[] {
    return project.objects.filter((object) => object.parentId === parentId && (kind === undefined || object.kind === kind));
  }

  phases(project: CompdataProject, tournamentId: number): CompdataObject[] {
    return this.children(project, tournamentId, 4);
  }

  groups(project: CompdataProject, phaseId: number): CompdataObject[] {
    return this.children(project, phaseId, 5);
  }

  tournamentObjects(project: CompdataProject, tournamentId: number): CompdataObject[] {
    const ids = new Set<number>();
    const visit = (id: number): void => {
      if (ids.has(id)) return;
      ids.add(id);
      this.children(project, id).forEach((child) => visit(child.id));
    };
    visit(tournamentId);
    return project.objects.filter((object) => ids.has(object.id));
  }

  fullTree(project: CompdataProject): CompObjTreeRow[] {
    const byParent = new Map<number, CompdataObject[]>();
    const ids = new Set(project.objects.map((object) => object.id));
    project.objects.forEach((object) => byParent.set(object.parentId, [...(byParent.get(object.parentId) ?? []), object]));
    const rows: CompObjTreeRow[] = [];
    const visited = new Set<number>();
    const append = (object: CompdataObject, depth: number): void => {
      if (visited.has(object.id)) return;
      visited.add(object.id);
      rows.push({ object, depth });
      (byParent.get(object.id) ?? []).forEach((child) => append(child, depth + 1));
    };
    project.objects.filter((object) => !ids.has(object.parentId)).forEach((root) => append(root, 0));
    project.objects.filter((object) => !visited.has(object.id)).forEach((root) => append(root, 0));
    return rows;
  }
}
