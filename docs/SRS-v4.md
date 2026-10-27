# 헬다이버즈2 대시보드 — SRS v4 (P4 화면 구현 설계)

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v4.0 초안 (2026-10-27) |
| 상태 | 초안 (사용자 검토 전) |
| 범위 | P4 화면 구현의 구조·데이터 읽기·모듈 경계·PR 순서 |
| 입력 | [SRS v2](SRS-v2.md) §3·§4, [CHECKLIST](CHECKLIST.md) P4, [디자인 시스템](design-system/README.md), [ADR 0002](adr/0002-news-and-stats-sources.md)·[0006](adr/0006-machine-translation.md), `docs/research/game-api.md` "해석 표 검증" |

## 1. 원칙

- 화면은 DB만 읽는다(SRS v1 N-01). 외부 API는 수집 작업에서만 부른다.
- **빌드는 DB에 접속하지 않는다**(CLAUDE.md). DB를 읽는 부분은 요청 시점에만 실행되게 한다(§3).
- 서버 컴포넌트가 기본이다. 클라이언트 컴포넌트는 상호작용·현재 시각이 필요한 곳(지도 툴팁, 카운트다운, 지연 배지)에만 쓴다.
- 새 의존성은 넣지 않는 것이 기본이다. 그래프는 서버에서 그리는 인라인 SVG로 한다(§6).

## 2. 모듈 구조

| 위치 | 역할 | 테스트 |
| --- | --- | --- |
| `src/lib/data/*.ts` | DB 읽기 함수. `'use cache'` + `cacheLife` + `cacheTag` (§3) | 집계 쿼리만 단위 테스트(F-04-5) |
| `src/lib/hd/tasks.ts` | MO 태스크·보상 해석(type·valueTypes → 한국어 문구, 진행률). 표는 `helldivers-2/json`(MIT)을 옮겨 둔다 | O (현재 MO 원본을 고정값으로) |
| `src/lib/hd/markup.ts` | 디스패치 `<i=N>` → React 요소(강조 등급) | O |
| `src/lib/hd/terms.ts` | 공식 번역 용어표(세력·게임 용어). 화면 문구와 기계 번역 프롬프트가 같이 쓴다 | O |
| `src/lib/hd/effects.ts` | 행성 효과 id → 한국어 이름·설명·종류(환경/적 변종/전역). 모르는 id는 `undefined` | O |
| `src/lib/hd/liberation.ts` | 해방률 `1 − health/maxHealth`, 방어 진행률, 1시간 추세(4슬롯 차분) | O |
| `src/lib/hd/format.ts` | KST 시각, 상대 시간("3시간 12분"), `HH:MM:SS`, 숫자 `84,210` | O |
| `src/lib/hd/map.ts` | 행성 좌표(−1~1) → 지도 % 좌표, 툴팁 방향(x > 60%면 왼쪽) | O |
| `src/components/hud/*` | 디자인 시스템 컴포넌트(Panel, StatTile, ProgressBar, Row, PlanetMarker, 두 툴팁, FrontRow, UpdateItem) | — |
| `src/app/(dashboard)/…` | 화면: `/`, `/planets/[index]`, `/news`, `/stats` | 브라우저 확인 |

`src/lib/collect/`와 `src/lib/hd/`는 서로 독립이다. 수집 쪽이 재사용하는 것은 `hasHangul` 정도다.

## 3. 데이터 읽기와 캐시 (D-07, Q-02)

Next.js 16 Cache Components(`cacheComponents: true`) 기준이다. 문서: `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`.

```ts
// src/lib/data/war.ts (모양만)
export async function getWarOverview() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
  cacheTag("war");
  return /* planet + 최신 planet_snapshot + 활성 campaign·planet_event·planet_effect */;
}
```

| 태그 | 함수 | 쓰는 화면 |
| --- | --- | --- |
| `war` | `getWarOverview()`, `getPlanetDetail(index)`, `getPlanetSeries(index, range)` | 홈, 행성 상세 |
| `assignment` | `getAssignments()` (해석된 태스크 + 최신 진행 값) | 홈 |
| `news` | `getNews({ limit, kind })` | 홈, 뉴스 |
| `stats` | `getPlayerSeries(range)` (시간 버킷 집계) | 홈, 통계 |
| `collection` | `getLastCollection()` (마지막 성공 시각, 소스별 상태) | 공통 헤더 |

