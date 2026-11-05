# SportNow

面向 iPhone 的 NBA 与足球阅读 PWA。第二阶段在第一阶段 React + TypeScript + Vite 界面上增加 RSS 管线、Argos 离线翻译、真实 JSON 加载、缓存状态和每小时 GitHub Actions 更新。

**当前配置：用户已撤销此前的一律屏蔽策略，三个来源改为 `personal-rss` 个人阅读配置，启用 RSS 标题、短摘要和 Argos 机器翻译。此配置是用户主动启用，不代表已经取得 ESPN/BBC 的额外转载或翻译授权，也不作来源条款合规保证。** 保留来源、原文链接和机器翻译标识，不抓全文、不下载新闻图片、不用演示新闻填充生产列表。策略记录见 [来源策略](docs/content-policy.md)。

- [GitHub 仓库](https://github.com/zxtt1998/sportnow)
- [GitHub Pages](https://zxtt1998.github.io/sportnow/)
- [Actions 运行记录](https://github.com/zxtt1998/sportnow/actions)

## 本地运行

Node.js 22.12+，Python 3.12。

```bash
npm ci
npm run dev
```

默认 `http://localhost:5173/`。生产模式使用真实数据契约读取 `public/data/news.json` 和 `public/data/sources-status.json`。开发模式访问 `http://localhost:5173/?demo=1` 可以查看明确标识的第一阶段演示；生产构建不接受这个开关，也不会在加载失败时自动替换为演示新闻。

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

PWA 仅在生产构建注册。HTTP 局域网 IP 可看界面，但 iPhone 安装和 Service Worker 需 HTTPS；可在 Pages 地址或获准使用的 HTTPS 预览环境验收。

## 抓取、翻译与验证

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-news.txt
python -m unittest discover -s tests/python -v
python -m scripts.news.pipeline --no-translation --report /tmp/news-run-report.json
python -m scripts.news.validate
```

所有 Python 依赖（包括传递依赖）锁定在 `requirements-news.txt`、`requirements-translation.txt`；`.in` 文件记录顶层选择。GitHub Ubuntu 使用相同 Python 3.12，并预装锁定的 CPU PyTorch，避免拉取 CUDA 依赖。

准备模型并独立验证：

```bash
pip install -r requirements-translation.txt
export XDG_DATA_HOME="$PWD/.cache/argos/data"
export XDG_CACHE_HOME="$PWD/.cache/argos/cache"
export ARGOS_DEVICE_TYPE=cpu
export ARGOS_INTER_THREADS=1
export ARGOS_INTRA_THREADS=2
python -m scripts.news.prepare_model --strict --report /tmp/argos-model-report.json
python -m scripts.news.test_argos --report /tmp/argos-smoke-report.json
python -m scripts.news.pipeline --report /tmp/news-run-report.json
```

仅准备 Argos `en → zh` 1.9 模型，固定 SHA-256；另准备固定 Stanza 版本所需的英语分句资源，和模型一起缓存。**推理进程关闭网络连接、禁止 Stanza 在推理时检查/下载资源**。不运行 LibreTranslate HTTP 服务，不调用翻译 API。

翻译标题和摘要分别处理，只有对应配置字段开启时才运行。用最长、词边界匹配保护球队/球员/赛事实体，再按占位符恢复规范译名；占位符损坏、数字改变、异常扩写、缺少中文或超时都回退英文。该校验减少错误，不保证机器翻译绝对准确，详情页保留原文入口与机器翻译说明。

默认每次最多处理 12 篇待翻译新闻，单字段最多 25 秒、1,600 字符，总预算 300 秒。原文、字段、库/模型版本和实际术语词典哈希共同生成缓存键；已有合格中文结果直接复用。模型准备失败不会阻止 RSS 检查和既有数据发布。

## 数据流程与边界

1. 配置源 → HTTPS 请求，标识 User-Agent，连接/读取超时 8/20 秒，最多 3 次；401/403/404 不重试或绕过。
2. 仅解析 RSS 2.0 / Atom / RSS 1.0 条目，不解析或请求文章全文；XML 外部实体被禁用，响应最多 5 MiB。
3. 按来源配置控制字段。`personal-rss` 是用户明确启用的个人阅读选择，`permissionReference` 保持为空；`headlines-only` / `licensed-translation` 仍要求真实许可记录。`blocked` 不保存条目，仅输出来源级检查结果。
4. 允许时验证日期和出版商 URL 白名单，剥离跟踪参数，以规范化 URL 生成稳定 ID。
5. URL 优先去重，再对同分类、48 小时内、数字一致的高相似标题去重；合并分类标签。
6. 用独立词典识别球队、球员、赛事；分类以配置源为基础，避免把足球 Spurs 误识别为 NBA 马刺。
7. 按字段开关分别翻译新内容或此前未成功内容，复用 JSON 中的中文和翻译结果缓存。
8. 合并历史，正常情况下保留 30 天、最多 1,000 条。一个源失败不会清空其他源或历史；所有源均失败时保留最近成功快照，可能超过 30 天但明确显示为旧缓存。
9. 校验完整结构和配置约束、稳定排序、原子写入 `news.json` / `sources-status.json`。不因无变化的检查更新文件时间戳。

`news.json` 的 `generatedAt` 表示内容版本生成时间，`revision` 是条目数组的 SHA-256；状态文件携带同一版本。内容不变则 `news.json` 字节不变；状态只在来源内容指纹/HTTP 验证头、错误恢复、数量或策略等发生变化时更新。未变化的每小时检查结果保留在 Actions 日志/执行报告，而不制造无意义提交。

规范 Article 类型见 `src/types/index.ts`；公开 JSON Schema 见 `config/news.schema.json`。`ArticleView` 是保留第一阶段组件字段的视图适配器，避免重写页面。

## 前端与本机数据

原有首页、NBA、足球、详情、搜索、收藏、关注、历史、浅色/深色/跟随系统和密度设置保留。

- 应用打开、回到前台（间隔至少 1 分钟）及网络恢复时检查 JSON；下拉/按钮刷新检查已发布数据，不声称在浏览器里抓取 RSS。
- 推荐按关注球队/球员优先、发布时间优先；相同 `eventKey` 的条目降权。真实数据“精选”不伪造阅读量或热度分数。
- 翻译不可用时显示英文标题；摘要为空不渲染摘要段落；原文使用来源的有效 HTTPS URL。
- `sportnow:v1` 的设置/收藏/历史格式保持向后兼容。真实新闻收藏增加经校验的本机快照，条目退出 30 天索引后仍可从收藏回看并打开原文。第一阶段演示 ID 不会被替换成真实新闻 ID。
- `sportnow:news:v2` 存储最近成功的新闻与配套状态，仅用于离线回退；坏 JSON、演示数据、超出配置的字段或旧 CDN 版本不能替换已验证的新快照。
- 清除本机数据会恢复默认关注，并清理该新闻缓存键；不清除其他站点的存储。

设置页“新闻更新状态”显示总数、分类数量、最近内容更新、来源分别成功/失败、错误与配置说明，以及当前是否缓存数据。个人模式的发布状态为 `user-enabled`，不伪称已获得来源授权；没有条目时保留来源入口。

## Service Worker

`src/sw.ts` 使用 Workbox injectManifest：

- 预缓存应用壳、图标、原创插画和启动图；JSON 不进入构建预缓存。
- 两个数据 JSON 使用 NetworkFirst，4 秒后允许使用最近成功缓存，恢复网络后重新检查；最多缓存两个数据响应。
- 回退响应加 `X-SportNow-Cache: offline`，前端显示缓存与可能过期提示。
- JSON 写入缓存前检查格式；页面仍有独立的本机快照回退。新闻与状态版本不匹配时，不显示错误版本的统计。
- 新应用版本保持确认更新提示，激活后清理旧静态缓存与第一阶段旧新闻缓存。

## GitHub Actions 与 Pages

- `argos-smoke.yml`：手动、独立的 Ubuntu CPU 模型与自有文本验证；已在正式更新前运行。
- `update-news.yml`：`17 * * * *`，并支持手动执行；抓取、策略检查、合并、翻译、校验、有变化才提交，然后直接调用发布工作流。
- `deploy.yml`：main 推送或手动部署，调用同一发布流程。
- `publish.yml`：可复用的 JSON/单元测试、前端构建、Pages 发布；始终检出最新 main。
- `.github/actions/argos-setup`：锁定 CPU 依赖、恢复模型缓存和准备英语分句资源；模型/库/配置改变会使缓存失效。

两个发布入口共用 `sportnow-pages-main` 并发组，正在发布的任务不被取消。更新提交前检查远程 main 未变化，拒绝覆盖更新的提交；发布前再次检查构建 SHA 与 main 一致。数据由 GITHUB_TOKEN 提交后，不依赖触发 push 工作流，更新流程自己完成部署。

权限按 job 分配：仅更新 job 有 contents:write；构建只读；部署仅获得 Pages 写入和 OIDC 权限。没有 PAT/API Key/仓库密钥配置。

需在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**，并允许 Actions 运行。若仓库组织策略禁止 GITHUB_TOKEN 写 main 或 Pages/OIDC，需要在组织允许的范围调整规则；不要为此写入个人密钥。当前 `zxtt1998/sportnow` 已启用 Pages。

计划任务可能延迟；公共仓库长时间不活跃也可能被 GitHub 暂停计划任务。需要时用 Actions → Update RSS and publish SportNow → Run workflow 手动执行。站点网络可达性与构建成功是不同检查。

### 子路径

`actions/configure-pages` 的 base_path 自动设置 Vite base、Manifest scope、SW scope 和资源地址；HashRouter 支持详情刷新。

```bash
VITE_BASE_PATH=/sportnow/ npm run build
VITE_BASE_PATH=/sportnow/ npm run preview
# http://localhost:4173/sportnow/
```

## 浏览器验收

```bash
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

测试使用只监听 127.0.0.1 的临时静态服务器，并按浏览器会话提供自有测试 JSON，不会部署测试接口或内容。覆盖真实数据契约加载、英文/空摘要回退、原文 URL、收藏与快照、关注/主题/历史、320px、离线缓存和网络恢复。需要 Node.js 能从终端 PATH 直接访问。

没有 Browser 插件，因此用 Playwright；可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定已有兼容 Chromium。后续可安装 Browser 插件方便应用内视觉复查。测试产物在 `/tmp/sportnow-test-results`，不提交截图或临时调试文件。

## 主要新增/修改目录

```text
config/                         来源配置、独立术语词典、模型配置、JSON Schema
scripts/news/                   RSS/Atom 请求解析、URL/日期、实体识别、去重、翻译、校验
requirements-*.txt               锁定 Python 依赖
public/data/                    news.json、sources-status.json
src/services/news-store.ts      真实 JSON 与最后成功快照
src/services/news-validation.ts 前端数据/字段配置校验和视图适配
src/hooks/useNews*.ts            数据订阅、打开/前台/联网检查
src/components/news/NewsStatus.tsx 来源入口、状态与许可说明
src/sw.ts                       独立 JSON 网络优先缓存
src/stores/                     向后兼容设置，新增收藏快照
.github/workflows/              独立 Argos、每小时更新、共享发布
.github/actions/argos-setup/     模型和 Python 缓存准备
 tests/python/                  RSS、去重、分类、权限、失败回退、JSON 测试
 tests/news-loading.test.ts      真实契约、路径、缓存、旧版本与授权字段测试
 tests/e2e/                     浏览器回归与仅本地运行的测试服务器
```

## 后续需要解决的事项

1. 继续核查来源条款、取得适用许可，或替换为明确允许这些用途的新来源。当前个人模式不能被当作来源授权；不将机器翻译当作原文，不用标题扩写摘要。
2. 在真实 iPhone Safari 与主屏幕模式验收登录无关的阅读、缓存更新和安装；Playwright WebKit 不能替代真机。
3. 机器翻译仍可能不自然或出错，必须保留原文对照；当前不做人工校对、AI 推荐、实时比分、自建评论、视频下载或云同步。
4. 启用合法来源后观察 30 天归档大小、模型冷启动、每次翻译预算及 GitHub 定时延迟，再按实际情况调整。

## 第二阶段首次执行记录（2026-11-05，以下为启用个人 RSS 配置前的记录）

- 本地：TypeScript 检查、生产构建、JSON 校验通过；Python 18 项、Vitest 17 项、Playwright 21 项全部通过。浏览器覆盖 iPhone 尺寸的 Chromium/WebKit 和桌面；另实测 `/sportnow/` 子路径、Manifest/SW scope、离线打开和网络恢复，没有页面脚本错误。尚未用真实 iPhone 验收。
- 本地 RSS：ESPN 16 条、BBC Football 69 条、BBC Champions League 26 条，共读取 111 条。
- [正式 GitHub 更新运行](https://github.com/zxtt1998/sportnow/actions/runs/41973869034)：BBC 两源分别读取 69/26 条，共 95 条；ESPN XML 解析失败（`no element found: line 1, column 0`），被单独记为失败，没有把 BBC 标为失败。没有改变 User-Agent 或绕过来源限制。
- 公开新闻 0 条、真实新闻翻译 0 条，均因许可策略关闭，并非将抓取条目数当作发布数量。
- [独立 Ubuntu Argos 验证](https://github.com/zxtt1998/sportnow/actions/runs/41973024419)：Argos 1.11.0、英中模型 1.9、Python 3.12.16、Linux x86_64，3 句自有文本和翻译缓存验证通过，推理网络被禁用，总耗时 4.13 秒。正式更新中相同测试耗时 5.12 秒，模型缓存命中、准备耗时 3.43 秒。
- 正式运行日志与 `news-update-evidence` artifact 包含每源状态、数量、缓存和模型报告；后续运行结果可能随来源响应变化。ESPN 在 GitHub 运行环境的返回需要继续观察，不能保证每次可用。

## 启用个人 RSS 配置后的本地验收

用户撤销保守策略后，三个来源改为 `personal-rss`。本轮读取 111 条，30 天范围筛选与去重后输出 75 条（NBA 16、足球 59）；在每次最多 12 篇的翻译预算内，12 条获得中文标题，共成功翻译 23 个字段。其余内容暂以英文显示，后续每小时任务继续处理未完成条目，不重新翻译已有合格结果。

本次类型检查、JSON 校验、生产构建通过；Python 19 项、Vitest 18 项、Playwright 21 项全部通过。新增测试确认个人模式可以主动启用且不伪造 `permissionReference`，旧许可模式仍保留校验。历史上 0 条新闻的验收记录仅描述调整前状态。
