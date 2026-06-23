import assert from "node:assert/strict";
import type { DataTable, DbProject, FieldDescriptor } from "../shared/types";
import { TeamFormationEditorService } from "../renderer/services/team-formation-editor.service";
import type { TeamPlayerLinkDraft } from "../renderer/services/transfer.service";

type RowObject = Record<string, string>;

const slots = Array.from({ length: 11 }, (_value, index) => index);
const sheetSlots = Array.from({ length: 52 }, (_value, index) => index);

function field(name: string): FieldDescriptor {
  return { name, kind: "integer", rangeLow: -1, rangeHigh: 1_000_000 };
}

function table(name: string, rows: RowObject[]): DataTable {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].reverse();
  return {
    name,
    columns,
    fields: columns.map(field),
    rows: rows.map((row) => columns.map((column) => row[column] ?? ""))
  };
}

function layout(seed: number): RowObject {
  const result: RowObject = {};
  for (const slot of slots) {
    result[`position${slot}`] = String(slot === 0 ? 0 : seed + slot);
    result[`offset${slot}x`] = String((slot + 1) / 12);
    result[`offset${slot}y`] = String((seed + slot + 1) / 30);
    result[`pos${slot}role`] = String(seed * 100 + slot);
  }
  return result;
}

function fixture(): { project: DbProject; links: TeamPlayerLinkDraft[]; service: TeamFormationEditorService } {
  const initialLayout = layout(1);
  const nextLayout = layout(10);
  const teamsheet: RowObject = {
    teamid: "100",
    captainid: "1",
    penaltytakerid: "9",
    freekicktakerid: "8"
  };
  for (const slot of sheetSlots) {
    teamsheet[`playerid${slot}`] = slot < 21 ? String(slot + 1) : "-1";
  }

  const mentalityPlayers = Object.fromEntries(slots.map((slot) => [`playerid${slot}`, String(slot + 1)]));
  const placeholderPlayers = Object.fromEntries(slots.map((slot) => [`playerid${slot}`, "-1"]));
  const project: DbProject = {
    title: "Formation test",
    sourceKind: "snapshot",
    descriptors: [],
    warnings: [],
    tables: [
      table("default_teamsheets", [teamsheet]),
      table("default_mentalities", [
        { teamid: "-1", mentalityid: "0", ...placeholderPlayers, ...layout(0) },
        {
          teamid: "100",
          mentalityid: "4",
          sourceformationid: "0",
          defensivedepth: "65",
          buildupplay: "1",
          formationfullnameid: "101",
          formationaudioid: "201",
          ...mentalityPlayers,
          ...initialLayout
        }
      ]),
      table("defaultteamdata", [{ teamid: "100", defensivedepth: "65", formationfullnameid: "101", ...initialLayout }]),
      table("formations", [
        {
          teamid: "-1",
          formationid: "1",
          relativeformationid: "1",
          formationname: "4-4-2",
          formationfullnameid: "101",
          formationaudioid: "201",
          defenders: "4",
          midfielders: "4",
          attackers: "2",
          offensiverating: "2",
          ...initialLayout
        },
        {
          teamid: "-1",
          formationid: "2",
          relativeformationid: "2",
          formationname: "4-3-3",
          formationfullnameid: "102",
          formationaudioid: "202",
          defenders: "4",
          midfielders: "3",
          attackers: "3",
          offensiverating: "3",
          ...nextLayout
        },
        {
          teamid: "100",
          formationid: "99",
          relativeformationid: "1",
          formationname: "4-4-2",
          formationfullnameid: "101",
          formationaudioid: "201",
          defenders: "4",
          midfielders: "4",
          attackers: "2",
          offensiverating: "2",
          ...initialLayout
        }
      ])
    ]
  };

  const links: TeamPlayerLinkDraft[] = Array.from({ length: 25 }, (_value, index) => ({
    rowIndex: index,
    playerId: String(index + 1),
    displayName: `Player ${index + 1}`,
    teamId: "100",
    teamName: "Test FC",
    jerseyNumber: String(index + 1),
    position: String(index === 0 ? 0 : 14),
    form: "3",
    injury: "0",
    leagueAppearances: "0",
    leagueGoals: "0",
    yellows: "0",
    reds: "0"
  }));
  const playerResolver = {
    resolvePlayerSummaryById: (_project: DbProject, playerId: string) => ({
      rowIndex: Number(playerId) - 1,
      playerId,
      displayName: `Player ${playerId}`,
      overall: String(60 + Number(playerId) % 30),
      nameSource: "editedplayernames" as const
    })
  };
  return {
    project,
    links,
    service: new TeamFormationEditorService(playerResolver as never)
  };
}

