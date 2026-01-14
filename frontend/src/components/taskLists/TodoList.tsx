import { useTrelloChecklist } from "@/hooks/useTrelloChecklist";
import { useMemo } from "react";
import QrCodeButton from "../buttons/QrCodeButton";

interface Props {
  checklistId?: string;
  qrCodeImage?: string;
}

export default function TodoList({ checklistId, qrCodeImage }: Props) {
  const { checklist, errorMessage, isLoading, updateChecklistItem } =
    useTrelloChecklist(checklistId);

  const sortedItems = useMemo(() => {
    if (!checklist) return [];

    // Create a copy so we don't mutate the original state
    const items = [...(checklist.checkItems ?? [])].reverse();

    items.sort((a, b) => {
      // Incomplete items come first (return -1), Complete items go to bottom (return 1)
      if (a.state === "complete" && b.state === "incomplete") return 1;
      if (a.state === "incomplete" && b.state === "complete") return -1;
      return 0;
    });

    return items;
  }, [checklist]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-l-2">
          ?
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return <div className="text-red-500 p-4">Error: {errorMessage}</div>;
  }

  if (!checklist) {
    return <div className="p-4 text-gray-400">Loading checklist...</div>;
  }

  console.log(qrCodeImage);

  return (
    <div className="mt-4">
      <div className="border border-gray-600 rounded-lg p-4 w-full max-w-md ">
        <div className="grid grid-cols-3 justify-items-stretch items-center mb-4">
          <div />
          <h2 className="text-2xl font-bold">{checklist?.name}</h2>
          {qrCodeImage ? (
            <div className="flex flex-row-reverse">
              <QrCodeButton qrCodeImage={qrCodeImage} />
            </div>
          ) : (
            <div>blæ</div>
          )}
        </div>
        <ul className="w-full max-w-md max-h-80 space-y-2 overflow-y-auto pr-4">
          {sortedItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-left space-x-3"
            >
              <input
                id={`item-${item.id}`}
                type="checkbox"
                checked={item.state === "complete"}
                onChange={() =>
                  updateChecklistItem(
                    checklist?.idCard,
                    item.id,
                    item.state === "complete" ? "incomplete" : "complete",
                  )
                }
                className="h-5 w-5 min-w-5 cursor-pointer accent-blue-500"
              />
              <label
                htmlFor={`item-${item.id}`}
                className={[
                  "text-lg cursor-pointer select-none text-nowrap text-left overflow-hidden",
                  item.state === "complete"
                    ? "text-gray-500 line-through"
                    : "text-gray-900 dark:text-gray-100",
                ].join(" ")}
              >
                {item.name}
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
