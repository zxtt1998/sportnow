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
}
export interface Video {
  id: string;
  title: string;
  url: string | null;
  provider: string;
  isDemo: boolean;
}
export interface Article {
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
