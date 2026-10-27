// Sources and the unofficial fan-site notice (F-05-4) as one line at the very bottom:
// the design reference has no footer block (SRS v4 §9).
export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1392px] px-4 pb-6 text-[11px] leading-5 text-subtle sm:px-8">
      비공식 팬 사이트 · 데이터: Arrowhead 게임 API, Steam(동접자는 PS5 제외),
      helldivers-2/json(MIT) · 15분마다 수집 · HELLDIVERS™ 2 상표와 저작권은
      Arrowhead Game Studios와 Sony Interactive Entertainment에 있습니다.
    </footer>
  );
}
