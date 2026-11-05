# 来源与展示策略（2026-11-05 核查）

本项目将“RSS 技术可访问”和“允许公开保存、展示、翻译”作为两件独立的事。用户已明确确认：没有 ESPN/BBC 的额外授权，按来源许可保守处理。

因此当前三个源均可检查可用性，但 `allowHeadlines / allowSummary / allowTitleTranslation / allowSummaryTranslation` 全部关闭。`news.json` 当前不包含第三方新闻条目；页面显示官方来源入口和逐来源状态，不把测试/演示内容冒充真实新闻。

这不是对全部 RSS 使用方式作法律结论；这是在未能确认足以支持本项目公开 JSON、历史保留和翻译用途的许可时所采用的产品策略。

| 来源 | 本地首次技术测试 | 本次许可核查 | 当前行为 |
| --- | --- | --- | --- |
| ESPN NBA | HTTP 200 / RSS 2.0 / 16 条 | RSS 有版权声明；许可说明页面返回机器人验证，未绕过，未核实公开转载与翻译许可 | 只记录状态、数量和来源入口 |
| BBC Football | HTTP 200 / RSS 2.0 / 69 条 | RSS 指向 BBC 使用条款；可查阅的官方 PDF（2022-03-31，非保证现行版本）第 15 节对 RSS 改动、元数据和许可有约束，当前页面未能完整核实 | 只记录状态、数量和来源入口 |
| BBC Champions League | HTTP 200 / RSS 2.0 / 26 条 | 与 BBC Football 相同，保守待确认 | 只记录状态、数量和来源入口 |

上述 111 条为第一次探测读到的条目数，不是去重后的公开新闻数量，也不代表成功翻译。后续真实检查数量见 `public/data/sources-status.json` 和 Actions 执行报告。

首次正式 GitHub Actions 更新中，BBC 两源仍为 69/26 条；ESPN 返回未能解析的 XML（`no element found: line 1, column 0`），该源记为失败。云端本次合计读取 95 条，公开发布与真实新闻翻译仍为 0；不把本地可访问性推断成所有运行环境均成功。

## 核查入口

- [ESPN RSS 说明](https://www.espn.com/espn/news/story?page=rssinfo)
- [ESPN NBA RSS](https://www.espn.com/espn/rss/nba/news)
- [BBC RSS 指定的当前使用条款](https://www.bbc.co.uk/usingthebbc/terms-of-use/#15metadataandrssfeeds)
- [BBC 官方条款 PDF，2022-03-31，第 15 节](https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf)
- [BBC Football RSS](https://feeds.bbci.co.uk/sport/football/rss.xml)
- [BBC Champions League RSS](https://feeds.bbci.co.uk/sport/football/champions-league/rss.xml)

## 有明确许可后的配置

在 `config/sources.json` 为对应来源记录真实的 `permissionReference`（许可文档链接或可审计编号）、`licenseUrl`、`reviewedAt` 与范围，再选择模式：

- `blocked`：不发布条目，所有展示/翻译标记关闭。当前默认。
- `headlines-only`：只在许可确实允许时保留原标题、时间、分类、原文链接；摘要和中文字段为空。
- `licensed-translation`：仅开启许可明确覆盖的标题/摘要存储及翻译字段。标题和摘要分别授权、分别处理；不从标题扩写摘要。

填写非空许可字符串是技术门槛，不会产生或证明内容授权。不能仅为了让程序运行而填入“个人使用”“公开可访问”或本项目地址。

来源策略在抓取前检查；公开条目携带策略快照。JSON 校验器和前端都会拒绝超出许可范围的中文字段/摘要和演示内容。策略撤销时清理该来源的公开历史；生产构建会核对数据快照与当前来源配置。后续新来源也需要独立核查。

## 内容边界

不抓取新闻全文，不访问原文页面提取正文，不下载 RSS 中的新闻图片，不解验证码、不伪装浏览器绕过访问限制、不调用公共翻译接口。RSS 正文只在本次进程中用于被允许的处理；被阻止的源只输出统计和来源状态。所有页面主题插画是第一阶段项目已有的原创素材，并标注非新闻现场照片。

离线翻译测试只使用 SportNow 自有测试句；其结果不进入生产新闻列表。