- `POST /api/collect`가 `runCollection` 뒤에 위 태그를 `revalidateTag(tag, "max")`로 무효화한다(Route Handler에서 호출 가능). 15분 `revalidate`는 무효화가 빠졌을 때를 위한 안전망이다.
- **데이터는 정적 껍데기(ISR)에 넣는다** (2026-10-27 정정). 서버리스에서는 `'use cache'`의 런타임 메모리 캐시가 요청 사이에 남지 않는다(`01-app/03-api-reference/01-directives/use-cache.md` "Serverless" 행). 그래서 `connection()`으로 요청 시점에 미루면 방문마다 함수 호출과 DB 조회가 생긴다(Q-01·Q-05에 불리). 대신 데이터 함수를 프리렌더 결과에 넣고, 수집이 `revalidateTag`로 껍데기를 다시 만들게 한다.
- **빌드 중 DB 접속을 막는 방법**: 데이터 함수는 빌드 단계(`process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD`)에서 DB를 읽지 않고 빈 값을 돌려준다. 배포 직후 껍데기는 빈 상태이고, 다음 수집(최대 15분)의 `revalidateTag`나 15분 `revalidate`가 채운다. 기반 PR에서 DB를 끈 `pnpm build`와 로컬 `pnpm start`로 확인하고, Vercel에서의 동작은 배포 PR에서 다시 확인한다.
- 대안(필요해지면): 은하 상황을 15분보다 자주 보여 줘야 하면 TanStack Query로 클라이언트가 우리 API(DB만 읽음)를 폴링하는 방식을 검토한다 (사용자 의견 2026-10-27).
- `/planets/[index]`: Cache Components에서는 `generateStaticParams`가 값을 하나 이상 돌려줘야 한다. DB 없이 줄 수 있는 `{ index: "0" }`(슈퍼지구)만 돌려주고 나머지는 첫 요청 때 만든다. 없는 index는 `notFound()`.
- **현재 시각이 필요한 표시는 클라이언트에서 계산한다.** 캐시된 HTML은 만든 시각에 멈춰 있기 때문이다. 카운트다운(MO 만료, 방어 남은 시간)과 "데이터 지연" 배지(마지막 수집 후 30분, F-05-1)는 서버가 시각(ISO)만 넘기고 클라이언트 컴포넌트가 1초 또는 1분마다 다시 그린다.

## 4. 홈 화면 구성

디자인 시스템 README "화면 구성"을 따른다. 데이터 매핑:

| 영역 | 내용 | 데이터 |
| --- | --- | --- |
| 헤더 KPI | ACTIVE DIVERS(행성 플레이어 합), PLANETS LIBERATED(인류 소유 수 / 전체), STEAM PLAYERS, LAST UPDATE | `war`, `stats`, `collection` |
| 은하 지도 | 활성 캠페인 행성 + 슈퍼지구 마커, MO 대상 `--major`, 방어 중 `__def`. 툴팁은 §5 | `war`, `assignment`(대상 행성) |
| 주요 명령 | 제목·브리핑(마크업), 태스크별 막대·문구, 카운트다운, 보상, 자동 번역 표시 | `assignment` |
| 활성 전선 (시안의 "진행 중인 미션") | MO 대상 먼저 → 플레이어 수 순. 행: 행성명 / 섹터 · 세력 / `62% · 84,210명`. 정렬 전환(해방률·진영)은 링크(`?sort=`)로 | `war` |
| 진영별 요약 | 세력마다 활성 전선 수·투입 인원 | `war` |
| 업데이트 내역 | 최신 뉴스 5건(디스패치·패치·공지·X), 날짜는 KST `10.24` | `news` |
| 동접자 미니 그래프 | 24시간 Steam 동접자 스파크라인 | `stats` |

`?sort=`는 `searchParams`라 요청 시점 값이다. 정렬 전환을 클라이언트 상태로 할지 `searchParams`로 할지는 구현 때 정한다(어느 쪽이든 데이터 함수는 같다).

## 5. 지도·툴팁

