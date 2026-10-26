import { APP_BAR_HEIGHT } from "@/config/layout";
import { useSeason } from "@/contexts/SeasonContext";
import Clock from "../Clock";
import Emoji from "../Emoji";
import HamburgerMenu from "./hamburgerMenu/HamburgerMenu";

export default function AppBar() {
  const season = useSeason();

  return (
    <div
      className="w-full grid grid-cols-3 items-center bg-white dark:bg-gray-900 p-4 shadow-md"
      style={{ height: APP_BAR_HEIGHT }}
    >
      <HamburgerMenu />
      <Clock align="center" />
      <h1 className="season-title flex items-center justify-end gap-2 text-2xl font-bold text-gray-900 dark:text-white">
        {season && <Emoji symbol={season.emoji} size={30} className="align-middle" />}
        <span title={season?.label}>
          Tavla<sub className="text-sm font-normal">TM</sub>
        </span>
      </h1>
    </div>
  );
}
