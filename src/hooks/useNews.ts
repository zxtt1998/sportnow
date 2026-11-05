import { useSyncExternalStore } from "react";
import { newsStore } from "../services/news-store";
export function useNews() {
  return useSyncExternalStore(newsStore.subscribe, newsStore.getSnapshot);
}
