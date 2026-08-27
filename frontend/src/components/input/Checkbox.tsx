import { useEffect, useRef, useState, type CSSProperties } from "react";
import Emoji from "../Emoji";

interface Props {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
  size?: "md" | "lg";
  icon?: string;
  celebrate?: boolean;
}

interface ConfettiPiece {
  id: number;
  tx: number;
  ty: number;
  rot: number;
  color: string;
}

const CONFETTI_COLORS = [
  "#f97316",
  "#ec4899",
  "#22c55e",
  "#3b82f6",
  "#eab308",
  "#a855f7",
];

export default function Checkbox({
  checked,
  onChange,
  label,
  className,
  size = "md",
  icon,
  celebrate = false,
}: Props) {
  const isLarge = size === "lg";
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const wasChecked = useRef(checked);
  const nextPieceId = useRef(0);

  // Fire a confetti burst only when the box transitions from unchecked to checked.
  useEffect(() => {
    const previouslyChecked = wasChecked.current;
    wasChecked.current = checked;

    if (!celebrate || previouslyChecked || !checked) return;

    setPieces(
      Array.from({ length: 14 }, () => {
        const angle = Math.random() * Math.PI * 2;
        const distance = 26 + Math.random() * 26;
        return {
          id: nextPieceId.current++,
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance - 10,
          rot: Math.random() * 360,
          color:
            CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        };
      }),
    );
    const timeout = setTimeout(() => setPieces([]), 700);
    return () => clearTimeout(timeout);
  }, [checked, celebrate]);

  return (
    <label
      className={`flex items-center gap-3 cursor-pointer group ${className ?? ""}`}
    >
      <div className="relative flex items-center shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={`
            peer appearance-none 
            border border-gray-600 rounded 
            bg-transparent 
            checked:bg-transparent checked:border-gray-400
            hover:border-gray-500 transition-colors
            ${isLarge ? "w-10 h-10" : "w-5 h-5"}
          `}
        />
        <span
          className="
            material-symbols-outlined absolute text-gray-300
            opacity-0 peer-checked:opacity-100 top-0.5 left-0 pointer-events-none
          "
          style={{ fontSize: isLarge ? "2.5rem" : "1.25rem" }}
        >
          check
        </span>

        {pieces.map((piece) => (
          <span
            key={piece.id}
            className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-sm pointer-events-none animate-confetti-piece"
            style={
              {
                backgroundColor: piece.color,
                "--confetti-tx": `${piece.tx}px`,
                "--confetti-ty": `${piece.ty}px`,
                "--confetti-rot": `${piece.rot}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {icon && <Emoji symbol={icon} size={isLarge ? 40 : 22} />}

      {label && (
        <div
          className="flex-1 overflow-hidden min-w-0 @container"
          title={label}
        >
          <div
            className={[
              "whitespace-nowrap w-fit animate-scroll-peek",
              isLarge ? "text-3xl leading-snug" : "text-lg leading-snug",
              "group-hover:text-gray-100",
              "transition-colors select-none text-nowrap",
              checked
                ? "line-through text-gray-500"
                : "text-gray-900 dark:text-gray-300",
            ].join(" ")}
          >
            {label}
          </div>
        </div>
      )}
    </label>
  );
}
