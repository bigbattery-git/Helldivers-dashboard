# 체크리스트

현재 단계: P2

요구사항 상세는 [SRS.md](SRS.md)를 따른다. 각 항목 앞의 ID는 SRS 요구사항 ID다.
단계 끝의 **완료 기준**을 모두 만족해야 다음 단계로 넘어가며, 넘어갈 때 위의 `현재 단계` 줄을 갱신한다.

## P0 — 하네스 구축

### CLAUDE.md
- [x] H-01 프로젝트 개요·기술 스택·현재 단계와 SRS/CHECKLIST 링크 작성
- [x] H-01 커밋 컨벤션 기재 (Conventional Commits, 한글 subject, 예시 포함)
- [x] H-01 문서 작성 규칙 기재 (`docs/` 구조, research 표준 표, ADR 형식)
- [x] H-01 데이터 수집 규칙 기재 (약관 준수, 레이트리밋, User-Agent/식별 헤더, 서버 측 호출만)
- [x] H-01 응답 언어(한국어)와 명령어 섹션 자리(P2에서 채움) 마련

### Skill
- [x] H-02 `.claude/skills/srs-sync/SKILL.md` 작성 (CHECKLIST 체크 갱신, SRS §9 상태표 갱신, ADR 작성 절차)
- [x] H-02 `docs/adr/` 디렉터리와 ADR 템플릿(`0000-template.md`) 준비

### Subagents
- [x] H-03 `.claude/agents/source-researcher.md` (임시, 표준 표 형식으로 `docs/research/`에 기록)
- [x] H-03 `.claude/agents/infra-researcher.md`
- [x] H-03 `.claude/agents/code-reviewer.md` (읽기 전용 도구만)

### Hooks
- [x] H-04 `.claude/hooks/post-edit.mjs` — prettier + eslint(`node_modules` 없으면 생략) 후 CRLF·BOM·비UTF-8 검사 (PostToolUse, 경합 방지를 위해 한 스크립트에서 순차 실행)
- [x] H-04 `.claude/hooks/build-check.mjs` — tsc + next build, `stop_hook_active` 처리, P2 전 no-op (Stop)
- [x] H-04 `.claude/hooks/checklist-reminder.mjs` — 현재 단계·미완료 항목 주입 (SessionStart)
- [x] H-04 `.claude/settings.json`에 위 훅 등록

### 권한·보안
- [x] H-05 `.claude/settings.json` `permissions.deny`에 `.env` 계열 파일(최상위, `.vercel/.env.*`) Read/Edit 차단 (Edit 규칙이 Write도 포함, `.env.example`은 허용)
- [x] H-05 `.gitignore` 작성 (`.env*`, `!.env.example`, `node_modules`, `.next`, `.vercel` 등)

### MCP
- [x] H-06 기존 플러그인/커넥터와 중복 여부 확인 (context7, GitHub, Vercel)
- [x] H-06 `.mcp.json` 작성 (Playwright 버전 고정, Windows `cmd /c` 래핑, 필요 시 context7·Vercel)
- [x] H-06 Vercel 커넥터 연결 확인
- [x] H-06 GitHub 연동은 플러그인 대신 `gh` CLI 사용 (bigbattery-git 로그인, repo·workflow 권한 확인. 플러그인 로그인이 서비스 오류로 실패해 변경)
- [x] H-06 Playwright `.mcp.json` 서버 사전 승인 (`.claude/settings.local.json`의 `enabledMcpjsonServers`)
- [x] H-06 **[사용자]** context7 플러그인 로그인 (`/mcp`)

### 기타
- [x] H-07 `.editorconfig` 작성 (LF, UTF-8, 2칸)

### P0 완료 기준
- [x] 새 세션 시작 시 SessionStart 훅이 현재 단계와 미완료 항목을 보여준다
- [x] CRLF 또는 BOM이 있는 파일을 쓰면 경고가 발생한다
- [x] `.env` 파일 읽기 시도가 차단된다
- [x] 서브에이전트 3종과 `srs-sync` 스킬이 목록에 노출된다
- [x] MCP 3종(context7·Vercel·Playwright)이 연결 상태로 확인되고 `gh` CLI가 로그인돼 있다
- [x] 하네스 파일 커밋 완료

## P1 — 자료조사

