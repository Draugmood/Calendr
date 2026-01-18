import { useState, useEffect } from "react";
import PrimaryButton from "../buttons/PrimaryButton";
import SecondaryButton from "../buttons/SecondaryButton";
import { createPortal } from "react-dom";
import Checkbox from "../input/Checkbox";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// TODO - ALIGN CHECKLIST WITH OTHER CHECKLISTS VISUAL STYLES

export default function ResetModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const checklistItems = [
    "Rydd vekk fra kjøkkenbord",
    "Tømme oppvaskkum",
    "Fylle oppvaskmaskin og sette på",
    "Vaske kjøkkenbenk+ komfyr + kjøkkenbord",
    "Vaske av tripptrapp",
    "Rydd stue- leker til lekekasser, klær til klesskap eller skittentøy",
    "Tømme søppel kjøkken",
    "Sjekk klesvask status",
    "Sjekke søppel bad og vaskerom",
    "Overnight oats",
    "Matpakke",
    "Pakke jobbsekk",
  ];

  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    new Array(checklistItems.length).fill(false),
  );

  // Reset checkboxes when modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckedItems(new Array(checklistItems.length).fill(false));
    }
  }, [isOpen]);

  const toggleItem = (index: number) => {
    const newChecked = [...checkedItems];
    newChecked[index] = !newChecked[index];
    setCheckedItems(newChecked);
  };

  const allChecked = checkedItems.every(Boolean);
  const checkedCount = checkedItems.filter(Boolean).length;
  const progress = Math.round((checkedCount / checklistItems.length) * 100);

  return createPortal(
    <div
      className="fixed inset-0 z-50 p-4 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-300">
                check_box
              </span>
              Checklist
            </h2>
            <button className="px-3 py-1.5 text-sm bg-zinc-800 text-gray-300 rounded hover:bg-zinc-700 transition-colors font-medium">
              Delete
            </button>
          </div>

          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{progress}%</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-zinc-800 h-1.5 rounded-full mb-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                allChecked ? "bg-green-500" : "bg-zinc-600"
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Scrollable list content */}
        <div className="overflow-y-auto px-6 py-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <ul className="flex flex-col gap-4 pb-4">
            {checklistItems.map((item, i) => (
              <li key={i}>
                <Checkbox
                  checked={checkedItems[i]}
                  onChange={() => toggleItem(i)}
                  label={item}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-3">
          <SecondaryButton label="Avbryt" onClick={onClose} />
          <div
            className={`transition-opacity duration-200 ${
              !allChecked ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            <PrimaryButton
              label="Fullført"
              onClick={() => {
                console.log("Resetting...");
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
