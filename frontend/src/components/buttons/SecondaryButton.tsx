interface Props {
  label: string;
  onClick?: () => void;
}

export default function SecondaryButton({ label, onClick }: Props) {
  return (
    <button
      className="border border-gray-300 dark:border-gray-700 rounded border-solid h-min px-5 py-2.5 text-base  font-medium cursor-pointer transition-colors duration-150 hover:border-slate-100 hover:text-slate-100"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