- 좌표: `planet.position_x/y`는 −0.93~0.94 범위이고 슈퍼지구가 (0, 0)이다(2026-10-27 실측). `left = (x + 1) / 2 × 100%`, `top = (1 − y) / 2 × 100%`(y축 뒤집기 — 첫 구현에서 게임 지도와 방향 대조). 지도 우물은 640:380이라 가로세로를 따로 늘린다(시안의 타원 궤도와 같다).
- 마커는 전 행성(273개)이 아니라 **활성 캠페인 행성 + 슈퍼지구**만 그린다. 273개 44px 버튼은 겹치고 탭 순서가 너무 길다. 전체 행성 점은 필요하면 장식 SVG(`aria-hidden`)로만 그린다.
- 열기: `mouseenter`·`focus`, 닫기: `mouseleave`·`blur`·Esc. 터치는 탭으로 열고 다른 곳을 탭하면 닫는다. 모바일 폭에서는 툴팁을 지도 아래에 고정해서 펼친다(구현 때 확인).
- 해방 툴팁: 이름 + 세력 → 섹터 · 상태 → 해방도 막대 → 투입 인원 → 시간당 변화(F-01-5) → 행성 요소(`effects.ts`에 있는 것만).
- 방어 툴팁: README 10단계 중 데이터가 있는 것만. **침공 레벨, 행성 이미지, 공격 출발지는 지금 수집하지 않는다** → 이미지 칸은 빈 `bg-sunken`, 나머지 줄은 생략. 적의 공세 진행률은 `planet_event` 시작·종료 시각으로 시간 경과율을 보여 줄 수 있다(정확한 의미는 구현 때 확인). 예상 결과(`--good/--bad`)는 방어 진행 속도와 남은 시간으로 계산한다(F-01-6과 같은 외삽, S 우선순위라 마지막에).

## 6. 그래프 (F-04)

- 서버 컴포넌트에서 인라인 SVG 선 그래프·스파크라인을 그린다. 새 차트 라이브러리를 넣지 않는다. 축 눈금은 몇 개만, 호버 툴팁은 넣지 않는다(필요해지면 그때 클라이언트 컴포넌트).
- 집계: 24시간 = 15분 슬롯 그대로(96점), 7일 = 1시간 버킷(168점), 30일 = 1시간 버킷(720점, F-04-5). SQL `date_bin('1 hour', slot, ...)` + `avg`.
- 접근성(Q-03): SVG에 `role="img"`와 요약 `aria-label`("최근 24시간 Steam 동접자 최저 48,730 최고 61,200"), 아래에 접을 수 있는 수치 표.

## 7. 수집 쪽 변경 (P4 안에서)

| 변경 | 위치 | 비고 |
| --- | --- | --- |
| `revalidateTag` 호출 | `src/app/api/collect/route.ts` | 수집 성공·실패와 관계없이 끝나면 호출 |
| X 수집 | `src/lib/collect/x.ts` (새 파일) | 사용자 ID `1654403648598802436` 고정, `since_id` = 마지막 저장 글 ID, `news_item.source = "x"`, 삭제 반영(ADR 0002, 개발자 정책). 키가 없으면 `skipped` |
| 기계 번역 | `src/lib/collect/translate.ts` (새 파일) | ADR 0006. 마크업 태그 비교 실패 시 버리고 재시도. 모델 ID 환경변수 `GEMINI_MODEL` |
| 커뮤니티 API 폴백 | `src/lib/collect/fallback.ts` (새 파일) | D-03, F-05-2. Arrowhead 소스가 실패한 항목만 `api.helldivers2.dev`로 받고 `collection_run`에 폴백 여부를 남긴다. 영어로만 오므로 화면에 "영어 원문"·출처 |
| 스키마 | `prisma/schema.prisma` | `assignment.title_ko`·`briefing_ko`, `*.ko_source`(`official`/`machine`) |

## 8. PR 순서

| PR | 내용 | 끝났다는 기준 |
| --- | --- | --- |
| A 기반 | 디자인 시스템 연결, `src/lib/hd/*` + 테스트, `src/lib/data/*`, `revalidateTag`, 공통 레이아웃(헤더 상태·푸터) | DB를 끈 상태에서 `pnpm build` 통과, 단위 테스트 통과 |
| B 홈 | KPI, 지도·툴팁, MO, 활성 전선, 진영 요약, 업데이트 내역, 미니 그래프 | 360px·1440px 브라우저 확인, 키보드로 툴팁 열기 |
| C 하위 화면 | `/planets/[index]`, `/news`, `/stats` | 없는 행성 404, 범위 전환, 그래프 대체 텍스트 |
| D 수집 확장 | X 수집, 기계 번역, 스키마 | 영어 디스패치 1건이 "자동 번역"으로 보이고, 공식 번역이 오면 바뀐다 |
| E 배포 | Vercel 연결, 클라우드 DB·Cron, Preview | P4 완료 기준(CHECKLIST) |

