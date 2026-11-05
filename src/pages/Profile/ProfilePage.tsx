import { useState } from "react";
import { Bookmark, Clock3, Heart, Settings2, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Dialog,
  EmptyState,
  Segments,
} from "../../components/common/Primitives";
import { ArticleCard } from "../../components/news/ArticleCard";
import { newsService } from "../../services/news";
import { useUser } from "../../stores/UserStore";
import { FollowManager } from "./FollowManager";
import { Settings } from "./Settings";
import type { Article } from "../../types";
const tabs = [
  { value: "bookmarks", label: "我的收藏", Icon: Bookmark },
  { value: "follows", label: "我的关注", Icon: Heart },
  { value: "history", label: "阅读记录", Icon: Clock3 },
  { value: "settings", label: "设置", Icon: Settings2 },
];
export function ProfilePage() {
  const { data, clearHistory } = useUser();
  const [params, setParams] = useSearchParams();
  const tab = tabs.some((t) => t.value === params.get("tab"))
    ? params.get("tab")!
    : "bookmarks";
  const filter =
    params.get("sport") === "nba" || params.get("sport") === "football"
      ? params.get("sport")!
      : "all";
  const [confirmClear, setConfirmClear] = useState(false);
  const ids =
    tab === "history"
      ? data.history.map((h) => h.articleId)
      : data.bookmarks.map((b) => b.articleId);
  const list = ids
    .map((id) => newsService.get(id))
    .filter(
      (a): a is Article => !!a && (filter === "all" || a.sport === filter),
    );
  const setTab = (value: string) =>
    setParams({ tab: value }, { replace: true });
  return (
    <div className="profile-container">
      <div className="page-heading">
        <div>
          <div className="date-line">A SPACE OF YOUR OWN</div>
          <h1>
            我的主场<span className="accent-text">。</span>
          </h1>
          <p>留住好内容，关注每一份热爱。</p>
        </div>
        <span className="profile-avatar">
          S<span>.</span>
        </span>
      </div>
      <div className="profile-stats">
        <button onClick={() => setTab("bookmarks")}>
          <strong>{data.bookmarks.length.toString().padStart(2, "0")}</strong>
          <span>收藏内容</span>
        </button>
        <button onClick={() => setTab("follows")}>
          <strong>{data.follows.length.toString().padStart(2, "0")}</strong>
          <span>关注对象</span>
        </button>
        <button onClick={() => setTab("history")}>
          <strong>{data.history.length.toString().padStart(2, "0")}</strong>
          <span>阅读足迹</span>
        </button>
      </div>
      <div className="profile-tabs" role="group" aria-label="我的栏目">
        {tabs.map(({ value, label, Icon }) => (
          <button
            className={tab === value ? "active" : ""}
            aria-pressed={tab === value}
            key={value}
            onClick={() => setTab(value)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="profile-content">
        {tab === "follows" ? (
          <FollowManager />
        ) : tab === "settings" ? (
          <Settings />
        ) : (
          <>
            <div className="panel-heading">
              <h2>{tab === "history" ? "最近阅读" : "值得再读一次"}</h2>
              {tab === "history" && data.history.length > 0 && (
                <button
                  className="text-button danger-text"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 size={14} />
                  清空记录
                </button>
              )}
            </div>
            <div className="collection-filter">
              <Segments
                label="收藏或阅读记录分类"
                options={[
                  { value: "all", label: "全部" },
                  { value: "nba", label: "NBA" },
                  { value: "football", label: "足球" },
                ]}
                value={filter}
                onChange={(sport) =>
                  setParams(
                    (p) => {
                      p.set("sport", sport);
                      return p;
                    },
                    { replace: true },
                  )
                }
              />
              <span>{list.length} 篇</span>
            </div>
            {list.length ? (
              <div className="news-list">
                {list.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={
                  tab === "history"
                    ? "你的阅读足迹，从下一篇开始"
                    : filter === "all"
                      ? "把喜欢的，留在这里"
                      : "这个分类还没有收藏"
                }
                description={
                  tab === "history"
                    ? "读过的文章会出现在这里，方便随时回看。"
                    : "轻点新闻旁的收藏图标，好内容就不会错过。"
                }
              >
                <Link className="primary-button" to="/">
                  发现好内容
                </Link>
              </EmptyState>
            )}
          </>
        )}
      </div>
      {confirmClear && (
        <Dialog title="清空阅读记录？" onClose={() => setConfirmClear(false)}>
          <p>将清除本机全部阅读记录及新闻的已读标记。你的收藏会继续保留。</p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setConfirmClear(false)}
            >
              取消
            </button>
            <button
              className="danger-button"
              onClick={() => {
                clearHistory();
                setConfirmClear(false);
              }}
            >
              清空记录
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
