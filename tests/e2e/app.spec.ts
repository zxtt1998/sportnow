import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { articleFixture, newsFixture, statusFixture } from "../fixtures";
import type { Article } from "../../src/types";
const personal = {
  ...articleFixture().contentPolicy,
  mode: "personal-rss" as const,
  permissionReference: "",
  allowSummary: true,
  allowTitleTranslation: true,
  allowSummaryTranslation: true,
};
const rows: Article[] = [
  articleFixture({
    titleZh: "马刺训练计划（自有测试内容）",
    summaryOriginal: "This is an owned test summary.",
    summaryZh: "这是自有测试摘要。",
    contentPolicy: personal,
    translationStatus: "translated",
    translationFields: { title: "translated", summary: "translated" },
  }),
  articleFixture({
    id: "news-222222222222222222222222",
    category: "football",
    titleOriginal: "Real Madrid training example",
    titleZh: "皇马训练观察（自有测试内容）",
    originalUrl: "https://example.org/madrid",
    teamIds: ["madrid"],
    playerIds: ["mbappe"],
    tags: ["皇家马德里", "欧冠", "五大联赛"],
    contentPolicy: personal,
    eventKey: "madrid-event",
  }),
  articleFixture({
    id: "news-333333333333333333333333",
    category: "football",
    titleOriginal: "Cristiano Ronaldo movement example",
    originalUrl: "https://example.org/ronaldo",
    teamIds: [],
    playerIds: ["ronaldo"],
    tags: ["球员"],
    eventKey: "ronaldo-event",
  }),
  articleFixture({
    id: "news-444444444444444444444444",
    titleOriginal: "NBA injury terminology example",
    originalUrl: "https://example.org/injury",
    teamIds: [],
    tags: ["伤病"],
    eventKey: "injury-event",
  }),
];
async function setNews(
  page: import("@playwright/test").Page,
  articles = rows,
  generatedAt = "2026-11-05T08:00:00Z",
) {
  const news = newsFixture(articles, generatedAt);
  await page.request.post("/__test/news", {
    data: { news, status: statusFixture(news) },
  });
}
async function prepare(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
) {
  await context.addCookies([
    {
      name: "sportnow-e2e-session",
      value: randomUUID(),
      url: "http://127.0.0.1:4173",
    },
  ]);
  await setNews(page);
}

