import { getEntity, players } from "../data/entities";
import type { UserData } from "../types";
export const STORAGE_KEY = "sportnow:v1";
export const defaultData = (): UserData => ({
  version: 1,
  preferences: { theme: "system", sort: "recommended", density: "comfortable" },
  follows: ["spurs", "madrid", "ronaldo"].map((id) => ({
    id,
    kind: id === "ronaldo" ? "player" : "team",
    followedAt: "2026-11-05T00:00:00.000Z",
  })),
  bookmarks: [],
  history: [],
});
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const validDate = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
export function parseUserData(raw: string | null): UserData {
  const fallback = defaultData();
  if (!raw) return fallback;
  try {
    const d: unknown = JSON.parse(raw);
    if (!record(d) || d.version !== 1) return fallback;
    const p = record(d.preferences) ? d.preferences : {};
    const unique = <T>(items: T[], key: (item: T) => string) =>
      items.filter(
        (item, index, arr) =>
          arr.findIndex((x) => key(x) === key(item)) === index,
      );
    return {
      version: 1,
      preferences: {
        theme:
          p.theme === "dark" || p.theme === "light" || p.theme === "system"
            ? p.theme
            : fallback.preferences.theme,
        sort:
          p.sort === "latest" || p.sort === "recommended"
            ? p.sort
            : fallback.preferences.sort,
        density:
          p.density === "compact" || p.density === "comfortable"
            ? p.density
            : fallback.preferences.density,
      },
      follows: Array.isArray(d.follows)
        ? unique(
            d.follows
              .filter(record)
              .filter(
                (f) =>
                  typeof f.id === "string" &&
                  !!getEntity(f.id) &&
                  validDate(f.followedAt),
              )
              .map((f) => ({
                id: String(f.id),
                kind: players.some((p) => p.id === f.id)
                  ? ("player" as const)
                  : ("team" as const),
                followedAt: String(f.followedAt),
              })),
            (x) => x.id,
          )
        : fallback.follows,
      bookmarks: Array.isArray(d.bookmarks)
        ? unique(
            d.bookmarks
              .filter(record)
              .filter(
                (b) => typeof b.articleId === "string" && validDate(b.savedAt),
              )
              .map((b) => ({
                articleId: String(b.articleId),
                savedAt: String(b.savedAt),
              })),
            (x) => x.articleId,
          )
        : [],
      history: Array.isArray(d.history)
        ? unique(
            d.history
              .filter(record)
              .filter(
                (h) => typeof h.articleId === "string" && validDate(h.readAt),
              )
              .map((h) => ({
                articleId: String(h.articleId),
                readAt: String(h.readAt),
              }))
              .slice(0, 100),
            (x) => x.articleId,
          )
        : [],
    };
  } catch {
    return fallback;
  }
}
