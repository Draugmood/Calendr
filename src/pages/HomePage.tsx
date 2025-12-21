import WeekCalendar from "../components/weekCalendar/WeekCalendar";

export function HomePage() {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-gray-800 p-4 my-8 rounded-lg shadow-lg w-full max-w-7xl">
      <WeekCalendar />
    </div>
  );
}