D는 A 뒤라면 B·C와 따로 진행할 수 있다(수집 코드만 건드린다).

## 9. 결정 (2026-10-27)

| 질문 | 결정 | 반영 위치 |
| --- | --- | --- |
| 행성 이름 표기 | 공식 한국어(`planet.name_ko`)로 보여 주고, "(원문)"을 누르면 영어 원문이 펼쳐진다. 지도 라벨은 한국어만. 공식 한국어 디스패치가 행성 이름을 한국어로 쓰기 때문이다 | 디자인 시스템 README "문구", CHECKLIST P4 기반 |
| 용어 표기 | Arrowhead 공식 한국어 번역 표기(예: 슈퍼지구). 공식 번역 안에서 표기가 섞이면("일루미닛", "Terminid 전선") 가장 자주 쓰는 것을 고른다. 화면 문구와 기계 번역 용어표가 같은 표를 쓴다 | README "문구", ADR 0006, CHECKLIST P4 기반 |
| X 글 번역 | 번역한다. 공식 번역이 따로 오지 않으므로 기계 번역이 최종이고 "자동 번역" 표시와 원문 링크를 둔다 | ADR 0006, CHECKLIST P4 기계 번역 |

§4·§5에 남은 "영어 행성 이름" 예시는 구현 때 위 결정을 따른다.

### 홈을 시안에 맞추기 (PR B2, 2026-10-27)

B1은 데이터 출력 확인 단계였다. B2에서 확정 시안(`docs/design-system/reference/dashboard.dc.html`) 배치로 맞춘다. §4 표의 배치는 아래가 우선한다.

| 질문 | 결정 |
| --- | --- |
| 지도 마커 | 활성 전선은 모두 점으로 찍는다. 이름 라벨은 주요 명령 대상, 방어 중, 인원 상위 5곳에만 붙이고, 나머지 이름은 툴팁에서 본다 |
| 태스크가 여럿인 주요 명령 | 시안의 "진행도" 한 줄 자리에 태스크별 라벨과 막대를 둔다 |
| 전선 목록 | 시안처럼 단순한 행 6개 + "전체 N곳" 펼치기. 정렬은 제목 옆 작은 선택 상자, 진영 요약(F-01-4)은 지도 범례로 옮긴다 |
| 출처·비공식 고지(F-05-4) | 별도 사이트 헤더와 푸터 블록을 없애고, 맨 아래 한 줄로 둔다 |
| KPI | ACTIVE DIVERS · PLANETS LIBERATED · STEAM PLAYERS(+24시간 스파크라인) · LAST UPDATE(+지연 배지). README "KPI 타일 3–4개" 안 |
| 하위 화면 (PR C) | 진입은 홈 패널에서(업데이트 "전체 보기", STEAM PLAYERS 타일, 전선 행). 머리는 ← 대시보드 + LAST UPDATE. 통계(`/stats`)는 은하 전체 기준이고 행성별 추이는 행성 상세에. 행성 상세는 툴팁 확장판 + 그래프 하나([해방률 \| 투입 인원] 전환). 뉴스는 필터 + 펼치면 본문 전체 |
| 주요 명령 대상 표시 (PR C) | 태스크가 행성을 직접 가리킬 때만, 지도 마커에 강조색 ▲(`.hd-marker__mo`) |
| 행성 상세의 URL 처리 (PR C) | `export const instant = false`로 이동 시 기다림을 허용하고 `params`를 맨 위에서 읽는다. Suspense로 감싸면 없는 행성이 200 상태의 "찾을 수 없음"이 되기 때문 |
| 방어 툴팁의 데이터 없는 칸 | 행성 이미지는 빈 `bg-sunken`, 침공 레벨·공격 출발지는 생략. 적의 공세는 이벤트 경과 시간 비율, 예상 결과는 남은 시간 안에 필요한 속도와 현재 시간당 속도를 비교 |
