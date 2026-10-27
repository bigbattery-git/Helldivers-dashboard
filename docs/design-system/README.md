# Tactical HUD 디자인 시스템

헬다이버즈2 대시보드 UI의 기준. 함선 지휘 화면처럼 읽히는 어두운 전술 HUD — 각진 패널, 1px 선, 모노스페이스 라벨, 슈퍼 어스 노랑 하나의 강조색.

| 파일 | 내용 |
| --- | --- |
| `src/styles/hud.css` | 토큰(Tailwind v4 `@theme`) + 컴포넌트 클래스(`.hd-*`). 값의 단일 출처 |
| `docs/design-system/README.md` | 이 문서. 원칙·용도·컴포넌트 구성 규칙 |
| `docs/design-system/reference/dashboard.dc.html` | 확정 시안 원본(레이아웃·툴팁 동작 참고용, 템플릿 문법 포함 — 그대로 실행하지 않음) |

원본 시안과 디자인 시스템 페이지(Claude 아티팩트, 비공개):

- 시안 캔버스: https://claude.ai/artifact/8fAYzVDdhDHYwfVPi57jBP (`01 Tactical HUD` 보드)
- 디자인 시스템: https://claude.ai/artifact/NaSCH2otzWR7KoNUc2yC7W

## 연결 방법

1. `src/app/globals.css`에서 `@import "tailwindcss";` 바로 아래에 `@import "../styles/hud.css";`를 넣고, 기본 템플릿의 `--background`/`--foreground`·`prefers-color-scheme` 블록과 `body` 규칙은 지운다. `body`는 `bg-base text-body font-sans`.
2. `src/app/layout.tsx`에서 `next/font/google`로 세 글꼴을 불러와 아래 CSS 변수 이름으로 `<html>`에 붙인다. `lang="ko"`.
   - Rajdhani (500·600·700) → `--font-rajdhani`
   - JetBrains Mono (400·600) → `--font-jetbrains-mono`
   - Noto Sans KR (400·500·700) → `--font-noto-sans-kr`
   - `hud.css`는 이 변수가 없으면 글꼴 이름으로 대체한다. API는 Next.js 16 문서(`node_modules/next/dist/docs/`)를 확인하고 쓴다.
3. 다크 테마 하나만 쓴다. 라이트 모드 분기는 만들지 않는다.

## 원칙

- **강조색은 하나.** `accent`(노랑)는 주요 명령, 핵심 KPI 하나, 방어 툴팁 테두리, 선택된 행성 링, 슈퍼 어스에만.
- **색은 의미.** 세력 색은 그 세력의 행성·미션·적 변종에만, `info`는 방어전에만, `info-soft`는 환경 효과에만. 장식용 색은 없다.
- **각진 형태.** 모서리는 전부 직각. 둥근 것은 지도의 행성 점과 범례 점뿐.
- **선으로 구분, 그림자는 툴팁만.** 패널은 `bg-panel` + `border-line`. `shadow-tooltip`은 지도 위 툴팁에만.
- **값 하드코딩 금지.** 색·글꼴은 `hud.css`의 토큰(Tailwind 유틸리티 또는 `var(--color-*)`)으로만.

## 토큰

Tailwind 유틸리티 이름 기준 (`bg-*`, `text-*`, `border-*` 모두 같은 이름).

| 역할 | 토큰 | 값 |
| --- | --- | --- |
| 페이지 / 패널 안쪽 행 | `base` | #070B12 |
| 패널·타일·툴팁 | `panel` | #0D1520 |
| 지도 우물·이미지 칸 | `sunken` | #05080E |
| 선·막대 트랙 | `line` | #1E2C3D |
| 글자 (강→약) | `strong` / `body` / `muted` / `subtle` | #F2F6FA / #DCE6F0 / #B7C4D3 / #8A9BB0 |
| 강조 | `accent` | #FFD23F |
| 방어 / 배지 글자 | `info` / `on-info` | #4FD1E8 / #05080E |
| 환경 효과 | `info-soft` | #9BE6F3 |
| 세력 | `terminid` / `automaton` / `illuminate` | #F5B76A / #FF6B6B / #B5A6FF |
| 결과 | `success` / `danger` | #5BD68A / #FF6B6B |

