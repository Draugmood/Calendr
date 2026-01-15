import Clock from "./components/Clock";
import { HomePage } from "./pages/HomePage";

export default function App() {
  return (
    <div className="max-w-7xl text-center w-screen">
      <HomePage />
      <div className="mr-4">
        <Clock />
      </div>
    </div>
  );
}
