import { describe, expect, it } from "vitest";
import { articles } from "../src/data/articles";
import { sources } from "../src/data/entities";
import { selectArticles } from "../src/services/news";
import type { Follow } from "../src/types";
const fixtures = {
  list: (options: Parameters<typeof selectArticles>[1]) =>
    selectArticles(articles, options),
};

describe("demo content integrity", () => {
  it("has at least 15 articles for each main sport with unique ids", () => {
    expect(articles.filter((a) => a.sport === "nba")).toHaveLength(15);
    expect(articles.filter((a) => a.sport === "football")).toHaveLength(15);
    expect(new Set(articles.map((a) => a.id)).size).toBe(articles.length);
  });
  it("marks each article as demo, with honest sources and no invented article URL", () => {
    for (const a of articles) {
      expect(a.isDemo).toBe(true);
      expect(a.originalUrl).toBeNull();
      expect(sources.find((s) => s.id === a.sourceId)?.isDemo).toBe(true);
      expect(a.englishTitle.length).toBeGreaterThan(5);
      expect(a.summary.length).toBeGreaterThan(20);
      expect(Number.isFinite(Date.parse(a.publishedAt))).toBe(true);
    }
    expect(articles.some((a) => !a.image)).toBe(true);
    expect(articles.some((a) => !!a.image)).toBe(true);
  });
});
describe("news adapter queries", () => {
  it("searches Chinese and English titles, full names, aliases and categories", () => {
    for (const query of [
      "马刺",
      "San Antonio Spurs",
      "Victor Wembanyama",
      "皇家马德里",
      "Real Madrid",
      "Cristiano Ronaldo",
      "C罗",
      "欧冠",
    ])
      expect(fixtures.list({ query }).length).toBeGreaterThan(0);
    expect(
      fixtures.list({ query: "currY off THE ball" }).map((a) => a.id),
    ).toContain("nba-04");
    expect(
      fixtures.list({ query: "足球" }).some((a) => a.sport === "football"),
    ).toBe(true);
  });
  it("combines category, sport, entity and text filters", () => {
    const found = fixtures.list({
      sport: "football",
      tag: "五大联赛",
      entityId: "madrid",
      query: "姆巴佩",
    });
    expect(found.length).toBeGreaterThan(0);
    expect(
      found.every(
        (a) =>
          a.sport === "football" &&
          a.teamIds.includes("madrid") &&
          a.tags.includes("五大联赛"),
      ),
    ).toBe(true);
    expect(fixtures.list({ sport: "nba", query: "Cristiano Ronaldo" })).toEqual(
      [],
    );
    expect(fixtures.list({ query: "不存在的新闻xyz" })).toEqual([]);
  });
  it("sorts latest chronologically and hot by explicitly simulated score", () => {
    const latest = fixtures.list({ sort: "latest" });
    const hot = fixtures.list({ sort: "hot" });
    expect(
      latest.every((a, i) => !i || a.publishedAt <= latest[i - 1].publishedAt),
    ).toBe(true);
    expect(hot.every((a, i) => !i || a.demoHeat <= hot[i - 1].demoHeat)).toBe(
      true,
    );
  });
  it("changes recommendation order when follows change and preserves source arrays", () => {
    const follows: Follow[] = [
      { id: "curry", kind: "player", followedAt: "2026-11-05T00:00:00Z" },
    ];
    const ids = articles.map((a) => a.id);
    const list = selectArticles(articles, { sort: "recommended", follows });
    expect(list[0].playerIds).toContain("curry");
    expect(articles.map((a) => a.id)).toEqual(ids);
    expect(fixtures.list({ sort: "recommended", follows: [] })).toEqual(
      fixtures.list({ sort: "latest" }),
    );
  });
});
