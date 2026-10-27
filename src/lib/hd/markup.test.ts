import { describe, expect, it } from "vitest";
import { parseMarkup, stripMarkup } from "./markup";

describe("parseMarkup", () => {
  it("splits a real dispatch into headline, text and highlights", () => {
    const s =
      "<i=3>전략 경고</i>\n\n오토마톤 <i=1>소각대</i>가 <i=1>빈데미타릭스 프라임</i> 행성에서 보고되었습니다.";
    expect(parseMarkup(s)).toEqual([
      { text: "전략 경고", level: 3 },
      { text: "\n\n오토마톤 ", level: null },
      { text: "소각대", level: 1 },
      { text: "가 ", level: null },
      { text: "빈데미타릭스 프라임", level: 1 },
      { text: " 행성에서 보고되었습니다.", level: null },
    ]);
  });

  it("drops unpaired tags instead of showing them", () => {
    expect(parseMarkup("<i=1>열림만 있음")).toEqual([
      { text: "열림만 있음", level: null },
    ]);
    expect(stripMarkup("<i=3>A</i> b </i>")).toBe("A b ");
  });
});
