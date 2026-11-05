import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useNews } from "../../hooks/useNews";
import { newsService } from "../../services/news";
import { absoluteTime, assetUrl } from "../../utils/format";

export function NewsNotice() {
  const news = useNews();
  return (
    <div className="demo-notice" role="status">
      <span className="demo-notice-dot" />
      <span>
        {news.mode === "demo"
          ? "本地演示内容 · 非真实新闻报道"
          : news.loading
            ? "正在检查新闻更新…"
            : news.cached
              ? "正在显示上次成功缓存 · 可能不是最新新闻"
              : news.document?.articles.length
                ? "RSS 原文索引 · 中文仅显示获准翻译的内容"
                : "RSS 来源导航 · 条目展示许可待确认"}
      </span>
    </div>
  );
}
export function NewsAvailability({ sport }: { sport?: "nba" | "football" }) {
  const news = useNews();
  const sources =
    news.sources?.sources.filter(
      (source) => !sport || source.category === sport,
    ) ?? [];
  if (news.loading && !news.document)
    return (
      <div className="news-loading" role="status">
        <RefreshCw size={19} className="spinning" />
        正在读取新闻数据…
      </div>
    );
  return (
    <section className="source-directory" aria-label="新闻来源入口">
      <div className="feature-card source-feature">
        <img
          className="feature-image"
          src={assetUrl(
            sport === "football"
              ? "images/football.svg"
              : "images/basketball.svg",
          )}
          alt="SportNow 原创球场主题插画，非新闻现场照片"
          width="1200"
          height="800"
        />
        <div className="feature-shade" />
        <div className="feature-top">
          <span className="feature-label">
            <span className="status-dot" />
            你的体育来源 / SOURCES
          </span>
          <ShieldCheck size={19} />
        </div>
        <div className="feature-body">
          <span className="feature-demo">尊重来源 · 保留原文</span>
          <h2>你的热爱，直达原站。</h2>
          <p>
            {news.error && !news.document
              ? "暂时无法读取新闻数据，请联网后重试。"
              : "来源已配置。公开保存、聚合与翻译需要明确许可；确认前可直接前往官方来源阅读。"}
          </p>
        </div>
      </div>
      {news.error && (
        <p className="news-message" role="status">
          {news.error}
        </p>
      )}
      {sources.length > 0 && (
        <div className="source-links">
          {sources.map((source) => (
            <a
              href={source.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              key={source.sourceId}
            >
              <span>
                <strong>{source.sourceName}</strong>
                <small>
                  {source.fetchStatus === "error"
                    ? "最近 RSS 检查失败"
                    : source.fetchStatus === "ok"
                      ? "RSS 检查成功"
                      : "来源未启用"}{" "}
                  ·{" "}
                  {source.publicationStatus === "blocked"
                    ? "转载许可待确认"
                    : "原文阅读"}
                </small>
              </span>
              <ExternalLink size={17} />
            </a>
          ))}
        </div>
      )}
      {!news.document && (
        <button
          className="secondary-button"
          onClick={() => void newsService.refresh()}
        >
          重新读取
          <RefreshCw size={15} />
        </button>
      )}
    </section>
  );
}
export function NewsStatusPanel() {
  const news = useNews();
  const counts = news.sources?.counts ?? {
    total: news.articles.length,
    nba: news.articles.filter((a) => a.sport === "nba").length,
    football: news.articles.filter((a) => a.sport === "football").length,
  };
  return (
    <section
      className="news-status-panel settings-section"
      aria-label="新闻更新状态"
    >
      <div className="panel-heading">
        <h2>新闻更新状态</h2>
        <button
          className="text-button"
          disabled={news.loading}
          onClick={() => void newsService.refresh()}
        >
          <RefreshCw size={14} className={news.loading ? "spinning" : ""} />
          检查更新
        </button>
      </div>
      <dl className="news-status-summary">
        <div>
          <dt>公开新闻</dt>
          <dd>
            {counts.total} 篇 · NBA {counts.nba} · 足球 {counts.football}
          </dd>
        </div>
        <div>
          <dt>最近内容更新</dt>
          <dd>
            {news.sources?.lastSuccessfulUpdate
              ? absoluteTime(news.sources.lastSuccessfulUpdate)
              : "尚无获准公开的新闻"}
          </dd>
        </div>
        <div>
          <dt>最近采集结果</dt>
          <dd>
            {!news.sources
              ? "来源状态暂不可用"
              : news.sources.lastRunStatus === "ok"
                ? "RSS 检查成功"
                : news.sources.lastRunStatus === "partial"
                  ? "部分来源失败，其他来源独立保留"
                  : "采集失败，保留已有内容"}
          </dd>
        </div>
        <div>
          <dt>当前数据</dt>
          <dd>
            {news.mode === "demo"
              ? "开发演示模式"
              : news.cached
                ? "本机缓存 · 可能已过期"
                : news.document
                  ? "已从站点检查"
                  : "尚未加载"}
          </dd>
        </div>
      </dl>
      {news.error && (
        <p className="news-message" role="status">
          {news.error}
        </p>
      )}
      <div className="source-health-list">
        {news.sources?.sources.map((source) => (
          <div className="source-health" key={source.sourceId}>
            <div>
              <strong>{source.sourceName}</strong>
              <span
                className={source.fetchStatus === "error" ? "danger-text" : ""}
              >
                {source.fetchStatus === "ok"
                  ? "抓取成功"
                  : source.fetchStatus === "error"
                    ? "抓取失败"
                    : "未启用"}{" "}
                · {source.fetchedCount} 条 RSS 条目
              </span>
            </div>
            <p>
              最近成功记录：
              {source.lastSuccessAt
                ? absoluteTime(source.lastSuccessAt)
                : "暂无"}
            </p>
            <p>{source.policyReason}</p>
            {source.lastError && (
              <p className="danger-text">
                {source.lastError.code}：{source.lastError.message}
              </p>
            )}
            <a
              href={source.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              访问来源
              <ExternalLink size={12} />
            </a>
            <a
              href={source.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              使用条款
              <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>
      <p className="news-status-footnote">
        每小时第 17 分钟计划检查，GitHub Actions
        可能延迟。时间表示最近一次被记录的内容或状态变化；无变化的检查仅记录在
        Actions 日志中。
      </p>
    </section>
  );
}
