import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
const positions = new Map<string, number>();
export function useScrollMemory() {
  const { pathname, search } = useLocation();
  const scroll = useRef(0);
  useLayoutEffect(() => {
    history.scrollRestoration = "manual";
    const key = pathname + search;
    const saved = positions.get(key) ?? positions.get(pathname) ?? 0;
    scroll.current = saved;
    window.scrollTo({ top: saved, behavior: "instant" });
    const remember = () => {
      scroll.current = window.scrollY;
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => {
      positions.set(key, scroll.current);
      positions.set(pathname, scroll.current);
      window.removeEventListener("scroll", remember);
    };
  }, [pathname, search]);
}
