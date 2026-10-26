# 0001. 게임 데이터 소스: Arrowhead 원본 주, 커뮤니티 API 폴백

| 항목 | 내용 |
| --- | --- |
| 상태 | 채택 |
| 날짜 | 2026-10-26 |
| 관련 요구사항 | R-01, R-04, C-07, C-08 |

## 배경

핵심 기능 1(전쟁 현황), 2(MO), 4(통계)와 게임 내 디스패치(기능 3 일부)를 채울 소스가 필요하다. 15분마다 수집하고(C-07), 화면은 한국어 우선(C-08)이다. 조사(`docs/research/game-api.md`) 결과 한국어 MO·디스패치를 주는 소스는 Arrowhead 원본뿐이고, 커뮤니티 API 관리자는 원본을 직접 호출하기보다 커뮤니티 API 사용을 권한다.

## 고려한 대안

| 대안 | 장점 | 단점 |
| --- | --- | --- |
| A. Arrowhead 원본 주 + 커뮤니티 폴백 | 한국어 MO·디스패치, 전송량 적음(하루 314회, 약 1.6 MB) | 공개 약관·레이트리밋 없음, 전쟁 시간 환산·마크업 처리 필요, 관리자 권고와 어긋남 |
| B. 커뮤니티 API(`api.helldivers2.dev`) 주 | 정규화된 데이터, ISO 시각, 권고 준수 | 한국어 없음(C-08 미충족), 10초 5회 IP 한도, 디스패치 매번 전체(472 KB) |

## 결정

**A를 채택한다.**

- 주 소스: Arrowhead 원본(`api.live.prod.thehelldiversgame.com`)
  - 15분마다 `Status`, `v2/Assignment`(`Accept-Language: ko-KR`), `NewsFeed?fromTimestamp=`(`ko-KR`)를 1회씩 호출한다.
  - `Stats/war/{id}/summary`는 1시간마다, `WarID`·`WarInfo`는 하루 1회 호출한다.
- 필수 보조: `helldivers-2/json` 정적 데이터에서 한국어 행성명(`ko-KO` 키), 진영 코드, MO 태스크·보상 해석 표를 가져와 빌드 시점에 반영한다.
- 폴백: 원본 호출이 실패하거나 zod 검증에 실패하면 해당 항목만 커뮤니티 API에서 영어로 가져온다. 필수 헤더 `X-Super-Client`·`X-Super-Contact`를 보내고, 호출 사이 2초 간격을 두며 429 응답 시 `Retry-After`를 따른다.
- 백필: 서비스 시작 시 Helldivers Training Manual API에서 최대 1주치 행성 이력을 1회만 가져온다(선택).

## 결과

- 이점: C-08을 충족하고 호출량이 작다. 소스가 2개라 한쪽이 중단돼도 공백을 줄인다.
- 감수하는 리스크와 대응:
  - 원본은 비공식 공개 엔드포인트라 예고 없이 바뀔 수 있다 → zod 검증, 폴백, 수집 실패를 DB에 기록한다.
  - 관리자 권고와 어긋난다 → 호출을 15분에 3회 수준으로 제한한다. 커뮤니티 API 저장소에 `ko-KR` 동기화 추가를 요청하는 이슈 등록을 검토한다(사용자 판단).
  - 최신 디스패치가 번역 전 영어로 올 수 있다 → 영어 원문을 먼저 보여주고 다음 수집 때 갱신한다.
  - 시간 값은 전쟁 시간(초)이다 → `(응답 Date − Status.time) + 전쟁 시간`으로 환산한다.
- 후속 작업: E-04 스모크 테스트에서 Vercel 송신 IP의 429 여부, 디펜스 이벤트 응답 형태, `globalEvents`의 한국어 지원을 확인한다.

## 근거 자료

- `docs/research/game-api.md`
- https://github.com/helldivers-2/api, https://github.com/helldivers-2/json
