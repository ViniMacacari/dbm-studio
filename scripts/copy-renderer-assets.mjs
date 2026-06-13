import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const assets = [
  ["src/renderer/index.html", "dist/renderer/index.html"],
  ["src/renderer/styles.css", "dist/renderer/styles.css"]
];

for (const [from, to] of assets) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}
