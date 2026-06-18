import { CommonModule } from "@angular/common";
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from "@angular/core";
import type { VisualDependenciesStatus, VisualDependencyProgress } from "../../../shared/types";
import type { DbMasterApi } from "../../services/dbmaster-api";

@Component({
  selector: "app-visual-dependency-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./visual-dependency-modal.component.html",
  encapsulation: ViewEncapsulation.None
})
export class VisualDependencyModalComponent implements OnInit, OnDestroy {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly api: DbMasterApi = window.dbmaster;
  private removeVisualDependencyProgressListener?: () => void;

  installing = false;
  status?: VisualDependenciesStatus;
  progress?: VisualDependencyProgress;
  message = "";
  error = "";

  constructor(private readonly changeDetector: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.removeVisualDependencyProgressListener = this.api.onVisualDependenciesProgress((progress) => {
      this.progress = progress;
      this.message = progress.message;
      this.changeDetector.detectChanges();
    });
    void this.loadStatus();
  }

  ngOnDestroy(): void {
    this.removeVisualDependencyProgressListener?.();
  }

  get progressPercent(): number {
    return Math.max(0, Math.min(100, Math.round(this.progress?.percent ?? 0)));
  }

  get primaryActionLabel(): string {
    if (this.status?.allCurrent) {
      return "Done";
    }
    if (this.installing) {
      return "Downloading...";
    }
    if (this.status?.dependencies.some((dependency) => dependency.updateAvailable)) {
      return "Update";
    }
    if (this.status?.allInstalled) {
      return "Check";
    }
    return "Download";
  }

  async loadStatus(): Promise<void> {
    try {
      this.status = await this.api.getVisualDependenciesStatus();
      this.progress = undefined;
      const hasUpdate = this.status.dependencies.some((dependency) => dependency.updateAvailable);
      this.message = this.status.allCurrent
        ? "Visual dependencies are already installed."
        : hasUpdate
          ? "A newer visual dependency package is available."
          : "Visual dependencies are optional and can be downloaded now.";
      
      if (this.status.allCurrent) {
        this.visible = false;
        this.visibleChange.emit(false);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  async install(): Promise<void> {
    this.installing = true;
    this.error = "";
    this.message = "Downloading visual dependencies";
    this.progress = {
      id: "visual-dependencies",
      label: "Visual dependencies",
      phase: "queued",
      receivedBytes: 0,
      percent: 0,
      message: "Preparing visual dependency download"
    };
    try {
      const result = await this.api.installVisualDependencies();
      this.status = result;
      this.message = result.warnings.length > 0
        ? `Installed with ${result.warnings.length} warning(s).`
        : result.installed.length > 0
          ? `Installed ${result.installed.length} visual package(s).`
          : result.skipped.length > 0
            ? "Visual packages are already up to date."
            : "No visual packages needed downloading.";
      if (result.warnings.length > 0) {
        this.error = result.warnings.join(" ");
      }
      const dependency = result.dependencies.find((candidate) => candidate.id === result.installed[0]) ?? result.dependencies[0];
      this.progress = {
        id: dependency?.id ?? "visual-dependencies",
        label: dependency?.label ?? "Visual dependencies",
        phase: result.warnings.length > 0 ? "error" : "installed",
        receivedBytes: 0,
        percent: result.warnings.length > 0 ? this.progressPercent : 100,
        message: this.message
      };
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.message = "Visual dependency download failed";
      this.progress = {
        id: this.progress?.id ?? "visual-dependencies",
        label: this.progress?.label ?? "Visual dependencies",
        phase: "error",
        receivedBytes: 0,
        percent: this.progressPercent,
        message: this.message
      };
    } finally {
      this.installing = false;
    }
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  formatPath(path?: string): string {
    if (!path) {
      return "";
    }
    // Windows: C:\Users\name\...
    const winMatch = path.match(/^([a-z]:\\Users\\[^\\]+)/i);
    if (winMatch) {
      return path.replace(winMatch[1], "~");
    }
    // Linux: /home/name/...
    const linuxMatch = path.match(/^(\/home\/[^\/]+)/);
    if (linuxMatch) {
      return path.replace(linuxMatch[1], "~");
    }
    // macOS: /Users/name/...
    const macMatch = path.match(/^(\/Users\/[^\/]+)/);
    if (macMatch) {
      return path.replace(macMatch[1], "~");
    }
    return path;
  }
}
