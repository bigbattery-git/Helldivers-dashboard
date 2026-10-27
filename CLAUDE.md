# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 주는 안내서다.

## 프로젝트 개요

헬다이버즈2 대시보드: 은하 전쟁 현황, 주요 명령(MO), 뉴스/패치노트, 통계/추이 그래프를 한 화면에 모아 보여주는 웹 서비스. 커뮤니티 공유용이자 개인 포트폴리오이며 Vercel(Hobby 티어)에 배포한다.

- 언어·프레임워크: TypeScript, Next.js (App Router), Node.js 런타임
- 패키지 매니저: pnpm
- DB·ORM·스케줄러: Supabase Postgres + Prisma 7 + Supabase Cron ([ADR 0003](docs/adr/0003-database-and-orm.md), [0004](docs/adr/0004-scheduler.md))
- Next.js 16은 학습 데이터와 API가 다를 수 있다. 코드 작성 전 [AGENTS.md](AGENTS.md)대로 `node_modules/next/dist/docs/`의 해당 문서를 확인한다

## 현재 단계

작업은 **P0 하네스 구축 → P1 자료조사 → P2 환경 구축 → P3 데이터 수집 → P4 화면** 순서로 진행한다. 이전 단계의 완료 기준을 만족해야 다음 단계로 넘어간다.

- 진행 상황과 현재 단계: [docs/CHECKLIST.md](docs/CHECKLIST.md) (`현재 단계:` 줄이 기준)
- 요구사항: [docs/SRS.md](docs/SRS.md) — 체크리스트 항목의 ID(H-xx, R-xx, E-xx)는 SRS 요구사항 ID다
- 작업을 마치면 `srs-sync` 스킬로 체크리스트·상태표·ADR을 갱신한다

## 명령어

| 명령 | 내용 |
| --- | --- |
| `pnpm dev` | 개발 서버 (`http://localhost:4100`. 3000~3104는 다른 로컬 프로젝트가 써서 피한다) |
| `pnpm build` | 프로덕션 빌드(`prisma generate` 후 `next build`. Vercel이 빌드 캐시로 설치를 건너뛰면 `postinstall`이 돌지 않아서). 빌드 중에는 DB에 접속하지 않는다 |
| `pnpm lint` / `pnpm format` / `pnpm format:check` | ESLint / Prettier (`*.md`, `.claude/`는 포맷 제외) |
| `pnpm typecheck` | `next typegen` 후 `tsc --noEmit` |
| `pnpm test` | 단위 테스트 (Vitest `unit` 프로젝트, `src/**/*.test.ts`) |
| `pnpm test src/lib/db-url.test.ts -t "이름"` | 단일 파일·단일 테스트 실행 (`--`를 붙이면 `-t`가 무시된다) |
| `pnpm test:smoke` | 실제 외부 API를 부르는 스모크 테스트 (`*.smoke.test.ts`). CI에서는 돌리지 않는다 |
| `pnpm db:start` / `pnpm db:stop` | 로컬 Supabase(Docker, DB `127.0.0.1:54322`, Studio `:54323`) |
| `pnpm db:migrate` | `prisma migrate dev` (스키마 변경 → 마이그레이션 생성·적용). 생성 후 `prisma generate`로 클라이언트 갱신 |
| `pnpm db:cron` | pg_cron에 15분 수집·30일 정리 작업 등록 (`CRON_SECRET` 필요, `COLLECT_URL` 기본은 로컬 dev 서버) |

- 로컬에서는 `DATABASE_URL`·`DIRECT_URL`이 없으면 로컬 Supabase 기본 주소를 쓴다. 프로덕션은 `DATABASE_URL`이 없으면 오류를 낸다. 키 이름은 `.env.example`.
- 클라우드 DB(Supabase 시드니, Vercel 함수 `syd1`)에 대한 명령은 `.env.cloud`(`DIRECT_URL`=Session pooler 5432, `COLLECT_URL`=배포 주소)를 먼저 읽어 실행한다: `node --env-file=.env.cloud node_modules/prisma/build/index.js migrate deploy`, cron 등록은 `node --env-file=.env.cloud scripts/cron-sql.mjs | node --env-file=.env.cloud node_modules/prisma/build/index.js db execute --stdin`. `vercel env pull`은 `.env.local`을 덮어쓰므로 쓰지 않는다.
- Prisma 클라이언트는 `src/generated/prisma`에 생성되며(`postinstall`), 커밋하지 않는다.
- CI(`.github/workflows/ci.yml`): `format:check → lint → typecheck → test → build`.

