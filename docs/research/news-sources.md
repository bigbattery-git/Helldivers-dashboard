# R-02 뉴스/SNS 수집 경로 조사

- 조사일: 2026-10-26
- 범위: 핵심 기능 3(뉴스/패치노트), 4(통계 중 동접자 시계열). 게임 데이터 API(Arrowhead 공개 엔드포인트, helldivers2.dev)는 [game-api.md](game-api.md)에서 다룬다.
- 전제: 비용 0원, 서버 측 15분 간격 수집, 30일 보관, 한국어 우선 표시 (SRS C-02, C-05, C-07, C-08).
- 호출 원칙: 모든 요청에 `User-Agent: helldivers-dashboard-research (contact: GitHub Bigbattery)`를 넣고 엔드포인트당 1~2회만 호출했다. 키·토큰이 필요한 API는 호출하지 않았다.
- 표기: **확인** = 직접 호출하거나 1차 문서에서 본 사실, **추정** = 2차 자료나 정황으로 판단한 내용.

---

## 1. Steam Web API — `ISteamNews/GetNewsForApp`

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=553850&count=N&maxlength=N&feeds=steam_community_announcements` |
| 공식 여부 | 공식 (Valve) |
| 인증 | 없음 (키 불필요, 확인) |
| 응답 예시 | 아래 코드 블록 |
| 갱신 주기 | 공지가 올라올 때마다. 패치노트·공지는 주 1~3건 수준 (확인: 10/20~10/22에 3건) |
| 레이트리밋 | 문서상: Steam Web API 약관 "하루 100,000회" (키 기준 조항, 확인). 키 없는 호출의 한도는 문서에 없음 (IP 기준으로 추정). 실측: `X-RateLimit-*` 헤더 없음, `Expires` = 응답 시각 +1시간 |
| 약관·리스크 | Steam Web API 이용약관: 앱을 통해 최종 사용자에게 Steam 데이터 표시 가능, Valve 제휴·보증처럼 보이게 하면 안 됨, Valve가 언제든 API 변경·중단 가능. 상업 이용 조항은 명시 없음. 공식 API라 차단 리스크 낮음 |
| 커버 기능 | 3 뉴스/패치노트 |
| 채택 여부 | **채택 후보** (패치노트 판별용 `tags`와 `feedname` 제공). 단, 한국어 본문 없음 → 한국어는 Steam RSS(§3)로 보완 |

```jsonc
// feeds 필터 없이 호출 시: 외부 언론 피드(PlayGround.ru, Rock Paper Shotgun 등)가 섞이고,
// appid가 다른 글(예: appid 9900)도 들어온다 (확인)
{
  "appnews": {
    "appid": 553850,
    "newsitems": [
      {
        "gid": "1847286114032347",          // Steam 뉴스 ID (RSS의 view/{id}와 다른 값)
        "title": "Devoid of Liberty: 7.2.1",
        "url": "https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1847286114032347",
        "is_external_url": true,
        "author": "PS_7",
        "contents": "This hotfix aims to resolve one of the main crashes ...", // maxlength로 자름, BBCode/HTML 혼재
        "feedlabel": "Community Announcements",
        "date": 1792670404,                 // Unix 초 (2026-10-22 12:00:04 UTC)
        "feedname": "steam_community_announcements", // 개발사 공식 공지 피드
        "feed_type": 1,                     // 1 = Steam 공지, 0 = 외부 RSS 피드 (관찰 기반)
        "appid": 553850,
        "tags": ["patchnotes"]              // 패치노트 태그. 없는 글도 있음
      }
    ],
    "count": 167                            // feeds 필터 적용 시 전체 공지 수 (필터 없을 때 820)
  }
}
```

**패치노트 구분 (확인)**
- `feeds=steam_community_announcements`로 공식 공지만 받는다. 외부 언론 기사가 제외된다.
- `tags`에 `patchnotes`가 붙는 글이 있다. 단 대형 패치 `Devoid of Liberty: 7.2.0`은 태그가 **없었다**. 태그만으로는 놓친다 → `tags` 포함 **또는** 제목의 버전 패턴(`\d+\.\d+\.\d+`)으로 판별하는 게 안전하다 (추정).

**한국어 (확인)**
- 문서상 파라미터는 `appid`, `maxlength`, `enddate`, `count`, `feeds`뿐이고 언어 파라미터가 없다.
- `l=koreana`를 붙여 호출해도 제목·본문이 영어로 왔다. 한국어 패치노트가 있는 글(7.2.0)도 영어 원문만 반환.

**메모**
- `enddate`로 과거 글을 페이지네이션할 수 있다.
- `url`은 akamaihd 외부 포스트 경로라 사용자 링크로는 RSS의 `store.steampowered.com/news/app/553850/view/{id}`가 더 낫다.

출처 (2026-10-26 확인)
- https://partner.steamgames.com/doc/webapi/ISteamNews
- https://steamcommunity.com/dev/apiterms
- 실제 호출: `GetNewsForApp/v2/?appid=553850&count=5&maxlength=300`, `...&count=3&feeds=steam_community_announcements&l=koreana`

---

## 2. Steam Web API — `ISteamUserStats/GetNumberOfCurrentPlayers`

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=553850` |
| 공식 여부 | 공식 (Valve) |
| 인증 | 없음 (문서에 `key` 파라미터 없음, 키 없이 200 응답 확인) |
| 응답 예시 | 아래 코드 블록 |
| 갱신 주기 | 실시간에 가까움. 응답 캐시 `Cache-Control: public, max-age=751` (약 12.5분, 실측) |
| 레이트리밋 | 문서상: 약관 하루 100,000회 (키 기준). 15분 간격이면 하루 96회. 실측: `X-RateLimit-*` 헤더 없음 |
| 약관·리스크 | §1과 같은 Steam Web API 약관. 문서 주의: Steam에 연결되지 않은 플레이어는 집계 안 됨 → **PS5 플레이어 미포함** (Steam 플레이어 수만) |
| 커버 기능 | 4 통계 (동접자 시계열) |
| 채택 여부 | **채택 후보**. 과거 이력은 주지 않으므로 15분마다 직접 쌓아야 한다. 캐시가 약 12.5분이라 15분 간격과 잘 맞는다 |

