# 0006. 영어로 온 MO·디스패치의 기계 번역

| 항목 | 내용 |
| --- | --- |
| 상태 | 채택 |
| 날짜 | 2026-10-27 |
| 관련 요구사항 | D-12, F-02-1, F-03-2, C-02 |

## 배경

MO와 디스패치는 `ko-KR`로 한 번만 요청한다(SRS v3 D-12). Arrowhead 번역이 늦으면 영어 원문이 그대로 온다. 2026-10-25 17:01 디스패치는 28시간 넘게 영어로 남아 있었다. 한국 플레이어가 대상인 서비스라 그동안 한국어로 보여 줄 방법이 필요하다.

- 분량(2026-10-27 로컬 DB 기준): 디스패치는 주 약 10건에 건당 약 180자, MO는 건당 약 400자다. 영어로 오는 것만 번역하면 **월 1만 자 미만, 하루 몇 건**이다.
- 사용자 없이 15분마다 도는 서버 작업에서 호출해야 한다.
- **비용 0원을 지키고 카드도 등록하지 않는다**(C-02, 사용자 결정 2026-10-27). 무료 한도는 계속 다시 채워져야 한다.
- 게임 용어는 **Arrowhead 공식 한국어 번역 표기**를 따르고, 행성 이름은 공식 한국어 이름(`planet.name_ko`)을 쓴다(사용자 결정 2026-10-27, 디자인 시스템 README "문구").
- X(`@helldivers2`) 글도 전부 영어로 온다(2026-10-27 실측, ADR 0002). 하루 수~20건이라 분량은 크게 늘지 않는다.

## 고려한 대안

| 대안 | 카드 | 무료 한도 | 장점 | 단점 |
| --- | --- | --- | --- | --- |
| **Gemini API 무료 티어** (`gemini-3.5-flash-lite`) | 없음 (AI Studio 키) | 요청 수 한도, 매일 다시 채워짐. Flash-Lite는 하루 1,000회 수준(2차 자료) | 한국어 품질이 좋은 LLM. 프롬프트에 용어표를 넣어 게임 용어를 맞춘다 | 무료 티어 입력·출력은 Google 제품 개선에 쓰이고 사람이 볼 수 있다. 무료 한도가 줄어든 이력이 있다 |
| **Cloudflare Workers AI** (Workers Free) | 없음 (2차 자료) | 하루 10,000 Neurons, 매일 00:00 UTC에 다시 채워짐. Gemma 3 12B 기준 하루 수십만 토큰 | 무료 한도가 공식 문서에 명시돼 있다. 번역 전용 모델(m2m100)과 LLM 모두 있다 | 작은 모델이라 한국어 품질이 Gemini보다 낮을 수 있다. Cloudflare 계정과 API 토큰이 하나 더 생긴다 |
| MyMemory | 없음 (키 없이 호출) | 하루 5,000자(IP 기준), 이메일을 주면 50,000자 | 가입이 필요 없다 | 번역 메모리와 기계 번역이 섞여 품질이 들쭉날쭉하다. 용어를 맞출 방법이 없다. 상업 이용 조건 미확인 |
| DeepL API Developer | 없음 | **100만 자를 한 번만 준다(다시 채워지지 않음)** | 번역 품질 좋음 | 결국 소진된다. 무료 플랜에서 용어집을 쓸 수 있는지 미확인 → 제외 |
| Azure Translator F0 | Azure 가입 때 카드 필요(2차 자료) | 매달 200만 자 | 한도가 넉넉하다 | 카드 등록 → 제외 |
| Google Cloud Translation, Claude API | 필요 | — | — | 카드·결제 계정 → 제외 |
| 카카오 번역 API, 파파고(네이버 개발자센터) | — | — | — | 카카오는 2022~2023년에 개인용 제공을 끝냈다. 파파고는 유료 클라우드 상품(Naver Cloud)만 남은 것으로 안다(이번에 다시 확인하지 않음) → 제외 |
| OpenAI OAuth ("Sign in with ChatGPT") | 개인 구독 | 주간 구독 한도 공유 | 추가 비용 없음 | 사용자가 로그인해 앱별로 허락하는 방식이라 무인 서버 작업에 맞지 않는다. 앱은 OpenAI 승인이 필요하다는 2차 자료가 있다. 개인 구독으로 공개 서비스를 돌리는 것은 약관상 불명확 → 위 대안이 모두 막힐 때만 다시 검토 |

## 결정

**Gemini API 무료 티어(`gemini-3.5-flash-lite`)를 채택한다.** 예비 대안은 Cloudflare Workers AI다.

- 카드 없이 쓰고, 무료 한도가 매일 다시 채워진다. 하루 몇 건이라 한도와 거리가 멀다.
- 번역할 내용은 이미 공개된 게임 공지라, 무료 티어의 데이터 사용 조건(제품 개선에 사용, 사람이 볼 수 있음)이 문제가 되지 않는다. 개인정보나 비밀은 보내지 않는다.
- 프롬프트에 용어표를 넣고 번역문만 돌려받는다. 응답은 zod로 검증한다.
  - 용어표: 공식 한국어 디스패치·MO에서 뽑은 표기(예: Major Order → 주요 명령, Ministry of Truth → 진리부, Super Earth → 슈퍼지구). 화면 문구와 같은 표를 쓴다(`src/lib/hd/`).
  - 행성 이름: 원문에 나온 행성 영어 이름을 `planet.name_ko`로 바꾸라고 지시한다(원문에 나온 행성만 표로 넘긴다).
  - `<i=N>` 마크업 보존. 번역 후 원문과 태그 순서가 다르면 그 결과는 버린다.
