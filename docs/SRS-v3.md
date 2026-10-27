# 헬다이버즈2 대시보드 — SRS v3 (P3 데이터 수집 명세)

| 항목 | 내용 |
| --- | --- |
| 문서 버전 | v3.0 (2026-10-26) |
| 상태 | 승인 (2026-10-26, 인터뷰 결정 반영) |
| 범위 | P3 데이터 수집: 외부 소스 → `POST /api/collect` → Supabase Postgres. 화면은 P4 |
| 입력 | [SRS v2](SRS-v2.md) §5 (D-01~D-08), [ADR 0001~0005](adr/), `docs/research/*.md` |
| 진행 관리 | [CHECKLIST.md](CHECKLIST.md) P3 |

## 1. 목적과 범위

SRS v2 §5의 수집 요구사항을 구현 가능한 수준으로 구체화한다. 이번 단계가 끝나면 로컬 Supabase에 15분마다 전쟁 현황·MO·뉴스·동접자 이력이 쌓이고, P4 화면은 DB만 읽어 그릴 수 있다.

| 구분 | 포함 |
| --- | --- |
| 소스 | Arrowhead `WarID`·`WarInfo`·`Status`·`v2/Assignment`·`NewsFeed`·`Stats summary`, helldivers-2/json `planets.json`, Steam 동접자, Steam 뉴스(API + 한국어 RSS) |
| 실행 | `POST /api/collect`, 로컬 pg_cron + pg_net이 15분마다 로컬 dev 서버를 호출 |
| 관측 | `collection_run` 소스별 결과, Sentry 오류 보고 |

범위 밖은 §8에 둔다.

## 2. 인터뷰 결정 (2026-10-26)

| 질문 | 결정 |
| --- | --- |
| 단계 | 기존 "P3 MVP"를 **P3 데이터 수집 / P4 화면**으로 나눈다. P2 남은 항목(Vercel 연결·클라우드 DB·Preview)은 사용자 작업으로 병행한다 |
| 소스 | Arrowhead, Steam 동접자, Steam 뉴스. X는 다음 단계 |
| 실행 범위 | 로컬 Supabase Cron까지 확인. 클라우드 전환은 P2 완료 후 설정만 옮긴다 |
| 행성 스냅샷 | 전 행성(약 273개)을 매 슬롯 저장 |
| 정적 데이터 | 행성명(ko/en)·섹터를 DB에 저장한다. 진짜 정적인 값과 실제로 변하는 값(비활성화·위치·환경 효과)을 분리한다 |
| 폴백 | 커뮤니티 API 폴백(D-03 후반)은 다음 단계. 이번에는 zod 검증과 실패 기록만 |
| 원본 응답 | 검증에 실패한 응답만 Sentry로 보낸다 |
| 백필 | 하지 않는다 |

## 3. 수집 요구사항

| ID | 요구사항 |
| --- | --- |
| D-01 | 15분마다 `Status`, `v2/Assignment`(ko-KR), `NewsFeed`(ko-KR), Steam 동접자, Steam 뉴스 API·RSS를 수집한다 |
| D-02 | `Stats/war/{id}/summary`는 마지막 저장이 1시간 넘었을 때, `WarID`·`WarInfo`·정적 행성 데이터는(정적 데이터가 실패해도 WarInfo는 저장하고 기존 이름 유지) 마지막 갱신이 24시간 넘었거나 `planet`이 비었을 때 수집한다. 판단은 슬롯 시각이 아니라 DB 상태로 한다(누락·첫 실행에 강함) |
| D-03 | 모든 응답을 zod로 검증한다. 실패하면 해당 소스만 실패로 기록한다. 커뮤니티 API 폴백은 다음 단계 |
| D-04 | 스냅샷은 15분 슬롯(`수집 시작 시각 + 1분`을 15분 단위로 내림, UTC. 1분은 앱·DB 시계 차이 허용)으로 저장하고 `UNIQUE(대상, slot)` + `skipDuplicates`로 같은 슬롯 재호출에 멱등하다 |
| D-05 | 실행마다 `collection_run`에 소스별 `{status, ms, count?, error?}`를 남긴다 |
| D-06 | pg_cron이 하루 1회 30일 지난 스냅샷·실행 기록·캠페인·이벤트를 삭제한다. 행성·효과 이력·MO·뉴스는 지우지 않는다 |
| D-07 | 수집 후 `revalidateTag`는 화면이 생기는 P4에서 붙인다 |
| D-08 | 한 소스가 실패해도 나머지 소스 수집은 계속한다 |
| D-09 | 행성 데이터를 **정적 / 느리게 변함 / 시계열 / 효과 구간**으로 나눠 저장한다 (§4) |
| D-10 | 소스 오류와 검증 실패를 Sentry로 보내고 응답 전에 flush한다. 검증 실패는 zod 오류와 응답 앞 2 KB를 함께 보낸다. `SENTRY_DSN`이 없으면 보내지 않는다 ([ADR 0005](adr/0005-error-reporting.md)) |
| D-11 | `pnpm db:cron`이 수집·정리 Cron 작업을 등록한다. 여러 번 실행해도 결과가 같다 |
| D-12 | MO·디스패치는 `ko-KR`로 1회만 호출한다. 받은 글에 한글이 있으면 `*_ko`, 없으면 `*_en`에 넣고 다음 수집 때 갱신한다 (ADR 0001 호출 예산 유지. SRS v2 §7의 "ko/en 모두 저장"은 Steam 뉴스에만 해당) |

