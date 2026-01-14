import { CHECKLIST_CONFIG } from "@/config/checklists";
import TodoList from "./TodoList";

export default function TaskLists() {
  return (
    <div className="flex w-full justify-evenly">
      <TodoList
        checklistId={CHECKLIST_CONFIG.TODO.id}
        qrCodeImage={CHECKLIST_CONFIG.TODO.qrCodeImagePath}
      />
      <TodoList
        checklistId={CHECKLIST_CONFIG.DINNER.id}
        qrCodeImage={CHECKLIST_CONFIG.DINNER.qrCodeImagePath}
      />
    </div>
  );
}
