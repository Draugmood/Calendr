import { useState } from "react";
import HamburgerDrawer from "./HamburgerDrawer";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 w-10 h-10 rounded flex items-center justify-center bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
        aria-label={"Toggle hamburger menu"}
        title={"Menu"}
      >
        <span className="material-symbols-outlined">menu</span>
      </button>
      <HamburgerDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
