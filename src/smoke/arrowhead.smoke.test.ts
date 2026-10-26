import { expect, it } from "vitest";

// One request to the primary game data source (ADR 0001).
it("Arrowhead API returns the current war id", async () => {
  const res = await fetch(
    "https://api.live.prod.thehelldiversgame.com/api/WarSeason/current/WarID",
    {
      headers: {
        "User-Agent": "helldivers-dashboard (contact: GitHub Bigbattery)",
      },
    },
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { id: unknown };
  expect(typeof body.id).toBe("number");
});
