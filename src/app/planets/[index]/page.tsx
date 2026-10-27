import { notFound } from "next/navigation";
import {
  DefenseTooltip,
  LiberationTooltip,
} from "@/components/home/MapTooltips";
import { PlanetName } from "@/components/hud/PlanetName";
import { RangeChart } from "@/components/hud/RangeChart";
import { SubpageHeader } from "@/components/hud/SubpageHeader";
import { isBuildPhase } from "@/lib/data/cache";
import { getLastCollection } from "@/lib/data/collection";
import { getPlanetDetail } from "@/lib/data/planet";
import { effectOf } from "@/lib/hd/effects";
import { allRanges } from "@/lib/hd/series";
import { factionColor, factionOf, factionStyle } from "@/lib/hd/terms";

// Cache Components needs one sample param; every other planet renders on first request
// and is cached (SRS v4 §3). The build bakes no data, so the sample is an empty shell.
export async function generateStaticParams() {
  return [{ index: "0" }];
}

// Navigation may wait for the (cached) render: reading the param before any output keeps
// a real HTTP 404 for unknown planets instead of a streamed soft 404 (Next 16 `instant`).
export const instant = false;

// Planet detail as a large version of the map tooltip with one chart (SRS v4 §9, F-04-2).
export default async function PlanetPage({
  params,
}: PageProps<"/planets/[index]">) {
  const { index } = await params;
  const n = Number(index);
  if (!Number.isInteger(n) || n < 0) notFound();
  const [planet, last] = await Promise.all([
    getPlanetDetail(n),
    getLastCollection(),
  ]);
  if (!planet) {
    if (isBuildPhase()) return <main className="flex-1" />;
    notFound();
  }

  const front = planet.front;
  const faction = front?.faction ?? planet.owner;
  const facilities = planet.effectIds
    .map(effectOf)
    .filter((e) => e?.kind === "facility")
    .filter((e, i, all) => all.findIndex((x) => x?.name === e?.name) === i);
  const color = factionColor(faction);

  return (
    <main className="mx-auto flex w-full max-w-[1392px] flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <SubpageHeader
        eyebrow={`PLANET${planet.sector ? ` · ${planet.sector.toUpperCase()} 섹터` : ""}`}
        title={<PlanetName name={planet.name} nameEn={planet.nameEn} />}
        last={last}
      />
      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-label="행성 상태"
          style={factionStyle(faction)}
          className={`hd-tip pointer-events-auto w-full shadow-none sm:w-[360px] ${
            front?.defense ? "hd-tip--defense" : ""
          }`}
        >
          {front ? (
            front.defense ? (
              <DefenseTooltip front={front} />
            ) : (
              <LiberationTooltip front={front} major={false} />
            )
          ) : (
            <>
              <div className="hd-tip__top">
                <span className="hd-tip__title">{planet.name}</span>
                <span className="hd-tip__faction">
                  {factionOf(planet.owner)?.name}
                </span>
              </div>
              <div className="hd-tip__meta">
                {planet.sector ? `${planet.sector} 섹터 · ` : ""}현재 전선 아님
              </div>
            </>
          )}
          {facilities.length > 0 && (
            <div className="hd-hazards hd-tip__divider px-0">
              <span className="hd-section-label">시설·지형</span>
              {facilities.map((e) => (
                <div
                  key={e!.name}
                  className="hd-hazard"
                  style={{ borderLeftColor: "var(--color-line)" }}
                >
                  <span className="text-xs font-medium text-body">
                    {e!.name}
                  </span>
                  <div className="hd-hazard__desc">{e!.desc}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          aria-labelledby="trend-title"
          className="hd-panel min-w-0 flex-[1_1_480px]"
        >
          <h2 id="trend-title" className="hd-panel__title">
            추이
          </h2>
          <RangeChart
            views={[
              {
                key: "liberation",
                label: "해방률",
                format: "percent",
                series: [
                  {
                    name: "해방률",
                    color,
                    points: allRanges(planet.series.liberation),
                  },
                ],
              },
              {
                key: "players",
                label: "투입 인원",
                format: "number",
                series: [
                  {
                    name: "투입 인원",
                    color,
                    points: allRanges(planet.series.players),
                  },
                ],
              },
            ]}
          />
        </section>
      </div>
    </main>
  );
}
