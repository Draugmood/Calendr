import twemoji from "twemoji";

interface Props {
  symbol: string;
  className?: string;
  size?: number;
}

// Renders emoji as Twemoji SVGs so colors look identical across every OS/browser.
export default function Emoji({ symbol, className, size = 28 }: Props) {
  // Twemoji's asset filenames drop the variation selector for most emoji.
  const url = twemoji.convert.toCodePoint(
    symbol.replace(/[\uFE0E\uFE0F]/g, ""),
  );

  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${url}.svg`}
      alt={symbol}
      draggable={false}
      className={`inline-block select-none ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
