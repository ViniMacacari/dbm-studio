import { contextBridge, ipcRenderer } from "electron";
import type { DataTable, DbProject } from "../shared/types";

contextBridge.exposeInMainWorld("dbmaster", {
  openXml: () => ipcRenderer.invoke("project:openXml"),
  openDatabase: () => ipcRenderer.invoke("project:openDatabase"),
  openTextFolder: () => ipcRenderer.invoke("project:openTextFolder"),
  saveDatabase: (project: DbProject) => ipcRenderer.invoke("project:saveDatabase", project),
  exportTable: (table: DataTable) => ipcRenderer.invoke("table:export", table),
  exportAll: (project: DbProject) => ipcRenderer.invoke("table:exportAll", project),
  importTable: (expectedName?: string) => ipcRenderer.invoke("table:import", expectedName),
  importAll: () => ipcRenderer.invoke("table:importAll"),
  computeLanguageHashes: (values: string[]) => ipcRenderer.invoke("hash:language", values),
  listBig: () => ipcRenderer.invoke("big:list"),
  extractDatabasesFromBig: () => ipcRenderer.invoke("big:extractDatabases")
});
