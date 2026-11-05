import { useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
export function PWAUpdate() {
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      registration.current = reg;
    },
  });
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        void registration.current?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);
  if (!needRefresh) return null;
  return (
    <div className="update-toast" role="status">
      <RefreshCw size={18} />
      <span>SportNow 新版本已就绪</span>
      <button onClick={() => void updateServiceWorker(true)}>更新</button>
      <button
        className="icon-button"
        aria-label="稍后更新"
        onClick={() => setNeedRefresh(false)}
      >
        <X size={17} />
      </button>
    </div>
  );
}
