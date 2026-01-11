import { createContext, createElement, useContext } from "react";
import { useDatesInWeek } from "@/hooks/useDatesInWeek";
import React from "react";

type WeekContextValue = ReturnType<typeof useDatesInWeek>;

const WeekContext = createContext<WeekContextValue | null>(null);

export function WeekProvider({ children }: { children: React.ReactNode }) {
  const week = useDatesInWeek();
  return createElement(WeekContext.Provider, { value: week }, children);
}

export function useWeek() {
  const ctx = useContext(WeekContext);
  if (!ctx) throw new Error("useWeek must be used within a WeekProvider");
  return ctx;
}
