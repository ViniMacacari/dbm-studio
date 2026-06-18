import { Injectable } from "@angular/core";
import type { DataTable, DbProject, FieldDescriptor } from "../../shared/types";
import type { SearchListOption } from "../components/search-list/search-list.component";
import { PlayerEditorService } from "./player-editor.service";
import { NationService } from "./nation.service";
import { fifaDateCodeToAge } from "./fifa-date";

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
  isNationalTeam?: boolean;
}

export interface TransferApplyResult {
  message: string;
  changedTables: string[];
}

@Injectable({ providedIn: "root" })
export class TransferService {
  constructor(
    private readonly players: PlayerEditorService,
    private readonly nations: NationService
  ) {}

  findTeamPlayerLinksTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teamplayerlinks");
  }

  findTeamNationLinksTable(project?: DbProject): DataTable | undefined {
    return this.findTable(project, "teamnationlinks");
  }

  isNationalTeam(project: DbProject, teamId: string): boolean {
    const teams = this.findTeamsTable(project);
    if (!teams) {
      return false;
    }
    const teamIdColumn = this.columnIndex(teams, "teamid");
    if (teamIdColumn < 0) {
      return false;
    }
    const row = teams.rows.find((r) => r[teamIdColumn] === teamId);
    if (!row) {
      return false;
    }

    const clubWorthCol = this.columnIndex(teams, "clubworth");
    const youthDevCol = this.columnIndex(teams, "youthdevelopment");
    const profitabilityCol = this.columnIndex(teams, "profitability");
    const popularityCol = this.columnIndex(teams, "popularity");
    const opponentWeakCol = this.columnIndex(teams, "opponentweakthreshold");

    const clubWorth = clubWorthCol >= 0 ? row[clubWorthCol] ?? "" : "";
    const youthDev = youthDevCol >= 0 ? row[youthDevCol] ?? "" : "";
    const profitability = profitabilityCol >= 0 ? row[profitabilityCol] ?? "" : "";
    const popularity = popularityCol >= 0 ? row[popularityCol] ?? "" : "";
    const opponentWeak = opponentWeakCol >= 0 ? row[opponentWeakCol] ?? "" : "";

    return clubWorth === "0" && youthDev === "0" && profitability === "0" && popularity === "0" && opponentWeak !== "0";
  }

  private readRowValue(table: DataTable, row: string[], column: string): string {
    const colIdx = this.columnIndex(table, column);
    if (colIdx < 0) {
      return "";
    }
    return row[colIdx] ?? "";
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
        if (project && this.isNationalTeam(project, teamId)) {
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

  private checkTableSortedByNameId(table: DataTable & { _isNameIdSorted?: boolean }, nameIdCol: number): boolean {
    if (table._isNameIdSorted !== undefined) {
      return table._isNameIdSorted;
    }
    let sorted = true;
    let prev = -Infinity;
    for (const row of table.rows) {
      const val = Number(row[nameIdCol]);
      if (Number.isInteger(val)) {
        if (val < prev) {
          sorted = false;
          break;
        }
        prev = val;
      }
    }
    table._isNameIdSorted = sorted;
    return sorted;
  }

  private binarySearchName(table: DataTable, nameIdCol: number, nameCol: number, nameId: string): string | undefined {
    let low = 0;
    let high = table.rows.length - 1;
    const target = Number(nameId);
    if (!Number.isInteger(target)) {
      return undefined;
    }

    while (low <= high) {
      const mid = (low + high) >> 1;
      const row = table.rows[mid];
      if (!row) break;
      const midVal = Number(row[nameIdCol]);
      if (midVal === target) {
        return row[nameCol]?.trim();
      } else if (midVal < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return undefined;
  }

  private nameMapLazy(table: DataTable & { _lazyNameMap?: Map<string, string> }): Map<string, string> {
    if (!table._lazyNameMap) {
      table._lazyNameMap = new Map<string, string>();
    }
    return table._lazyNameMap;
  }

  private lookupNameFast(project: DbProject, tableName: string, nameId: string): string {
    const table = this.findTable(project, tableName);
    if (!table || !nameId || nameId === "0" || nameId === "-1") {
      return "";
    }
    const nameIdCol = this.columnIndex(table, "nameid");
    const nameCol = this.columnIndex(table, "name");
    if (nameIdCol < 0 || nameCol < 0) {
      return "";
    }

    if (this.checkTableSortedByNameId(table, nameIdCol)) {
      const val = this.binarySearchName(table, nameIdCol, nameCol, nameId);
      if (val !== undefined) {
        return this.isReadableName(val) ? val : "";
      }
    }

    const lazyMap = this.nameMapLazy(table);
    if (lazyMap.has(nameId)) {
      const val = lazyMap.get(nameId) ?? "";
      return this.isReadableName(val) ? val : "";
    }

    const row = table.rows.find(r => r[nameIdCol] === nameId);
    const val = row ? row[nameCol]?.trim() ?? "" : "";
    lazyMap.set(nameId, val);
    return this.isReadableName(val) ? val : "";
  }

  private isReadableName(value: string): boolean {
    return Boolean(value && /[^\d\s.-]/.test(value));
  }

  private lookupEditedName(project: DbProject, playerId: string): { firstname: string; surname: string; commonname: string; playerjerseyname: string } | undefined {
    const table = this.findTable(project, "editedplayernames");
    if (!table) {
      return undefined;
    }
    const playerIdCol = this.columnIndex(table, "playerid");
    if (playerIdCol < 0) {
      return undefined;
    }
    
    const lazyMap = (table as any)._lazyEditedMap || new Map();
    if (!(table as any)._lazyEditedMap) {
      (table as any)._lazyEditedMap = lazyMap;
    }
    
    if (lazyMap.has(playerId)) {
      return lazyMap.get(playerId) || undefined;
    }
    
    const row = table.rows.find(r => r[playerIdCol] === playerId);
    if (!row) {
      lazyMap.set(playerId, null);
      return undefined;
    }
    
    const firstnameCol = this.columnIndex(table, "firstname");
    const surnameCol = this.columnIndex(table, "surname");
    const commonNameCol = this.columnIndex(table, "commonname");
    const jerseyNameCol = this.columnIndex(table, "playerjerseyname");
    
    const res = {
      firstname: firstnameCol >= 0 ? row[firstnameCol] ?? "" : "",
      surname: surnameCol >= 0 ? row[surnameCol] ?? "" : "",
      commonname: commonNameCol >= 0 ? row[commonNameCol] ?? "" : "",
      playerjerseyname: jerseyNameCol >= 0 ? row[jerseyNameCol] ?? "" : ""
    };
    lazyMap.set(playerId, res);
    return res;
  }

  private resolvePlayerNameFast(project: DbProject, playerId: string, playersTable: DataTable, rowIndex: number): string {
    const edited = this.lookupEditedName(project, playerId);
    if (edited && (edited.firstname || edited.surname || edited.commonname || edited.playerjerseyname)) {
      return this.displayName(edited, playerId);
    }
    
    const firstnameid = this.read(playersTable, rowIndex, "firstnameid");
    const lastnameid = this.read(playersTable, rowIndex, "lastnameid");
    const commonnameid = this.read(playersTable, rowIndex, "commonnameid");
    const playerjerseynameid = this.read(playersTable, rowIndex, "playerjerseynameid");
    
    const firstname = this.lookupNameFast(project, "dcplayernames", firstnameid) || this.lookupNameFast(project, "playernames", firstnameid);
    const surname = this.lookupNameFast(project, "dcplayernames", lastnameid) || this.lookupNameFast(project, "playernames", lastnameid);
    const commonname = this.lookupNameFast(project, "dcplayernames", commonnameid) || this.lookupNameFast(project, "playernames", commonnameid);
    const playerjerseyname = this.lookupNameFast(project, "dcplayernames", playerjerseynameid) || this.lookupNameFast(project, "playernames", playerjerseynameid);
    
    return this.displayName({ firstname, surname, commonname, playerjerseyname }, playerId);
  }

  private displayName(names: { firstname: string; surname: string; commonname: string; playerjerseyname: string }, playerId: string): string {
    if (names.commonname) {
      return names.commonname;
    }
    const parts = [names.firstname, names.surname].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(" ");
    }
    if (names.playerjerseyname) {
      return names.playerjerseyname;
    }
    return `Player ${playerId}`;
  }

  private resolvePlayerSummaryFast(project: DbProject, playerId: string): { displayName: string; overall: string; potential: string; age: number | undefined; nationalityName: string } | undefined {
    const playersTable = this.findTable(project, "players");
    if (!playersTable) {
      return undefined;
    }
    
    const playerIdCol = this.columnIndex(playersTable, "playerid");
    if (playerIdCol < 0) {
      return undefined;
    }
    
    const indexMap = (playersTable as any)._indexMap || new Map();
    if (!(playersTable as any)._indexMap) {
      (playersTable as any)._indexMap = indexMap;
      for (let r = 0; r < playersTable.rows.length; r++) {
        const id = playersTable.rows[r]?.[playerIdCol];
        if (id) {
          indexMap.set(id, r);
        }
      }
    }
    
    const rowIndex = indexMap.get(playerId) ?? -1;
    if (rowIndex < 0) {
      return undefined;
    }
    
    const displayName = this.resolvePlayerNameFast(project, playerId, playersTable, rowIndex);
    const birthdate = this.read(playersTable, rowIndex, "birthdate");
    const overall = this.read(playersTable, rowIndex, "overallrating");
    const potential = this.read(playersTable, rowIndex, "potential");
    const nationality = this.read(playersTable, rowIndex, "nationality");
    
    return {
      displayName,
      overall,
      potential,
      age: fifaDateCodeToAge(birthdate),
      nationalityName: this.nations.resolveNation(project, nationality)
    };
  }

  findTransferPlayers(project: DbProject | undefined, query: string, limit = 80): TransferSearchResult[] {
    const links = this.findTeamPlayerLinksTable(project);
    if (!project || !links) {
      return [];
    }

    const teamNamesMap = new Map<string, string>();
    const teamsTable = this.findTeamsTable(project);
    if (teamsTable) {
      const teamIdCol = this.columnIndex(teamsTable, "teamid");
      const nameCol = this.columnIndex(teamsTable, "teamname");
      if (teamIdCol >= 0) {
        for (const row of teamsTable.rows) {
          const teamId = row[teamIdCol];
          if (teamId) {
            teamNamesMap.set(teamId, (nameCol >= 0 ? row[nameCol] : "")?.trim() || `Team ${teamId}`);
          }
        }
      }
    }

    const normalizedQuery = this.normalizeSearch(query.trim());
    let matchingPlayerIds: Set<string> | null = null;

    if (normalizedQuery) {
      matchingPlayerIds = new Set<string>();

      const matchingNameIds = new Set<string>();
      
      const playernames = project.tables.find(t => t.name.toLowerCase() === "playernames");
      if (playernames) {
        const nameIdCol = this.columnIndex(playernames, "nameid");
        const nameCol = this.columnIndex(playernames, "name");
        if (nameIdCol >= 0 && nameCol >= 0) {
          for (const row of playernames.rows) {
            const nameVal = row[nameCol];
            if (nameVal && this.normalizeSearch(nameVal).includes(normalizedQuery)) {
              const nameId = row[nameIdCol];
              if (nameId) matchingNameIds.add(nameId);
            }
          }
        }
      }

      const dcplayernames = project.tables.find(t => t.name.toLowerCase() === "dcplayernames");
      if (dcplayernames) {
        const nameIdCol = this.columnIndex(dcplayernames, "nameid");
        const nameCol = this.columnIndex(dcplayernames, "name");
        if (nameIdCol >= 0 && nameCol >= 0) {
          for (const row of dcplayernames.rows) {
            const nameVal = row[nameCol];
            if (nameVal && this.normalizeSearch(nameVal).includes(normalizedQuery)) {
              const nameId = row[nameIdCol];
              if (nameId) matchingNameIds.add(nameId);
            }
          }
        }
      }

      const matchingPlayerIdsByEditedName = new Set<string>();
      const editedplayernames = project.tables.find(t => t.name.toLowerCase() === "editedplayernames");
      if (editedplayernames) {
        const playerIdCol = this.columnIndex(editedplayernames, "playerid");
        const firstnameCol = this.columnIndex(editedplayernames, "firstname");
        const surnameCol = this.columnIndex(editedplayernames, "surname");
        const commonnameCol = this.columnIndex(editedplayernames, "commonname");
        const jerseynameCol = this.columnIndex(editedplayernames, "playerjerseyname");
        if (playerIdCol >= 0) {
          for (const row of editedplayernames.rows) {
            const pid = row[playerIdCol];
            if (!pid) continue;
            const match =
              (firstnameCol >= 0 && row[firstnameCol] && this.normalizeSearch(row[firstnameCol]).includes(normalizedQuery)) ||
              (surnameCol >= 0 && row[surnameCol] && this.normalizeSearch(row[surnameCol]).includes(normalizedQuery)) ||
              (commonnameCol >= 0 && row[commonnameCol] && this.normalizeSearch(row[commonnameCol]).includes(normalizedQuery)) ||
              (jerseynameCol >= 0 && row[jerseynameCol] && this.normalizeSearch(row[jerseynameCol]).includes(normalizedQuery));
            if (match) {
              matchingPlayerIdsByEditedName.add(pid);
            }
          }
        }
      }

      const matchingNationIds = new Set<string>();
      const nationsTable = project.tables.find(t => t.name.toLowerCase() === "nations");
      if (nationsTable) {
        const nationIdCol = this.columnIndex(nationsTable, "nationid");
        const nationNameCol = this.columnIndex(nationsTable, "nationname");
        if (nationIdCol >= 0 && nationNameCol >= 0) {
          for (const row of nationsTable.rows) {
            const nName = row[nationNameCol];
            if (nName && this.normalizeSearch(nName).includes(normalizedQuery)) {
              const nid = row[nationIdCol];
              if (nid) matchingNationIds.add(nid);
            }
          }
        }
      }

      const playersTable = project.tables.find(t => t.name.toLowerCase() === "players");
      if (playersTable) {
        const playerIdCol = this.columnIndex(playersTable, "playerid");
        const firstnameidCol = this.columnIndex(playersTable, "firstnameid");
        const lastnameidCol = this.columnIndex(playersTable, "lastnameid");
        const commonnameidCol = this.columnIndex(playersTable, "commonnameid");
        const jerseynameidCol = this.columnIndex(playersTable, "playerjerseynameid");
        const nationalityCol = this.columnIndex(playersTable, "nationality");

        if (playerIdCol >= 0) {
          for (const row of playersTable.rows) {
            const pid = row[playerIdCol];
            if (!pid) continue;

            const isIdMatch = pid.includes(normalizedQuery);
            const isNameMatch =
              (firstnameidCol >= 0 && row[firstnameidCol] && matchingNameIds.has(row[firstnameidCol])) ||
              (lastnameidCol >= 0 && row[lastnameidCol] && matchingNameIds.has(row[lastnameidCol])) ||
              (commonnameidCol >= 0 && row[commonnameidCol] && matchingNameIds.has(row[commonnameidCol])) ||
              (jerseynameidCol >= 0 && row[jerseynameidCol] && matchingNameIds.has(row[jerseynameidCol])) ||
              matchingPlayerIdsByEditedName.has(pid);

            const isNationMatch = nationalityCol >= 0 && row[nationalityCol] && matchingNationIds.has(row[nationalityCol]);

            if (isIdMatch || isNameMatch || isNationMatch) {
              matchingPlayerIds.add(pid);
            }
          }
        }
      }
    }

    const results: TransferSearchResult[] = [];
    const linkPlayerIdCol = this.columnIndex(links, "playerid");
    const linkTeamIdCol = this.columnIndex(links, "teamid");

    if (linkPlayerIdCol >= 0 && linkTeamIdCol >= 0) {
      for (let rowIndex = 0; rowIndex < links.rows.length; rowIndex += 1) {
        const row = links.rows[rowIndex];
        if (!row) continue;
        const playerId = row[linkPlayerIdCol] ?? "";
        const teamId = row[linkTeamIdCol] ?? "";
        if (!playerId || !teamId) {
          continue;
        }

        if (normalizedQuery && matchingPlayerIds) {
          const teamName = teamNamesMap.get(teamId) || `Team ${teamId}`;
          const isTeamIdMatch = teamId.includes(normalizedQuery);
          const isTeamNameMatch = this.normalizeSearch(teamName).includes(normalizedQuery);
          const isPlayerMatch = matchingPlayerIds.has(playerId);

          if (!isTeamIdMatch && !isTeamNameMatch && !isPlayerMatch) {
            continue;
          }
        }

        // Lightweight result – no name/summary resolution yet
        results.push({
          rowIndex,
          playerId,
          displayName: `Player ${playerId}`,
          teamId,
          teamName: teamNamesMap.get(teamId) || `Team ${teamId}`,
          jerseyNumber: this.readRowValue(links, row, "jerseynumber") || "99",
          position: this.readRowValue(links, row, "position") || "0",
          form: this.readRowValue(links, row, "form") || "0",
          injury: this.readRowValue(links, row, "injury") || "0",
          leagueAppearances: this.readRowValue(links, row, "leagueappearances") || "0",
          leagueGoals: this.readRowValue(links, row, "leaguegoals") || "0",
          yellows: this.readRowValue(links, row, "yellows") || "0",
          reds: this.readRowValue(links, row, "reds") || "0"
        });
        if (results.length >= limit) {
          break;
        }
      }
    }
    return results;
  }

  /** Resolve display details (name, overall, age, nationality) for a single transfer result – call lazily for visible rows only */
  resolveTransferDetails(project: DbProject, result: TransferSearchResult): void {
    const summary = this.resolvePlayerSummaryFast(project, result.playerId);
    if (summary) {
      result.displayName = summary.displayName;
      result.overall = summary.overall;
      result.potential = summary.potential;
      result.age = summary.age;
      result.nationalityName = summary.nationalityName;
    }
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
    if (this.isNationalTeam(project, sourceTeamId)) {
      throw new Error("Cannot transfer players from a national team.");
    }
    if (this.isNationalTeam(project, destinationTeamId)) {
      throw new Error("Cannot transfer players to a national team.");
    }
    if (!this.resolveTeamName(project, destinationTeamId)) {
      throw new Error("Destination team was not found.");
    }
    if (sourceTeamId === destinationTeamId) {
      throw new Error("Destination team is already the current team.");
    }

    this.write(links, linkRowIndex, "teamid", destinationTeamId);
    links.changed = true;

    const playersTable = this.findTable(project, "players");
    let playerName = `Player ${playerId}`;
    if (playersTable) {
      const playerIdCol = this.columnIndex(playersTable, "playerid");
      if (playerIdCol >= 0) {
        const indexMap = (playersTable as any)._indexMap || new Map();
        if (!(playersTable as any)._indexMap) {
          (playersTable as any)._indexMap = indexMap;
          for (let r = 0; r < playersTable.rows.length; r++) {
            const id = playersTable.rows[r]?.[playerIdCol];
            if (id) {
              indexMap.set(id, r);
            }
          }
        }
        const pRowIndex = indexMap.get(playerId) ?? -1;
        if (pRowIndex >= 0) {
          playerName = this.resolvePlayerNameFast(project, playerId, playersTable, pRowIndex);
        }
      }
    }

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

  private createTransferSearchResult(
    project: DbProject,
    links: DataTable,
    rowIndex: number,
    teamNamesMap?: Map<string, string>
  ): TransferSearchResult | undefined {
    const draft = this.createTeamPlayerLinkDraft(project, links, rowIndex, teamNamesMap);
    if (!draft) {
      return undefined;
    }

    const summary = this.resolvePlayerSummaryFast(project, draft.playerId);
    return {
      ...draft,
      overall: summary?.overall,
      potential: summary?.potential,
      age: summary?.age,
      nationalityName: summary?.nationalityName
    };
  }

  private createTeamPlayerLinkDraft(
    project: DbProject,
    links: DataTable,
    rowIndex: number,
    teamNamesMap?: Map<string, string>
  ): TeamPlayerLinkDraft | undefined {
    if (!links.rows[rowIndex]) {
      return undefined;
    }

    const playerId = this.read(links, rowIndex, "playerid");
    const teamId = this.read(links, rowIndex, "teamid");
    if (!playerId || !teamId) {
      return undefined;
    }

    const teamName = teamNamesMap
      ? (teamNamesMap.get(teamId) || `Team ${teamId}`)
      : (this.resolveTeamName(project, teamId) || `Team ${teamId}`);

    const playersTable = this.findTable(project, "players");
    let displayName = `Player ${playerId}`;
    if (playersTable) {
      const playerIdCol = this.columnIndex(playersTable, "playerid");
      if (playerIdCol >= 0) {
        const indexMap = (playersTable as any)._indexMap || new Map();
        if (!(playersTable as any)._indexMap) {
          (playersTable as any)._indexMap = indexMap;
          for (let r = 0; r < playersTable.rows.length; r++) {
            const id = playersTable.rows[r]?.[playerIdCol];
            if (id) {
              indexMap.set(id, r);
            }
          }
        }
        const pRowIndex = indexMap.get(playerId) ?? -1;
        if (pRowIndex >= 0) {
          displayName = this.resolvePlayerNameFast(project, playerId, playersTable, pRowIndex);
        }
      }
    }

    return {
      rowIndex,
      playerId,
      displayName,
      teamId,
      teamName,
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
