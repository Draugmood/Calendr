import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Keyboard, { type SimpleKeyboard } from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import {
  KEYBOARD_LAYOUTS,
  type KeyboardLayoutName,
  getKeyboardButtonTheme,
  getKeyboardDisplay,
} from "./layouts";

interface Props {
  isOpen: boolean;
  layoutName: KeyboardLayoutName;
  enterLabel: string;
  onKeyboardReady: (keyboard: SimpleKeyboard) => void;
  onChange: (input: string) => void;
  onKeyPress: (button: string) => void;
}

export default function KeyboardDock({
  isOpen,
  layoutName,
  enterLabel,
  onKeyboardReady,
  onChange,
  onKeyPress,
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null);

  // Publish the dock height so layouts (modals, page padding) can stay clear of it.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;

    const root = document.documentElement;
    const update = () =>
      root.style.setProperty("--osk-offset", isOpen ? `${dock.offsetHeight}px` : "0px");

    update();
    const observer = new ResizeObserver(update);
    observer.observe(dock);
    return () => observer.disconnect();
  }, [isOpen]);

  return createPortal(
    <div
      ref={dockRef}
      className={`fixed inset-x-0 bottom-0 z-60 border-t border-slate-300 dark:border-slate-700 bg-gray-100 dark:bg-gray-900 shadow-2xl transition-transform duration-200 ease-out ${
        isOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
      aria-hidden={!isOpen}
      // Keep focus (and the caret) in the input while keys are tapped.
      onPointerDown={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className={`mx-auto p-2 ${layoutName === "numeric" ? "max-w-sm" : "max-w-5xl"}`}>
        <Keyboard
          keyboardRef={onKeyboardReady}
          layout={KEYBOARD_LAYOUTS}
          layoutName={layoutName}
          display={getKeyboardDisplay(enterLabel)}
          buttonTheme={getKeyboardButtonTheme(layoutName)}
          theme="hg-theme-default osk-theme"
          preventMouseDownDefault
          onChange={onChange}
          onKeyPress={onKeyPress}
        />
      </div>
    </div>,
    document.body,
  );
}
