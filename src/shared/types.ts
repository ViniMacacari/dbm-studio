export type FieldKind =
  | "integer"
  | "float"
  | "string"
  | "shortCompressedString"
  | "longCompressedString"
  | "unknown";

export interface FieldDescriptor {
  name: string;
  shortName?: string;
  kind: FieldKind;
  rangeLow: number;
  rangeHigh: number;
  depth?: number;
  bitOffset?: number;
  dbFieldType?: number;
  order?: number;
  raw?: Record<string, unknown>;
}

export interface TableDescriptor {
  name: string;
  shortName?: string;
  fields: FieldDescriptor[];
  recordCount?: number;
  maxInsert?: number;
  maxDelete?: number;
  offset?: number;
  recordSizeBits?: number;
  raw?: Record<string, unknown>;
}

export interface DataTable {
  name: string;
  columns: string[];
  fields: FieldDescriptor[];
  rows: string[][];
  changed?: boolean;
  warning?: string;
}

export interface DbProject {
  title: string;
  sourceKind: "database" | "xml" | "text-folder" | "snapshot";
  xmlPath?: string;
  dbPath?: string;
  folderPath?: string;
  tables: DataTable[];
  descriptors: TableDescriptor[];
  warnings: string[];
  binaryReadMode?: "none" | "descriptor" | "best-effort";
}

export interface OpenResult {
  canceled?: boolean;
  project?: DbProject;
  warnings?: string[];
  error?: string;
}

export interface BigEntry {
  name: string;
  offset: number;
  size: number;
  compressed: boolean;
}

export interface BigExtractResult {
  canceled?: boolean;
  archivePath?: string;
  outputFolder?: string;
  entries: BigEntry[];
  warnings: string[];
}

export interface VisualDependencyStatus {
  id: string;
  label: string;
  fileName: string;
  downloadUrl: string;
  targetPath: string;
  installed: boolean;
  downloaded: boolean;
  current: boolean;
  updateAvailable: boolean;
  filesCount: number;
  downloadedSize: number;
  recordedDownloadedSize?: number;
  remoteSize?: number;
  remoteCheckError?: string;
}

export interface VisualDependenciesStatus {
  rootPath: string;
  dependencies: VisualDependencyStatus[];
  allInstalled: boolean;
  allCurrent: boolean;
}

export interface VisualDependenciesInstallResult extends VisualDependenciesStatus {
  installed: string[];
  skipped: string[];
  warnings: string[];
}

export interface VisualDependencyProgress {
  id: string;
  label: string;
  phase: "queued" | "downloading" | "extracting" | "installed" | "error";
  receivedBytes: number;
  totalBytes?: number;
  percent: number;
  message: string;
}

export interface MinifaceImageResult {
  playerId: string;
  dataUrl: string;
  found: boolean;
  source: "player" | "generic" | "missing";
}

export interface TeamCrestImageResult {
  teamId: string;
  dataUrl: string;
  found: boolean;
  source: "team" | "missing";
}
