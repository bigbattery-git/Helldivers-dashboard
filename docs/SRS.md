# 헬다이버즈2 대시보드 — SRS v1 (준비 단계: P0~P2)

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v1.0 (2026-10-26) |
| 범위 | P0 하네스 구축 → P1 자료조사 → P2 환경 구축 |
| 진행 관리 | [CHECKLIST.md](CHECKLIST.md) |
| 다음 문서 | [SRS v2](SRS-v2.md) — 대시보드 기능 명세 (P1 결과를 입력으로 작성, 승인됨) |

## 1. 목적과 범위

이 문서는 헬다이버즈2 대시보드를 **만들기 전에 필요한 준비 작업**의 요구사항을 정의한다.

- **P0 하네스 구축**: Claude Code가 이 프로젝트에서 일관되게 일하도록 CLAUDE.md, Skill, Subagent, Hook, MCP를 갖춘다.
- **P1 자료조사**: 게임 데이터 API, 뉴스/SNS 수집 경로, Vercel과 어울리는 DB·스케줄러를 조사하고 채택안을 결정한다.
- **P2 환경 구축**: 결정된 스택으로 Next.js 프로젝트, DB, CI, Vercel 배포 파이프라인을 세운다.

대시보드 화면·기능의 상세 명세는 이 문서의 범위가 아니다. P1 결과를 반영해 SRS v2에서 작성한다.

단계는 **순서대로** 진행한다. 이전 단계의 완료 기준(Exit criteria)을 만족해야 다음 단계로 넘어간다.

## 2. 제품 개요 (참고)

| 구분 | 내용 |
| --- | --- |
| 용도 | 커뮤니티 공유용 + 개인 포트폴리오 |
| 배포 | Vercel (Hobby/무료 티어 기준) |
| 언어·프레임워크 | TypeScript, Next.js (App Router), Node.js 런타임 |
| DB | P1에서 결정 (Vercel Marketplace 연동 DB 후보) |
| 패키지 매니저 | pnpm |

핵심 기능 (P1 조사 범위를 정하는 기준):

1. **은하 전쟁 현황** — 행성별 해방률, 진영, 플레이어 분포, 디펜스 이벤트
2. **주요 명령(MO)** — 진행률, 남은 시간, 보상
3. **뉴스/패치노트** — Steam 공지, 공식 SNS, 게임 내 디스패치
4. **통계/추이 그래프** — 동접자·해방률 등 시계열 (DB에 이력 저장 필요)

## 3. 제약과 가정

- C-01 개발 환경은 Windows. 저장소는 LF 줄바꿈, UTF-8(BOM 없음)을 사용한다 (`.gitattributes`: `* text=auto`).
- C-02 비용 0원을 지향한다. 모든 외부 서비스는 무료 티어 안에서 운용 가능한지 확인한다. 예외: X 공식 API 종량제(월 $1 미만 추정, [ADR 0002](adr/0002-news-and-stats-sources.md)).
- C-03 Vercel Hobby 플랜의 Cron은 **하루 1회** 실행으로 제한된다(2026-10 기준 재확인 필요). 수 분~수십 분 주기 수집에는 대안 스케줄러가 필요할 수 있다.
- C-04 외부 API는 레이트리밋이 있으며, 비공식 API는 예고 없이 스키마가 바뀌거나 중단될 수 있다.
- C-05 SNS 데이터는 공식 API를 우선하되, **비공식 크롤링도 조사 대상**에 포함한다. 단, 약관·차단 리스크를 문서화하고 채택 여부는 별도로 결정한다.
- C-06 문서, 커밋 메시지, Claude 응답은 한국어로 작성한다.
- C-07 주기 수집은 **15분 간격**, 시계열 이력은 **30일 보관**을 기준으로 설계한다. 배포는 Vercel을 유지하고, Cron 한도는 외부 무료 스케줄러로 보완한다.
- C-08 대시보드는 **한국어 우선**으로 표시한다. 소스가 한국어 텍스트를 제공하는지 조사 대상에 포함한다.

