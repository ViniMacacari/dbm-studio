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
      this.tree.groups(project, phase.id).forEach((group) => {
        this.validateObject(project, group, issues);
        
        const groupStandings = project.standings.filter(s => s.groupId === group.id);
        const positionCount = groupStandings.length;
        
        if (positionCount === 0) {
          issues.push({ severity: "warning", message: "A group or match slot has no teams/positions defined in standings.", technical: `Group/Slot ${group.id} has no standings.` });
        } else {
          const uniquePositions = new Set(groupStandings.map(s => s.position));
          if (uniquePositions.size !== positionCount) {
            issues.push({ severity: "error", message: "This group has duplicated team positions.", technical: `duplicate position for group ${group.id}` });
          }
          
          const sortedPositions = [...uniquePositions].sort((a, b) => a - b);
          if (sortedPositions[0] !== 0) {
            issues.push({ severity: "error", message: "Positions must start at 0.", technical: `Group/Slot ${group.id} positions start at ${sortedPositions[0]}.` });
          } else if (sortedPositions[sortedPositions.length - 1] !== sortedPositions.length - 1) {
            issues.push({ severity: "error", message: "Positions are not sequential.", technical: `Group/Slot ${group.id} positions are missing some numbers.` });
          }
        }
        
        const isKnockout = this.display.isKnockoutPhase(phase) || phase.description.includes("Final");
        const isLeague = this.display.isGroupPhase(phase);
        
        if (isKnockout && positionCount !== 2 && positionCount > 0) {
          issues.push({ severity: "warning", message: "Match slots should have exactly 2 positions.", technical: `Match slot ${group.id} has ${positionCount} positions.` });
        }
        
        if (isLeague && positionCount < 2 && positionCount > 0) {
          issues.push({ severity: "warning", message: "Groups should have at least 2 positions.", technical: `Group ${group.id} has ${positionCount} positions.` });
        }
      });
    });

    if (reference && tournament.description && !this.display.hasResolvedText(reference, tournament.description)) {
      issues.push({ severity: "warning", message: "The localization key was not found in the loaded language files.", technical: tournament.description });
    }

    const allObjectIds = new Set(project.objects.map(o => o.id));
    const allType5Ids = new Set(project.objects.filter(o => o.kind === 5).map(o => o.id));
    const duplicateOrphanCheck = new Set<number>();
    
    project.standings.forEach(s => {
      if (!allObjectIds.has(s.groupId)) {
        if (!duplicateOrphanCheck.has(s.groupId)) {
          duplicateOrphanCheck.add(s.groupId);
          issues.push({ severity: "error", message: "This standings entry points to a group/slot that does not exist anymore.", technical: `standing groupObjectId ${s.groupId} not found` });
        }
      } else if (!allType5Ids.has(s.groupId)) {
        if (!duplicateOrphanCheck.has(s.groupId)) {
          duplicateOrphanCheck.add(s.groupId);
          issues.push({ severity: "error", message: "This standings entry points to an object that is not a group/slot.", technical: `standing groupObjectId ${s.groupId} is not type 5` });
        }
      }
    });

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
