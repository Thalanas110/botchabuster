import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");

test("root dev script starts both app services through the dev runner", async () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

  assert.equal(packageJson.scripts.dev, "node scripts/run-dev.mjs");

  const runnerPath = path.join(scriptsDir, "run-dev.mjs");
  assert.ok(fs.existsSync(runnerPath), "scripts/run-dev.mjs should exist");

  const { devCommands } = await import(pathToFileURL(runnerPath).href);

  assert.deepEqual(devCommands, [
    { name: "frontend", args: ["run", "dev:frontend"] },
    { name: "backend", args: ["run", "dev:backend"] },
  ]);
});