## 4. P0 — 하네스 구축 요구사항

| ID | 요구사항 | 산출물 |
| --- | --- | --- |
| H-01 | **CLAUDE.md 개편**: 프로젝트 개요, 현재 단계와 SRS/CHECKLIST 포인터, 기술 스택, 명령어 섹션(P2에서 채움), 커밋 컨벤션(Conventional Commits + 한글 subject), 문서 작성 규칙, 데이터 수집 규칙(약관 준수·레이트리밋·식별 헤더), 응답 언어(한국어) | `CLAUDE.md` |
| H-02 | **Skill `srs-sync`**: 작업 후 CHECKLIST 체크 상태 갱신, SRS 상태표(§9) 갱신, 결정사항을 ADR로 기록하는 절차 | `.claude/skills/srs-sync/SKILL.md` |
| H-03 | **Subagents** 3종 정의 (아래 표) | `.claude/agents/*.md` |
| H-04 | **Hooks** 4종 (아래 표). Windows 호환을 위해 Node 스크립트(`.mjs`)로 작성 | `.claude/settings.json`, `.claude/hooks/*.mjs` |
| H-05 | **권한·비밀정보 보호**: `permissions.deny`에 `.env*`와 `.vercel/.env.*` 읽기/편집/쓰기 차단(`Edit` 규칙이 Write도 포함하며, `.env.example`은 열어둔다), `.gitignore`에 `.env*` 추가(`.env.example`은 예외) | `.claude/settings.json`, `.gitignore` |
| H-06 | **MCP·GitHub 연동**: MCP 서버 context7, Vercel, Playwright를 사용 가능 상태로 구성하고, GitHub은 `gh` CLI로 연동 (아래 표) | `.mcp.json`, `.claude/settings.local.json` |
| H-07 | **에디터 설정**: LF, UTF-8, 들여쓰기 2칸 | `.editorconfig` |

### H-03 Subagents

| 이름 | 수명 | 역할 | 도구 |
| --- | --- | --- | --- |
| `source-researcher` | **임시** (P1 종료 시 비활성화) | 게임 데이터 API·뉴스/SNS 소스의 엔드포인트를 실제로 호출하고, 인증·응답 스키마·갱신 주기·레이트리밋·약관을 §5 표준 표로 기록. 크롤링 가능성 실측 | WebSearch, WebFetch, Bash(curl), Playwright MCP, Read/Write(`docs/research/`) |
| `infra-researcher` | 상시 | DB·스케줄러·캐시 전략 비교, Vercel 한도/요금 확인 | WebSearch, WebFetch, Vercel MCP(문서 검색), context7 |
| `code-reviewer` | 상시 (P2 이후 주 사용) | TS/Next.js 코드 리뷰: 타입 안정성, 서버/클라이언트 경계, 캐싱, 비밀정보 노출 | 읽기 전용 (Read, Grep, Glob) |

### H-04 Hooks

| 이벤트 | 동작 | 활성 시점 |
| --- | --- | --- |
| PostToolUse (Write\|Edit) | 편집된 파일의 CRLF·BOM·비UTF-8 검사. 위반 시 exit 2로 Claude에게 경고 | 즉시 |
| PostToolUse (Write\|Edit) | `*.ts, *.tsx, *.js, *.mjs` 파일에 `prettier --write` + `eslint --fix` | `node_modules`가 없으면 no-op → P2부터 동작 |
| Stop | 이번 턴에 TS/JS 변경이 있으면 `pnpm tsc --noEmit && pnpm build` 실행, 실패 시 오류 요약을 Claude에게 반환해 수정 유도. `stop_hook_active`로 무한 루프 방지 | P2부터 동작 (그 전엔 no-op) |
| SessionStart | `docs/CHECKLIST.md`에서 현재 단계와 미완료 항목 상위 N개를 컨텍스트로 주입 | 즉시 |

