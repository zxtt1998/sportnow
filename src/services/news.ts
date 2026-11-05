import { articles, DEMO_NOW } from "../data/articles";
import { getEntity } from "../data/entities";
import type { Article, FeedSort, Follow, Sport } from "../types";

export interface NewsQuery {
  sport?: Sport;
  query?: string;
  tag?: string;
  entityId?: string;
  sort?: FeedSort;
  follows?: Follow[];
}
export const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
export function selectArticles(
  data: readonly Article[],
  options: NewsQuery = {},
): Article[] {
  const {
    sport,
    query = "",
    tag,
    entityId,
    sort = "latest",
    follows = [],
  } = options;
  const words = normalize(query).split(" ").filter(Boolean);
  const followed = new Set(follows.map((f) => f.id));
  const preference = (a: Article) =>
    [...a.teamIds, ...a.playerIds].reduce(
      (score, id) => score + (followed.has(id) ? 1 : 0),
      0,
    );
  return data
    .filter((a) => {
      if (sport && a.sport !== sport) return false;
      if (tag && !a.tags.includes(tag)) return false;
      if (
        entityId &&
        !a.teamIds.includes(entityId) &&
        !a.playerIds.includes(entityId)
      )
        return false;
      const entities = [...a.teamIds, ...a.playerIds]
        .map((id) => {
          const e = getEntity(id);
          return e ? `${e.name} ${e.englishName} ${e.shortName}` : "";
        })
        .join(" ");
      const haystack = normalize(
        `${a.title} ${a.englishTitle} ${a.summary} ${a.tags.join(" ")} ${entities} ${a.sport === "nba" ? "NBA 篮球" : a.sport === "football" ? "足球" : "其他体育"}`,
      );
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => {
      if (sort === "recommended") {
        const diff = preference(b) - preference(a);
        if (diff) return diff;
      }
      if (sort === "hot" && a.demoHeat !== b.demoHeat)
        return b.demoHeat - a.demoHeat;
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
}
// Replace this adapter with a validated fetch(`${import.meta.env.BASE_URL}data/news.json`)
// in phase two. UI pages consume this contract rather than importing fixture files.
export const newsService = {
  list: (options: NewsQuery = {}) => selectArticles(articles, options),
  get: (id: string) => articles.find((article) => article.id === id),
  refresh: async () => ({
    articles: [...articles],
    isDemo: true as const,
    refreshedAt: new Date().toISOString(),
  }),
  demoNow: DEMO_NOW,
};
