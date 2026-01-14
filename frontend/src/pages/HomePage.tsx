import WeekCalendar from "../components/weekCalendar/WeekCalendar";
import TaskLists from "@/components/taskLists/TaskLists";

export function HomePage() {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-4 my-8 rounded-lg shadow-lg  max-w-7xl">
      <WeekCalendar />
      <TaskLists />
    </div>
  );
}
