// Shared helpers for Claude Code hook scripts.
import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

export const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Marker listing source files edited since the last successful build check.
export const buildPendingFile = join(projectDir, ".claude", ".build-pending");

export async function readHookInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Returns the project-relative path (forward slashes), or null when outside the project.
export function projectRelative(filePath) {
  const rel = relative(projectDir, resolve(filePath));
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
  return rel.split("\\").join("/");
}

export function hasNodeModules() {
  return existsSync(join(projectDir, "node_modules")) && existsSync(join(projectDir, "package.json"));
}

// Runs a command line in the project directory. shell is needed on Windows for pnpm.cmd.
export function run(commandLine, timeoutMs = 120_000) {
  const result = spawnSync(commandLine, {
    cwd: projectDir,
    shell: true,
    encoding: "utf8",
    timeout: timeoutMs,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  return { ok: result.status === 0, output, error: result.error };
}

export function tail(text, lines = 40) {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}
