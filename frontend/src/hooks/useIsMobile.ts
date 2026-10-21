import { MOBILE_LAYOUT_QUERY } from "@/config/layout";
import { useMediaQuery } from "./useMediaQuery";

// iPadOS reports a desktop Safari user agent, so recognise it by its touch support.
const IS_MOBILE_DEVICE =
  /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/** True when the viewport is phone-sized and views should use their compact layout. */
export function useIsMobileLayout(): boolean {
  return useMediaQuery(MOBILE_LAYOUT_QUERY);
}

/**
 * True when the device brings its own on-screen keyboard (phones, tablets) or the
 * viewport is phone-sized. The in-app keyboard is only meant for the wall display.
 */
export function useHasNativeKeyboard(): boolean {
  const isMobileLayout = useIsMobileLayout();
  return IS_MOBILE_DEVICE || isMobileLayout;
}
