import { describe, expect, it } from "vitest";
import { authorized } from "./auth";

describe("authorized", () => {
  it("accepts the exact bearer secret", () => {
    expect(authorized("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("rejects a wrong secret of another length without throwing", () => {
    expect(authorized("Bearer s3", "s3cret")).toBe(false);
    expect(authorized("Bearer s3cret-longer", "s3cret")).toBe(false);
  });

  it("rejects a wrong secret of the same length", () => {
    expect(authorized("Bearer s3creT", "s3cret")).toBe(false);
  });

  it("rejects everything when the secret is unset or empty", () => {
    expect(authorized("Bearer ", "")).toBe(false);
    expect(authorized("Bearer undefined", undefined)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(authorized(null, "s3cret")).toBe(false);
  });
});
