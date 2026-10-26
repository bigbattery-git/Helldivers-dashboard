# R-01 게임 데이터 API 조사

- 조사일: 2026-10-26
- 담당: `source-researcher` (P1 임시)
- 범위: 핵심 기능 1(은하 전쟁 현황), 2(MO), 4(통계/추이), 게임 내 디스패치(기능 3 일부). Steam 뉴스·동접자·SNS는 R-02(`news-sources.md`)에서 다룬다.
- 호출 원칙: 엔드포인트당 1~2회, `User-Agent: helldivers-dashboard-research (contact: GitHub Bigbattery)`. 커뮤니티 API에는 `X-Super-Client: helldivers-dashboard`, `X-Super-Contact: GitHub Bigbattery`를 함께 보냈다.
- 표기: **확인** = 이번 조사에서 직접 호출·코드로 확인, **추정** = 문서·정황상 판단(검증 필요).

## 요약

| 소스 | 커버 기능 | 한국어 | 15분 주기 | 판단 |
| --- | --- | --- | --- | --- |
| A. Arrowhead 공개 엔드포인트 | 1, 2, 3(디스패치), 4 | 디스패치·MO 설명 **있음**, 행성명 없음 | 여유 (문서상 한도 없음) | 채택 후보 (주, 한국어 텍스트용) |
| B. 커뮤니티 API `api.helldivers2.dev` | 1, 2, 3(디스패치), 4 | **없음** (9개 언어, ko 미포함) | 한도 안 (5회/10초, IP 단위) | 채택 후보 (보조/폴백, 정규화된 데이터) |
| C. `helldivers-2/json` 정적 데이터 | 행성명·섹터·MO 태스크 해석 | 행성명 **있음** (`ko-KO`) | 해당 없음 (빌드 시 반영) | 채택 후보 (필수 보조) |
| D. Helldivers Training Manual API | 1, 2, 4(행성별 5분 이력) | 원본 그대로 (확인 안 함) | 문서상 제한 없음 | 보조 (이력 백필·교차검증) |
| E. helldivers-history (git scraping) | 4(과거 이력 데이터셋) | `ivl-IV` 전체 언어(ko 없음) | 해당 없음 | 보조 (과거 데이터 참고용) |
| F. DiveHarder API | - | - | - | 기각 (도메인 응답 없음) |

---

## A. Arrowhead 공개 엔드포인트 (`api.live.prod.thehelldiversgame.com`)

게임 클라이언트·공식 웹 지도가 쓰는 엔드포인트다. 공개 문서는 없고, 경로는 커뮤니티가 정리한 OpenAPI 명세(`Helldivers-2-API_arrowhead.json`)와 `helldivers-2/api`의 동기화 코드(`ArrowHeadApiService.cs`)로 확인했다.

### 엔드포인트 (모두 GET, 확인)

| 경로 (`/api` 기준) | 내용 | 원본 크기 | 전송(br) | 캐시 헤더 | `Accept-Language` 반영 |
| --- | --- | --- | --- | --- | --- |
| `/WarSeason/current/WarID` | 현재 시즌 ID (`{"id":801}`) | 10 B | - | 없음 | 해당 없음 |
| `/WarSeason/{warId}/Status` | 행성별 소유 진영·HP·재생률·**플레이어 수**, 캠페인, 공격 경로, 디펜스 이벤트, 전역 이벤트, 우주 정거장 | 52.6 KB | 9.1 KB | 없음 | 커뮤니티 코드가 언어별로 호출 (전역 이벤트 메시지, 추정) |
| `/WarSeason/{warId}/WarInfo` | 거의 정적인 행성 정보(좌표, 최대 HP, 섹터 번호, 웨이포인트), 시즌 시작·종료 시각 | 83.6 KB | 10.5 KB | 없음 | 아니오 |
| `/Stats/war/{warId}/summary` | 은하 전체·행성별 누적 통계(임무 승패, 처치 수, 사망 수 등) | 92.1 KB | 20.1 KB | 없음 | 아니오 |
| `/NewsFeed/{warId}?maxEntries=&fromTimestamp=` | 게임 내 디스패치. 오래된 순, `fromTimestamp`(전쟁 시간 초)부터 페이지 단위 | 2.6~3.9 KB | 1.3~1.9 KB | 없음 (`Vary: Accept-Encoding`만) | **예** |
| `/v2/Assignment/War/{warId}` | 진행 중 주요 명령(MO): 진행률 배열, 남은 초, 태스크, 보상 | 0.7 KB | 0.4~0.5 KB | `Cache-Control: public,max-age=30`, `Vary: Accept-Language` | **예** |
| `/v2/SpaceStation/War/{warId}/{id}` | 우주 정거장 상세 (이번에 호출 안 함) | - | - | - | 커뮤니티 코드가 언어별 호출 |

