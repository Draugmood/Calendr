import { useNavigate } from "react-router-dom";

interface Props {
  onDrawerClose?: () => void;
}

export default function SuggestionsButton({ onDrawerClose }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/suggestions");
    onDrawerClose?.();
  };

  return (
    <div className="px-4">
      <button
        onClick={handleClick}
        className="text-xl flex gap-2 items-center cursor-pointer"
        aria-label="Åpne forslag"
        title="Forslag"
      >
        <span className="material-symbols-outlined">lightbulb</span>
        Forslag
      </button>
    </div>
  );
}
