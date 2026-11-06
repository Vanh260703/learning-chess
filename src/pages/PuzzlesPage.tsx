import { useCallback, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import puzzlesData from "../data/puzzles.json";
import type { Puzzle } from "../types/puzzle";
import { useProgress } from "../store/progress";
import { sound } from "../lib/sound";
import { soundForMove } from "../lib/chessUtils";

const PUZZLES = puzzlesData as Puzzle[];

type Status = "playing" | "solved" | "failed";

function pickPuzzle(targetRating: number, excludeIds: Set<string>): Puzzle {
  const pool = PUZZLES.filter((p) => !excludeIds.has(p.id));
  const candidates = pool.length > 0 ? pool : PUZZLES;
  const sorted = [...candidates].sort(
    (a, b) => Math.abs(a.rating - targetRating) - Math.abs(b.rating - targetRating)
  );
  // add a little randomness among the closest matches so it's not always the same order
  const top = sorted.slice(0, 8);
  return top[Math.floor(Math.random() * top.length)];
}

export default function PuzzlesPage() {
  const puzzleRating = useProgress((s) => s.puzzleRating);
  const markSolved = useProgress((s) => s.markPuzzleSolved);
  const markFailed = useProgress((s) => s.markPuzzleFailed);

  const [puzzle, setPuzzle] = useState<Puzzle>(() => pickPuzzle(puzzleRating, new Set()));
  const seenRef = useRef<Set<string>>(new Set([puzzle.id]));
  const gameRef = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<Status>("playing");
  const [hint, setHint] = useState<string | null>(null);
  const [solvedCount, setSolvedCount] = useState(0);
  const [attempted, setAttempted] = useState(0);

  const solverColor = useMemo(() => (puzzle.fen.split(" ")[1] === "w" ? "white" : "black"), [puzzle]);

  const loadPuzzle = useCallback((p: Puzzle) => {
    seenRef.current.add(p.id);
    gameRef.current = new Chess(p.fen);
    setPuzzle(p);
    setFen(p.fen);
    setMoveIndex(0);
    setStatus("playing");
    setHint(null);
  }, []);

  const nextPuzzle = useCallback(() => {
    loadPuzzle(pickPuzzle(useProgress.getState().puzzleRating, seenRef.current));
  }, [loadPuzzle]);

  const playOpponentReply = useCallback((uci: string) => {
    const game = gameRef.current;
    const move = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
    if (move) sound.play(soundForMove(move, game.isCheck()));
    setFen(game.fen());
  }, []);

  const handleDrop = useCallback(
    (source: string, target: string) => {
      if (status !== "playing") return false;
      const game = gameRef.current;
      const expectedUci = puzzle.moves[moveIndex];
      let move;
      try {
        move = game.move({ from: source, to: target, promotion: "q" });
      } catch {
        return false;
      }
      if (!move) return false;

      const expectedBase = expectedUci.slice(0, 4);
      const isCorrect = move.from + move.to === expectedBase;

      if (!isCorrect) {
        game.undo();
        setFen(game.fen());
        sound.play("wrong");
        setStatus("failed");
        setAttempted((n) => n + 1);
        markFailed(puzzle.id, puzzle.rating);
        return false;
      }

      setFen(game.fen());
      setHint(null);
      const nextIndex = moveIndex + 1;

      if (nextIndex >= puzzle.moves.length) {
        sound.play("correct");
        setStatus("solved");
        setSolvedCount((n) => n + 1);
        setAttempted((n) => n + 1);
        markSolved(puzzle.id, puzzle.rating);
        setMoveIndex(nextIndex);
        return true;
      }

      sound.play(soundForMove(move, game.isCheck()));
      // opponent's forced reply, played automatically after a short beat
      const replyUci = puzzle.moves[nextIndex];
      setMoveIndex(nextIndex + 1);
      setTimeout(() => playOpponentReply(replyUci), 300);
      return true;
    },
    [moveIndex, puzzle, status, markFailed, markSolved, playOpponentReply]
  );

  const showHint = useCallback(() => {
    const expected = puzzle.moves[moveIndex];
    setHint(expected.slice(0, 2));
  }, [puzzle, moveIndex]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (hint) {
      styles[hint] = { boxShadow: "inset 0 0 0 4px #f1c40f" };
    }
    return styles;
  }, [hint]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 grid md:grid-cols-[1fr_320px] gap-6">
      <div>
        <ChessBoard
          fen={fen}
          orientation={solverColor}
          onPieceDrop={handleDrop}
          squareStyles={squareStyles}
          allowDragging={status === "playing"}
        />
      </div>

      <div className="space-y-4">
        <div className="bg-[#1a1d24] rounded-lg p-4 space-y-2">
          <h2 className="text-lg font-semibold">Giải thế đố</h2>
          <p className="text-sm text-gray-400">
            Rating puzzle của bạn: <span className="text-white font-semibold">{Math.round(puzzleRating)}</span>
          </p>
          <p className="text-sm text-gray-400">
            Đã giải: {solvedCount}/{attempted}
          </p>
          <p className="text-sm text-gray-400">
            Độ khó bài này: <span className="text-white">{puzzle.rating}</span>
            {puzzle.isMate && <span className="ml-2 text-amber-400">Chiếu hết trong {puzzle.mateIn}</span>}
          </p>
          <p className="text-sm">
            {solverColor === "white" ? "Trắng" : "Đen"} đi và tìm nước tốt nhất.
          </p>
        </div>

        {status === "solved" && (
          <div className="bg-green-900/40 border border-green-600 rounded-lg p-4 space-y-3">
            <p className="font-semibold text-green-400">✓ Chính xác! Bạn đã giải được thế đố.</p>
            <button
              onClick={nextPuzzle}
              className="w-full bg-green-600 hover:bg-green-500 rounded py-2 font-medium"
            >
              Thế đố tiếp theo →
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="bg-red-900/40 border border-red-600 rounded-lg p-4 space-y-3">
            <p className="font-semibold text-red-400">✗ Chưa đúng. Đây không phải nước tốt nhất.</p>
            <button
              onClick={() => loadPuzzle(puzzle)}
              className="w-full bg-gray-700 hover:bg-gray-600 rounded py-2 font-medium"
            >
              Thử lại
            </button>
            <button
              onClick={nextPuzzle}
              className="w-full bg-blue-600 hover:bg-blue-500 rounded py-2 font-medium"
            >
              Bỏ qua, thế đố khác →
            </button>
          </div>
        )}

        {status === "playing" && (
          <button
            onClick={showHint}
            className="w-full bg-[#1a1d24] hover:bg-[#242832] rounded-lg py-2 font-medium border border-gray-700"
          >
            💡 Gợi ý
          </button>
        )}
      </div>
    </div>
  );
}
