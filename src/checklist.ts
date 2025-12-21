export interface Checklist {
    id: string;
    name: string;
    idBoard: string;
    idCard: string;
    pos: number;
    checkItems: CheckItem[];
}

export interface CheckItem {
    id: string;
    name: string;
    nameData: {
        emoji: Record<string, any>
    };
    pos: number;
    state: 'incomplete' | 'complete';
    due: string | null;
    dueReminder: string | null;
    idMember: string | null;
    idChecklist: string;
}