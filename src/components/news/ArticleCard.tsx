import { ArrowUpRight, Bookmark, Check, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "../../stores/UserStore";
import { sources } from "../../data/entities";
import { assetUrl, relativeTime, sportLabel } from "../../utils/format";
import type { Article } from "../../types";

export function BookmarkButton({
  article,
  overlay = false,
}: {
  article: Article;
  overlay?: boolean;
}) {
  const { data, toggleBookmark } = useUser();
  const saved = data.bookmarks.some((b) => b.articleId === article.id);
  return (
    <button
      type="button"
      className={`icon-button bookmark-button ${overlay ? "on-image" : ""} ${saved ? "is-saved" : ""}`}
      aria-label={`${saved ? "取消收藏" : "收藏"}：${article.title}`}
      aria-pressed={saved}
      onClick={() => toggleBookmark(article.id)}
    >
      <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
export function ArticleCard({
  article,
  variant = "row",
  hot = false,
}: {
  article: Article;
  variant?: "row" | "feature" | "tile";
  hot?: boolean;
}) {
  const { data } = useUser();
  const read = data.history.some((h) => h.articleId === article.id);
  const source = sources.find((s) => s.id === article.sourceId);
  if (variant === "feature")
    return (
      <article className={`feature-card ${read ? "was-read" : ""}`}>
        {article.image && (
          <img
            src={assetUrl(article.image)}
            alt={article.imageAlt}
            className="feature-image"
            fetchPriority="high"
            width="1200"
            height="800"
          />
        )}
        <div className="feature-shade" />
        <div className="feature-top">
          <span className="feature-label">
            <span className="status-dot" />
            今日焦点<span className="label-divider">/</span>
            {sportLabel(article.sport)}
          </span>
          <BookmarkButton article={article} overlay />
        </div>
        <Link className="feature-body" to={`/article/${article.id}`}>
          <span className="feature-demo">原创演示 · 战术观察</span>
          <h2>{article.title}</h2>
          <p>{article.summary}</p>
          <div className="feature-footer">
            <span>
              {source?.name} · {relativeTime(article.publishedAt)}
              {read ? " · 已读" : ""}
            </span>
            <span className="feature-arrow">
              <ArrowUpRight size={23} />
            </span>
          </div>
        </Link>
      </article>
    );
  return (
    <article
      className={`article-card article-${variant} ${read ? "was-read" : ""} ${article.image ? "" : "text-only"}`}
    >
      <Link to={`/article/${article.id}`} className="article-card-link">
        {article.image && (
          <div className="article-media">
            <img
              src={assetUrl(article.image)}
              alt={article.imageAlt}
              loading="lazy"
              width="1200"
              height="800"
            />
            <span className="media-label">原创插画</span>
          </div>
        )}
        <div className="article-copy">
          <div className="article-kicker">
            <span className={`sport-text sport-${article.sport}`}>
              {sportLabel(article.sport)}
            </span>
            <span className="demo-label">演示</span>
            {read && (
              <span className="read-label">
                <Check size={11} />
                已读
              </span>
            )}
          </div>
          <h3>{article.title}</h3>
          <p>{article.summary}</p>
          <div className="article-meta">
            <span>{source?.name?.replace("SportNow ", "")}</span>
            <span className="meta-dot">·</span>
            <time dateTime={article.publishedAt}>
              {relativeTime(article.publishedAt)}
            </time>
            {hot && (
              <span className="heat">
                <Flame size={12} />
                {article.demoHeat} 模拟
              </span>
            )}
          </div>
        </div>
      </Link>
      <BookmarkButton article={article} />
    </article>
  );
}
