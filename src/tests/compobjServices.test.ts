import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CompdataProject, DbProject } from "../shared/types";
import { openCompdataProject, saveCompdataProject } from "../core/compdataIO";
import type { LocalizationService } from "../renderer/services/localization.service";
import { CompObjDisplayService, CompObjTreeService } from "../renderer/pages/compdata-editor/compobj-display.service";
import { CompObjValidationService } from "../renderer/pages/compdata-editor/compobj-validation.service";

const localization = { resolveString: (_project: unknown, key: string, fallback: string) => fallback || key } as LocalizationService;
const display = new CompObjDisplayService(localization);
const tree = new CompObjTreeService();
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
  compIds: [10], settings: [], tasks: [], schedules: [], standings: [], advancements: [], initTeams: [],
  weatherRows: [], activeTeamsRows: [], objectiveRows: [], warnings: [],
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
assert.equal(validation.validateTournament(project, project.competitions[0]).some((issue) => issue.severity === "error"), true);

const folder = mkdtempSync(join(tmpdir(), "dbm-compobj-test-"));
try {
  writeFileSync(join(folder, "compobj.txt"), "1,0,FIFA,FIFA,-1\n10,3,C10,Cup_Key,1\n", "utf8");
  writeFileSync(join(folder, "settings.txt"), "keep-this-file-unchanged", "utf8");
  const opened = openCompdataProject(folder);
  assert.equal(opened.competitions.length, 1);
  opened.objects[1].shortName = "C11";
  const saved = saveCompdataProject(opened);
  assert.equal(saved.filesWritten, 1);
  assert.equal(readFileSync(join(folder, "settings.txt"), "utf8"), "keep-this-file-unchanged");
  assert.match(readFileSync(join(folder, "compobj.txt"), "utf8"), /10,3,C11,Cup_Key,1/);
} finally {
  rmSync(folder, { recursive: true, force: true });
}

console.log("CompObj display/tree/validation tests passed.");