- 번역 대상은 한글이 없는 MO 제목·브리핑, 디스패치 본문, **X 글 본문**이다(`hasHangul`, `src/lib/collect/util.ts`). 같은 원문은 한 번만 번역한다. X 글은 공식 번역이 따로 오지 않으므로 기계 번역이 최종이다.
- 공식 한국어가 오면 기계 번역을 덮어쓴다. 화면에는 기계 번역임을 표시한다("자동 번역", 원문 보기).
- 번역이 실패하거나 한도에 걸려도 수집은 계속하고(D-08) 영어 원문을 보여 준다. 다음 수집 때 다시 시도한다.
  - 응답 전체가 실패하면(안전 필터 차단, 배열 길이 불일치 등) 다음 수집은 한 건만 보낸다. 한 건만 보냈는데도 응답이 쓸 수 없으면 그 건을 `failed`로 표시해 다시 보내지 않는다. 원문이 바뀌면 다시 번역한다. 한 건 때문에 묶음 전체가 매번 막히는 것을 막기 위해서다.
  - MO는 제목과 브리핑이 모두 한국어(또는 빈 값)일 때만 공식 번역으로 본다. 한쪽만 한국어이면 영어 쪽만 번역한다.
  - 수집 시작 후 20초(마감 40초 − Gemini 제한 시간 15초 − 쓰기 5초)가 지났으면 이번 수집에서는 번역을 건너뛴다.
- **결제 계정을 프로젝트에 연결하지 않는다.** 연결하면 그 프로젝트의 모든 호출이 유료로 바뀐다(Google 포럼 답변).

### 실측 (2026-10-27, 무료 티어 키, 호출 2회)

- `gemini-2.5-flash-lite`는 404: "no longer available to new users". 안내대로 **`gemini-3.5-flash-lite`** 로 바꿨다. 모델이 이렇게 사라질 수 있어서 모델 ID는 환경변수로 둔다.
- 영어 4건(디스패치 1, X 글 2, MO 브리핑 예시 1)을 한 번에 요청: 200, 2.1초, 입력 510 + 출력 296 토큰. JSON 배열 응답 형식(`responseSchema`)은 지켰다.
- 품질: 문장은 자연스럽고, 숫자·URL·세력 이름(용어표)은 지켰다. 문제는 세 가지였다.
  1. 마크업 1건 어긋남: 원문에 없던 `<i=1>`을 "오토마톤"에 덧붙였다. → 번역 후 원문과 태그 순서를 비교해, 다르면 그 건은 버리고 영어 원문을 유지한다(다음 수집 때 재시도).
  2. 공식 용어와 다름: "Major Order" → "주요 임무"(공식 "주요 명령"), "Ministry of Truth" → "진실부"(공식 "진리부"). → 용어표에 공식 한국어 디스패치에서 뽑은 용어를 더한다.
  3. 행성 이름: 지시대로 영어(`Malevelon Creek`)를 유지했다. 그런데 **공식 한국어 디스패치는 행성 이름을 한국어로 쓴다**("말레벨론 크릭", "빈데미타릭스 프라임"). `planet` 테이블에 한국어 이름이 있으니, 원문의 행성 이름을 DB의 한국어 이름으로 바꿔 주는 쪽이 공식 표기와 맞는다. → 사용자 결정(2026-10-27)으로 행성 이름은 공식 한국어, 용어는 공식 번역 표기를 따르기로 했다(위 "결정").

## 결과

- 이점: 비용 0원, 카드 없이 공식 번역 전에도 한국어로 보여 준다.
- 감수하는 비용·리스크와 대응:
  - Google이 무료 티어 한도나 모델을 바꿀 수 있다 → 번역 함수 하나로 감싸서 Cloudflare Workers AI로 바꿀 수 있게 한다. 모델 ID는 환경변수로 뺀다.
  - 오역이나 용어 불일치가 생길 수 있다 → "자동 번역" 표시와 원문 보기를 두고, 공식 번역이 오면 덮어쓴다. 용어표 위반은 테스트로 확인한다.
  - 스키마 변경: `assignment`에 `title_ko`·`briefing_ko`를 추가한다. `assignment`·`news_item`에는 번역 출처(`official` / `machine` / `failed`)를 기록한다.
- 후속 작업 (CHECKLIST P4):
  - **[사용자]** Google AI Studio에서 API 키 발급(결제 연결 없이), `.env.local`에 `GEMINI_API_KEY`
  - 스키마 변경, 번역 함수 + 테스트(용어표·마크업 보존), 수집에 연결, 화면 표시

## 근거 자료

- https://ai.google.dev/gemini-api/docs/pricing (Flash-Lite 무료 티어, "Content used to improve our products", 2026-10-27 확인)
- https://discuss.ai.google.dev/t/clarification-on-gemini-api-free-tier-vs-paid-tier-after-billing-activation/96995 (결제 연결 시 전부 유료)
- https://developers.cloudflare.com/workers-ai/platform/pricing/ (하루 10,000 Neurons, 모델별 Neurons, 2026-10-27 확인)
- https://lilting.ch/en/articles/mymemory-api (MyMemory 한도, 2차 자료)
- https://www.deepl.com/en/developers, https://translaterocket.com/api-keys/deepl-api-key/ (DeepL Developer 플랜 100만 자, 다시 채워지지 않음)
- https://azure.microsoft.com/en-gb/pricing/details/translator/, https://immersivetranslate.com/en/docs/services/azure/ (Azure F0 한도, 가입 시 카드)
- https://devtalk.kakao.com/t/api-notice-end-of-support-for-vision-translation-and-speech-apis/122817 (카카오 번역 API 종료)
- https://learn.chatgpt.com/docs/sign-in-with-chatgpt
