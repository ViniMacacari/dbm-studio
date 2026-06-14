import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";
import type { SearchListOption } from "../components/search-list/search-list.component";
import { PlayerEditorService } from "./player-editor.service";

export interface TeamPlayerLinkDraft {
  rowIndex: number;
  playerId: string;
  displayName: string;
  teamId: string;
  teamName: string;
  jerseyNumber: string;
  position: string;
  form: string;
  injury: string;
  leagueAppearances: string;
  leagueGoals: string;
  yellows: string;
  reds: string;
}

export interface TransferSearchResult extends TeamPlayerLinkDraft {
  overall?: string;
  potential?: string;
  age?: number;
  nationalityName?: string;
}

export interface TransferApplyResult {
  message: string;
  changedTables: string[];
}

@Injectable({ providedIn: "root" })
export class TransferService {
  constructor(private readonly players: PlayerEditorService) {}

  findTeamPlayerLinksTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teamplayerlinks");
  }

  canUseTransferModule(project?: DbProject): boolean {
    return Boolean(this.findTeamPlayerLinksTable(project) && this.players.findPlayersTable(project) && this.findTeamsTable(project));
  }

  teamOptions(project?: DbProject): SearchListOption[] {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      return [];
    }

    const teamIdColumn = this.columnIndex(teams, "teamid");
    const nameColumn = this.columnIndex(teams, "teamname");
    if (teamIdColumn < 0) {
      return [];
    }

    return teams.rows
      .flatMap((row): SearchListOption[] => {
        const teamId = row[teamIdColumn] ?? "";
        if (!teamId) {
          return [];
        }
        const label = (nameColumn >= 0 ? row[nameColumn] : "")?.trim() || `Team ${teamId}`;
        return [{ value: teamId, label, meta: `ID ${teamId}` }];
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  playerOptions(project?: DbProject): SearchListOption[] {
    const players = this.players.findPlayersTable(project);
    if (!project || !players) {
      return [];
    }

    const playerIdColumn = this.columnIndex(players, "playerid");
    if (playerIdColumn < 0) {
      return [];
    }

    return players.rows
      .flatMap((row, rowIndex): SearchListOption[] => {
        const playerId = row[playerIdColumn] ?? "";
        if (!playerId) {
          return [];
        }
        return [{
          value: playerId,
          label: this.players.resolvePlayerName(project, rowIndex),
          meta: `ID ${playerId}`
        }];
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  linkedPlayers(project: DbProject, teamId: string): TeamPlayerLinkDraft[] {
    const links = this.findTeamPlayerLinksTable(project);
    if (!links) {
      return [];
    }

    const teamIdColumn = this.columnIndex(links, "teamid");
    if (teamIdColumn < 0) {
      return [];
    }

    return links.rows
      .map((_row, rowIndex) => this.createTeamPlayerLinkDraft(project, links, rowIndex))
      .filter((link): link is TeamPlayerLinkDraft => Boolean(link && link.teamId === teamId))
      .sort((left, right) => this.numericValue(left.jerseyNumber) - this.numericValue(right.jerseyNumber) || left.displayName.localeCompare(right.displayName));
  }

  findTransferPlayers(project: DbProject | undefined, query: string, limit = 80): TransferSearchResult[] {
    const links = this.findTeamPlayerLinksTable(project);
    if (!project || !links) {
      return [];
    }

    const normalizedQuery = this.normalizeSearch(query.trim());
    const results: TransferSearchResult[] = [];
    for (let rowIndex = 0; rowIndex < links.rows.length; rowIndex += 1) {
      const link = this.createTransferSearchResult(project, links, rowIndex);
      if (!link) {
        continue;
      }
      if (normalizedQuery && !this.transferMatchesQuery(link, normalizedQuery)) {
        continue;
      }
      results.push(link);
      if (results.length >= limit) {
        break;
      }
    }
    return results;
  }

  transferPlayer(project: DbProject | undefined, linkRowIndex: number, destinationTeamId: string): TransferApplyResult {
    if (!project) {
      throw new Error("Open a DB/XML pair first.");
    }

    const links = this.findTeamPlayerLinksTable(project);
    if (!links) {
      throw new Error("teamplayerlinks table was not found.");
    }
    if (!links.rows[linkRowIndex]) {
      throw new Error("Selected player link no longer exists.");
    }
    if (!destinationTeamId) {
      throw new Error("Choose a destination team.");
    }

    const playerId = this.read(links, linkRowIndex, "playerid");
    const sourceTeamId = this.read(links, linkRowIndex, "teamid");
    if (!this.resolveTeamName(project, destinationTeamId)) {
      throw new Error("Destination team was not found.");
    }
    if (sourceTeamId === destinationTeamId) {
      throw new Error("Destination team is already the current team.");
    }

    this.write(links, linkRowIndex, "teamid", destinationTeamId);
    links.changed = true;

    const playerName = this.players.resolvePlayerNameById(project, playerId);
    const sourceName = this.resolveTeamName(project, sourceTeamId) || `Team ${sourceTeamId}`;
    const destinationName = this.resolveTeamName(project, destinationTeamId) || `Team ${destinationTeamId}`;
    return {
      message: `${playerName} moved from ${sourceName} to ${destinationName}`,
      changedTables: [links.name]
    };
  }

  addPlayerToTeamDraft(draft: { teamId: string; displayName: string; playerLinks: TeamPlayerLinkDraft[]; playerOptions: SearchListOption[]; playerToAdd: string }, playerId: string): string {
    if (!playerId) {
      throw new Error("Choose a player first.");
    }
    if (draft.playerLinks.some((link) => link.playerId === playerId)) {
      throw new Error("This player is already linked to this team.");
    }
    const player = draft.playerOptions.find((option) => option.value === playerId);
    if (!player) {
      throw new Error("Selected player was not found.");
    }

    draft.playerLinks.push({
      rowIndex: -1,
      playerId,
      displayName: player.label,
      teamId: draft.teamId,
      teamName: draft.displayName,
      jerseyNumber: "99",
      position: "0",
      form: "3",
      injury: "0",
      leagueAppearances: "0",
      leagueGoals: "0",
      yellows: "0",
      reds: "0"
    });
    draft.playerToAdd = "";
    return `${player.label} added to ${draft.displayName}`;
  }

  applyTeamPlayers(project: DbProject, teamId: string, playerLinks: TeamPlayerLinkDraft[]): TransferApplyResult | undefined {
    const links = this.findTeamPlayerLinksTable(project);
    if (!links) {
      return undefined;
    }

    const teamIdColumn = this.columnIndex(links, "teamid");
    const playerIdColumn = this.columnIndex(links, "playerid");
    if (teamIdColumn < 0 || playerIdColumn < 0) {
      throw new Error("teamplayerlinks needs teamid and playerid columns.");
    }

    const desiredPlayerIds = new Set(playerLinks.map((link) => link.playerId));
    links.rows = links.rows.filter((row) => row[teamIdColumn] !== teamId || desiredPlayerIds.has(row[playerIdColumn] ?? ""));

    for (const playerLink of playerLinks) {
      const rowIndex = this.findPreferredPlayerLinkRow(links, playerLink, teamId, playerIdColumn, teamIdColumn);
      const targetRowIndex = rowIndex >= 0 ? rowIndex : this.createTeamPlayerLink(links, teamId, playerLink.playerId);
      this.write(links, targetRowIndex, "teamid", teamId);
      this.write(links, targetRowIndex, "playerid", playerLink.playerId);
      this.writeIfPresent(links, targetRowIndex, "jerseynumber", this.validateNumericValue(playerLink.jerseyNumber, `${playerLink.displayName} jersey number`));
      this.writeIfPresent(links, targetRowIndex, "position", this.validateNumericValue(playerLink.position, `${playerLink.displayName} position`));
      this.writeIfPresent(links, targetRowIndex, "form", this.validateNumericValue(playerLink.form, `${playerLink.displayName} form`));
      this.writeIfPresent(links, targetRowIndex, "injury", this.validateNumericValue(playerLink.injury, `${playerLink.displayName} injury`));
      this.writeIfPresent(links, targetRowIndex, "leagueappearances", this.validateNumericValue(playerLink.leagueAppearances, `${playerLink.displayName} appearances`));
      this.writeIfPresent(links, targetRowIndex, "leaguegoals", this.validateNumericValue(playerLink.leagueGoals, `${playerLink.displayName} goals`));
      this.writeIfPresent(links, targetRowIndex, "yellows", this.validateNumericValue(playerLink.yellows, `${playerLink.displayName} yellow cards`));
      this.writeIfPresent(links, targetRowIndex, "reds", this.validateNumericValue(playerLink.reds, `${playerLink.displayName} red cards`));
    }

    links.changed = true;
    return {
      message: `${playerLinks.length} player link(s) updated in teamplayerlinks`,
      changedTables: [links.name]
    };
  }

  private createTransferSearchResult(project: DbProject, links: DataTable, rowIndex: number): TransferSearchResult | undefined {
    const draft = this.createTeamPlayerLinkDraft(project, links, rowIndex);
    if (!draft) {
      return undefined;
    }

    const summary = this.players.resolvePlayerSummaryById(project, draft.playerId);
    return {
      ...draft,
      overall: summary?.overall,
      potential: summary?.potential,
      age: summary?.age,
      nationalityName: summary?.nationalityName
    };
  }

  private createTeamPlayerLinkDraft(project: DbProject, links: DataTable, rowIndex: number): TeamPlayerLinkDraft | undefined {
    if (!links.rows[rowIndex]) {
      return undefined;
    }

    const playerId = this.read(links, rowIndex, "playerid");
    const teamId = this.read(links, rowIndex, "teamid");
    if (!playerId || !teamId) {
      return undefined;
    }

    return {
      rowIndex,
      playerId,
      displayName: this.players.resolvePlayerNameById(project, playerId),
      teamId,
      teamName: this.resolveTeamName(project, teamId) || `Team ${teamId}`,
      jerseyNumber: this.read(links, rowIndex, "jerseynumber") || "99",
      position: this.read(links, rowIndex, "position") || "0",
      form: this.read(links, rowIndex, "form") || "0",
      injury: this.read(links, rowIndex, "injury") || "0",
      leagueAppearances: this.read(links, rowIndex, "leagueappearances") || "0",
      leagueGoals: this.read(links, rowIndex, "leaguegoals") || "0",
      yellows: this.read(links, rowIndex, "yellows") || "0",
      reds: this.read(links, rowIndex, "reds") || "0"
    };
  }

  private transferMatchesQuery(link: TransferSearchResult, normalizedQuery: string): boolean {
    return [
      link.displayName,
      link.playerId,
      link.teamName,
      link.teamId,
      link.nationalityName ?? ""
    ].some((value) => this.normalizeSearch(value).includes(normalizedQuery));
  }

  private findPreferredPlayerLinkRow(links: DataTable, playerLink: TeamPlayerLinkDraft, teamId: string, playerIdColumn: number, teamIdColumn: number): number {
    if (playerLink.rowIndex >= 0) {
      const row = links.rows[playerLink.rowIndex];
      if (row && row[playerIdColumn] === playerLink.playerId) {
        return playerLink.rowIndex;
      }
    }

    const currentTeamIndex = links.rows.findIndex((row) => row[playerIdColumn] === playerLink.playerId && row[teamIdColumn] === teamId);
    if (currentTeamIndex >= 0) {
      return currentTeamIndex;
    }

    return links.rows.findIndex((row) => row[playerIdColumn] === playerLink.playerId);
  }

  private createTeamPlayerLink(links: DataTable, teamId: string, playerId: string): number {
    const template = links.rows[0] ?? [];
    const artificialKey = this.nextArtificialKey(links);
    const row = links.columns.map((column, columnIndex) => {
      const normalizedColumn = column.toLowerCase();
      if (normalizedColumn === "teamid") {
        return teamId;
      }
      if (normalizedColumn === "playerid") {
        return playerId;
      }
      if (normalizedColumn === "artificialkey") {
        return artificialKey;
      }
      if (normalizedColumn === "jerseynumber") {
        return "99";
      }
      if (normalizedColumn === "form") {
        return "3";
      }
      return template[columnIndex] ?? this.defaultValueForField(links.fields[columnIndex]);
    });
    links.rows.push(row);
    return links.rows.length - 1;
  }

  private nextArtificialKey(links: DataTable): string {
    const artificialKeyColumn = this.columnIndex(links, "artificialkey");
    if (artificialKeyColumn < 0) {
      return String(links.rows.length);
    }

    let maxKey = -1;
    for (const row of links.rows) {
      const value = Number(row[artificialKeyColumn]);
      if (Number.isInteger(value)) {
        maxKey = Math.max(maxKey, value);
      }
    }
    return String(maxKey + 1);
  }

  private resolveTeamName(project: DbProject | undefined, teamId: string): string {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      return "";
    }

    const teamIdColumn = this.columnIndex(teams, "teamid");
    const nameColumn = this.columnIndex(teams, "teamname");
    if (teamIdColumn < 0) {
      return "";
    }

    const row = teams.rows.find((candidate) => candidate[teamIdColumn] === teamId);
    return row ? (nameColumn >= 0 ? row[nameColumn] : "")?.trim() || `Team ${teamId}` : "";
  }

  private findTeamsTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teams");
  }

  private findTable(project: DbProject | undefined, name: string): DataTable | undefined {
    return project?.tables.find((table) => table.name.toLowerCase() === name);
  }

  private columnIndex(table: DataTable, column: string): number {
    return table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
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

  private validateNumericValue(value: string, label: string): string {
    const raw = String(value).trim();
    if (!/^-?\d+$/.test(raw)) {
      throw new Error(`${label}: expected an integer value.`);
    }
    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric)) {
      throw new Error(`${label}: value is outside the safe integer range.`);
    }
    return raw;
  }

  private defaultValueForField(field: FieldDescriptor | undefined): string {
    if (!field || field.kind === "string") {
      return "";
    }
    if (field.rangeHigh >= field.rangeLow) {
      return field.rangeLow <= 0 && field.rangeHigh >= 0 ? "0" : String(Math.trunc(field.rangeLow));
    }
    return "0";
  }

  private numericValue(value: string): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
  }

  private normalizeSearch(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
}