function read(table: DataTable, rowIndex: number, column: string): string {
  const columnIndex = table.columns.findIndex((candidate) => candidate.toLowerCase() === column.toLowerCase());
  assert.notEqual(columnIndex, -1, `${table.name}.${column} should exist`);
  return table.rows[rowIndex][columnIndex];
}

function findTable(project: DbProject, name: string): DataTable {
  const result = project.tables.find((candidate) => candidate.name === name);
  assert.ok(result);
  return result;
}

function loadTest(): void {
  const { project, links, service } = fixture();
  const state = service.loadTeamFormation(project, "100", links);
  assert.ok(state);
  assert.deepEqual(state.startingXI.map((slot) => slot.playerId), slots.map((slot) => String(slot + 1)));
  assert.equal(state.startingXI[0].offsetX, 1 / 12);
  assert.equal(state.startingXI[0].offsetY, 2 / 30);
  assert.equal(state.selectedFormationId, "1");
  assert.equal(state.bench[0].slot, 11);
  assert.equal(state.bench[0].playerId, "12");
  assert.equal(state.bench.length, 9);
  assert.equal(state.bench[8].slot, 19);
  assert.equal(state.bench[8].playerId, "20");
  assert.equal(state.reserves[0].slot, 20);
  assert.equal(state.reserves[0].playerId, "21");
}

function starterBenchSwapTest(): void {
  const { project, links, service } = fixture();
  const state = service.loadTeamFormation(project, "100", links)!;
  const originalPosition = state.startingXI[0].positionId;
  const originalOffset = { x: state.startingXI[0].offsetX, y: state.startingXI[0].offsetY };
  service.swapPlayers(state, state.startingXI[0], state.bench[0]);
  service.saveTeamFormation(project, state);

  const sheet = findTable(project, "default_teamsheets");
  const mentalities = findTable(project, "default_mentalities");
  assert.equal(read(sheet, 0, "playerid0"), "12");
  assert.equal(read(sheet, 0, "playerid11"), "1");
  assert.equal(read(mentalities, 1, "playerid0"), "12");
  assert.equal(read(mentalities, 1, "position0"), String(originalPosition));
  assert.equal(read(mentalities, 1, "offset0x"), String(originalOffset.x));
  assert.equal(read(mentalities, 1, "offset0y"), String(originalOffset.y));
  assert.equal(state.startingXI[0].positionId, originalPosition);
  assert.deepEqual({ x: state.startingXI[0].offsetX, y: state.startingXI[0].offsetY }, originalOffset);
}

function starterSwapTest(): void {
  const { project, links, service } = fixture();
  const state = service.loadTeamFormation(project, "100", links)!;
  const before = state.startingXI.map((slot) => ({ position: slot.positionId, x: slot.offsetX, y: slot.offsetY }));
  service.swapPlayers(state, state.startingXI[0], state.startingXI[1]);
  service.saveTeamFormation(project, state);
  assert.equal(state.startingXI[0].playerId, "2");
  assert.equal(state.startingXI[1].playerId, "1");
  assert.deepEqual(state.startingXI.map((slot) => ({ position: slot.positionId, x: slot.offsetX, y: slot.offsetY })), before);
}

