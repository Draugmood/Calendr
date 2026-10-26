import { createContext, createElement, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import React from "react";
import { activeSeason, seasonById, type Season } from "@/config/seasons";

// The kiosk never reloads, so re-check the date now and then to roll over at midnight.
const RECHECK_MS = 5 * 60 * 1000;
const OVERRIDE_KEY = "calendr.seasonOverride";

// `?season=halloween` previews a theme, `?season=none` turns theming off,
// `?season=auto` clears the override. It sticks for the browser tab.
function readOverride(search: string): string | null {
  const fromUrl = new URLSearchParams(search).get("season");
  try {
    if (fromUrl === "auto") sessionStorage.removeItem(OVERRIDE_KEY);
    else if (fromUrl) sessionStorage.setItem(OVERRIDE_KEY, fromUrl);
    return sessionStorage.getItem(OVERRIDE_KEY);
  } catch {
    return fromUrl === "auto" ? null : fromUrl;
  }
}

function resolveSeason(override: string | null): Season | undefined {
  if (override === "none") return undefined;
  return seasonById(override) ?? activeSeason();
}

const SeasonContext = createContext<Season | undefined>(undefined);

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const { search } = useLocation();
  const [override, setOverride] = useState(() => readOverride(search));
  const [season, setSeason] = useState(() => resolveSeason(override));

  useEffect(() => {
    setOverride(readOverride(search));
  }, [search]);

  useEffect(() => {
    setSeason(resolveSeason(override));
    const timer = setInterval(() => setSeason(resolveSeason(override)), RECHECK_MS);
    return () => clearInterval(timer);
  }, [override]);

  useEffect(() => {
    const root = document.documentElement;
    if (season) root.dataset.season = season.id;
    else delete root.dataset.season;
  }, [season]);

  return createElement(SeasonContext.Provider, { value: season }, children);
}

export function useSeason() {
  return useContext(SeasonContext);
}
