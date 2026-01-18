interface Props {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

export default function Checkbox({
  checked,
  onChange,
  label,
  className,
}: Props) {
  return (
    <label
      className={`flex items-start gap-3 cursor-pointer group ${className}`}
    >
      <div className="relative flex items-center pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="
            peer appearance-none w-5 h-5 
            border border-gray-600 rounded 
            bg-transparent 
            checked:bg-transparent checked:border-gray-400
            hover:border-gray-500 transition-colors
          "
        />
        <span
          className="
            material-symbols-outlined absolute text-gray-300
            opacity-0 peer-checked:opacity-100 top-0.5 left-0 pointer-events-none
          "
          style={{ fontSize: "1.25rem" }}
        >
          check
        </span>
      </div>
      {label && (
        <span
          className={[
            "text-gray-300 text-lg leading-snug group-hover:text-gray-100 transition-colors select-none",
            checked
              ? "line-through text-gray-500"
              : "text-gray-900 dark:text-gray-300",
          ].join(" ")}
        >
          {label}
        </span>
      )}
    </label>
  );
}
