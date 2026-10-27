// Planet effects by galacticEffectId (helldivers-2/json effects/planetEffects.json, MIT).
// There is no official Korean source: names use the official spelling where the ko-KR NewsFeed
// has one (제트 여단, 소각대, 드래곤로치, 하이브로드, 사이보그, 하이브 월드, 글룸, 블랙홀),
// the rest are our own translations. Only ids seen live (2026-10-27) are listed.
// The game repeats each enemy variant under two ids ("X" and "X (Enemies)"); both map to one name.
export type EffectKind = "environment" | "enemy" | "facility";

export type Effect = { name: string; desc: string; kind: EffectKind };

const env = (name: string, desc: string): Effect => ({
  name,
  desc,
  kind: "environment",
});
const enemy = (name: string, desc: string): Effect => ({
  name,
  desc,
  kind: "enemy",
});
const facility = (name: string, desc: string): Effect => ({
  name,
  desc,
  kind: "facility",
});

const JET = enemy("제트 여단", "점프 팩을 단 오토마톤 부대가 출현합니다.");
const PREDATOR = enemy(
  "포식자 변종",
  "글룸으로 강화된 테르미니드가 숨어 있다가 기습합니다.",
);
const SPORE = enemy(
  "스포어 버스트 변종",
  "포자를 터뜨리는 테르미니드가 출현합니다.",
);
const INCINERATION = enemy(
  "소각대",
  "화염 무기로 무장한 오토마톤 부대가 출현합니다.",
);
const RUPTURE = enemy(
  "파열 변종",
  "땅속에서 솟구치는 테르미니드가 출현합니다.",
);
const DRAGONROACH = enemy(
  "드래곤로치",
  "하늘을 나는 테르미니드 드래곤로치가 출현합니다.",
);
const HIVE_LORD = enemy(
  "하이브로드",
  "거대한 테르미니드 하이브로드가 출현합니다.",
);
const CYBORG = enemy(
  "사이보그",
  "사이보그가 오토마톤 군대를 이끌고 출현합니다.",
);
const MINDLESS = enemy(
  "무념의 무리",
  "일루미닛이 시민을 개조한 무리가 대량으로 출현합니다.",
);
const APPROPRIATORS = enemy("징발대", "일루미닛 정규 병력만 출현합니다.");
const VOTE_SNATCHERS = enemy(
  "투표 강탈자",
  "새로운 일루미닛 개조 병력이 출현합니다.",
);
const INVASION_FLEET = enemy(
  "침공 함대",
  "일루미닛 침공 함대의 주력이 출현합니다.",
);
const SEAF = facility(
  "SEAF 대규모 주둔",
  "SEAF 병력이 헬다이버 임무를 지원할 수 있습니다.",
);
const FRACTURED = facility(
  "부서진 행성",
  "메리디아 특이점에 찢겨 나간 행성의 잔해입니다.",
);

export const EFFECTS: Record<number, Effect> = {
  1188: env("짙은 글룸", "짙은 글룸 구름이 행성을 가립니다."),
  1190: env("관측 불가", "센서로 이 행성을 관측할 수 없습니다."),
  1193: env("글룸 경계", "글룸 장벽의 경계에 있는 행성입니다."),
  1197: facility(
    "이종곤충학 연구소",
    "테르미니드와 E-710을 연구하는 시설입니다.",
  ),
  1198: facility(
    "심층 맨틀 제련 단지",
    "원자재를 장비로 가공하는 제련 시설입니다.",
  ),
  1202: JET,
  1203: JET,
  1229: facility(
    "메리디아 블랙홀",
    "메리디아 슈퍼 군락을 없앤 뒤 남은 블랙홀입니다.",
  ),
  1232: facility("공장 허브", "전쟁 물자를 생산하는 공장 행성입니다."),
  1234: facility("과학 센터", "과학부의 연구 시설이 있는 행성입니다."),
  1236: facility(
    "시민 감시·안전 센터",
    "진리부가 시민 활동을 분석하는 시설입니다.",
  ),
  1239: facility(
    "제트 여단 공장",
    "제트 여단 병력을 생산하는 오토마톤 시설입니다.",
  ),
  1241: FRACTURED,
  1243: PREDATOR,
  1244: SPORE,
  1245: PREDATOR,
  1246: facility("작전 개시 불가", "이 행성에서는 작전을 시작할 수 없습니다."),
  1248: INCINERATION,
  1249: INCINERATION,
  1252: FRACTURED,
  1279: facility(
    "무기고 증강: M-102 고속 정찰 차량",
    "M-102 스트라타젬을 모든 헬다이버가 쓸 수 있습니다.",
  ),
  1282: facility(
    "헬다이버 훈련 시설",
    "헬다이버 훈련이 이루어지는 시설입니다.",
  ),
  1287: facility("뉴 호프 시티", "최고 보안 도시의 기함입니다."),
  1291: facility(
    "뉴 어스피레이션 시티",
    "세 곳의 최고 보안 도시 중 하나입니다.",
  ),
  1292: facility("뉴 이어닝 시티", "세 곳의 최고 보안 도시 중 하나입니다."),
  1303: RUPTURE,
  1304: facility("전초기지 알파", "글룸 지역에 처음 세운 유인 기지입니다."),
  1306: DRAGONROACH,
  1307: HIVE_LORD,
  1308: HIVE_LORD,
  1309: DRAGONROACH,
  1310: RUPTURE,
  1311: env(
    "하이브 월드",
    "테르미니드에게 완전히 잠식된 행성으로 글룸 포자를 내뿜습니다.",
  ),
  1324: facility("초고철질 광산", "화성암 깊은 곳에서 백금을 캐는 광산입니다."),
  1344: facility("판도라 기지", "DSS 강화 장비를 만드는 극비 시설입니다."),
  1352: facility("일반 블랙홀", "안정된 보통의 블랙홀입니다."),
  1353: facility(
    "데이터 센터",
    "오토마톤이 암호화된 정보를 보관하는 시설입니다.",
  ),
  1360: CYBORG,
  1361: CYBORG,
  1377: MINDLESS,
  1378: MINDLESS,
  1379: APPROPRIATORS,
  1380: APPROPRIATORS,
  1386: SPORE,
  1387: facility("통신 중계 시설", "오토마톤 통신에 중요한 중계탑이 있습니다."),
  1395: facility(
    "테르미니드 제어 시스템+",
    "터미사이드 살포탑이 글룸의 테르미니드를 막습니다.",
  ),
  1400: SEAF,
  1401: SEAF,
  1402: VOTE_SNATCHERS,
  1403: VOTE_SNATCHERS,
  1413: INVASION_FLEET,
  1414: INVASION_FLEET,
};

// Unknown ids are not shown (CHECKLIST P4 "행성 요소").
export const effectOf = (id: number): Effect | undefined => EFFECTS[id];

// What a tooltip shows: environment and enemy variants, each name once (design system README).
export function tooltipEffects(ids: number[]) {
  const seen = new Set<string>();
  return ids
    .map(effectOf)
    .filter(
      (e): e is Effect =>
        !!e && e.kind !== "facility" && !seen.has(e.name) && !!seen.add(e.name),
    );
}
