import { NewsStatusPanel } from "../../components/news/NewsStatus";
import { newsStore } from "../../services/news-store";
import { useState } from "react";
import {
  Check,
  Monitor,
  Moon,
  Sun,
  Trash2,
  ArrowUpRight,
  Smartphone,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Dialog, Segments } from "../../components/common/Primitives";
import { useUser } from "../../stores/UserStore";
export function Settings() {
  const { data, setPreferences, reset } = useUser();
  const [dialog, setDialog] = useState<"reset" | "about" | "install" | null>(
    null,
  );
  const [resetDone, setResetDone] = useState(false);
  return (
    <section>
      <div className="panel-heading">
        <h2>按照你的习惯</h2>
      </div>
      <p className="panel-description">
        轻一点，专注一点。所有偏好仅保存在这台设备。
      </p>
      <div className="settings-section">
        <h3>外观</h3>
        <div className="theme-picker" role="group" aria-label="主题模式">
          {(
            [
              { value: "light", label: "浅色", Icon: Sun },
              { value: "dark", label: "深色", Icon: Moon },
              { value: "system", label: "跟随系统", Icon: Monitor },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              className={data.preferences.theme === value ? "selected" : ""}
              aria-pressed={data.preferences.theme === value}
              onClick={() => setPreferences({ theme: value })}
            >
              <span className={`theme-preview preview-${value}`}>
                <span />
                <span />
                <span />
              </span>
              <span>
                <Icon size={14} />
                {label}
                {data.preferences.theme === value && <Check size={13} />}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <h3>阅读偏好</h3>
        <div className="setting-row">
          <div>
            <strong>默认新闻排序</strong>
            <p>推荐会优先展示你关注的内容</p>
          </div>
          <Segments
            label="新闻排序偏好"
            options={[
              { value: "recommended", label: "推荐" },
              { value: "latest", label: "最新" },
            ]}
            value={data.preferences.sort}
            onChange={(sort) => setPreferences({ sort })}
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>展示密度</strong>
            <p>调整列表摘要与间距</p>
          </div>
          <Segments
            label="新闻展示密度"
            options={[
              { value: "comfortable", label: "舒适" },
              { value: "compact", label: "紧凑" },
            ]}
            value={data.preferences.density}
            onChange={(density) => setPreferences({ density })}
          />
        </div>
      </div>
      <div className="settings-section">
        <h3>在这台设备上</h3>
        <button className="setting-action" onClick={() => setDialog("install")}>
          <Smartphone size={18} />
          <span>添加到主屏幕</span>
          <ArrowUpRight size={16} />
        </button>
        <button className="setting-action" onClick={() => setDialog("about")}>
          <Info size={18} />
          <span>关于 SportNow</span>
          <ArrowUpRight size={16} />
        </button>
        <button
          className="setting-action danger-text"
          onClick={() => setDialog("reset")}
        >
          <Trash2 size={18} />
          <span>清除本地数据</span>
          <ArrowUpRight size={16} />
        </button>
        {resetDone && (
          <p className="success-message" role="status">
            已清除收藏与阅读记录，并恢复默认关注和设置。
          </p>
        )}
      </div>
      <NewsStatusPanel />
      <div className="privacy-note">
        <ShieldCheck size={19} />
        <p>
          没有账号，没有追踪。
          <br />
          <span>你的收藏与偏好，只属于你。</span>
        </p>
      </div>
      {dialog === "reset" && (
        <Dialog title="清除本地数据？" onClose={() => setDialog(null)}>
          <p>
            将删除本机 SportNow
            的全部收藏、阅读记录和自定义设置，并恢复默认关注：马刺、皇马、C罗。此操作无法撤销。
          </p>
          <div className="dialog-actions">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              取消
            </button>
            <button
              className="danger-button"
              onClick={() => {
                reset();
                newsStore.clearCache();
                setResetDone(true);
                setDialog(null);
              }}
            >
              确认清除
            </button>
          </div>
        </Dialog>
      )}
      {dialog === "about" && (
        <Dialog title="SportNow · 为热爱在场" onClose={() => setDialog(null)}>
          <p>版本 2.0.0 · RSS 与离线翻译链路</p>
          <p>
            一个为 NBA 与足球爱好者设计的个人新闻阅读 PWA。新闻由 GitHub Actions
            检查 RSS，按来源许可控制公开展示和翻译。配图为自产 SVG
            插画，非新闻现场照片。
          </p>
          <p>
            不抓取新闻全文，不转载未经许可的摘要或图片。Argos
            仅在允许时做离线英中翻译；视频与讨论继续预留。
          </p>
          <button className="primary-button" onClick={() => setDialog(null)}>
            继续热爱
          </button>
        </Dialog>
      )}
      {dialog === "install" && (
        <Dialog title="把 SportNow 放在主屏幕" onClose={() => setDialog(null)}>
          <ol className="install-steps">
            <li>在 iPhone 上使用 Safari 打开本站。</li>
            <li>轻点浏览器的「分享」按钮。</li>
            <li>向下找到「添加到主屏幕」，确认添加。</li>
          </ol>
          <p>
            首次联网打开后，基础界面和最近成功获取的新闻可离线阅读。离线缓存可能被系统清理，个人数据以本机存储为准。
          </p>
          <p>其他浏览器可使用地址栏或菜单中的「安装应用」入口（如支持）。</p>
          <button className="primary-button" onClick={() => setDialog(null)}>
            知道了
          </button>
        </Dialog>
      )}
    </section>
  );
}
