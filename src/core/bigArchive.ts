import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import type { BigEntry, BigExtractResult } from "../shared/types";

function readCString(buffer: Buffer, start: number): { value: string; next: number } {
  let end = start;
  while (end < buffer.length && buffer[end] !== 0) {
    end += 1;
  }
  return {
    value: buffer.subarray(start, end).toString("utf8"),
    next: end + 1
  };
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
}

function isCompressedPayload(payload: Buffer): boolean {
  if (payload.length < 8) {
    return false;
  }
  const signature = payload.subarray(0, 8).toString("ascii");
  return signature.startsWith("chunk") || signature.startsWith("EASF") || (payload[0] === 0x10 && payload[1] === 0xfb);
}

export function readBigEntries(filePath: string): BigEntry[] {
  const buffer = readFileSync(filePath);
  const signature = buffer.subarray(0, 4).toString("ascii");
  if (signature !== "BIGF" && signature !== "BIG4") {
    throw new Error("This file does not look like a BIGF/BIG4 archive.");
  }

  const count = buffer.readUInt32BE(8);
  let cursor = 16;
  const entries: BigEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const offset = buffer.readUInt32BE(cursor);
    const size = buffer.readUInt32BE(cursor + 4);
    const name = readCString(buffer, cursor + 8);
    cursor = name.next;
    const payload = buffer.subarray(offset, offset + size);
    entries.push({
      name: name.value,
      offset,
      size,
      compressed: isCompressedPayload(payload)
    });
  }

  return entries;
}

export function extractBig(filePath: string, outputFolder: string, patterns = ["*.db", "*.xml"]): BigExtractResult {
  const buffer = readFileSync(filePath);
  const entries = readBigEntries(filePath);
  const matchers = patterns.map(wildcardToRegExp);
  const selected = entries.filter((entry) => matchers.some((matcher) => matcher.test(entry.name)));
  const warnings: string[] = [];

  for (const entry of selected) {
    const safeName = normalize(entry.name).replace(/^(\.\.[/\\])+/, "");
    const outputPath = join(outputFolder, safeName);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, buffer.subarray(entry.offset, entry.offset + entry.size));
    if (entry.compressed) {
      warnings.push(`${entry.name}: extracted payload still appears compressed.`);
    }
  }

  return {
    archivePath: filePath,
    outputFolder,
    entries: selected,
    warnings
  };
}
