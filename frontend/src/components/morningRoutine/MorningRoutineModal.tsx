import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";
import Checkbox from "../input/Checkbox";

interface MorningRoutineSection {
  title: string;
  items: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const morningRoutineSections: MorningRoutineSection[] = [
  { title: "Morten", items: ["Rent skift jobbklær", "Matpakke"] },
  { title: "Line", items: ["Matpakke", "Være den beste dama"] },
  {
    title: "Ylva",
    items: [
      "Kle på seg",
      "Spise frokost",
      "Pusse tenner",
      "Vaske ansiktet",
      "Matpakke",
      "Drikkeflaske",
    ],
  },
  {
    title: "Ada",
    items: [
      "Skifte bleie",
      "Kle på seg",
      "Spise frokost",
      "Pusse tenner",
      "Vaske ansiktet",
      "Matpakke",
      "Drikkeflaske",
    ],
  },
  { title: "Falk", items: ["Være søt", "Skifte bleie", "Smøre Apobase"] },
  { title: "Annet", items: [] },
];

export default function MorningRoutineModal({ isOpen, onClose }: Props) {
  const totalItems = morningRoutineSections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  );
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(totalItems).fill(false),
  );

  useEffect(() => {
    if (isOpen) {
      setCheckedItems(new Array(totalItems).fill(false));
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
  let itemIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xl relative max-h-[90vh] flex flex-col"
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
            {morningRoutineSections.map((section) => (
              <section key={section.title}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-200 mb-3">
                  {section.title}
                </h3>
                {section.items.length > 0 ? (
                  <ul className="flex flex-col gap-4">
                    {section.items.map((item) => {
                      const currentIndex = itemIndex;
                      itemIndex += 1;

                      return (
                        <li key={`${section.title}-${item}`}>
                          <Checkbox
                            checked={checkedItems[currentIndex]}
                            onChange={() => toggleItem(currentIndex)}
                            label={item}
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
