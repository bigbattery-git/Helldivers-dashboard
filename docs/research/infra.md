# R-03 인프라 조사: DB · ORM · 스케줄러 · 캐싱

- 조사일: 2026-10-26 (모든 요금·한도는 이 날짜에 아래 공식 문서에서 확인)
- 전제 (SRS C-02·C-03·C-07): Next.js(App Router, TS)를 Vercel **Hobby**에 배포, 수집 **15분 간격**, 시계열 **30일 보관**, 비용 0원
- 이 문서는 **권장안**이다. 최종 결정은 ADR(`srs-sync`)로 한다.
- 계정 생성·프로비저닝은 하지 않았다. 수치는 문서 기준이며, 실측이 필요한 항목은 [확인하지 못한 항목](#7-확인하지-못한-항목)에 모았다.

## 0. 요약 (권장)

| 항목 | 권장 | 대안 |
| --- | --- | --- |
| DB | **Supabase Postgres (Free)** | Neon (Free) |
| ORM | **Drizzle ORM** (`postgres` 드라이버, Supavisor transaction pooler, `prepare: false`) | Prisma ORM 7 |
| 스케줄러 | **Supabase Cron (pg_cron + pg_net)** → Vercel `/api/collect` 15분마다 호출 | cron-job.org 또는 Upstash QStash. Vercel Schedules가 정식 공개되면 1순위로 재검토 |
| 30일 초과분 삭제 | pg_cron 일 1회 `DELETE` (DB 내부에서 실행, HTTP 불필요) | 수집 작업 끝에 `DELETE` |
| 캐싱 | `cacheComponents` + `'use cache'` + `cacheTag` + `cacheLife`, 수집 후 `revalidateTag` | — |
| 보조 | Vercel Hobby Cron(하루 1회)을 수집 신선도 감시용(watchdog)으로 | — |

근거 요약:
1. 15분 주기 × 30일은 월 2,880회 실행이다. Vercel Hobby Cron은 하루 1회만 허용하고, private 저장소의 GitHub Actions는 월 2,000분 무료 한도를 넘는다(2,880분 이상). Supabase pg_cron은 DB 안에서 돌아서 계정·서비스를 하나 더 늘리지 않는다.
2. Supabase Free는 컴퓨트 시간 한도가 없고, 15분마다 쓰기가 들어오면 "1주 비활성 시 일시정지" 조건에 걸리지 않는다. Neon Free는 scale-to-zero 구조라 15분마다 깨우는 것만으로 월 컴퓨트 한도(100 CU-h)의 약 67%를 쓰고, 읽기 타이밍에 따라 한도를 넘을 수 있다.
3. 전 행성을 저장해도 30일치는 약 75~90 MB로 Supabase 500 MB 안에 여유 있게 들어간다. Drizzle은 코드 생성 단계와 엔진 바이너리가 없어 서버리스 콜드 스타트 부담이 적고, 시계열 집계 SQL(`date_trunc`, 윈도 함수)을 쓰기 쉽다.

## 1. Vercel Hobby 기준선

| 항목 | Hobby 한도 | 출처 |
| --- | --- | --- |
| Cron 빈도 | **하루 1회**. 더 잦은 식은 배포 실패 ("Hobby accounts are limited to daily cron jobs") | [Cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) |
| Cron 정확도 | 시간 단위(±59분). `0 1 * * *`은 1:00~1:59 사이 실행 | 같은 페이지 |
| Cron 수 | 프로젝트당 100개 | 같은 페이지 |
| Cron 재시도 | **없음** ("Vercel will not retry an invocation if a cron job fails"). 전달은 best effort이고 중복 호출도 있을 수 있음 | [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) |
| Cron 보호 | `CRON_SECRET` 환경변수를 넣으면 `Authorization: Bearer <값>` 헤더로 전송 | 같은 페이지 |
| 함수 최대 실행 시간 | 300초 (기본값이자 최대, Fluid compute) | [Functions limits](https://vercel.com/docs/functions/limitations) |
| 함수 메모리 | 2 GB / 1 vCPU | 같은 페이지 |
| 월 포함량 | 함수 호출 1M, Active CPU 4시간, Provisioned Memory 360 GB-h, Fast Data Transfer 100 GB, ISR Reads 1M, ISR Writes 200k, CDN Requests 1M, Queue API 1M | [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines), [Pricing](https://vercel.com/pricing) |
| 초과 시 | Hobby는 추가 사용량을 살 수 없고 한도에서 막힘 | [Pricing FAQ](https://vercel.com/pricing) |
| 상업적 이용 | Hobby는 **비상업 개인 용도만**. 광고(AdSense 등) 게재도 상업 이용. 후원 요청은 허용 | [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) |
| Runtime 로그 보관 | 1시간 | [Limits](https://vercel.com/docs/limits) |

수집 함수의 Vercel 사용량 추정 (월 2,880회 실행, 1회 CPU 0.5초·벽시계 5초로 가정):

- 호출 수 2,880 / 1,000,000 (0.3%)
- Active CPU 약 24분 / 4시간 (10%)
- Provisioned Memory 2 GB × 4시간 = 8 GB-h / 360 GB-h (2%)

→ 수집 자체는 Hobby 한도 안에 충분히 들어간다.

### 1.1 신규: Vercel Schedules (상태 미확정)

`https://vercel.com/docs/llms-full.txt`(2026-10-26 갱신분)에는 Cron Jobs 후속으로 **Vercel Schedules** 문서가 들어 있다. 그러나 같은 날 `https://vercel.com/docs/schedules` 및 하위 페이지는 **HTTP 404**였고 공개 사이트맵에도 없다. CLI(`vercel schedules`)는 베타로 표기되어 있다. 정식 공개 전이거나 단계적 출시 중으로 보인다.

llms-full.txt에 적힌 내용:

- Hobby cron 스케줄은 **최소 15분 간격**이 가능하다 ("Hobby cron schedules can run at most once every 15 minutes").
- Hobby의 jitter는 **15분으로 고정**된다. 15분 스케줄이면 각 실행이 15분 창 안 아무 때나 일어나므로, 실행 간격은 실제로 0~30분 사이에서 흔들린다.
- 늦은 실행은 만료 전까지 재실행된다(Hobby 15분 스케줄은 30분 뒤 만료). 재시도 때문에 중복 전달이 생길 수 있어 `executionId`로 중복을 걸러야 한다.
- target은 path(`CRON_SECRET` Bearer), 비공개 function(`schedule/v1beta` trigger, 인터넷에서 접근 불가), queue topic 중에서 고른다. 지금은 production 배포만 지원한다.
- Hobby 팀당 스케줄 1,000개.

→ 정식 공개되면 외부 서비스 없이 Vercel 안에서 15분 수집이 가능해 **스케줄러 1순위 후보**가 된다. P2 착수 시 공개 여부를 다시 확인하고, 그전까지는 채택하지 않는다.

## 2. DB 비교

### 2.1 비교표

| 항목 | Neon Free | Supabase Free | Prisma Postgres Free | Turso Free | Upstash Redis Free |
| --- | --- | --- | --- | --- | --- |
| 엔진 | Postgres | Postgres | Postgres | libSQL (SQLite) | Redis |
| Vercel Marketplace | 네이티브 | 네이티브 | 네이티브 | 네이티브 | 네이티브 |
| 저장 용량 | 프로젝트당 1 GB (계정 20 GB) | 프로젝트당 500 MB | 2 GB | 5 GB | 250 MB |
| 컴퓨트 | 프로젝트당 월 100 CU-h (0.25 CU면 400시간) | 공유 CPU, 500 MB RAM. 시간 한도 없음 | 문서에 컴퓨트 한도 없음, 대신 연산 수로 과금 | 문서에 없음 | 문서에 없음 |
| 요청·연산 | egress 5 GB | egress 5 GB (+캐시 egress 5 GB) | **월 200k operations** (쿼리 1개 = 1 op) | 월 rows read 500M / rows written 10M | **월 500K commands**, 대역폭 10 GB |
| 비활성 정책 | 5분 유휴 시 scale-to-zero (끌 수 없음). 데이터 삭제 없음 | **1주 비활성 시 프로젝트 일시정지** (1년 내 복구 가능). 활성 프로젝트 2개 | 문서에 없음 ("Free forever") | 문서에 없음 | FAQ: 최소 30일 비활성 시 아카이브 (경고 메일 후) |
| 한도 초과 시 | CU-h·egress 소진 시 다음 결제 주기까지 컴퓨트 정지. 용량 초과 시 쓰기 실패 | 문서상 명시 없음 (확인 필요) | Free spend limit $0 고정, 차단 방식은 문서에 없음 | 문서에 없음 | 초과 요청 거부(요청 크기). 월 한도 초과 동작은 미확인 |
| 백업·PITR | 6시간 히스토리 (1 GB 상한) | 자동 백업 없음 | 문서 확인 못함 | PITR 1일 | — |
| 서버리스 드라이버 | `@neondatabase/serverless` (HTTP/WebSocket) 1.2.0 | Supavisor pooler(6543) + `postgres`/`pg`, REST(`supabase-js`) | `@prisma/adapter-pg`(pooled TCP), `@prisma/adapter-ppg`(HTTP/WS 서버리스 드라이버) | `@libsql/client` (HTTP) 0.18.0 | `@upstash/redis` (HTTP) |
| 30일 삭제 방식 | 수집 끝 `DELETE`. pg_cron은 컴퓨트가 깨어 있을 때만 동작(미확인) | **pg_cron 일 1회 `DELETE`** 또는 수집 끝 `DELETE` | 수집 끝 `DELETE` | 수집 끝 `DELETE` | 키 단위 `EXPIRE`(TTL). ZSET 멤버는 `ZREMRANGEBYSCORE` 필요 |
| Drizzle | 네이티브(`neon-http`, `neon-serverless`) | 지원(`postgres` + `prepare: false`) | 지원(Postgres 직결) | 네이티브(`libsql`) | 해당 없음 |
| Prisma | 지원(`@prisma/adapter-neon`) | 지원(`@prisma/adapter-pg`) | 1급 지원 | adapter-libsql. 마이그레이션 제약 있음(미확인) | 해당 없음 |
| 시계열 적합성 | 좋음 (SQL 집계) | 좋음 (SQL 집계 + pg_cron) | 좋음. 단 연산 수 한도가 병목 | 보통 (SQL 가능, 확장 기능 없음) | **나쁨** (아래 계산 참조) |

출처 (모두 2026-10-26 확인):
[Neon pricing](https://neon.com/pricing), [Neon plans](https://neon.com/docs/introduction/plans), [Neon Vercel-managed integration](https://neon.com/docs/guides/vercel-managed-integration),
[Supabase pricing](https://supabase.com/pricing), [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing),
[Prisma pricing](https://www.prisma.io/pricing), [Turso pricing](https://turso.tech/pricing),
[Upstash Redis pricing](https://upstash.com/pricing/redis), [Upstash Redis FAQ](https://upstash.com/docs/redis/help/faq),
[Vercel Marketplace storage](https://vercel.com/marketplace/category/storage), [Postgres on Vercel](https://vercel.com/docs/postgres)

Marketplace 메모:
- 다섯 서비스 모두 Vercel Marketplace **네이티브 통합**이다. 설치하면 자격증명과 환경변수가 Vercel 프로젝트에 주입되고, 결제도 Vercel 쪽에서 관리한다 ([Postgres on Vercel](https://vercel.com/docs/postgres)). Vercel Postgres는 2024-12에 Neon으로 이관되어 종료됐다.
- Neon(Vercel-managed)이 주입하는 변수: `DATABASE_URL`(pooled), `DATABASE_URL_UNPOOLED`(direct), `PG*`, 레거시 `POSTGRES_*`. Preview 배포마다 브랜치를 만드는 옵션은 Free의 브랜치 10개 한도를 먹는다.
- Marketplace 경유 설치에서 각 서비스의 Free 플랜을 고를 수 있는지는 설치 화면에서 확인해야 한다(조사 범위상 미확인).

### 2.2 용량 추정

가정 스키마 (Postgres, 행성 스냅샷 1행):

```
planet_snapshot(planet_index int2, collected_at timestamptz, player_count int4,
                health int4, owner int2, liberation real4, regen_per_sec real4)
PRIMARY KEY (collected_at, planet_index)
```

- 힙 튜플: 헤더 24 B + 데이터 40 B(정렬 포함) + line pointer 4 B ≈ 68 B
- PK 인덱스: 약 28~31 B
- → **행당 약 100 B**. DELETE로 생기는 dead tuple은 autovacuum이 재사용하므로 여유분 +20%를 둔다.

| 시나리오 | 30일 행 수 | 30일 용량 | 1년 행 수 (참고) | 1년 용량 (참고) |
| --- | --- | --- | --- | --- |
| A. 전 행성 260개 | 260 × 96 × 30 = **748,800** | 약 75 MB (bloat 포함 약 90 MB) | 9,110,400 | 약 0.9~1.1 GB |
| B. 활성 행성만 (50개로 보수 가정) | 50 × 96 × 30 = **144,000** | 약 14 MB (약 17 MB) | 1,752,000 | 약 175~210 MB |
| 전역 통계 (동접자 등, 96회/일) | 2,880 | 1 MB 미만 | 35,040 | 약 5 MB |
| MO 진행률 (목표 5개 가정) | 14,400 | 약 1.5 MB | 175,200 | 약 18 MB |

Postgres 계열 무료 한도 대비 (30일, 시나리오 A 기준 약 90 MB + 전역 약 3 MB):

| DB | 한도 | A 사용률 | B 사용률 | 비고 |
| --- | --- | --- | --- | --- |
| Supabase | 500 MB | 약 19% | 약 4% | 빈 프로젝트 기본 스키마(auth, storage 등)가 차지하는 양은 미실측. 1년 보관 A는 초과 |
| Neon | 1 GB | 약 9% | 약 2% | 1년 보관 A는 한도 근접 |
| Prisma Postgres | 2 GB | 약 5% | 약 1% | 용량보다 연산 수가 병목 (2.4) |
| Turso | 5 GB | 약 2% 미만 | 1% 미만 | SQLite는 행이 더 작음 |

결론: 30일 보관이면 **시나리오 A(전 행성 저장)도 모든 Postgres 후보에서 안전**하다. 활성 행성만 저장하면 비활성 행성의 "점령 전환" 시점을 놓칠 수 있으므로 A를 권장한다. 다만 보관 기간을 1년으로 늘리면 Supabase 500 MB를 넘으니, 그때는 일·시간 단위 다운샘플링 테이블을 따로 두거나 DB를 다시 검토한다.

원본 JSON 응답을 매번 jsonb로 쌓는 방식은 권장하지 않는다(응답 크기에 비례해 수십 MB씩 늘어난다). 최신 원본 1건만 덮어써서 보관하면 디버깅에는 충분하다.

### 2.3 Neon scale-to-zero 컴퓨트 계산

Neon Free 조건: 5분 유휴 후 정지(끌 수 없음), 월 100 CU-h, `CU-h = 컴퓨트 크기 × 실행 시간`.

| 시나리오 | 계산 (0.25 CU 고정, autoscaling 상한도 0.25 가정) | 월 CU-h | 한도 대비 |
| --- | --- | --- | --- |
| 수집만 (깨어남 1회 = 유휴 5분 + 작업 약 0.5분) | 96회 × 5.5분 = 8.8시간/일 → 약 268시간/월 × 0.25 | **약 67** | 67% |
| 수집 + 수집 직후가 아닌 시점의 캐시 재생성 (15분 창마다 추가로 1회 깨어남) | 96 × 11분 = 17.6시간/일 → 약 535시간/월 × 0.25 | **약 134** | **134% (초과)** |
| 상시 가동 | 730시간 × 0.25 | 182.5 | 183% (초과) |

→ Neon을 쓰려면 화면용 캐시 재생성이 **수집 직후 DB가 깨어 있는 창 안에서** 일어나야 한다. 예를 들어 수집 함수가 `revalidateTag` 뒤에 주요 페이지를 직접 한 번 요청해 캐시를 데워야 한다. autoscaling 상한을 0.25 CU 넘게 두면 같은 시간에 CU-h가 비례해서 늘어난다. 한도를 넘기면 그 달 남은 기간 동안 컴퓨트가 정지되어(데이터는 보존) 대시보드가 멈춘다. 이 위험 때문에 1순위에서 뺐다.

Supabase Free는 컴퓨트 시간 한도가 없어 이 계산이 필요 없다.

### 2.4 연산 수 과금형 (Prisma Postgres, Turso, Upstash) 계산

- **Prisma Postgres (월 200k ops)**: 수집 1회 = `createMany` 1 + `deleteMany` 1 + 전역 upsert 약 3 ≈ 5 ops → 월 14,400 (7%). 캐시된 화면 쿼리 5개가 15분마다 재생성되면 다시 14,400. 여기까지는 여유가 있다. 그러나 행성 상세 페이지(260개)가 각각 15분마다 재생성되는 최악의 경우 260 × 2,880 = 748,800 ops로 **한도를 넘는다**. 상세 페이지는 `cacheLife`를 길게 잡거나 lazy 재생성(`revalidateTag(tag, 'max')`)에 맡겨야 한다.
- **Turso (rows written 월 10M)**: A 시나리오에서 insert 748,800 + 정상 상태의 delete 748,800 ≈ 1.5M (15%). rows read 500M은 캐시를 거치면 여유가 있다. 다만 인덱스 쓰기나 delete가 rows written에 어떻게 집계되는지는 미확인이다.
- **Upstash Redis (월 500K commands, 250 MB)**:
  - 행성마다 ZSET에 `ZADD`하면 A 시나리오에서 260 × 2,880 = 748,800 commands로 **초과**한다. B(50개)도 `ZADD` + `ZREMRANGEBYSCORE`로 약 288k(58%)를 쓰고, 읽기까지 더하면 빠듯하다.
  - 스냅샷 1회를 키 1개(JSON, `EX 30d`)로 저장하면 쓰기는 2,880 commands로 줄어든다. 하지만 행성 1개의 30일 추이를 보려면 키 2,880개를 읽어야 해서 10 GB 대역폭이 금방 소진된다.
  - → **시계열 주 저장소로는 부적합**하다. 쓴다면 분산 락이나 "최신 상태 1건" 캐시 용도에 맞다(이번 권장안에는 넣지 않음).

### 2.5 ORM 비교 (Drizzle vs Prisma)

| 항목 | Drizzle ORM | Prisma ORM |
| --- | --- | --- |
| 최신 버전 (npm `latest`, 2026-10-26) | `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11 (1.0은 RC 단계) | `@prisma/client` 7.10.1. 단 `prisma` CLI의 `latest` 태그가 **8.0.0-rc.27**을 가리킴(버전 고정 필요) |
| 스키마·타입 | TS 코드로 스키마 정의, 타입 추론. 코드 생성 단계 없음 | `schema.prisma` → `prisma generate`로 클라이언트 생성 |
| 마이그레이션 | `drizzle-kit generate` / `migrate` (SQL 파일) | `prisma migrate dev/deploy` |
| 서버리스 | 드라이버 위에 얇은 계층이라 번들이 작고 콜드 스타트 부담이 적음 | v7부터 Rust 엔진이 빠지고 **driver adapter 필수**(`new PrismaClient({ adapter })`) |
| 시계열 쿼리 | `sql` 템플릿으로 `date_trunc`·윈도 함수를 자연스럽게 섞을 수 있음 | 집계는 `$queryRaw` 의존도가 높음 |
| Supabase 연결 | `postgres(url, { prepare: false })` (transaction pool mode에서 prepared statement 미지원) | `@prisma/adapter-pg` + pooler URL, 마이그레이션은 direct URL |
| Neon 연결 | `drizzle-orm/neon-http`(단건·비대화형 트랜잭션), `neon-serverless`(WebSocket, 대화형 트랜잭션) | `@prisma/adapter-neon` |

출처: context7 `/drizzle-team/drizzle-orm-docs`([connect-neon](https://orm.drizzle.team/docs/connect-neon), [connect-supabase](https://orm.drizzle.team/docs/connect-supabase)), context7 `/websites/prisma_io`([Prisma 7 upgrade guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)), npm registry dist-tags.

→ **Drizzle 권장**. 이 프로젝트의 쿼리는 "시간 버킷 집계"가 중심이라 SQL에 가까운 쪽이 유리하다. Prisma는 지금 7→8 전환기라 버전이 흔들리고 있다.

## 3. 스케줄러 비교

15분 주기 = 하루 96회 = **월 약 2,880회** (31일이면 2,976회).

| 스케줄러 | 최소 주기 | 15분 주기가 무료 안인가 | 재시도 | 엔드포인트 보호 | 비고 |
| --- | --- | --- | --- | --- | --- |
| Vercel Cron (Hobby) | **하루 1회** (±59분) | 불가 | 없음 | `CRON_SECRET` → `Authorization: Bearer` | 하루 1회 작업(감시·정리)에만 사용 |
| Vercel Schedules (Hobby) | 15분 (jitter 15분 고정) | 가능 (공개 문서 404, **상태 미확정**) | 만료 전까지 늦은 실행, 재전달 시 중복 가능 | path: `CRON_SECRET` Bearer / function target: 비공개 | 1.1 참조. P2에서 재확인 |
| GitHub Actions `schedule` | 5분 | **private 저장소(현재 이 저장소): 불가**. 월 2,000분 무료인데 job 1회당 최소 1분으로 올림 → 2,880분 이상(144%). public 저장소면 무료 | 기본 없음 (`curl --retry`로 보완) | Repository secret → `curl -H "Authorization: Bearer ..."` | 부하가 높으면 지연되거나 job이 누락됨. public 저장소는 60일 동안 활동이 없으면 스케줄 자동 비활성화. 기본 브랜치에서만 동작 |
| Upstash QStash Free | cron식 (1분 단위로 보임, 명시 없음) | 가능. 일 1,000 메시지 중 96 + 재시도 | 기본 3회, 지수 백오프 `min(86400, e^(2.5n))`초. 재시도도 메시지 수에 포함 | `Upstash-Signature` JWT를 `@upstash/qstash` `Receiver`(current/next signing key)로 검증 | 활성 스케줄 10개, 응답 대기 최대 15분, DLQ 3일 |
| cron-job.org | 1분 | 가능 (완전 무료, 작업 수 제한 없음) | 문서에 없음 | 임의 커스텀 헤더 지원 → Bearer 시크릿 | 요청 타임아웃 30초, 25회 연속 실패 시 자동 비활성화 + 메일 알림. 후원 운영이며 SLA 없음 |
| Supabase Cron (pg_cron + pg_net) | 초 단위 (`'30 seconds'`, PG 15.1.1.61+) | 가능 (DB 안에서 실행, 추가 과금 없음. 무료 플랜 제공 여부는 공식 명시를 못 찾음) | pg_cron·pg_net 모두 재시도 없음 | `net.http_post`에 `Authorization` 헤더를 넣고, 시크릿은 Supabase Vault(`vault.decrypted_secrets`)에서 읽음 | 동시 실행 8개 이하, 작업당 10분 이하 권장. pg_net 기본 타임아웃 **2초**(늘려야 함), 응답은 `net._http_response`에 6시간 보관, 실행 이력은 `cron.job_run_details` |
| Cloudflare Workers Cron Triggers | 1분 (`* * * * *` 예시) | 가능. Free 계정당 트리거 5개, 일 100,000 요청 | 문서에 없음 | Worker secret → `fetch`에 Bearer 헤더 | CPU 10 ms/실행(I/O 대기는 별도), 벽시계 최대 15분, 서브요청 50개. Worker를 따로 배포해야 함 |

출처 (2026-10-26 확인):
[Vercel Cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), `https://vercel.com/docs/llms-full.txt`(Schedules 절),
[GitHub Actions events: schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [Actions minute multipliers](https://docs.github.com/en/billing/reference/actions-minute-multipliers),
[QStash pricing](https://upstash.com/pricing/qstash), [QStash retry](https://upstash.com/docs/qstash/features/retry), [QStash schedules](https://upstash.com/docs/qstash/features/schedules), [QStash signature](https://upstash.com/docs/qstash/howto/signature),
[cron-job.org FAQ](https://cron-job.org/en/faq/),
[Supabase Cron](https://supabase.com/docs/guides/cron), [Supabase Cron quickstart](https://supabase.com/docs/guides/cron/quickstart), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net),
[Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

저장소 공개 여부: `gh repo view` 결과 이 저장소(`bigbattery-git/Helldivers-dashboard`)는 **PRIVATE**이다. 공개로 바꾸면 GitHub Actions도 무료 후보가 되지만, 지연·누락과 60일 비활성 정지 정책이 있어 주 스케줄러로는 권장하지 않는다.

### 3.1 수집 엔드포인트 공통 설계 (스케줄러와 무관)

- `POST /api/collect` (Route Handler, Node.js 런타임). `Authorization: Bearer ${CRON_SECRET}`가 일치하지 않으면 401을 돌려준다. 비교는 상수 시간 비교(`crypto.timingSafeEqual`)로 한다.
- **멱등성**: `collected_at`을 15분 슬롯으로 내림해 저장하고 `UNIQUE(planet_index, slot)` + `ON CONFLICT DO NOTHING`을 건다. 그러면 중복 호출(Vercel Cron·Schedules·QStash 재시도)이 와도 데이터가 두 번 쌓이지 않는다.
- 실행 시간: 외부 API 몇 건과 DB 일괄 insert면 수 초 안에 끝나야 한다. pg_net 타임아웃(기본 2초)과 cron-job.org 타임아웃(30초)을 고려해 `maxDuration`은 60초 이하로 둔다.
- 외부 API 호출은 이 함수에서만 하고, 식별 `User-Agent`와 소스가 요구하는 헤더(`X-Super-Client`, `X-Super-Contact`)를 넣는다 (CLAUDE.md 데이터 수집 규칙).
- 감시: Vercel Hobby Cron(하루 1회)으로 `/api/cron/watchdog`를 호출해 마지막 `collected_at`이 1시간 넘게 지났으면 오류 로그를 남긴다. Hobby 런타임 로그는 1시간만 보관되므로, 실패 기록은 DB에 남기는 편이 낫다.

### 3.2 권장 스케줄러 구성 예 (Supabase)

```sql
-- secret stored once via Vault (value set manually in dashboard / SQL, never committed)
select cron.schedule(
  'collect-every-15m', '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://<prod-domain>/api/collect',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
       body := '{}'::jsonb,
       timeout_milliseconds := 60000) $$);

select cron.schedule(
  'purge-older-than-30d', '17 3 * * *',
  $$ delete from planet_snapshot where collected_at < now() - interval '30 days' $$);
```

- 수집(pg_cron → Vercel → Supabase 쓰기)이 계속 도는 동안은 "1주 비활성 일시정지" 조건이 생기지 않는다.
- 반대로 수집이 1주 넘게 멈추면 프로젝트가 일시정지되고 pg_cron도 함께 멈춘다. 그래서 위의 watchdog이 필요하다.
- Vercel 함수 리전(Hobby 기본 `iad1`)과 Supabase 리전(예: `us-east-1`)을 맞춰 지연을 줄인다.

## 4. 캐싱 전략 (Next.js 16)

기준 버전: `next` npm `latest` = **16.4.3** (2026-10-23 배포). 문서는 context7 `/vercel/next.js/v16.2.9`와 GitHub `vercel/next.js@v16.4.3`의 `docs/`로 확인했다.

### 4.1 원칙

```
[스케줄러] → POST /api/collect ──(외부 API: 유일한 호출 지점)──> [DB 쓰기] → revalidateTag('war', 'max')
[사용자] → CDN / ISR 캐시 → (재생성 때만) 'use cache' 함수 → DB 읽기
```

- 화면(Server Component)은 **DB만 읽고**, 외부 API는 수집 함수만 호출한다. 그러면 사용자 수와 관계없이 외부 API 호출은 15분에 1회로 고정되어 레이트리밋을 지킬 수 있다.
- 클라이언트 컴포넌트는 외부 API를 직접 부르지 않는다. 클라이언트 쪽 갱신이 필요하면 캐시된 데이터 함수를 감싼 내부 Route Handler(GET)만 부른다.

### 4.2 권장 API 사용법 (Next.js 16 기준)

| 용도 | 권장 | 근거 |
| --- | --- | --- |
| 캐시 모델 | `next.config.ts`에 `cacheComponents: true` | `use cache`·`cacheTag`의 전제 조건 |
| 데이터 함수 캐시 | `'use cache'` + `cacheTag('war')` + `cacheLife(...)` | `unstable_cache`는 Next.js 16에서 `use cache`로 대체됨 (문서 Note) |
| 주기 | `cacheLife({ revalidate: 900, expire: 3600 })` 같은 커스텀 프로필 또는 `default` 프로필(stale 5분, revalidate 15분, expire 없음) | 수집 주기 15분과 맞춤. `expire`는 수집이 멈췄을 때 너무 오래된 화면을 막는 안전장치 |
| 수집 후 무효화 | Route Handler에서 `revalidateTag('war', 'max')` (SWR: 다음 방문 때 stale을 주고 백그라운드에서 재생성) | `updateTag`는 Server Action 전용. 두 번째 인자 없는 `revalidateTag(tag)`는 deprecated |
| 즉시 만료가 필요할 때 | `revalidateTag(tag, { expire: 0 })` (다음 요청이 blocking 재생성) | 웹훅·외부 서비스용으로 문서화됨 |
| route segment `export const revalidate` | 쓰지 않음 | Cache Components를 켜면 `dynamic`·`revalidate`·`fetchCache`는 `use cache`/`cacheLife`로 대체 |
| 인스턴스 간 공유가 필요한 런타임 캐시 | `'use cache: remote'` (Vercel Runtime Cache) | Vercel에서 `use cache`는 기본적으로 인스턴스 메모리 캐시. 단 프리렌더된 결과는 ISR로 저장됨 |

예시:

```ts
// src/lib/war.ts
import { cacheLife, cacheTag } from 'next/cache';

export async function getWarOverview() {
  'use cache';
  cacheTag('war');
  cacheLife({ revalidate: 900, expire: 3600 });
  return db.select(/* ... */);
}
```

### 4.3 Vercel 사용량 관점

- 페이지 데이터가 모두 `use cache`로 덮이면 정적 셸로 프리렌더되어 CDN/ISR에서 서빙된다. CDN 캐시 읽기·쓰기는 무료이고, ISR 내구 저장소의 읽기·쓰기만 과금 단위(8 KB)로 센다.
- ISR Writes 추정: 페이지 1개(압축 후 약 40 KB ≈ 5 units) × 재생성 2,880회/월 = 14,400 units. 주요 페이지 4개면 약 57,600 / 200,000 (29%). 내용이 바뀌지 않으면 write가 생기지 않으므로 출력에 `new Date()`·`Math.random()`을 넣지 않는다.
- 행성 상세 페이지 260개는 방문이 있을 때만 재생성되게 하고(`'max'`), 모든 행성을 미리 프리렌더하지 않는다. 그래야 ISR Writes와 DB 연산을 아낄 수 있다.
- 재검증 호출 한도는 Hobby 팀당 초당 50회(30초 평균)다. 수집 1회에 태그 몇 개만 무효화하므로 문제없다.
- Hobby에서는 팀의 모든 프로젝트가 data cache 하나를 공유한다(LRU 축출).

출처: [ISR usage & pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing), [Pricing](https://vercel.com/pricing), `https://vercel.com/docs/llms-full.txt`(Runtime Cache / Data cache 절), [Next.js `revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag), [`cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife), [`unstable_cache`](https://nextjs.org/docs/app/api-reference/functions/unstable_cache), [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)

## 5. 대안 조합과 기각 사유

| 조합 | 판단 | 사유 |
| --- | --- | --- |
| Supabase + Drizzle + pg_cron | **권장** | 2절·3절 근거 |
| Neon + Drizzle(`neon-http`) + cron-job.org 또는 QStash | 차선 | 용량 여유(1 GB)와 브랜칭은 좋다. 그러나 15분 주기 깨우기만으로 CU-h 67%를 쓰고, 캐시 재생성 타이밍에 따라 초과한다. 외부 스케줄러 계정도 하나 더 필요 |
| Vercel Schedules + (Supabase 또는 Neon) | 보류 | 정식 공개 확인 후 재검토. 공개되면 pg_cron을 대체할 수 있다(Vercel 안에서 관리, 비공개 function target) |
| Prisma Postgres + Prisma | 보류 | 용량은 넉넉하지만 월 200k 연산이 화면 재생성 방식에 민감하고, Prisma 7→8 전환기 |
| Turso + Drizzle | 보류 | 무료 한도는 넉넉하다. 그러나 스케줄러·보관 정리를 모두 앱에서 처리해야 하고, Postgres 생태계(pg_cron, 시간 함수)를 쓸 수 없음 |
| Upstash Redis 단독 | 기각 | 시계열 저장 시 명령 수·대역폭 한도 초과 (2.4) |
| GitHub Actions 주 스케줄러 | 기각 | private 저장소에서는 월 분 한도 초과. public으로 바꿔도 지연·누락, 60일 비활성 정지 |
| Vercel Hobby Cron 단독 | 기각 | 하루 1회 제한 |

## 6. 리스크와 대응

| 리스크 | 대응 |
| --- | --- |
| Supabase 일시정지 (수집이 1주 넘게 멈춘 경우) | 하루 1회 Vercel Cron watchdog. 일시정지돼도 1년 안에는 대시보드에서 복구 가능 |
| Supabase Free 자동 백업 없음 | 30일 롤링 데이터라 손실 영향이 제한적이다. 필요하면 주 1회 `pg_dump`를 GitHub Actions로 돌리는 방안을 검토 (월 4~5분) |
| pg_cron·pg_net에 재시도 없음 | 다음 15분 주기가 사실상 재시도 역할. 수집을 멱등으로 만들어 수동 재실행도 안전하게 |
| 스케줄러와 DB가 같은 벤더 (Supabase 장애 시 둘 다 정지) | DB가 죽으면 수집도 의미가 없으므로 허용. 필요하면 cron-job.org를 보조로 추가 (멱등성 덕분에 중복 무해) |
| Vercel Hobby 상업 이용 금지 | 광고·결제·제휴 링크를 넣지 않는다. 후원 링크는 허용 |
| 보관 기간 연장 요구 | 원본 15분 데이터는 30일만 두고, 시간·일 단위 집계 테이블을 따로 두면 1년치도 수 MB 수준 |

## 7. 확인하지 못한 항목

- **Vercel Schedules 공개 상태**: llms-full.txt에는 있지만 `/docs/schedules`는 404였다. Hobby 15분 지원, 무료 포함 여부, GA 시점 모두 미확정.
- **Supabase Cron(pg_cron·pg_net)의 Free 플랜 제공 여부**: 공식 문서에서 플랜별 명시를 찾지 못했다. 확장 목록에는 있다. 프로비저닝 후 `create extension` 가능 여부를 확인해야 한다.
- **Supabase 비활성 판정 기준**: 문서는 "주간 사용자 DB 활동이 충분하지 않으면"이라고만 쓴다. 외부 함수의 15분 쓰기가 활동으로 집계된다고 판단했지만 명시적 보장은 없다.
- **Supabase 빈 프로젝트의 기본 DB 크기**: 500 MB 중 기본 스키마 몫은 미실측.
- **Supabase Free 한도 초과 시 동작**: 읽기 전용 전환인지 등은 미확인.
- **Marketplace 경유 설치 시 Free 플랜 선택 가능 여부**: Neon·Supabase·Prisma·Turso·Upstash 모두 설치 화면에서 확인 필요.
- **Upstash Redis**: 월 명령 한도를 넘었을 때의 동작, 파이프라인 안의 명령이 각각 집계되는지.
- **Turso**: delete와 인덱스 갱신이 rows written에 어떻게 집계되는지. Prisma로 Turso 마이그레이션을 할 때의 제약.
- **Prisma Postgres**: 한도를 넘었을 때 차단 방식, pg_cron 같은 확장 지원 여부.
- **Neon**: 컴퓨트가 정지된 동안 pg_cron이 동작하지 않는다는 점(일반 동작으로 추정, 문서 미확인).
- **Vercel Runtime Cache(`use cache: remote`)의 Hobby 포함량**: 요금표에 Hobby 포함량이 없다.
- **QStash Free 재시도 상한**, cron-job.org·Cloudflare Cron의 재시도 동작: 문서에 없다.
- **pg_net 타임아웃과 Vercel 함수**: pg_net이 타임아웃으로 연결을 끊었을 때 Vercel 함수가 끝까지 실행되는지. 타임아웃을 함수 실행 시간보다 넉넉하게 잡아 피한다.
- **ISR write 단위 추정**: 페이지 크기(압축 후 40 KB)는 가정값이다. P2 첫 배포 후 Usage 대시보드로 실측한다.
