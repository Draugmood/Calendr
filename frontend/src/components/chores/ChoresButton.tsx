import { useNavigate } from "react-router-dom";

interface Props {
  onDrawerClose?: () => void;
}

export default function ChoresButton({ onDrawerClose }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/chores");
    onDrawerClose?.();
  };

  return (
    <div className="px-4">
      <button
        onClick={handleClick}
        className="text-xl flex gap-2 items-center cursor-pointer"
        aria-label="Åpne husarbeid"
        title="Husarbeid"
      >
        <span className="material-symbols-outlined">cleaning_services</span>
        Husarbeid
      </button>
    </div>
  );
}