```json
{"response":{"player_count":34507,"result":1}}
```
- `player_count`: 호출 시점 Steam 동접자 수 (2026-10-26 05:24 UTC 기준 34,507)
- `result`: 1 = 성공

출처 (2026-10-26 확인)
- https://partner.steamgames.com/doc/webapi/ISteamUserStats
- https://steamcommunity.com/dev/apiterms

---

## 3. Steam 뉴스 RSS

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET https://store.steampowered.com/feeds/news/app/553850/?l=koreana` |
| 공식 여부 | 공식 (Valve) |
| 인증 | 없음 |
| 응답 예시 | 아래 코드 블록 |
| 갱신 주기 | 공지 게시 시. `Cache-Control: public,max-age=120`, `Last-Modified` 헤더 제공 (실측) |
| 레이트리밋 | 문서상 한도 없음. 실측: `X-RateLimit-*` 헤더 없음 |
| 약관·리스크 | Steam 상점 페이지 피드. 별도 약관 조항은 못 찾음. 공식 피드라 차단 리스크 낮음 (추정) |
| 커버 기능 | 3 뉴스/패치노트 (**한국어 번역본 제공**) |
| 채택 여부 | **채택 후보**. 한국어 패치노트를 주는 유일한 Steam 경로. 단 최근 10건만, 태그 없음 → API(§1)와 병행 |

