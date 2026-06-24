import { Injectable } from "@angular/core";
import type { CompdataCompetitionSummary, CompdataObject, CompdataProject, DbProject } from "../../../shared/types";
import { CompObjDisplayService } from "./compobj-display.service";
import { CompObjTreeService } from "./compobj-tree.service";

export type ValidationSeverity = "error" | "warning" | "success";

export interface CompObjValidationIssue {
  severity: ValidationSeverity;
  message: string;
  technical?: string;
}

interface ValidationCache {
  reference?: DbProject;
  objectsReference: CompdataObject[];
  objectCount: number;
  issuesByTournament: Map<number, CompObjValidationIssue[]>;
}

@Injectable({ providedIn: "root" })
export class CompObjValidationService {
  private readonly caches = new WeakMap<CompdataProject, ValidationCache>();

  constructor(
    private readonly tree: CompObjTreeService,
    private readonly display: CompObjDisplayService
  ) {}

  invalidate(project: CompdataProject): void {
    this.caches.delete(project);
  }

  invalidateTournament(project: CompdataProject, tournamentId: number): void {
    const cache = this.caches.get(project);
    if (!cache) return;
    cache.objectsReference = project.objects;
    cache.objectCount = project.objects.length;
    cache.issuesByTournament.delete(tournamentId);
  }

  prime(project: CompdataProject, reference?: DbProject): void {
    project.competitions.forEach((competition) => this.validateTournament(project, competition, reference));
  }

  validateTournament(project: CompdataProject, competition: CompdataCompetitionSummary, reference?: DbProject): CompObjValidationIssue[] {
    let cache = this.caches.get(project);
    if (!cache || cache.reference !== reference || cache.objectsReference !== project.objects || cache.objectCount !== project.objects.length) {
      cache = {
        reference,
        objectsReference: project.objects,
        objectCount: project.objects.length,
        issuesByTournament: new Map<number, CompObjValidationIssue[]>()
      };
      this.caches.set(project, cache);
    }
    const cachedIssues = cache.issuesByTournament.get(competition.id);
    if (cachedIssues) return cachedIssues;

    const issues: CompObjValidationIssue[] = [];
    const tournament = this.display.object(project, competition.id);
    if (!tournament) return [{ severity: "error", message: "The tournament object does not exist.", technical: `objectId ${competition.id} was not found.` }];

    this.validateObject(project, tournament, issues);
    const duplicateIds = [...new Set(this.tree.tournamentObjects(project, tournament.id).map((object) => object.id))]
      .filter((id) => this.tree.idCount(project, id) > 1);
    duplicateIds.forEach((id) => issues.push({ severity: "error", message: "An item uses an ID that is already in use.", technical: `objectId ${id} is duplicated.` }));

    const phases = this.tree.phases(project, tournament.id);
    if (!phases.length) issues.push({ severity: "warning", message: "This tournament has no phases." });
    phases.forEach((phase) => {
      this.validateObject(project, phase, issues);
      if (!this.tree.groups(project, phase.id).length) issues.push({ severity: "warning", message: `${this.display.phaseInfo(phase.description).label} has no groups or match slots.`, technical: `Stage ${phase.id} has no type 5 children.` });
      this.tree.groups(project, phase.id).forEach((group) => this.validateObject(project, group, issues));
    });

    if (reference && tournament.description && !this.display.hasResolvedText(reference, tournament.description)) {
      issues.push({ severity: "warning", message: "The localization key was not found in the loaded language files.", technical: tournament.description });
    }
    cache.issuesByTournament.set(competition.id, issues);
    return issues;
  }

  warningCount(project: CompdataProject, competition: CompdataCompetitionSummary, reference?: DbProject): number {
    return this.validateTournament(project, competition, reference).filter((issue) => issue.severity !== "success").length;
  }

  status(project: CompdataProject, competition: CompdataCompetitionSummary, reference?: DbProject): "OK" | "Warning" | "Error" {
    const issues = this.validateTournament(project, competition, reference);
    if (issues.some((issue) => issue.severity === "error")) return "Error";
    if (issues.some((issue) => issue.severity === "warning")) return "Warning";
    return "OK";
  }

  private validateObject(project: CompdataProject, object: CompdataObject, issues: CompObjValidationIssue[]): void {
    if (object.kind > 0 && !this.tree.object(project, object.parentId)) {
      issues.push({ severity: "error", message: "This item belongs to something that does not exist.", technical: `parentId ${object.parentId} was not found for objectId ${object.id}.` });
    }
  }
}