- 서버: `Kestrel`, 응답 헤더 `st: <unix 초>`(서버 시각으로 보임, 추정). `X-RateLimit-*`, `Retry-After`, `ETag` **없음** (확인).
- 쿼리 없이 `NewsFeed/801`을 부르면 시즌 초반(2024-02~03) 디스패치 10건만 온다 (확인). 최신 디스패치는 `fromTimestamp`를 줘야 한다. 커뮤니티 동기화 코드는 `maxEntries=1024&fromTimestamp=<마지막 published+1>`로 페이지를 넘긴다.

### 시간 값 주의 (확인)

`Status.time`, `NewsFeed.published`, `Assignment.startTime`은 Unix 시각이 아니라 **전쟁 시간(초)**이다. `WarInfo.startDate`(1706040313)를 더해도 실제 시각과 약 22일(약 1,899,900초) 어긋난다.

- 실측 오프셋: 응답 `Date`(1792992348) − `Status.time`(85052120) = 1707940228
- 커뮤니티 API의 디스패치 #3966 `published`(2026-10-25T08:01:31Z) − 원본 값(84975052) = 1707940239 → 위 계산과 11초 이내로 일치
- 결론: `실제 시각 = (응답 Date − Status.time) + 전쟁 시간`으로 환산한다. MO 만료 시각은 `응답 시각 + expiresIn`으로 구한다 (커뮤니티 `expiration`과 일치 확인).

### 한국어 비교 (`ko-KR` vs `en-US`, 각 1회)

| 항목 | ko-KR 결과 | 비고 |
| --- | --- | --- |
| MO `overrideTitle` / `overrideBrief` | "주요 명령" / "개봉 예정인 교육 영화 "민주적 저격수"의 촬영분을 확보하기 위해…" | 한국어 제공 (확인) |
| MO `taskDescription` | 빈 문자열 | 언어 무관하게 비어 있음. 태스크 문구는 직접 만들어야 함 |
| NewsFeed 과거 디스패치 | 한국어 번역 제공 | 확인 |
| NewsFeed 최신 디스패치 #3966 (조사 약 21시간 전 게시) | **영어 원문 그대로** | 번역이 늦거나 누락될 수 있음 (확인). 같은 시기 #3964·#3965는 한국어 |
| 행성명 | API에 없음 (`WarInfo.planetNameId32`가 0) | C 소스로 보완 |

### 응답 예시