```xml
<channel>
  <title>553850 RSS 피드</title>              <!-- l=koreana면 채널 메타도 한국어 -->
  <language>en-us</language>                   <!-- 언어 표기는 en-us로 고정 (실측) -->
  <item>
    <title>자유의 공백: 7.2.0</title>           <!-- 개발사가 번역을 올린 글은 한국어 제목·본문 -->
    <description>&lt;p class="bb_paragraph"&gt;... 슈퍼지구에서 기쁜 마음으로 ...</description> <!-- 본문 전체 HTML -->
    <link>https://store.steampowered.com/news/app/553850/view/...</link>
    <pubDate>Tue, 20 Oct 2026 ...</pubDate>
    <guid isPermaLink="true">https://store.steampowered.com/news/app/553850/view/...</guid>
  </item>
  <item>
    <title>Devoid of Liberty: 7.2.1</title>       <!-- 번역이 없는 글은 영어 원문으로 대체 -->
  </item>
</channel>
```

**API와의 차이 (확인)**

| 항목 | GetNewsForApp | RSS (`l=koreana`) |
| --- | --- | --- |
| 포함 글 | `feeds` 필터 없으면 외부 언론 기사 섞임 | 개발사 공지·이벤트만 |
| 개수 | `count`로 지정, `enddate`로 과거 조회 | 최근 10건 고정 |
| 본문 | `maxlength`로 자름, 0이면 전체 | 전체 HTML |
| 한국어 | 없음 (영어만) | 번역본이 있으면 한국어. 확인 시점 10건 중 2건(7.2.0, 7.1.0 대형 패치)이 한국어, 핫픽스·공지는 영어 |
| 패치노트 태그 | `tags: ["patchnotes"]` (일부 누락) | 없음 |
| ID | `gid` (예: 1847286114032347) | `view/{id}` (예: 708912427613295258) — 서로 다른 값 |
| 캐시 | `Expires` +1시간 | `max-age=120` |

- 두 소스를 합칠 때는 ID가 달라 **제목+게시 시각**으로 매칭해야 한다 (API `date` 1792670404 = RSS `pubDate` 2026-10-22 12:00:04 UTC로 초 단위 일치, 확인).
- 제안: API로 목록·패치노트 판별, RSS로 한국어 제목·본문을 덮어쓰기 (추정 설계).

출처 (2026-10-26 확인)
- 실제 호출: `https://store.steampowered.com/feeds/news/app/553850/?l=koreana`

---

## 4. 게임 내 디스패치 (NewsFeed)

> 엔드포인트·인증·응답은 [game-api.md](game-api.md) 참조. 이 문서에서는 호출하지 않았다.

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | game-api.md 참조 (Arrowhead `NewsFeed`, 커뮤니티 API의 dispatch) |
| 공식 여부 | game-api.md 참조 |
| 인증 | game-api.md 참조 |
| 응답 예시 | game-api.md 참조 |
| 갱신 주기 | 게임 내 이벤트 발생 시 (전황 변화, MO 발표 등) |
| 레이트리밋 | game-api.md 참조 |
| 약관·리스크 | game-api.md 참조 |
| 커버 기능 | 3 뉴스 (게임 내 전황 속보), 보조로 2 MO |
| 채택 여부 | **보조** — 뉴스 소스로서의 역할만 평가 |

**뉴스 소스로서의 평가 (추정)**
- 성격이 다르다: Steam 공지·패치노트는 "개발사 발표", 디스패치는 "게임 세계 속 전황 속보"(행성 함락, MO 개시·종료 등). 패치노트를 대체하지 못하고 보완한다.
- 짧은 텍스트라 대시보드의 "실시간 속보" 띠 또는 타임라인에 맞다.
- 게임 데이터 수집과 같은 15분 주기에 함께 받으면 추가 비용이 없다.
- 한국어: 게임 자체가 한국어를 지원하므로 언어 헤더로 현지화된 디스패치를 받을 수 있을 가능성이 있다. 가능 여부는 game-api.md 결과로 판단한다.

---

