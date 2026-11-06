import { NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PuzzlesPage from "./pages/PuzzlesPage";
import CoachPage from "./pages/CoachPage";
import OpeningsPage from "./pages/OpeningsPage";
import { useProgress } from "./store/progress";

const LINKS = [
  { to: "/", label: "Trang chủ" },
  { to: "/puzzles", label: "Thế đố" },
  { to: "/coach", label: "Đánh với HLV" },
  { to: "/openings", label: "Khai cuộc" },
];

export default function App() {
  const soundEnabled = useProgress((s) => s.soundEnabled);
  const toggleSound = useProgress((s) => s.toggleSound);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 bg-[#14161b]">
        <nav className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
          <span className="font-bold mr-4">♞ ChessTrainer</span>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm font-medium ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-[#1a1d24]"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            className="ml-auto text-lg px-2 py-1 rounded hover:bg-[#1a1d24]"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </nav>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/puzzles" element={<PuzzlesPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/openings" element={<OpeningsPage />} />
        </Routes>
      </main>
    </div>
  );
}