- 글꼴: `font-display`(Rajdhani — 제목·큰 숫자·행성 이름), `font-mono`(JetBrains Mono — 라벨·수치·타이머·지도 라벨), `font-sans`(Noto Sans KR — 한국어 본문, 두 글꼴의 한글 대체).
- 글자 크기: 페이지 제목 36 / KPI 28 / 주요 명령 제목 26 / 툴팁 행성명 22 / 패널 제목 20(자간 2px) / 본문 14 / 보조 12 / 라벨 11(최소). 10px 모노는 툴팁 안 보조 표기에만.
- 간격: 패널 안쪽 여백과 패널 사이 간격 20px, 패널 안 항목 간격 16px, 페이지 패딩 32px / 24px, 콘텐츠 최대 너비 1392px.
- `danger`는 `automaton`과 같은 값이다. 결과는 항상 글자("위험 · 속도 부족")와 함께 쓴다. 세력도 색만으로 구분하지 말고 이름·범례를 함께 둔다.

## 문구

- UI 본문은 한국어. 영어 대문자 모노 라벨(eyebrow)은 헤더·섹션 위에만: `MAJOR ORDER`, `ACTIVE DIVERS`, `DEFENSE`.
- 행성 이름은 **공식 한국어**(`planet.name_ko`, 예: 말레벨론 크릭)로 쓰고, 옆의 "(원문)"을 누르면 영어 원문(`Malevelon Creek`)이 펼쳐진다(`<details>`/`<summary>` 같은 접기). 지도 라벨은 한국어만. 한국어 이름이 없으면 영어만 쓴다. (2026-10-27 변경, 이전 규칙은 영어 원문)
- 세력·게임 용어는 **Arrowhead 공식 한국어 번역 표기**를 따른다(예: 슈퍼지구). 공식 번역 안에서 표기가 섞이면 가장 자주 쓰는 것을 고르고, 표는 코드 한 곳(`src/lib/hd/`)에 둔다. 기계 번역 용어표도 같은 표를 쓴다(ADR 0006).
- 형식: 진행도 `62%`, 속도 `+2.4%/h`, 카운트다운 `18:42:07`, 날짜 `10.24`, 인원 `84,210`. 숫자는 `tabular-nums`.
- 데이터가 없으면 지어내지 않고 `[버전]`처럼 자리표시자나 빈 상태로 둔다.

## 화면 구성

헤더(제목 + KPI 타일 3–4개) → [은하계 지도 `flex: 2 1 640px` | 주요 명령 `flex: 1 1 320px`] → [진행 중인 미션 | 업데이트 내역 `flex: 1 1 400px`]. 행은 `flex-wrap`으로 좁은 화면에서 한 열로 쌓인다.

해방 상태는 별도 패널로 두지 않는다. 지도 위 행성에 호버하거나 Tab으로 포커스하면 툴팁으로 보여준다.

## 컴포넌트

세력 색은 요소에 `style={{ "--faction": "var(--color-automaton)" }}`, 막대 색은 `--fill`, 행성 요소 색은 `--hz`로 넘긴다.

| 컴포넌트 | 클래스 | 규칙 |
| --- | --- | --- |
| Panel | `.hd-panel`, `--accent`, `__title`, `.hd-eyebrow` | `--accent`는 주요 명령 하나에만 |
| StatTile | `.hd-stat`, `__label`, `__value(--accent/--info)` | 영어 라벨 + 큰 숫자, 최소 140px |
| ProgressBar | `.hd-bar(--thick)`, `__fill` | 6px 기본, 주요 명령·방어/공세는 10px. 위에 `.hd-row`로 라벨과 % |
| Row | `.hd-row`, `__value(--strong)` | 툴팁·패널의 라벨/값 한 줄 |
| PlanetMarker | `.hd-marker(--major)`, `__glow`, `__dot`, `__def`, `__ring`, `__label` | 아래 참고 |
| HazardChip | `.hd-hazards`, `.hd-section-label`, `.hd-hazard`, `__name`, `__kind`, `__desc` | 환경 `--hz` 없음(info-soft), 적 변종 `--hz: var(--faction)` |
| LiberationTooltip | `.hd-tip` + `__top/__title/__faction/__meta/__divider` | 아래 참고 |
| DefenseTooltip | `.hd-tip.hd-tip--defense` + `__head/__banner/__body/__name-row/__kind/__desc/__foot`, `.hd-level`, `.hd-timer`, `.hd-outlook--good/--bad` | 아래 참고 |
| MissionRow | `.hd-mission`, `__title`, `__planet`, `__meta` | 왼쪽 3px 세력 색, 메타 `LV 7 · 12분` |
| UpdateItem | `.hd-update`, `__date`, `__title`, `__desc` | 최신순, 날짜는 info |