## 5. X(트위터) — 공식 API

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | X API v2 (예: `GET /2/users/:id/tweets`), 대상 계정 `@helldivers2` |
| 공식 여부 | 공식 |
| 인증 | OAuth 2.0 / Bearer 토큰 (개발자 계정 + 결제 수단 등록 필요). 이 조사에서 키 생성 안 함 |
| 응답 예시 | 호출 안 함 (키 필요) |
| 갱신 주기 | 계정 게시 시. `@helldivers2`는 하루 수 건 (프로필 실측: 11시간·13시간 전 글 확인) |
| 레이트리밋 | 문서상: 종량제 상한 "월 3백만 Post 읽기". 엔드포인트별 요청 한도는 별도 (미확인) |
| 약관·리스크 | **무료 읽기 티어 없음**. 공식 요금 페이지에 무료 읽기 설명이 없고, 선불 크레딧 차감 방식. Post 읽기 $0.005/건, User 읽기 $0.010/건. 같은 Post는 UTC 하루 안에서 중복 과금 안 함("soft guarantee"). 첫 구매 시 $20 크레딧 프로모션. 요금이 자주 바뀐 이력 있음 (2023 유료화, 2026-02 종량제 전환은 2차 자료) |
| 커버 기능 | 3 뉴스 (공식 SNS 공지) |
| 채택 여부 | **보조(보류)**. 비용 추정: 15분마다 `since_id`로 새 글만 받으면 하루 ~5건 × 30일 ≈ 150건 ≈ 월 $1 미만 (추정). 0원은 아니고 카드 등록이 필요해 C-02와 충돌. Steam 공지와 내용 겹침이 많음 |

출처 (2026-10-26 확인)
- https://docs.x.com/x-api/getting-started/pricing (1차)
- 2차 참고: https://www.postproxy.dev/blog/x-api-pricing-2026/ , https://opentweet.io/x-api-pricing

### 실측 (2026-10-27, Bearer 토큰, 1회)

- `GET /2/users/by/username/helldivers2` → 200. **사용자 ID `1654403648598802436`** (2023-05-05 생성). 이 ID를 코드에 고정하면 사용자 조회($0.010)는 다시 하지 않아도 된다.
- `GET /2/users/:id/tweets?max_results=5&exclude=retweets,replies&tweet.fields=created_at,lang,entities,attachments&expansions=attachments.media_keys&media.fields=type,url,preview_image_url` → 200, 5건. `max_results` 최솟값은 5다.
  - 글마다 `id`, `created_at`(ISO UTC), `lang`(전부 `en`), `text`가 온다. 본문의 링크는 `t.co` 단축 주소이고, `entities.urls[].expanded_url`에 원래 주소가 있다(유튜브 카드에는 `title`·`images`도 있다).
  - 영상 첨부는 `attachments.media_keys` → `includes.media[]`의 `preview_image_url`(썸네일)로 받는다.
  - `meta.newest_id`가 다음 호출의 `since_id`다.
- 레이트리밋 헤더: 사용자 조회 300, 사용자 글 목록 10,000, 사용량 조회 50 (모두 `x-rate-limit-reset` 기준 창). 15분 폴링과는 거리가 멀다.
- `GET /2/usage/tweets` → `project_cap` 3,000,000, `cap_reset_day` 27, 호출 직후 `project_usage`는 `0`(바로 반영되지 않는 것으로 보인다). 실제 과금은 Developer Console에서 다시 본다.
- 게시 빈도: 2026-10-26 16:01~19:00 UTC 3시간에 5건(Liberty Day). 이벤트 날에는 "하루 ~5건" 추정보다 많을 수 있다. 그래도 하루 20건 × 30일 × $0.005 = 월 $3 수준이다.
- **글이 모두 영어다.** 한국어로 보여 주려면 ADR 0006의 기계 번역 대상에 X 글도 넣어야 한다(지금 ADR은 MO·디스패치만 다룬다).

---

