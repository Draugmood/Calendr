export type Checklist = {
  id: string;
  idCard: string;
  name: string;
  checkItems: ChecklistItem[];
};

type ChecklistItem = {
  id: string;
  name: string;
  state: "complete" | "incomplete";
};
