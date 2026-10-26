// PostToolUse (Write|Edit): format + lint source files, then check line endings and encoding.
// Runs both steps in one process so prettier never races the encoding check.
// Exit 2 sends stderr back to Claude as feedback.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { buildPendingFile, hasNodeModules, projectRelative, readHookInput, run, tail } from "./lib.mjs";

const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pdf", ".zip", ".gz", ".mp4", ".webm", ".mp3", ".wav",
]);
const SKIP_DIRS = ["node_modules/", ".next/", ".vercel/", ".git/"];

const input = await readHookInput();
const filePath = input.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const rel = projectRelative(filePath);
if (!rel || SKIP_DIRS.some((dir) => rel.startsWith(dir))) process.exit(0);

const ext = extname(rel).toLowerCase();
const problems = [];

// 1. Format + lint (only once dependencies are installed, i.e. from P2 on).
if (SOURCE_EXT.has(ext) && hasNodeModules()) {
  const quoted = JSON.stringify(rel);
  const prettier = run(`pnpm exec prettier --write ${quoted}`);
  if (!prettier.ok) problems.push(`prettier 실패:\n${tail(prettier.output)}`);

  const eslint = run(`pnpm exec eslint --fix ${quoted}`);
  if (!eslint.ok) problems.push(`eslint 오류 (자동 수정 불가):\n${tail(eslint.output)}`);

  appendFileSync(buildPendingFile, `${rel}\n`);
}

// 2. Line endings and encoding.
if (!BINARY_EXT.has(ext)) {
  const buf = readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    problems.push("UTF-8 BOM이 있습니다. BOM 없이 저장하세요.");
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    const crlf = text.match(/\r\n/g)?.length ?? 0;
    const bareCr = (text.match(/\r/g)?.length ?? 0) - crlf;
    if (crlf > 0) problems.push(`CRLF 줄바꿈 ${crlf}개가 있습니다. LF로 바꾸세요.`);
    if (bareCr > 0) problems.push(`단독 CR 문자 ${bareCr}개가 있습니다. LF로 바꾸세요.`);
  } catch {
    problems.push("UTF-8로 디코딩되지 않습니다. UTF-8로 다시 저장하세요.");
  }
}

if (problems.length > 0) {
  console.error(`[post-edit] ${rel}\n- ${problems.join("\n- ")}`);
  process.exit(2);
}
