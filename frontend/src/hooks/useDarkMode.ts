import { useCallback, useEffect, useState } from "react";

function hasDarkClass(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // During SSR this would fail, but Vite SPA runs in browser; still, be safe.
    if (typeof document === "undefined") return false;
    return hasDarkClass();
  });

  const setDarkMode = useCallback((value: boolean) => {
    document.documentElement.classList.toggle("dark", value);
    setIsDarkMode(value);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!hasDarkClass());
  }, [setDarkMode]);

  // If something else changes the class (rare), sync state on mount.
  useEffect(() => {
    setIsDarkMode(hasDarkClass());
  }, []);

  return {
    isDarkMode,
    setDarkMode,
    toggleDarkMode,
  };
}
