import type {
  Article,
  NewsDocument,
  SourcesStatusDocument,
} from "../src/types";
export function articleFixture(overrides: Partial<Article> = {}): Article {
  return {
    id: "news-111111111111111111111111",
    category: "nba",
    sourceId: "owned-test",
    sourceName: "SportNow 自有测试内容",
    titleOriginal: "San Antonio Spurs practice example",
    titleZh: "",
    summaryOriginal: "",
    summaryZh: "",
    originalUrl: "https://example.org/owned-test",
    publishedAt: "2026-11-05T07:00:00Z",
    fetchedAt: "2026-11-05T08:00:00Z",
    tags: ["NBA", "马刺"],
    teamIds: ["spurs"],
    playerIds: [],
    translationVersion: "argos:1.11.0:1.9:g1",
    translationStatus: "skipped_policy",
    translationFields: { title: "skipped_policy", summary: "empty" },
    contentPolicy: {
      mode: "headlines-only",
      allowHeadlines: true,
      allowSummary: false,
      allowTitleTranslation: false,
      allowSummaryTranslation: false,
      licenseUrl: "https://example.org/license",
      reviewedAt: "2026-11-05",
      permissionReference: "SportNow-owned fictional test fixture",
      reason: "自有测试文本，仅用于自动化验收。",
    },
    isDemo: false,
    eventKey: "owned-event",
    ...overrides,
  };
}
export function newsFixture(
  articles: Article[] = [articleFixture()],
  generatedAt = "2026-11-05T08:00:00Z",
): NewsDocument {
  return { schemaVersion: 2, generatedAt, revision: "1".repeat(64), articles };
}
export function statusFixture(news: NewsDocument): SourcesStatusDocument {
  return {
    schemaVersion: 2,
    newsRevision: news.revision,
    updatedAt: news.generatedAt,
    lastSuccessfulUpdate: news.articles.length ? news.generatedAt : null,
    lastRunStatus: "ok",
    counts: {
      total: news.articles.length,
      nba: news.articles.filter((a) => a.category === "nba").length,
      football: news.articles.filter((a) => a.category === "football").length,
    },
    sources: [
      {
        sourceId: "owned-test",
        sourceName: "SportNow 自有测试内容",
        category: "nba",
        feedUrl: "https://example.org/feed",
        homepageUrl: "https://example.org/",
        fetchStatus: "ok",
        publicationStatus: "allowed",
        lastSuccessAt: news.generatedAt,
        lastError: null,
        httpStatus: 200,
        fetchedCount: news.articles.length,
        acceptedCount: news.articles.length,
        policyReason: "自有测试文本，仅用于验收。",
        licenseUrl: "https://example.org/license",
      },
    ],
    translation: {
      engine: "argos",
      libraryVersion: "1.11.0",
      modelVersion: "1.9",
      available: false,
      policyBlockedSources: 0,
    },
  };
}
