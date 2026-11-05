import { newsStore } from "./news-store";
import { getEntity } from "../data/entities";
import type { ArticleView as Article, FeedSort, Follow, Sport } from "../types";

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
      if (sort === "hot" && a.isDemo && b.isDemo && a.demoHeat !== b.demoHeat)
        return b.demoHeat - a.demoHeat;
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
}
export const newsService = {
  list: (options: NewsQuery = {}) => {
    const list = selectArticles(newsStore.getSnapshot().articles, options);
    if (options.sort !== "recommended") return list;
    const seen = new Set<string>();
    const primary: Article[] = [];
    const repeated: Article[] = [];
    for (const a of list) {
      const key = a.eventKey || a.id;
      if (seen.has(key)) repeated.push(a);
      else {
        seen.add(key);
        primary.push(a);
      }
    }
    return [...primary, ...repeated];
  },
  get: (id: string) =>
    newsStore.getSnapshot().articles.find((article) => article.id === id),
  refresh: async () => {
    await newsStore.refresh();
    return newsStore.getSnapshot();
  },
};
