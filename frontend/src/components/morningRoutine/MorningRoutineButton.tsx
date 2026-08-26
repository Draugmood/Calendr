import { useState } from "react";
import MorningRoutineModal from "./MorningRoutineModal";

interface Props {
  onDrawerClose?: () => void;
}

export default function MorningRoutineButton({ onDrawerClose }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
    if (onDrawerClose) {
      onDrawerClose();
    }
  };

  return (
    <>
      <div className="px-4">
        <button
          onClick={handleClick}
          className="text-xl flex gap-2 items-center cursor-pointer"
          aria-label="Open morning routine modal"
          title="Morning routine"
        >
          <span className="material-symbols-outlined">routine</span>
          Morning routine
        </button>
      </div>
      <MorningRoutineModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