```jsonc
// GET /api/v2/Assignment/War/801  (Accept-Language: ko-KR)
[{
  "id32": 568917260,
  "startTime": 84899010,            // 전쟁 시간(초)
  "progress": [31114280, 11173959, 30381731], // 태스크별 진행 값
  "expiresIn": 278888,              // 남은 초
  "setting": {
    "type": 4,
    "overrideTitle": "주요 명령",
    "overrideBrief": "개봉 예정인 교육 영화 \"민주적 저격수\"의 촬영분을 확보하기 위해 지정된 적을 처치하십시오.",
    "taskDescription": "",
    "tasks": [{ "type": 3, "values": [2,0,300000000,0,1,3827587060,0,0,0,0],
                "valueTypes": [1,2,3,4,6,5,8,9,11,12] }], // values[i]의 의미는 valueTypes[i] (C 소스의 표로 해석)
    "rewards": [{ "type": 1, "id32": 897894480, "amount": 45 }]
  }
}]

// GET /api/NewsFeed/801?maxEntries=1024&fromTimestamp=84447320  (ko-KR, 일부)
{ "id": 3965, "published": 84901928, "type": 0, "tagIds": [],
  "message": "<i=3>무기고 증강</i>\n\n전쟁 활동 강화를 위해 향후  120시간 동안 <i=1>Illuminate 전선</i>에…" }
// <i=N> 태그는 게임 내 강조 마크업. 표시 전 변환·이스케이프 필요

// GET /api/WarSeason/801/Status (일부)
{ "warId": 801, "time": 85052120, "impactMultiplier": 0.018579004,
  "planetStatus": [{ "index": 0, "owner": 1, "health": 1000000,
                     "regenPerSecond": 4.1666665, "players": 638 }],   // 273개
  "campaigns": [{ "id": 51413, "planetIndex": 7, "type": 0, "count": 10, "race": 1 }], // 37개
  "planetAttacks": [{ "source": 212, "target": 259 }],                 // 63개
  "planetEvents": [],          // 디펜스 이벤트 (조사 시점 0건)
  "globalEvents": [{ "eventId": 1501077, "title": "FAILURE", "message": "…" }] }
// planetStatus.players 합계 = 55,465 (조사 시점 전체 접속자 근사치, 추정)
```

### 표준 표

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET https://api.live.prod.thehelldiversgame.com/api/WarSeason/current/WarID`, `/WarSeason/{id}/Status`, `/WarSeason/{id}/WarInfo`, `/Stats/war/{id}/summary`, `/NewsFeed/{id}`, `/v2/Assignment/War/{id}` |
| 공식 여부 | 비공식 공개 (Arrowhead 운영 서버, 공개 문서·개발자 약관 없음) |
| 인증 | 없음 (확인) |
| 응답 예시 | 위 코드 블록 |
| 갱신 주기 | Status·Assignment는 실시간에 가까움 (진행률이 수 초 사이에도 바뀜, 확인). Assignment `max-age=30`. WarInfo는 시즌·패치 때만 변경(추정). NewsFeed는 하루 0~수 건 |
| 레이트리밋 | 문서상: 없음. 실측: 레이트리밋 헤더 없음, 10회 호출 모두 200. 커뮤니티 API가 20초마다 9개 언어로 이미 호출 중이므로 15분 주기 3~4회는 부담이 작다 (추정) |
| 약관·리스크 | 공개 약관이 없어 허용 범위가 불명확하다. `helldivers-2/api` 관리자는 Arrowhead 서버 부하를 이유로 직접 호출 대신 커뮤니티 `/raw` 사용을 권한다. 예고 없는 스키마 변경·차단 가능. 마크업(`<i=N>`) 정제 필요, 전쟁 시간 환산 필요, 행성명 없음 |
| 커버 기능 | 1 전쟁 현황, 2 MO, 3 디스패치, 4 통계(스냅샷 저장 시) |
| 채택 여부 | **채택 후보 (주: 한국어 MO·디스패치)**. 한국어 텍스트를 주는 유일한 소스. 단 호출량을 최소화하고(아래 권장안), 커뮤니티 API를 폴백으로 둔다. 최종 결정은 ADR |

출처 (2026-10-26 확인):
- https://github.com/helldivers-2/api (README, `src/Helldivers-2-Sync/Services/ArrowHeadApiService.cs`)
- https://helldivers-2.github.io/api/openapi/Helldivers-2-API_arrowhead.json

---

## B. 커뮤니티 API (`api.helldivers2.dev`, helldivers-2/api)

Arrowhead 원본을 20초마다 동기화해 정규화한 C# 서비스. MIT 라이선스, 저장소 최근 push 2026-09-09 (활성).

