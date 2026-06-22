import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";
import { datePartsToFifaDateCode, fifaDateCodeToAge, fifaDateCodeToIso, isoToFifaDateCode } from "./fifa-date";
import { NationService } from "./nation.service";

export interface PlayerEditorNameDraft {
  firstname: string;
  surname: string;
  commonname: string;
  playerjerseyname: string;
}

export interface PlayerResolvedNames extends PlayerEditorNameDraft {
  source: "editedplayernames" | "dcplayernames" | "playernames" | "compressed" | "empty";
}

export interface PlayerEditorFieldDraft {
  column: string;
  label: string;
  value: string;
  inputType: "number" | "text" | "date" | "nation" | "position";
  readonly?: boolean;
  min?: number;
  max?: number;
  relation?: string;
  storage?: "raw" | "fifaDate";
  rawValue?: string;
}

export interface PlayerEditorSectionDraft {
  id: string;
  title: string;
  fields: PlayerEditorFieldDraft[];
}

export interface PlayerEditorDraft {
  playerId: string;
  rowIndex: number;
  displayName: string;
  nameSource: PlayerResolvedNames["source"];
  nameIds: PlayerEditorNameDraft;
  nationalityName?: string;
  birthDateIso?: string;
  age?: number;
  namesAvailable: boolean;
  names: PlayerEditorNameDraft;
  identityFields: PlayerEditorFieldDraft[];
  sections: PlayerEditorSectionDraft[];
  hasHighQualityHead: boolean;
}

export interface PlayerSearchResult {
  rowIndex: number;
  playerId: string;
  displayName: string;
  nationalityName?: string;
  overall?: string;
  potential?: string;
  age?: number;
  nameSource: PlayerResolvedNames["source"];
}

export interface PlayerCreationResult {
  rowIndex: number;
  playerId: string;
  message: string;
}

interface FieldDefinition {
  column: string;
  label: string;
  inputType?: "number" | "text" | "nation" | "position";
  readonly?: boolean;
  min?: number;
  max?: number;
}

interface SectionDefinition {
  id: string;
  title: string;
  fields: FieldDefinition[];
}

interface NameResolution {
  value: string;
  source: PlayerResolvedNames["source"];
}

interface CachedTableIndex<T> {
  columnsKey: string;
  rowCount: number;
  rows: string[][];
  value: T;
}

@Injectable({ providedIn: "root" })
export class PlayerEditorService {
  private readonly nameMapCache = new WeakMap<DataTable, CachedTableIndex<Map<string, string>>>();
  private readonly editedNamesCache = new WeakMap<DataTable, CachedTableIndex<Map<string, PlayerEditorNameDraft>>>();
  private readonly playerRowIndexCache = new WeakMap<DataTable, CachedTableIndex<Map<string, number>>>();

  constructor(private readonly nations: NationService) {}

  private readonly identityFields: FieldDefinition[] = [
    { column: "playerid", label: "Player ID", readonly: true },
    { column: "nationality", label: "Nationality", inputType: "nation" },
    { column: "birthdate", label: "Birth date" },
    { column: "height", label: "Height" },
    { column: "weight", label: "Weight" },
    { column: "preferredfoot", label: "Preferred foot" },
    { column: "gender", label: "Gender" },
    { column: "contractvaliduntil", label: "Contract until" },
    { column: "playerjointeamdate", label: "Join date" },
    { column: "isretiring", label: "Retiring" },
    { column: "iscustomized", label: "Customized" },
    { column: "usercaneditname", label: "Editable name" }
  ];

