import { contextBridge, ipcRenderer } from "electron";
import type { CompdataProject, DataTable, DbProject, VisualDependencyProgress } from "../shared/types";

contextBridge.exposeInMainWorld("dbmaster", {
  openXml: () => ipcRenderer.invoke("project:openXml"),
  openDatabase: () => ipcRenderer.invoke("project:openDatabase"),
  openDatabaseWithLocalization: () => ipcRenderer.invoke("project:openDatabaseWithLocalization"),
  openTextFolder: () => ipcRenderer.invoke("project:openTextFolder"),
  openCompdataFolder: () => ipcRenderer.invoke("compdata:openFolder"),
  openCompdataFolderReference: (folderPath: string) => ipcRenderer.invoke("compdata:openFolderReference", folderPath),
  saveCompdata: (project: CompdataProject) => ipcRenderer.invoke("compdata:save", project),
  saveDatabase: (project: DbProject) => ipcRenderer.invoke("project:saveDatabase", project),
  exportTable: (table: DataTable) => ipcRenderer.invoke("table:export", table),
  exportAll: (project: DbProject) => ipcRenderer.invoke("table:exportAll", project),
  importTable: (expectedName?: string) => ipcRenderer.invoke("table:import", expectedName),
  importAll: () => ipcRenderer.invoke("table:importAll"),
  computeLanguageHashes: (values: string[]) => ipcRenderer.invoke("hash:language", values),
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
  getTeamCrest: (teamId: string) => ipcRenderer.invoke("visualDependencies:getTeamCrest", teamId)
});