### 엔드포인트 (모두 GET)

| 경로 | 내용 | 원본 크기 | 전송(br) | 호출 |
| --- | --- | --- | --- | --- |
| `/api/v1/war` | 시즌 시작·종료, 진영 목록, 은하 통계, `playerCount` | 0.6 KB | 0.4 KB | 확인 |
| `/api/v1/planets` (`/{index}`) | 행성 273개: 이름·섹터·바이옴·위험요소·HP·소유 진영·이벤트·통계(행성별 `playerCount`)·공격 대상 | 293.7 KB | 114.4 KB | 확인 |
| `/api/v1/campaigns` (`/{index}`) | 진행 중 전선 37개(행성 객체 포함) | 43.7 KB | 18.0 KB | 확인 |
| `/api/v1/assignments` (`/{index}`) | MO: 제목·브리핑·태스크·보상·`expiration`(ISO 시각) | 0.6 KB | 0.4 KB | 확인 |
| `/api/v2/dispatches` (`/{index}`) | 디스패치 **전체 1,090건**, ISO `published`, `<span data-ah>` 마크업 | 472.2 KB | 214.5 KB | 확인 |
| `/api/v1/dispatches` | 디스패치 v1 (v2와 같은 요약문) | - | - | 호출 안 함 |
| `/api/v1/planet-events` | 진행 중 디펜스 이벤트 (조사 시점 `[]`) | 2 B | - | 확인 |
| `/api/v2/space-stations` (`/{index}`) | 우주 정거장(행성·전술 행동·비용) | 4.1 KB | 2.1 KB | 확인 |
| `/api/v1/steam` | Steam 뉴스 프록시 | - | - | R-02 범위, 호출 안 함 |
| `/raw/api/...` | Arrowhead 원본 캐시(위 A의 경로와 같음) | - | - | Assignment 1회 확인 |

### 실측 헤더 (확인)

- `x-ratelimit-limit: 5`, `x-ratelimit-remaining: 4→3→2→1→4…` (2.5초 간격 호출 중 토큰 회복 확인), `Retry-After`는 429일 때만 붙는다(문서).
- `etag: 1792992439503` (마지막 동기화 시각 ms로 보임, 추정), `content-language`, `content-encoding: br`. `Cache-Control` 없음.
- 레이트리밋 구현(`RateLimitMiddleware.cs`): **IP 단위** 토큰 버킷, 10초마다 5토큰 보충, 대기열 0. 인증(JWT) 사용자는 별도 한도.

### 한국어 지원 (확인)

- 동기화 언어: `en-US, de-DE, es-ES, ru-RU, fr-FR, it-IT, pl-PL, zh-Hans, zh-Hant` (`appsettings.json`). **ko-KR 없음**.
- `Accept-Language: ko-KR`로 `/api/v1/assignments`, `/raw/api/v2/Assignment/War/801`을 부르면 `content-language: en-US`로 영어가 온다.
- `Accept-Language: ivl-IV`를 주면 모든 언어를 객체로 받는다(`{"en-US": "...", "de-DE": "...", ...}`), 역시 ko 없음.
- 행성명은 영어 대문자(`"ZEA RUGOSIA"`).

### 응답 예시

```jsonc
// GET /api/v1/war
{ "started": "2024-01-23T20:05:13Z", "ended": "2028-02-08T20:04:55Z",
  "now": "1972-09-11T09:36:40Z",          // 값이 잘못 나옴 (확인). 사용하지 말 것
  "impactMultiplier": 0.018635675,
  "statistics": { "missionsWon": 1082181841, "deaths": 9228423209, "playerCount": 48730 } }
// playerCount 48,730은 같은 시점 원본 Status의 players 합계(55,465)와 다르다. 집계 기준 차이로 보임 (추정)

// GET /api/v1/campaigns (일부)
{ "id": 51413, "type": 0, "count": 10, "faction": "Humans",
  "planet": { "index": 7, "name": "ZEA RUGOSIA", "health": 1700000, "maxHealth": 1700000,
              "event": null, "statistics": { "playerCount": 279 } } }

// GET /api/v1/assignments
[{ "id": 568917260, "progress": [31123449, 11175098, 30400126],
   "title": "MAJOR ORDER", "briefing": "Kill the designated enemies…", "description": null,
   "reward": { "type": 1, "amount": 45 }, "expiration": "2026-10-29T10:54:27.4054454Z" }]
```

