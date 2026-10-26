// SessionStart: inject the current phase and its open checklist items into context.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { projectDir } from "./lib.mjs";

const MAX_ITEMS = 8;
const checklistPath = join(projectDir, "docs", "CHECKLIST.md");
if (!existsSync(checklistPath)) process.exit(0);

const text = readFileSync(checklistPath, "utf8").replace(/\r\n/g, "\n");
const phase = text.match(/^현재 단계:\s*(\S+)/m)?.[1];
if (!phase) process.exit(0);

// Collect unchecked items from the "## <phase>" section up to the next level-2 heading.
const open = [];
let inPhase = false;
for (const line of text.split("\n")) {
  if (line.startsWith("## ")) inPhase = line.slice(3).trim().startsWith(phase);
  else if (inPhase && line.startsWith("- [ ] ")) open.push(line.slice(6));
}

if (open.length === 0) {
  console.log(`[체크리스트] 현재 단계: ${phase} — 미완료 항목 없음. 완료 기준 확인 후 srs-sync로 다음 단계로 넘어가세요.`);
  process.exit(0);
}

const shown = open.slice(0, MAX_ITEMS).map((item) => `- ${item}`).join("\n");
const more = open.length > MAX_ITEMS ? `\n- … 외 ${open.length - MAX_ITEMS}개` : "";
console.log(`[체크리스트] 현재 단계: ${phase} — 미완료 ${open.length}개 (docs/CHECKLIST.md)\n${shown}${more}`);
