import { NewsAvailability, NewsNotice } from "../../components/news/NewsStatus";
import { useNews } from "../../hooks/useNews";
import { useRef, useState } from "react";
import type { TouchEvent } from "react";
import { ArrowDown, ArrowRight, Flame, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Aside } from "../../components/layout/Aside";
import { ArticleCard } from "../../components/news/ArticleCard";
import { FollowStrip } from "../../components/news/FollowStrip";
import { newsService } from "../../services/news";
import { useUser } from "../../stores/UserStore";
import type { FeedSort, Sport } from "../../types";

export function HomePage() {
  const news = useNews();
  const { data, setPreferences } = useUser();
  const [params, setParams] = useSearchParams();
  const requested = params.get("feed");
  const sort: FeedSort =
    requested === "hot" || requested === "latest" || requested === "recommended"
      ? requested
      : data.preferences.sort;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [pull, setPull] = useState(0);
  const start = useRef<number | null>(null);
  const list = newsService.list({
    sort: sort === "hot" && news.mode !== "demo" ? "recommended" : sort,
    follows: data.follows,
  });
  const hero = list.find((a) => a.image) ?? list[0];
  const changeFeed = (value: FeedSort) => {
    setParams({ feed: value }, { replace: true });
    if (value !== "hot") setPreferences({ sort: value });
  };
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([
      newsService.refresh(),
      new Promise((resolve) => setTimeout(resolve, 450)),
    ]);
    setRefreshing(false);
    setRefreshed(true);
    setPull(0);
  };
  const touchStart = (e: TouchEvent) => {
    start.current =
      window.scrollY <= 0 && e.touches.length === 1
        ? e.touches[0].clientY
        : null;
  };
  const touchMove = (e: TouchEvent) => {
    if (start.current !== null && window.scrollY <= 0)
      setPull(
        Math.min(
          90,
          Math.max(0, (e.touches[0].clientY - start.current) * 0.45),
        ),
      );
  };
  const touchEnd = () => {
    if (pull > 55) void refresh();
    else setPull(0);
    start.current = null;
  };
  const section = (sport: Sport, title: string, english: string, limit = 4) => (
    <section className="news-section" key={sport}>
      <div className="section-title">
        <h2>
          <span className={`section-marker marker-${sport}`} />
          {title}
          <span className="section-english">{english}</span>
        </h2>
        {sport !== "other" && (
          <Link to={sport === "nba" ? "/nba" : "/football"}>
            全部
            <ArrowRight size={15} />
          </Link>
        )}
      </div>
      <div className="news-list">
        {list
          .filter((a) => a.sport === sport && a.id !== hero?.id)
          .slice(0, limit)
          .map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              hot={sort === "hot"}
            />
          ))}
      </div>
    </section>
  );
  return (
    <div
      className="home-page"
      onTouchStart={touchStart}
      onTouchMove={touchMove}
      onTouchEnd={touchEnd}
      onTouchCancel={() => {
        start.current = null;
        setPull(0);
      }}
    >
      <div
        className="pull-indicator"
        style={{ height: refreshing ? 42 : pull }}
        aria-hidden={!refreshing && pull === 0}
      >
        <RefreshCw size={17} className={refreshing ? "spinning" : ""} />
        <span>
          {refreshing
            ? news.mode === "demo"
              ? "正在重新载入本地演示数据"
              : "正在检查站点新闻数据"
            : pull > 55
              ? "松开检查新闻更新"
              : "下拉检查新闻更新"}
        </span>
      </div>
      <div className="page-heading">
        <div>
          <div className="date-line">
            {new Intl.DateTimeFormat("zh-CN", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
            <span className="tiny-dot" />
            {news.mode === "demo" ? "演示刊" : "体育阅读"}
          </div>
          <h1>
            为热爱<span className="accent-text">，</span>在场
            <span className="accent-text">。</span>
          </h1>
          <p>你的球队，你的球员，你的体育时刻。</p>
        </div>
        <span className="heading-stamp">
          YOUR GAME.
          <br />
          <strong>YOUR WORLD.</strong>
        </span>
      </div>
      <div className="content-columns">
        <div className="main-feed">
          <div className="feed-toolbar">
            <div className="feed-tabs" role="group" aria-label="首页栏目">
              {(
                [
                  { value: "recommended", label: "推荐" },
                  { value: "latest", label: "最新" },
                  {
                    value: "hot",
                    label: news.mode === "demo" ? "热门" : "精选",
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => changeFeed(tab.value)}
                  aria-pressed={sort === tab.value}
                  className={sort === tab.value ? "active" : ""}
                >
                  {tab.value === "hot" && <Flame size={15} />} {tab.label}
                </button>
              ))}
            </div>
            <button
              className="refresh-button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="检查新闻更新"
            >
              <RefreshCw size={14} className={refreshing ? "spinning" : ""} />
              <span>刷新</span>
            </button>
          </div>
          <NewsNotice />
          <div role="status" className="refresh-status">
            {refreshed &&
              (news.mode === "demo"
                ? "已重新载入本地演示数据，没有获取网络新闻。"
                : news.error ||
                  (news.cached
                    ? "当前使用缓存新闻，网络恢复后会再次检查。"
                    : "已检查站点新闻数据；来源抓取由 GitHub Actions 执行。"))}
          </div>
          {hero ? (
            <>
              <ArticleCard article={hero} variant="feature" />
              <div className="feature-caption">
                <span>THE SPOTLIGHT</span>
                <span>原创主题插画 · 非新闻现场照片</span>
              </div>
            </>
          ) : (
            <NewsAvailability />
          )}
          <div className="mobile-follows">
            <FollowStrip />
          </div>
          {sort === "recommended" ? (
            <>
              {section("nba", "篮下之间", "NBA")}
              {section("football", "绿茵视角", "FOOTBALL")}
              {list.some((a) => a.sport === "other") &&
                section("other", "赛场之外", "MORE SPORTS", 2)}
            </>
          ) : (
            <section className="news-section">
              <div className="section-title">
                <h2>
                  <span className="section-marker" />
                  {sort === "hot" ? "热门精选" : "最新动态"}
                  <span className="section-english">
                    {sort === "hot" ? "EDITOR PICKS" : "THE LATEST"}
                  </span>
                </h2>
                <span className="section-count">
                  {Math.max(0, list.length - (hero ? 1 : 0))} 篇
                </span>
              </div>
              <div className="news-list">
                {list
                  .filter((a) => a.id !== hero?.id)
                  .map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      hot={sort === "hot"}
                    />
                  ))}
              </div>
            </section>
          )}
          <div className="end-note">
            <span />
            <ArrowDown size={15} />
            <span />
          </div>
          <p className="end-copy">
            暂时读到这里，热爱仍在继续。
            <br />
            <small>
              {news.mode === "demo"
                ? "演示数据 · 非真实报道"
                : "发布时间来自来源；中文不可用时保留英文"}
            </small>
          </p>
        </div>
        <Aside />
      </div>
    </div>
  );
}
