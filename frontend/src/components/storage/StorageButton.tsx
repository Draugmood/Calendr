import { useNavigate } from "react-router-dom";

interface Props {
  onDrawerClose?: () => void;
}

export default function StorageButton({ onDrawerClose }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/storage");
    onDrawerClose?.();
  };

  return (
    <div className="px-4">
      <button
        onClick={handleClick}
        className="text-xl flex gap-2 items-center cursor-pointer"
        aria-label="Åpne oppbevaring"
        title="Oppbevaring"
      >
        <span className="material-symbols-outlined">inventory_2</span>
        Oppbevaring
      </button>
    </div>
  );
}
