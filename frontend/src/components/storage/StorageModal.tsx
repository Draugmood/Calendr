import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  children: ReactNode;
}

/** The modal frame shared by the storage forms, matching ChoreFormModal. */
export default function StorageModal({ title, children }: Props) {
  return createPortal(
    // No backdrop click-to-close: while typing, a stray tap outside the field would
    // discard the form.
    <div className="fixed inset-x-0 top-0 bottom-(--osk-offset) z-50 p-4 flex items-start md:items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 md:p-6 w-full max-w-lg max-h-full overflow-y-auto text-left flex flex-col gap-5">
        <h2 className="text-xl font-bold break-words">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