## 6. X(트위터) — 비공식 수집 (프로필 페이지, 임베드, Nitter)

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | ① `https://x.com/helldivers2` 공개 프로필 HTML ② syndication 임베드(`syndication.twitter.com/srv/timeline-profile/...`) ③ Nitter 계열 프런트엔드 ④ 서드파티 스크래핑 API |
| 공식 여부 | 스크래핑 |
| 인증 | ① 없음 (비로그인 일부 노출) ② 없음 ③ 인스턴스 운영자에게 실제 X 계정 필요 ④ 서드파티 키 |
| 응답 예시 | 아래 (Playwright 실측) |
| 갱신 주기 | 계정 게시 시 |
| 레이트리밋 | 공개 문서 없음. 비로그인 접근은 X가 임의로 제한 |
| 약관·리스크 | **X 이용약관(2026-10-09 시행)이 명시적으로 금지**: "crawling or scraping the Services in any form, for any purpose without our prior written consent is expressly prohibited". 24시간에 100만 Post 초과 조회 시 100만 건당 $15,000 손해배상 예정 조항. X는 스크래핑 단체 소송 이력 있음(CCDH 건). 기술적으로도 비로그인 노출 범위가 수시로 바뀜 |
| 커버 기능 | 3 뉴스 |
| 채택 여부 | **기각**. 약관 명시 금지 + 데이터센터 IP(Vercel)에서의 차단 가능성 + 대체 소스(Steam 공지) 존재 |

**Playwright 비로그인 실측 (확인, 2026-10-26)**
- `https://x.com/helldivers2`를 비로그인으로 1회 열었다. 로그인 벽·캡차 없이 프로필(게시물 수 1,264)과 **게시물 5개**(고정글 1 + 최근 글 4: 11시간 전, 13시간 전, 10월 25일 2건)가 보였다.
- 5개 아래에는 "X에 로그인 또는 가입하기" 블록이 나와 더 이상 목록이 이어지지 않았다. 스크롤·로그인은 시도하지 않고 멈췄다.
- 각 글에 본문, 상대 시각, 답글·재게시·좋아요·조회수가 보였다. 본문은 영어.

```yaml
# 접근성 스냅샷 일부 (요약)
- article:
    - generic: 메인에 올림             # 고정글
    - link "@helldivers2"
    - link "10월 13일" -> /helldivers2/status/2109993086898053377
    - text: "Make every shot count ... deploying to your Destroyer's Acquisitions Panel on October 20!"
    - button "조회수": 63만
- heading "X에 로그인 또는 가입하기"   # 게시물 5개 이후
```

**비공식 방식 현황 (문서 조사, 호출 안 함)**
- syndication 임베드 JSON: 비로그인 JSON을 주던 경로가 닫혔다는 보고가 있고, 열려 있던 시기에도 최신순이 아니라 좋아요 많은 글 위주로 반환했다는 보고가 있다 (추정, 2차 자료).
- Nitter: 프로젝트 공지상 인스턴스 운영에 실제 X 계정(세션 토큰)이 필요해졌다. 공개 인스턴스는 수시로 죽는다 (추정).
- 서드파티 스크래핑 API(Apify 등): 유료이고 약관 위반 리스크를 그대로 진다.

출처 (2026-10-26 확인)
- https://x.com/en/tos (curl 1회 조회로 조항 확인, 시행일 2026-10-09)
- https://knightcolumbia.org/content/knight-institute-says-xs-new-terms-of-service-will-stifle-independent-research
- https://github.com/zedeus/nitter/issues/983 (redirect.github.com 경유 검색 결과)
- https://blog.desdelinux.net/fr/apr%C3%A8s-l%27expiration-du-dernier-des-jetons-%C3%A9mis%2C-Nitter-est-d%C3%A9c%C3%A9d%C3%A9/

---

