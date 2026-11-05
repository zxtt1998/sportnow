import { useEffect } from "react";
import {
  ArrowUpRight,
  Bookmark,
  ExternalLink,
  MessageCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { BackBar, EmptyState } from "../../components/common/Primitives";
import { ArticleCard, BookmarkButton } from "../../components/news/ArticleCard";
import { getEntity, sources } from "../../data/entities";
import { newsService } from "../../services/news";
import { useUser } from "../../stores/UserStore";
import { absoluteTime, assetUrl, sportLabel } from "../../utils/format";

export function ArticlePage() {
  const { id = "" } = useParams();
  const article = newsService.get(id);
  const { data, markRead, toggleBookmark } = useUser();
  useEffect(() => {
    if (article) markRead(article.id);
  }, [article, markRead]);
  useEffect(() => {
    document.title = article
      ? `${article.title} · SportNow`
      : "内容未找到 · SportNow";
    return () => {
      document.title = "SportNow · 为热爱在场";
    };
  }, [article]);
  if (!article)
    return (
      <div className="reading-container">
        <BackBar title="新闻详情" />
        <EmptyState
          title="这篇内容暂时不在场"
          description="链接可能有误，回首页继续发现体育故事。"
        >
          <Link className="primary-button" to="/">
            返回首页
          </Link>
        </EmptyState>
      </div>
    );
  const source = sources.find((s) => s.id === article.sourceId);
  const related = newsService
    .list({
      sport: article.sport,
      sort: "recommended",
      follows: [...article.teamIds, ...article.playerIds].map((id) => ({
        id,
        kind: "team",
        followedAt: article.publishedAt,
      })),
    })
    .filter((a) => a.id !== article.id)
    .slice(0, 3);
  const saved = data.bookmarks.some((b) => b.articleId === article.id);
  const hasOriginal =
    !!article.originalUrl && /^https?:\/\//.test(article.originalUrl);
  return (
    <div className="reading-container">
      <BackBar
        title={sportLabel(article.sport)}
        trailing={<BookmarkButton article={article} />}
      />
      <article className="article-detail">
        <div className="detail-kicker">
          <span className={`sport-text sport-${article.sport}`}>
            {sportLabel(article.sport)}
          </span>
          <span className="demo-label">原创演示</span>
          <span>约 2 分钟阅读</span>
        </div>
        <h1>
          {article.title.split(/(?<=[，：])/u).map((phrase, index) => (
            <span className="title-phrase" key={index}>{phrase}</span>
          ))}
        </h1>
        <p className="english-title" lang="en">
          {article.englishTitle}
        </p>
        <div className="detail-byline">
          <span className="byline-avatar">
            S<span>.</span>
          </span>
          <div>
            <strong>{source?.name}</strong>
            <p>
              <time dateTime={article.publishedAt}>
                {absoluteTime(article.publishedAt)}
              </time>
              <span> · 演示发布时间</span>
            </p>
          </div>
        </div>
        {article.image && (
          <figure className="detail-figure">
            <img
              src={assetUrl(article.image)}
              alt={article.imageAlt}
              width="1200"
              height="800"
            />
            <figcaption>SportNow 原创主题插画 · 非新闻现场照片</figcaption>
          </figure>
        )}
        <div className="detail-content">
          <div className="editor-note">
            <ShieldCheck size={19} />
            <p>
              <strong>关于这篇内容</strong>
              这是一篇为产品体验编写的原创演示，非真实新闻报道。没有对应原文，也没有来自媒体的真实采访。
            </p>
          </div>
          <h2>中文摘要</h2>
          <p className="detail-lead">{article.paragraphs[0]}</p>
          <p>{article.paragraphs[1]}</p>
          <blockquote>
            看见比分之外的细节，让每一份热爱都有自己的视角。
          </blockquote>
          <p>{article.paragraphs[2]}</p>
          <div className="detail-tags">
            {[...article.teamIds, ...article.playerIds].map((id) => (
              <Link to={`/search?entity=${id}`} key={id}>
                #{getEntity(id)?.shortName}
              </Link>
            ))}
            {article.tags.map((tag) => (
              <Link
                to={`/search?q=${encodeURIComponent(tag)}&sport=${article.sport}`}
                key={tag}
              >
                #{tag}
              </Link>
            ))}
          </div>
          <div className="detail-actions">
            <button
              className={`secondary-button ${saved ? "saved" : ""}`}
              aria-pressed={saved}
              onClick={() => toggleBookmark(article.id)}
            >
              <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
              {saved ? "已收藏" : "收藏文章"}
            </button>
            {hasOriginal ? (
              <a
                className="primary-button"
                href={article.originalUrl!}
                target="_blank"
                rel="noopener noreferrer"
              >
                阅读原文
                <ExternalLink size={17} />
              </a>
            ) : (
              <button className="primary-button" disabled>
                阅读原文
                <ArrowUpRight size={17} />
              </button>
            )}
          </div>
          {!hasOriginal && (
            <p className="original-note">
              演示内容暂无原文链接，不会跳转至虚构文章。
            </p>
          )}
          <section className="future-section">
            <h2>不止于阅读</h2>
            <div className="future-grid">
              <div>
                <span className="future-icon">
                  <Play size={19} />
                </span>
                <h3>比赛集锦</h3>
                <p>暂未关联官方视频</p>
                <span className="coming-label">功能预留</span>
              </div>
              <div>
                <span className="future-icon">
                  <MessageCircle size={19} />
                </span>
                <h3>球迷讨论</h3>
                <p>暂未关联外部讨论</p>
                <span className="coming-label">功能预留</span>
              </div>
            </div>
            <p className="future-note">
              未来将连接官方视频与公开讨论，不存储视频或自建评论。
            </p>
          </section>
        </div>
      </article>
      <section className="related-section">
        <div className="section-title">
          <h2>
            继续在场<span className="section-english">KEEP READING</span>
          </h2>
        </div>
        {related.map((a) => (
          <ArticleCard article={a} key={a.id} />
        ))}
      </section>
    </div>
  );
}
