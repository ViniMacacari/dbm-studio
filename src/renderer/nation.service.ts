import { Injectable } from "@angular/core";
import type { DataTable, DbProject } from "../shared/types";
import type { SearchableOption } from "./searchable-select.component";

interface CachedTableIndex<T> {
  columnsKey: string;
  rowCount: number;
  rows: string[][];
  value: T;
}

@Injectable({ providedIn: "root" })
export class NationService {
  private readonly optionCache = new WeakMap<DataTable, CachedTableIndex<SearchableOption[]>>();
  private readonly nameCache = new WeakMap<DataTable, CachedTableIndex<Map<string, string>>>();

  findNationsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "nations");
  }

  nationOptions(project?: DbProject): SearchableOption[] {
    const table = this.findNationsTable(project);
    return table ? this.optionsForTable(table) : [];
  }

  resolveNation(project: DbProject | undefined, nationId: string): string {
    if (!project || !nationId) {
      return "";
    }
    const table = this.findNationsTable(project);
    if (!table) {
      return "";
    }
    return this.nameMap(table).get(nationId) ?? "";
  }

  invalidateTable(table?: DataTable): void {
    if (!table || table.name.toLowerCase() !== "nations") {
      return;
    }
    this.optionCache.delete(table);
    this.nameCache.delete(table);
  }

  invalidateProject(project?: DbProject): void {
    for (const table of project?.tables ?? []) {
      this.invalidateTable(table);
    }
  }

  private optionsForTable(table: DataTable): SearchableOption[] {
    return this.cachedTableValue(this.optionCache, table, () => {
      const nationIdColumn = this.columnIndex(table, "nationid");
      const nameColumn = this.columnIndex(table, "nationname");
      const isoColumn = this.columnIndex(table, "isocountrycode");
      if (nationIdColumn < 0 || nameColumn < 0) {
        return [];
      }

      return table.rows
        .map((row) => {
          const id = row[nationIdColumn]?.trim() ?? "";
          const name = row[nameColumn]?.trim() ?? "";
          const iso = isoColumn >= 0 ? row[isoColumn]?.trim() ?? "" : "";
          return {
            value: id,
            label: [name || `Nation ${id}`, iso ? `(${iso})` : ""].filter(Boolean).join(" "),
            meta: iso
          };
        })
        .filter((option) => option.value)
        .sort((left, right) => left.label.localeCompare(right.label));
    });
  }

  private nameMap(table: DataTable): Map<string, string> {
    return this.cachedTableValue(this.nameCache, table, () => {
      const indexed = new Map<string, string>();
      for (const option of this.optionsForTable(table)) {
        indexed.set(option.value, option.label);
      }
      return indexed;
    });
  }

  private cachedTableValue<T>(
    cache: WeakMap<DataTable, CachedTableIndex<T>>,
    table: DataTable,
    build: () => T
  ): T {
    const columnsKey = table.columns.join("\u001f");
    const cached = cache.get(table);
    if (cached && cached.rows === table.rows && cached.rowCount === table.rows.length && cached.columnsKey === columnsKey) {
      return cached.value;
    }

    const value = build();
    cache.set(table, {
      columnsKey,
      rowCount: table.rows.length,
      rows: table.rows,
      value
    });
    return value;
  }

  private findTable(project: DbProject | undefined, name: string): DataTable | undefined {
    return project?.tables.find((table) => table.name.toLowerCase() === name);
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  }
}
