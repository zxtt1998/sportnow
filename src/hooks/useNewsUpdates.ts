import { useEffect } from "react";
import { newsStore } from "../services/news-store";
export function useNewsUpdates() {
  useEffect(() => {
    void newsStore.refresh();
    const online = () => {
      void newsStore.refresh();
    };
    const visible = () => {
      const checked = newsStore.getSnapshot().checkedAt;
      if (
        document.visibilityState === "visible" &&
        (!checked || Date.now() - Date.parse(checked) > 60000)
      )
        void newsStore.refresh();
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
}
