import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import ReminderCenter from "./components/reminders/ReminderCenter";
import ChoresPage from "./components/chores/ChoresPage";

export default function App() {
  return (
    <div className="max-w-7xl text-center w-screen">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reminders" element={<ReminderCenter />} />
        <Route path="/chores" element={<ChoresPage />} />
      </Routes>
    </div>
  );
}