### H-06 MCP·GitHub 연동

| 대상 | 용도 | 구성 방식 |
| --- | --- | --- |
| context7 | Next.js·라이브러리 최신 문서 조회 | 사용자 플러그인 (`/mcp`로 로그인 완료) |
| Vercel | 배포·로그·환경변수, Vercel 문서 검색 | claude.ai 커넥터 (연결됨) |
| Playwright | 크롤링 가능성 실측, E2E 검증 | `.mcp.json` — `cmd /c npx -y @playwright/mcp@0.0.83`, `.claude/settings.local.json`으로 사전 승인 |
| GitHub | 이슈·PR 관리, Actions 확인 | `gh` CLI (로그인됨). GitHub MCP 플러그인은 로그인이 서비스 오류로 실패해 쓰지 않기로 함 |

원칙: 플러그인으로 이미 제공되는 서버는 `.mcp.json`에 중복 등록하지 않는다. 버전은 고정한다.

## 5. P1 — 자료조사 요구사항

모든 조사 결과는 `docs/research/`에 작성하며, 소스마다 아래 **표준 표**를 채운다.

| 필드 | 설명 |
| --- | --- |
| 소스/엔드포인트 | URL, HTTP 메서드 |
| 공식 여부 | 공식 / 비공식 공개 / 커뮤니티 / 스크래핑 |
| 인증 | 없음 / API 키 / OAuth / 필수 헤더 |
| 응답 예시 | 실제 호출 결과 일부 (민감정보 제거) |
| 갱신 주기 | 데이터가 바뀌는 빈도 |
| 레이트리밋 | 문서상 한도 / 실측 |
| 약관·리스크 | ToS 조항, 차단 가능성, 중단 이력 |
| 커버 기능 | §2의 핵심 기능 1~4 중 무엇을 채우는가 |
| 채택 여부 | 채택 / 보조 / 기각 + 사유 |

| ID | 요구사항 | 산출물 |
| --- | --- | --- |
| R-01 | **게임 데이터 API 조사**. 검증 후보: Arrowhead 공개 엔드포인트(`api.live.prod.thehelldiversgame.com` — WarSeason Status, WarInfo, NewsFeed, Assignment), 커뮤니티 API(`helldivers-2/api`, `api.helldivers2.dev` — `X-Super-Client`/`X-Super-Contact` 헤더 요구), 기타 커뮤니티 API. 핵심 기능 1·2·4를 어떤 엔드포인트가 커버하는지 매핑 | `docs/research/game-api.md` |
| R-02 | **뉴스/SNS 수집 경로 조사**. 후보: Steam Web API(`ISteamNews/GetNewsForApp`, appid 553850 / `ISteamUserStats/GetNumberOfCurrentPlayers`), Steam RSS, 게임 내 디스패치(NewsFeed), X(공식 API 요금·한도 vs 비공식 스크래핑 방식·약관·차단 리스크), Reddit API, Discord 공지 채널 팔로우+봇, YouTube RSS. Playwright로 크롤링 가능성 실측 | `docs/research/news-sources.md` |
| R-03 | **인프라 조사**. ① Vercel Marketplace DB 비교(Neon, Supabase, Prisma Postgres, Upstash Redis, Turso 등): 무료 한도, 서버리스 드라이버, 시계열 이력 저장 적합성, ORM(Drizzle/Prisma) ② 주기 수집 스케줄러 비교(Vercel Cron 한도, GitHub Actions schedule, Upstash QStash, Supabase pg_cron 등) ③ 캐싱 전략(ISR, `revalidate`, 데이터 캐시) | `docs/research/infra.md` |
| R-04 | **결정 기록**: 데이터 소스·DB·ORM·스케줄러 채택안을 ADR로 작성 | `docs/adr/NNNN-*.md` |
| R-05 | **임시 에이전트 정리**: `source-researcher`를 `docs/archive/agents/`로 이동해 비활성화 | 파일 이동 |
| R-06 | **SRS v2 초안**: P1 결과를 입력으로 대시보드 화면·기능·데이터 수집 요구사항을 작성하고 사용자 승인을 받는다 (P2 전) | `docs/SRS-v2.md` |

