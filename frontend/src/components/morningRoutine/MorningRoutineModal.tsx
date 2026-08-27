import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";
import Checkbox from "../input/Checkbox";

interface MorningRoutineItem {
  label: string;
  shortLabel?: string;
  icon?: string;
}

interface MorningRoutineSection {
  title: string;
  items: MorningRoutineItem[];
  kidFriendly?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const morningRoutineSections: MorningRoutineSection[] = [
  {
    title: "Morten",
    items: [{ label: "Rent skift jobbklær" }, { label: "Matpakke" }],
  },
  {
    title: "Line",
    items: [{ label: "Matpakke" }, { label: "Være den beste dama" }],
  },
  {
    title: "Ylva",
    items: [
      { label: "Kle på seg", shortLabel: "Klær", icon: "👕" },
      { label: "Spise frokost", shortLabel: "Frokost", icon: "🥣" },
      { label: "Pusse tenner", shortLabel: "Pusse", icon: "🪥" },
      { label: "Vaske ansiktet", shortLabel: "Vaske", icon: "🧼" },
      { label: "Matpakke", shortLabel: "Matpakke", icon: "🥪" },
      { label: "Drikkeflaske", shortLabel: "Flaske", icon: "🍾" },
    ],
    kidFriendly: true,
  },
  {
    title: "Ada",
    items: [
      {
        label: "Skifte bleie",
        shortLabel: "Bleie",
        icon: "🚼",
      },
      { label: "Kle på seg", shortLabel: "Klær", icon: "👕" },
      { label: "Spise frokost", shortLabel: "Frokost", icon: "🥣" },
      { label: "Pusse tenner", shortLabel: "Pusse", icon: "🪥" },
      { label: "Vaske ansiktet", shortLabel: "Vaske", icon: "🧼" },
      { label: "Matpakke", shortLabel: "Matpakke", icon: "🥪" },
      { label: "Drikkeflaske", shortLabel: "Flaske", icon: "🍾" },
    ],
    kidFriendly: true,
  },
  {
    title: "Falk",
    items: [
      { label: "Være søt" },
      { label: "Skifte bleie" },
      { label: "Smøre Apobase" },
    ],
  },
  { title: "Annet", items: [] },
];

// Precompute each section's starting position in the flat checkedItems array
// so indices stay stable when a view filters out some sections.
let runningIndex = 0;
const sectionsWithOffsets = morningRoutineSections.map((section) => {
  const offset = runningIndex;
  runningIndex += section.items.length;
  return { ...section, offset };
});

export default function MorningRoutineModal({ isOpen, onClose }: Props) {
  const totalItems = morningRoutineSections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(totalItems).fill(false),
  );
  const [view, setView] = useState<"kids" | "everyone">("everyone");

  useEffect(() => {
    if (isOpen) {
      setCheckedItems(new Array(totalItems).fill(false));
      setView("everyone");
    }
  }, [isOpen, totalItems]);

  if (!isOpen) return null;

  const toggleItem = (index: number) => {
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  const checkedCount = checkedItems.filter(Boolean).length;
  const allChecked = totalItems > 0 && checkedCount === totalItems;
  const progress =
    totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const visibleSections = sectionsWithOffsets.filter(
    (section) => view === "everyone" || section.kidFriendly,
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-300">
                routine
              </span>
              Morning routine
            </h2>
            <button
              onClick={() =>
                setView((v) => (v === "kids" ? "everyone" : "kids"))
              }
              className="w-10 h-10 shrink-0 rounded-full bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors flex items-center justify-center"
              aria-label={
                view === "kids"
                  ? "Switch to everyone view"
                  : "Switch to kids view"
              }
              title={view === "kids" ? "Everyone" : "Kids"}
            >
              <span className="material-symbols-outlined">
                {view === "kids" ? "group" : "child_care"}
              </span>
            </button>
          </div>

          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mb-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                allChecked ? "bg-green-500" : "bg-zinc-600"
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-4">
            {visibleSections.map((section) => (
              <section key={section.title}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                  {section.title}
                </h3>
                {section.items.length > 0 ? (
                  <ul className="flex flex-col gap-4">
                    {section.items.map((item, i) => {
                      const currentIndex = section.offset + i;
                      const isKidsView = section.kidFriendly && view === "kids";

                      return (
                        <li key={`${section.title}-${item.label}`}>
                          <Checkbox
                            checked={checkedItems[currentIndex]}
                            onChange={() => toggleItem(currentIndex)}
                            label={
                              isKidsView
                                ? (item.shortLabel ?? item.label)
                                : item.label
                            }
                            icon={isKidsView ? item.icon : undefined}
                            size={isKidsView ? "lg" : "md"}
                            celebrate={isKidsView}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ingen punkter ennå.
                  </p>
                )}
              </section>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <SecondaryButton label="Avbryt" onClick={onClose} />
          <div
            className={`transition-opacity duration-200 ${
              !allChecked ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            <PrimaryButton label="Fullført" onClick={onClose} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
