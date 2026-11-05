import { useNews } from "../../hooks/useNews";
import { useEffect, useState } from "react";
import {
  Bookmark,
  CircleUserRound,
  Dribbble,
  House,
  Search,
  Settings2,
  Trophy,
  WifiOff,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Brand } from "../common/Primitives";
import { useScrollMemory } from "../../hooks/useScrollMemory";
import { useUser } from "../../stores/UserStore";
import { PWAUpdate } from "./PWAUpdate";
import { assetUrl } from "../../utils/format";
const navigation = [
  { to: "/", label: "首页", Icon: House },
  { to: "/nba", label: "NBA", Icon: Dribbble },
  { to: "/football", label: "足球", Icon: Trophy },
  { to: "/profile", label: "我的", Icon: CircleUserRound },
];
export function Layout() {
  const news = useNews();
  useScrollMemory();
  const { storageError } = useUser();
  const [online, setOnline] = useState(navigator.onLine);
  const location = useLocation();
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const checkConnection = async () => {
      if (!navigator.onLine) {
        if (active) setOnline(false);
        return;
      }
      try {
        // navigator.onLine may report a LAN connection without internet access.
        // HEAD bypasses the SW's GET-only precache; this checks our own app, not a news API.
        await fetch(assetUrl("manifest.webmanifest"), {
          method: "HEAD",
          cache: "no-store",
          signal: controller.signal,
        });
        if (active) setOnline(true);
      } catch {
        if (active) setOnline(false);
      }
    };
    const on = () => {
      void checkConnection();
    };
    const off = () => setOnline(false);
    void checkConnection();
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      active = false;
      controller.abort();
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, []);
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main-content");
          main?.focus({ preventScroll: true });
          main?.scrollIntoView();
        }}
      >
        跳至内容
      </a>
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="主导航">
            {navigation.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            <span className="edition-label">THE DAILY PLAY</span>
            <Link className="icon-button" to="/search" aria-label="搜索新闻">
              <Search size={21} />
            </Link>
            <Link
              className="icon-button"
              to="/profile?tab=settings"
              aria-label="打开设置"
            >
              <Settings2 size={20} />
            </Link>
          </div>
        </div>
      </header>
      {!online && (
        <div className="system-banner" role="status">
          <WifiOff size={15} />
          当前离线 · 仍可阅读已缓存的界面与新闻
        </div>
      )}
      {storageError && (
        <div className="system-banner warning" role="alert">
          本机存储不可用，当前更改只能保留到关闭页面前。
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="app-main">
        <div className="page-transition" key={location.pathname}>
          <Outlet />
        </div>
      </main>
      <footer className="page-footer">
        <Brand />
        <span>
          为热爱在场。<span className="footer-divider"> / </span>
          {news.mode === "demo" ? "全部内容为原创演示" : "尊重来源，阅读原文"}
        </span>
        <Link to="/profile?tab=bookmarks">
          <Bookmark size={14} />
          阅读收藏
        </Link>
      </footer>
      <nav className="bottom-nav" aria-label="底部导航">
        {navigation.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <span>
              <Icon size={22} strokeWidth={1.8} />
            </span>
            <small>{label}</small>
          </NavLink>
        ))}
      </nav>
      <PWAUpdate />
    </>
  );
}
