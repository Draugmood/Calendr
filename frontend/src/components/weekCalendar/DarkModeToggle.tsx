import { useDarkMode } from "@/hooks/useDarkMode";

interface Props {
  className?: string;
}

export default function DarkModeToggle({ className }: Props) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 w-10 h-10 shrink-0 rounded bg-blue-500 text-white shadow-md hover:bg-blue-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors ${className ?? ""}`}
      aria-label={isDarkMode ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      title={isDarkMode ? "Lyst tema" : "Mørkt tema"}
    >
      {isDarkMode ? "☀️" : "🌙"}
    </button>
  );
}
