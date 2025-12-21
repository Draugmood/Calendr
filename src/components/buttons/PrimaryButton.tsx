interface Props {
  label: string;
  onClick?: () => void;
}

export default function PrimaryButton({ label, onClick }: Props) {
  return (
    <button
      className="border rounded-lg border-solid px-5 py-2.5 text-base text-stone-950 bg-cyan-600 font-medium cursor-pointer transition-colors duration-150 hover:border-slate-100 hover:text-slate-100"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