test("live JSON: search, English fallback, original link, bookmark, read and reload", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/SportNow/);
  await expect(
    page.getByRole("heading", { name: "马刺训练计划（自有测试内容）" }),
  ).toBeVisible();
  await expect(page.getByText("本地演示内容 · 非真实新闻报道")).toHaveCount(0);
  await page.getByRole("link", { name: "搜索新闻", exact: true }).click();
  await page.getByRole("searchbox").fill("Cristiano Ronaldo");
  await expect(page.getByText("1 篇新闻", { exact: true })).toBeVisible();
  await page
    .getByRole("heading", { name: "Cristiano Ronaldo movement example" })
    .click();
  await expect(page.locator("h1")).toHaveText(
    "Cristiano Ronaldo movement example",
  );
  await expect(page.getByRole("heading", { name: /摘要/ })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "阅读原文", exact: true }),
  ).toHaveAttribute("href", "https://example.org/ronaldo");
  await page.getByRole("button", { name: "收藏文章", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Cristiano Ronaldo");
  await page.goto("/#/profile?tab=bookmarks");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Cristiano Ronaldo movement example" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "取消收藏：Cristiano Ronaldo movement example",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "把喜欢的，留在这里" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("follow, theme, density, read history and reset remain persistent", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  await page.goto("/#/profile?tab=follows");
  await page.getByRole("button", { name: "关注金州勇士", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "取消关注金州勇士", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "紧凑", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("[data-density]")).toHaveAttribute(
    "data-density",
    "compact",
  );
  await page.getByRole("button", { name: "浅色", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/#/article/" + rows[0].id);
  await expect(page.locator("h1")).toHaveText(rows[0].titleZh);
  await page.goto("/#/profile?tab=history");
  await expect(
    page.getByRole("heading", { name: rows[0].titleZh }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空记录", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: rows[0].titleZh }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空记录", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "清空记录", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "你的阅读足迹，从下一篇开始" }),
  ).toBeVisible();
  await page.goto("/#/profile?tab=settings");
  await expect(
    page.getByRole("heading", { name: "新闻更新状态" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除本地数据", exact: true }).click();
  await page.getByRole("button", { name: "确认清除", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "跟随系统", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("sport filters, no results, curated feed and refresh use real JSON", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  await page.goto("/#/nba");
  await page.getByRole("button", { name: "伤病", exact: true }).click();
  await expect(page.locator(".feature-body h2")).toHaveText(
    "NBA injury terminology example",
  );
  await page.goto("/#/football");
  await page.getByRole("button", { name: "皇家马德里", exact: true }).click();
  await expect(page.locator(".feature-body h2")).toHaveText(rows[1].titleZh);
  await page.goto("/#/search?q=不存在的新闻xyz");
  await expect(
    page.getByRole("heading", { name: "暂时没有找到" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除搜索", exact: true }).click();
  await expect(page.getByRole("heading", { name: /从这里开始/ })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "精选", exact: true }).click();
  await expect(page.locator(".heat")).toHaveCount(0);
  await page.getByRole("button", { name: "检查新闻更新", exact: true }).click();
  await expect(
    page.getByText("已检查站点新闻数据；来源抓取由 GitHub Actions 执行。"),
  ).toBeVisible();
});

test("all routes fit 320px and details survive deep reload", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of [
    "",
    "nba",
    "football",
    "profile?tab=follows",
    "profile?tab=settings",
    "search",
    "article/" + rows[0].id,
  ]) {
    await page.goto("/#/" + route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      "overflow at " + route,
    ).toBe(false);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "中文摘要" })).toBeVisible();
});

test("PWA caches last successful news, marks offline, and refreshes on recovery", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.getByRole("button", { name: "检查新闻更新", exact: true }).click();
  await expect(
    page.getByText("已检查站点新闻数据；来源抓取由 GitHub Actions 执行。"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("sportnow-data-v2");
        return !!(await cache.match(
          new URL("data/news.json", location.href.split("#")[0]).href,
        ));
      }),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: rows[0].titleZh }),
  ).toBeVisible();
  await expect(
    page.getByText("正在显示上次成功缓存 · 可能不是最新新闻"),
  ).toBeVisible();
  const newer = [
    { ...rows[0], titleZh: "更新后的自有测试标题" },
    ...rows.slice(1),
  ];
  await setNews(page, newer, "2026-11-05T09:00:00Z");
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    page.getByRole("heading", { name: "更新后的自有测试标题" }),
  ).toBeVisible({ timeout: 15000 });
});

test("bookmarks retain a local snapshot after an article leaves the 30-day catalog", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  await page.goto("/#/article/" + rows[0].id);
  await expect(page.locator("h1")).toHaveText(rows[0].titleZh);
  await page.getByRole("button", { name: "收藏文章", exact: true }).click();
  await setNews(page, rows.slice(1), "2026-11-05T10:00:00Z");
  await page.goto("/#/profile?tab=settings");
  await page.getByRole("button", { name: "检查更新", exact: true }).click();
  await page.goto("/#/profile?tab=bookmarks");
  await page.getByRole("heading", { name: rows[0].titleZh }).click();
  await expect(
    page.getByText(
      "此新闻已不在当前索引，正在显示本机收藏快照。请阅读原文了解最新情况。",
    ),
  ).toBeVisible();
});

test("empty data displays source links without demo news", async ({
  page,
  context,
}) => {
  await prepare(page, context);
  const news = newsFixture([]);
  const status = statusFixture(news);
  status.sources[0] = {
    ...status.sources[0],
    sourceId: "espn-nba",
    sourceName: "ESPN NBA",
    homepageUrl: "https://www.espn.com/nba/",
    publicationStatus: "user-enabled",
  };
  await page.request.post("/__test/news", { data: { news, status } });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "你的热爱，直达原站。" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /ESPN NBA/ })).toHaveAttribute(
    "href",
    "https://www.espn.com/nba/",
  );
  await expect(page.locator(".article-card")).toHaveCount(0);
  await page.goto("/#/profile?tab=settings");
  await expect(page.getByText("0 篇 · NBA 0 · 足球 0")).toBeVisible();
  await expect(page.getByText("尚无新闻更新")).toBeVisible();
});
