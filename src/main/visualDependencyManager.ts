import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { Agent as HttpAgent, get, request as requestHttp, type IncomingMessage, type RequestOptions } from "node:http";
import { Agent as HttpsAgent, get as getSecure, request as requestSecure } from "node:https";
import { basename, dirname, extname, join, normalize, resolve, sep } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { inflateRawSync } from "node:zlib";
import { AppConfig, type VisualDependencyConfig } from "../app-config";
import type {
  MinifaceImageResult,
  TeamCrestImageResult,
  VisualDependenciesInstallResult,
  VisualDependenciesStatus,
  VisualDependencyProgress,
  VisualDependencyStatus
} from "../shared/types";

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
}

interface RgbaImage {
  width: number;
  height: number;
  pixels: Uint8Array;
}

interface RemoteFileInfo {
  size?: number;
  etag?: string;
  lastModified?: string;
  acceptsRanges: boolean;
}

interface DownloadMetadata {
  fileName: string;
  url: string;
  downloadedSize: number;
  remoteSize?: number;
  etag?: string;
  lastModified?: string;
  downloadedAt: string;
}

type VisualDependencyProgressCallback = (progress: VisualDependencyProgress) => void;
type DownloadProgressCallback = (receivedBytes: number, totalBytes?: number) => void;
type ExtractProgressCallback = (extractedFiles: number, totalFiles: number) => void;
type DependencyInstallAction = "downloaded" | "extracted" | "skipped";

const downloadHttpAgent = new HttpAgent({ keepAlive: true, maxSockets: 2 });
const downloadHttpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 2 });
const downloadMaxRedirects = 5;
const downloadMaxAttempts = 8;
const downloadStallTimeoutMs = 45000;
const downloadBaseRetryDelayMs = 900;

export class VisualDependencyManager {
  private readonly rootPath: string;
  private readonly downloadsPath: string;

  constructor(userDataPath: string) {
    this.rootPath = join(userDataPath, "visual-dependencies");
    this.downloadsPath = join(this.rootPath, "downloads");
  }

  async getStatus(): Promise<VisualDependenciesStatus> {
    const dependencies = await Promise.all(AppConfig.visualDependencies.map((dependency) => this.dependencyStatus(dependency)));
    return {
      rootPath: this.rootPath,
      dependencies,
      allInstalled: dependencies.every((dependency) => dependency.installed),
      allCurrent: dependencies.every((dependency) => dependency.current)
    };
  }

