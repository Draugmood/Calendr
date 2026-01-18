import { APP_BAR_HEIGHT } from "@/config/layout";
import Clock from "../Clock";
import HamburgerMenu from "./hamburgerMenu/HamburgerMenu";

export default function AppBar() {
  return (
    <div
      className="w-full grid grid-cols-3 items-center bg-white dark:bg-gray-900 p-4 shadow-md"
      style={{ height: APP_BAR_HEIGHT }}
    >
      <HamburgerMenu />
      <Clock align="center" />
      <h1 className="text-2xl text-right font-bold text-gray-900 dark:text-white">
        Tavla<sub className="text-sm font-normal">TM</sub>
      </h1>
    </div>
  );
}