### 소스별 호출

공통 헤더: `User-Agent: helldivers-dashboard (contact: GitHub Bigbattery)`. 요청당 타임아웃 8초(Arrowhead 순차 호출 최대 6회가 `maxDuration` 60초 안에 들도록).

| 소스 | URL | 주기 | 비고 |
| --- | --- | --- | --- |
| WarID | `api.live.prod.thehelldiversgame.com/api/WarSeason/current/WarID` | 일일 | |
| WarInfo | `.../WarSeason/{id}/WarInfo` | 일일 | 최대 HP·비활성화·초기 소유·좌표 |
| 정적 행성 | `raw.githubusercontent.com/helldivers-2/json/master/planets/planets.json` | 일일 | 한국어 키는 `ko-KO` |
| Status | `.../WarSeason/{id}/Status` | 15분 | **`Accept-Language` 필수** (없으면 오류, 2026-10-26 확인) |
| Assignment | `.../v2/Assignment/War/{id}` | 15분 | `Accept-Language: ko-KR` |
| NewsFeed | `.../NewsFeed/{id}?maxEntries=1024&fromTimestamp=<현재 전쟁 시간 − 7일>` | 15분 | 최근 7일을 매번 다시 받아 번역 갱신을 잡는다 |
| Stats summary | `.../Stats/war/{id}/summary` | 1시간 | `galaxy_stats`만 저장 |
| Steam 동접자 | `api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=553850` | 15분 | |
| Steam 뉴스 | `api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=553850&count=10&feeds=steam_community_announcements` | 15분 | RSS가 최근 10건만 주므로 10건. 패치 판별: `patchnotes` 태그 또는 제목 `\d+\.\d+\.\d+` |
| Steam RSS | `store.steampowered.com/feeds/news/app/553850/?l=koreana` | 15분 | API 항목과 **게시 시각(초) 일치**로 매칭, 한글 제목이면 `*_ko`·링크 갱신 |

### 시간 환산

Arrowhead 시각 값은 전쟁 시간(초)이다. `Status` 응답마다 `offset = 응답 Date(초) − Status.time`을 `war.time_offset_sec`에 저장하고, `실제 시각 = offset + 전쟁 시간`으로 바꾼다. MO 만료는 `응답 시각 + expiresIn`.

## 4. 스키마

FK는 두지 않는다(시계열과 신규 행성의 순서 문제를 피함). 시각은 모두 `timestamptz`.

| 테이블 | 키 | 컬럼 | 갱신 | 보관 |
| --- | --- | --- | --- | --- |
| `war` | `id` | started_at, ended_at, time_offset_sec, updated_at | offset은 Status마다, 나머지는 일일 | 상시 |
| `planet` | `index` | **정적** name_en, name_ko, sector / **느리게 변함** max_health, disabled, initial_owner, position_x, position_y, updated_at | 정적·WarInfo는 일일, 위치는 Status에서 바뀐 행성만 | 상시 |
| `planet_effect` | `UNIQUE(planet_index, effect_id, started_at)` | ended_at(null = 진행 중), last_seen_at | Status마다 열린 구간과 비교: 새로 생기면 insert, 사라지면 ended_at | 상시 |
| `planet_snapshot` | `UNIQUE(planet_index, slot)` | owner, health, regen_per_second, players, event_health | 15분 | 30일 |
| `planet_event` | `id` | planet_index, event_type, race, started_at, expires_at, max_health, campaign_id | Status마다 upsert | 30일(expires_at) |
| `campaign` | `id` | planet_index, type, race, count, first_seen_at, last_seen_at | 활성 = last_seen_at이 최신 slot | 30일(last_seen_at) |
| `assignment` | `id` | title, briefing, tasks, rewards, started_at, expires_at, last_seen_at | 15분 upsert | 상시 |
| `assignment_snapshot` | `UNIQUE(assignment_id, slot)` | progress(json, 20억 초과 가능) | 15분 | 30일 |
| `news_item` | `UNIQUE(source, external_id)` | kind(`dispatch`/`patch`/`announcement`), title_en, body_en, title_ko, body_ko, url, published_at | upsert | 상시 |
| `global_snapshot` | `slot` | steam_players | 15분 | 30일 |
| `war_stats_snapshot` | `slot` | galaxy_stats(json) | 1시간 | 30일 |
| `collection_run` | `id` | started_at, finished_at, results(json) | 매 실행 | 30일 |