  async installAll(onProgress?: VisualDependencyProgressCallback): Promise<VisualDependenciesInstallResult> {
    mkdirSync(this.downloadsPath, { recursive: true });
    const installed: string[] = [];
    const skipped: string[] = [];
    const warnings: string[] = [];

    for (const dependency of AppConfig.visualDependencies) {
      try {
        onProgress?.({
          id: dependency.id,
          label: dependency.label,
          phase: "queued",
          receivedBytes: 0,
          percent: 0,
          message: `Preparing ${dependency.label}`
        });
        const action = await this.installDependency(dependency, onProgress);
        if (action === "skipped") {
          skipped.push(dependency.id);
        } else {
          installed.push(dependency.id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onProgress?.({
          id: dependency.id,
          label: dependency.label,
          phase: "error",
          receivedBytes: 0,
          percent: 0,
          message: `${dependency.label}: ${message}`
        });
        warnings.push(`${dependency.label}: ${message}`);
      }
    }

    return {
      ...(await this.getStatus()),
      installed,
      skipped,
      warnings
    };
  }

  getMiniface(playerId: string): MinifaceImageResult {
    const normalizedPlayerId = playerId.trim();
    const minifacesPath = this.dependencyTargetPath("minifaces");
    const candidates = [
      ...[
        normalizedPlayerId && !normalizedPlayerId.toLowerCase().startsWith("p") ? join(minifacesPath, `p${normalizedPlayerId}.dds`) : "",
        normalizedPlayerId ? join(minifacesPath, `${normalizedPlayerId}.dds`) : ""
      ].filter(Boolean).map((filePath) => ({ filePath, source: "player" as const })),
      ...[
        join(minifacesPath, "generic.dds"),
        join(minifacesPath, "default.dds"),
        join(minifacesPath, "0.dds")
      ].map((filePath) => ({ filePath, source: "generic" as const }))
    ];

    for (const candidate of candidates) {
      if (!existsSync(candidate.filePath)) {
        continue;
      }
      try {
        return {
          playerId,
          dataUrl: ddsToBmpDataUrl(readFileSync(candidate.filePath)),
          found: candidate.source === "player",
          source: candidate.source
        };
      } catch {
        continue;
      }
    }

    return {
      playerId,
      dataUrl: genericMinifaceDataUrl(normalizedPlayerId),
      found: false,
      source: "missing"
    };
  }

  getTeamCrest(teamId: string): TeamCrestImageResult {
    const normalizedTeamId = teamId.trim();
    const crestsPath = this.dependencyTargetPath("crests");
    const candidates = [
      normalizedTeamId && !normalizedTeamId.toLowerCase().startsWith("l") ? join(crestsPath, `l${normalizedTeamId}.png`) : "",
      normalizedTeamId ? join(crestsPath, `${normalizedTeamId}.png`) : ""
    ].filter(Boolean);

    for (const filePath of candidates) {
      if (!existsSync(filePath)) {
        continue;
      }
      try {
        return {
          teamId,
          dataUrl: `data:image/png;base64,${readFileSync(filePath).toString("base64")}`,
          found: true,
          source: "team"
        };
      } catch {
        continue;
      }
    }

    return {
      teamId,
      dataUrl: genericCrestDataUrl(normalizedTeamId),
      found: false,
      source: "missing"
    };
  }

  private async installDependency(dependency: VisualDependencyConfig, onProgress?: VisualDependencyProgressCallback): Promise<DependencyInstallAction> {
    const downloadPath = join(this.downloadsPath, dependency.fileName);
    const targetPath = this.dependencyTargetPath(dependency.id);
    const url = AppConfig.dependencyUrl(dependency.fileName);
    let lastProgressPercent = -1;
    let lastProgressAt = 0;
    const emit = (progress: Omit<VisualDependencyProgress, "id" | "label">, force = false): void => {
      const percent = clampProgress(progress.percent);
      const now = Date.now();
      if (!force && percent === lastProgressPercent && now - lastProgressAt < 120) {
        return;
      }
      lastProgressPercent = percent;
      lastProgressAt = now;
      onProgress?.({
        id: dependency.id,
        label: dependency.label,
        ...progress,
        percent
      });
    };

    emit({
      phase: "queued",
      receivedBytes: 0,
      percent: 0,
      message: `Checking ${dependency.label}`
    }, true);

    const remoteInfo = await this.remoteInfoForInstall(url);
    const downloadedSize = fileSize(downloadPath);
    const canUseExistingDownload = downloadedSize > 0 && (remoteInfo.size === undefined || downloadedSize >= remoteInfo.size);
    const alreadyInstalled = this.isDependencyInstalled(dependency);

    if (canUseExistingDownload) {
      writeDownloadMetadata(downloadPath, dependency, url, remoteInfo);
    }

    if (alreadyInstalled && canUseExistingDownload) {
      emit({
        phase: "installed",
        receivedBytes: downloadedSize,
        totalBytes: remoteInfo.size,
        percent: 100,
        message: `${dependency.label} is already up to date`
      }, true);
      this.writeInstalledMetadata(targetPath, dependency, downloadPath, remoteInfo);
      return "skipped";
    }

    if (!canUseExistingDownload) {
      await downloadFile(url, downloadPath, (receivedBytes, totalBytes) => {
        const downloadPercent = totalBytes ? (receivedBytes / totalBytes) * 85 : 5;
        const detail = totalBytes
          ? `${formatBytes(receivedBytes)} of ${formatBytes(totalBytes)}`
          : formatBytes(receivedBytes);
        emit({
          phase: "downloading",
          receivedBytes,
          totalBytes,
          percent: downloadPercent,
          message: `Downloading ${dependency.label} (${detail})`
        });
      });
      writeDownloadMetadata(downloadPath, dependency, url, remoteInfo);
    }

    emit({
      phase: "extracting",
      receivedBytes: 0,
      percent: 85,
      message: canUseExistingDownload
        ? `Extracting existing ${dependency.label} download`
        : `Extracting ${dependency.label}`
    }, true);
    resetDirectory(targetPath, this.rootPath);
    extractZip(downloadPath, targetPath, dependencyRootDirectories(dependency), (extractedFiles, totalFiles) => {
      emit({
        phase: "extracting",
        receivedBytes: 0,
        percent: totalFiles > 0 ? 85 + (extractedFiles / totalFiles) * 14 : 95,
        message: totalFiles > 0
          ? `Extracting ${dependency.label} (${extractedFiles}/${totalFiles} files)`
          : `Extracting ${dependency.label}`
      });
    });
    this.writeInstalledMetadata(targetPath, dependency, downloadPath, remoteInfo);
    emit({
      phase: "installed",
      receivedBytes: 0,
      percent: 100,
      message: `${dependency.label} installed`
    }, true);
    return canUseExistingDownload ? "extracted" : "downloaded";
  }

  private async dependencyStatus(dependency: VisualDependencyConfig): Promise<VisualDependencyStatus> {
    const targetPath = this.dependencyTargetPath(dependency.id);
    const filesCount = countFilesByExtension(targetPath, dependency.expectedExtension);
    const installed = filesCount > 0;
    const downloadPath = join(this.downloadsPath, dependency.fileName);
    const downloadUrl = AppConfig.dependencyUrl(dependency.fileName);
    const downloadedSize = fileSize(downloadPath);
    let metadata = readDownloadMetadata(downloadPath);
    let remoteInfo: RemoteFileInfo | undefined;
    let remoteCheckError: string | undefined;
    try {
      remoteInfo = await fetchRemoteFileInfo(downloadUrl);
      if (downloadedSize > 0) {
        writeDownloadMetadata(downloadPath, dependency, downloadUrl, remoteInfo);
        metadata = readDownloadMetadata(downloadPath);
      }
    } catch (error) {
      remoteCheckError = error instanceof Error ? error.message : String(error);
    }
    const remoteSize = remoteInfo?.size;
    const updateAvailable = remoteSize !== undefined && downloadedSize > 0 && remoteSize > downloadedSize;
    return {
      id: dependency.id,
      label: dependency.label,
      fileName: dependency.fileName,
      downloadUrl,
      targetPath,
      installed,
      downloaded: downloadedSize > 0,
      current: installed && downloadedSize > 0 && !updateAvailable,
      updateAvailable,
      filesCount,
      downloadedSize,
      recordedDownloadedSize: metadata?.downloadedSize,
      remoteSize,
      remoteCheckError
    };
  }

  private dependencyTargetPath(id: string): string {
    const dependency = AppConfig.visualDependencies.find((candidate) => candidate.id === id);
    return join(this.rootPath, dependency?.targetDirectory ?? id);
  }

  private isDependencyInstalled(dependency: VisualDependencyConfig): boolean {
    return countFilesByExtension(this.dependencyTargetPath(dependency.id), dependency.expectedExtension) > 0;
  }

  private async remoteInfoForInstall(url: string): Promise<RemoteFileInfo> {
    try {
      return await fetchRemoteFileInfo(url);
    } catch {
      return { acceptsRanges: false };
    }
  }

  private writeInstalledMetadata(targetPath: string, dependency: VisualDependencyConfig, downloadPath: string, remoteInfo: RemoteFileInfo): void {
    writeFileSync(
      join(targetPath, ".dbm-studio-installed.json"),
      JSON.stringify({
        id: dependency.id,
        installedAt: new Date().toISOString(),
        fileName: dependency.fileName,
        downloadedSize: fileSize(downloadPath),
        remoteSize: remoteInfo.size,
        etag: remoteInfo.etag,
        lastModified: remoteInfo.lastModified
      }, null, 2),
      "utf8"
    );
  }
}

function readDownloadMetadata(downloadPath: string): DownloadMetadata | undefined {
  try {
    const parsed = JSON.parse(readFileSync(downloadMetadataPath(downloadPath), "utf8")) as Partial<DownloadMetadata>;
    if (typeof parsed.fileName !== "string" || typeof parsed.url !== "string" || !isPositiveSafeInteger(parsed.downloadedSize)) {
      return undefined;
    }
    return {
      fileName: parsed.fileName,
      url: parsed.url,
      downloadedSize: parsed.downloadedSize,
      remoteSize: isPositiveSafeInteger(parsed.remoteSize) ? parsed.remoteSize : undefined,
      etag: typeof parsed.etag === "string" ? parsed.etag : undefined,
      lastModified: typeof parsed.lastModified === "string" ? parsed.lastModified : undefined,
      downloadedAt: typeof parsed.downloadedAt === "string" ? parsed.downloadedAt : ""
    };
  } catch {
    return undefined;
  }
}

function writeDownloadMetadata(downloadPath: string, dependency: VisualDependencyConfig, url: string, remoteInfo: RemoteFileInfo): void {
  const downloadedSize = fileSize(downloadPath);
  if (downloadedSize <= 0) {
    return;
  }
  const metadata: DownloadMetadata = {
    fileName: dependency.fileName,
    url,
    downloadedSize,
    remoteSize: remoteInfo.size,
    etag: remoteInfo.etag,
    lastModified: remoteInfo.lastModified,
    downloadedAt: new Date().toISOString()
  };
  writeFileSync(downloadMetadataPath(downloadPath), JSON.stringify(metadata, null, 2), "utf8");
}

function downloadMetadataPath(downloadPath: string): string {
  return `${downloadPath}.dbm-studio.json`;
}

async function fetchRemoteFileInfo(url: string): Promise<RemoteFileInfo> {
  return requestRemoteFileInfo(url, "HEAD");
}

async function requestRemoteFileInfo(url: string, method: "HEAD" | "GET", redirects = 0): Promise<RemoteFileInfo> {
  if (redirects > downloadMaxRedirects) {
    throw new Error("Too many redirects while checking dependency.");
  }

  const parsedUrl = new URL(url);
  const response = await openMetadataResponse(parsedUrl, method);
  const statusCode = response.statusCode ?? 0;
  const redirect = response.headers.location;

  if (statusCode >= 300 && statusCode < 400 && redirect) {
    closeMetadataResponse(response);
    return requestRemoteFileInfo(new URL(redirect, parsedUrl).toString(), method, redirects + 1);
  }

  if (method === "HEAD" && (statusCode === 405 || statusCode === 501)) {
    closeMetadataResponse(response);
    return requestRemoteFileInfo(url, "GET", redirects);
  }

  if (statusCode < 200 || statusCode >= 300) {
    closeMetadataResponse(response);
    throw new DownloadHttpError(`Dependency check failed with HTTP ${statusCode}.`, isRetryableHttpStatus(statusCode));
  }

  const contentRange = parseContentRange(headerValue(response.headers["content-range"]));
  const contentLength = parseContentLength(response.headers["content-length"]);
  const size = contentRange?.total ?? contentLength;
  const acceptsRanges = headerValue(response.headers["accept-ranges"])?.toLowerCase() === "bytes" || Boolean(contentRange);
  const info: RemoteFileInfo = {
    size,
    etag: headerValue(response.headers.etag),
    lastModified: headerValue(response.headers["last-modified"]),
    acceptsRanges
  };
  closeMetadataResponse(response);
  return info;
}

function openMetadataResponse(parsedUrl: URL, method: "HEAD" | "GET"): Promise<IncomingMessage> {
  return new Promise((resolveDownload, rejectDownload) => {
    const client = parsedUrl.protocol === "https:" ? requestSecure : requestHttp;
    const headers: Record<string, string> = {
      "Accept-Encoding": "identity",
      "User-Agent": "DBM-Studio"
    };
    if (method === "GET") {
      headers.Range = "bytes=0-0";
    }
    const options: RequestOptions = {
      agent: parsedUrl.protocol === "https:" ? downloadHttpsAgent : downloadHttpAgent,
      headers,
      method
    };

    const request = client(parsedUrl, options, (response) => {
      resolveDownload(response);
    });
    request.on("error", rejectDownload);
    request.setTimeout(downloadStallTimeoutMs, () => {
      request.destroy(new Error(`Dependency check stalled for ${Math.round(downloadStallTimeoutMs / 1000)} seconds.`));
    });
    request.end();
  });
}

function closeMetadataResponse(response: IncomingMessage): void {
  response.destroy();
}

async function downloadFile(url: string, outputPath: string, onProgress?: DownloadProgressCallback): Promise<void> {
  mkdirSync(dirname(outputPath), { recursive: true });
  const partialPath = `${outputPath}.part`;
  let lastError: Error | undefined;
  let attemptsUsed = 0;

  for (let attempt = 1; attempt <= downloadMaxAttempts; attempt += 1) {
    attemptsUsed = attempt;
    try {
      await downloadAttempt(url, partialPath, onProgress);
      rmSync(outputPath, { force: true });
      renameSync(partialPath, outputPath);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (error instanceof DownloadHttpError && !error.retryable) {
        break;
      }
      if (attempt < downloadMaxAttempts) {
        await delay(retryDelayMs(attempt));
      }
    }
  }

  throw new Error(`Download failed after ${attemptsUsed} ${attemptsUsed === 1 ? "attempt" : "attempts"}: ${lastError?.message ?? "unknown error"}`);
}

async function downloadAttempt(url: string, partialPath: string, onProgress?: DownloadProgressCallback, redirects = 0): Promise<void> {
  if (redirects > downloadMaxRedirects) {
    throw new Error("Too many redirects while downloading dependency.");
  }

  const resumeFrom = fileSize(partialPath);
  const parsedUrl = new URL(url);
  const response = await openDownloadResponse(parsedUrl, resumeFrom);
  const statusCode = response.statusCode ?? 0;
  const redirect = response.headers.location;

  if (statusCode >= 300 && statusCode < 400 && redirect) {
    response.resume();
    await downloadAttempt(new URL(redirect, parsedUrl).toString(), partialPath, onProgress, redirects + 1);
    return;
  }

  if (statusCode === 416) {
    response.resume();
    rmSync(partialPath, { force: true });
    throw new DownloadHttpError("Download resume point is no longer valid.", true);
  }

  if (statusCode < 200 || statusCode >= 300) {
    response.resume();
    throw new DownloadHttpError(`Download failed with HTTP ${statusCode}.`, isRetryableHttpStatus(statusCode));
  }

  const contentRange = parseContentRange(headerValue(response.headers["content-range"]));
  const contentLength = parseContentLength(response.headers["content-length"]);
  const serverResumed = statusCode === 206 && contentRange?.start === resumeFrom;
  const append = resumeFrom > 0 && serverResumed;
  const startingBytes = append ? resumeFrom : 0;
  const expectedResponseBytes = contentLength;
  const totalBytes = contentRange?.total ?? (contentLength !== undefined ? startingBytes + contentLength : undefined);
  let receivedBytes = startingBytes;

  if (resumeFrom > 0 && !append) {
    rmSync(partialPath, { force: true });
  }

  onProgress?.(receivedBytes, totalBytes);
  const progress = new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void) {
      receivedBytes += chunk.length;
      onProgress?.(receivedBytes, totalBytes);
      callback(null, chunk);
    }
  });
  const output = createWriteStream(partialPath, { flags: append ? "a" : "w" });
  try {
    await pipeline(response, progress, output);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  const downloadedSize = fileSize(partialPath);
  const responseBytes = downloadedSize - startingBytes;
  if (!response.complete) {
    throw new Error("Download connection closed before all bytes were received.");
  }
  if (expectedResponseBytes !== undefined && responseBytes !== expectedResponseBytes) {
    throw new Error(`Download received ${formatBytes(responseBytes)} but expected ${formatBytes(expectedResponseBytes)}.`);
  }
  if (totalBytes !== undefined && downloadedSize < totalBytes) {
    throw new Error(`Download stopped at ${formatBytes(downloadedSize)} of ${formatBytes(totalBytes)}.`);
  }
}

