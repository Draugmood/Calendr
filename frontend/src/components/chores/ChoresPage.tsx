import { useChores } from "@/hooks/useChores";
import { type Chore, PRIORITY_LABELS } from "@/types/chore";
import {
  type RankedChore,
  formatDueText,
  formatFrequency,
  sortChoresByUrgency,
} from "@/utils/choreUrgency";
import { DateTime } from "luxon";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ChoreFormModal from "./ChoreFormModal";

const UNDO_TOAST_DURATION_MS = 6000;

const PRIORITY_BADGE_CLASSES = {
  1: "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-300",
  2: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  3: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
} as const;

type FormState = { mode: "closed" } | { mode: "create" } | { mode: "edit"; chore: Chore };

interface UndoToast {
  choreId: number;
  title: string;
}

interface ChoreRowProps {
  ranked: RankedChore;
  isSuggested: boolean;
  now: DateTime;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ChoreRow({ ranked, isSuggested, now, onComplete, onEdit, onDelete }: ChoreRowProps) {
  const { chore, urgency } = ranked;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const progress = Math.min(urgency.ratio, 1) * 100;

  return (
    <li
      className={`flex items-center gap-4 rounded-lg border p-3 ${
        isSuggested
          ? "border-cyan-600 bg-cyan-50 dark:bg-cyan-950/40"
          : "border-gray-600"
      }`}
    >
      <button
        type="button"
        onClick={onComplete}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-gray-400 cursor-pointer transition-colors hover:border-green-500 hover:bg-green-500/20"
        aria-label={`Marker «${chore.title}» som gjort`}
        title="Marker som gjort"
      >
        <span className="material-symbols-outlined">check</span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-lg font-semibold">{chore.title}</span>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_CLASSES[chore.priority]}`}
          >
            {PRIORITY_LABELS[chore.priority]}
          </span>
        </div>
        <div className="flex gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{formatFrequency(chore.frequency_days)}</span>
          <span>·</span>
          <span className={urgency.isOverdue ? "text-red-500" : undefined}>
            {formatDueText(urgency, now)}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-zinc-800">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              urgency.isOverdue ? "bg-red-500" : "bg-cyan-600"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isConfirmingDelete ? (
          <>
            <button
              type="button"
              onClick={onDelete}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white cursor-pointer hover:bg-red-500"
            >
              Slett
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
            >
              Avbryt
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
              aria-label="Rediger"
              title="Rediger"
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
              aria-label="Slett"
              title="Slett"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default function ChoresPage() {
  const {
    chores,
    isLoading,
    errorMessage,
    createChore,
    updateChore,
    deleteChore,
    completeChore,
    undoComplete,
  } = useChores();
  const [now, setNow] = useState(() => DateTime.now());
  const [formState, setFormState] = useState<FormState>({ mode: "closed" });
  const [undoToast, setUndoToast] = useState<UndoToast | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(DateTime.now()), 60 * 1000);
    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const rankedChores = useMemo(() => sortChoresByUrgency(chores, now), [chores, now]);

  const showUndoToast = (toast: UndoToast | null) => {
    window.clearTimeout(toastTimeoutRef.current);
    setUndoToast(toast);
    if (toast) {
      toastTimeoutRef.current = window.setTimeout(
        () => setUndoToast(null),
        UNDO_TOAST_DURATION_MS,
      );
    }
  };

  const runAction = async (action: () => Promise<unknown>, failureText: string) => {
    try {
      setActionError(null);
      await action();
      setNow(DateTime.now());
      return true;
    } catch {
      setActionError(failureText);
      return false;
    }
  };

  const handleComplete = async (chore: Chore) => {
    const succeeded = await runAction(
      () => completeChore(chore.id),
      "Kunne ikke markere oppgaven som gjort.",
    );
    if (succeeded) showUndoToast({ choreId: chore.id, title: chore.title });
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    const { choreId } = undoToast;
    showUndoToast(null);
    await runAction(() => undoComplete(choreId), "Kunne ikke angre.");
  };

  return (
    <section className="w-full mt-6 flex justify-center">
      <div className="w-full max-w-3xl border border-gray-600 rounded-lg p-4 text-left bg-white dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center rounded p-1 hover:bg-gray-200 dark:hover:bg-zinc-700"
              aria-label="Tilbake"
              title="Tilbake"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-2xl font-bold">Husarbeid</h1>
          </div>
          <button
            type="button"
            onClick={() => setFormState({ mode: "create" })}
            className="flex items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-stone-950 cursor-pointer hover:bg-cyan-500"
          >
            <span className="material-symbols-outlined">add</span>
            Legg til
          </button>
        </div>

        {actionError && <p className="mb-3 text-sm text-red-500">{actionError}</p>}

        {isLoading && <p className="py-8 text-center">Henter oppgaver...</p>}
        {!isLoading && errorMessage && (
          <p className="py-8 text-center text-red-500">Kunne ikke hente oppgaver.</p>
        )}
        {!isLoading && !errorMessage && rankedChores.length === 0 && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            Ingen oppgaver ennå.
          </p>
        )}

        {!isLoading && !errorMessage && rankedChores.length > 0 && (
          <ul className="flex flex-col gap-3">
            {rankedChores.map((ranked, index) => (
              <ChoreRow
                key={ranked.chore.id}
                ranked={ranked}
                isSuggested={index === 0}
                now={now}
                onComplete={() => void handleComplete(ranked.chore)}
                onEdit={() => setFormState({ mode: "edit", chore: ranked.chore })}
                onDelete={() =>
                  void runAction(
                    () => deleteChore(ranked.chore.id),
                    "Kunne ikke slette oppgaven.",
                  )
                }
              />
            ))}
          </ul>
        )}
      </div>

      {formState.mode !== "closed" && (
        <ChoreFormModal
          chore={formState.mode === "edit" ? formState.chore : null}
          onClose={() => setFormState({ mode: "closed" })}
          onSubmit={(payload) =>
            formState.mode === "edit"
              ? updateChore(formState.chore.id, payload)
              : createChore(payload)
          }
        />
      )}

      {undoToast && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-lg bg-gray-900 px-4 py-3 text-white shadow-xl dark:bg-zinc-700">
          <span>«{undoToast.title}» fullført</span>
          <button
            type="button"
            onClick={() => void handleUndo()}
            className="font-semibold text-cyan-400 cursor-pointer hover:text-cyan-300"
          >
            Angre
          </button>
        </div>
      )}
    </section>
  );
}