## 6. P2 — 환경 구축 요구사항

| ID | 요구사항 | 산출물 |
| --- | --- | --- |
| E-01 | `pnpm create next-app`(TS, App Router, ESLint, `src/` 디렉터리) + Prettier + Vitest 구성 | 프로젝트 골격, `package.json` |
| E-02 | R-04에서 결정한 DB 프로비저닝 + ORM 설정 + 첫 마이그레이션 성공 | 스키마·마이그레이션 파일 |
| E-03 | Vercel 프로젝트 연결, `vercel env pull`로 로컬 환경변수 동기화, `.env.example` 작성 | `.env.example` |
| E-04 | `/api/health` 라우트 + 채택한 외부 API 1건 호출 스모크 테스트 | 라우트, 테스트 |
| E-05 | GitHub Actions CI: lint → typecheck → test → build | `.github/workflows/ci.yml` |
| E-06 | 하네스 훅 실동작 확인(포맷/린트/빌드), CLAUDE.md에 명령어·아키텍처 갱신 | `CLAUDE.md` |
| E-07 | 첫 Preview 배포 성공 | Preview URL |

## 7. 비기능 요구사항

| ID | 요구사항 |
| --- | --- |
| N-01 | 외부 API 호출은 서버 측(Route Handler, Server Component, 스케줄 작업)에서만 수행하고 캐시를 거친다. 클라이언트가 외부 API를 직접 호출하지 않는다. |
| N-02 | 외부 요청에는 식별 가능한 User-Agent(와 소스가 요구하는 식별 헤더)를 포함한다. |
| N-03 | 비밀정보(API 키, DB URL)는 커밋하지 않는다. Vercel 환경변수로만 관리한다. |
| N-04 | 각 소스의 레이트리밋을 넘지 않도록 수집 주기를 설계한다. |
| N-05 | 문서·커밋 메시지는 한국어, 코드 식별자는 영어. |

## 8. 리스크

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| 비공식/커뮤니티 API 스키마 변경·중단 | 대시보드 데이터 공백 | 소스 2개 이상 확보(주/보조), 응답 스키마 검증(zod 등) |
| X 스크래핑 차단·약관 위반 | 수집 실패, 계정/IP 차단 | 대안 경로(Steam·Discord·RSS) 우선, 스크래핑은 채택 시 별도 ADR |
| Vercel Hobby 한도(Cron, 함수 실행 시간) | 주기 수집 불가 | R-03에서 외부 스케줄러 대안 확정 |
| Windows 경로·줄바꿈 이슈 | 훅·스크립트 오작동 | Node 스크립트로 훅 작성, CRLF 검사 훅, `.editorconfig` |

## 9. 상태표

`srs-sync` 스킬이 갱신한다.

| 단계 | 상태 | 진행률 | 비고 |
| --- | --- | --- | --- |
| P0 하네스 구축 | 완료 | 100% | 완료 기준 5개를 새 세션에서 실측 확인 (2026-10-26) |
| P1 자료조사 | 완료 | 100% | 조사 3건, ADR 0001~0004, SRS v2 승인 (2026-10-26) |
| P2 환경 구축 | 진행 중 | 76% | 남은 일: Vercel 연결·Supabase 클라우드(사용자), env pull, Preview 배포 |
| P3 데이터 수집 | 완료 | 100% | [SRS v3](SRS-v3.md). 8슬롯 연속 수집·Sentry·CI 확인 (2026-10-27, PR #3) |
| P4 화면 | 진행 중 | 3% | [SRS v4](SRS-v4.md) 설계. 지도·X 수집·기계 번역(ADR 0006)·커뮤니티 API 폴백 포함. 사용자 조치: Supabase 새 프로젝트, Vercel 연결 |
