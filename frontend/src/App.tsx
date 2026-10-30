import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import ReminderCenter from "./components/reminders/ReminderCenter";
import ChoresPage from "./components/chores/ChoresPage";
import SuggestionsPage from "./components/suggestions/SuggestionsPage";
import StoragePage from "./components/storage/StoragePage";
import LocationRoute from "./components/storage/LocationPage";
import KeyboardProvider from "./components/keyboard/KeyboardProvider";
import SeasonalDecorations from "./components/seasonal/SeasonalDecorations";
import { SeasonProvider } from "./contexts/SeasonContext";

export default function App() {
  return (
    <SeasonProvider>
      <KeyboardProvider>
        <div className="max-w-7xl text-center w-screen pb-(--osk-offset)">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/reminders" element={<ReminderCenter />} />
            <Route path="/chores" element={<ChoresPage />} />
            <Route path="/suggestions" element={<SuggestionsPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/b/:id" element={<LocationRoute />} />
          </Routes>
        </div>
        <SeasonalDecorations />
      </KeyboardProvider>
    </SeasonProvider>
  );
}
