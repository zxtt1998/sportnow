import type {
  ArticleView,
  NewsDocument,
  SourcesStatusDocument,
} from "../types";
import {
  parseNewsDocument,
  parseSourcesStatus,
  toArticleView,
} from "./news-validation";

export const NEWS_CACHE_KEY = "sportnow:news:v2";
export interface NewsState {
  articles: ArticleView[];
  document: NewsDocument | null;
  sources: SourcesStatusDocument | null;
  loading: boolean;
  cached: boolean;
  error: string | null;
  checkedAt: string | null;
  mode: "live" | "demo";
}
const listeners = new Set<() => void>();
let state: NewsState = {
  articles: [],
  document: null,
  sources: null,
  loading: true,
  cached: false,
  error: null,
  checkedAt: null,
  mode: "live",
};
try {
  if (typeof localStorage !== "undefined") {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      const document = parseNewsDocument(saved.document);
      let sources = null;
      try {
        sources = parseSourcesStatus(saved.sources, document);
      } catch {
        /* News can remain usable without telemetry. */
      }
      state = {
        ...state,
        articles: document.articles.map(toArticleView),
        document,
        sources,
        cached: true,
      };
    }
  }
} catch {
  /* Invalid browser cache never becomes real news. */
}
const publish = (next: Partial<NewsState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};
let inFlight: Promise<void> | null = null;
async function fetchJSON(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/${path}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // SW marks fallback responses explicitly; navigator.onLine alone is unreliable.
    const cached = response.headers.get("X-SportNow-Cache") === "offline";
    return { body: (await response.json()) as unknown, cached };
  } finally {
    clearTimeout(timer);
  }
}
async function load(): Promise<void> {
  publish({ loading: true });
  if (
    import.meta.env.MODE === "demo" ||
    (import.meta.env.DEV &&
      typeof location !== "undefined" &&
      new URLSearchParams(location.search).get("demo") === "1")
  ) {
    const { articles } = await import("../data/articles");
    publish({
      articles,
      loading: false,
      cached: false,
      mode: "demo",
      error: null,
    });
    return;
  }
  const [newsResult, statusResult] = await Promise.allSettled([
    fetchJSON("news.json"),
    fetchJSON("sources-status.json"),
  ]);
  try {
    if (newsResult.status !== "fulfilled")
      throw new Error("无法连接新闻数据，正在保留上次成功内容");
    const document = parseNewsDocument(newsResult.value.body);
    // Never let an older CDN response replace a newer successful snapshot.
    if (
      state.document &&
      Date.parse(document.generatedAt) < Date.parse(state.document.generatedAt)
    )
      throw new Error("服务器暂时返回旧版本，继续使用本机较新内容");
    let sources =
      state.sources?.newsRevision === document.revision ? state.sources : null;
    if (statusResult.status === "fulfilled") {
      try {
        sources = parseSourcesStatus(statusResult.value.body, document);
      } catch {
        /* Mismatched CDN status is ignored. */
      }
    }
    const cached = newsResult.value.cached;
    publish({
      document,
      sources,
      articles: document.articles.map(toArticleView),
      cached,
      error: cached ? "网络不可用，正在显示缓存新闻" : null,
      checkedAt: new Date().toISOString(),
      loading: false,
    });
    try {
      localStorage.setItem(
        NEWS_CACHE_KEY,
        JSON.stringify({ document, sources }),
      );
    } catch {
      /* Cache quota must not break reading. */
    }
  } catch (error) {
    publish({
      loading: false,
      cached: !!state.document,
      error: error instanceof Error ? error.message : "新闻加载失败",
      checkedAt: new Date().toISOString(),
    });
  }
}
export const newsStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  refresh: () => {
    if (!inFlight)
      inFlight = load().finally(() => {
        inFlight = null;
      });
    return inFlight;
  },
  clearCache: () => {
    try {
      localStorage.removeItem(NEWS_CACHE_KEY);
    } catch {
      /* Best effort. */
    }
  },
};
