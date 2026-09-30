import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import ReminderCenter from "./components/reminders/ReminderCenter";
import ChoresPage from "./components/chores/ChoresPage";
import KeyboardProvider from "./components/keyboard/KeyboardProvider";

export default function App() {
  return (
    <KeyboardProvider>
      <div className="max-w-7xl text-center w-screen pb-(--osk-offset)">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/reminders" element={<ReminderCenter />} />
          <Route path="/chores" element={<ChoresPage />} />
        </Routes>
      </div>
    </KeyboardProvider>
  );
}