### 게임 데이터 API
- [x] R-01 Arrowhead 공개 엔드포인트 호출·스키마 기록 (WarSeason Status, WarInfo, NewsFeed, Assignment)
- [x] R-01 커뮤니티 API(`api.helldivers2.dev`) 호출·필수 헤더·레이트리밋 기록
- [x] R-01 기타 커뮤니티 API 탐색
- [x] R-01 핵심 기능(전쟁 현황·MO·통계) ↔ 엔드포인트 매핑표 작성

### 뉴스/SNS
- [x] R-02 Steam Web API (뉴스, 동접자) 호출 확인
- [x] R-02 Steam RSS, 게임 내 디스패치(NewsFeed) 확인
- [x] R-02 X: 공식 API 요금·한도 조사
- [x] R-02 X: 비공식 스크래핑 방식 조사 + Playwright 실측 + 약관·차단 리스크 정리
- [x] R-02 Reddit API, Discord 공지 채널 팔로우+봇, YouTube RSS 조사

### 인프라
- [x] R-03 Vercel Marketplace DB 비교표 (무료 한도, 드라이버, 시계열 적합성, ORM)
- [x] R-03 Vercel Hobby Cron 한도 재확인 + 외부 스케줄러 비교 (GitHub Actions, QStash, pg_cron 등)
- [x] R-03 캐싱 전략 정리 (ISR, `revalidate`, 데이터 캐시)

### 결정·정리
- [x] R-04 ADR: 게임 데이터 소스 채택
- [x] R-04 ADR: 뉴스/SNS 소스 채택 (스크래핑 채택 시 리스크 대응 포함)
- [x] R-04 ADR: DB + ORM 선정
- [x] R-04 ADR: 스케줄러 선정
- [x] R-05 `source-researcher`를 `docs/archive/agents/`로 이동
- [x] R-06 SRS v2(대시보드 기능 명세) 초안 작성 — `docs/SRS-v2.md`

### P1 완료 기준
- [x] 핵심 기능 4개 각각에 채택 소스가 1개 이상 있다
- [x] DB·ORM·스케줄러 ADR이 확정되었다
- [x] `source-researcher`가 비활성화되었다
- [x] SRS v2(대시보드 기능 명세) 작성 착수 여부를 결정했다 (P2 전에 작성, 2026-10-26)
- [x] SRS v2 초안을 사용자가 검토·승인했다 (2026-10-26)

## P2 — 환경 구축

- [x] E-01 pnpm 설치 (corepack은 Windows 권한 오류(EPERM)로 실패 → `npm i -g pnpm@12.15.0`, `packageManager` 필드로 고정)
- [x] E-01 `pnpm create next-app` (Next 16.4.3, TS, App Router, ESLint, Tailwind, `src/`, cacheComponents)
- [x] E-01 Prettier, Vitest 설정 (`.npmrc` save-exact, 스크립트 lint·typecheck·test·format)
- [ ] E-02 DB 프로비저닝 (Vercel Marketplace) — 진행 중: 로컬 Supabase(Docker, `pnpm db:start`)로 대체 운영, 클라우드는 Vercel 연결 후
- [x] E-02 ORM 설정 + 첫 마이그레이션 성공 (Prisma 7.10.1, 로컬 Supabase에 `collection_run` 생성. pg_cron·pg_net 로컬 동작 확인, Free 클라우드는 미확인)
- [ ] E-03 Vercel 프로젝트 연결 + `vercel env pull`
- [x] E-03 `.env.example` 작성 (DATABASE_URL, DIRECT_URL, CRON_SECRET, X_BEARER_TOKEN)
- [x] E-04 `/api/health` 라우트 (로컬 DB 정상 200, DB 중단 시 503 확인)
- [x] E-04 외부 API 1건 호출 스모크 테스트 (`pnpm test:smoke`, Arrowhead WarID)
- [x] E-05 GitHub Actions CI (format:check → lint → typecheck → test → build). 깨끗한 작업 트리에서 로컬 재현 통과, GitHub 실행은 푸시 후
- [x] E-06 훅 실동작 확인 (편집 시 포맷·린트, 턴 종료 시 빌드: 통과·타입 오류 차단 모두 확인)
- [x] E-06 CLAUDE.md에 명령어·아키텍처 갱신
- [ ] E-07 첫 Preview 배포

### P2 완료 기준
- [x] 로컬 `pnpm build` 통과
- [ ] CI 녹색
- [ ] Preview 배포 URL 확보
- [x] 훅이 실제로 포맷·린트·빌드를 수행한다
