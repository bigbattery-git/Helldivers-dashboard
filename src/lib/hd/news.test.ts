import { describe, expect, it } from "vitest";
import { kindLabel, newsPreview, steamText } from "./news";

describe("newsPreview", () => {
  it("uses a dispatch headline as the title", () => {
    expect(
      newsPreview({
        title: null,
        body: "<i=3>무기고 증강</i>\n\n향후 48시간 동안 <i=1>Terminid 전선</i>에 배치된",
      }),
    ).toEqual({
      title: "무기고 증강",
      preview: "향후 48시간 동안 Terminid 전선에 배치된",
    });
  });

  it("keeps only the text of Steam HTML bodies", () => {
    const { title, preview } = newsPreview({
      title: "자유의 공백: 7.2.0",
      body: '<p class="bb_paragraph">Hotfix&nbsp;notes</p><script>x</script>',
    });
    expect(title).toBe("자유의 공백: 7.2.0");
    expect(preview).toBe("Hotfix notes x");
  });

  it("falls back to the text when there is no headline", () => {
    expect(newsPreview({ title: null, body: "짧은 공지" }).title).toBe(
      "짧은 공지",
    );
    expect(newsPreview({ title: null, body: null }).title).toBe("제목 없음");
  });
});

it("turns Steam HTML into plain paragraphs without rendering tags", () => {
  expect(
    steamText(
      '<p class="bb_paragraph">First&nbsp;line</p><ul><li>One</li><li>Two &amp; more</li></ul><script>x</script><br>End',
    ),
  ).toBe("First line\n• One\n• Two & more\n\nx\nEnd");
});

it("turns Steam BBCode (API bodies) into plain paragraphs", () => {
  expect(
    steamText(
      '[p]This hotfix[/p][p][/p][h3]🔧 [b]Fixes[/b][/h3][list][*][p]Fixed a crash[/p][/*][/list][p][url="https://x.test"]Known Issues[/url][/p][img]{STEAM_CLAN_IMAGE}/a.png[/img]',
    ),
  ).toBe("This hotfix\n\n🔧 Fixes\n• Fixed a crash\n\nKnown Issues");
});

it("labels feed kinds", () => {
  expect(kindLabel("patch")).toBe("패치노트");
  expect(kindLabel("x")).toBe("x");
});
