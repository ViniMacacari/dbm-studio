import type {
  DataTable,
  DbProject,
  MinifaceImageResult,
  TeamCrestImageResult,
  VisualDependenciesInstallResult,
  VisualDependenciesStatus,
  VisualDependencyProgress
} from "../../shared/types";

export interface DbMasterApi {
  openXml(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openDatabase(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openTextFolder(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  saveDatabase(project: DbProject): Promise<{ filePath: string; backupPath?: string; warnings: string[]; tablesWritten: number }>;
  exportTable(table: DataTable): Promise<{ canceled?: boolean; filePath?: string }>;
  exportAll(project: DbProject): Promise<{ canceled?: boolean; folderPath?: string; count?: number }>;
  importTable(expectedName?: string): Promise<{ canceled?: boolean; table?: DataTable }>;
  importAll(): Promise<{ canceled?: boolean; project?: DbProject }>;
  computeLanguageHashes(values: string[]): Promise<number[]>;
  extractDatabasesFromBig(): Promise<{ canceled?: boolean; message?: string; entries?: unknown[]; warnings?: string[] }>;
  getVisualDependenciesStatus(): Promise<VisualDependenciesStatus>;
  installVisualDependencies(): Promise<VisualDependenciesInstallResult>;
  onVisualDependenciesProgress(listener: (progress: VisualDependencyProgress) => void): () => void;
  getPlayerMiniface(playerId: string): Promise<MinifaceImageResult>;
  getTeamCrest(teamId: string): Promise<TeamCrestImageResult>;
}

declare global {
  interface Window {
    dbmaster: DbMasterApi;
  }
}
