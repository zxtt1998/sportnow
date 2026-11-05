import type {
  Article,
  ArticleView,
  NewsDocument,
  SourcesStatusDocument,
} from "../types";
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const date = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const https = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  try {
    const url = new URL(v);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !!url.hostname &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
};
export function parseNewsDocument(value: unknown): NewsDocument {
  if (
    !record(value) ||
    value.schemaVersion !== 2 ||
    !date(value.generatedAt) ||
    typeof value.revision !== "string" ||
    !/^[a-f\d]{64}$/.test(value.revision) ||
    !Array.isArray(value.articles) ||
    value.articles.length > 1000
  )
    throw new Error("新闻 JSON 格式不正确");
  const seen = new Set<string>();
  for (const a of value.articles) {
    if (
      !record(a) ||
      typeof a.id !== "string" ||
      !/^news-[a-f\d]{24}$/.test(a.id) ||
      seen.has(a.id) ||
      !["nba", "football"].includes(String(a.category)) ||
      a.isDemo !== false ||
      !https(a.originalUrl) ||
      !date(a.publishedAt) ||
      !date(a.fetchedAt)
    )
      throw new Error("新闻条目无效或包含演示数据");
    seen.add(a.id);
    for (const key of [
      "titleOriginal",
      "titleZh",
      "summaryOriginal",
      "summaryZh",
      "sourceId",
      "sourceName",
      "eventKey",
      "translationVersion",
    ])
      if (typeof a[key] !== "string") throw new Error("新闻文本字段缺失");
    if (
      !a.titleOriginal ||
      !a.sourceId ||
      !a.sourceName ||
      !strings(a.tags) ||
      !strings(a.teamIds) ||
      !strings(a.playerIds)
    )
      throw new Error("新闻标签字段无效");
    if (
      ![
        "translated",
        "partial",
        "unavailable",
        "failed",
        "skipped_policy",
        "pending",
      ].includes(String(a.translationStatus)) ||
      !record(a.translationFields) ||
      typeof a.translationFields.title !== "string" ||
      typeof a.translationFields.summary !== "string"
    )
      throw new Error("翻译状态无效");
    const p = a.contentPolicy;
    if (
      !record(p) ||
      !["headlines-only", "licensed-translation"].includes(String(p.mode)) ||
      p.allowHeadlines !== true ||
      typeof p.permissionReference !== "string" ||
      !p.permissionReference.trim() ||
      !https(p.licenseUrl)
    )
      throw new Error("缺少可公开展示的来源许可");
    for (const field of [
      "allowSummary",
      "allowTitleTranslation",
      "allowSummaryTranslation",
    ])
      if (typeof p[field] !== "boolean") throw new Error("来源许可字段无效");
    if (
      (a.summaryOriginal && !p.allowSummary) ||
      (a.titleZh && !p.allowTitleTranslation) ||
      (a.summaryZh && !p.allowSummaryTranslation)
    )
      throw new Error("内容超出来源许可范围");
  }
  return value as unknown as NewsDocument;
}
export function parseSourcesStatus(
  value: unknown,
  news: NewsDocument,
): SourcesStatusDocument {
  if (
    !record(value) ||
    value.schemaVersion !== 2 ||
    value.newsRevision !== news.revision ||
    !date(value.updatedAt) ||
    !Array.isArray(value.sources) ||
    !record(value.counts) ||
    !record(value.translation) ||
    !["ok", "partial", "failed"].includes(String(value.lastRunStatus))
  )
    throw new Error("来源状态与新闻版本不匹配");
  const counts = {
    total: news.articles.length,
    nba: news.articles.filter((a) => a.category === "nba").length,
    football: news.articles.filter((a) => a.category === "football").length,
  };
  for (const key of ["total", "nba", "football"] as const)
    if (counts[key] !== value.counts[key])
      throw new Error("来源状态计数不匹配");
  if (value.lastSuccessfulUpdate !== null && !date(value.lastSuccessfulUpdate))
    throw new Error("更新时间无效");
  for (const s of value.sources) {
    if (
      !record(s) ||
      typeof s.sourceId !== "string" ||
      typeof s.sourceName !== "string" ||
      !https(s.homepageUrl) ||
      !https(s.licenseUrl) ||
      !["ok", "error", "disabled"].includes(String(s.fetchStatus)) ||
      !["allowed", "blocked"].includes(String(s.publicationStatus)) ||
      typeof s.policyReason !== "string" ||
      !Number.isInteger(s.fetchedCount) ||
      !Number.isInteger(s.acceptedCount)
    )
      throw new Error("来源状态字段无效");
    if (s.lastSuccessAt !== null && !date(s.lastSuccessAt))
      throw new Error("来源时间无效");
    if (
      s.lastError !== null &&
      (!record(s.lastError) ||
        typeof s.lastError.message !== "string" ||
        !date(s.lastError.at))
    )
      throw new Error("来源错误字段无效");
  }
  return value as unknown as SourcesStatusDocument;
}
export function toArticleView(a: Article): ArticleView {
  return {
    id: a.id,
    title: a.titleZh || a.titleOriginal,
    englishTitle: a.titleOriginal,
    summary: a.summaryZh || a.summaryOriginal,
    paragraphs: [a.summaryZh || a.summaryOriginal].filter(Boolean),
    sport: a.category,
    sourceId: a.sourceId,
    sourceName: a.sourceName,
    publishedAt: a.publishedAt,
    originalUrl: a.originalUrl,
    teamIds: a.teamIds,
    playerIds: a.playerIds,
    tags: a.tags,
    demoHeat: 0,
    isDemo: false,
    videos: [],
    record: a,
    eventKey: a.eventKey,
  };
}