function openDownloadResponse(parsedUrl: URL, resumeFrom: number): Promise<IncomingMessage> {
  return new Promise((resolveDownload, rejectDownload) => {
    const client = parsedUrl.protocol === "https:" ? getSecure : get;
    const headers: Record<string, string> = {
      "Accept-Encoding": "identity",
      "User-Agent": "DBM-Studio"
    };
    if (resumeFrom > 0) {
      headers.Range = `bytes=${resumeFrom}-`;
    }
    const options: RequestOptions = {
      agent: parsedUrl.protocol === "https:" ? downloadHttpsAgent : downloadHttpAgent,
      headers
    };

    const request = client(parsedUrl, options, (response) => {
      resolveDownload(response);
    });
    request.on("error", rejectDownload);
    request.setTimeout(downloadStallTimeoutMs, () => {
      request.destroy(new Error(`Download stalled for ${Math.round(downloadStallTimeoutMs / 1000)} seconds.`));
    });
  });
}

class DownloadHttpError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}

interface ContentRange {
  start: number;
  end: number;
  total?: number;
}

function parseContentRange(value?: string): ContentRange | undefined {
  if (!value) {
    return undefined;
  }
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = match[3] === "*" ? undefined : Number(match[3]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
    return undefined;
  }
  return Number.isSafeInteger(total) ? { start, end, total } : { start, end };
}

