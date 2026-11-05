# 来源与个人 RSS 配置（2026-11-05）

用户已撤销此前“没有额外授权就一律不展示”的策略，要求启用真实新闻。三个来源现改为 `personal-rss`：读取 RSS 标题和短摘要、分别尝试离线机器翻译、保留来源和原文链接。未抓取文章全文，未下载新闻图片，未扩写原文不存在的摘要。

## 启用选择与来源许可分开记录

`personal-rss` 是用户主动启用的个人阅读配置，**不表示已核实或取得发布方授权**。`permissionReference` 仍为空，状态为 `user-enabled`；不填造许可编号，不使用 `licensed-translation` 冒充获得许可。GitHub Pages 和仓库 JSON 仍是公开可访问的，此模式不等于私密托管。

字段开关分别控制标题、RSS 摘要、标题翻译、摘要翻译。机器翻译可能有误，详情保留英文原标题、来源、原文链接与机器翻译说明。没有 RSS 摘要时保持为空；翻译失败回退英文。

原有 `blocked`、`headlines-only`、`licensed-translation` 配置继续有效：`blocked` 不发布条目，后两种仍要求真实 `permissionReference`。撤销某源开关后会同步清理其公开历史与超出配置的字段。

## 来源核查事实

| 来源 | 首次本地可用性 | 首次 GitHub 可用性 | 来源许可核查 |
| --- | --- | --- | --- |
| ESPN NBA | HTTP 200，16 条 | XML 解析失败 | 说明页面返回机器人验证，未绕过，未能完整核实 |
| BBC Football | HTTP 200，69 条 | 成功，69 条 | 当前条款页面未能完整读取；2022 年官方 PDF 对元数据与 RSS 改动有约束 |
| BBC Champions League | HTTP 200，26 条 | 成功，26 条 | 同 BBC Football |

这些是历史探测结果，不保证之后每次可用。当前数量、错误和缓存情况见站点设置页、`public/data/sources-status.json` 与 GitHub Actions 执行报告。本次配置调整没有改变或绕过来源的网络访问限制，也没有解决 ESPN 在 GitHub 环境的返回异常。

## 核查入口

- [ESPN RSS 说明](https://www.espn.com/espn/news/story?page=rssinfo)
- [ESPN NBA RSS](https://www.espn.com/espn/rss/nba/news)
- [BBC 当前使用条款](https://www.bbc.co.uk/usingthebbc/terms-of-use/#15metadataandrssfeeds)
- [BBC 官方条款 PDF，2022-03-31，非保证现行版本](https://downloads.bbc.co.uk/usingthebbc/bbc_terms_of_use_31March2022english.pdf)
- [BBC Football RSS](https://feeds.bbci.co.uk/sport/football/rss.xml)
- [BBC Champions League RSS](https://feeds.bbci.co.uk/sport/football/champions-league/rss.xml)

来源条款没有因为用户启用配置而改变。后续可独立更新核查记录，取得适用许可或选择明确开放的来源；不能把此文档当作法律意见或来源授权书。