function formationChangeTest(): void {
  const { project, links, service } = fixture();
  const state = service.loadTeamFormation(project, "100", links)!;
  const starters = [...state.sheetPlayerIds.slice(0, 11)];
  const formations = findTable(project, "formations");
  const globalRowsBefore = formations.rows.slice(0, 2).map((row) => [...row]);
  service.changeFormation(state, "2");
  service.saveTeamFormation(project, state);

  const mentality = findTable(project, "default_mentalities");
  const teamData = findTable(project, "defaultteamdata");
  assert.equal(read(formations, 2, "formationid"), "99");
  assert.equal(read(formations, 2, "relativeformationid"), "2");
  assert.equal(read(formations, 2, "formationname"), "4-3-3");
  for (const slot of slots) {
    assert.equal(read(formations, 2, `position${slot}`), String(state.selectedFormation.positions[slot]));
    assert.equal(read(formations, 2, `offset${slot}y`), String(state.selectedFormation.offsets[slot].y));
    assert.equal(read(formations, 2, `pos${slot}role`), String(state.selectedFormation.roles[slot]));
    assert.equal(read(teamData, 0, `position${slot}`), String(state.selectedFormation.positions[slot]));
    assert.equal(read(teamData, 0, `offset${slot}x`), String(state.selectedFormation.offsets[slot].x));
    assert.equal(read(mentality, 1, `offset${slot}y`), String(state.selectedFormation.offsets[slot].y));
    assert.equal(read(mentality, 1, `pos${slot}role`), String(state.selectedFormation.roles[slot]));
    assert.equal(read(mentality, 1, `playerid${slot}`), starters[slot]);
  }
  assert.deepEqual(formations.rows.slice(0, 2), globalRowsBefore, "global templates must remain unchanged");
  assert.equal(read(mentality, 1, "sourceformationid"), "0");
  assert.equal(read(mentality, 1, "defensivedepth"), "65");
}

function validationTest(): void {
  {
    const { project, links, service } = fixture();
    const state = service.loadTeamFormation(project, "100", links)!;
    state.sheetPlayerIds[1] = state.sheetPlayerIds[0];
    state.mentalityPlayerIds = state.sheetPlayerIds.slice(0, 11);
    assert.match(service.validateTeamFormationState(state).errors.join(" "), /more than once/);
  }
  {
    const { project, links, service } = fixture();
    const state = service.loadTeamFormation(project, "100", links)!;
    state.sheetPlayerIds[0] = "-1";
    state.mentalityPlayerIds = state.sheetPlayerIds.slice(0, 11);
    assert.match(service.validateTeamFormationState(state).errors.join(" "), /Starting XI/);
  }
  {
    const { project, links, service } = fixture();
    const state = service.loadTeamFormation(project, "100", links)!;
    state.sheetPlayerIds[0] = "999";
    state.mentalityPlayerIds = state.sheetPlayerIds.slice(0, 11);
    assert.match(service.validateTeamFormationState(state).errors.join(" "), /not linked/);
  }
}

function atomicRollbackTest(): void {
  const { project, links, service } = fixture();
  const state = service.loadTeamFormation(project, "100", links)!;
  service.swapPlayers(state, state.startingXI[0], state.bench[0]);
  const sheet = findTable(project, "default_teamsheets");
  const sheetBefore = sheet.rows[0].slice();
  const mentalities = findTable(project, "default_mentalities");
  const missingColumn = mentalities.columns.indexOf("playerid10");
  mentalities.columns.splice(missingColumn, 1);
  mentalities.fields.splice(missingColumn, 1);
  for (const row of mentalities.rows) {
    row.splice(missingColumn, 1);
  }

  assert.throws(() => service.saveTeamFormation(project, state), /playerid10 was not found/);
  assert.deepEqual(sheet.rows[0], sheetBefore, "teamsheet changes must roll back when another related write fails");
}

loadTest();
starterBenchSwapTest();
starterSwapTest();
formationChangeTest();
validationTest();
atomicRollbackTest();
console.log("TeamFormationEditorService tests passed.");
