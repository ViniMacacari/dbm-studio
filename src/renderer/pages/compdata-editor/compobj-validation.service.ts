import { Injectable } from "@angular/core";
import type { CompdataCompetitionSummary, CompdataObject, CompdataProject, DbProject } from "../../../shared/types";
import { CompObjDisplayService, CompObjTreeService } from "./compobj-display.service";

export type ValidationSeverity = "error" | "warning" | "success";

export interface CompObjValidationIssue {
  severity: ValidationSeverity;
  message: string;
  technical?: string;
}

@Injectable({ providedIn: "root" })
export class CompObjValidationService {
  constructor(
    private readonly tree: CompObjTreeService,
    private readonly display: CompObjDisplayService
  ) {}

  validateTournament(project: CompdataProject, competition: CompdataCompetitionSummary, reference?: DbProject): CompObjValidationIssue[] {
    const issues: CompObjValidationIssue[] = [];
    const tournament = this.display.object(project, competition.id);
    if (!tournament) return [{ severity: "error", message: "The tournament object does not exist.", technical: `objectId ${competition.id} was not found.` }];

    this.validateObject(project, tournament, issues);
    const duplicateIds = [...new Set(this.tree.tournamentObjects(project, tournament.id).map((object) => object.id))]
      .filter((id) => project.objects.filter((object) => object.id === id).length > 1);
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
    if (object.kind > 0 && !project.objects.some((candidate) => candidate.id === object.parentId)) {
      issues.push({ severity: "error", message: "This item belongs to something that does not exist.", technical: `parentId ${object.parentId} was not found for objectId ${object.id}.` });
    }
  }
}
