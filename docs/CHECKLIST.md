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
- [x] E-02 DB 프로비저닝 (Marketplace 대신 Supabase에서 직접 생성, 시드니 `ap-southeast-2`. 2026-10-27, P4 배포 절 참고)
- [x] E-02 ORM 설정 + 첫 마이그레이션 성공 (Prisma 7.10.1, 로컬 Supabase에 `collection_run` 생성. pg_cron·pg_net 로컬 동작 확인, Free 클라우드는 미확인)
- [x] E-03 Vercel 프로젝트 연결 (2026-10-27. `vercel env pull`은 `.env.cloud`로 대체, P4 배포 절 참고)
- [x] E-03 `.env.example` 작성 (DATABASE_URL, DIRECT_URL, CRON_SECRET, X_BEARER_TOKEN)
- [x] E-04 `/api/health` 라우트 (로컬 DB 정상 200, DB 중단 시 503 확인)
- [x] E-04 외부 API 1건 호출 스모크 테스트 (`pnpm test:smoke`, Arrowhead WarID)
- [x] E-05 GitHub Actions CI (format:check → lint → typecheck → test → build). GitHub Actions 통과 (PR #1)
- [x] E-06 훅 실동작 확인 (편집 시 포맷·린트, 턴 종료 시 빌드: 통과·타입 오류 차단 모두 확인)
- [x] E-06 CLAUDE.md에 명령어·아키텍처 갱신
- [x] E-07 첫 Preview 배포 (2026-10-27, `chore/p4-deploy`. P4 배포 절 참고)

### P2 완료 기준
- [x] 로컬 `pnpm build` 통과
- [x] CI 녹색 (PR #1, run 40280731440, 2026-10-26)
- [x] Preview 배포 URL 확보 (2026-10-27, 브랜치 Preview. Vercel 로그인 보호가 기본으로 걸려 있음)
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
- [x] 행성 요소(`effect_id`) 한국어 이름·설명 표 (모르는 id는 표시하지 않고 로그) (PR B2: 활성 52종. 공식 표기가 있는 것은 공식대로, 나머지는 직접 번역 — 사용자 검토 필요. 툴팁은 환경·적 변종만)
- [x] 공식 번역 용어표 (세력·게임 용어, 공식 한국어 디스패치·MO에서 추출. 화면 문구와 기계 번역이 같이 씀) (PR A `src/lib/hd/terms.ts`)
- [x] 행성 이름 표시: 공식 한국어(`name_ko`) + "(원문)"을 누르면 영어가 펼쳐짐, 지도 라벨은 한국어만 (PR A `PlanetName`, PR B2 지도 라벨)
- [x] F-01-5 해방률·방어 진행률·1시간 추세 계산 + 테스트 (PR A)
- [x] F-05-3 KST 시각·상대 시간·카운트다운 포맷 + 테스트 (PR A)

### 공통 레이아웃
- [ ] F-05-1 마지막 수집 시각, 30분 넘으면 "데이터 지연" 배지 (`collection_run`) — 진행 중: 헤더 시각과 수집 뒤 갱신은 확인, 지연 배지는 실제로 30분 넘은 상태에서 아직 못 봄. 10-28 수집은 정상인데 배지가 잘못 뜬 건 확인: 방문이 뜸하면 `revalidateTag "max"`가 첫 방문자에게 몇 시간 전 페이지를 줌 → 수집 직후 `/`, `/news`, `/stats`를 예열하도록 수정(PR #16). 운영 확인: 11:30Z 수집 뒤 첫 요청에서 세 페이지 모두 `HIT`, 수집 시각 11:30Z, 렌더 시각 약 11:30:10Z
- [x] F-05-4 데이터 출처, 비공식 팬 사이트 고지 (상표·저작권은 Arrowhead·Sony 소유) (PR A 푸터 → PR B2에서 맨 아래 한 줄로)
- [ ] Q-04 360~1440px 가로 스크롤 없음, Q-03 키보드 탐색·포커스 표시 — 진행 중: 홈은 360·1440px 가로 스크롤 없음, 지도 마커 Tab 이동·Esc 닫기 확인(PR B2). 하위 화면이 생길 때마다 다시 확인

### 홈 `/`
- [x] 헤더 KPI 타일 (투입 인원, 해방 행성 수 등) (PR B1)
- [x] F-01-7 은하 지도: 행성 마커(MO 대상 `--major`, 방어 중 `__def`), 슈퍼지구, 궤도 (PR B2. 활성 전선 전부 점, 라벨은 MO 대상·방어 중·인원 상위 5곳)
- [x] 해방 툴팁: 호버·포커스·탭으로 열기, 해방도·투입 인원·시간당 변화·행성 요소 (PR B2. 좁은 화면은 지도 아래)
- [x] F-01-3 방어 툴팁: 남은 시간 카운트다운, 방어 진행률. 데이터가 없는 항목(침공 레벨, 행성 이미지, 공격 출발지)은 생략하거나 자리표시자 (PR B2. 적의 공세 = 경과 시간, 예상 결과 계산. 로컬 가짜 이벤트로 확인 — 실제 방어전과 게임 화면 대조는 아직)
- [x] F-02-1 F-02-3 F-02-6 MO 패널: 제목·브리핑, 태스크별 진행률, 카운트다운·만료 시각(KST), 보상, 여러 MO (PR B1)
- [x] F-01-1 F-01-2 활성 전선 목록: MO 대상 먼저 → 플레이어 수 순, 해방률·진영 정렬 선택, 메타 `62% · 84,210명` (PR B1. 정렬은 브라우저에서 해서 ISR 유지. 방어 행은 로컬 가짜 이벤트로 확인) (SRS v5에서 삭제, 주요 전선 카드로 대체)
- [x] F-01-4 진영별 요약 (활성 전선 수·투입 인원 합계) (PR B1)
- [x] F-03 최신 뉴스 5건 (업데이트 내역 패널) (PR B1. Steam HTML은 글자만 보여 줌)
- [x] F-04-1 동접자 24시간 미니 그래프 (PR B1, KPI 타일 안 스파크라인 + 대체 텍스트)

시안 맞추기 (PR B2에서 지도와 함께, 사용자 결정 2026-10-27). B1은 데이터가 제대로 나오는지 확인하는 단계였고, 배치는 확정 시안(`docs/design-system/reference/dashboard.dc.html`)과 다르다.
- [x] 머리: 육각 아이콘 + `GALACTIC WAR · DAY N` + "전술 지휘 대시보드", KPI를 오른쪽 가로 배치(4칸: 투입 인원·해방 행성·Steam 동접자·LAST UPDATE+지연 배지). 별도 사이트 헤더 줄 제거 (PR B2)
- [x] 1행 [은하계 전황 지도 + 범례 | 주요 명령], 2행 [진행 중인 전선 | 업데이트 내역] (PR B2)
- [x] 주요 명령: 제목 → 브리핑 → 태스크별 막대(시안의 진행도 자리) → 남은 시간("2일 5시간")·보상 두 칸 (PR B2)
- [x] 전선 행: 시안의 단순한 행 6개 + 전체 펼치기, 정렬은 제목 옆 선택 상자, 진영 요약은 지도 범례 (PR B2)
- [x] 푸터 블록 제거, 출처·비공식 고지는 맨 아래 한 줄 (PR B2)

### 행성 상세 `/planets/[index]` (SRS v5에서 삭제)
- [x] 첫 요청 때 생성·캐시 (빌드 때 미리 만들지 않음), 없는 index는 404 (PR C. 번호 0만 형식 프리렌더, `instant = false`로 실제 HTTP 404)
- [x] 현재 상태·행성 요소·방어 이벤트 (PR C, 툴팁 확장판 + 시설·지형)
- [x] F-04-2 해방률·플레이어 수 30일 추이 (PR C, 그래프 하나에 [해방률 | 투입 인원] 전환)

### 뉴스 `/news`
- [x] F-03-1 F-03-3 통합 피드, 종류 배지·필터 (PR C, 최근 50건)
- [x] F-03-2 F-03-4 한국어 우선(없으면 "원문" 표시), 원문 링크 (PR C. 펼치면 본문 전체, Steam은 HTML·BBCode 없이 문단 글자만)

### 통계 `/stats` (은하 전체 기준)
- [x] F-04-1 동접자 24시간 / 7일 / 30일 ("Steam 기준, PS5 제외" 표기) (PR C)
- [x] F-04-5 서버 시간 버킷 집계(30일은 1시간 버킷) + 테스트 (PR C `src/lib/hd/series.ts`. 집계는 서버 렌더 때 JS로)
- [x] Q-03 그래프에 수치 대체 텍스트 (PR C, `aria-label` 요약 + "수치 보기" 표)

### 홈 진입·표시 (PR C)
- [x] 하위 화면 진입: 업데이트 내역 "전체 보기" → /news, STEAM PLAYERS 타일 → /stats, 전선 행 → /planets/N(SRS v5에서 삭제). 하위 화면 머리(← 대시보드, LAST UPDATE·지연 배지)
- [x] 주요 명령 직접 대상 행성을 지도 마커에 강조색 ▲(`.hd-marker__mo`) + 범례 + 스크린 리더 이름. 로컬 가짜 MO로 확인

### X 수집 (ADR 0002)
- [x] **[사용자]** X 개발자 계정·크레딧, `.env.local`에 `X_BEARER_TOKEN` (2026-10-27)
- [x] `@helldivers2` 새 글을 `since_id`로 15분마다 수집 → `news_item` + 테스트 (PR D2 `src/lib/collect/x.ts`. 첫 실행은 최근 5건, 이후 `since_id`. t.co 링크는 원래 주소로. 로컬 실수집에서 5건 저장 후 다음 실행 0건 확인)
- [x] 개발자 정책: X에서 삭제된 게시물은 `news_item`에서도 삭제, 작성 계정·원문 링크 표시 (PR D2: 하루 1회 72시간 안의 글을 `GET /2/tweets?ids=`로 확인, `errors`에 오른 글 삭제. `collection_run`의 `xDeleted` 기록으로 하루 1회 판단. 실수집 5건 확인·0건 삭제. 화면에 "X @helldivers2"·"원문 보기 ↗")
- [x] F-03-6 키가 없거나 실패해도 나머지 피드 동작 (X 항목만 빠짐) (PR D2: 토큰 없으면 `x` skipped, 실패는 소스별 격리. `run.test.ts`로 확인)
- [ ] 첫 과금 내역을 보고 폴링 주기 조정 (필요하면 1시간)

### 기계 번역 (ADR 0006, D-12)
- [x] **[사용자]** Google AI Studio에서 결제 연결 없이 API 키 발급, `.env.local`에 `GEMINI_API_KEY` (2026-10-27, 무료 티어로 번역 호출 200 확인)
- [x] 스키마: `assignment`에 `title_ko`·`briefing_ko`, `assignment`·`news_item`에 번역 출처(`official` / `machine`) + 마이그레이션 (PR D2 `20261027130000_translation`, 열 이름 `translation`. `assignment.title`·`briefing`은 받은 원문 그대로)
- [x] 번역 함수 (`gemini-3.5-flash-lite`, 모델 ID는 환경변수 `GEMINI_MODEL`): 공식 번역 용어표, 원문의 행성 이름 → `planet.name_ko`, `<i=N>` 마크업 보존(태그가 어긋나면 버림), 응답 zod 검증 + 테스트 (PR D2 `src/lib/collect/translate.ts`, fetch 모킹 테스트)
- [x] 수집에 연결: 한글이 없는 MO 제목·브리핑, 디스패치 본문, X 글 본문. 같은 원문은 한 번만 번역. 실패·한도 초과 시 영어 원문 유지, 다음 수집 때 재시도 (D-08) (PR D2: Arrowhead·X 뒤 `translate` 단계, 실행당 Gemini 1회·최대 20건. 실수집 1회에 8건 보내 7행 번역, 2.1초. 다음 실행은 호출 없음)
- [x] 공식 한국어가 오면 기계 번역을 덮어쓴다 + 테스트 (PR D2 `orderText`·`dispatchText`. 영어 원문이 바뀌어도 번역을 지우고 다시 번역)
- [x] F-02-1 F-03-2 화면에 "자동 번역" 표시와 원문 보기 (PR D2: MO 제목 옆 "자동 번역" + 접이식 "(원문)", 뉴스·업데이트 내역 "자동 번역", 뉴스 펼침 안 "(원문)", 필터에 X. 로컬 가짜 영어 MO와 실제 디스패치·X 글로 확인. 360px에서 긴 URL 가로 스크롤 없음)

### 수집 보강 (PR #3 리뷰, 2026-10-27)
- [x] 일일 단계: 행성 273개를 매번 upsert하지 않고, 새 행성이나 값이 바뀐 행성만 쓰기 (`existing` Map 재사용). WarInfo 좌표가 Status의 실시간 위치를 덮어쓰지 않게 (PR D1: 새 행성은 `createMany`, 바뀐 행성만 좌표 없이 `update`. 로컬 실수집에서 273개 중 쓰기 0건 + 테스트)
- [x] 동시 실행 방지: `pg_try_advisory_lock` 또는 `planet_effect`에 `UNIQUE (planet_index, effect_id) WHERE ended_at IS NULL` 부분 인덱스 (열린 구간 중복) (PR D1: 부분 유니크 인덱스 `planet_effect_open_key`, Prisma `partialIndexes` 미리보기로 스키마에 선언 + 중복 정리 SQL. advisory lock은 트랜잭션 풀러에서 세션이 보장되지 않아 쓰지 않음. insert는 `skipDuplicates`)
- [x] 전쟁 시즌 교체 감지: Status가 실패하면 다음 실행에서 WarID를 다시 확인. `war`가 없으면 나머지 소스를 `skipped`·`error`로 기록 (PR D1: 직전 실행의 `status`가 error면 일일 단계를 다시 돌림, `war`가 없으면 `skipped` + `reason`. 테스트로 확인)
- [x] `cron-sql.mjs`: 시크릿·URL에 `$`가 있으면 거부, 원격 DB일 때 `COLLECT_URL`은 https만 허용 (PR D1: 5가지 조합을 종료 코드로 확인)
- [x] offset 검증: `Number.isFinite`, 직전 값과 크게 다르면 이전 값 유지 (PR D1: 2분 넘게 차이 나면 이전 값 + 결과에 `offsetRejected`. 폴백 Status는 미러 스냅샷이 늦어 저장된 값 유지 + 테스트)
- [x] 테스트: `runCollection`(소스 격리 D-08, 예외가 나도 `finished_at`, 일일·1시간 skip 조건), `collectStatus` 트랜잭션 조립, `authorized()` 길이 불일치·빈 시크릿 (PR D1: `authorized()`는 `src/lib/collect/auth.ts`로 분리)
- [x] P4 화면: Steam 본문(`body_ko`·`body_en`) HTML은 sanitize한 뒤 렌더링 (PR C에서 HTML을 렌더링하지 않고 글자만 보여 주는 방식으로 대신함(`steamText`). `src`에 `dangerouslySetInnerHTML` 없음을 PR D1에서 확인)

### 커뮤니티 API 폴백 (D-03, F-05-2)
- [x] Arrowhead 원본 실패·검증 실패 시 해당 항목만 `api.helldivers2.dev`로 받기 (`X-Super-Client`·`X-Super-Contact` 헤더, 레이트리밋 5회/10초) + 테스트 (PR D1: `/raw/api` 같은 경로. 429·네트워크·5xx면 그 실행에서 미러 중단, 원본이 죽으면 바로 미러로. 원본을 막고 로컬 실수집에서 Status·MO·디스패치 폴백 성공 확인. `COMMUNITY_API_CONTACT`가 없으면 폴백 안 함. WarID·WarInfo·Stats는 응답 모양만 확인)
- [x] `collection_run`에 소스별 폴백 여부 기록 (D-05) (PR D1: 결과 항목에 `fallback: true`, 실수집 기록으로 확인)
- [x] F-05-2 폴백으로 받은 항목에 "영어 원문"·출처 표시, 헤더 데이터 상태에 "폴백" 표시 (PR D1: 홈·하위 화면 LAST UPDATE 타일에 "폴백" 배지(설명: 커뮤니티 API(영어)), 한글 없는 MO 제목에 "원문". 폴백 MO는 제목·브리핑을 덮어쓰지 않고, 폴백 디스패치는 새 항목만. 화면은 로컬에서 확인, 360px 가로 스크롤 없음)

### UI 개편 (SRS v5, 2026-10-28)

요구사항은 [SRS v5](SRS-v5.md)를 따른다.
- [x] SRS v5 작성, 체크리스트·디자인 시스템 README·CLAUDE.md 반영
- [x] U-01 `/planets/[index]` 화면·`getPlanetDetail` 삭제, 그 경로 404 (로컬 dev에서 `/planets/1` 404 확인)
- [x] U-02 홈 "진행 중인 전선" 목록·정렬 제거 (`FrontList`, `sortFronts`, 안 쓰게 된 `.hd-mission` CSS)
- [x] U-03 주요 전선 8개 선정(방어 반드시 포함 → 인원 순 채움, 표시는 인원 순) + 테스트 (`topFronts`. 로컬 가짜 방어 이벤트(인원 22명)가 8번째 카드로 들어오는 것 확인)
- [x] U-05 F-01-6 예상 시각(해방·철수·정체, 방어 성공·실패) + 테스트 (`frontEta`, 시간당 변화는 소수 3자리. 1시간 전 기록이 없으면 "추세 없음". 코드 리뷰 반영: 10년 넘는 외삽은 정체, 반올림 0은 색 없음)
- [x] U-04 주요 전선 카드 화면: 지도 아래 전체 폭 4열, 업데이트 내역은 그 아래 전체 폭 (`FrontCards`, `.hd-front`. 방어 카드는 툴팁과 같은 방어 진행 상황 / 적의 공세 상황 두 줄(`DefenseBars` 공용), 칸 최소 260px로 1280px에서 4열)
- [x] Q-04 Q-03 360·1440px 가로 스크롤 없음, "(원문)" 버튼 키보드 포커스 (1280·1440px 4열, 360px 1열 확인)
- [x] 검사 통과 (format·lint·typecheck·test·build, 로컬)

### 자동 갱신 (SRS v6, 2026-10-29)

요구사항은 [SRS v6](SRS-v6.md)를 따른다.
- [x] SRS v6 작성, 체크리스트·CLAUDE.md 반영
- [x] A-01 슬롯 + 2분이 지났는데 화면 수집 시각이 이번 슬롯보다 이르면 1분마다 `router.refresh()` + 판단 함수 테스트 (`behind` 7건, `StaleBadge`의 1분 판단에 붙임. 처음 만든 시각 고정 `AutoRefresh`는 첫 refresh가 옛 RSC를 받아 삭제. 로컬 `next start`: 04:00 수집 뒤 첫 refresh는 옛것, 1분 뒤 재시도에서 13:00으로 바뀌고 이후 요청 멈춤, 전체 새로고침 없음)
- [x] A-02 숨긴 탭은 받지 않고, 다시 보일 때 바로 판단 (로컬: 숨김 상태로 02:47 tick에 요청 없음 → 보이게 하자 1회, 최신 상태에서 다시 보여도 추가 요청 없음)
- [x] A-03 갱신 뒤 LAST UPDATE·지연 배지가 새 수집 기준으로 바뀐다 (로컬: "— 데이터 지연" → "10.29 13:00", 배지 사라짐)
- [x] A-04 수집 직후 `revalidateTag(tag, { expire: 0 })` (로컬 `next start`: 수집 12초 뒤 첫 요청부터 `/`·`/news` 모두 `HIT` + 새 수집 시각, 2회 반복 확인. 이전 `"max"`는 예열 뒤에도 몇 번의 요청 동안 옛 화면)
- [x] 검사 통과 (format·lint·typecheck·test·build, 로컬)
- [x] 운영 확인: 열어 둔 홈이 x2~x3분에 새 수집 시각으로 바뀌고, 그 요청이 캐시 `HIT` (2026-10-29, PR #18 배포. 04:45 수집 21초 뒤 첫 요청부터 `/`·`/news`·`/stats` 모두 `HIT`·수집 시각 04:45:02(Age 12초, 예열이 렌더). 04:40에 열어 둔 홈이 04:48:39 refresh 한 번으로 "10.29 13:30" → "13:45", 재로드 없음. refresh RSC 응답도 `HIT`·같은 수집 시각 — 로컬 `next start`와 달리 Vercel은 예열이 RSC까지 데움. 브라우저 패널이 숨겨져 있어 타이머는 페이지를 건드릴 때 돌았음)

### 배포 (P2 잔여)
- [x] **[사용자]** E-02 Supabase 새 프로젝트 `helldivers-dashboard`. 일시정지된 기존 프로젝트는 그대로 둔다 (2026-10-27 결정. 생성 화면은 Americas·Europe·Asia-Pacific 일반 리전만 고를 수 있어 시드니 `ap-southeast-2`로 생성됨. 서울로 다시 만들지 않고 시드니 유지, 사용자 결정)
- [x] E-02 E-03 Vercel 프로젝트 연결(함수 리전은 DB와 같은 Sydney `syd1`, `vercel.json`으로 고정. ADR 0003 "리전 맞춤"), 클라우드 마이그레이션 4개 적용(`prisma migrate deploy`), 배포 `/api/health` 200·`db: ok`. `vercel env pull`은 하지 않음: `.env.local`을 덮어써 로컬 dev가 클라우드 DB를 보게 되므로, 클라우드 대상 명령은 `.env.cloud`(`DIRECT_URL`·`COLLECT_URL`, gitignore)를 `node --env-file=.env.cloud`로 먼저 읽는다
- [x] 클라우드 pg_cron 등록 (`COLLECT_URL`은 배포 URL) (2026-10-27: `collect`·`retention` 등록. 수동 수집 1회 전 소스 ok(번역 6건, X 5건), 13:00 UTC 슬롯을 cron이 호출해 200·7초, `collection_run` 기록 확인)
- [x] E-07 Preview 배포 (2026-10-27: `chore/p4-deploy` Preview READY, 함수 `syd1`, `/api/health` 200·`db: ok`. 첫 빌드는 Vercel 빌드 캐시로 설치가 건너뛰어져 `postinstall`의 `prisma generate`가 안 돌아 실패 → `build`에 `prisma generate`를 붙여 해결. 배포 직후 빈 화면(빌드 때 DB를 안 읽어 "—")은 Vercel 빌드에서만 DB를 읽도록 바꿔 해결: Preview 첫 요청(`PRERENDER`)부터 홈·뉴스·통계에 실데이터)
- [x] Supabase 보안 경고(RLS Disabled in Public, CRITICAL) 해결: 마이그레이션 `enable_rls`로 `public` 테이블 13개 전부 RLS 켬, 정책 없음 → Data API(공개 키)로 읽기·쓰기 불가. 앱·pg_cron은 테이블 소유자 `postgres`로 접속해 영향 없음(클라우드 적용 후 수집 전 소스 ok·health 200, 2026-10-27). 새 테이블 마이그레이션에도 RLS 줄을 넣는다
- [ ] Q-05 Vercel 사용량이 Hobby 한도의 50% 이하인지 확인 (함수 호출·ISR 쓰기, 하루 수집 후)

### S 우선순위 (일정이 남으면)
- [x] F-02-5 MO 진행률 추이, F-04-3 진영별 인원 비율 추이(인류 소유 행성 제외 근사치), F-04-4 전투 통계 24시간 증가량 (PR C)
- [x] F-01-6 예상 해방·실패 시각 (방어 툴팁의 예상 결과(PR B2) + 주요 전선 카드의 예상 시각(SRS v5 U-05))
- [ ] F-05-5 OG 메타데이터

### P4 완료 기준 (SRS v2 §8)
- [ ] 우선순위 M 요구사항이 모두 Preview 배포에서 동작한다
- [ ] 홈 화면이 모바일 LCP 2.5초 이하다
- [ ] 소스 하나를 일부러 실패시켰을 때 폴백·지연 배지가 동작한다
- [ ] 클라우드 15분 수집이 24시간 연속(실패 슬롯 ≤ 2) 돌았다
- [x] Production 배포 URL을 확보했다 (`helldivers-dashboard.vercel.app`, 2026-10-27. 수집 후 홈에 실데이터 확인)
- [ ] CI 녹색

## 백로그

단계에 아직 넣지 않은 할 일. 착수할 때 해당 단계로 옮긴다.

(비어 있음. D-12 기계 번역은 ADR 0006으로 정하고 P4 "기계 번역"으로 옮겼다, 2026-10-27)