function parseContentLength(value: string | string[] | undefined): number | undefined {
  const parsed = Number(headerValue(value));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}

function isRetryableHttpStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function retryDelayMs(attempt: number): number {
  return Math.min(10000, downloadBaseRetryDelayMs * 2 ** (attempt - 1));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function dependencyRootDirectories(dependency: VisualDependencyConfig): string[] {
  return [
    dependency.stripRootDirectory,
    ...(dependency.stripRootDirectories ?? [])
  ].filter((directory): directory is string => Boolean(directory));
}

function extractZip(zipPath: string, outputPath: string, stripRootDirectories: string[] = [], onProgress?: ExtractProgressCallback): void {
  const buffer = readFileSync(zipPath);
  const entries = readZipEntries(buffer);
  const totalFiles = entries.filter((entry) => Boolean(safeZipEntryName(entry.name, stripRootDirectories))).length;
  let extractedFiles = 0;
  mkdirSync(outputPath, { recursive: true });
  onProgress?.(extractedFiles, totalFiles);

  for (const entry of entries) {
    const outputName = safeZipEntryName(entry.name, stripRootDirectories);
    if (!outputName) {
      continue;
    }

    const localHeaderOffset = entry.localHeaderOffset;
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`${entry.name}: invalid local file header.`);
    }

    const nameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + nameLength + extraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);
    const content = entry.method === 0 ? compressed : entry.method === 8 ? inflateRawSync(compressed) : undefined;
    if (!content) {
      throw new Error(`${entry.name}: unsupported ZIP compression method ${entry.method}.`);
    }

    const outputFile = safeOutputPath(outputPath, outputName);
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, content);
    extractedFiles += 1;
    onProgress?.(extractedFiles, totalFiles);
  }
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let cursor = buffer.readUInt32LE(eocdOffset + 16);
  const entries: ZipEntry[] = [];

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("ZIP central directory is invalid.");
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    if (!name.endsWith("/")) {
      entries.push({ name, method, compressedSize, localHeaderOffset });
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("ZIP end of central directory was not found.");
}

