import { useNavigate } from "react-router-dom";

interface Props {
  onDrawerClose?: () => void;
}

export default function RemindersButton({ onDrawerClose }: Props) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/reminders");
    onDrawerClose?.();
  };

  return (
    <div className="px-4">
      <button
        onClick={handleClick}
        className="text-xl flex gap-2 items-center cursor-pointer"
        aria-label="Åpne påminnelser"
        title="Påminnelser"
      >
        <span className="material-symbols-outlined">notifications</span>
        Påminnelser
      </button>
    </div>
  );
}
