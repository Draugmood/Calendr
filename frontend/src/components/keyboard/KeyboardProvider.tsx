import { KeyboardContext, type KeyboardField } from "@/contexts/KeyboardContext";
import { useHasNativeKeyboard } from "@/hooks/useIsMobile";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SimpleKeyboard } from "react-simple-keyboard";
import KeyboardDock from "./KeyboardDock";
import type { KeyboardLayoutName } from "./layouts";

// Grace period so moving focus between two fields doesn't close and reopen the dock.
const UNREGISTER_DELAY_MS = 100;

function initialLayoutFor(field: KeyboardField, value: string): KeyboardLayoutName {
  if (field.layout === "numeric") return "numeric";
  return value === "" ? "shift" : "default";
}

export default function KeyboardProvider({ children }: { children: ReactNode }) {
  const isEnabled = !useHasNativeKeyboard();
  const [activeField, setActiveField] = useState<KeyboardField | null>(null);
  const [layoutName, setLayoutName] = useState<KeyboardLayoutName>("default");
  const keyboardRef = useRef<SimpleKeyboard | null>(null);
  const unregisterTimeoutRef = useRef<number | undefined>(undefined);

  const register = useCallback((field: KeyboardField, value: string) => {
    window.clearTimeout(unregisterTimeoutRef.current);
    setActiveField(field);
    setLayoutName(initialLayoutFor(field, value));
    keyboardRef.current?.setInput(value);
  }, []);

  const scheduleUnregister = useCallback((id: string) => {
    window.clearTimeout(unregisterTimeoutRef.current);
    unregisterTimeoutRef.current = window.setTimeout(() => {
      setActiveField((current) => (current?.id === id ? null : current));
    }, UNREGISTER_DELAY_MS);
  }, []);

  const unregister = useCallback((id: string) => {
    setActiveField((current) => (current?.id === id ? null : current));
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(unregisterTimeoutRef.current);
    setActiveField(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Crossing the breakpoint swaps keyboards under a focused field: the new dock starts
  // with an empty buffer, or the field never registered at all. Blur it so it releases
  // its registration (via onBlur) and its next focus registers with the current keyboard.
  const wasEnabledRef = useRef(isEnabled);
  useEffect(() => {
    if (wasEnabledRef.current === isEnabled) return;
    wasEnabledRef.current = isEnabled;
    if (!isEnabled) keyboardRef.current = null;
    if (document.activeElement instanceof HTMLInputElement) {
      document.activeElement.blur();
    }
  }, [isEnabled]);

  // Called by the active input after it re-renders. A controlled value update moves the
  // DOM caret to the end, so put it back where the keyboard thinks it is. If the value
  // changed from outside the keyboard (e.g. a preset button), adopt it instead.
  const syncValue = useCallback((value: string, inputEl: HTMLInputElement) => {
    const keyboard = keyboardRef.current;
    if (!keyboard) return;

    if (keyboard.getInput() !== value) {
      keyboard.setInput(value);
      keyboard.setCaretPosition(value.length);
    }

    const caret = keyboard.getCaretPosition();
    if (caret !== null && document.activeElement === inputEl) {
      inputEl.setSelectionRange(caret, caret);
    }
  }, []);

  const handleKeyPress = (button: string) => {
    switch (button) {
      case "{shift}":
        setLayoutName((current) => (current === "shift" ? "default" : "shift"));
        return;
      case "{symbols}":
        setLayoutName("symbols");
        return;
      case "{abc}":
        setLayoutName("default");
        return;
      case "{enter}":
        if (activeField?.onEnter) activeField.onEnter();
        else close();
        return;
      case "{hide}":
        close();
        return;
    }
    // Shift is one-shot: drop back to lower case after a single character.
    if (layoutName === "shift" && !button.startsWith("{")) {
      setLayoutName("default");
    }
  };

  const handleChange = (input: string) => {
    activeField?.onChange(input);
    if (input === "" && layoutName === "default") setLayoutName("shift");
  };

  // Hide a field registered before a native keyboard took over until the effect drops it.
  const activeFieldId = isEnabled ? (activeField?.id ?? null) : null;

  const contextValue = useMemo(
    () => ({
      isEnabled,
      activeFieldId,
      register,
      scheduleUnregister,
      unregister,
      syncValue,
      close,
    }),
    [isEnabled, activeFieldId, register, scheduleUnregister, unregister, syncValue, close],
  );

  return (
    <KeyboardContext.Provider value={contextValue}>
      {children}
      {isEnabled && (
        <KeyboardDock
          isOpen={activeField !== null}
          layoutName={layoutName}
          enterLabel={activeField?.enterLabel ?? "Ferdig"}
          onKeyboardReady={(keyboard) => {
            keyboardRef.current = keyboard;
          }}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
        />
      )}
    </KeyboardContext.Provider>
  );
}
