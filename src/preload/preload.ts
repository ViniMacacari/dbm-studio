import { contextBridge, ipcRenderer } from "electron";
import type { CompdataOpenProgress, CompdataProject, DataTable, DbProject, VisualAssetType, VisualDependencyProgress } from "../shared/types";

contextBridge.exposeInMainWorld("dbmaster", {
  openXml: () => ipcRenderer.invoke("project:openXml"),
  openDatabase: () => ipcRenderer.invoke("project:openDatabase"),
  openDatabaseWithLocalization: () => ipcRenderer.invoke("project:openDatabaseWithLocalization"),
  openTextFolder: () => ipcRenderer.invoke("project:openTextFolder"),
  pickCompdataFolder: () => ipcRenderer.invoke("compdata:pickFolder"),
  openCompdataFolder: (folderPath?: string) => ipcRenderer.invoke("compdata:openFolder", folderPath),
  openCompdataFolderReference: (folderPath: string) => ipcRenderer.invoke("compdata:openFolderReference", folderPath),
  openCompdataLocalizationReference: () => ipcRenderer.invoke("compdata:openLocalizationReference"),
  onCompdataOpenProgress: (listener: (progress: CompdataOpenProgress) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, progress: CompdataOpenProgress) => listener(progress);
    ipcRenderer.on("compdata:progress", subscription);
    return () => ipcRenderer.removeListener("compdata:progress", subscription);
  },
  saveCompdata: (project: CompdataProject) => ipcRenderer.invoke("compdata:save", project),
  saveDatabase: (project: DbProject) => ipcRenderer.invoke("project:saveDatabase", project),
  exportTable: (table: DataTable) => ipcRenderer.invoke("table:export", table),
  exportAll: (project: DbProject) => ipcRenderer.invoke("table:exportAll", project),
  importTable: (expectedName?: string) => ipcRenderer.invoke("table:import", expectedName),
  importAll: () => ipcRenderer.invoke("table:importAll"),
  computeLanguageHashes: (values: string[]) => ipcRenderer.invoke("hash:language", values),
  getTransfermarktPlayerOverall: (playerId: string | number, fifa?: string) =>
    ipcRenderer.invoke("transfermarkt:getPlayerOverall", playerId, fifa),
  searchTransfermarktPlayers: (query: string) =>
    ipcRenderer.invoke("transfermarkt:searchPlayers", query),
  getTransfermarktPlayerProfile: (playerId: string | number) =>
    ipcRenderer.invoke("transfermarkt:getPlayerProfile", playerId),
  detectSkinTone: (imageUrl: string) => ipcRenderer.invoke("skinTone:detect", imageUrl),
  detectBeard: (imageUrl: string) => ipcRenderer.invoke("beard:detect", imageUrl),
  listBig: () => ipcRenderer.invoke("big:list"),
  extractDatabasesFromBig: () => ipcRenderer.invoke("big:extractDatabases"),
  getVisualDependenciesStatus: () => ipcRenderer.invoke("visualDependencies:getStatus"),
  installVisualDependencies: () => ipcRenderer.invoke("visualDependencies:install"),
  onVisualDependenciesProgress: (listener: (progress: VisualDependencyProgress) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, progress: VisualDependencyProgress) => listener(progress);
    ipcRenderer.on("visualDependencies:progress", subscription);
    return () => ipcRenderer.removeListener("visualDependencies:progress", subscription);
  },
  getPlayerMiniface: (playerId: string) => ipcRenderer.invoke("visualDependencies:getMiniface", playerId),
  getTeamCrest: (teamId: string) => ipcRenderer.invoke("visualDependencies:getTeamCrest", teamId),
  getLeagueLogo: (leagueId: string) => ipcRenderer.invoke("visualDependencies:getLeagueLogo", leagueId),
  listAssets: (type: VisualAssetType) => ipcRenderer.invoke("visualDependencies:listAssets", type),
  getVisualAsset: (type: VisualAssetType, assetId: string) => ipcRenderer.invoke("visualDependencies:getAsset", type, assetId)
});
