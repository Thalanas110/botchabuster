import { spawnSync } from "node:child_process";

const isRender = process.env.RENDER === "true";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const args = isRender ? ["run", "build:backend"] : ["run", "build:all"];

const result = spawnSync(npmCommand, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