### 지도와 PlanetMarker

- 지도는 `bg-sunken` 우물(가로세로비 640:380)에 흰색 12% 타원 궤도 세 겹, 중앙에 accent 점으로 슈퍼 어스. 궤도는 장식 SVG(`aria-hidden`).
- 행성은 지도 기준 % 좌표에 `absolute; translate(-50%, -50%)`로 놓는 44px `<button>`. 주요 명령 행성은 `--major`.
- 방어 중이면 `__def`(info 점선 고리), 호버·포커스 중이면 `__ring`(accent 고리).
- `aria-label`: "Malevelon Creek 해방도 62%" / "Ubanea 방어전, 방어 진행도 34%". `mouseenter`·`focus`로 열고 `mouseleave`·`blur`로 닫는다.
- 지도에는 행성 이름만(`__label`, 점에서 16px). 수치는 툴팁에.

### 툴팁 공통

- `role="tooltip"`, 지도 컨테이너 안에 `absolute`. 행성 옆 28px에 띄우고, x가 60%를 넘는 행성은 왼쪽으로 뒤집는다(라벨도 같은 방향 반대편).
- 해방 툴팁은 행성 높이 기준(위쪽 행성은 아래로, 아래쪽 행성은 위로 치우침), 방어 툴팁은 키가 커서 지도 세로 중앙(`top: 50%; translateY(-50%)`)에 맞춘다.

### LiberationTooltip (해방 중, 240px, 세력 색 테두리)

이름 + 세력 → 섹터 · 상태 → 해방도 막대(세력 색) → 투입 인원 → 시간당 변화 → 구분선 → 행성 요소.

### DefenseTooltip (방어 중, 300px, accent 테두리)

1. 머리띠: 육각 아이콘 + 세력(세력 색) · 섹터
2. 행성 이미지 칸 84px (없으면 `bg-sunken` 빈 칸)
3. 방패 아이콘(info) + "방어"(info) + 행성 이름(accent) + 침공 레벨 배지(`.hd-level`, 세력 색 테두리)
4. 한 줄 설명
5. 남은 시간 `HH:MM:SS`
6. **방어 진행 상황** — info 굵은 막대, 시간당 속도 + %
7. **적의 공세 상황** — 세력 색 굵은 막대, 시간당 속도 + %
8. 행성 요소
9. 공격 출발지, 투입 인원
10. 바닥: 예상 결과 (`--good` success / `--bad` danger, 항상 글자로)

침공 레벨은 방어 툴팁에만 있다.

### 행성 요소 종류

- 환경(info-soft): 짙은 안개, 이온 폭풍, 극한의 추위, 극심한 열기, 화염 토네이도, 유성우 등
- 적 변종(세력 색): 스포어 버스트 변종, 소각 군단, 제트 여단 등
- 설명은 한 문장, 효과만. 정확한 수치는 데이터 소스에 있을 때만.

## 아이콘·접근성

- 아이콘은 인라인 SVG 선 아이콘(`fill="none"`, `stroke="currentColor"`, 1.5–2px). 육각형(세력), 방패(방어), 경고 삼각형(긴급). 이모지 금지. 장식은 `aria-hidden="true"`.
- 터치 영역 44px, 포커스는 accent 1px 외곽선. 글자 대비는 `bg-panel` 위 4.5:1 이상(토큰 조합은 모두 통과).
