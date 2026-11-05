import { NewsAvailability, NewsNotice } from "./NewsStatus";
import { useNews } from "../../hooks/useNews";
import { ArrowDownWideNarrow, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { newsService } from "../../services/news";
import { useUser } from "../../stores/UserStore";
import { Aside } from "../layout/Aside";
import { ArticleCard } from "./ArticleCard";
import { EmptyState } from "../common/Primitives";
import type { Sport } from "../../types";
const categories = {
  nba: ["全部", "马刺", "交易", "伤病", "球员"],
  football: ["全部", "皇家马德里", "转会", "欧冠", "五大联赛"],
};
export function SportFeed({
  sport,
}: {
  sport: Extract<Sport, "nba" | "football">;
}) {
  const news = useNews();
  const [params, setParams] = useSearchParams();
  const category = categories[sport].includes(params.get("category") || "")
    ? params.get("category")!
    : "全部";
  const { data } = useUser();
  const recommended = params.get("sort") === "recommended";
  const items = newsService.list({
    sport,
    tag: category === "全部" ? undefined : category,
    sort: recommended ? "recommended" : "latest",
    follows: data.follows,
  });
  const featured = items.find((a) => a.image) ?? items[0];
  const setCategory = (value: string) => {
    setParams(
      (p) => {
        p.set("category", value);
        return p;
      },
      { replace: true },
    );
  };
  return (
    <div>
      <div className="page-heading sport-heading">
        <div>
          <div className="date-line">
            {sport === "nba"
              ? "EVERY POSSESSION MATTERS"
              : "THE BEAUTIFUL GAME"}
          </div>
          <h1>
            {sport === "nba" ? "NBA" : "足球"}
            <span className="accent-text">.</span>
          </h1>
          <p>
            {sport === "nba"
              ? "从篮下到远方，每一回合都值得。"
              : "从伯纳乌到世界，热爱永不越位。"}
          </p>
        </div>
        <Link
          className="round-search"
          to={`/search?sport=${sport}`}
          aria-label={`搜索${sport === "nba" ? "NBA" : "足球"}新闻`}
        >
          <Search size={22} />
        </Link>
      </div>
      <div className="content-columns">
        <div className="main-feed">
          <div
            className="category-tabs"
            role="group"
            aria-label={`${sport === "nba" ? "NBA" : "足球"}分类`}
          >
            {categories[sport].map((value) => (
              <button
                className={category === value ? "active" : ""}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                key={value}
              >
                {value}
              </button>
            ))}
          </div>
          <NewsNotice />
          {featured && <ArticleCard article={featured} variant="feature" />}
          <div className="section-title feed-list-heading">
            <h2>
              {category === "全部" ? "全部动态" : category}
              <span className="section-count">{items.length} 篇</span>
            </h2>
            <button
              className="sort-control"
              onClick={() =>
                setParams(
                  (p) => {
                    p.set("sort", recommended ? "latest" : "recommended");
                    return p;
                  },
                  { replace: true },
                )
              }
            >
              <ArrowDownWideNarrow size={15} />
              {recommended ? "关注优先" : "最新发布"}
            </button>
          </div>
          <div className="news-list">
            {items
              .filter((a) => a.id !== featured?.id)
              .map((article) => (
                <ArticleCard article={article} key={article.id} />
              ))}
          </div>
          {items.length === 0 && category === "全部" ? (
            <NewsAvailability sport={sport} />
          ) : (
            items.length === 0 && (
              <EmptyState
                title="这个分类暂无新闻"
                description="试试其他分类，或查看全部新闻。"
              >
                <button
                  className="primary-button"
                  onClick={() => setCategory("全部")}
                >
                  查看全部
                </button>
              </EmptyState>
            )
          )}
          <p className="end-copy">
            {items.length} 篇
            {news.mode === "demo" ? "原创演示" : "获准公开的新闻索引"}
          </p>
        </div>
        <Aside />
      </div>
    </div>
  );
}
