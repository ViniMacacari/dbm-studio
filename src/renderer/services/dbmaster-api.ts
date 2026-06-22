import type {
  CompdataOpenProgress,
  DataTable,
  DbProject,
  LeagueLogoImageResult,
  MinifaceImageResult,
  TeamCrestImageResult,
  VisualDependenciesInstallResult,
  VisualDependenciesStatus,
  VisualAssetType,
  VisualDependencyProgress
} from "../../shared/types";
import type { CompdataProject } from "../../shared/types";
import type { TransfermarktOverallResult } from "../../utils/overall-calculator";
import type { PlayerProfileResponse, PlayerSearchResult } from "../../utils/transfermarkt-services/transfermarkt";
import type { SkinToneResult } from "../../utils/skin-tone-detector/skin-tone-detector";

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
  getTransfermarktPlayerOverall(
    playerId: string | number,
    fifa?: string
  ): Promise<{ result?: TransfermarktOverallResult; error?: string }>;
  searchTransfermarktPlayers(
    query: string
  ): Promise<{ results?: PlayerSearchResult[]; error?: string }>;
  getTransfermarktPlayerProfile(
    playerId: string | number
  ): Promise<{ result?: PlayerProfileResponse; error?: string }>;
  detectSkinTone(imageUrl: string): Promise<{ result?: SkinToneResult; error?: string }>;
  extractDatabasesFromBig(): Promise<{ canceled?: boolean; message?: string; entries?: unknown[]; warnings?: string[] }>;
  getVisualDependenciesStatus(): Promise<VisualDependenciesStatus>;
  installVisualDependencies(): Promise<VisualDependenciesInstallResult>;
  onVisualDependenciesProgress(listener: (progress: VisualDependencyProgress) => void): () => void;
  getPlayerMiniface(playerId: string): Promise<MinifaceImageResult>;
  getTeamCrest(teamId: string): Promise<TeamCrestImageResult>;
  getLeagueLogo(leagueId: string): Promise<LeagueLogoImageResult>;
  listAssets(type: VisualAssetType): Promise<string[]>;
  getVisualAsset(type: VisualAssetType, assetId: string): Promise<{ dataUrl: string; found: boolean }>;
}

declare global {
  interface Window {
    dbmaster: DbMasterApi;
  }
}