- "갑자기 사용 불가" 같은 변화는 `planet.disabled`·`max_health` 변경으로, 환경 변화(포자 등)는 `planet_effect` 구간으로 남는다. 일일 단계에서 바뀐 행성은 `collection_run.results`에 기록한다.
- 진영별 플레이어 합계(F-01-4)는 `planet_snapshot`에서 쿼리로 구한다.
- 디스패치 `<i=N>` 마크업은 원문 그대로 저장한다. 변환은 P4(F-03-5).

## 5. 실행 순서와 오류 처리

`POST /api/collect`는 `Authorization: Bearer <CRON_SECRET>`을 상수 시간 비교로 검증한다. 틀리면 401.

1. 일일 단계 (D-02) → `war`, `planet`
2. Status → offset, `planet_snapshot`, 위치, `campaign`, `planet_event`, `planet_effect`
3. Assignment → `assignment`, `assignment_snapshot`
4. NewsFeed → `news_item`
5. Steam 동접자 → `global_snapshot`
6. Steam 뉴스 API + RSS → `news_item`
7. Stats summary (1시간) → `war_stats_snapshot`

Arrowhead 묶음(1~7 중 1·2·3·4·7, 순차)과 Steam 두 소스는 동시에 실행한다. 소스마다 try/catch로 감싸고(D-08), 실행 기록은 예외가 나도 finally에서 닫는다. 소스 오류 메시지(HTTP 상태·URL)는 `results`에도 남기고, 실패는 `collection_run`(D-05)과 Sentry(D-10)에 남긴다. 응답은 항상 200과 소스별 결과를 돌려준다(스케줄러가 재시도하지 않으므로 상태 코드로 구분할 이유가 없다).

## 6. 스케줄 (D-11)

`pnpm db:cron`이 `COLLECT_URL`(로컬 기본 `http://host.docker.internal:4100/api/collect`)과 `CRON_SECRET`으로 SQL을 만들어 `prisma db execute`로 실행한다.

- `collect`: `*/15 * * * *`, Vault의 시크릿으로 `net.http_post`, 타임아웃 60초
- `retention`: `30 3 * * *`, §4의 30일 보관 테이블 정리 (D-06)
- 마이그레이션에 넣지 않는 이유: URL·시크릿이 환경마다 다르고, `migrate dev`의 shadow DB에 pg_cron이 없을 수 있다.

## 7. 사용자 작업

- `.env.local`에 `CRON_SECRET`, `SENTRY_DSN` 추가 (Claude는 `.env*`를 읽고 쓰지 않는다)
- Sentry 프로젝트 생성 (무료 Developer 플랜)

## 8. 범위 밖

X 수집, 커뮤니티 API 폴백, Training Manual 백필, `revalidateTag`(P4), watchdog·클라우드 Cron(배포 후), MO 태스크·보상·효과 이름 해석 표(P4), `planetRegions`·`globalEvents`·`spaceStations`·`planetAttacks` 저장.

## 9. P3 완료 기준

- [x] 로컬 pg_cron이 연속 8슬롯(2시간) 빠짐없이 수집했다 (2026-10-27 11:30~13:15) (`collection_run`, `cron.job_run_details`). 24시간 연속 기준은 클라우드 배포 후로 옮긴다
- [x] 같은 슬롯에 `/api/collect`를 두 번 불러도 스냅샷 행 수가 늘지 않는다
- [x] 소스 하나를 일부러 실패시켜도 나머지가 저장되고 Sentry에 이벤트가 남는다 (2026-10-27)
- [x] `planet`에 전 행성의 한국어 이름이 채워져 있다
- [ ] CI(`format:check → lint → typecheck → test → build`) 통과