## 아키텍처

데이터는 **외부 소스 → 수집 작업 → DB → 화면** 한 방향으로 흐른다. 화면은 DB만 읽고 외부 API를 부르지 않는다.

```
Arrowhead API, 커뮤니티 API(폴백), Steam, X
        │  15분마다 (Supabase Cron → POST /api/collect)
        ▼
Supabase Postgres  ← Prisma (src/lib/db.ts)
        │  'use cache' + cacheTag, 수집 후 revalidateTag (P4)
        ▼
Next.js 화면 (src/app)
```

| 위치 | 역할 |
| --- | --- |
| `prisma/schema.prisma`, `prisma/migrations/` | DB 스키마와 마이그레이션. 연결 설정은 `prisma.config.ts` |
| `src/lib/db.ts` | `getDb()` — Prisma 클라이언트(`@prisma/adapter-pg`)를 처음 호출할 때 만든다 |
| `src/lib/db-url.ts` | DB URL 선택(환경변수 → 로컬 기본값, 프로덕션은 필수) |
| `src/lib/collect/` | 수집: `run.ts`(소스별 격리 실행·`collection_run` 기록), `arrowhead.ts`·`steam.ts`(zod 검증·저장. Arrowhead가 실패하면 커뮤니티 API `/raw` 미러로 폴백, `COMMUNITY_API_CONTACT` 필요), `auth.ts`(Bearer 검증), `util.ts`(슬롯·전쟁 시간·fetch). 명세는 [SRS v3](docs/SRS-v3.md) |
| `src/app/api/collect/route.ts` | `POST /api/collect` — Bearer `CRON_SECRET` 검증 후 수집 1회 |
| `src/instrumentation.ts` | `SENTRY_DSN`이 있을 때만 서버 측 Sentry 초기화 (ADR 0005) |
| `scripts/cron-sql.mjs` | `pnpm db:cron`이 실행하는 Cron 등록 SQL 생성 |
| `src/app/api/health/route.ts` | `GET /api/health` — DB 응답과 마지막 수집 시각. `connection()`으로 요청 시점에만 실행 |
| `supabase/config.toml` | 로컬 Supabase 설정 |

## UI·디자인 시스템

화면은 **Tactical HUD** 디자인 시스템을 따른다. UI 작업 전에 [docs/design-system/README.md](docs/design-system/README.md)를 읽는다.

- 토큰과 컴포넌트 클래스(`.hd-*`)는 `src/styles/hud.css` 하나가 출처다. 색·글꼴을 하드코딩하지 않고 토큰(Tailwind 유틸리티 `bg-panel`, `text-subtle`, `text-accent` 등 또는 `var(--color-*)`)을 쓴다.
- 다크 테마 하나, 직각 모서리, 강조색은 `accent`(노랑) 하나. 세력 색은 세력 표시에만, `info`는 방어전에만.
- 해방 상태는 패널이 아니라 지도 행성의 툴팁으로 보여준다(해방 툴팁 / 방어 툴팁 두 종류). 구성은 README의 툴팁 절을 따른다.
- 확정 시안 원본은 `docs/design-system/reference/dashboard.dc.html` (참고용, 그대로 실행하지 않음).

## 응답·문서 언어

- Claude 응답, 문서(`docs/`), 커밋 메시지는 한국어로 쓴다.
- 코드 식별자와 코드 주석은 영어로 쓴다.

## 커밋 컨벤션

Conventional Commits 형식에 한국어 subject를 쓴다.

```
<type>(<scope>): <한국어 요약, 50자 이내, 마침표 없음>

<필요하면 본문: 무엇을, 왜>
```