## 7. Reddit (r/Helldivers)

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | ① 공식 Data API `https://oauth.reddit.com/r/Helldivers/...` ② 공개 JSON `https://www.reddit.com/r/Helldivers/new.json` ③ 공개 RSS `https://www.reddit.com/r/Helldivers/.rss` |
| 공식 여부 | ① 공식 ② ③ 비공식 공개 |
| 인증 | ① OAuth 2.0 필수. **2025-11 "Responsible Builder Policy" 이후 신규 OAuth 토큰은 Reddit 승인 필요** (r/redditdev 공지 재게시본 확인, 셀프 발급 종료는 2차 자료) ② ③ 없음 |
| 응답 예시 | 아래 코드 블록 |
| 갱신 주기 | 서브레딧 글 게시 시 (매우 빈번). 공식 공지는 운영진 고정글 위주 |
| 레이트리밋 | 문서상(2차 인용): OAuth 클라이언트당 100 QPM(10분 평균). 비OAuth 트래픽은 2023년 10 QPM에서 현재 차단으로 바뀌었다는 보고 (추정). 실측: RSS 1회 호출 후 `x-ratelimit-used: 1`, `x-ratelimit-remaining: 0.0`, `x-ratelimit-reset: 51` → **비인증 RSS는 약 1분에 1회 수준** |
| 약관·리스크 | Data API Terms(2차 자료 기준 2026-07-20 개정): 상업 목적은 별도 계약 필요, Reddit이 향후 요금을 부과할 수 있음, 승인 용도에 필요 없는 데이터 삭제 의무. 공식 약관 페이지(redditinc.com, support.reddithelp.com)는 이번 조사에서 403/조회 불가 |
| 커버 기능 | 3 뉴스 (커뮤니티 반응, 패치노트 재게시) |
| 채택 여부 | **기각(보류)**. 공식 공지는 Steam과 중복, JSON은 차단, RSS는 한도가 빡빡하고 데이터센터 IP에서 더 막힐 가능성. OAuth는 승인제라 일정 불확실 |

**실측 (확인, 2026-10-26, 각 1회)**
- `new.json?limit=3`: **`HTTP 403 Blocked`**, HTML 차단 페이지 (식별 UA를 넣어도 차단).
- `.rss?limit=3`: `HTTP 200`, `application/atom+xml`, `Cache-Control: private, max-age=3600`.

```xml
<feed xmlns="http://www.w3.org/2005/Atom">
  <category term="Helldivers" label="r/Helldivers"/>
  <updated>2026-10-26T05:28:08+00:00</updated>
  <entry>
    <author><name>/u/brperry</name></author>
    <title>Galactic War Room: Plot the Best Ways to Spread Democracy for Super Earth!</title> <!-- 기본 정렬 hot, 고정글 포함 -->
    <content type="html">...</content>
  </entry>
</feed>
```
- 기본 `.rss`는 hot 정렬이라 고정글(Q&A 메가스레드 등)이 앞에 온다. 한국어 콘텐츠는 없다.

출처 (2026-10-26 확인)
- https://r.datuan.dev/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/ (r/redditdev 공지 미러)
- https://lr.psf.lt/r/modnews/comments/13wshdp/api_update_continued_access_to_our_api_for/ (2023 한도 공지 미러)
- 2차 참고: https://www.socialcrawl.dev/blog/reddit-data-api-2026 , https://coldiq.com/blog/best-reddit-apis
- 1차(조회 실패): https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki , https://redditinc.com/policies/data-api-terms

---

