# 0004. 스케줄러: Supabase Cron(pg_cron + pg_net) → Vercel 수집 엔드포인트

| 항목 | 내용 |
| --- | --- |
| 상태 | 채택 |
| 날짜 | 2026-10-26 |
| 관련 요구사항 | R-03, R-04, C-03, C-07 |

## 배경

15분 주기 수집은 월 약 2,880회다. Vercel Hobby Cron은 하루 1회만 허용하고(C-03, 2026-10 재확인, 재시도 없음) 배포는 Vercel에 그대로 둔다(C-07).

## 고려한 대안

| 대안 | 장점 | 단점 |
| --- | --- | --- |
| Supabase Cron (pg_cron + pg_net) | DB 안에서 실행, 서비스 추가 없음, 30일 정리도 같은 곳 | 재시도 없음, pg_net 기본 타임아웃 2초, Free 지원 명시 못 찾음 |
| GitHub Actions `schedule` | 익숙함 | 저장소가 private이라 월 2,000분 초과(144%), 지연·누락 실례 있음 |
| Upstash QStash Free | 재시도·서명 검증 | 서비스 하나 추가, 일 1,000 메시지 |
| cron-job.org | 무료, 1분 주기 | SLA 없음, 30초 타임아웃 |
| Cloudflare Workers Cron | 무료 한도 넉넉 | Worker를 따로 배포해야 함 |
| Vercel Schedules | Vercel 안에서 15분 가능 | 공개 문서가 404, 상태 미확정 |

## 결정

- **주 스케줄러: Supabase Cron**이 15분마다 `net.http_post`로 Vercel `POST /api/collect`를 호출한다.
  - 시크릿은 Supabase Vault에 두고 `Authorization: Bearer <CRON_SECRET>`로 보낸다.
  - `timeout_milliseconds`를 60초로 늘린다.
- **30일 정리**: pg_cron이 하루 1회 30일 지난 행을 `DELETE`한다.
- **watchdog**: Vercel Hobby Cron(하루 1회)이 `/api/cron/watchdog`를 호출해 마지막 수집 시각이 1시간 넘게 지났으면 오류를 기록한다.
- 수집 엔드포인트는 시크릿을 상수 시간 비교(`crypto.timingSafeEqual`)로 검증하고, 슬롯 단위 `ON CONFLICT DO NOTHING`으로 중복 호출에 멱등하게 만든다.

## 결과

- 이점: 외부 서비스를 늘리지 않고 15분 수집과 30일 정리를 함께 해결한다.
- 감수하는 리스크와 대응:
  - Free 플랜에서 pg_cron·pg_net을 쓸 수 있다는 공식 명시를 찾지 못했다 → E-02에서 `create extension`으로 확인한다. 안 되면 cron-job.org(차선)로 바꾸고 이 ADR을 대체한다.
  - 재시도가 없어 한 슬롯이 빠질 수 있다 → 15분 뒤 다음 수집으로 메운다. 실패는 `cron.job_run_details`와 watchdog으로 확인한다.
  - Vercel Schedules가 정식 공개되면 더 나은 선택일 수 있다 → P2 착수 때 공개 여부를 다시 확인한다.
- 후속 작업: E-02(확장 활성화), E-03(`CRON_SECRET`을 `.env.example`에 추가), E-04(`/api/collect` 스모크 테스트).

## 근거 자료

- `docs/research/infra.md` §1, §3
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://supabase.com/docs/guides/cron, https://supabase.com/docs/guides/database/extensions/pg_net
