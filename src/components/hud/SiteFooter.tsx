const SOURCES = [
  ["Arrowhead 게임 API", "은하 전쟁 현황·주요 명령·디스패치"],
  ["Steam", "동접자·뉴스·패치노트"],
  ["helldivers-2/json (MIT)", "행성 이름·해석 표"],
] as const;

// Sources and the unofficial fan-site notice on every page (F-05-4); replaces an /about page.
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-[1392px] flex-col gap-3 px-4 py-6 text-xs text-subtle sm:px-8">
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {SOURCES.map(([name, what]) => (
            <li key={name}>
              <span className="text-muted">{name}</span> · {what}
            </li>
          ))}
        </ul>
        <p>
          데이터는 15분마다 수집합니다. 동접자는 Steam 기준이며 PS5는 포함하지
          않습니다.
        </p>
        <p>
          비공식 팬 사이트입니다. HELLDIVERS™ 2의 상표와 저작권은 Arrowhead Game
          Studios와 Sony Interactive Entertainment에 있습니다.
        </p>
      </div>
    </footer>
  );
}
