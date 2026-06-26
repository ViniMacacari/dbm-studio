import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CompdataProject, DbProject } from "../shared/types";
import { openCompdataProject, saveCompdataProject } from "../core/compdataIO";
import { CompObjDisplayService } from "../renderer/services/compdata/compobj-display.service";
import { CompObjTreeService } from "../renderer/services/compdata/compobj-tree.service";
import { CompObjValidationService } from "../renderer/services/compdata/compobj-validation.service";

const tree = new CompObjTreeService();
const display = new CompObjDisplayService(tree);
const validation = new CompObjValidationService(tree, display);

assert.equal(display.phaseInfo("FCE_Quarter_Final").label, "Quarter Finals");
assert.equal(display.phaseInfo("FCE_North-West_1").label, "North-West 1");
const locWithoutHashId = {
  localization: {
    tables: [{ columns: ["stringid", "sourcetext"], rows: [["Cup_Key", "Example Cup"]] }]
  }
} as unknown as DbProject;
assert.equal(display.resolvedText(locWithoutHashId, "Cup_Key"), "Example Cup");

const project = {
  title: "test",
  folderPath: "",
  objects: [
    { id: 1, kind: 0, shortName: "FIFA", description: "FIFA", parentId: -1 },
    { id: 10, kind: 3, shortName: "C10", description: "Cup_Key", parentId: 1 },
    { id: 11, kind: 4, shortName: "S1", description: "FCE_Group_Stage", parentId: 10 },
    { id: 12, kind: 5, shortName: "G1", description: "FCE_Group_A", parentId: 11 },
    { id: 13, kind: 4, shortName: "S2", description: "FCE_Final", parentId: 10 },
    { id: 14, kind: 5, shortName: "G1", description: "", parentId: 13 }
  ],
  compIds: [10], settings: [], tasks: [], schedules: [], specificSchedules: [], standings: [{ groupId: 12, position: 0 }, { groupId: 12, position: 1 }, { groupId: 14, position: 0 }, { groupId: 14, position: 1 }], advancements: [], initTeams: [],
  weatherEntries: [], weatherInvalidLines: [], weatherRows: [], activeTeamsRows: [], objectiveRows: [], warnings: [],
  competitions: [{ id: 10, shortName: "C10", description: "Cup_Key", parentId: 1, stages: [], groups: [], settingsCount: 0, tasksCount: 0, scheduleCount: 0, standingsCount: 0, advancementCount: 0, initTeamsCount: 0 }]
} satisfies CompdataProject;

assert.equal(display.childLabel(project.objects[3], project), "Group A");
assert.equal(display.childLabel(project.objects[5], project), "Final match");
assert.equal(display.childNoun(project.objects[2], 2), "groups");
assert.equal(display.childNoun(project.objects[4], 1), "final match");
assert.equal(tree.phases(project, 10).length, 2);
assert.equal(tree.groups(project, 11).length, 1);
assert.equal(validation.status(project, project.competitions[0]), "OK");

project.objects[1].parentId = 9999;
tree.invalidate(project);
validation.invalidate(project);
assert.equal(validation.validateTournament(project, project.competitions[0]).some((issue) => issue.severity === "error"), true);

const folder = mkdtempSync(join(tmpdir(), "dbm-compobj-test-"));
try {
  writeFileSync(join(folder, "compobj.txt"), "1,0,FIFA,FIFA,-1\n10,3,C10,Cup_Key,1\n", "utf8");
  writeFileSync(join(folder, "settings.txt"), "keep-this-file-unchanged", "utf8");
  writeFileSync(join(folder, "schedule.txt"), "10,215,1,1,5,2030\n", "utf8");
  mkdirSync(join(folder, "schedules"));
  writeFileSync(join(folder, "schedules", "c10_s1_2012"), "20120818,1500,1,106\n", "utf8");
  const opened = openCompdataProject(folder);
  assert.equal(opened.competitions.length, 1);
  assert.equal(opened.schedules.length, 1);
  assert.equal(opened.specificSchedules.length, 1);
  opened.objects[1].shortName = "C11";
  const saved = saveCompdataProject(opened);
  assert.equal(saved.filesWritten, 5);
  assert.equal(readFileSync(join(folder, "settings.txt"), "utf8"), "keep-this-file-unchanged");
  assert.match(readFileSync(join(folder, "compobj.txt"), "utf8"), /10,3,C11,Cup_Key,1/);
  assert.equal(readFileSync(join(folder, "schedule.txt"), "utf8"), "10,215,1,1,5,2030\n");
  assert.equal(readFileSync(join(folder, "schedules", "c10_s1_2012"), "utf8"), "20120818,1500,1,106\n");
} finally {
  rmSync(folder, { recursive: true, force: true });
}

console.log("CompObj display/tree/validation tests passed.");
