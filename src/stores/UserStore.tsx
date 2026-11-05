import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { players } from "../data/entities";
import type { UserData, UserPreferences } from "../types";
import { defaultData, parseUserData, STORAGE_KEY } from "./storage";

interface Store {
  data: UserData;
  storageError: boolean;
  toggleBookmark: (id: string) => void;
  toggleFollow: (id: string) => void;
  markRead: (id: string) => void;
  clearHistory: () => void;
  setPreferences: (value: Partial<UserPreferences>) => void;
  reset: () => void;
}
const UserContext = createContext<Store | null>(null);
export function UserProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UserData>(() => {
    try {
      return parseUserData(localStorage.getItem(STORAGE_KEY));
    } catch {
      return defaultData();
    }
  });
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null)
        setData(parseUserData(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        data.preferences.theme === "system"
          ? system.matches
            ? "dark"
            : "light"
          : data.preferences.theme;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#080a0d" : "#f6f7f9");
    };
    apply();
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [data.preferences.theme]);
  const toggleBookmark = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        bookmarks: d.bookmarks.some((b) => b.articleId === id)
          ? d.bookmarks.filter((b) => b.articleId !== id)
          : [
              { articleId: id, savedAt: new Date().toISOString() },
              ...d.bookmarks,
            ],
      })),
    [],
  );
  const toggleFollow = useCallback(
    (id: string) =>
      setData((d) => ({
        ...d,
        follows: d.follows.some((f) => f.id === id)
          ? d.follows.filter((f) => f.id !== id)
          : [
              ...d.follows,
              {
                id,
                kind: players.some((p) => p.id === id) ? "player" : "team",
                followedAt: new Date().toISOString(),
              },
            ],
      })),
    [],
  );
  const markRead = useCallback(
    (id: string) =>
      setData((d) => {
        if (d.history[0]?.articleId === id) return d;
        return {
          ...d,
          history: [
            { articleId: id, readAt: new Date().toISOString() },
            ...d.history.filter((h) => h.articleId !== id),
          ].slice(0, 100),
        };
      }),
    [],
  );
  const clearHistory = useCallback(
    () => setData((d) => ({ ...d, history: [] })),
    [],
  );
  const setPreferences = useCallback(
    (value: Partial<UserPreferences>) =>
      setData((d) => ({ ...d, preferences: { ...d.preferences, ...value } })),
    [],
  );
  const reset = useCallback(() => setData(defaultData()), []);
  return (
    <UserContext.Provider
      value={{
        data,
        storageError,
        toggleBookmark,
        toggleFollow,
        markRead,
        clearHistory,
        setPreferences,
        reset,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
export function useUser() {
  const store = useContext(UserContext);
  if (!store) throw new Error("UserProvider is missing");
  return store;
}
