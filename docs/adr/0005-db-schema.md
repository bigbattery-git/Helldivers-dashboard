# 0005. DB 스키마: 현재 상태와 이력 분리, 텍스트 한 칸 + lang

| 항목 | 내용 |
| --- | --- |
| 상태 | 채택 |
| 날짜 | 2026-10-26 |
| 관련 요구사항 | SRS v2 F-01~F-05, D-04, D-05, D-06, Q-06 |

## 배경

수집 작업(`POST /api/collect`)과 화면을 만들기 전에 테이블을 정해야 한다. 화면은 Tactical HUD 디자인 시스템(`docs/design-system/README.md`)을 따른다. 홈 화면은 은하 지도와 해방·방어 툴팁, 주요 명령, 업데이트 내역으로 구성되고, 추이 그래프는 15분 슬롯 스냅샷을 30일 보관한 데이터로 그린다(ADR 0003). 수집이 멈춰도 화면은 마지막 데이터를 계속 보여줘야 한다(Q-06).

## 고려한 대안

| 대안 | 장점 | 단점 |
| --- | --- | --- |
| A. 현재 상태 테이블(`planet`) + 이력 테이블(`planet_snapshot`) | 홈 화면이 작은 테이블 하나만 읽는다. 공격 경로·행성 효과처럼 현재 값만 필요한 데이터를 둘 곳이 있다 | 매 수집 때 두 번 쓴다 |
| B. 이력 테이블만 두고 최신 slot을 조회 | 쓰기가 한 번이다 | 최신 slot 조회가 매번 필요하다. 현재 값만 필요한 데이터가 78만 행 테이블에 같이 쌓인다 |
| 텍스트: ko·en 칸을 따로 둔다 | 나중에 한/영 전환 UI를 바로 붙일 수 있다 | en-US로도 호출해야 해서 원본 호출이 하루 +192회 늘어난다 (ADR 0001과 충돌) |
| 텍스트: 한 칸 + `lang` | 호출량이 ADR 0001 그대로다 | 영어 원문을 따로 보관하지 않는다 |
| 정적 데이터(행성명·섹터·효과·태스크 표)를 DB에 둔다 | SQL에서 조인할 수 있다 | 시드·동기화 작업이 더 필요하다. ADR 0001이 빌드 시점 반영으로 정했다 |

## 결정

- **A를 채택한다.** 현재 상태는 `planet`, `planet_event`, `major_order.active`, `war`에 두고, 이력은 `planet_snapshot`, `major_order_progress`, `global_snapshot`에 둔다. 스냅샷은 `(대상, slot)`을 PK로 하고 `ON CONFLICT DO NOTHING`으로 쓴다(D-04).
- **텍스트는 한 칸 + `lang`(ko/en)으로 저장한다** (사용자 결정). ko-KR로 한 번만 호출하고, 폴백이나 번역 전 글은 en으로 넣었다가 한국어가 오면 덮어쓴다.
- **정적 데이터는 DB에 넣지 않는다.** DB에는 코드값(진영 1~4, effect id, 태스크 원본)만 저장한다. 이름과 해석 표는 저장소의 정적 데이터(`helldivers-2/json`)로 붙인다.
- **파생값은 저장하지 않는다.** 해방률, 진영별 합계, 해방된 행성 수, 침공 레벨, 적 공세 진행도, 시간당 변화량은 조회할 때 계산한다.
- **은하 지도를 MVP에 넣는다** (사용자 결정). 행성 좌표(`position_x/y`)를 저장한다. 공급선은 시안에 없으므로 저장하지 않는다.
- `planet_snapshot.slot`에는 BRIN 인덱스를 둔다. 추가만 하는 시계열이라 인덱스가 작고, 30일 정리와 slot별 집계에 쓴다.
- 값이 int32를 넘을 수 있는 MO id32와 진행 값은 `BigInt`로 둔다. 읽기 계층에서 `Number()`로 바꾼다.

테이블 목록: `war`, `planet`, `planet_event`, `planet_snapshot`, `major_order`, `major_order_progress`, `global_snapshot`, `news_item`, `raw_payload`, `collection_run` (`prisma/schema.prisma`).

## 결과

- 이점: 홈 화면은 행성 약 273행과 활성 MO만 읽는다. 수집이 멈춰도 마지막 상태가 남는다. 이력 30일은 ADR 0003의 용량 추정(약 90 MB) 안이다.
- 감수하는 비용·리스크와 대응:
  - 방어 이벤트(`planet_event`)의 실제 응답은 아직 확인하지 못했다 → 컬럼은 커뮤니티 OpenAPI 명세의 필드에 맞췄다. 실데이터와 다르면 마이그레이션으로 고친다.
  - 영어 원문을 따로 보관하지 않으므로, 한/영 전환 UI를 만들려면 스키마와 호출량을 다시 검토해야 한다.
  - Prisma는 배열 컬럼에 NOT NULL을 붙이지 않는다 → 수집 코드에서 항상 배열을 넣는다.
- 후속 작업:
  - 30일 정리용 pg_cron 작업(D-06)은 스케줄러 작업 때 넣는다
  - 정적 데이터를 반입하고 수집 코드를 작성한다
  - "진행 중인 미션" 패널의 데이터 소스를 다시 조사한다(Discord 등). 조사와 ADR이 끝난 뒤에 테이블을 추가한다

## 근거 자료

- `docs/research/game-api.md`, `docs/research/news-sources.md`
- `docs/design-system/README.md`, `docs/design-system/reference/dashboard.dc.html`
- ADR 0001~0004
