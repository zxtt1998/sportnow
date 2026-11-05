import { useDeferredValue, useRef } from "react";
import { Search, X, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { BackBar, EmptyState } from "../../components/common/Primitives";
import { ArticleCard } from "../../components/news/ArticleCard";
import { getEntity } from "../../data/entities";
import { newsService } from "../../services/news";
import type { Sport } from "../../types";
const suggestions = ["马刺", "文班亚马", "皇家马德里", "C罗", "欧冠", "转会"];
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const query = params.get("q") || "";
  const deferred = useDeferredValue(query);
  const sportValue = params.get("sport");
  const sport: Sport | undefined =
    sportValue === "nba" || sportValue === "football" || sportValue === "other"
      ? sportValue
      : undefined;
  const entityId = getEntity(params.get("entity") || "")?.id;
  const active = !!query.trim() || !!sport || !!entityId;
  const results = active
    ? newsService.list({ query: deferred, sport, entityId })
    : [];
  const change = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );
  return (
    <div className="search-container">
      <BackBar title="探索热爱" />
      <div className="search-heading">
        <h1>
          你关心的，都在这里<span className="accent-text">。</span>
        </h1>
        <p>搜索本地演示新闻、球队与球员</p>
      </div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
        }}
      >
        <div className="search-field">
          <Search size={21} />
          <input
            ref={input}
            type="search"
            aria-label="搜索新闻、球队或球员"
            placeholder="搜索新闻、球队、球员…"
            value={query}
            onChange={(e) => change("q", e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              className="icon-button"
              type="button"
              aria-label="清除搜索"
              onClick={() => {
                change("q", "");
                input.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </form>
      <div className="search-filters">
        <SlidersHorizontal size={16} />
        <div className="category-tabs" role="group" aria-label="搜索分类">
          {[
            { value: "", label: "全部" },
            { value: "nba", label: "NBA" },
            { value: "football", label: "足球" },
            { value: "other", label: "其他体育" },
          ].map((s) => (
            <button
              key={s.value}
              className={(sport || "") === s.value ? "active" : ""}
              aria-pressed={(sport || "") === s.value}
              onClick={() => change("sport", s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {entityId && (
        <div className="entity-search-label">
          正在查看：{getEntity(entityId)?.name}
          <button
            className="icon-button"
            aria-label="清除关注对象筛选"
            onClick={() => change("entity", "")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {!active ? (
        <div className="search-discovery">
          <div className="section-title">
            <h2>
              从这里开始<span className="section-english">DISCOVER</span>
            </h2>
          </div>
          <div className="suggestion-grid">
            {suggestions.map((text, i) => (
              <button onClick={() => change("q", text)} key={text}>
                <span className="suggestion-index">0{i + 1}</span>
                <span>{text}</span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
          <p className="search-footnote">
            支持中英文标题、球队全称与球员姓名。
            <br />
            当前搜索范围为 32 篇原创演示内容。
          </p>
        </div>
      ) : (
        <>
          <div className="section-title search-results-title">
            <h2>搜索结果</h2>
            <span role="status" aria-live="polite">
              {results.length} 篇演示内容
            </span>
          </div>
          <div className="news-list" aria-busy={query !== deferred}>
            {results.map((a) => (
              <ArticleCard article={a} key={a.id} />
            ))}
          </div>
          {results.length === 0 && (
            <EmptyState
              title="暂时没有找到"
              description="试试“马刺”“C罗”或英文名字，也可以调整分类。"
            >
              <button
                className="secondary-button"
                onClick={() => setParams({}, { replace: true })}
              >
                清除所有条件
              </button>
            </EmptyState>
          )}
        </>
      )}
      <Link to="/profile?tab=follows" className="search-follow-link">
        管理关注，让推荐更懂你
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