function safeZipEntryName(name: string, stripRootDirectories: string[] = []): string {
  let normalized = normalize(name).replace(/^([/\\])+/, "");
  for (const stripRootDirectory of stripRootDirectories) {
    const root = `${stripRootDirectory}${sep}`;
    if (normalized.toLowerCase().startsWith(root.toLowerCase())) {
      normalized = normalized.slice(root.length);
      break;
    }
  }
  if (!normalized || normalized === "." || normalized.startsWith("..") || normalize(normalized).startsWith(`..${sep}`)) {
    return "";
  }
  return normalized;
}

function safeOutputPath(rootPath: string, relativePath: string): string {
  const root = resolve(rootPath);
  const output = resolve(rootPath, relativePath);
  if (output !== root && !output.startsWith(`${root}${sep}`)) {
    throw new Error(`${basename(relativePath)}: ZIP entry would be written outside the dependency folder.`);
  }
  return output;
}

function resetDirectory(targetPath: string, allowedRootPath: string): void {
  const root = resolve(allowedRootPath);
  const target = resolve(targetPath);
  if (target === root || !target.startsWith(`${root}${sep}`)) {
    throw new Error("Refusing to reset a dependency folder outside the visual dependency root.");
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
}

function countFilesByExtension(targetPath: string, extension: string): number {
  if (!existsSync(targetPath)) {
    return 0;
  }

  let count = 0;
  for (const entry of readdirSync(targetPath, { withFileTypes: true })) {
    const entryPath = join(targetPath, entry.name);
    if (entry.isDirectory()) {
      count += countFilesByExtension(entryPath, extension);
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === extension.toLowerCase()) {
      count += 1;
    }
  }
  return count;
}

function ddsToBmpDataUrl(buffer: Buffer): string {
  const image = decodeDds(buffer);
  return `data:image/bmp;base64,${encodeBmp(image).toString("base64")}`;
}

function decodeDds(buffer: Buffer): RgbaImage {
  if (buffer.length < 128 || buffer.subarray(0, 4).toString("ascii") !== "DDS ") {
    throw new Error("Invalid DDS image.");
  }

  const height = buffer.readUInt32LE(12);
  const width = buffer.readUInt32LE(16);
  const fourCc = buffer.subarray(84, 88).toString("ascii").replace(/\0/g, "");
  const dataOffset = fourCc === "DX10" ? 148 : 128;
  const data = buffer.subarray(dataOffset);

  if (fourCc === "DXT1") {
    return decodeDxt(width, height, data, "DXT1");
  }
  if (fourCc === "DXT3") {
    return decodeDxt(width, height, data, "DXT3");
  }
  if (fourCc === "DXT5") {
    return decodeDxt(width, height, data, "DXT5");
  }

  const rgbBitCount = buffer.readUInt32LE(88);
  if (rgbBitCount === 32) {
    return decodeUncompressedRgba(width, height, data, buffer.readUInt32LE(92), buffer.readUInt32LE(96), buffer.readUInt32LE(100), buffer.readUInt32LE(104));
  }

  throw new Error(`Unsupported DDS format ${fourCc || `${rgbBitCount}bpp`}.`);
}

function decodeDxt(width: number, height: number, data: Buffer, format: "DXT1" | "DXT3" | "DXT5"): RgbaImage {
  const pixels = new Uint8Array(width * height * 4);
  const blockSize = format === "DXT1" ? 8 : 16;
  const blocksWide = Math.ceil(width / 4);
  const blocksHigh = Math.ceil(height / 4);
  let cursor = 0;

  for (let blockY = 0; blockY < blocksHigh; blockY += 1) {
    for (let blockX = 0; blockX < blocksWide; blockX += 1) {
      const alpha = format === "DXT3" ? decodeDxt3Alpha(data, cursor) : format === "DXT5" ? decodeDxt5Alpha(data, cursor) : undefined;
      const colorOffset = cursor + (format === "DXT1" ? 0 : 8);
      const colors = decodeDxtColors(data, colorOffset, format !== "DXT1");
      const indices = data.readUInt32LE(colorOffset + 4);

      for (let pixelY = 0; pixelY < 4; pixelY += 1) {
        for (let pixelX = 0; pixelX < 4; pixelX += 1) {
          const x = blockX * 4 + pixelX;
          const y = blockY * 4 + pixelY;
          if (x >= width || y >= height) {
            continue;
          }

          const color = colors[(indices >> (2 * (pixelY * 4 + pixelX))) & 3];
          const outputOffset = (y * width + x) * 4;
          pixels[outputOffset] = color[0];
          pixels[outputOffset + 1] = color[1];
          pixels[outputOffset + 2] = color[2];
          pixels[outputOffset + 3] = alpha?.[pixelY * 4 + pixelX] ?? color[3];
        }
      }

      cursor += blockSize;
    }
  }

  return { width, height, pixels };
}

function decodeDxtColors(data: Buffer, offset: number, forceFourColors: boolean): number[][] {
  const color0 = rgb565(data.readUInt16LE(offset));
  const color1 = rgb565(data.readUInt16LE(offset + 2));
  const useFourColors = forceFourColors || data.readUInt16LE(offset) > data.readUInt16LE(offset + 2);
  const colors = [
    [...color0, 255],
    [...color1, 255],
    useFourColors
      ? [Math.round((2 * color0[0] + color1[0]) / 3), Math.round((2 * color0[1] + color1[1]) / 3), Math.round((2 * color0[2] + color1[2]) / 3), 255]
      : [Math.round((color0[0] + color1[0]) / 2), Math.round((color0[1] + color1[1]) / 2), Math.round((color0[2] + color1[2]) / 2), 255],
    useFourColors
      ? [Math.round((color0[0] + 2 * color1[0]) / 3), Math.round((color0[1] + 2 * color1[1]) / 3), Math.round((color0[2] + 2 * color1[2]) / 3), 255]
      : [0, 0, 0, 0]
  ];
  return colors;
}

function decodeDxt3Alpha(data: Buffer, offset: number): number[] {
  const alpha: number[] = [];
  for (let index = 0; index < 8; index += 1) {
    const byte = data[offset + index] ?? 0;
    alpha.push((byte & 0x0f) * 17, ((byte >> 4) & 0x0f) * 17);
  }
  return alpha;
}

function decodeDxt5Alpha(data: Buffer, offset: number): number[] {
  const alpha0 = data[offset] ?? 0;
  const alpha1 = data[offset + 1] ?? 0;
  const palette = [alpha0, alpha1];
  if (alpha0 > alpha1) {
    for (let index = 1; index <= 6; index += 1) {
      palette.push(Math.round(((7 - index) * alpha0 + index * alpha1) / 7));
    }
  } else {
    for (let index = 1; index <= 4; index += 1) {
      palette.push(Math.round(((5 - index) * alpha0 + index * alpha1) / 5));
    }
    palette.push(0, 255);
  }

  let bits = 0n;
  for (let index = 0; index < 6; index += 1) {
    bits |= BigInt(data[offset + 2 + index] ?? 0) << BigInt(8 * index);
  }

  const alpha: number[] = [];
  for (let index = 0; index < 16; index += 1) {
    alpha.push(palette[Number((bits >> BigInt(3 * index)) & 7n)] ?? 255);
  }
  return alpha;
}

function rgb565(value: number): [number, number, number] {
  const r = (value >> 11) & 0x1f;
  const g = (value >> 5) & 0x3f;
  const b = value & 0x1f;
  return [
    Math.round((r * 255) / 31),
    Math.round((g * 255) / 63),
    Math.round((b * 255) / 31)
  ];
}

function decodeUncompressedRgba(width: number, height: number, data: Buffer, rMask: number, gMask: number, bMask: number, aMask: number): RgbaImage {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const value = data.readUInt32LE(index * 4);
    const outputOffset = index * 4;
    pixels[outputOffset] = extractMaskedChannel(value, rMask);
    pixels[outputOffset + 1] = extractMaskedChannel(value, gMask);
    pixels[outputOffset + 2] = extractMaskedChannel(value, bMask);
    pixels[outputOffset + 3] = aMask ? extractMaskedChannel(value, aMask) : 255;
  }
  return { width, height, pixels };
}

