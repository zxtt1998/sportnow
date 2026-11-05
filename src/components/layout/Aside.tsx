import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Compass,
  Smartphone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getEntity } from "../../data/entities";
import { useUser } from "../../stores/UserStore";
import { EntityAvatar } from "../news/FollowStrip";
export function Aside() {
  const { data } = useUser();
  return (
    <aside className="desktop-aside">
      <section className="aside-section">
        <div className="section-title small-title">
          <h2>我的主场</h2>
          <Link to="/profile?tab=follows" aria-label="管理我的关注">
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <p className="aside-caption">你关注的，每一份热爱。</p>
        <div className="aside-follow-list">
          {data.follows.map((f) => (
            <Link
              to={`/search?entity=${f.id}`}
              className="aside-follow"
              key={f.id}
            >
              <EntityAvatar id={f.id} />
              <span>
                <strong>{getEntity(f.id)?.shortName}</strong>
                <small>{getEntity(f.id)?.englishName}</small>
              </span>
              <ArrowRight size={15} />
            </Link>
          ))}
          {!data.follows.length && (
            <Link className="text-link" to="/profile?tab=follows">
              选择你的球队与球员
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
        <Link className="aside-bookmarks" to="/profile?tab=bookmarks">
          <Bookmark size={17} />
          <span>我的收藏</span>
          <span>{data.bookmarks.length}</span>
          <ArrowRight size={15} />
        </Link>
      </section>
      <section className="aside-install">
        <span className="aside-install-icon">
          <Smartphone size={23} />
        </span>
        <h3>把热爱，放在主屏幕。</h3>
        <p>
          在 iPhone Safari 中轻点分享，
          <br />
          选择「添加到主屏幕」。
        </p>
        <Link to="/profile?tab=settings">
          了解 SportNow
          <ArrowUpRight size={15} />
        </Link>
      </section>
      <div className="aside-note">
        <Compass size={17} />
        <p>
          独立的阅读空间，专注比赛本身。
          <br />
          无广告 · 无账号 · 数据仅存于本机
        </p>
      </div>
      <p className="aside-fine">
        SPORTNOW © 2026
        <br />
        RSS 来源 · 本机阅读偏好
      </p>
    </aside>
  );
}
