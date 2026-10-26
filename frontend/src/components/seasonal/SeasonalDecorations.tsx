import type { CSSProperties, ReactNode } from "react";
import Emoji from "../Emoji";
import { APP_BAR_HEIGHT } from "@/config/layout";
import type { SeasonId } from "@/config/seasons";
import { useSeason } from "@/contexts/SeasonContext";

// Positions are fixed per load so the decorations don't jump around on re-render.
function scatter(count: number, seed: number) {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: random() * 100,
    y: random() * 100,
    size: random(),
    delay: random(),
    speed: random(),
  }));
}

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// Crosses the screen left to right now and then, bobbing as it goes.
function Flyer({ symbol, size, top, duration, delay, flip = false, className }: {
  symbol: string;
  size: number;
  top: string;
  duration: number;
  delay: number;
  flip?: boolean;
  className?: string;
}) {
  const style: Vars = { top, "--season-duration": `${duration}s`, "--season-delay": `${delay}s` };
  return (
    <div className="season-fly absolute left-0" style={style}>
      <div className="season-bob">
        <Emoji symbol={symbol} size={size} className={`${flip ? "-scale-x-100" : ""} ${className ?? ""}`} />
      </div>
    </div>
  );
}

// Things that drift down (snow, confetti) or up (hearts) across the whole screen.
function Particles({ count, seed, direction, render }: {
  count: number;
  seed: number;
  direction: "fall" | "rise";
  render: (particle: ReturnType<typeof scatter>[number]) => ReactNode;
}) {
  return scatter(count, seed).map((particle) => {
    const style: Vars = {
      left: `${particle.x}%`,
      "--season-duration": `${14 + particle.speed * 14}s`,
      "--season-delay": `${-particle.delay * 28}s`,
      "--season-sway": `${(particle.size - 0.5) * 80}px`,
    };
    return (
      <div key={particle.index} className={`season-${direction} absolute`} style={style}>
        {render(particle)}
      </div>
    );
  });
}

function Halloween() {
  return (
    <>
      <div className="absolute left-0 opacity-40" style={{ top: APP_BAR_HEIGHT }}>
        <Emoji symbol="🕸️" size={110} />
      </div>
      {/* Hangs from the web down the hour-label gutter. */}
      <div className="absolute left-3 h-72 w-10 overflow-hidden" style={{ top: APP_BAR_HEIGHT + 30 }}>
        <div className="season-dangle flex flex-col items-center">
          <div className="h-48 w-px bg-gray-300/60" />
          <Emoji symbol="🕷️" size={34} className="season-rim" />
        </div>
      </div>

      <Flyer symbol="🦇" size={46} top="16%" duration={34} delay={2} className="season-rim" />
      <Flyer symbol="🦇" size={34} top="22%" duration={34} delay={4.5} className="season-rim" />
      <Flyer symbol="🦇" size={40} top="48%" duration={41} delay={19} className="season-rim" flip />
      <Flyer symbol="👻" size={54} top="64%" duration={57} delay={30} />

      <div className="absolute bottom-0 right-3 flex items-end gap-1">
        <Emoji symbol="🎃" size={36} />
        <Emoji symbol="🎃" size={52} className="season-glow" />
      </div>
    </>
  );
}

function Christmas() {
  return (
    <Particles
      count={36}
      seed={1224}
      direction="fall"
      render={({ size }) => (
        <div
          className="rounded-full bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.6)]"
          style={{ width: 4 + size * 6, height: 4 + size * 6 }}
        />
      )}
    />
  );
}

function NewYear() {
  return (
    <>
      {scatter(14, 2026).map(({ index, x, y, size, delay }) => (
        <div
          key={index}
          className="season-twinkle absolute"
          style={{ left: `${x}%`, top: `${8 + y * 0.84}%`, "--season-delay": `${-delay * 4}s` } as Vars}
        >
          <Emoji symbol={index % 4 === 0 ? "🎆" : "✨"} size={20 + size * 24} />
        </div>
      ))}
    </>
  );
}

function Valentines() {
  return (
    <Particles
      count={12}
      seed={214}
      direction="rise"
      render={({ size }) => <Emoji symbol={size > 0.6 ? "💖" : "💕"} size={20 + size * 18} />}
    />
  );
}

function Easter() {
  return (
    <>
      <Flyer symbol="🐇" size={40} top="58%" duration={45} delay={6} flip />
      <div className="absolute bottom-0 left-3 flex items-end gap-1">
        <Emoji symbol="🌷" size={34} />
        <Emoji symbol="🐣" size={44} />
      </div>
      <div className="absolute bottom-0 right-3 flex items-end gap-1">
        <Emoji symbol="🥚" size={34} />
        <Emoji symbol="🐥" size={40} />
        <Emoji symbol="🌼" size={30} />
      </div>
    </>
  );
}

const CONFETTI_COLORS = ["#ba0c2f", "#ffffff", "#00205b"];

function ConstitutionDay() {
  return (
    <>
      <Particles
        count={28}
        seed={1705}
        direction="fall"
        render={({ index, size }) => (
          <div
            className="season-spin"
            style={{ width: 6 + size * 5, height: 10 + size * 6, background: CONFETTI_COLORS[index % 3] }}
          />
        )}
      />
      <div className="season-wave absolute bottom-1 left-3 origin-bottom-left">
        <Emoji symbol="🇳🇴" size={52} />
      </div>
      <div className="season-wave absolute bottom-1 right-3 origin-bottom-right">
        <Emoji symbol="🇳🇴" size={52} />
      </div>
    </>
  );
}

const DECORATIONS: Record<SeasonId, () => ReactNode> = {
  halloween: Halloween,
  christmas: Christmas,
  newYear: NewYear,
  valentines: Valentines,
  easter: Easter,
  constitutionDay: ConstitutionDay,
};

export default function SeasonalDecorations() {
  const season = useSeason();
  if (!season) return null;

  const Decorations = DECORATIONS[season.id];
  return (
    <div className="seasonal-decorations pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
      <Decorations />
    </div>
  );
}
