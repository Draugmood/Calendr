import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  children: ReactNode;
}

const FOCUSABLE =
  "a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

// Open storage modals, innermost last. The move picker opens a place form on top of
// itself, so everything below the innermost one is inert. The on-screen keyboard is
// portalled outside #root and stays usable.
const openOverlays: HTMLElement[] = [];
// Focused when the outermost modal opened; gets focus back when the last one closes.
let baseOpener: HTMLElement | null = null;

/** The modal frame shared by the storage forms, matching ChoreFormModal. */
export default function StorageModal({ title, children }: Props) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Captured during render: an autoFocus field inside takes focus before effects run.
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  useEffect(() => {
    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return;

    const appRoot = document.getElementById("root");
    if (openOverlays.length === 0) baseOpener = opener;
    const below = openOverlays.at(-1);
    if (below) below.inert = true;
    if (appRoot) appRoot.inert = true;
    openOverlays.push(overlay);
    if (!dialog.contains(document.activeElement)) dialog.focus();

    function trapTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || openOverlays.at(-1) !== overlay || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!first || !dialog.contains(active)) {
        event.preventDefault();
        (first ?? dialog).focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trapTab);

    return () => {
      document.removeEventListener("keydown", trapTab);
      openOverlays.splice(openOverlays.indexOf(overlay), 1);
      const top = openOverlays.at(-1);
      if (top) {
        top.inert = false;
      } else if (appRoot) {
        appRoot.inert = false;
      }
      // StrictMode's rehearsal cleanup leaves the overlay in the DOM; a real close has
      // already removed it. Only a real close should move focus.
      if (overlay.isConnected) return;
      if (top) {
        if (opener && top.contains(opener)) opener.focus();
      } else {
        if (baseOpener?.isConnected) baseOpener.focus();
        baseOpener = null;
      }
    };
  }, [opener]);

  return createPortal(
    // No backdrop click-to-close: while typing, a stray tap outside the field would
    // discard the form.
    <div
      ref={overlayRef}
      className="fixed inset-x-0 top-0 bottom-(--osk-offset) z-50 p-4 flex items-start md:items-center justify-center bg-black/60"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 md:p-6 w-full max-w-lg max-h-full overflow-y-auto text-left flex flex-col gap-5 outline-none"
      >
        <h2 id={titleId} className="text-xl font-bold break-words">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