## 8. Discord — 공식 서버 공지 채널 팔로우 + 봇 (문서 조사만)

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | 공식 Helldivers Discord의 공지(Announcement) 채널을 내 서버 채널로 팔로우 → 내 봇이 `GET https://discord.com/api/v10/channels/{channel.id}/messages`로 읽기 |
| 공식 여부 | 공식 (Discord API) |
| 인증 | 봇 토큰 (`Authorization: Bot ...`). 팔로우 설정에는 내 서버의 **Manage Webhooks** 권한 필요. 봇 권한: View Channel, Read Message History. **MESSAGE_CONTENT 특권 intent** 필요 |
| 응답 예시 | 호출 안 함 (봇·서버 생성 금지) |
| 갱신 주기 | 공식 서버 운영진이 공지를 "Publish"할 때. 팔로우된 글은 원 서버 이름의 웹훅 봇으로 들어오고, 수정·삭제도 전파된다 |
| 레이트리밋 | REST 전역 한도 초당 50회 + 라우트별 버킷 (문서상, 이번에 재확인 안 함). 15분 폴링이면 문제없음 |
| 약관·리스크 | Discord 개발자 정책·약관: 셀프봇(사용자 토큰 자동화)·스크래핑 금지, 위반 시 계정 정지(Spy.pet 사례). 내 서버에 정식 봇을 두고 팔로우한 공지를 읽는 방식은 정상 사용 범위로 보임 (추정). 공지 내용을 외부 웹에 재게시하는 데 대한 명시 조항은 확인 못 함. 개발자 정책 원문은 이번 조사에서 403 |
| 커버 기능 | 3 뉴스 (Discord 공지, 패치노트 알림) |
| 채택 여부 | **보조(보류)**. 0원으로 가능하지만 사람이 Discord에서 팔로우·봇 초대를 직접 해야 하고, 공식 서버에 팔로우 가능한 공지 채널이 있는지 미확인. 내용은 Steam 공지와 겹칠 가능성이 큼 |

**MESSAGE_CONTENT intent (확인, 공식 문서)**
- intent가 없으면 메시지 객체의 `content`, `embeds`, `attachments`, `components`, `poll`이 빈 값으로 온다. 예외는 봇이 보낸 글, DM, 봇 멘션, 컨텍스트 메뉴 대상 글뿐.
- 이 제한은 Gateway뿐 아니라 HTTP API로 받는 데이터에도 적용된다고 문서에 적혀 있다.
- 100개 미만 서버에 있는 봇은 개발자 포털에서 토글로 켤 수 있고, 100개 이상이면 인증·승인이 필요하다. 이 프로젝트는 서버 1개라 해당 없음.

**서버리스(Vercel)에서 메시지 받기 (추정 포함)**
- Gateway(WebSocket)는 상시 연결이 필요해 Vercel 함수로 유지할 수 없다.
- Interactions 엔드포인트(HTTP 웹훅)는 슬래시 커맨드 같은 상호작용만 받고, 일반 메시지 생성 이벤트는 주지 않는다 (확인 수준: 문서 구조상).
- 따라서 **15분 스케줄 작업에서 REST `GET /channels/{id}/messages?after={last_id}`로 폴링**하는 방식이 현실적이다 (추정). REST만 쓰는 봇도 메시지 읽기는 가능하다고 보지만, 실제 동작은 P2에서 검증 필요.

**한국어**: 공식 서버 공지는 영어로 추정. 한국어 채널 여부는 미확인.

출처 (2026-10-26 확인)
- https://docs.discord.com/developers/events/gateway (Privileged Intents, Message Content)
- https://support.discord.com/hc/en-us/articles/360028384531 (공지 채널 팔로우)
- https://support.discord.com/hc/en-us/articles/360039598252 (데이터 보호, 셀프봇 금지)
- https://www.techradar.com/pro/security/spypet-data-harvester-taken-down-by-discord
- 1차(조회 실패, 403): https://support-dev.discord.com/hc/articles/8563934450327-Discord-Developer-Policy

---

## 9. YouTube 채널 RSS

| 필드 | 값 |
| --- | --- |
| 소스/엔드포인트 | `GET https://www.youtube.com/feeds/videos.xml?channel_id={UC...}` |
| 공식 여부 | 공식 (YouTube 공개 피드) |
| 인증 | 없음 |
| 응답 예시 | **실측 실패** (아래) |
| 갱신 주기 | 영상 업로드 시. 정상일 때 최근 15건 (일반적으로 알려진 값, 추정) |
| 레이트리밋 | 문서 없음 |
| 약관·리스크 | 2025-12부터 이 엔드포인트가 간헐적으로 404/500을 반환한다는 커뮤니티 보고 다수, 데이터센터 IP에서 더 불안정하다는 보고 (추정). 공식 공지 없음 |
| 커버 기능 | 3 뉴스 (트레일러, 개발자 영상) |
| 채택 여부 | **보조(보류)**. 피드가 불안정하고, 트레일러는 Steam 공지에도 링크됨. 대안 YouTube Data API v3는 API 키 필요(무료 일일 쿼터 있음, 이번에 수치 재확인 안 함) |