function extractMaskedChannel(value: number, mask: number): number {
  if (!mask) {
    return 0;
  }
  const shift = trailingZeros(mask);
  const max = mask >>> shift;
  return Math.round((((value & mask) >>> shift) * 255) / max);
}

function trailingZeros(value: number): number {
  let count = 0;
  while (((value >>> count) & 1) === 0 && count < 32) {
    count += 1;
  }
  return count;
}

function encodeBmp(image: RgbaImage): Buffer {
  const headerSize = 54;
  const pixelSize = image.width * image.height * 4;
  const output = Buffer.alloc(headerSize + pixelSize);
  output.write("BM", 0, "ascii");
  output.writeUInt32LE(output.length, 2);
  output.writeUInt32LE(headerSize, 10);
  output.writeUInt32LE(40, 14);
  output.writeInt32LE(image.width, 18);
  output.writeInt32LE(-image.height, 22);
  output.writeUInt16LE(1, 26);
  output.writeUInt16LE(32, 28);
  output.writeUInt32LE(pixelSize, 34);

  for (let index = 0; index < image.width * image.height; index += 1) {
    const source = index * 4;
    const target = headerSize + source;
    output[target] = image.pixels[source + 2];
    output[target + 1] = image.pixels[source + 1];
    output[target + 2] = image.pixels[source];
    output[target + 3] = image.pixels[source + 3];
  }
  return output;
}

function genericMinifaceDataUrl(playerId: string): string {
  const label = playerId ? `ID ${playerId}` : "No image";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="16" fill="#e8efea"/><circle cx="80" cy="62" r="30" fill="#9aa9a1"/><path d="M30 144c8-32 26-48 50-48s42 16 50 48" fill="#9aa9a1"/><text x="80" y="148" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#405049" text-anchor="middle">${escapeXml(label)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function genericCrestDataUrl(teamId: string): string {
  const label = teamId ? `ID ${teamId}` : "No crest";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="16" fill="#eef3ef"/><path d="M80 22 126 38v38c0 31-19 53-46 66-27-13-46-35-46-66V38l46-16z" fill="#9aa9a1"/><path d="M80 38 108 48v27c0 20-11 35-28 45-17-10-28-25-28-45V48l28-10z" fill="#eef3ef" opacity=".72"/><text x="80" y="148" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#405049" text-anchor="middle">${escapeXml(label)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
