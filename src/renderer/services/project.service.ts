import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import type { DbProject } from "../../shared/types";
import type { DbMasterApi } from "./dbmaster-api";
import { LeagueEditorService } from "./league-editor.service";
import { NationService } from "./nation.service";
import { PlayerEditorService } from "./player-editor.service";
import { TeamEditorService } from "./team-editor.service";
import { ToastService } from "./toast.service";
import { LoadingService } from "./loading.service";

@Injectable({
  providedIn: "root"
})
export class ProjectService {
  private readonly api: DbMasterApi = window.dbmaster;
  private readonly minimumLoadingDurationMs = 400;

  project?: DbProject;
  project$ = new BehaviorSubject<DbProject | undefined>(undefined);
  statusLine = "Ready";

  constructor(
    private readonly leagueEditor: LeagueEditorService,
    private readonly nations: NationService,
    private readonly playerEditor: PlayerEditorService,
    private readonly teamEditor: TeamEditorService,
    private readonly toastService: ToastService,
    private readonly loadingService: LoadingService
  ) {}

  get projectSubtitle(): string {
    if (!this.project) {
      return "No project loaded";
    }
    const mode = this.project.binaryReadMode && this.project.binaryReadMode !== "none" ? ` / ${this.project.binaryReadMode}` : "";
    const localization = this.project.localization ? " / loc" : "";
    return `${this.project.title} / ${this.project.sourceKind}${mode}${localization}`;
  }

  get hasProject(): boolean {
    return Boolean(this.project);
  }

  get canSaveDatabase(): boolean {
    return this.project?.sourceKind === "database" && this.project.databaseWritable === true && Boolean(this.project.dbPath);
  }

  get tableCount(): number {
    return this.project?.tables.length ?? 0;
  }

  loadProject(project: DbProject): void {
    this.project = project;
    this.project$.next(project);
    this.leagueEditor.invalidateProject(project);
    this.nations.invalidateProject(project);
    this.playerEditor.invalidateProject(project);
    this.teamEditor.invalidateProject(project);
    if (project.warnings.length > 0) {
      this.toastService.show(project.warnings[0], "warn");
    }
    this.statusLine = project.warnings.length > 0 
      ? `${project.title} loaded with ${project.warnings.length} warning(s)` 
      : `${project.title} loaded`;
  }

  async openDatabase(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openDatabase();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Opening database", "Reading XML and DB tables");
  }

  async openDatabaseWithLocalization(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openDatabaseWithLocalization();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Opening database and language files", "Reading main DB/XML and loc DB/XML");
  }

  async openXml(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openXml();
      if (result.project) {
        this.loadProject(result.project);
      }
    });
  }

  async openTextFolder(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.openTextFolder();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Opening text tables", "Reading exported .txt files");
  }

  async saveProject(title = "Saving database", detail = "Writing .db file and backup"): Promise<void> {
    await this.guarded(async () => {
      if (!this.project) {
        return;
      }
      const result = await this.api.saveDatabase(this.project);
      if (result.filePath) {
        if (result.tablesWritten === 0) {
          const warning = result.warnings[0];
          if (warning) {
            this.toastService.show(warning, "warn");
            this.statusLine = warning;
          } else {
            this.statusLine = "No changes to save";
          }
          return;
        }
        for (const table of this.project.tables) {
          table.changed = false;
        }
        if (!result.localizationSkipped) {
          for (const table of this.project.localization?.tables ?? []) {
            table.changed = false;
          }
        }
        const warnings = result.warnings.length > 0 ? ` ${result.warnings.length} warning(s).` : "";
        if (result.warnings.length > 0) {
          console.warn("[saveProject] Warnings during save:");
          for (const w of result.warnings) {
            console.warn(` - ${w}`);
          }
        }
        if (result.localizationSkipped && result.warnings.length > 0) {
          this.toastService.show(result.warnings[result.warnings.length - 1], "warn");
        }
        this.statusLine = `${result.tablesWritten} table(s) saved to DB.${warnings}`;
      }
    }, title, detail);
  }

  async exportAll(): Promise<void> {
    await this.guarded(async () => {
      if (!this.project) {
        return;
      }
      const result = await this.api.exportAll(this.project);
      if (result.folderPath) {
        this.statusLine = `${result.count ?? 0} table(s) exported`;
      }
    }, "Exporting tables", "Writing .txt files");
  }

  async importAll(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.importAll();
      if (result.project) {
        this.loadProject(result.project);
      }
    }, "Importing tables", "Reading .txt files");
  }

  async extractBig(): Promise<void> {
    await this.guarded(async () => {
      const result = await this.api.extractDatabasesFromBig();
      if (!result.canceled) {
        const warnings = result.warnings?.length ? ` ${result.warnings.length} warning(s).` : "";
        this.toastService.show(`${result.message ?? "Extraction complete."}${warnings}`, result.warnings?.length ? "warn" : "info");
      }
    });
  }

  private async guarded(action: () => Promise<void>, title?: string, detail?: string): Promise<void> {
    let loadingStartedAt = 0;
    try {
      if (title) {
        this.loadingService.show(title, detail ?? "Please wait");
        loadingStartedAt = performance.now();
      }
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.toastService.show(message, "error");
      this.statusLine = "Error";
    } finally {
      if (title) {
        const elapsed = performance.now() - loadingStartedAt;
        const remaining = Math.max(0, this.minimumLoadingDurationMs - elapsed);
        if (remaining > 0) {
          await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
        }
        this.loadingService.hide();
      }
    }
  }
}
