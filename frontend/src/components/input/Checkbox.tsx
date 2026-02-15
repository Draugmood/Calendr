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
        <div
          className="flex-1 overflow-hidden min-w-0 @container"
          title={label}
        >
          <div
            className={[
              "whitespace-nowrap w-fit animate-scroll-peek",
              "text-lg leading-snug group-hover:text-gray-100",
              "transition-colors select-none text-nowrap",
              checked
                ? "line-through text-gray-500"
                : "text-gray-900 dark:text-gray-300",
            ].join(" ")}
          >
            {label}
          </div>
        </div>
      )}
    </label>
  );
}
