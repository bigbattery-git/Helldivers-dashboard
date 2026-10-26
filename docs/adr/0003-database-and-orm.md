# 0003. DB·ORM: Supabase Postgres(Free) + Prisma ORM

| 항목 | 내용 |
| --- | --- |
| 상태 | 채택 |
| 날짜 | 2026-10-26 |
| 관련 요구사항 | R-03, R-04, E-02, C-02, C-07 |

## 배경

15분 간격 스냅샷을 30일 보관할 저장소가 필요하다(C-07). 전 행성 260개를 30일 저장하면 약 75만 행, 약 90 MB다. 0원이어야 하고(C-02) Vercel 서버리스에서 접속해야 한다.

## 고려한 대안

| 대안 | 장점 | 단점 |
| --- | --- | --- |
| Supabase Free | 컴퓨트 시간 한도 없음, 500 MB(사용률 약 19%), pg_cron 내장 | 1주 비활성 시 일시정지, 자동 백업 없음 |
| Neon Free | 1 GB, Vercel 연동 매끄러움 | 15분마다 깨우면 월 100 CU-h의 67~134% 사용 → 한도 초과 위험 |
| Prisma Postgres Free | 2 GB | 월 200k operations, 상세 페이지 재생성 시 초과 위험 |
| Turso / Upstash Redis | 용량 큼 / TTL 편리 | SQLite 확장 없음 / 명령 수 한도로 시계열 부적합 |
| ORM: Drizzle | SQL에 가까운 시계열 집계, 콜드 스타트 부담 적음 | — |
| ORM: Prisma | 스키마·마이그레이션 도구 성숙, 사용자 선호 | v7부터 driver adapter 필수, CLI `latest` 태그가 8.0 RC를 가리킴, 집계는 `$queryRaw` 의존 |

## 결정

- **DB: Supabase Postgres Free**. Vercel Marketplace로 연결하고, Vercel 함수 리전과 Supabase 리전을 맞춘다.
- **ORM: Prisma ORM** (사용자 선택. 조사 권장안은 Drizzle이었다).
  - `prisma`·`@prisma/client`·`@prisma/adapter-pg`는 **7.x 안정 버전으로 정확히 고정**한다. `latest` 태그는 8.0 RC를 가리키므로 쓰지 않는다.
  - 런타임 쿼리는 Supavisor transaction pooler(6543)를 통해 `@prisma/adapter-pg`로 연결한다. 마이그레이션은 direct 연결을 쓴다.
  - 시간 버킷 집계(`date_trunc`, 윈도 함수)는 `$queryRaw` 또는 TypedSQL로 작성한다.
- 저장 방식: 전 행성 스냅샷을 15분 슬롯 단위로 저장하고 `UNIQUE(planet_index, slot)`로 중복을 막는다. 원본 JSON은 최신 1건만 덮어써 보관한다.

## 결과

- 이점: 30일 보관이 무료 한도 안에 넉넉하고, 컴퓨트 시간 걱정이 없다. 스케줄러(ADR 0004)와 30일 정리를 같은 DB에서 처리한다.
- 감수하는 리스크와 대응:
  - 수집이 1주 넘게 멈추면 프로젝트가 일시정지된다 → ADR 0004의 watchdog으로 감시한다.
  - 자동 백업이 없다 → 30일 이력은 다시 쌓을 수 있는 데이터라 감수한다.
  - Prisma 7→8 전환기다 → 버전을 고정하고 업그레이드는 별도 작업으로 한다.
  - 보관 기간을 1년으로 늘리면 500 MB를 넘는다 → 그때 다운샘플링 테이블이나 DB를 다시 검토한다.
- 후속 작업: E-02에서 프로비저닝, Prisma 설정, 첫 마이그레이션을 한다. pooler에서의 prepared statement 동작과 Marketplace 설치 시 Free 플랜 선택 가능 여부를 확인한다.

## 근거 자료

- `docs/research/infra.md` §2
- https://supabase.com/pricing, https://supabase.com/docs/guides/platform/free-project-pausing
- https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
