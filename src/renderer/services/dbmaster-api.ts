import type {
  CompdataOpenProgress,
  DataTable,
  DbProject,
  LeagueLogoImageResult,
  MinifaceImageResult,
  TeamCrestImageResult,
  VisualDependenciesInstallResult,
  VisualDependenciesStatus,
  VisualDependencyProgress
} from "../../shared/types";
import type { CompdataProject } from "../../shared/types";

export interface DbMasterApi {
  openXml(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openDatabase(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openDatabaseWithLocalization(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  openTextFolder(): Promise<{ canceled?: boolean; project?: DbProject; error?: string }>;
  pickCompdataFolder(): Promise<{ canceled?: boolean; folderPath?: string; error?: string }>;
  openCompdataFolder(folderPath?: string): Promise<{ canceled?: boolean; projectJson?: string; error?: string }>;
  openCompdataFolderReference(folderPath: string): Promise<{ referenceProject?: DbProject; warnings: string[]; error?: string }>;
  openCompdataLocalizationReference(): Promise<{ canceled?: boolean; referenceProject?: DbProject; warnings: string[]; error?: string }>;
  onCompdataOpenProgress(listener: (progress: CompdataOpenProgress) => void): () => void;
  saveCompdata(project: CompdataProject): Promise<{ folderPath: string; filesWritten: number; warnings: string[] }>;
  saveDatabase(project: DbProject): Promise<{ filePath: string; backupPath?: string; warnings: string[]; tablesWritten: number; localizationSkipped?: boolean }>;
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
  getLeagueLogo(leagueId: string): Promise<LeagueLogoImageResult>;
  listAssets(type: "hairs" | "beards"): Promise<string[]>;
  getHairBeardAsset(type: "hairs" | "beards", assetId: string): Promise<{ dataUrl: string; found: boolean }>;
}

declare global {
  interface Window {
    dbmaster: DbMasterApi;
  }
}
