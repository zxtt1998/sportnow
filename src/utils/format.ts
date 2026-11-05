import { newsService } from "../services/news";
export function relativeTime(iso: string) {
  const hours = Math.max(
    0,
    Math.floor((Date.parse(newsService.demoNow) - Date.parse(iso)) / 3600000),
  );
  return hours < 1
    ? "刚刚"
    : hours < 24
      ? `${hours} 小时前`
      : `${Math.floor(hours / 24)} 天前`;
}
export const absoluteTime = (iso: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date(iso));
export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
export const sportLabel = (sport: string) =>
  sport === "nba" ? "NBA" : sport === "football" ? "足球" : "综合体育";
