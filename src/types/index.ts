export type Sport = "nba" | "football" | "other";
export interface NewsSource {
  id: string;
  name: string;
  isDemo: boolean;
  homepageUrl?: string;
}
export interface Team {
  id: string;
  name: string;
  englishName: string;
  shortName: string;
  sport: Sport;
  color: string;
}
export interface Player {
  id: string;
  name: string;
  englishName: string;
  shortName: string;
  sport: Sport;
  color: string;
  teamId?: string;
}
export interface Follow {
  id: string;
  kind: "team" | "player";
  followedAt: string;
}
export interface Bookmark {
  articleId: string;
  savedAt: string;
  snapshot?: Article;
}
export interface Video {
  id: string;
  title: string;
  url: string | null;
  provider: string;
  isDemo: boolean;
}
export interface ArticleView {
  id: string;
  title: string;
  englishTitle: string;
  summary: string;
  paragraphs: string[];
  sport: Sport;
  sourceId: string;
  publishedAt: string;
  originalUrl: string | null;
  image?: string;
  imageAlt?: string;
  teamIds: string[];
  playerIds: string[];
  tags: string[];
  demoHeat: number;
  isDemo: boolean;
  videos: Video[];
  record?: Article;
  sourceName?: string;
  eventKey?: string;
}
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  sort: "recommended" | "latest";
  density: "comfortable" | "compact";
}
export interface ReadEntry {
  articleId: string;
  readAt: string;
}
export interface UserData {
  version: 1;
  preferences: UserPreferences;
  follows: Follow[];
  bookmarks: Bookmark[];
  history: ReadEntry[];
}
export type FeedSort = UserPreferences["sort"] | "hot";

export interface ContentPolicy {
  mode: "blocked" | "headlines-only" | "licensed-translation";
  allowHeadlines: boolean;
  allowSummary: boolean;
  allowTitleTranslation: boolean;
  allowSummaryTranslation: boolean;
  licenseUrl: string;
  reviewedAt: string;
  permissionReference: string;
  reason: string;
}
export interface Article {
  id: string;
  category: "nba" | "football";
  sourceId: string;
  sourceName: string;
  titleOriginal: string;
  titleZh: string;
  summaryOriginal: string;
  summaryZh: string;
  originalUrl: string;
  publishedAt: string;
  fetchedAt: string;
  tags: string[];
  teamIds: string[];
  playerIds: string[];
  translationStatus:
    | "translated"
    | "partial"
    | "unavailable"
    | "failed"
    | "skipped_policy"
    | "pending";
  translationFields: { title: string; summary: string };
  translationVersion: string;
  contentPolicy: ContentPolicy;
  isDemo: false;
  eventKey: string;
}
export interface NewsDocument {
  schemaVersion: 2;
  generatedAt: string;
  revision: string;
  articles: Article[];
}
export interface SourceStatus {
  sourceId: string;
  sourceName: string;
  category: "nba" | "football";
  feedUrl: string;
  homepageUrl: string;
  fetchStatus: "ok" | "error" | "disabled";
  publicationStatus: "allowed" | "blocked";
  lastSuccessAt: string | null;
  lastError: { code: string; message: string; at: string } | null;
  httpStatus: number | null;
  fetchedCount: number;
  acceptedCount: number;
  policyReason: string;
  licenseUrl: string;
}
export interface SourcesStatusDocument {
  schemaVersion: 2;
  newsRevision: string;
  updatedAt: string;
  lastSuccessfulUpdate: string | null;
  lastRunStatus: "ok" | "partial" | "failed";
  counts: { total: number; nba: number; football: number };
  sources: SourceStatus[];
  translation: {
    engine: string;
    libraryVersion: string;
    modelVersion: string;
    available: boolean;
    policyBlockedSources: number;
  };
}
