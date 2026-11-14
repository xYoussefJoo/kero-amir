import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { isAllowedBffPath, tagsForBffPath } = await import("@/lib/server/bff");
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

describe("BFF cache tags", () => {
  it("maps admin resources to the site cache tags they change", () => {
    expect(tagsForBffPath(["admin", "testimonials", "id", "moderation"])).toEqual(["testimonials"]);
    expect(tagsForBffPath(["admin", "tools", "id"])).toEqual(["tools", "projects"]);
  });

  it("refreshes nothing for private resources", () => {
    expect(tagsForBffPath(["admin", "messages", "id", "status"])).toEqual([]);
    expect(tagsForBffPath(["admin", "account", "2fa", "enable"])).toEqual([]);
  });
});