### 표준 표

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET https://api.helldivers2.dev/api/v1/{war,planets,campaigns,assignments,planet-events}`, `/api/v2/{dispatches,space-stations}`, `/raw/api/...` |
| 공식 여부 | 커뮤니티 (Arrowhead와 무관하다고 명시) |
| 인증 | 없음. `X-Super-Client`(앱/도메인 이름) 권장, 향후 **필수화 예정**이라고 README에 명시. `X-Super-Contact`는 선택 (미들웨어 코드에는 두 헤더를 모두 검사하는 경로가 있음) |
| 응답 예시 | 위 코드 블록 |
| 갱신 주기 | 원본을 20초마다 동기화 (`Synchronization.IntervalSeconds: 20`) |
| 레이트리밋 | 문서상: 5회/10초. 실측: `x-ratelimit-limit: 5`, IP 단위 토큰 버킷 |
| 약관·리스크 | MIT 코드, 별도 이용약관 없음. 비공식이라 중단·스키마 변경 가능. **IP 단위 한도**라서 Vercel·GitHub Actions처럼 IP를 여러 사용자가 공유하는 환경에서는 남의 호출과 버킷을 나눠 429가 날 수 있다(추정, P2에서 확인). 한국어 없음. `war.now` 값 오류. `/api/v2/dispatches`는 전체 이력을 매번 내려줘 472 KB로 무겁다 |
| 커버 기능 | 1 전쟁 현황(행성명·바이옴 포함 정규화), 2 MO(ISO 만료 시각), 3 디스패치(ISO 시각), 4 통계 |
| 채택 여부 | **채택 후보 (보조/폴백)**. 정규화·시간 환산이 끝난 데이터라 구현이 쉽다. 한국어가 없어 MO·디스패치 텍스트의 주 소스로는 부적합. 최종 결정은 ADR |

출처 (2026-10-26 확인):
- https://github.com/helldivers-2/api (README, `src/Helldivers-2-API/appsettings.json`, `src/Helldivers-2-API/Middlewares/RateLimitMiddleware.cs`)
- https://helldivers-2.github.io/api/openapi/Helldivers-2-API.json
- https://helldivers-2.github.io/api/openapi/swagger-ui.html

---

## C. 정적 데이터 `helldivers-2/json`

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | GitHub 저장소 `helldivers-2/json` (`planets/planets.json`, `planets/biomes.json`, `factions.json`, `assignments/tasks/task/*.json`, `assignments/reward/type.json`, `effects/planetEffects.json`) |
| 공식 여부 | 커뮤니티 (MIT) |
| 인증 | 없음 |
| 응답 예시 | `"7": { "name": "Zea Rugosia", "sector": "Ferris", "names": { "en-US": "ZEA RUGOSIA", "ko-KO": "제아 루고시아", … } }` |
| 갱신 주기 | 패치 시 수동 갱신. 최근 커밋 2026-08-16 |
| 레이트리밋 | 해당 없음 (빌드 시 가져오거나 서브모듈로 포함) |
| 약관·리스크 | MIT. 신규 행성·태스크 타입이 늦게 반영될 수 있음. 한국어 키가 표준 `ko-KR`이 아니라 **`ko-KO`**임 (확인) |
| 커버 기능 | 1(한국어 행성명·섹터·바이옴), 2(MO 태스크 `values`/`valueTypes`·보상 타입 해석) |
| 채택 여부 | **채택 후보 (필수 보조)**. A를 주 소스로 쓰면 행성명이 없으므로 반드시 필요. 한국어 행성명 커버리지 280/281 (확인) |

