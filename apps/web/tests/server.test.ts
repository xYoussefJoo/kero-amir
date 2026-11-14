import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { isAllowedBffPath } = await import("@/lib/server/bff");
const { isSameOrigin } = await import("@/lib/server/origin");

describe("BFF path guard", () => {
  it("allows admin API paths", () => {
    expect(isAllowedBffPath(["admin", "categories"])).toBe(true);
    expect(isAllowedBffPath(["admin", "account", "me"])).toBe(true);
  });

  it.each([
    [["auth", "login"]],
    [["admin"]],
    [["admin", ".."]],
    [["admin", "..", "auth", "refresh"]],
    [["admin", "a\\b"]],
    [["admin", ""]],
  ])("rejects %j", (segments) => {
    expect(isAllowedBffPath(segments)).toBe(false);
  });
});

describe("same-origin check", () => {
  const request = (origin: string | null, host = "kero.example") =>
    new Request("https://kero.example/api/auth/login", {
      method: "POST",
      headers: { host, ...(origin ? { origin } : {}) },
    });

  it("accepts our own origin", () => expect(isSameOrigin(request("https://kero.example"))).toBe(true));
  it("rejects another site", () => expect(isSameOrigin(request("https://evil.example"))).toBe(false));
  it("rejects a missing origin", () => expect(isSameOrigin(request(null))).toBe(false));
  it("rejects a malformed origin", () => expect(isSameOrigin(request("not a url"))).toBe(false));
});