**채널 확인 (확인)**
- `@helldivers2` → `UCbE-Bp-46wFgzTWS00t0enA`: 채널 설명이 "gameplay, tactical insights, and in-depth reviews"로 **팬 채널**이다. 공식 채널 아님.
- `@ArrowheadGameStudios` → `UCjDL3g63Y3qhr06_oyVi4aA`: 개발사 공식 채널. 대형 트레일러는 PlayStation 채널에도 올라온다 (추정, 채널 ID 미확인).

**실측 (확인, 2026-10-26)**
- `UCbE-Bp-46wFgzTWS00t0enA`: 1차 `404`, 재시도 `404`.
- `UCjDL3g63Y3qhr06_oyVi4aA`: 1차 `500`, 재시도 `404`.
- 응답 본문은 Google 오류 HTML. 같은 시각 채널 페이지(HTML)는 정상 응답 → 채널이 없어서가 아니라 피드 엔드포인트 문제로 보인다 (추정).

출처 (2026-10-26 확인)
- https://discuss.ai.google.dev/t/youtube-rss-feed-endpoint-returns-404-errors/113379
- https://forum.newsblur.com/t/youtube-feeds-broken/13227
- https://finder.wprssaggregator.com/rss-feeds/platform/youtube

---

## 10. 소스별 비교 요약

| 소스 | 커버 기능 | 비용 | 한국어 | 주요 리스크 | 채택 후보 여부 |
| --- | --- | --- | --- | --- | --- |
| Steam `GetNewsForApp` | 3 | 0원, 키 없음 | 없음 | 패치노트 태그 일부 누락 | **채택 후보** (목록·판별) |
| Steam `GetNumberOfCurrentPlayers` | 4 | 0원, 키 없음 | 해당 없음 | PS5 미포함, 이력 직접 축적 | **채택 후보** |
| Steam 뉴스 RSS | 3 | 0원 | **있음** (번역된 글만) | 최근 10건만, ID가 API와 다름 | **채택 후보** (한국어 본문) |
| 게임 내 디스패치 | 3(속보), 2 보조 | game-api.md | game-api.md | game-api.md | 보조 |
| X 공식 API | 3 | 종량제, 월 $1 미만 추정, 카드 필요 | 없음 | 무료 티어 없음, 요금 변동 | 보조(보류) |
| X 비공식 수집 | 3 | 0원 | 없음 | **약관 명시 금지**, 손해배상 조항, 차단 | 기각 |
| Reddit | 3 | 0원(비상업) | 없음 | OAuth 승인제, JSON 403, RSS 1회/분 | 기각(보류) |
| Discord 팔로우+봇 | 3 | 0원 | 없음(추정) | 수동 설정, 서버리스 폴링 검증 필요 | 보조(보류) |
| YouTube RSS | 3 | 0원 | 없음 | 피드 404/500 불안정 | 보조(보류) |

**권장 조합 (최종 결정은 ADR)**
- 뉴스/패치노트: Steam `GetNewsForApp`(`feeds=steam_community_announcements`) + Steam RSS(`l=koreana`)를 제목·시각으로 합쳐, 한국어 번역이 있으면 한국어로 보여준다. 여기에 게임 내 디스패치를 속보로 붙인다.
- 동접자: `GetNumberOfCurrentPlayers`를 15분마다 저장해 30일 시계열을 만든다. 화면에 "Steam 기준(PS5 제외)"을 표시한다.
- SNS(X, Reddit, Discord, YouTube)는 1차 범위에서 빼고, 필요하면 원문 링크만 둔다.
