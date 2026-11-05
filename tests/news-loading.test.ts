import glossary from "../config/glossary.json";
import { getEntity } from "../src/data/entities";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleFixture, newsFixture, statusFixture } from "./fixtures";
import {
  parseNewsDocument,
  parseSourcesStatus,
  toArticleView,
} from "../src/services/news-validation";
const memory = new Map<string, string>();
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};
beforeEach(() => {
  vi.resetModules();
  memory.clear();
  vi.stubGlobal("localStorage", storage);
  vi.stubEnv("BASE_URL", "/sportnow/");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function fetchSuccess(news = newsFixture(), cache = false) {
  const mock = vi.fn(
    async (path: string) =>
      new Response(
        JSON.stringify(path.endsWith("news.json") ? news : statusFixture(news)),
        {
          status: 200,
          headers: cache ? { "X-SportNow-Cache": "offline" } : {},
        },
      ),
  );
  vi.stubGlobal("fetch", mock);
  return mock;
}
describe("canonical production data validation", () => {
  it("keeps frontend entity tags aligned with the maintained glossary", () => {
    for (const entity of glossary.entities) expect(getEntity(entity.id)?.name).toBe(entity.zh);
  });
  it("keeps English fallback and omits absent summaries", () => {
    const document = parseNewsDocument(newsFixture());
    const a = toArticleView(document.articles[0]);
    expect(a.title).toBe(a.englishTitle);
    expect(a.summary).toBe("");
    expect(a.paragraphs).toEqual([]);
  });
  it("rejects demos, dangerous links, duplicate identities and unauthorized translations", () => {
    for (const mutate of [
      (a: Record<string, unknown>) => {
        a.isDemo = true;
      },
      (a: Record<string, unknown>) => {
        a.originalUrl = "javascript:alert(1)";
      },
      (a: Record<string, unknown>) => {
        a.titleZh = "未经许可的翻译";
      },
    ]) {
      const d = structuredClone(newsFixture());
      mutate(d.articles[0] as unknown as Record<string, unknown>);
      expect(() => parseNewsDocument(d)).toThrow();
    }
    const duplicate = newsFixture([articleFixture(), articleFixture()]);
    expect(() => parseNewsDocument(duplicate)).toThrow();
  });
  it("rejects status from a different deployment or with incorrect counts", () => {
    const d = newsFixture();
    const status = statusFixture(d);
    status.newsRevision = "2".repeat(64);
    expect(() => parseSourcesStatus(status, d)).toThrow();
    status.newsRevision = d.revision;
    status.counts.total = 99;
    expect(() => parseSourcesStatus(status, d)).toThrow();
  });
});
describe("JSON loading, deployment paths and last successful snapshot", () => {
  it("loads through the GitHub Pages base and coalesces concurrent refreshes", async () => {
    const fetch = fetchSuccess();
    const { newsStore } = await import("../src/services/news-store");
    await Promise.all([newsStore.refresh(), newsStore.refresh()]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map((x) => x[0])).toEqual([
      "/sportnow/data/news.json",
      "/sportnow/data/sources-status.json",
    ]);
    expect(newsStore.getSnapshot().articles).toHaveLength(1);
    expect(newsStore.getSnapshot().cached).toBe(false);
    expect(memory.has("sportnow:news:v2")).toBe(true);
  });
  it("retains cached news on network failure and refreshes after recovery", async () => {
    const d = newsFixture();
    memory.set(
      "sportnow:news:v2",
      JSON.stringify({ document: d, sources: statusFixture(d) }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { newsStore } = await import("../src/services/news-store");
    await newsStore.refresh();
    expect(newsStore.getSnapshot().cached).toBe(true);
    expect(newsStore.getSnapshot().articles[0].title).toContain("Spurs");
    fetchSuccess(
      newsFixture(
        [articleFixture({ titleOriginal: "Recovered owned test" })],
        "2026-11-05T09:00:00Z",
      ),
    );
    await newsStore.refresh();
    expect(newsStore.getSnapshot().cached).toBe(false);
    expect(newsStore.getSnapshot().articles[0].title).toBe(
      "Recovered owned test",
    );
  });
  it("recognizes SW fallback and never replaces newer news with an older CDN snapshot", async () => {
    fetchSuccess(newsFixture(), true);
    const { newsStore } = await import("../src/services/news-store");
    await newsStore.refresh();
    expect(newsStore.getSnapshot().cached).toBe(true);
    fetchSuccess(
      newsFixture(
        [articleFixture({ titleOriginal: "Old CDN data" })],
        "2026-11-04T08:00:00Z",
      ),
    );
    await newsStore.refresh();
    expect(newsStore.getSnapshot().articles[0].title).toContain("Spurs");
    expect(newsStore.getSnapshot().error).toContain("旧版本");
  });
  it("never falls back to demo data after a malformed real response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ articles: [{ isDemo: true }] })),
      ),
    );
    const { newsStore } = await import("../src/services/news-store");
    await newsStore.refresh();
    expect(newsStore.getSnapshot().articles).toEqual([]);
    expect(newsStore.getSnapshot().error).toBeTruthy();
    expect(newsStore.getSnapshot().mode).toBe("live");
  });
});
