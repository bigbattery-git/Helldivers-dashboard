// Stop: when source files were edited this turn, run typecheck + build.
// On failure, block the stop so Claude fixes it, at most MAX_ATTEMPTS times in a row.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPendingFile, hasNodeModules, projectDir, readHookInput, run, tail } from "./lib.mjs";

const MAX_ATTEMPTS = 3;
const attemptsFile = join(projectDir, ".claude", ".build-attempts");

const input = await readHookInput();
if (!existsSync(buildPendingFile)) process.exit(0);

// Before P2 there is nothing to build.
if (!hasNodeModules()) {
  rmSync(buildPendingFile, { force: true });
  process.exit(0);
}

const attempts = input.stop_hook_active && existsSync(attemptsFile)
  ? Number(readFileSync(attemptsFile, "utf8")) || 0
  : 0;

const steps = [];
if (existsSync(join(projectDir, "tsconfig.json"))) steps.push(["타입 검사", "pnpm exec tsc --noEmit"]);
steps.push(["빌드", "pnpm build"]);

for (const [label, command] of steps) {
  const result = run(command, 540_000);
  if (result.ok) continue;

  if (attempts + 1 >= MAX_ATTEMPTS) {
    rmSync(attemptsFile, { force: true });
    console.log(JSON.stringify({
      systemMessage: `[build-check] ${label} 실패가 ${MAX_ATTEMPTS}회 연속 해결되지 않았습니다. 수동 확인이 필요합니다 (\`${command}\`).`,
    }));
    process.exit(0);
  }

  writeFileSync(attemptsFile, String(attempts + 1));
  console.log(JSON.stringify({
    decision: "block",
    reason: `[build-check] ${label} 실패 (\`${command}\`). 아래 오류를 고친 뒤 마무리하세요.\n\n${tail(result.output, 60)}`,
  }));
  process.exit(0);
}

rmSync(buildPendingFile, { force: true });
rmSync(attemptsFile, { force: true });