출처 (2026-10-26 확인): https://github.com/helldivers-2/json

---

## D. Helldivers Training Manual API (`helldiverstrainingmanual.com/api/v1`)

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET /api/v1/war/{status,info,news,campaign,major-orders,stats}`, `/api/v1/war/stats/{planetIndex}`, `/api/v1/war/history/{planetIndex}?timeframe=short|day|week`, `/api/v1/planets` |
| 공식 여부 | 커뮤니티 (Arrowhead와 무관하다고 명시) |
| 인증 | 없음 |
| 응답 예시 | `history/158?timeframe=short` → `[{"created_at":"2026-10-26T05:25:14Z","planet_index":158,"current_health":2069801,"max_health":3200000,"player_count":28925}, …]` (확인) |
| 갱신 주기 | `history`는 약 5분 간격 기록(확인: 05:20→05:25), 활성 행성만 기록. 기본 24시간(288건), `week`는 1시간 간격 1주. `status`는 원본 그대로(52.6 KB, A와 같은 크기) |
| 레이트리밋 | 문서상: "인증·레이트리밋 없음". 실측: Cloudflare 뒤, `Cache-Control: max-age=300`, 레이트리밋 헤더 없음 |
| 약관·리스크 | 문서에 "공식 오픈 API가 아니며 언제든 바뀔 수 있음, 본인 책임"이라고 명시. 별도 이용약관·라이선스 없음. 개인 운영이라 중단 위험 |
| 커버 기능 | 4 통계(행성별 HP·**플레이어 수 이력**), 1·2 보조 |
| 채택 여부 | **보조**. 자체 이력이 쌓이기 전 초기 그래프 백필(최대 1주), 자체 수집 누락 구간 교차검증용. 주기 수집 소스로는 쓰지 않는다 |

출처 (2026-10-26 확인): https://helldiverstrainingmanual.com/api, https://helldiverstrainingmanual.com/disclaimer

---

## E. helldivers-history (sebsebmc, git scraping 데이터셋)

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | GitHub `sebsebmc/helldivers-history`. GitHub Actions가 커뮤니티 API(B)의 `war, planets, assignments, campaigns, dispatches`를 `ivl-IV`로 받아 `801_full_v1.json`으로 커밋. 사이트: https://sebsebmc.github.io/helldivers-history/ |
| 공식 여부 | 커뮤니티 (데이터셋) |
| 인증 | 없음 (git clone/GitHub API) |
| 응답 예시 | 커밋 메시지 `Latest data: Mon Oct 26 04:54:30 UTC 2026`, 스냅샷 파일 `801_full_v1.json` (내용은 B와 같은 구조) |
| 갱신 주기 | cron `*/10 * * * *` 설정이지만 실제 커밋 간격은 2~4시간 (확인: 22:06, 00:15, 04:54). 변경이 있을 때만 커밋하는 구조라 일부는 정상, 일부는 GitHub Actions 지연으로 보임 (추정) |
| 레이트리밋 | GitHub API 한도만 해당 |
| 약관·리스크 | 저장소에 라이선스 파일 없음 (확인) → 재배포 권한 불명확. 과거 데이터 연구·검증 참고만 |
| 커버 기능 | 4 통계(시즌 801 이력) |
| 채택 여부 | **보조 (참고용)**. 재배포는 하지 않고, 차트 설계·스키마 참고. R-03에 참고: GitHub Actions `schedule`이 10분 주기를 지키지 못하는 실례 |

출처 (2026-10-26 확인): https://github.com/sebsebmc/helldivers-history (`.github/workflows/scrape.yml`, `docs/faq.md`)

---

## F. DiveHarder API (`api.diveharder.com`)

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `https://api.diveharder.com/` |
| 공식 여부 | 커뮤니티 |
| 인증 | - |
| 응답 예시 | 없음. DNS 조회 결과 "Non-existent domain" (확인) |
| 갱신 주기 | - |
| 레이트리밋 | - |
| 약관·리스크 | 서비스 중단으로 보임. 관련 저장소 `helldivers-2/diveharder_api.py` 최근 push 2024-11-15 |
| 커버 기능 | - |
| 채택 여부 | **기각**: 접속 불가 |

