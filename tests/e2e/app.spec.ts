import { expect, test } from "@playwright/test";

test("home, search, read, back, bookmark and persistence form a complete journey", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/SportNow/);
  await expect(
    page.getByRole("heading", { name: "为热爱，在场。" }),
  ).toBeVisible();
  await expect(page.getByText("本地演示内容 · 非真实新闻报道")).toBeVisible();
  await page.getByRole("link", { name: "搜索新闻", exact: true }).click();
  await page.getByRole("searchbox").fill("Cristiano Ronaldo");
  await expect(page.getByText("2 篇演示内容")).toBeVisible();
  await page
    .getByRole("heading", { name: "C罗的门前选择：先看空间，再看皮球" })
    .click();
  await expect(
    page.getByRole("heading", { name: "中文摘要", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Ronaldo and the timing of a finish"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "阅读原文", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "收藏文章", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("Cristiano Ronaldo");
  await page.goto("/#/profile?tab=bookmarks");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "C罗的门前选择：先看空间，再看皮球" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "取消收藏：C罗的门前选择：先看空间，再看皮球",
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "把喜欢的，留在这里" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("follow, theme, density, history, clear confirmation and reload work", async ({
  page,
}) => {
  await page.goto("/#/profile?tab=follows");
  await expect(
    page.getByRole("button", { name: "取消关注圣安东尼奥马刺", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "关注金州勇士", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "取消关注金州勇士", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "取消关注金州勇士", exact: true })
    .click();
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
  await page.goto("/#/article/nba-01");
  await page.goto("/#/profile?tab=history");
  await expect(
    page.getByRole("heading", { name: "从防守开始，看见马刺的下一步" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空记录", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "取消", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "从防守开始，看见马刺的下一步" }),
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
  await page.getByRole("button", { name: "清除本地数据", exact: true }).click();
  await page.getByRole("button", { name: "确认清除", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "跟随系统", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("categories, no results, simulated heat and honest local refresh", async ({
  page,
}) => {
  await page.goto("/#/nba");
  await page.getByRole("button", { name: "伤病", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(2);
  await page.goto("/#/football");
  await page.getByRole("button", { name: "转会", exact: true }).click();
  await expect(page.locator(".article-card")).toHaveCount(3);
  await page.goto("/#/search?q=不存在的新闻xyz");
  await expect(
    page.getByRole("heading", { name: "暂时没有找到" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除搜索", exact: true }).click();
  await expect(page.getByRole("heading", { name: /从这里开始/ })).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "热门", exact: true }).click();
  await expect(
    page.getByText("热度为模拟分数，不代表真实阅读量"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "刷新本地演示数据", exact: true })
    .click();
  await expect(
    page.getByText("已重新载入本地演示数据，没有获取网络新闻。"),
  ).toBeVisible();
});

test("all routes fit a 320px screen and deep routes survive reload", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of [
    "",
    "nba",
    "football",
    "profile?tab=follows",
    "profile?tab=settings",
    "search",
    "article/nba-01",
  ]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `overflow at ${route}`).toBe(false);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "中文摘要" })).toBeVisible();
});

test("PWA manifest, active worker and offline navigation are functional", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const response = await page.request.get(manifestUrl!);
  const manifest = await response.json();
  expect(manifest.name).toBe("SportNow");
  expect(manifest.display).toBe("standalone");
  expect(
    manifest.icons.some((i: { sizes: string }) => i.sizes === "512x512"),
  ).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "为热爱，在场。" }),
  ).toBeVisible();
  await page.goto("/#/article/football-01");
  await expect(page.getByRole("heading", { name: "中文摘要" })).toBeVisible();
  await expect(
    page.getByText("当前离线 · 仍可阅读已缓存的演示内容"),
  ).toBeVisible();
  await context.setOffline(false);
});

test("visible navigation restores list position and article back position", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const nav = page.locator(
    testInfo.project.name.startsWith("iphone") ? ".bottom-nav" : ".desktop-nav",
  );
  await nav.getByRole("link", { name: "NBA", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("NBA.");
  await nav.getByRole("link", { name: "足球", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("足球.");
  await nav.getByRole("link", { name: "首页", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1000);
  await nav.getByRole("link", { name: "足球", exact: true }).click();
  await nav.getByRole("link", { name: "首页", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1000);
  const article = page.locator(".article-card-link").first();
  await article.scrollIntoViewIfNeeded();
  await article.evaluate((element) =>
    element.addEventListener(
      "click",
      () => sessionStorage.setItem("qa-click-scroll", String(window.scrollY)),
      { once: true },
    ),
  );
  await article.click();
  const previous = Number(
    await page.evaluate(() => sessionStorage.getItem("qa-click-scroll")),
  );
  await expect(page.getByRole("heading", { name: "中文摘要" })).toBeVisible();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(previous);
  await nav.getByRole("link", { name: "我的", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("我的主场。");
});
