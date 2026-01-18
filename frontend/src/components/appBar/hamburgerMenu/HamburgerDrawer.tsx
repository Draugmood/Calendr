import ResetButton from "@/components/resetModal/ResetButton";
import { APP_BAR_HEIGHT } from "@/config/layout";
import { createPortal } from "react-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HamburgerDrawer({ isOpen, onClose }: Props) {
  const drawerOutlineOffset = 4; // To avoid bottom of drawer showing when closed
  const appBarHeight = APP_BAR_HEIGHT;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed left-0 h-96 w-64 mx-4
          outline-3 outline-slate-600  rounded-lg
          bg-white dark:bg-gray-900 shadow-2xl z-50
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-y-0" : "-translate-y-full"}`}
        style={{
          top: isOpen ? appBarHeight : -drawerOutlineOffset,
          outlineStyle: "outset",
        }}
      >
        <div className=" flex flex-col items-start gap-4">
          <h2 className="px-4 pt-4 text-2xl">Meny</h2>
          <hr className="w-full border-slate-300 dark:border-slate-700" />
          <ResetButton onDrawerClose={onClose} />
        </div>
      </div>
    </>,
    document.body,
  );
}