  private readonly sections: SectionDefinition[] = [
    {
      id: "profile",
      title: "Profile",
      fields: [
        { column: "overallrating", label: "Overall", min: 0, max: 99, readonly: true },
        { column: "potential", label: "Potential", min: 0, max: 99 },
        { column: "internationalrep", label: "International rep", min: 0, max: 5 },
        { column: "skillmoves", label: "Skill moves", min: 0, max: 5 },
        { column: "weakfootabilitytypecode", label: "Weak foot", min: 0, max: 5 },
        { column: "preferredposition1", label: "Position 1", inputType: "position" },
        { column: "preferredposition2", label: "Position 2", inputType: "position" },
        { column: "preferredposition3", label: "Position 3", inputType: "position" },
        { column: "preferredposition4", label: "Position 4", inputType: "position" }
      ]
    },
    {
      id: "attributes",
      title: "Attributes",
      fields: [
        { column: "pacdiv", label: "Pace/Diving", min: 0, max: 99 },
        { column: "shohan", label: "Shooting/Handling", min: 0, max: 99 },
        { column: "paskic", label: "Passing/Kicking", min: 0, max: 99 },
        { column: "driref", label: "Dribbling/Reflexes", min: 0, max: 99 },
        { column: "defspe", label: "Defending/Speed", min: 0, max: 99 },
        { column: "phypos", label: "Physical/Positioning", min: 0, max: 99 },
        { column: "acceleration", label: "Acceleration", min: 0, max: 99 },
        { column: "sprintspeed", label: "Sprint speed", min: 0, max: 99 },
        { column: "agility", label: "Agility", min: 0, max: 99 },
        { column: "balance", label: "Balance", min: 0, max: 99 },
        { column: "reactions", label: "Reactions", min: 0, max: 99 },
        { column: "stamina", label: "Stamina", min: 0, max: 99 },
        { column: "strength", label: "Strength", min: 0, max: 99 },
        { column: "jumping", label: "Jumping", min: 0, max: 99 }
      ]
    },
    {
      id: "attacking",
      title: "Ball And Attack",
      fields: [
        { column: "crossing", label: "Crossing", min: 0, max: 99 },
        { column: "finishing", label: "Finishing", min: 0, max: 99 },
        { column: "headingaccuracy", label: "Heading", min: 0, max: 99 },
        { column: "shortpassing", label: "Short passing", min: 0, max: 99 },
        { column: "volleys", label: "Volleys", min: 0, max: 99 },
        { column: "dribbling", label: "Dribbling", min: 0, max: 99 },
        { column: "curve", label: "Curve", min: 0, max: 99 },
        { column: "freekickaccuracy", label: "Free kicks", min: 0, max: 99 },
        { column: "longpassing", label: "Long passing", min: 0, max: 99 },
        { column: "ballcontrol", label: "Ball control", min: 0, max: 99 },
        { column: "shotpower", label: "Shot power", min: 0, max: 99 },
        { column: "longshots", label: "Long shots", min: 0, max: 99 },
        { column: "penalties", label: "Penalties", min: 0, max: 99 },
        { column: "vision", label: "Vision", min: 0, max: 99 },
        { column: "composure", label: "Composure", min: 0, max: 99 },
        { column: "positioning", label: "Positioning", min: 0, max: 99 }
      ]
    },
    {
      id: "defense",
      title: "Defense",
      fields: [
        { column: "interceptions", label: "Interceptions", min: 0, max: 99 },
        { column: "defensiveawareness", label: "Def. awareness", min: 0, max: 99 },
        { column: "standingtackle", label: "Standing tackle", min: 0, max: 99 },
        { column: "slidingtackle", label: "Sliding tackle", min: 0, max: 99 },
        { column: "aggression", label: "Aggression", min: 0, max: 99 }
      ]
    },
    {
      id: "goalkeeper",
      title: "Goalkeeper",
      fields: [
        { column: "gkdiving", label: "GK diving", min: 0, max: 99 },
        { column: "gkhandling", label: "GK handling", min: 0, max: 99 },
        { column: "gkkicking", label: "GK kicking", min: 0, max: 99 },
        { column: "gkreflexes", label: "GK reflexes", min: 0, max: 99 },
        { column: "gkpositioning", label: "GK positioning", min: 0, max: 99 },
        { column: "gksavetype", label: "GK save type" },
        { column: "gkkickstyle", label: "GK kick style" },
        { column: "gkglovetypecode", label: "GK gloves" }
      ]
    },
    {
      id: "traits",
      title: "Traits",
      fields: [
        { column: "trait1", label: "Trait 1" },
        { column: "trait2", label: "Trait 2" },
        { column: "icontrait1", label: "Icon trait 1" },
        { column: "icontrait2", label: "Icon trait 2" },
        { column: "personality", label: "Personality" },
        { column: "skillmoveslikelihood", label: "Skill move likelihood" },
        { column: "modifier", label: "Modifier" },
        { column: "role1", label: "Role 1" },
        { column: "role2", label: "Role 2" },
        { column: "role3", label: "Role 3" }
      ]
    },
    {
      id: "appearance",
      title: "Appearance",
      fields: [
        { column: "headassetid", label: "Head asset" },
        { column: "headtypecode", label: "Head type" },
        { column: "headclasscode", label: "Head class" },
        { column: "headvariation", label: "Head variation" },
        { column: "bodytypecode", label: "Body type" },
        { column: "skintonecode", label: "Skin tone" },
        { column: "skintypecode", label: "Skin type" },
        { column: "skincomplexion", label: "Skin complexion" },
        { column: "hairtypecode", label: "Hair type" },
        { column: "hairstylecode", label: "Hair style" },
        { column: "haircolorcode", label: "Hair color" },
        { column: "facialhairtypecode", label: "Facial hair" },
        { column: "facialhaircolorcode", label: "Facial hair color" },
        { column: "eyecolorcode", label: "Eye color" },
        { column: "eyebrowcode", label: "Eyebrows" },
        { column: "shoetypecode", label: "Shoe type" },
        { column: "shoedesigncode", label: "Shoe design" },
        { column: "shoecolorcode1", label: "Shoe color 1" },
        { column: "shoecolorcode2", label: "Shoe color 2" },
        { column: "jerseystylecode", label: "Jersey style" },
        { column: "jerseysleevelengthcode", label: "Sleeves" },
        { column: "jerseyfit", label: "Jersey fit" }
      ]
    }
  ];

  findPlayersTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "players");
  }

  findNamesTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "editedplayernames");
  }

  invalidateTable(table?: DataTable): void {
    if (!table) {
      return;
    }
    this.nameMapCache.delete(table);
    this.editedNamesCache.delete(table);
    this.playerRowIndexCache.delete(table);
    this.nations.invalidateTable(table);
  }

  invalidateProject(project?: DbProject): void {
    this.nations.invalidateProject(project);
    for (const table of project?.tables ?? []) {
      this.invalidateTable(table);
    }
  }

  resolvePlayerName(project: DbProject | undefined, rowIndex: number): string {
    if (!project) {
      return "";
    }
    const players = this.findPlayersTable(project);
    if (!players || !players.rows[rowIndex]) {
      return "";
    }

    const playerId = this.read(players, rowIndex, "playerid");
    const names = this.resolveNames(project, players, rowIndex, playerId);
    return this.displayName(names, playerId);
  }

  resolvePlayerNameById(project: DbProject | undefined, playerId: string): string {
    return this.resolvePlayerSummaryById(project, playerId)?.displayName ?? `Player ${playerId}`;
  }

  resolvePlayerSummaryById(project: DbProject | undefined, playerId: string): PlayerSearchResult | undefined {
    const players = this.findPlayersTable(project);
    if (!project || !players) {
      return undefined;
    }

    const rowIndex = this.playerRowIndexById(players).get(playerId) ?? -1;
    return rowIndex >= 0 ? this.createPlayerSummary(project, players, rowIndex) : undefined;
  }

  findPlayers(project: DbProject | undefined, query: string, limit = 60): PlayerSearchResult[] {
    const players = this.findPlayersTable(project);
    if (!project || !players) {
      return [];
    }

    const normalizedQuery = this.normalizeSearch(query.trim());
    const results: PlayerSearchResult[] = [];
    for (let rowIndex = 0; rowIndex < players.rows.length; rowIndex += 1) {
      const summary = this.createPlayerSummary(project, players, rowIndex);
      if (!summary) {
        continue;
      }
      if (normalizedQuery && !this.playerMatchesQuery(summary, normalizedQuery)) {
        continue;
      }
      results.push(summary);
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  }

  createPlayer(project: DbProject | undefined): PlayerCreationResult {
    if (!project) {
      throw new Error("Open a DB/XML pair before creating a player.");
    }

    const players = this.findPlayersTable(project);
    if (!players) {
      throw new Error("players table was not found.");
    }

    const namesTable = this.findNamesTable(project);
    if (!namesTable) {
      throw new Error("editedplayernames table was not found.");
    }

    const playerId = this.nextPlayerId(players);
    const row = this.makeCreatedPlayerRow(players, playerId);
    players.rows.push(row);
    players.changed = true;
    this.invalidateTable(players);

    const nameRowIndex = this.findOrCreateNameRow(namesTable, playerId);
    this.write(namesTable, nameRowIndex, "firstname", "New");
    this.write(namesTable, nameRowIndex, "surname", "Player");
    this.write(namesTable, nameRowIndex, "commonname", "");
    this.write(namesTable, nameRowIndex, "playerjerseyname", "Player");
    namesTable.changed = true;
    this.invalidateTable(namesTable);

    return {
      rowIndex: players.rows.length - 1,
      playerId,
      message: `Player ${playerId} created in players + editedplayernames`
    };
  }

  isPlayersTable(table?: DataTable): boolean {
    return table?.name.toLowerCase() === "players";
  }

  createDraft(project: DbProject, rowIndex: number, isNew = false): PlayerEditorDraft | undefined {
    const players = this.findPlayersTable(project);
    if (!players || !players.rows[rowIndex]) {
      return undefined;
    }

    const playerId = this.read(players, rowIndex, "playerid");
    const names = this.resolveNames(project, players, rowIndex, playerId);
    const displayName = this.displayName(names, playerId);
    const birthdate = this.read(players, rowIndex, "birthdate");
    const birthDateIso = fifaDateCodeToIso(birthdate);
    const nationalityName = this.nations.resolveNation(project, this.read(players, rowIndex, "nationality"));
    const hasHighQualityHead = !isNew && this.read(players, rowIndex, "hashighqualityhead") === "1";

    return {
      playerId,
      rowIndex,
      displayName,
      nameSource: names.source,
      nameIds: {
        firstname: this.read(players, rowIndex, "firstnameid"),
        surname: this.read(players, rowIndex, "lastnameid"),
        commonname: this.read(players, rowIndex, "commonnameid"),
        playerjerseyname: this.read(players, rowIndex, "playerjerseynameid")
      },
      nationalityName,
      birthDateIso,
      age: fifaDateCodeToAge(birthdate),
      namesAvailable: Boolean(this.findNamesTable(project)),
      names,
      identityFields: this.makeFields(players, rowIndex, this.identityFields, isNew, project),
      sections: this.sections
        .map((section) => ({
          id: section.id,
          title: section.title,
          fields: this.makeFields(players, rowIndex, section.fields, isNew)
        }))
        .filter((section) => section.fields.length > 0),
      hasHighQualityHead
    };
  }

  private createPlayerSummary(project: DbProject, players: DataTable, rowIndex: number): PlayerSearchResult | undefined {
    if (!players.rows[rowIndex]) {
      return undefined;
    }

    const playerId = this.read(players, rowIndex, "playerid");
    const names = this.resolveNames(project, players, rowIndex, playerId);
    const birthdate = this.read(players, rowIndex, "birthdate");

    return {
      rowIndex,
      playerId,
      displayName: this.displayName(names, playerId),
      nationalityName: this.nations.resolveNation(project, this.read(players, rowIndex, "nationality")),
      overall: this.read(players, rowIndex, "overallrating"),
      potential: this.read(players, rowIndex, "potential"),
      age: fifaDateCodeToAge(birthdate),
      nameSource: names.source
    };
  }

  private playerMatchesQuery(player: PlayerSearchResult, normalizedQuery: string): boolean {
    return [
      player.displayName,
      player.playerId,
      player.nationalityName ?? ""
    ].some((value) => this.normalizeSearch(value).includes(normalizedQuery));
  }

  private makeCreatedPlayerRow(players: DataTable, playerId: string): string[] {
    const template = players.rows[0] ?? [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const birthdate = datePartsToFifaDateCode(2004, 1, 1, "birthdate");
    const joinDate = datePartsToFifaDateCode(today.getFullYear(), today.getMonth() + 1, today.getDate(), "playerjointeamdate");
    const defaultValues = new Map<string, string>([
      ["playerid", playerId],
      ["firstnameid", "0"],
      ["lastnameid", "0"],
      ["commonnameid", "0"],
      ["playerjerseynameid", "0"],
      ["iscustomized", "1"],
      ["usercaneditname", "1"],
      ["hashighqualityhead", "0"],
      ["overallrating", "60"],
      ["potential", "60"],
      ["height", "180"],
      ["weight", "75"],
      ["birthdate", birthdate],
      ["playerjointeamdate", joinDate],
      ["contractvaliduntil", String(currentYear + 2)],
      ["isretiring", "0"]
    ]);

    return players.columns.map((column, columnIndex) => {
      const lowerColumn = column.toLowerCase();
      const fallback = template[columnIndex] ?? this.defaultValueForField(players.fields[columnIndex]);
      const value = defaultValues.get(lowerColumn) ?? fallback;
      return this.clampFieldValue(players, lowerColumn, value, fallback);
    });
  }

  private nextPlayerId(players: DataTable): string {
    const playerIdColumn = this.columnIndex(players, "playerid");
    if (playerIdColumn < 0) {
      throw new Error("players.playerid column was not found.");
    }

    const field = this.fieldForColumn(players, "playerid");
    const used = new Set<number>();
    let maxId = 0;
    for (const row of players.rows) {
      const value = Number(row[playerIdColumn]);
      if (!Number.isInteger(value) || value <= 0) {
        continue;
      }
      used.add(value);
      maxId = Math.max(maxId, value);
    }

    const minId = Math.max(1, Math.trunc(field?.rangeLow ?? 1));
    const maxAllowed = field && field.rangeHigh >= field.rangeLow ? Math.trunc(field.rangeHigh) : Number.MAX_SAFE_INTEGER;
    const next = Math.max(maxId + 1, minId);
    if (next <= maxAllowed && !used.has(next)) {
      return String(next);
    }

    const scanLimit = Math.min(maxAllowed, minId + Math.max(players.rows.length * 2, 100000));
    for (let candidate = minId; candidate <= scanLimit; candidate += 1) {
      if (!used.has(candidate)) {
        return String(candidate);
      }
    }

    throw new Error("No free playerid was found in the players table range.");
  }

  applyDraft(project: DbProject, draft: PlayerEditorDraft): { message: string; changedTables: string[] } {
    const players = this.findPlayersTable(project);
    if (!players) {
      throw new Error("players table was not found.");
    }

    const row = players.rows[draft.rowIndex];
    if (!row) {
      throw new Error("Selected player row no longer exists.");
    }

    for (const field of [...draft.identityFields, ...draft.sections.flatMap((section) => section.fields)]) {
      if (!field.readonly) {
        this.write(players, draft.rowIndex, field.column, this.normalizeFieldForWrite(field));
      }
    }

    const changedTables = new Set<string>();
    players.changed = true;
    changedTables.add(players.name);

    const namesTable = this.findNamesTable(project);
    if (namesTable) {
      const nameRowIndex = this.findOrCreateNameRow(namesTable, draft.playerId);
      this.write(namesTable, nameRowIndex, "firstname", draft.names.firstname);
      this.write(namesTable, nameRowIndex, "surname", draft.names.surname);
      this.write(namesTable, nameRowIndex, "commonname", draft.names.commonname);
      this.write(namesTable, nameRowIndex, "playerjerseyname", draft.names.playerjerseyname);
      namesTable.changed = true;
      changedTables.add(namesTable.name);
      this.invalidateTable(namesTable);

      this.writeIfPresent(players, draft.rowIndex, "iscustomized", "1");
      this.writeIfPresent(players, draft.rowIndex, "usercaneditname", "1");
    }

    const newPlayerId = this.read(players, draft.rowIndex, "playerid");
    if (newPlayerId && newPlayerId !== draft.playerId) {
      const playerIdColumn = this.columnIndex(players, "playerid");
      if (players.rows.some((r, i) => i !== draft.rowIndex && r[playerIdColumn] === newPlayerId)) {
        throw new Error(`Player ID ${newPlayerId} is already in use.`);
      }

      if (namesTable) {
        const nameRowIndex = this.findRowByPlayerId(namesTable, draft.playerId);
        if (nameRowIndex >= 0) {
          this.write(namesTable, nameRowIndex, "playerid", newPlayerId);
          namesTable.changed = true;
        }
      }
      draft.playerId = newPlayerId;
    }

    return {
      message: `${this.displayName(draft.names, draft.playerId)} updated in ${[...changedTables].join(" + ")}`,
      changedTables: [...changedTables]
    };
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

  private defaultValueForField(field: FieldDescriptor | undefined): string {
    if (!field) {
      return "";
    }
    if (field.kind === "string") {
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

  private numericRangeForField(field: FieldDescriptor | undefined): { min?: number; max?: number } {
    if (!field || field.kind === "string" || field.kind === "float" || field.rangeHigh < field.rangeLow) {
      return {};
    }

    return {
      min: Math.trunc(field.rangeLow),
      max: Math.trunc(field.rangeHigh)
    };
  }

  private fieldStoresFifaDate(column: string): boolean {
    const normalized = column.toLowerCase();
    return normalized === "birthdate" || normalized === "playerjointeamdate";
  }

  private clampFieldValue(table: DataTable, column: string, value: string, fallback: string): string {
    const field = this.fieldForColumn(table, column);
    if (!field || field.kind === "string") {
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

  private normalizeFieldForWrite(field: PlayerEditorFieldDraft): string {
    if (field.storage === "fifaDate") {
      return isoToFifaDateCode(field.value, field.column);
    }

    if (field.inputType === "number" || field.inputType === "nation" || field.inputType === "position") {
      return this.validateNumericField(field);
    }

    return field.value;
  }

  private validateNumericField(field: PlayerEditorFieldDraft): string {
    const raw = field.value.trim();
    if (!/^-?\d+$/.test(raw)) {
      throw new Error(`${field.label}: expected an integer value.`);
    }

    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric)) {
      throw new Error(`${field.label}: value is outside the safe integer range.`);
    }

    if (field.min !== undefined && numeric < field.min) {
      throw new Error(`${field.label}: value must be at least ${field.min}.`);
    }

    if (field.max !== undefined && numeric > field.max) {
      throw new Error(`${field.label}: value must be at most ${field.max}.`);
    }

    return raw;
  }

  private read(table: DataTable, rowIndex: number, column: string): string {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      return "";
    }
    return table.rows[rowIndex]?.[columnIndex] ?? "";
  }

  private write(table: DataTable, rowIndex: number, column: string, value: string): void {
    const columnIndex = this.columnIndex(table, column);
    if (columnIndex < 0) {
      return;
    }
    const row = table.rows[rowIndex];
    if (!row) {
      return;
    }
    while (row.length < table.columns.length) {
      row.push("");
    }
    row[columnIndex] = value;
  }

  private writeIfPresent(table: DataTable, rowIndex: number, column: string, value: string): void {
    if (this.columnIndex(table, column) >= 0) {
      this.write(table, rowIndex, column, value);
    }
  }

  private resolveFieldRelation(project: DbProject | undefined, column: string, value: string): string | undefined {
    if (!project) {
      return undefined;
    }
    if (column.toLowerCase() === "nationality") {
      return this.nations.resolveNation(project, value) || undefined;
    }
    if (this.fieldStoresFifaDate(column)) {
      const iso = fifaDateCodeToIso(value);
      return iso ? `FIFA ${value}` : `Invalid FIFA date: ${value}`;
    }
    return undefined;
  }

  private nameMap(table: DataTable): Map<string, string> {
    return this.cachedTableValue(this.nameMapCache, table, () => {
      const indexed = new Map<string, string>();
      const nameIdColumn = this.columnIndex(table, "nameid");
      const nameColumn = this.columnIndex(table, "name");
      if (nameIdColumn < 0 || nameColumn < 0) {
        return indexed;
      }
      for (const row of table.rows) {
        const nameId = row[nameIdColumn];
        if (nameId) {
          indexed.set(nameId, row[nameColumn]?.trim() ?? "");
        }
      }
      return indexed;
    });
  }

  private editedNamesMap(table: DataTable): Map<string, PlayerEditorNameDraft> {
    return this.cachedTableValue(this.editedNamesCache, table, () => {
      const indexed = new Map<string, PlayerEditorNameDraft>();
      const playerIdColumn = this.columnIndex(table, "playerid");
      const firstnameColumn = this.columnIndex(table, "firstname");
      const surnameColumn = this.columnIndex(table, "surname");
      const commonNameColumn = this.columnIndex(table, "commonname");
      const jerseyNameColumn = this.columnIndex(table, "playerjerseyname");
      if (playerIdColumn < 0) {
        return indexed;
      }
      for (const row of table.rows) {
        const playerId = row[playerIdColumn];
        if (!playerId) {
          continue;
        }
        indexed.set(playerId, {
          firstname: firstnameColumn >= 0 ? row[firstnameColumn] ?? "" : "",
          surname: surnameColumn >= 0 ? row[surnameColumn] ?? "" : "",
          commonname: commonNameColumn >= 0 ? row[commonNameColumn] ?? "" : "",
          playerjerseyname: jerseyNameColumn >= 0 ? row[jerseyNameColumn] ?? "" : ""
        });
      }
      return indexed;
    });
  }

  private playerRowIndexById(table: DataTable): Map<string, number> {
    return this.cachedTableValue(this.playerRowIndexCache, table, () => {
      const indexed = new Map<string, number>();
      const playerIdColumn = this.columnIndex(table, "playerid");
      if (playerIdColumn < 0) {
        return indexed;
      }
      table.rows.forEach((row, rowIndex) => {
        const playerId = row[playerIdColumn];
        if (playerId) {
          indexed.set(playerId, rowIndex);
        }
      });
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

  private makeFields(
    table: DataTable,
    rowIndex: number,
    definitions: FieldDefinition[],
    isNew: boolean,
    project?: DbProject
  ): PlayerEditorFieldDraft[] {
    return definitions
      .filter((definition) => this.columnIndex(table, definition.column) >= 0)
      .map((definition) => {
        const rawValue = this.read(table, rowIndex, definition.column);
        const field = this.fieldForColumn(table, definition.column);
        const isFifaDate = this.fieldStoresFifaDate(definition.column);
        const numericRange = isFifaDate ? {} : this.numericRangeForField(field);
        const dateValue = isFifaDate ? fifaDateCodeToIso(rawValue) : undefined;

        return {
          column: definition.column,
          label: definition.label,
          value: dateValue ?? rawValue,
          inputType: dateValue ? "date" as const : definition.inputType ?? "number" as const,
          readonly: definition.readonly && !(isNew && definition.column.toLowerCase() === "playerid"),
          min: definition.min ?? numericRange.min,
          max: definition.max ?? numericRange.max,
          relation: this.resolveFieldRelation(project, definition.column, rawValue),
          storage: dateValue ? "fifaDate" as const : "raw" as const,
          rawValue
        };
      });
  }

  private resolveNames(project: DbProject, players: DataTable, rowIndex: number, playerId: string): PlayerResolvedNames {
    const namesTable = this.findNamesTable(project);
    const editedNames = namesTable ? this.editedNamesMap(namesTable).get(playerId) : undefined;
    if (editedNames && this.hasAnyName(editedNames)) {
      return {
        ...editedNames,
        source: "editedplayernames"
      };
    }

    const firstname = this.resolveNameId(project, this.read(players, rowIndex, "firstnameid"));
    const surname = this.resolveNameId(project, this.read(players, rowIndex, "lastnameid"));
    const commonname = this.resolveNameId(project, this.read(players, rowIndex, "commonnameid"));
    const playerjerseyname = this.resolveNameId(project, this.read(players, rowIndex, "playerjerseynameid"));
    const resolvedNames = {
      firstname: firstname.value,
      surname: surname.value,
      commonname: commonname.value,
      playerjerseyname: playerjerseyname.value
    };

    if (this.hasAnyName(resolvedNames)) {
      return {
        ...resolvedNames,
        source: this.pickNameSource([firstname, surname, commonname, playerjerseyname])
      };
    }

    const hasCompressedNames = [firstname, surname, commonname, playerjerseyname].some((name) => name.source === "compressed");
    return {
      firstname: "",
      surname: "",
      commonname: "",
      playerjerseyname: "",
      source: hasCompressedNames ? "compressed" : "empty"
    };
  }

  private resolveNameId(project: DbProject, nameId: string): NameResolution {
    if (!nameId || nameId === "0" || nameId === "-1") {
      return { value: "", source: "empty" };
    }

    const dcName = this.lookupName(project, "dcplayernames", nameId);
    if (dcName) {
      return { value: dcName, source: "dcplayernames" };
    }

    const standardName = this.lookupName(project, "playernames", nameId);
    if (standardName) {
      return { value: standardName, source: "playernames" };
    }

    const compressedToken = this.lookupCompressedNameToken(project, nameId);
    if (compressedToken) {
      return { value: "", source: "compressed" };
    }

    return { value: "", source: "empty" };
  }

  private lookupName(project: DbProject, tableName: string, nameId: string): string {
    const table = this.findTable(project, tableName);
    if (!table) {
      return "";
    }
    const value = this.nameMap(table).get(nameId) ?? "";
    return this.isReadableName(value) ? value : "";
  }

  private lookupCompressedNameToken(project: DbProject, nameId: string): string {
    const table = this.findTable(project, "playernames");
    if (!table) {
      return "";
    }
    return this.nameMap(table).get(nameId) ?? "";
  }

  private pickNameSource(names: NameResolution[]): PlayerResolvedNames["source"] {
    if (names.some((name) => name.source === "dcplayernames")) {
      return "dcplayernames";
    }
    if (names.some((name) => name.source === "playernames")) {
      return "playernames";
    }
    if (names.some((name) => name.source === "compressed")) {
      return "compressed";
    }
    return "empty";
  }

  private isReadableName(value: string): boolean {
    return Boolean(value && /[^\d\s.-]/.test(value));
  }

  private readNames(table: DataTable | undefined, rowIndex: number): PlayerEditorNameDraft {
    if (!table || rowIndex < 0) {
      return {
        firstname: "",
        surname: "",
        commonname: "",
        playerjerseyname: ""
      };
    }

    return {
      firstname: this.read(table, rowIndex, "firstname"),
      surname: this.read(table, rowIndex, "surname"),
      commonname: this.read(table, rowIndex, "commonname"),
      playerjerseyname: this.read(table, rowIndex, "playerjerseyname")
    };
  }

  private findRowByPlayerId(table: DataTable, playerId: string): number {
    const playerIdColumn = this.columnIndex(table, "playerid");
    if (playerIdColumn < 0) {
      return -1;
    }
    return table.rows.findIndex((row) => row[playerIdColumn] === playerId);
  }

  private findOrCreateNameRow(table: DataTable, playerId: string): number {
    const existing = this.findRowByPlayerId(table, playerId);
    if (existing >= 0) {
      return existing;
    }

    const row = table.columns.map((column) => column.toLowerCase() === "playerid" ? playerId : "");
    table.rows.push(row);
    return table.rows.length - 1;
  }

  private displayName(names: PlayerEditorNameDraft, playerId: string): string {
    const commonName = names.commonname.trim();
    if (commonName) {
      return commonName;
    }
    const fullName = [names.firstname, names.surname].map((part) => part.trim()).filter(Boolean).join(" ");
    return fullName || `Player ${playerId}`;
  }

  private hasAnyName(names: PlayerEditorNameDraft): boolean {
    return Boolean(names.firstname.trim() || names.surname.trim() || names.commonname.trim() || names.playerjerseyname.trim());
  }

  private normalizeSearch(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  cancelCreatedPlayer(project: DbProject | undefined, playerId: string, rowIndex: number): void {
    if (!project) return;
    const players = this.findPlayersTable(project);
    if (players && players.rows[rowIndex]) {
      const rowPlayerId = this.read(players, rowIndex, "playerid");
      if (rowPlayerId === playerId) {
        players.rows.splice(rowIndex, 1);
        this.invalidateTable(players);
      }
    }
    const namesTable = this.findNamesTable(project);
    if (namesTable) {
      const nameRowIndex = this.findRowByPlayerId(namesTable, playerId);
      if (nameRowIndex >= 0) {
        namesTable.rows.splice(nameRowIndex, 1);
        this.invalidateTable(namesTable);
      }
    }
  }
}
