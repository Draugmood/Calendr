import TextInput from "@/components/input/TextInput";
import { useSuggestions } from "@/hooks/useSuggestions";
import type { Suggestion } from "@/types/suggestion";
import { DateTime } from "luxon";
import { useState } from "react";
import { Link } from "react-router-dom";

interface SuggestionRowProps {
  suggestion: Suggestion;
  onToggleDone: () => void;
  onDelete: () => void;
}

function formatCreatedAt(createdAt: string): string {
  // SQLite's datetime('now') is UTC without an offset.
  return DateTime.fromSQL(createdAt, { zone: "utc" })
    .toLocal()
    .setLocale("nb")
    .toFormat("d. MMM yyyy");
}

function SuggestionRow({ suggestion, onToggleDone, onDelete }: SuggestionRowProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <li
      className={`flex items-center gap-3 md:gap-4 rounded-lg border border-gray-600 p-3 ${
        suggestion.done ? "opacity-60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggleDone}
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 cursor-pointer transition-colors hover:border-green-500 hover:bg-green-500/20 ${
          suggestion.done ? "border-green-500 bg-green-500/20" : "border-gray-400"
        }`}
        aria-label={
          suggestion.done
            ? `Marker «${suggestion.text}» som ikke gjort`
            : `Marker «${suggestion.text}» som gjort`
        }
        title={suggestion.done ? "Marker som ikke gjort" : "Marker som gjort"}
      >
        <span className="material-symbols-outlined">check</span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`min-w-0 break-words text-lg ${suggestion.done ? "line-through" : ""}`}
        >
          {suggestion.text}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatCreatedAt(suggestion.created_at)}
        </span>
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
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="rounded p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700"
            aria-label="Slett"
            title="Slett"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
      </div>
    </li>
  );
}

export default function SuggestionsPage() {
  const {
    suggestions,
    isLoading,
    errorMessage,
    createSuggestion,
    setSuggestionDone,
    deleteSuggestion,
  } = useSuggestions();
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: () => Promise<unknown>, failureText: string) => {
    try {
      setActionError(null);
      await action();
      return true;
    } catch {
      setActionError(failureText);
      return false;
    }
  };

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || isSaving) return;
    setIsSaving(true);
    const succeeded = await runAction(
      () => createSuggestion(text),
      "Kunne ikke lagre forslaget.",
    );
    setIsSaving(false);
    if (succeeded) setDraft("");
  };

  return (
    <section className="w-full mt-2 md:mt-6 flex justify-center">
      <div className="w-full max-w-3xl border border-gray-600 rounded-lg p-3 md:p-4 text-left bg-white dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center rounded p-1 hover:bg-gray-200 dark:hover:bg-zinc-700"
            aria-label="Tilbake"
            title="Tilbake"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-bold">Forslag</h1>
        </div>

        <div className="mb-4 flex gap-2">
          <TextInput
            value={draft}
            onChange={setDraft}
            onEnter={() => void handleSubmit()}
            placeholder="Det hadde vært fint om Tavla kunne..."
            className="min-w-0 flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!draft.trim() || isSaving}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-cyan-600 px-4 py-2 font-medium text-stone-950 cursor-pointer hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="material-symbols-outlined">add</span>
            Legg til
          </button>
        </div>

        {actionError && <p className="mb-3 text-sm text-red-500">{actionError}</p>}

        {isLoading && <p className="py-8 text-center">Henter forslag...</p>}
        {!isLoading && errorMessage && (
          <p className="py-8 text-center text-red-500">Kunne ikke hente forslag.</p>
        )}
        {!isLoading && !errorMessage && suggestions.length === 0 && (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            Ingen forslag ennå.
          </p>
        )}

        {!isLoading && !errorMessage && suggestions.length > 0 && (
          <ul className="flex flex-col gap-3">
            {suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.id}
                suggestion={suggestion}
                onToggleDone={() =>
                  void runAction(
                    () => setSuggestionDone(suggestion.id, !suggestion.done),
                    "Kunne ikke oppdatere forslaget.",
                  )
                }
                onDelete={() =>
                  void runAction(
                    () => deleteSuggestion(suggestion.id),
                    "Kunne ikke slette forslaget.",
                  )
                }
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
