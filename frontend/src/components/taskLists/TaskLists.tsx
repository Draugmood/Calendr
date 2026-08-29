import { CHECKLIST_CONFIG } from "@/config/checklists";
import { prefetchTrelloChecklist } from "@/hooks/useTrelloChecklist";
import { prefetchTodaysWeather } from "@/hooks/useTodaysWeather";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import TodoList from "./TodoList";
import WeatherTile from "./WeatherTile";

type TileId = "todo" | "dinner" | "weather";
interface PointerStart {
  x: number;
}

const INITIAL_VISIBLE_TILES: TileId[] = ["todo", "dinner"];
const INITIAL_HIDDEN_TILES: TileId[] = ["weather"];
const SWIPE_THRESHOLD_PX = 48;
const TILE_EXIT_DURATION_MS = 320;

function Tile({
  tileId,
  isTransitioning,
  onSwipeStart,
  onSwipeComplete,
}: {
  tileId: TileId;
  isTransitioning: boolean;
  onSwipeStart: () => void;
  onSwipeComplete: (tileId: TileId) => void;
}) {
  const pointerStart = useRef<PointerStart | null>(null);
  const exitTimeout = useRef<number | null>(null);
  const lastExitDirection = useRef<"left" | "right">("left");
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [entryDirection, setEntryDirection] = useState<"left" | "right" | null>(
    null,
  );

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = { x: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;

    if (!start || isTransitioning) return;

    const horizontalDistance = event.clientX - start.x;
    if (Math.abs(horizontalDistance) >= SWIPE_THRESHOLD_PX) {
      const direction = horizontalDistance < 0 ? "left" : "right";
      lastExitDirection.current = direction;
      setExitDirection(direction);
      onSwipeStart();
    }
  }

  function completeExit() {
    if (!exitDirection) return;
    if (exitTimeout.current !== null) {
      window.clearTimeout(exitTimeout.current);
      exitTimeout.current = null;
    }
    setExitDirection(null);
    setEntryDirection(lastExitDirection.current);
    onSwipeComplete(tileId);
  }

  useEffect(() => {
    if (!exitDirection) return;

    exitTimeout.current = window.setTimeout(
      completeExit,
      TILE_EXIT_DURATION_MS + 100,
    );

    return () => {
      if (exitTimeout.current !== null) {
        window.clearTimeout(exitTimeout.current);
        exitTimeout.current = null;
      }
    };
  }, [exitDirection]);

  return (
    <div
      className="touch-pan-y select-none overflow-hidden w-full min-w-0"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      <div
          className={
            exitDirection === "left"
              ? "animate-tile-scroll-out-left mx-auto w-fit"
              : exitDirection === "right"
                ? "animate-tile-scroll-out-right mx-auto w-fit"
                : entryDirection === "left"
                  ? "animate-tile-scroll-in-left mx-auto w-fit"
                  : entryDirection === "right"
                    ? "animate-tile-scroll-in-right mx-auto w-fit"
                    : "mx-auto w-fit"
          }
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (exitDirection) completeExit();
          else setEntryDirection(null);
        }}
      >
        {tileId === "todo" && (
          <TodoList
            checklistId={CHECKLIST_CONFIG.TODO.id}
            qrCodeImage={CHECKLIST_CONFIG.TODO.qrCodeImagePath}
          />
        )}
        {tileId === "dinner" && (
          <TodoList
            checklistId={CHECKLIST_CONFIG.DINNER.id}
            qrCodeImage={CHECKLIST_CONFIG.DINNER.qrCodeImagePath}
          />
        )}
        {tileId === "weather" && <WeatherTile />}
      </div>
    </div>
  );
}

export default function TaskLists() {
  const [tileState, setTileState] = useState({
    visible: INITIAL_VISIBLE_TILES,
    hidden: INITIAL_HIDDEN_TILES,
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    void prefetchTrelloChecklist(CHECKLIST_CONFIG.TODO.id);
    void prefetchTrelloChecklist(CHECKLIST_CONFIG.DINNER.id);
    void prefetchTodaysWeather();
  }, []);

  function completeTileRotation(tileId: TileId) {
    setTileState((current) => {
      const nextTile = current.hidden[0];
      if (!nextTile) return current;

      return {
        visible: current.visible.map((currentTile) =>
          currentTile === tileId ? nextTile : currentTile,
        ),
        hidden: [...current.hidden.slice(1), tileId],
      };
    });
    setIsTransitioning(false);
  }

  return (
    <div className="grid w-full grid-cols-2 gap-4">
      {tileState.visible.map((tileId, slotIndex) => (
        <Tile
          key={slotIndex}
          tileId={tileId}
          isTransitioning={isTransitioning}
          onSwipeStart={() => setIsTransitioning(true)}
          onSwipeComplete={completeTileRotation}
        />
      ))}
    </div>
  );
}
