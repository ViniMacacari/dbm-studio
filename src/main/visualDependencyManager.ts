import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { get } from "node:http";
import { get as getSecure } from "node:https";
import { basename, dirname, extname, join, normalize, resolve, sep } from "node:path";
import { inflateRawSync } from "node:zlib";
import { AppConfig, type VisualDependencyConfig } from "../app-config";
import type {
  MinifaceImageResult,
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

type VisualDependencyProgressCallback = (progress: VisualDependencyProgress) => void;
type DownloadProgressCallback = (receivedBytes: number, totalBytes?: number) => void;
type ExtractProgressCallback = (extractedFiles: number, totalFiles: number) => void;

export class VisualDependencyManager {
  private readonly rootPath: string;
  private readonly downloadsPath: string;

  constructor(userDataPath: string) {
    this.rootPath = join(userDataPath, "visual-dependencies");
    this.downloadsPath = join(this.rootPath, "downloads");
  }

  getStatus(): VisualDependenciesStatus {
    const dependencies = AppConfig.visualDependencies.map((dependency) => this.dependencyStatus(dependency));
    return {
      rootPath: this.rootPath,
      dependencies,
      allInstalled: dependencies.every((dependency) => dependency.installed)
    };
  }

  async installAll(onProgress?: VisualDependencyProgressCallback): Promise<VisualDependenciesInstallResult> {
    mkdirSync(this.downloadsPath, { recursive: true });
    const installed: string[] = [];
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
        await this.installDependency(dependency, onProgress);
        installed.push(dependency.id);
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
      ...this.getStatus(),
      installed,
      warnings
    };
  }

  getMiniface(playerId: string): MinifaceImageResult {
    const normalizedPlayerId = playerId.trim();
    const minifacesPath = this.dependencyTargetPath("minifaces");
    const candidates = [
      normalizedPlayerId ? join(minifacesPath, `${normalizedPlayerId}.dds`) : "",
      join(minifacesPath, "generic.dds"),
      join(minifacesPath, "default.dds"),
      join(minifacesPath, "0.dds")
    ].filter(Boolean);

    for (const [index, filePath] of candidates.entries()) {
      if (!existsSync(filePath)) {
        continue;
      }
      try {
        return {
          playerId,
          dataUrl: ddsToBmpDataUrl(readFileSync(filePath)),
          found: index === 0,
          source: index === 0 ? "player" : "generic"
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

  private async installDependency(dependency: VisualDependencyConfig, onProgress?: VisualDependencyProgressCallback): Promise<void> {
    const downloadPath = join(this.downloadsPath, dependency.fileName);
    const targetPath = this.dependencyTargetPath(dependency.id);
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

    await downloadFile(AppConfig.dependencyUrl(dependency.fileName), downloadPath, (receivedBytes, totalBytes) => {
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

    emit({
      phase: "extracting",
      receivedBytes: 0,
      percent: 85,
      message: `Extracting ${dependency.label}`
    }, true);
    resetDirectory(targetPath, this.rootPath);
    extractZip(downloadPath, targetPath, dependency.stripRootDirectory, (extractedFiles, totalFiles) => {
      emit({
        phase: "extracting",
        receivedBytes: 0,
        percent: totalFiles > 0 ? 85 + (extractedFiles / totalFiles) * 14 : 95,
        message: totalFiles > 0
          ? `Extracting ${dependency.label} (${extractedFiles}/${totalFiles} files)`
          : `Extracting ${dependency.label}`
      });
    });
    writeFileSync(
      join(targetPath, ".dbm-studio-installed.json"),
      JSON.stringify({ id: dependency.id, installedAt: new Date().toISOString() }, null, 2),
      "utf8"
    );
    emit({
      phase: "installed",
      receivedBytes: 0,
      percent: 100,
      message: `${dependency.label} installed`
    }, true);
  }

  private dependencyStatus(dependency: VisualDependencyConfig): VisualDependencyStatus {
    const targetPath = this.dependencyTargetPath(dependency.id);
    const filesCount = countFilesByExtension(targetPath, dependency.expectedExtension);
    return {
      id: dependency.id,
      label: dependency.label,
      fileName: dependency.fileName,
      downloadUrl: AppConfig.dependencyUrl(dependency.fileName),
      targetPath,
      installed: filesCount > 0,
      filesCount
    };
  }

  private dependencyTargetPath(id: string): string {
    const dependency = AppConfig.visualDependencies.find((candidate) => candidate.id === id);
    return join(this.rootPath, dependency?.targetDirectory ?? id);
  }
}

function downloadFile(url: string, outputPath: string, onProgress?: DownloadProgressCallback, redirects = 0): Promise<void> {
  if (redirects > 5) {
    return Promise.reject(new Error("Too many redirects while downloading dependency."));
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  return new Promise((resolveDownload, rejectDownload) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === "https:" ? getSecure : get;
    const request = client(parsedUrl, (response) => {
      const statusCode = response.statusCode ?? 0;
      const redirect = response.headers.location;
      if (statusCode >= 300 && statusCode < 400 && redirect) {
        response.resume();
        downloadFile(new URL(redirect, parsedUrl).toString(), outputPath, onProgress, redirects + 1).then(resolveDownload, rejectDownload);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        rejectDownload(new Error(`Download failed with HTTP ${statusCode}.`));
        return;
      }

      const contentLength = Array.isArray(response.headers["content-length"])
        ? response.headers["content-length"][0]
        : response.headers["content-length"];
      const totalBytes = contentLength ? Number(contentLength) : undefined;
      let receivedBytes = 0;
      onProgress?.(receivedBytes, Number.isFinite(totalBytes) ? totalBytes : undefined);

      const stream = createWriteStream(outputPath);
      response.on("data", (chunk: Buffer) => {
        receivedBytes += chunk.length;
        onProgress?.(receivedBytes, Number.isFinite(totalBytes) ? totalBytes : undefined);
      });
      response.on("error", rejectDownload);
      response.pipe(stream);
      stream.on("finish", () => {
        stream.close();
        resolveDownload();
      });
      stream.on("error", rejectDownload);
    });

    request.on("error", rejectDownload);
    request.setTimeout(120000, () => {
      request.destroy(new Error("Download timed out."));
    });
  });
}

function extractZip(zipPath: string, outputPath: string, stripRootDirectory?: string, onProgress?: ExtractProgressCallback): void {
  const buffer = readFileSync(zipPath);
  const entries = readZipEntries(buffer);
  const totalFiles = entries.filter((entry) => Boolean(safeZipEntryName(entry.name, stripRootDirectory))).length;
  let extractedFiles = 0;
  mkdirSync(outputPath, { recursive: true });
  onProgress?.(extractedFiles, totalFiles);

  for (const entry of entries) {
    const outputName = safeZipEntryName(entry.name, stripRootDirectory);
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

function safeZipEntryName(name: string, stripRootDirectory?: string): string {
  let normalized = normalize(name).replace(/^([/\\])+/, "");
  if (stripRootDirectory) {
    const root = `${stripRootDirectory}${sep}`;
    if (normalized.toLowerCase().startsWith(root.toLowerCase())) {
      normalized = normalized.slice(root.length);
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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
