interface Props {
  label: string;
  onClick?: () => void;
}

export default function DangerButton({ label, onClick }: Props) {
  return (
    <button
      className="border rounded-lg border-solid px-5 py-2.5 bg-red-700 font-medium cursor-pointer transition-colors duration-150 hover:border-white hover:text-white"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
