import { useState } from "react";
import ResetModal from "./ResetModal";

interface Props {
  onDrawerClose?: () => void;
}

export default function ResetButton({ onDrawerClose }: Props) {
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
          aria-label="Open reset modal"
          title="Reset"
        >
          <span className="material-symbols-outlined">replay</span>
          Reset
        </button>
      </div>
      <ResetModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
