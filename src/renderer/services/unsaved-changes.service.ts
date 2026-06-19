import { Injectable } from "@angular/core";
import { ProjectService } from "./project.service";

@Injectable({
  providedIn: "root"
})
export class UnsavedChangesService {
  constructor(private readonly projectService: ProjectService) {}

  hasUnsavedChanges(): boolean {
    const project = this.projectService.project;
    if (!project) {
      return false;
    }

    const mainChanges = project.tables.some((table) => table.changed);
    const locChanges = project.localization?.tables.some((table) => table.changed) ?? false;

    return mainChanges || locChanges;
  }
}
