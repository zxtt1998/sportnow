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
  const list = newsService.list({ sort, follows: data.follows });
  const hero = list.find((a) => a.image)!;
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
          .filter((a) => a.sport === sport && a.id !== hero.id)
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
            ? "正在重新载入本地演示数据"
            : pull > 55
              ? "松开刷新本地演示"
              : "下拉刷新本地演示"}
        </span>
      </div>
      <div className="page-heading">
        <div>
          <div className="date-line">
            11 月 5 日 · 星期四
            <span className="tiny-dot" />
            演示刊
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
                  { value: "hot", label: "热门" },
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
              aria-label="刷新本地演示数据"
            >
              <RefreshCw size={14} className={refreshing ? "spinning" : ""} />
              <span>刷新</span>
            </button>
          </div>
          <div className="demo-notice">
            <span className="demo-notice-dot" />
            <span>
              {sort === "hot"
                ? "热度为模拟分数，不代表真实阅读量"
                : "本地演示内容 · 非真实新闻报道"}
            </span>
            <span className="demo-edition">VOL. 001</span>
          </div>
          <div role="status" className="refresh-status">
            {refreshed && "已重新载入本地演示数据，没有获取网络新闻。"}
          </div>
          <ArticleCard article={hero} variant="feature" />
          <div className="feature-caption">
            <span>THE SPOTLIGHT</span>
            <span>原创插画 · 非现场照片</span>
          </div>
          <div className="mobile-follows">
            <FollowStrip />
          </div>
          {sort === "recommended" ? (
            <>
              {section("nba", "篮下之间", "NBA")}
              {section("football", "绿茵视角", "FOOTBALL")}
              {section("other", "赛场之外", "MORE SPORTS", 2)}
            </>
          ) : (
            <section className="news-section">
              <div className="section-title">
                <h2>
                  <span className="section-marker" />
                  {sort === "hot" ? "热门精选" : "最新动态"}
                  <span className="section-english">
                    {sort === "hot" ? "DEMO PICKS" : "THE LATEST"}
                  </span>
                </h2>
                <span className="section-count">{list.length - 1} 篇</span>
              </div>
              <div className="news-list">
                {list
                  .filter((a) => a.id !== hero.id)
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
            <small>以上时间均相对于演示刊时间显示</small>
          </p>
        </div>
        <Aside />
      </div>
    </div>
  );
}
