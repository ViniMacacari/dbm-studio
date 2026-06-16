import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";
import { LocalizationService } from "./localization.service";
import type { LocalizationFieldDraft } from "./localization.service";
import { NationService } from "./nation.service";
import type { SearchListOption } from "../components/search-list/search-list.component";

export interface LeagueEditorFieldDraft {
  column: string;
  label: string;
  value: string;
  inputType: "number" | "text" | "nation";
  readonly?: boolean;
  min?: number;
  max?: number;
  relation?: string;
}

export interface LeagueEditorSectionDraft {
  id: string;
  title: string;
  fields: LeagueEditorFieldDraft[];
}

export interface LeagueTeamLinkDraft {
  teamId: string;
  displayName: string;
  rowIndex: number;
  artificialKey: string;
  currenttableposition: string;
  previousyeartableposition: string;
  grouping: string;
  points: string;
}

export interface LeagueEditorDraft {
  leagueId: string;
  rowIndex: number;
  displayName: string;
  countryId: string;
  countryName: string;
  sections: LeagueEditorSectionDraft[];
  teamLinks: LeagueTeamLinkDraft[];
  teamOptions: SearchListOption[];
  teamToAdd: string;
  localizationFields: LocalizationFieldDraft[];
}

export interface LeagueSearchResult {
  rowIndex: number;
  leagueId: string;
  displayName: string;
  countryId: string;
  countryName: string;
  level?: string;
  leagueType?: string;
  teamsCount: number;
}

export interface LeagueCreationResult {
  rowIndex: number;
  leagueId: string;
  message: string;
}

interface FieldDefinition {
  column: string;
  label: string;
  inputType?: "number" | "text" | "nation";
  readonly?: boolean;
  min?: number;
  max?: number;
}

interface SectionDefinition {
  id: string;
  title: string;
  fields: FieldDefinition[];
}

@Injectable({ providedIn: "root" })
export class LeagueEditorService {
  private readonly sections: SectionDefinition[] = [
    {
      id: "identity",
      title: "Identity",
      fields: [
        { column: "leagueid", label: "League ID", readonly: true },
        { column: "leaguename", label: "League name", inputType: "text" },
        { column: "countryid", label: "Country", inputType: "nation" },
        { column: "leaguetype", label: "League type" },
        { column: "level", label: "Level" },
        { column: "leaguetimeslice", label: "Time slice" }
      ]
    },
    {
      id: "settings",
      title: "Settings",
      fields: [
        { column: "isinternationalleague", label: "International league", min: 0, max: 1 },
        { column: "iswomencompetition", label: "Women competition", min: 0, max: 1 },
        { column: "iswithintransferwindow", label: "Transfer window", min: 0, max: 1 },
        { column: "isbannerenabled", label: "Banner enabled", min: 0, max: 2 },
        { column: "iscompetitionscarfenabled", label: "Scarf enabled", min: 0, max: 2 },
        { column: "iscompetitionpoleflagenabled", label: "Pole flag enabled", min: 0, max: 2 },
        { column: "iscompetitioncrowdcardsenabled", label: "Crowd cards enabled", min: 0, max: 2 }
      ]
    }
  ];

  constructor(
    private readonly nations: NationService,
    private readonly localization: LocalizationService
  ) {}

  findLeaguesTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "leagues");
  }

  findLeagueTeamLinksTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "leagueteamlinks");
  }

  invalidateTable(table?: DataTable): void {
    this.nations.invalidateTable(table);
  }

  invalidateProject(project?: DbProject): void {
    this.nations.invalidateProject(project);
  }

  findLeagues(project: DbProject | undefined, query: string, countryId: string, limit = 80): LeagueSearchResult[] {
    const leagues = this.findLeaguesTable(project);
    if (!project || !leagues) {
      return [];
    }

    const normalizedQuery = this.normalizeSearch(query.trim());
    const results: LeagueSearchResult[] = [];
    for (let rowIndex = 0; rowIndex < leagues.rows.length; rowIndex += 1) {
      const summary = this.createLeagueSummary(project, leagues, rowIndex);
      if (!summary) {
        continue;
      }
      if (countryId && summary.countryId !== countryId) {
        continue;
      }
      if (normalizedQuery && !this.leagueMatchesQuery(summary, normalizedQuery)) {
        continue;
      }
      results.push(summary);
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  }

  createLeague(project: DbProject | undefined): LeagueCreationResult {
    if (!project) {
      throw new Error("Open a DB/XML pair before creating a league.");
    }

    const leagues = this.findLeaguesTable(project);
    if (!leagues) {
      throw new Error("leagues table was not found.");
    }

    const leagueId = this.nextId(leagues, "leagueid");
    leagues.rows.push(this.makeCreatedLeagueRow(leagues, leagueId));
    leagues.changed = true;
    this.invalidateTable(leagues);

    return {
      rowIndex: leagues.rows.length - 1,
      leagueId,
      message: `League ${leagueId} created in leagues`
    };
  }

  createDraft(project: DbProject, rowIndex: number): LeagueEditorDraft | undefined {
    const leagues = this.findLeaguesTable(project);
    if (!leagues || !leagues.rows[rowIndex]) {
      return undefined;
    }

    const leagueId = this.read(leagues, rowIndex, "leagueid");
    const countryId = this.read(leagues, rowIndex, "countryid");
    const displayName = this.displayName(leagues, rowIndex, leagueId);

    return {
      leagueId,
      rowIndex,
      displayName,
      countryId,
      countryName: this.nations.resolveNation(project, countryId),
      sections: this.sections
        .map((section) => ({
          id: section.id,
          title: section.title,
          fields: this.makeFields(project, leagues, rowIndex, section.fields)
        }))
        .filter((section) => section.fields.length > 0),
      teamLinks: this.linkedTeams(project, leagueId),
      teamOptions: this.teamOptions(project),
      teamToAdd: "",
      localizationFields: this.localization.leagueFields(project, leagueId, displayName)
    };
  }

  addTeamToDraft(draft: LeagueEditorDraft, teamId: string): string {
    if (!teamId) {
      throw new Error("Choose a team first.");
    }
    if (draft.teamLinks.some((link) => link.teamId === teamId)) {
      throw new Error("This team is already linked to the league.");
    }
    const team = draft.teamOptions.find((option) => option.value === teamId);
    if (!team) {
      throw new Error("Selected team was not found.");
    }

    const position = String(draft.teamLinks.length + 1);
    draft.teamLinks.push({
      teamId,
      displayName: team.label,
      rowIndex: -1,
      artificialKey: "",
      currenttableposition: position,
      previousyeartableposition: position,
      grouping: "0",
      points: "0"
    });
    draft.teamToAdd = "";
    return `${team.label} added to ${draft.displayName}`;
  }

  removeTeamFromDraft(draft: LeagueEditorDraft, teamId: string): void {
    draft.teamLinks = draft.teamLinks.filter((link) => link.teamId !== teamId);
  }

  applyDraft(project: DbProject, draft: LeagueEditorDraft): { message: string; changedTables: string[] } {
    const leagues = this.findLeaguesTable(project);
    if (!leagues) {
      throw new Error("leagues table was not found.");
    }
    if (!leagues.rows[draft.rowIndex]) {
      throw new Error("Selected league row no longer exists.");
    }

    const changedTables = new Set<string>();
    for (const field of draft.sections.flatMap((section) => section.fields)) {
      if (!field.readonly) {
        this.write(leagues, draft.rowIndex, field.column, this.normalizeFieldForWrite(field));
      }
    }
    leagues.changed = true;
    changedTables.add(leagues.name);

    const links = this.findLeagueTeamLinksTable(project);
    if (links) {
      this.applyTeamLinks(links, draft);
      changedTables.add(links.name);
    }

    this.localization.refreshGeneratedFields(
      draft.localizationFields,
      this.localization.leagueFields(project, draft.leagueId, this.displayName(leagues, draft.rowIndex, draft.leagueId))
    );
    const localizationResult = this.localization.applyFields(project, draft.localizationFields);
    if (localizationResult) {
      for (const tableName of localizationResult.changedTables) {
        changedTables.add(tableName);
      }
    }

    return {
      message: `${this.displayName(leagues, draft.rowIndex, draft.leagueId)} updated in ${[...changedTables].join(" + ")}`,
      changedTables: [...changedTables]
    };
  }

  private applyTeamLinks(links: DataTable, draft: LeagueEditorDraft): void {
    const keptTeamIds = new Set(draft.teamLinks.map((link) => link.teamId));
    const leagueIdColumn = this.columnIndex(links, "leagueid");
    const teamIdColumn = this.columnIndex(links, "teamid");
    if (leagueIdColumn < 0 || teamIdColumn < 0) {
      throw new Error("leagueteamlinks needs leagueid and teamid columns.");
    }

    links.rows = links.rows.filter((row) => row[leagueIdColumn] !== draft.leagueId || keptTeamIds.has(row[teamIdColumn] ?? ""));

    draft.teamLinks.forEach((link, index) => {
      const existingIndex = links.rows.findIndex((row) => row[leagueIdColumn] === draft.leagueId && row[teamIdColumn] === link.teamId);
      const rowIndex = existingIndex >= 0 ? existingIndex : this.createLeagueTeamLink(links, draft.leagueId, link.teamId, index + 1);
      this.write(links, rowIndex, "currenttableposition", this.validateNumericValue(link.currenttableposition, "Current position"));
      this.write(links, rowIndex, "previousyeartableposition", this.validateNumericValue(link.previousyeartableposition, "Previous position"));
      this.write(links, rowIndex, "grouping", this.validateNumericValue(link.grouping, "Grouping"));
      this.write(links, rowIndex, "points", this.validateNumericValue(link.points, "Points"));
    });

    links.changed = true;
  }

  private createLeagueTeamLink(links: DataTable, leagueId: string, teamId: string, position: number): number {
    const template = this.findLeagueTemplateRow(links, leagueId) ?? links.rows[0] ?? [];
    const artificialKey = this.nextArtificialKey(links);
    const defaults = new Map<string, string>([
      ["leagueid", leagueId],
      ["prevleagueid", leagueId],
      ["teamid", teamId],
      ["artificialkey", artificialKey],
      ["currenttableposition", String(position)],
      ["previousyeartableposition", String(position)],
      ["highestpossible", "0"],
      ["highestprobable", "0"],
      ["points", "0"],
      ["nummatchesplayed", "0"],
      ["grouping", "0"],
      ["teamform", "0"],
      ["champion", "0"],
      ["objective", "0"],
      ["actualvsexpectations", "0"]
    ]);

    const row = links.columns.map((column, columnIndex) => {
      const lowerColumn = column.toLowerCase();
      const fallback = template[columnIndex] ?? this.defaultValueForField(links.fields[columnIndex]);
      return this.clampFieldValue(links, lowerColumn, defaults.get(lowerColumn) ?? fallback, fallback);
    });
    links.rows.push(row);
    return links.rows.length - 1;
  }

  private makeCreatedLeagueRow(leagues: DataTable, leagueId: string): string[] {
    const defaults = new Map<string, string>([
      ["leagueid", leagueId],
      ["leaguename", "New League"],
      ["countryid", "0"],
      ["level", "1"],
      ["leaguetype", "0"],
      ["isinternationalleague", "0"],
      ["iswomencompetition", "0"],
      ["iswithintransferwindow", "0"]
    ]);

    return leagues.columns.map((column, columnIndex) => {
      const lowerColumn = column.toLowerCase();
      const fallback = this.defaultValueForField(leagues.fields[columnIndex]);
      return this.clampFieldValue(leagues, lowerColumn, defaults.get(lowerColumn) ?? fallback, fallback);
    });
  }

  private nextId(table: DataTable, column: string): string {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      throw new Error(`${table.name}.${column} column was not found.`);
    }

    const field = this.fieldForColumn(table, column);
    const used = new Set<number>();
    let maxId = 0;
    for (const row of table.rows) {
      const value = Number(row[columnIndex]);
      if (Number.isInteger(value) && value > 0) {
        used.add(value);
        maxId = Math.max(maxId, value);
      }
    }

    const minId = Math.max(1, Math.trunc(field?.rangeLow ?? 1));
    const maxAllowed = field && field.rangeHigh >= field.rangeLow ? Math.trunc(field.rangeHigh) : Number.MAX_SAFE_INTEGER;
    const next = Math.max(maxId + 1, minId);
    if (next <= maxAllowed && !used.has(next)) {
      return String(next);
    }

    const scanLimit = Math.min(maxAllowed, minId + Math.max(table.rows.length * 2, 100000));
    for (let candidate = minId; candidate <= scanLimit; candidate += 1) {
      if (!used.has(candidate)) {
        return String(candidate);
      }
    }

    throw new Error(`No free ${column} was found in ${table.name}.`);
  }

  private createLeagueSummary(project: DbProject, leagues: DataTable, rowIndex: number): LeagueSearchResult | undefined {
    if (!leagues.rows[rowIndex]) {
      return undefined;
    }

    const leagueId = this.read(leagues, rowIndex, "leagueid");
    const countryId = this.read(leagues, rowIndex, "countryid");
    return {
      rowIndex,
      leagueId,
      displayName: this.displayName(leagues, rowIndex, leagueId),
      countryId,
      countryName: this.nations.resolveNation(project, countryId),
      level: this.read(leagues, rowIndex, "level"),
      leagueType: this.read(leagues, rowIndex, "leaguetype"),
      teamsCount: this.countLeagueLinks(project, leagueId)
    };
  }

  private linkedTeams(project: DbProject, leagueId: string): LeagueTeamLinkDraft[] {
    const links = this.findLeagueTeamLinksTable(project);
    if (!links) {
      return [];
    }

    const leagueIdColumn = this.columnIndex(links, "leagueid");
    const teamIdColumn = this.columnIndex(links, "teamid");
    if (leagueIdColumn < 0 || teamIdColumn < 0) {
      return [];
    }

    return links.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row[leagueIdColumn] === leagueId)
      .map(({ row, rowIndex }) => {
        const teamId = row[teamIdColumn] ?? "";
        return {
          teamId,
          displayName: this.resolveTeamName(project, teamId),
          rowIndex,
          artificialKey: this.read(links, rowIndex, "artificialkey"),
          currenttableposition: this.read(links, rowIndex, "currenttableposition"),
          previousyeartableposition: this.read(links, rowIndex, "previousyeartableposition"),
          grouping: this.read(links, rowIndex, "grouping"),
          points: this.read(links, rowIndex, "points")
        };
      })
      .sort((left, right) => Number(left.currenttableposition) - Number(right.currenttableposition));
  }

  private teamOptions(project: DbProject): SearchListOption[] {
    const teams = this.findTable(project, "teams");
    if (!teams) {
      return [];
    }

    const teamIdColumn = this.columnIndex(teams, "teamid");
    const nameColumn = this.columnIndex(teams, "teamname");
    if (teamIdColumn < 0) {
      return [];
    }

    return teams.rows
      .map((row) => {
        const teamId = row[teamIdColumn]?.trim() ?? "";
        const name = nameColumn >= 0 ? row[nameColumn]?.trim() ?? "" : "";
        return {
          value: teamId,
          label: name || `Team ${teamId}`,
          meta: teamId
        };
      })
      .filter((option) => option.value)
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  private makeFields(
    project: DbProject,
    table: DataTable,
    rowIndex: number,
    definitions: FieldDefinition[]
  ): LeagueEditorFieldDraft[] {
    return definitions
      .filter((definition) => this.columnIndex(table, definition.column) >= 0)
      .map((definition) => {
        const field = this.fieldForColumn(table, definition.column);
        const range = this.numericRangeForField(field);
        const value = this.read(table, rowIndex, definition.column);
        return {
          column: definition.column,
          label: definition.label,
          value,
          inputType: definition.inputType ?? this.inputTypeForField(field),
          readonly: definition.readonly,
          min: definition.min ?? range.min,
          max: definition.max ?? range.max,
          relation: definition.inputType === "nation" ? this.nations.resolveNation(project, value) : undefined
        };
      });
  }

  private leagueMatchesQuery(league: LeagueSearchResult, normalizedQuery: string): boolean {
    return [
      league.displayName,
      league.leagueId,
      league.countryName
    ].some((value) => this.normalizeSearch(value).includes(normalizedQuery));
  }

  private countLeagueLinks(project: DbProject, leagueId: string): number {
    const links = this.findLeagueTeamLinksTable(project);
    if (!links) {
      return 0;
    }
    const leagueIdColumn = this.columnIndex(links, "leagueid");
    return leagueIdColumn >= 0 ? links.rows.filter((row) => row[leagueIdColumn] === leagueId).length : 0;
  }

  private findLeagueTemplateRow(links: DataTable, leagueId: string): string[] | undefined {
    const leagueIdColumn = this.columnIndex(links, "leagueid");
    return leagueIdColumn >= 0 ? links.rows.find((row) => row[leagueIdColumn] === leagueId) : undefined;
  }

  private nextArtificialKey(links: DataTable): string {
    const columnIndex = this.columnIndex(links, "artificialkey");
    if (columnIndex < 0) {
      return "0";
    }
    const max = links.rows.reduce((highest, row) => {
      const value = Number(row[columnIndex]);
      return Number.isInteger(value) ? Math.max(highest, value) : highest;
    }, -1);
    return String(max + 1);
  }

  private normalizeFieldForWrite(field: LeagueEditorFieldDraft): string {
    if (field.inputType === "text") {
      return field.value;
    }
    return this.validateNumericField(field);
  }

  private validateNumericField(field: LeagueEditorFieldDraft): string {
    const raw = this.validateNumericValue(field.value, field.label);
    const numeric = Number(raw);
    if (field.min !== undefined && numeric < field.min) {
      throw new Error(`${field.label}: value must be at least ${field.min}.`);
    }
    if (field.max !== undefined && numeric > field.max) {
      throw new Error(`${field.label}: value must be at most ${field.max}.`);
    }
    return raw;
  }

  private validateNumericValue(value: string, label: string): string {
    const raw = value.trim();
    if (!/^-?\d+$/.test(raw)) {
      throw new Error(`${label}: expected an integer value.`);
    }
    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric)) {
      throw new Error(`${label}: value is outside the safe integer range.`);
    }
    return raw;
  }

  private resolveTeamName(project: DbProject, teamId: string): string {
    const teams = this.findTable(project, "teams");
    if (!teams) {
      return `Team ${teamId}`;
    }
    const teamIdColumn = this.columnIndex(teams, "teamid");
    const nameColumn = this.columnIndex(teams, "teamname");
    if (teamIdColumn < 0 || nameColumn < 0) {
      return `Team ${teamId}`;
    }
    const row = teams.rows.find((candidate) => candidate[teamIdColumn] === teamId);
    return row?.[nameColumn]?.trim() || `Team ${teamId}`;
  }

  private displayName(table: DataTable, rowIndex: number, leagueId: string): string {
    return this.read(table, rowIndex, "leaguename").trim() || `League ${leagueId}`;
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

  private clampFieldValue(table: DataTable, column: string, value: string, fallback: string): string {
    const field = this.fieldForColumn(table, column);
    if (!field || field.kind === "string" || field.kind === "shortCompressedString" || field.kind === "longCompressedString" || field.kind === "unknown") {
      return value;
    }

    const numeric = Number(value);
    const fallbackNumeric = Number(fallback);
    if (!Number.isFinite(numeric)) {
      return Number.isFinite(fallbackNumeric) ? fallback : this.defaultValueForField(field);
    }

    if (field.rangeHigh < field.rangeLow) {
      return String(Math.trunc(numeric));
    }

    const clamped = Math.min(Math.max(Math.trunc(numeric), Math.trunc(field.rangeLow)), Math.trunc(field.rangeHigh));
    return String(clamped);
  }

  private findTable(project: DbProject | undefined, name: string): DataTable | undefined {
    return project?.tables.find((table) => table.name.toLowerCase() === name);
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  }

  private fieldForColumn(table: DataTable, column: string): FieldDescriptor | undefined {
    const index = this.columnIndex(table, column);
    return index >= 0 ? table.fields[index] : undefined;
  }

  private read(table: DataTable, rowIndex: number, column: string): string {
    const index = this.columnIndex(table, column);
    if (index < 0) {
      return "";
    }
    return table.rows[rowIndex]?.[index] ?? "";
  }

  private write(table: DataTable, rowIndex: number, column: string, value: string): void {
    const index = this.columnIndex(table, column);
    if (index < 0) {
      return;
    }
    const row = table.rows[rowIndex];
    if (!row) {
      return;
    }
    while (row.length < table.columns.length) {
      row.push("");
    }
    row[index] = value;
  }

  private inputTypeForField(field: FieldDescriptor | undefined): "number" | "text" {
    return field?.kind === "string" ? "text" : "number";
  }

  private numericRangeForField(field: FieldDescriptor | undefined): { min?: number; max?: number } {
    if (!field || field.kind === "string" || field.kind === "float" || field.rangeHigh < field.rangeLow) {
      return {};
    }
    return {
      min: Math.trunc(field.rangeLow),
      max: Math.trunc(field.rangeHigh)
    };
  }

  private normalizeSearch(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
}
