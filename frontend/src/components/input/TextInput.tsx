import { type KeyboardFieldLayout, useKeyboard } from "@/contexts/KeyboardContext";
import { useEffect, useId, useLayoutEffect, useRef } from "react";

// Wait for the dock's slide-in before scrolling the field into the visible area.
const SCROLL_INTO_VIEW_DELAY_MS = 250;

interface Props {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  enterLabel?: string;
  layout?: KeyboardFieldLayout;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function TextInput({
  value,
  onChange,
  onEnter,
  enterLabel,
  layout = "text",
  placeholder,
  className,
  autoFocus,
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeFieldId, register, scheduleUnregister, unregister, syncValue } =
    useKeyboard();
  const isActive = activeFieldId === id;

  // The keyboard holds on to the handlers registered at focus time, so route them
  // through a ref to always call the latest props (e.g. a submit that reads fresh state).
  const latestRef = useRef({ onChange, onEnter });
  useLayoutEffect(() => {
    latestRef.current = { onChange, onEnter };
  });

  useLayoutEffect(() => {
    if (isActive && inputRef.current) syncValue(value, inputRef.current);
  }, [isActive, value, syncValue]);

  // Release the keyboard if the field unmounts while focused (e.g. a modal closing on
  // Enter). A still-focused node means StrictMode's simulated unmount, so keep it then.
  useEffect(() => {
    const inputEl = inputRef.current;
    return () => {
      if (document.activeElement !== inputEl) unregister(id);
    };
  }, [id, unregister]);

  const handleFocus = () => {
    register(
      {
        id,
        layout,
        enterLabel: enterLabel ?? (onEnter ? "Lagre" : "Ferdig"),
        onChange: (next) => latestRef.current.onChange(next),
        onEnter: onEnter ? () => latestRef.current.onEnter?.() : undefined,
      },
      value,
    );
    window.setTimeout(
      () => inputRef.current?.scrollIntoView({ block: "nearest" }),
      SCROLL_INTO_VIEW_DELAY_MS,
    );
  };

  return (
    <input
      ref={inputRef}
      className={`border border-gray-400 rounded px-3 py-2 bg-transparent ${
        isActive ? "border-cyan-500 outline-none" : ""
      } ${className ?? ""}`}
      type="text"
      inputMode="none"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") onEnter?.();
      }}
      onFocus={handleFocus}
      onBlur={() => scheduleUnregister(id)}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  );
}
