import { useCallback, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import { OPENINGS, type OpeningLine } from "../data/openings";
import { useProgress } from "../store/progress";
import { sound } from "../lib/sound";
import { soundForMove } from "../lib/chessUtils";

export default function OpeningsPage() {
  const [selectedLine, setSelectedLine] = useState<OpeningLine>(OPENINGS[0].lines[0]);
  const [stepIndex, setStepIndex] = useState(0); // number of moves played, 0..steps.length
  const [quizMode, setQuizMode] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<"correct" | "wrong" | null>(null);
  const markPracticed = useProgress((s) => s.markOpeningPracticed);

  const gameRef = useRef(new Chess());

  const rebuildToStep = useCallback((line: OpeningLine, n: number) => {
    const g = new Chess();
    for (let i = 0; i < n; i++) g.move(line.steps[i].san);
    gameRef.current = g;
    return g.fen();
  }, []);

  const [fen, setFen] = useState(DEFAULT_POSITION);

  const selectLine = useCallback(
    (line: OpeningLine) => {
      setSelectedLine(line);
      setStepIndex(0);
      setQuizFeedback(null);
      setFen(rebuildToStep(line, 0));
    },
    [rebuildToStep]
  );

  const goToStep = useCallback(
    (n: number) => {
      setStepIndex(n);
      setQuizFeedback(null);
      setFen(rebuildToStep(selectedLine, n));
    },
    [rebuildToStep, selectedLine]
  );

  const handleQuizDrop = useCallback(
    (source: string, target: string) => {
      if (!quizMode || stepIndex >= selectedLine.steps.length) return false;
      const expectedSan = selectedLine.steps[stepIndex].san;
      const g = gameRef.current;
      let move;
      try {
        move = g.move({ from: source, to: target, promotion: "q" });
      } catch {
        return false;
      }
      if (!move) return false;

      if (move.san.replace("+", "").replace("#", "") !== expectedSan.replace("+", "").replace("#", "")) {
        g.undo();
        setFen(g.fen());
        sound.play("wrong");
        setQuizFeedback("wrong");
        return false;
      }

      setQuizFeedback("correct");
      setFen(g.fen());
      const next = stepIndex + 1;
      setStepIndex(next);
      if (next >= selectedLine.steps.length) {
        sound.play("correct");
        markPracticed(selectedLine.id);
      } else {
        sound.play(soundForMove(move, g.isCheck()));
      }
      return true;
    },
    [quizMode, stepIndex, selectedLine, markPracticed]
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 grid md:grid-cols-[260px_1fr_320px] gap-6">
      <div className="space-y-4 max-h-[800px] overflow-y-auto pr-1">
        {OPENINGS.map((family) => (
          <div key={family.id}>
            <h3 className="font-semibold text-sm text-gray-300">{family.name}</h3>
            <p className="text-xs text-gray-500 mb-1">{family.eco}</p>
            <div className="space-y-1">
              {family.lines.map((line) => (
                <button
                  key={line.id}
                  onClick={() => selectLine(line)}
                  className={`block w-full text-left text-sm px-2 py-1 rounded ${
                    selectedLine.id === line.id ? "bg-blue-600" : "hover:bg-[#1a1d24]"
                  }`}
                >
                  {line.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <ChessBoard
          fen={fen}
          orientation="white"
          onPieceDrop={quizMode ? handleQuizDrop : undefined}
          allowDragging={quizMode}
        />
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => goToStep(Math.max(0, stepIndex - 1))}
            disabled={quizMode || stepIndex === 0}
            className="bg-[#1a1d24] border border-gray-700 rounded px-3 py-1 disabled:opacity-40"
          >
            ← Lùi
          </button>
          <button
            onClick={() => goToStep(0)}
            disabled={quizMode}
            className="bg-[#1a1d24] border border-gray-700 rounded px-3 py-1 disabled:opacity-40"
          >
            Về đầu
          </button>
          <button
            onClick={() => goToStep(Math.min(selectedLine.steps.length, stepIndex + 1))}
            disabled={quizMode || stepIndex === selectedLine.steps.length}
            className="bg-[#1a1d24] border border-gray-700 rounded px-3 py-1 disabled:opacity-40"
          >
            Tiến →
          </button>
        </div>
      </div>

      <div className="bg-[#1a1d24] rounded-lg p-4 space-y-4">
        <div>
          <h2 className="font-semibold">{selectedLine.name}</h2>
          <p className="text-xs text-gray-500">ECO {selectedLine.eco}</p>
        </div>

        <button
          onClick={() => {
            setQuizMode((q) => !q);
            setQuizFeedback(null);
            goToStep(0);
          }}
          className={`w-full rounded py-2 font-medium border ${
            quizMode ? "bg-amber-600 border-amber-500" : "bg-[#242832] border-gray-700"
          }`}
        >
          {quizMode ? "Đang luyện tập — tắt" : "🧠 Luyện tập: tự tìm nước đi"}
        </button>

        {quizFeedback === "wrong" && (
          <p className="text-red-400 text-sm font-medium">Chưa đúng, hãy thử nước khác.</p>
        )}
        {quizFeedback === "correct" && stepIndex >= selectedLine.steps.length && (
          <p className="text-green-400 text-sm font-medium">🎉 Hoàn thành biến này!</p>
        )}

        <div className="space-y-2 text-sm max-h-[500px] overflow-y-auto">
          {selectedLine.steps.map((step, i) => (
            <div
              key={i}
              onClick={() => !quizMode && goToStep(i + 1)}
              className={`p-2 rounded cursor-pointer ${
                i === stepIndex - 1 ? "bg-blue-600/30 border border-blue-500" : "hover:bg-[#242832]"
              } ${quizMode && i >= stepIndex ? "opacity-40" : ""}`}
            >
              <span className="font-mono font-semibold mr-2">
                {Math.floor(i / 2) + 1}
                {i % 2 === 0 ? "." : "..."} {step.san}
              </span>
              {step.comment && !quizMode && <p className="text-gray-400 mt-1">{step.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
