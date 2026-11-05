# SportNow

为热爱在场。一个面向 iPhone 的个人体育新闻 PWA，使用简体中文，关注 NBA 与欧洲足球。

第一阶段为完整的本地演示前端：**32 篇原创演示内容（NBA 15、足球 15、其他体育 2）**，不接入真实新闻、翻译、视频或评论 API，不需要 API Key、数据库或账号。所有插画、图标与启动图均为本项目原创；没有使用第三方新闻照片或球队官方标识。

## 本地运行

需要 Node.js **22.12+**（推荐 Node.js 22 LTS）与 npm。

```bash
npm ci
npm run dev
```

打开终端显示的地址，默认 `http://localhost:5173`。同一局域网下可通过电脑 IP 在 iPhone Safari 查看响应式页面；**PWA Service Worker 需要 HTTPS 或 localhost**，手机通过普通 HTTP 局域网 IP 访问时不能验证安装和离线功能。可在 GitHub Pages 的 HTTPS 地址完成真机安装测试。

```bash
npm run typecheck  # TypeScript 严格检查
npm test           # 数据检索、排序和持久化数据校验
npm run build      # 类型检查 + 生产构建 + Manifest/Service Worker
npm run preview    # 生产构建本地预览，默认 4173
```

PWA 仅在生产构建注册，日常 Vite 开发模式不会被旧缓存干扰。

## 功能

- 四个底部栏目：首页、NBA、足球、我的；桌面端提供顶部导航与关注侧栏。
- 首页焦点大卡、关注入口、NBA/足球/综合体育版块；推荐、最新、模拟热门三种栏目。
- 推荐根据本机关注的球队/球员优先排序；最新按演示发布时间降序；热门为明确标注的模拟分数，非真实阅读量。
- 手动刷新与触摸下拉刷新只重新载入本地演示，不改变演示发布时间或声称获取新报道。
- NBA：全部、马刺、交易、伤病、球员；足球：全部、皇马、转会、欧冠、五大联赛；支持最新/关注优先排序。
- 全局搜索支持中文/英文标题、摘要、球队/球员全称、简称、分类，含清除、空白探索、无结果和分类筛选。
- 详情提供中文标题、英文标题、来源、演示时间、原创配图、中文摘要、可点击标签、收藏、相关推荐与返回。
- 没有真实对应文章的演示均为 `originalUrl: null`，原文按钮禁用并说明原因。未来有有效 http(s) 原文 URL 时，按钮会在浏览器新标签打开，带 `noopener noreferrer`。
- 比赛集锦和球迷讨论为明确的功能预留，无伪造评论、视频和不可见的外部请求。
- 关注管理包含 9 支球队与 4 名球员，可添加、删除及中英文检索。默认关注马刺、皇马、C罗。
- 收藏与阅读记录支持筛选、取消收藏、已读标记、清空记录；最多保留最近 100 条阅读记录。
- 浅色、近黑深色、跟随系统；推荐/最新默认排序；舒适/紧凑密度。
- 所有个人状态使用版本化 `localStorage`，校验损坏数据、跨标签同步，并提示存储不可用。
- 清除本地数据有确认弹窗，仅重置 `sportnow:v1` 的内容，恢复默认关注和设置。
- 固定底栏、iPhone 安全区域、键盘焦点、原生可访问弹窗、减少动态效果偏好、列表滚动记忆。

## 项目目录

