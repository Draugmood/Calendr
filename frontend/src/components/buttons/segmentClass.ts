export function segmentClass(isActive: boolean): string {
  return `rounded px-3 py-1.5 text-sm font-medium cursor-pointer transition-colors ${
    isActive
      ? "bg-cyan-600 text-stone-950"
      : "bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700"
  }`;
}
