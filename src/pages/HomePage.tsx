import { Link } from "react-router-dom";
import { useProgress } from "../store/progress";

const CARDS = [
  {
    to: "/puzzles",
    title: "🧩 Giải thế đố",
    desc: "Luyện chiến thuật với hàng trăm thế đố thật từ Lichess, độ khó tự điều chỉnh theo trình độ của bạn.",
  },
  {
    to: "/coach",
    title: "🎓 Đánh với HLV",
    desc: "Chơi một ván với Stockfish. Mỗi nước đi của bạn được chấm: Tuyệt hay, Chính xác, Tốt, Sai lầm, Blunder...",
  },
  {
    to: "/openings",
    title: "📖 Học khai cuộc",
    desc: "Duyệt các khai cuộc phổ biến và biến thể, kèm giải thích ý tưởng từng nước — có chế độ tự luyện tập.",
  },
];

export default function HomePage() {
  const puzzleRating = useProgress((s) => s.puzzleRating);
  const gamesPlayed = useProgress((s) => s.gamesPlayed);
  const solvedCount = useProgress((s) => s.solvedPuzzleIds.length);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Luyện cờ vua cùng Stockfish</h1>
      <p className="text-gray-400 mb-8">
        Giải thế đố, đấu với HLV máy và học khai cuộc — toàn bộ engine chạy ngay trong trình duyệt của bạn.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-[#1a1d24] rounded-lg p-4">
          <p className="text-xs text-gray-500">Rating puzzle</p>
          <p className="text-2xl font-bold">{Math.round(puzzleRating)}</p>
        </div>
        <div className="bg-[#1a1d24] rounded-lg p-4">
          <p className="text-xs text-gray-500">Thế đố đã giải</p>
          <p className="text-2xl font-bold">{solvedCount}</p>
        </div>
        <div className="bg-[#1a1d24] rounded-lg p-4">
          <p className="text-xs text-gray-500">Ván đã đấu</p>
          <p className="text-2xl font-bold">{gamesPlayed}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-[#1a1d24] hover:bg-[#242832] rounded-lg p-5 border border-gray-800 transition-colors"
          >
            <h2 className="text-lg font-semibold mb-2">{c.title}</h2>
            <p className="text-sm text-gray-400">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
