import AppBar from "@/components/appBar/AppBar";
import WeekCalendar from "../components/weekCalendar/WeekCalendar";
import TaskLists from "@/components/taskLists/TaskLists";

export function HomePage() {
  return (
    <>
      <AppBar />
      <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-4  rounded-lg shadow-lg  max-w-7xl">
        <WeekCalendar />
        <TaskLists />
      </div>
    </>
  );
}
