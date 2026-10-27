# 체크리스트

현재 단계: P4

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
- [x] E-05 GitHub Actions CI (format:check → lint → typecheck → test → build). GitHub Actions 통과 (PR #1)
- [x] E-06 훅 실동작 확인 (편집 시 포맷·린트, 턴 종료 시 빌드: 통과·타입 오류 차단 모두 확인)
- [x] E-06 CLAUDE.md에 명령어·아키텍처 갱신
- [ ] E-07 첫 Preview 배포

### P2 완료 기준
- [x] 로컬 `pnpm build` 통과
- [x] CI 녹색 (PR #1, run 40280731440, 2026-10-26)
- [ ] Preview 배포 URL 확보
- [x] 훅이 실제로 포맷·린트·빌드를 수행한다

P2 남은 항목(E-02 클라우드 DB, E-03 Vercel 연결, E-07 Preview 배포)은 사용자 작업으로 P3와 병행한다. 완료 기준 미충족 상태로 P3에 들어가는 예외는 사용자 결정이다 (2026-10-26).

## P3 — 데이터 수집

요구사항 상세는 [SRS-v3.md](SRS-v3.md)를 따른다.

### 문서
- [x] SRS v3(수집 명세) 작성, SRS v2 §8에 단계 분리 반영
- [x] D-10 ADR 0005 오류 보고(Sentry)
- [x] `game-api.md`에 `Accept-Language` 필수화·새 필드 기록, CLAUDE.md 명령어·아키텍처 갱신

### 스키마
- [x] D-09 `war`, `planet`, `planet_effect`, `planet_snapshot`, `planet_event`, `campaign` 모델
- [x] D-04 `assignment`, `assignment_snapshot`, `news_item`, `global_snapshot`, `war_stats_snapshot` 모델
- [x] D-04 마이그레이션 생성·적용 (`pnpm db:migrate`) (`20261026071445_collection_schema`)

### 수집
- [x] D-04 슬롯·전쟁 시간 환산 (`util.ts`) + 테스트
- [x] D-02 일일 단계: WarID·WarInfo·정적 행성 JSON → `war`·`planet`
- [x] D-01 Status → 행성 스냅샷·위치·캠페인·디펜스 이벤트·효과 구간 + 테스트
- [x] D-12 Assignment·NewsFeed(ko-KR) + 한글 판별 테스트
- [x] D-01 Steam 동접자, Steam 뉴스 API + RSS 병합 + 테스트
- [x] D-02 Stats summary (1시간)
- [x] D-05 D-08 `runCollection` (Steam 동접자를 일부러 실패시켜 나머지 저장 확인): 소스별 격리, `collection_run` 기록

### 엔드포인트·관측
- [x] D-01 `POST /api/collect` (시크릿 없음 401, 실수집 200) (Bearer `CRON_SECRET` 상수 시간 비교)
- [x] D-10 Sentry 서버 초기화(`SENTRY_DSN` 없으면 비활성), 검증 실패 보고 (2026-10-27, Steam 동접자 404 주입 → `HELLDIVERS-DASHBOARD-1` 수신)
- [x] D-10 **[사용자]** Sentry 프로젝트 생성, `.env.local`에 `SENTRY_DSN`·`CRON_SECRET` 추가 (2026-10-27)

### 스케줄
- [x] D-11 `pnpm db:cron` (2회 실행해도 작업 2개·시크릿 1개, pg_net → 로컬 dev 서버 200) (수집 15분, 30일 정리 D-06)

### P3 완료 기준
- [x] 로컬 pg_cron이 연속 8슬롯(2시간) 빠짐없이 수집했다 (2026-10-27 11:30~13:15 KST, `collection_run` 8건 모두 종료, pg_net 응답 8건 모두 200·소스 오류 없음). 이전 시도: 10-26 1차는 PC 종료, 2차는 다른 프로젝트의 Caddy가 `:3000`을 가로채 404 → 포트 4100으로 이동
- [x] 같은 슬롯 재호출에 (2026-10-26, 재호출 후 planet_snapshot 273행 유지) 스냅샷 행 수가 늘지 않는다
- [x] 소스 하나를 일부러 실패시켜도 나머지가 저장되고 Sentry에 이벤트가 남는다 (2026-10-27 11:23, 그 슬롯에 돈 나머지 4개 소스 저장, Sentry 이벤트 1건)
- [x] `planet`에 전 행성의 한국어 이름 (273/273)이 채워져 있다
- [x] CI 녹색 (PR #3, run 40449479481, 2026-10-27)

## P4 — 화면

요구사항은 [SRS v2](SRS-v2.md) §3·§4, 화면은 [디자인 시스템](design-system/README.md)을 따른다. 범위 결정(2026-10-27): 은하 지도 MVP 포함, 시안의 "진행 중인 미션" 자리는 활성 전선 목록, `/about` 화면 없이 푸터로 대신, X 수집 포함, 커뮤니티 API 폴백 포함.

### 기반
- [x] F-05-6 디자인 시스템 연결 (`globals.css`에 `hud.css`, 글꼴 3종, `lang="ko"`, 다크만) (PR A)
- [x] D-07 데이터 읽기 함수 (`'use cache'` + `cacheLife` 900초 + `cacheTag`), 수집 끝에 `revalidateTag` (Q-02) (PR A: ISR 껍데기 + 빌드 단계 빈 값. DB 없는 빌드, `next start`·dev에서 수집 뒤 갱신 확인)
- [x] F-02-2 F-02-4 MO 태스크·보상 해석 표 + 테스트 (모르는 type은 "알 수 없는 목표 (type N)") (PR A)
- [x] F-03-5 디스패치 마크업(`<i=N>`) 처리 + 테스트 (PR A)
- [ ] 행성 요소(`effect_id`) 한국어 이름·설명 표 (모르는 id는 표시하지 않고 로그) — 진행 중: 구조와 숨김 규칙만(PR A), 한국어 내용은 PR B
- [x] 공식 번역 용어표 (세력·게임 용어, 공식 한국어 디스패치·MO에서 추출. 화면 문구와 기계 번역이 같이 씀) (PR A `src/lib/hd/terms.ts`)
- [ ] 행성 이름 표시: 공식 한국어(`name_ko`) + "(원문)"을 누르면 영어가 펼쳐짐, 지도 라벨은 한국어만 — 진행 중: `PlanetName`(키보드로 펼치기 확인) 완료, 지도 라벨은 PR B
- [x] F-01-5 해방률·방어 진행률·1시간 추세 계산 + 테스트 (PR A)
- [x] F-05-3 KST 시각·상대 시간·카운트다운 포맷 + 테스트 (PR A)

### 공통 레이아웃
- [ ] F-05-1 마지막 수집 시각, 30분 넘으면 "데이터 지연" 배지 (`collection_run`) — 진행 중: 헤더 시각과 수집 뒤 갱신은 확인, 지연 배지는 실제로 30분 넘은 상태에서 아직 못 봄
- [x] F-05-4 푸터: 데이터 출처, 비공식 팬 사이트 고지 (상표·저작권은 Arrowhead·Sony 소유) (PR A)
- [ ] Q-04 360~1440px 가로 스크롤 없음, Q-03 키보드 탐색·포커스 표시 — 진행 중: 임시 홈 360px 가로 스크롤 없음, 화면이 생길 때마다 다시 확인

### 홈 `/`
- [x] 헤더 KPI 타일 (투입 인원, 해방 행성 수 등) (PR B1)
- [ ] F-01-7 은하 지도: 행성 마커(MO 대상 `--major`, 방어 중 `__def`), 슈퍼지구, 궤도
- [ ] 해방 툴팁: 호버·포커스·탭으로 열기, 해방도·투입 인원·시간당 변화·행성 요소
- [ ] F-01-3 방어 툴팁: 남은 시간 카운트다운, 방어 진행률. 데이터가 없는 항목(침공 레벨, 행성 이미지, 공격 출발지)은 생략하거나 자리표시자
- [x] F-02-1 F-02-3 F-02-6 MO 패널: 제목·브리핑, 태스크별 진행률, 카운트다운·만료 시각(KST), 보상, 여러 MO (PR B1)
- [x] F-01-1 F-01-2 활성 전선 목록: MO 대상 먼저 → 플레이어 수 순, 해방률·진영 정렬 선택, 메타 `62% · 84,210명` (PR B1. 정렬은 브라우저에서 해서 ISR 유지. 방어 행은 로컬 가짜 이벤트로 확인)
- [x] F-01-4 진영별 요약 (활성 전선 수·투입 인원 합계) (PR B1)
- [x] F-03 최신 뉴스 5건 (업데이트 내역 패널) (PR B1. Steam HTML은 글자만 보여 줌)
- [x] F-04-1 동접자 24시간 미니 그래프 (PR B1, KPI 타일 안 스파크라인 + 대체 텍스트)

시안 맞추기 (PR B2에서 지도와 함께, 사용자 결정 2026-10-27). B1은 데이터가 제대로 나오는지 확인하는 단계였고, 배치는 확정 시안(`docs/design-system/reference/dashboard.dc.html`)과 다르다.
- [ ] 머리: 육각 아이콘 + `GALACTIC WAR · DAY N` + "전술 지휘 대시보드", KPI 3개를 오른쪽 가로 배치. 세 번째 타일은 마지막 갱신 시각(+지연 배지). 별도 사이트 헤더 줄 제거
- [ ] 1행 [은하계 전황 지도 + 범례 | 주요 명령], 2행 [진행 중인 전선 | 업데이트 내역]
- [ ] 주요 명령: 제목 → 브리핑 → 진행도 막대 → 남은 시간("2일 14시간")·보상 두 칸. 태스크가 여럿인 MO를 어떻게 보일지 정하기
- [ ] 전선 행: 시안의 단순한 행(이름 / 행성·세력 / 메타). 정렬 선택(F-01-2)과 진영 요약(F-01-4)을 시안 안에서 어떻게 넣을지 정하기
- [ ] 푸터 제거 (시안 그대로). 출처·비공식 고지(F-05-4)를 둘 다른 자리 정하기

### 행성 상세 `/planets/[index]`
- [ ] 첫 요청 때 생성·캐시 (빌드 때 미리 만들지 않음), 없는 index는 404
- [ ] 현재 상태·행성 요소·방어 이벤트
- [ ] F-04-2 해방률·플레이어 수 30일 추이

### 뉴스 `/news`
- [ ] F-03-1 F-03-3 통합 피드, 종류 배지·필터
- [ ] F-03-2 F-03-4 한국어 우선(없으면 "원문" 표시), 원문 링크

### 통계 `/stats`
- [ ] F-04-1 동접자 24시간 / 7일 / 30일 ("Steam 기준, PS5 제외" 표기)
- [ ] F-04-5 서버 시간 버킷 집계(30일은 1시간 버킷) + 테스트
- [ ] Q-03 그래프에 수치 대체 텍스트

### X 수집 (ADR 0002)
- [x] **[사용자]** X 개발자 계정·크레딧, `.env.local`에 `X_BEARER_TOKEN` (2026-10-27)
- [ ] `@helldivers2` 새 글을 `since_id`로 15분마다 수집 → `news_item` + 테스트
- [ ] 개발자 정책: X에서 삭제된 게시물은 `news_item`에서도 삭제, 작성 계정·원문 링크 표시
- [ ] F-03-6 키가 없거나 실패해도 나머지 피드 동작 (X 항목만 빠짐)
- [ ] 첫 과금 내역을 보고 폴링 주기 조정 (필요하면 1시간)

### 기계 번역 (ADR 0006, D-12)
- [x] **[사용자]** Google AI Studio에서 결제 연결 없이 API 키 발급, `.env.local`에 `GEMINI_API_KEY` (2026-10-27, 무료 티어로 번역 호출 200 확인)
- [ ] 스키마: `assignment`에 `title_ko`·`briefing_ko`, `assignment`·`news_item`에 번역 출처(`official` / `machine`) + 마이그레이션
- [ ] 번역 함수 (`gemini-3.5-flash-lite`, 모델 ID는 환경변수 `GEMINI_MODEL`): 공식 번역 용어표, 원문의 행성 이름 → `planet.name_ko`, `<i=N>` 마크업 보존(태그가 어긋나면 버림), 응답 zod 검증 + 테스트
- [ ] 수집에 연결: 한글이 없는 MO 제목·브리핑, 디스패치 본문, X 글 본문. 같은 원문은 한 번만 번역. 실패·한도 초과 시 영어 원문 유지, 다음 수집 때 재시도 (D-08)
- [ ] 공식 한국어가 오면 기계 번역을 덮어쓴다 + 테스트
- [ ] F-02-1 F-03-2 화면에 "자동 번역" 표시와 원문 보기

### 수집 보강 (PR #3 리뷰, 2026-10-27)
- [ ] 일일 단계: 행성 273개를 매번 upsert하지 않고, 새 행성이나 값이 바뀐 행성만 쓰기 (`existing` Map 재사용). WarInfo 좌표가 Status의 실시간 위치를 덮어쓰지 않게
- [ ] 동시 실행 방지: `pg_try_advisory_lock` 또는 `planet_effect`에 `UNIQUE (planet_index, effect_id) WHERE ended_at IS NULL` 부분 인덱스 (열린 구간 중복)
- [ ] 전쟁 시즌 교체 감지: Status가 실패하면 다음 실행에서 WarID를 다시 확인. `war`가 없으면 나머지 소스를 `skipped`·`error`로 기록
- [ ] `cron-sql.mjs`: 시크릿·URL에 `$`가 있으면 거부, 원격 DB일 때 `COLLECT_URL`은 https만 허용
- [ ] offset 검증: `Number.isFinite`, 직전 값과 크게 다르면 이전 값 유지
- [ ] 테스트: `runCollection`(소스 격리 D-08, 예외가 나도 `finished_at`, 일일·1시간 skip 조건), `collectStatus` 트랜잭션 조립, `authorized()` 길이 불일치·빈 시크릿
- [ ] P4 화면: Steam 본문(`body_ko`·`body_en`) HTML은 sanitize한 뒤 렌더링

### 커뮤니티 API 폴백 (D-03, F-05-2)
- [ ] Arrowhead 원본 실패·검증 실패 시 해당 항목만 `api.helldivers2.dev`로 받기 (`X-Super-Client`·`X-Super-Contact` 헤더, 레이트리밋 5회/10초) + 테스트
- [ ] `collection_run`에 소스별 폴백 여부 기록 (D-05)
- [ ] F-05-2 폴백으로 받은 항목에 "영어 원문"·출처 표시, 헤더 데이터 상태에 "폴백" 표시

### 배포 (P2 잔여)
- [ ] **[사용자]** E-02 Supabase 새 프로젝트 `helldivers-dashboard` (서울 `ap-northeast-2`). 일시정지된 기존 프로젝트는 그대로 둔다 (2026-10-27 결정)
- [ ] E-02 E-03 Vercel 프로젝트 연결(함수 리전 Seoul `icn1`), 클라우드 마이그레이션, `vercel env pull`
- [ ] 클라우드 pg_cron 등록 (`COLLECT_URL`은 배포 URL)
- [ ] E-07 Preview 배포
- [ ] Q-05 Vercel 사용량이 Hobby 한도의 50% 이하인지 확인 (함수 호출·ISR 쓰기, 하루 수집 후)

### S 우선순위 (일정이 남으면)
- [ ] F-01-6 예상 해방·실패 시각, F-02-5 MO 진행률 추이, F-04-3 진영별 인원 비율 추이, F-04-4 누적 전투 통계, F-05-5 OG 메타데이터

### P4 완료 기준 (SRS v2 §8)
- [ ] 우선순위 M 요구사항이 모두 Preview 배포에서 동작한다
- [ ] 홈 화면이 모바일 LCP 2.5초 이하다
- [ ] 소스 하나를 일부러 실패시켰을 때 폴백·지연 배지가 동작한다
- [ ] 클라우드 15분 수집이 24시간 연속(실패 슬롯 ≤ 2) 돌았다
- [ ] Production 배포 URL을 확보했다
- [ ] CI 녹색

## 백로그

단계에 아직 넣지 않은 할 일. 착수할 때 해당 단계로 옮긴다.

(비어 있음. D-12 기계 번역은 ADR 0006으로 정하고 P4 "기계 번역"으로 옮겼다, 2026-10-27)