출처 (2026-10-26 확인): https://github.com/helldivers-2/diveharder_api.py

---

## 핵심 기능 ↔ 엔드포인트 매핑

| 기능 | 표시 항목 | 주 소스 (권장) | 보조/폴백 | 비고 |
| --- | --- | --- | --- | --- |
| 1 전쟁 현황 | 행성별 해방률 | A `Status.planetStatus[].health` ÷ A `WarInfo.planetInfos[].maxHealth` | B `/api/v1/planets` (`health`, `maxHealth`) | 해방률 = 1 − health/maxHealth (인간 소유 아닌 행성 기준, 추정) |
| 1 | 진영 | A `Status.planetStatus[].owner` (1 인류, 2 테르미니드, 3 오토마톤, 4 일루미네이트) | B `currentOwner` | 코드 ↔ 이름은 C `factions.json` |
| 1 | 플레이어 분포 | A `Status.planetStatus[].players` | B `planets[].statistics.playerCount` | 전체 합계는 직접 합산 |
| 1 | 디펜스 이벤트 | A `Status.planetEvents[]` (HP, 시작·종료 시각, 진영) | B `/api/v1/planet-events` | 조사 시점 0건이라 실데이터 미확인 |
| 1 | 활성 전선·공격 경로 | A `Status.campaigns[]`, `Status.planetAttacks[]` | B `/api/v1/campaigns`, `planets[].attacking` | |
| 1 | 행성명·섹터·좌표 | C `planets.json` (`ko-KO`) + A `WarInfo` (좌표·웨이포인트) | B `planets[].name/sector/position` (영어) | WarInfo는 하루 1회면 충분 |
| 2 MO | 제목·설명 (한국어) | A `v2/Assignment` + `Accept-Language: ko-KR` | B `/api/v1/assignments` (영어) | `taskDescription`이 비어 있어 태스크 문구는 C 표로 생성 |
| 2 | 진행률 | A `progress[]` ÷ 태스크 목표값(`values` 중 목표 슬롯) | B 같은 값 | `values` 해석은 C `assignments/tasks/task/*.json` |
| 2 | 남은 시간 | A `expiresIn` + 응답 시각 | B `expiration` (ISO) | |
| 2 | 보상 | A `rewards[]` (type, amount) | B `rewards[]` | type 1 = 메달(추정, C `reward/type.json`로 확인 필요) |
| 3 디스패치 | 게임 내 뉴스 (한국어) | A `NewsFeed/{id}?fromTimestamp=` + `ko-KR` | B `/api/v2/dispatches` (영어, 무거움) | 최신 글이 번역 전 영어로 올 수 있음 → 영어 원문 표시 후 다음 수집 때 갱신 |
| 4 통계/추이 | 행성 해방률·플레이어 수 시계열 | 자체 DB: 15분마다 A `Status` 스냅샷 저장 | D `history/{planet}` (최대 1주 백필) | 활성 전선(약 37개)만 저장하면 30일 약 10.7만 행 (37×96×30) |
| 4 | 전체 접속자 시계열 | A `Status.players` 합계 저장 | B `war.statistics.playerCount`, Steam 동접자(R-02) | 두 값이 다름(55,465 vs 48,730) → 어느 값을 쓸지 ADR에서 결정 |
| 4 | 누적 전투 통계 | A `Stats/war/{id}/summary` (1~수 시간에 1회면 충분) | B `war.statistics` | 처치 수 등은 증가분만 의미 있음 |
| 4 | MO 진행률 추이 | 자체 DB: 15분마다 A `Assignment.progress` 저장 | - | |

