# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 주는 안내서다.

## 프로젝트 개요

헬다이버즈2 대시보드: 은하 전쟁 현황, 주요 명령(MO), 뉴스/패치노트, 통계/추이 그래프를 한 화면에 모아 보여주는 웹 서비스. 커뮤니티 공유용이자 개인 포트폴리오이며 Vercel(Hobby 티어)에 배포한다.

- 언어·프레임워크: TypeScript, Next.js (App Router), Node.js 런타임
- 패키지 매니저: pnpm
- DB·ORM·스케줄러: P1 자료조사에서 결정 (`docs/adr/` 참조)

## 현재 단계

작업은 **P0 하네스 구축 → P1 자료조사 → P2 환경 구축** 순서로 진행한다. 이전 단계의 완료 기준을 만족해야 다음 단계로 넘어간다.

- 진행 상황과 현재 단계: [docs/CHECKLIST.md](docs/CHECKLIST.md) (`현재 단계:` 줄이 기준)
- 요구사항: [docs/SRS.md](docs/SRS.md) — 체크리스트 항목의 ID(H-xx, R-xx, E-xx)는 SRS 요구사항 ID다
- 작업을 마치면 `srs-sync` 스킬로 체크리스트·상태표·ADR을 갱신한다

## 명령어

P2 환경 구축 후 채운다 (dev, build, lint, typecheck, test, 단일 테스트 실행).

## 아키텍처

P2 이후 채운다 (데이터 소스 → 수집 → DB → 화면으로 흐르는 경로, 핵심 모듈).

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
- 사용자가 요청할 때만 커밋한다.

## 문서 규칙

| 위치 | 내용 |
| --- | --- |
| `docs/SRS.md` | 요구사항 명세. §9 상태표는 `srs-sync`가 갱신 |
| `docs/CHECKLIST.md` | 단계별 체크리스트. `- [ ]` / `- [x]` |
| `docs/research/*.md` | P1 조사 결과. 소스마다 SRS §5의 표준 표를 채운다 |
| `docs/adr/NNNN-<slug>.md` | 결정 기록. `0000-template.md` 형식을 따른다 |
| `docs/archive/` | 비활성화한 에이전트 등 보관물 |

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
| Subagents | `.claude/agents/` | `source-researcher`(P1 임시), `infra-researcher`, `code-reviewer` |
| Hooks | `.claude/settings.json`, `.claude/hooks/*.mjs` | 인코딩 검사, 포맷·린트, 턴 종료 빌드, 세션 시작 체크리스트 알림 |
| MCP | `.mcp.json` (Playwright) + 사용자 플러그인/커넥터 (context7, Vercel, GitHub) | 플러그인으로 있는 서버는 `.mcp.json`에 중복 등록하지 않는다 |

- 포맷·린트 훅과 빌드 훅은 `node_modules`가 없으면 아무 일도 하지 않는다 (P2부터 동작).
- `.env` 계열 파일은 `permissions.deny`로 Read/Edit가 막혀 있다. 우회해서 읽지 않는다.

## 환경 메모

- Windows에서 개발한다. 저장소는 LF 줄바꿈, UTF-8(BOM 없음)을 쓴다 (`.gitattributes`, `.editorconfig`). CRLF나 BOM이 섞이면 인코딩 훅이 경고한다.
- 훅 스크립트는 셸 차이를 피하려고 Node(`.mjs`)로 작성한다.
