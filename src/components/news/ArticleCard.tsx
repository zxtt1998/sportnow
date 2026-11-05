import { ArrowUpRight, Bookmark, Check, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useUser } from "../../stores/UserStore";
import { sources } from "../../data/entities";
import { assetUrl, relativeTime, sportLabel } from "../../utils/format";
import type { ArticleView as Article } from "../../types";

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
      onClick={() => toggleBookmark(article.id, article.record)}
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
  const sourceName = article.sourceName || source?.name;
  const featureImage =
    article.image ||
    `images/${article.sport === "football" ? "football" : "basketball"}.svg`;
  if (variant === "feature")
    return (
      <article className={`feature-card ${read ? "was-read" : ""}`}>
        {featureImage && (
          <img
            src={assetUrl(featureImage)}
            alt={article.imageAlt || "SportNow 原创主题插画，非新闻现场照片"}
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
          <span className="feature-demo">
            {article.isDemo
              ? "原创演示 · 战术观察"
              : article.record?.titleZh
                ? "RSS 来源 · 机器翻译"
                : "RSS 来源 · 英文原标题"}
          </span>
          <h2>{article.title}</h2>
          {article.summary && <p>{article.summary}</p>}
          <div className="feature-footer">
            <span>
              {sourceName} · {relativeTime(article.publishedAt)}
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
            <span className="demo-label">
              {article.isDemo
                ? "演示"
                : article.record?.titleZh
                  ? "机译"
                  : "原文"}
            </span>
            {read && (
              <span className="read-label">
                <Check size={11} />
                已读
              </span>
            )}
          </div>
          <h3>{article.title}</h3>
          {article.summary && <p>{article.summary}</p>}
          <div className="article-meta">
            <span>{sourceName?.replace("SportNow ", "")}</span>
            <span className="meta-dot">·</span>
            <time dateTime={article.publishedAt}>
              {relativeTime(article.publishedAt)}
            </time>
            {hot && article.isDemo && (
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