## 주/보조 권장안

1. **주: A(Arrowhead) + C(정적 데이터)**. 한국어 MO·디스패치를 받을 수 있는 소스가 A뿐이다. 행성명은 C의 `ko-KO`로 붙인다.
2. **폴백: B(커뮤니티)**. A 호출 실패·스키마 변경 시 같은 항목을 B에서 가져온다(영어 표시). zod로 두 응답을 검증하고, 실패한 쪽만 폴백한다.
3. **백필·검증: D**. 서비스 시작 직후 그래프가 비지 않도록 최대 1주치 행성 이력을 한 번 가져온다.
4. **고려 사항**: B 관리자는 Arrowhead 직접 호출보다 `/raw` 사용을 권한다. 그러나 `/raw`도 한국어가 없어 기능 요구(C-08)와 충돌한다. A 직접 호출은 15분에 3회 수준으로 줄이고, 필요하면 B 관리자에게 `ko-KR` 동기화 추가를 요청(이슈)하는 방안을 ADR에서 검토한다.

## 15분 주기 호출량 계산

하루 수집 횟수 = 24 × 60 ÷ 15 = **96회**.

### 권장안 (A 주, B 폴백)

| 호출 | 주기 | 1회당 | 하루 호출 수 | 하루 전송량(br 기준) |
| --- | --- | --- | --- | --- |
| A `Status` | 15분 | 1 | 96 | 약 0.9 MB |
| A `v2/Assignment` (ko-KR) | 15분 | 1 | 96 | 약 0.05 MB |
| A `NewsFeed?fromTimestamp=` (ko-KR) | 15분 | 1 | 96 | 약 0.15 MB |
| A `WarSeason/current/WarID` | 하루 1회 | 1 | 1 | - |
| A `WarInfo` | 하루 1회 | 1 | 1 | 약 0.01 MB |
| A `Stats/war/{id}/summary` | 1시간 | 1 | 24 | 약 0.5 MB |
| **합계 (A)** | | | **314회/일** | **약 1.6 MB/일** |
| B 폴백 (A 실패 시만) | - | 최대 4 (`planets`, `campaigns`, `assignments`, `planet-events`) | 0 (평시) | 실패 시 1회당 약 133 KB |

- A: 문서상 한도가 없고, 15분에 3회는 커뮤니티 API의 20초×9개 언어 동기화(하루 수만 회)에 비해 매우 작다 (추정). 안전 범위.
- B 폴백 4회는 연속 호출해도 5회/10초 버킷 안이다. 단 IP 공유 환경을 고려해 호출 사이 2초 간격과 429 시 `Retry-After` 준수를 넣는다.

### 대안 (B만 사용, 영어)

| 호출 | 1회당 | 하루 호출 수 | 하루 전송량(br) |
| --- | --- | --- | --- |
| `war`, `planets`, `campaigns`, `assignments`, `planet-events` | 5 | 480 | 약 12.7 MB |
| `v2/dispatches` (매회 전체 1,090건) | 1 | 96 | 약 20.6 MB |
| 합계 | 6 | **576회/일** | **약 33 MB/일** |

- 한 번에 6회면 5회/10초를 넘으므로 10초 이상 나눠 호출해야 한다. 디스패치는 1시간 주기로 낮추는 편이 낫다.
- 한국어 요구(C-08)를 충족하지 못한다.

## 남은 확인 사항

- Vercel 함수·외부 스케줄러(R-03)의 송신 IP에서 B가 429를 내는지 P2 스모크 테스트에서 확인.
- 디펜스 이벤트(`planetEvents`)가 있을 때의 실제 응답 형태 (조사 시점 0건).
- `Status`의 `globalEvents[].message`가 `Accept-Language: ko-KR`로 한국어가 오는지 (이번에는 en-US로만 호출).
- MO 태스크 `values`/`valueTypes`와 보상 `type` 해석 표(C) 검증.