```text
sportnow/
├── .github/workflows/deploy.yml  # main 分支测试、构建、Pages 发布
├── public/
│   ├── icons/                   # PNG 图标、maskable、Apple 图标与竖屏启动图
│   └── images/                  # 原创篮球/足球/跑道 SVG
├── src/
│   ├── components/
│   │   ├── common/              # 品牌、返回、空状态、Dialog、分段选择
│   │   ├── layout/              # 应用壳、导航、侧栏、离线和更新提示
│   │   └── news/                # 统一新闻卡、关注条、体育分类列表
│   ├── pages/
│   │   ├── Home/
│   │   ├── NBA/
│   │   ├── Football/
│   │   ├── Article/
│   │   ├── Profile/             # 收藏、历史、关注、设置
│   │   └── Search/
│   ├── data/                    # 演示内容、球队、球员、来源
│   ├── services/news.ts         # 独立的数据适配与搜索/筛选/排序
│   ├── hooks/                   # 滚动位置恢复
│   ├── stores/                  # 用户状态、持久化与运行时数据校验
│   ├── types/                   # Article / NewsSource / Team / Player /
│   │                            # Follow / Bookmark / Video / UserPreferences
│   ├── utils/                   # 资源 URL、时间和分类格式化
│   ├── App.tsx                  # 路由组合
│   ├── main.tsx
│   └── styles.css               # Tailwind 入口、主题 token 与响应式组件样式
├── tests/
│   ├── news.test.ts
│   ├── storage.test.ts
│   └── e2e/app.spec.ts
├── index.html
├── package.json
├── package-lock.json
├── playwright.config.ts
├── tsconfig.json
└── vite.config.ts
```

## GitHub Pages 部署

