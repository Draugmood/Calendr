import { createContext, useContext } from "react";

export type KeyboardFieldLayout = "text" | "numeric";

export interface KeyboardField {
  id: string;
  layout: KeyboardFieldLayout;
  enterLabel: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}

interface KeyboardContextValue {
  activeFieldId: string | null;
  register: (field: KeyboardField, value: string) => void;
  scheduleUnregister: (id: string) => void;
  unregister: (id: string) => void;
  syncValue: (value: string, inputEl: HTMLInputElement) => void;
  close: () => void;
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboard() {
  const ctx = useContext(KeyboardContext);
  if (!ctx) throw new Error("useKeyboard must be used within a KeyboardProvider");
  return ctx;
}
