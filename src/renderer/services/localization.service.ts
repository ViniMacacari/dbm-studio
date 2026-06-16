import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";

export interface LocalizationFieldDraft {
  key: string;
  label: string;
  value: string;
  fallbackValue: string;
  found: boolean;
}

export interface LocalizationApplyResult {
  changedTables: string[];
}

interface LanguageTableLayout {
  table: DataTable;
  stringIdColumn: number;
  sourceTextColumn: number;
  hashIdColumn: number;
}

const languageHashTable = makeLanguageHashTable();

@Injectable({ providedIn: "root" })
export class LocalizationService {
  hasLocalization(project?: DbProject): boolean {
    return this.languageTables(project).some((layout) => layout.table.rows.length > 0);
  }

  resolveString(project: DbProject | undefined, key: string, fallback = key): string {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return fallback;
    }
    const existing = this.findString(this.languageTables(project), normalizedKey);
    return existing?.value.trim() || fallback;
  }

  teamFields(project: DbProject | undefined, teamId: string, displayName: string): LocalizationFieldDraft[] {
    return this.entityFields(project, [
      { key: `TeamName_${teamId}`, label: "Team name", fallbackValue: displayName },
      { key: `TeamName_Abbr15_${teamId}`, label: "15 char name", fallbackValue: displayName },
      { key: `TeamName_Abbr10_${teamId}`, label: "10 char name", fallbackValue: displayName },
      { key: `TeamName_Abbr3_${teamId}`, label: "2-3 letter abbreviation", fallbackValue: this.abbreviate(displayName) }
    ]);
  }

  leagueFields(project: DbProject | undefined, leagueId: string, displayName: string): LocalizationFieldDraft[] {
    return this.entityFields(project, [
      { key: `LeagueName_${leagueId}`, label: "League name", fallbackValue: displayName },
      { key: `LeagueName_Abbr15_${leagueId}`, label: "15 char name", fallbackValue: displayName },
      { key: `LeagueName_Abbr10_${leagueId}`, label: "10 char name", fallbackValue: displayName },
      { key: `LeagueName_Abbr3_${leagueId}`, label: "2-3 letter abbreviation", fallbackValue: this.abbreviate(displayName) }
    ]);
  }

  applyFields(project: DbProject, fields: LocalizationFieldDraft[]): LocalizationApplyResult | undefined {
    if (!fields.length || !project.localization || !this.hasLocalization(project)) {
      return undefined;
    }

    const layouts = this.languageTables(project);
    if (!layouts.length) {
      return undefined;
    }

    const changedTables = new Set<string>();
    for (const field of fields) {
      const value = field.value.trim() || field.fallbackValue;
      const hash = toSignedInt32(computeLanguageHash(field.key));
      const existing = this.findString(layouts, field.key);
      const layout = existing?.layout ?? this.targetLayout(layouts, field.key);
      const rowIndex = existing?.rowIndex ?? this.createLanguageRow(layout, hash);
      layout.table.rows[rowIndex][layout.stringIdColumn] = field.key;
      layout.table.rows[rowIndex][layout.sourceTextColumn] = value;
      layout.table.rows[rowIndex][layout.hashIdColumn] = String(hash);
      layout.table.changed = true;
      changedTables.add(layout.table.name);
    }

    return changedTables.size > 0 ? { changedTables: [...changedTables] } : undefined;
  }

  refreshGeneratedFields(fields: LocalizationFieldDraft[], nextFields: LocalizationFieldDraft[]): void {
    const nextByKey = new Map(nextFields.map((field) => [field.key, field]));
    for (const field of fields) {
      const next = nextByKey.get(field.key);
      if (!next) {
        continue;
      }
      const shouldUseGeneratedValue = !field.found && (!field.value.trim() || field.value === field.fallbackValue);
      field.fallbackValue = next.fallbackValue;
      if (shouldUseGeneratedValue) {
        field.value = next.value;
      }
    }
  }

  private entityFields(
    project: DbProject | undefined,
    definitions: { key: string; label: string; fallbackValue: string }[]
  ): LocalizationFieldDraft[] {
    if (!this.hasLocalization(project)) {
      return [];
    }
    const layouts = this.languageTables(project);
    return definitions.map((definition) => {
      const existing = this.findString(layouts, definition.key);
      return {
        ...definition,
        value: existing?.value ?? definition.fallbackValue,
        found: Boolean(existing)
      };
    });
  }

  private findString(layouts: LanguageTableLayout[], key: string): { layout: LanguageTableLayout; rowIndex: number; value: string } | undefined {
    const lowerKey = key.toLowerCase();
    for (const layout of layouts) {
      const rowIndex = layout.table.rows.findIndex((row) => {
        const val = row[layout.stringIdColumn];
        return typeof val === "string" && val.toLowerCase() === lowerKey;
      });
      if (rowIndex >= 0) {
        return {
          layout,
          rowIndex,
          value: layout.table.rows[rowIndex][layout.sourceTextColumn] ?? ""
        };
      }
    }
    return undefined;
  }

  private targetLayout(layouts: LanguageTableLayout[], key: string): LanguageTableLayout {
    const hash = toSignedInt32(computeLanguageHash(key));
    const targetName = hash < 0 ? "languagestrings1" : "languagestrings2";
    return layouts.find((layout) => layout.table.name.toLowerCase() === targetName) ?? layouts[0];
  }

  private createLanguageRow(layout: LanguageTableLayout, hash: number): number {
    const row = layout.table.columns.map((_column, columnIndex) => this.defaultValueForField(layout.table.fields[columnIndex]));
    const insertIndex = layout.table.rows.findIndex((candidate) => {
      const candidateHash = Number(candidate[layout.hashIdColumn]);
      return Number.isFinite(candidateHash) && candidateHash > hash;
    });
    if (insertIndex < 0) {
      layout.table.rows.push(row);
      return layout.table.rows.length - 1;
    }
    layout.table.rows.splice(insertIndex, 0, row);
    return insertIndex;
  }

  private languageTables(project?: DbProject): LanguageTableLayout[] {
    return (project?.localization?.tables ?? [])
      .map((table): LanguageTableLayout | undefined => {
        const stringIdColumn = this.columnIndex(table, "stringid");
        const sourceTextColumn = this.columnIndex(table, "sourcetext");
        const hashIdColumn = this.columnIndex(table, "hashid");
        if (stringIdColumn < 0 || sourceTextColumn < 0 || hashIdColumn < 0) {
          return undefined;
        }
        return { table, stringIdColumn, sourceTextColumn, hashIdColumn };
      })
      .filter((layout): layout is LanguageTableLayout => Boolean(layout));
  }

  private abbreviate(value: string): string {
    const words = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((word) => !/^(fc|cf|sc|ac|club|the|de|da|do|del|la|le)$/i.test(word));
    const abbreviation = words.length >= 2
      ? words.slice(0, 3).map((word) => word[0]).join("")
      : (words[0] ?? value).slice(0, 3);
    return abbreviation.toUpperCase() || value.slice(0, 3).toUpperCase();
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  }

  private defaultValueForField(field: FieldDescriptor | undefined): string {
    if (!field || field.kind === "string" || field.kind === "shortCompressedString" || field.kind === "longCompressedString" || field.kind === "unknown") {
      return "";
    }
    if (field.rangeHigh >= field.rangeLow) {
      if (field.rangeLow <= 0 && field.rangeHigh >= 0) {
        return "0";
      }
      return String(Math.trunc(field.rangeLow));
    }
    return "0";
  }
}

function makeLanguageHashTable(): number[] {
  const table: number[] = [];
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = (value & 1) !== 0 ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[i] = value >>> 0;
  }
  return table;
}

function computeLanguageHash(name: string): number {
  const bytes = new TextEncoder().encode(name);
  let value = 0;
  for (const byte of bytes) {
    let index = byte & 0xdf;
    index = (index ^ value) & 0xff;
    value = ((value >>> 8) ^ languageHashTable[index]) >>> 0;
  }
  return (value ^ 0x80000000) >>> 0;
}

function toSignedInt32(value: number): number {
  return value | 0;
}