源码仓库：[zxtt1998/sportnow](https://github.com/zxtt1998/sportnow)。

手机访问地址：[SportNow 演示站](https://zxtt1998.github.io/sportnow/)。最近构建及发布状态见 [GitHub Actions](https://github.com/zxtt1998/sportnow/actions)。以下步骤也适用于部署到你自己的其他仓库。

1. 在 GitHub 新建仓库（例如 `sportnow`）；使用免费 Pages 时可选择公共仓库。
2. 将本项目提交到该仓库的 **main** 分支：

   ```bash
   git init -b main
   git add .
   git commit -m "Build SportNow phase one PWA"
   git remote add origin https://github.com/YOUR_NAME/sportnow.git
   git push -u origin main
   ```

   如果已有 Git 仓库，直接添加对应 remote、提交和推送，不需要重复初始化。

3. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
4. 如果首次 push 在设置 Pages 之前执行，可在 **Actions → Build and deploy SportNow → Run workflow** 手动运行一次。
5. Workflow 自动执行 `npm ci`、`npm test`、`npm run build`，构建成功才上传并发布 `dist/`。
6. 发布地址通常为 `https://YOUR_NAME.github.io/sportnow/`，部署任务与 Pages 设置中会显示实际地址。

Workflow 使用 `actions/configure-pages` 返回的 `base_path` 设置 `VITE_BASE_PATH`。仓库子路径、自定义域名和用户根站点均可使用；资源路径、Manifest `id/start_url/scope`、Service Worker 注册和缓存导航都跟随该路径。

独立模拟子路径构建：

```bash
VITE_BASE_PATH=/sportnow/ npm run build
VITE_BASE_PATH=/sportnow/ npm run preview
# 打开 http://localhost:4173/sportnow/
```

使用 React Router **HashRouter**，例如 `/sportnow/#/article/nba-01`。浏览器刷新只向 GitHub Pages 请求 `/sportnow/`，不需要服务器重写或 404 跳转技巧。

GitHub 免费托管和具体仓库权限以 GitHub 当前账户设置为准。部署流程参见 [Vite 官方 Pages 指南](https://vite.dev/guide/static-deploy.html#github-pages)，路由选择参见 [React Router HashRouter 文档](https://reactrouter.com/api/declarative-routers/HashRouter)。

## PWA 与离线策略

- `vite-plugin-pwa` 在构建时生成 Manifest、`sw.js` 与 Workbox 缓存清单。
- 包含 192/512 PNG 图标、专用安全区 maskable 图标、180px Apple Touch 图标，以及常见 375/390/393/430pt iPhone 竖屏启动图。其他设备使用系统启动行为；横屏不提供专用启动图。
- 首次联网打开并等待 Service Worker 完成安装后，应用壳、全部演示内容及插画可离线使用。
- 当前演示数据被编译进带哈希的 JS，只随应用版本更新，不作为“实时新闻”展示；日期固定以 **2026-11-05 16:00（北京时间）** 为演示时钟。
- 新版本安装完成会显示“新版本已就绪”，用户轻点“更新”后切换 Worker 并刷新；回到前台也检查更新，清理过期构建缓存。参见 [PWA 更新文档](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)。
- 为第二阶段 `data/news.json` 预设 **NetworkFirst**：4 秒网络超时、最多 1 份缓存、离线回退最多 1 小时；JSON 不加入静态 precache。未来接入时须同时展示来源抓取时间、离线状态和内容有效期，不把缓存内容伪装成新消息。
- 在线状态只作提示，不限制阅读；同时通过本站 Manifest 的无缓存 HEAD 请求辅助判断连接。[MDN 说明 `navigator.onLine` 不能可靠代表互联网可用性](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)。
- iPhone 安装：Safari 打开 HTTPS 站点 → 分享 → 添加到主屏幕。应用内设置也提供步骤。
- 浏览器可能清理站点缓存或本机存储；第一阶段没有跨设备同步和云备份。

## 测试

```bash
npm ci
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

端到端测试会自动启动 4173 端口的生产预览，需要先构建。覆盖手机/桌面浏览器的搜索→详情→收藏→返回→刷新持久化、关注、主题与密度、历史清除、筛选、模拟刷新、320px 各页面布局、真实导航、滚动恢复、Manifest、Service Worker 和离线阅读。

若系统已安装兼容 Chromium，可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定路径；也可通过 `E2E_BASE_URL` 指定已运行的预览服务器。测试结果与 trace 默认写入 `/tmp/sportnow-test-results`，不进入源码。Browser 插件当前不可用，因此采用 Playwright；后续可安装 Browser 插件便于在应用内持续做视觉检查。

自动部署会运行数据单元测试和包含 TypeScript 的生产构建。完整浏览器测试为本地验收步骤，不会增加定时任务。

### 本次验收记录

- TypeScript 严格检查：通过。
- 生产构建：通过；完整离线预缓存小于 1 MB（含多尺寸启动图）。
- 数据/持久化单元测试：10 项通过。
- 端到端覆盖 Chromium 手机/桌面与 WebKit 手机，共 18 项场景全部通过。
- 独立模拟 `/sportnow-test/` 子路径：详情刷新、图标、Manifest 路径、Worker scope 与离线详情通过。
- 临时服务器模拟 v1 → v2 发布：更新提示、确认后刷新、收藏保留与旧 HTML 缓存清理通过。
- 已人工查看手机/桌面的浅色与深色截图；没有明显横向溢出。
- 尚未使用真实 iPhone 完成 Safari“添加到主屏幕”安装、系统启动图和 Home Indicator 真机验收，GitHub Pages 的发布结果以 Actions 为准。

## 第一阶段边界与下一阶段

当前没有真实 RSS/API、自动抓取、翻译、实时比分/技术统计、登录、数据库、自建评论、视频下载或视频存储；没有 Cloudflare、Supabase、Firebase 或付费后台。

第二阶段建议顺序：

1. 先确定合法的新闻源与摘要使用范围，保留原始标题、真实文章 URL、来源和抓取时间；不能抓取/转载未经允许的正文或图片。
2. 在 GitHub Actions 生成有版本和时间戳的 `public/data/news.json`；在 `src/services/news.ts` 增加加载、结构校验和失败回退，保留 `list/get` 查询接口与现有组件类型。第一阶段未设置任何定时新闻任务。
3. 增加明确的加载、抓取失败与过期提示，再评估中文摘要/翻译方案；避免把失败或旧数据当成更新成功。
4. 为文章关联经核验的官方视频和公开讨论 URL，外部打开；继续保留个人使用、本地收藏的轻量架构。
5. 在实际 iPhone Safari 和主屏幕模式验收更新、键盘、返回与离线，随后再考虑收藏导入导出和更精细的关注偏好。
