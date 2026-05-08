import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export const devCommands = [
  { name: "frontend", args: ["run", "dev:frontend"] },
  { name: "backend", args: ["run", "dev:backend"] },
];

export function runDev() {
  const children = new Map();
  let shuttingDown = false;

  const stopAll = (signal = "SIGTERM") => {
    shuttingDown = true;

    for (const child of children.values()) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };

  for (const command of devCommands) {
    const child = spawn(npmCommand, command.args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    children.set(command.name, child);

    child.on("error", (error) => {
      console.error(`[dev:${command.name}] Failed to start: ${error.message}`);
      stopAll();
      process.exitCode = 1;
    });

    child.on("exit", (code, signal) => {
      children.delete(command.name);

      if (shuttingDown) {
        return;
      }

      const exitCode = code ?? (signal ? 1 : 0);
      console.error(
        `[dev:${command.name}] exited${signal ? ` from ${signal}` : ""} with code ${exitCode}.`,
      );
      stopAll();
      process.exit(exitCode);
    });
  }

  process.once("SIGINT", () => stopAll("SIGINT"));
  process.once("SIGTERM", () => stopAll("SIGTERM"));
}

const scriptPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === scriptPath) {
  runDev();
}
