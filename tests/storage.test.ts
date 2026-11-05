import { describe, expect, it } from "vitest";
import { defaultData, parseUserData } from "../src/stores/storage";
describe("local user data resilience", () => {
  it("restores default follows and settings with missing, invalid or incompatible storage", () => {
    for (const raw of [
      null,
      "broken",
      "null",
      "[]",
      '{"version":2}',
      '{"version":1}',
    ]) {
      expect(parseUserData(raw).preferences.theme).toBe("system");
      expect(parseUserData(raw).follows.map((f) => f.id)).toEqual([
        "spurs",
        "madrid",
        "ronaldo",
      ]);
    }
  });
  it("round-trips bookmarks, empty follows, reading history and preferences", () => {
    const data = defaultData();
    data.follows = [];
    data.preferences = { theme: "dark", sort: "latest", density: "compact" };
    data.bookmarks = [{ articleId: "nba-01", savedAt: "2026-11-05T00:00:00Z" }];
    data.history = [
      { articleId: "football-01", readAt: "2026-11-05T01:00:00Z" },
    ];
    expect(parseUserData(JSON.stringify(data))).toEqual(data);
  });
  it("rejects malformed values, deduplicates entries and bounds history", () => {
    const data = {
      ...defaultData(),
      preferences: { theme: "invalid" },
      follows: [
        { id: "unlisted", followedAt: "bad" },
        { id: "ronaldo", kind: "team", followedAt: "2026-11-05" },
      ],
      bookmarks: [
        { articleId: "a", savedAt: "2026-11-05" },
        { articleId: "a", savedAt: "2026-11-05" },
        null,
      ],
      history: Array.from({ length: 120 }, (_, i) => ({
        articleId: `x-${i}`,
        readAt: "2026-11-05",
      })),
    };
    const parsed = parseUserData(JSON.stringify(data));
    expect(parsed.preferences.theme).toBe("system");
    expect(parsed.follows).toEqual([
      { id: "ronaldo", kind: "player", followedAt: "2026-11-05" },
    ]);
    expect(parsed.bookmarks).toHaveLength(1);
    expect(parsed.history).toHaveLength(100);
  });
});
