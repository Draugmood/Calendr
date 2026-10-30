import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export interface OverflowMenuItem {
  label: string;
  /** A Material Symbols name. */
  icon: string;
  onSelect: () => void;
  disabled?: boolean;
  isDanger?: boolean;
}

interface Props {
  /** Names the ⋮ button for screen readers and as its tooltip. */
  label: string;
  items: OverflowMenuItem[];
  triggerClassName?: string;
}

const MENU_ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

/**
 * A ⋮ button that opens a short list of less-used actions, so a row of buttons doesn't
 * wrap on a phone. Follows the menu button pattern: arrow keys move between items,
 * Escape closes and returns focus, and a tap anywhere else closes it.
 */
export default function OverflowMenu({
  label,
  items,
  triggerClassName = "rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  const closeAndRefocus = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSelect = (item: OverflowMenuItem) => {
    // Refocus first: a modal opened by onSelect remembers the focused element as the
    // one to return to, and the menu item is about to unmount.
    closeAndRefocus();
    item.onSelect();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndRefocus();
      return;
    }
    if (event.key === "Tab") {
      // Not prevented: from ⋮, Tab and Shift+Tab then continue to its neighbours instead
      // of starting over from the top once the focused item unmounts.
      closeAndRefocus();
      return;
    }

    const menuItems = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR) ?? [],
    );
    if (menuItems.length === 0) return;
    const index = menuItems.indexOf(document.activeElement as HTMLElement);
    const last = menuItems.length - 1;
    const nextIndexByKey: Partial<Record<string, number>> = {
      ArrowDown: index < 0 || index === last ? 0 : index + 1,
      ArrowUp: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const nextIndex = nextIndexByKey[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    menuItems[nextIndex].focus();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={label}
        title={label}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          more_vert
        </span>
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-lg border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left cursor-pointer outline-none hover:bg-gray-100 focus:bg-gray-100 disabled:cursor-default disabled:opacity-50 dark:hover:bg-zinc-700 dark:focus:bg-zinc-700 ${
                item.isDanger ? "text-red-600 dark:text-red-400" : ""
              }`}
            >
              {/* aria-hidden, or the icon's ligature name is read out as part of the label. */}
              <span className="material-symbols-outlined" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