- type: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`
- scope(선택): `harness`, `research`, `infra`, `api`, `ui`, `db` 등
- 예: `chore(harness): SessionStart 체크리스트 알림 훅 추가`, `docs(research): Steam 뉴스 API 조사 결과 정리`
- 작업을 마치고 보고하기 전에 요청이 없어도 커밋까지 한다 (검사 통과 후, 작업 브랜치에서, 이번 작업에서 바꾼 파일만).
- 푸시, PR 생성, 병합은 사용자가 요청할 때만 한다.

## 문서 규칙

| 위치 | 내용 |
| --- | --- |
| `docs/SRS.md` | 요구사항 명세. §9 상태표는 `srs-sync`가 갱신 |
| `docs/SRS-v2.md` | 대시보드 기능 명세 (F-xx 기능, D-xx 수집, Q-xx 비기능) |
| `docs/SRS-v3.md` | P3 데이터 수집 상세 명세 (D-01~D-12, 스키마, 실행 순서) |
| `docs/SRS-v4.md` | P4 화면 구현 설계 (모듈 구조, 캐시 태그, 지도, PR 순서) |
| `docs/CHECKLIST.md` | 단계별 체크리스트. `- [ ]` / `- [x]` |
| `docs/research/*.md` | P1 조사 결과. 소스마다 SRS §5의 표준 표를 채운다 |
| `docs/adr/NNNN-<slug>.md` | 결정 기록. `0000-template.md` 형식을 따른다 |
| `docs/archive/` | 비활성화한 에이전트 등 보관물 |
| `docs/design-system/` | UI 디자인 시스템 명세와 시안 원본 |

## 데이터 수집 규칙

- 외부 API·사이트는 **서버 측**(Route Handler, Server Component, 스케줄 작업)에서만 호출하고 캐시를 거친다. 클라이언트에서 직접 호출하지 않는다.
- 요청에는 식별 가능한 `User-Agent`를 넣고, 소스가 요구하는 식별 헤더(예: 커뮤니티 API의 `X-Super-Client`, `X-Super-Contact`)를 지킨다.
- 각 소스의 레이트리밋을 넘지 않게 호출 주기를 정한다. 조사 중 반복 호출도 최소화한다.
- 비공식 크롤링은 조사는 하되, 약관·차단 리스크를 문서화하고 ADR로 채택을 결정하기 전에는 구현하지 않는다.
- API 키·DB URL 등 비밀정보는 커밋하지 않는다. Vercel 환경변수로만 관리하고, 필요한 키 이름은 `.env.example`에 적는다.

## 하네스 구성

| 구성 | 위치 | 비고 |
| --- | --- | --- |
| Skill | `.claude/skills/srs-sync/` | 체크리스트·SRS 상태표·ADR 갱신 |
| Subagents | `.claude/agents/` | `infra-researcher`, `code-reviewer` (`source-researcher`는 P1 후 `docs/archive/agents/`로 보관) |
| Hooks | `.claude/settings.json`, `.claude/hooks/*.mjs` | 인코딩 검사, 포맷·린트, 턴 종료 빌드, 세션 시작 체크리스트 알림 |
| MCP | `.mcp.json` (Playwright) + 사용자 플러그인/커넥터 (context7, Vercel) | 플러그인으로 있는 서버는 `.mcp.json`에 중복 등록하지 않는다 |
| GitHub | `gh` CLI | 이슈·PR·Actions 확인은 `gh`로 한다. GitHub MCP 플러그인은 쓰지 않는다 |

- 포맷·린트 훅과 빌드 훅은 `node_modules`가 없으면 아무 일도 하지 않는다 (P2부터 동작).
- `.env` 계열 파일은 `permissions.deny`로 Read/Edit가 막혀 있다. 우회해서 읽지 않는다.

## 환경 메모

- Windows에서 개발한다. 저장소는 LF 줄바꿈, UTF-8(BOM 없음)을 쓴다 (`.gitattributes`, `.editorconfig`). CRLF나 BOM이 섞이면 인코딩 훅이 경고한다.
- 훅 스크립트는 셸 차이를 피하려고 Node(`.mjs`)로 작성한다.
