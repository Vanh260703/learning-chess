import { useCallback, useMemo, useRef, useState } from "react";
import { Chess, DEFAULT_POSITION } from "chess.js";
import ChessBoard, { type SquareIcon } from "../components/ChessBoard";
import { getEngine, scoreToCp, DIFFICULTIES, type Difficulty } from "../engine/stockfish";
import { classifyMove, QUALITY_INFO, type MoveQuality } from "../lib/moveClassification";
import {
  isLikelySacrifice,
  soundForMove,
  pieceValue,
  PIECE_GLYPH,
  PIECE_DISPLAY_ORDER,
} from "../lib/chessUtils";
import { useProgress } from "../store/progress";
import { sound } from "../lib/sound";
import { findDeepestOpeningMatch, isStillInBook } from "../lib/openingBook";

interface MoveEntry {
  ply: number;
  color: "w" | "b";
  san: string;
  captured?: string;
  quality?: MoveQuality;
  analyzing?: boolean;
}

/** One player's row of captured-piece trophies, plus a "+N" material lead if they have one. */
function CapturedRow({
  pieces,
  color,
  advantage,
}: {
  pieces: string[];
  color: "white" | "black";
  advantage: number;
}) {
  return (
    <div className="flex items-center gap-0.5 h-7 px-1 text-2xl leading-none text-gray-300">
      {pieces.map((p, i) => (
        <span key={i}>{PIECE_GLYPH[p][color]}</span>
      ))}
      {advantage > 0 && <span className="text-xs font-semibold text-gray-400 ml-1">+{advantage}</span>}
    </div>
  );
}

type Phase = "setup" | "playing" | "over";

export default function CoachPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [difficultyIdx, setDifficultyIdx] = useState(1);

  const gameRef = useRef(new Chess());
  // Bumped whenever the game is reset or a move is taken back, so stale async engine
  // results (a bot reply or a review that was already in flight) get silently dropped
  // instead of corrupting the post-undo state.
  const versionRef = useRef(0);
  const [fen, setFen] = useState(DEFAULT_POSITION);
  const [moves, setMoves] = useState<MoveEntry[]>([]);
  const [botThinking, setBotThinking] = useState(false);
  const [whiteEvalCp, setWhiteEvalCp] = useState(0);
  const [resultText, setResultText] = useState<string | null>(null);
  const [squareIcon, setSquareIcon] = useState<SquareIcon | null>(null);
  const incrementGamesPlayed = useProgress((s) => s.incrementGamesPlayed);
  const boardSize = useProgress((s) => s.boardSize);

  // Two independent engine workers so the bot's own move never has to wait behind the
  // (slower, more thorough) review search that grades the player's move, or vice versa.
  const botEngine = getEngine("coach-bot");
  const reviewEngine = getEngine("coach-review");

  const checkGameOver = useCallback((): boolean => {
    const g = gameRef.current;
    if (!g.isGameOver()) return false;
    let text = "Hoà.";
    if (g.isCheckmate()) {
      const loserIsWhite = g.turn() === "w";
      text = loserIsWhite ? "Đen thắng — chiếu hết!" : "Trắng thắng — chiếu hết!";
      const winnerColor: "white" | "black" = loserIsWhite ? "black" : "white";
      sound.play(winnerColor === playerColor ? "win" : "lose");
    } else {
      if (g.isStalemate()) text = "Hoà do hết nước đi (stalemate).";
      else if (g.isDraw()) text = "Hoà cờ.";
      sound.play("draw");
    }
    setResultText(text);
    setPhase("over");
    incrementGamesPlayed();
    return true;
  }, [incrementGamesPlayed, playerColor]);

  const makeBotMove = useCallback(async (difficulty: Difficulty) => {
    const version = versionRef.current;
    setBotThinking(true);
    const g = gameRef.current;
    const res = await botEngine.analyze(g.fen(), {
      movetimeMs: difficulty.movetimeMs,
      depth: difficulty.depth,
      setupCommands: botEngine.difficultyCommands(difficulty),
    });
    if (version !== versionRef.current) return; // game was reset/undone while thinking
    setBotThinking(false);
    if (!res.bestMove) return;
    const move = g.move({
      from: res.bestMove.slice(0, 2),
      to: res.bestMove.slice(2, 4),
      promotion: res.bestMove[4] ?? "q",
    });
    if (!move) return;
    sound.play(soundForMove(move, g.isCheck()));
    setFen(g.fen());
    setMoves((prev) => [
      ...prev,
      { ply: prev.length, color: move.color, san: move.san, captured: move.captured },
    ]);
    if (checkGameOver()) return;
  }, [botEngine, checkGameOver]);

  /** Grades the player's move in the background on the dedicated review engine — never blocks the bot's reply. */
  const reviewPlayerMove = useCallback(
    async (
      fenBefore: string,
      fenAfter: string,
      move: { to: string; color: "w" | "b"; captured?: string; piece: string },
      playedUci: string,
      moveIndex: number,
      version: number
    ) => {
      const [before, after] = await Promise.all([
        reviewEngine.analyze(fenBefore, { movetimeMs: 500, setupCommands: reviewEngine.fullStrengthCommands }),
        reviewEngine.analyze(fenAfter, { movetimeMs: 500, setupCommands: reviewEngine.fullStrengthCommands }),
      ]);
      if (version !== versionRef.current) return; // that move was taken back before review finished
      const evalBeforeCp = scoreToCp(before.score);
      const evalAfterCp = -scoreToCp(after.score);
      setWhiteEvalCp(move.color === "w" ? evalAfterCp : -evalAfterCp);

      const sac = isLikelySacrifice(move.captured, move.piece, after.bestMove, move.to);
      const quality = classifyMove({
        evalBeforeCp,
        evalAfterCp,
        bestMoveUci: before.bestMove,
        playedMoveUci: playedUci,
        isSacrifice: sac,
      });

      setMoves((prev) => prev.map((m, i) => (i === moveIndex ? { ...m, quality, analyzing: false } : m)));
      setSquareIcon({ square: move.to, glyph: QUALITY_INFO[quality].short, color: QUALITY_INFO[quality].color });
    },
    [reviewEngine]
  );

  const handleDrop = useCallback(
    (source: string, target: string) => {
      const g = gameRef.current;
      const sideToMove = g.turn() === "w" ? "white" : "black";
      if (phase !== "playing" || sideToMove !== playerColor || botThinking) return false;

      const fenBefore = g.fen();
      let move;
      try {
        move = g.move({ from: source, to: target, promotion: "q" });
      } catch {
        return false;
      }
      if (!move) return false;

      sound.play(soundForMove(move, g.isCheck()));
      const fenAfter = g.fen();
      const playedUci = move.from + move.to + (move.promotion ?? "");
      const moveIndex = moves.length;

      // Still following known opening theory? Skip the engine entirely — a book move isn't
      // "good" or "best" in the engine-review sense, it's just the recognized line.
      const sanSoFar = [...moves.map((m) => m.san), move.san];
      const inBook = isStillInBook(sanSoFar);

      setFen(fenAfter);
      setMoves((prev) => [
        ...prev,
        {
          ply: prev.length,
          color: move.color,
          san: move.san,
          captured: move.captured,
          quality: inBook ? "book" : undefined,
          analyzing: !inBook,
        },
      ]);
      setSquareIcon(
        inBook ? { square: move.to, glyph: QUALITY_INFO.book.short, color: QUALITY_INFO.book.color } : null
      );

      const gameEnded = checkGameOver();

      // The bot replies right away on its own engine — it never waits on the review below.
      if (!gameEnded) {
        void makeBotMove(DIFFICULTIES[difficultyIdx]);
      }

      // Grading the move happens in the background on a separate engine/worker — skipped for book moves.
      if (!inBook) {
        void reviewPlayerMove(fenBefore, fenAfter, move, playedUci, moveIndex, versionRef.current);
      }

      return true;
    },
    [phase, playerColor, botThinking, moves, checkGameOver, makeBotMove, difficultyIdx, reviewPlayerMove]
  );

  const undoMove = useCallback(() => {
    if (moves.length === 0 || botThinking) return;
    versionRef.current += 1; // drop any bot reply / review that was already in flight

    const g = gameRef.current;
    const playerIsWhite = playerColor === "white";
    let popped = 0;
    while (g.history().length > 0) {
      g.undo();
      popped++;
      if ((g.turn() === "w") === playerIsWhite) break;
    }

    setMoves((prev) => prev.slice(0, Math.max(0, prev.length - popped)));
    setFen(g.fen());
    setSquareIcon(null);
    setResultText(null);
    setBotThinking(false);
    setPhase("playing");

    if ((g.turn() === "w") !== playerIsWhite && !g.isGameOver()) {
      void makeBotMove(DIFFICULTIES[difficultyIdx]);
    }
  }, [moves.length, botThinking, playerColor, difficultyIdx, makeBotMove]);

  const startGame = useCallback(() => {
    versionRef.current += 1;
    gameRef.current = new Chess();
    setFen(gameRef.current.fen());
    setMoves([]);
    setResultText(null);
    setWhiteEvalCp(0);
    setSquareIcon(null);
    setPhase("playing");
    sound.play("gameStart");
    if (playerColor === "black") {
      setTimeout(() => makeBotMove(DIFFICULTIES[difficultyIdx]), 300);
    }
  }, [playerColor, difficultyIdx, makeBotMove]);

  const { whiteCaptured, blackCaptured, materialDiff } = useMemo(() => {
    const byColor = (color: "w" | "b") =>
      moves
        .filter((m) => m.color === color && m.captured)
        .map((m) => m.captured as string)
        .sort((a, b) => PIECE_DISPLAY_ORDER.indexOf(a) - PIECE_DISPLAY_ORDER.indexOf(b));
    const whiteCaptured = byColor("w");
    const blackCaptured = byColor("b");
    const valueOf = (pieces: string[]) => pieces.reduce((sum, p) => sum + pieceValue(p), 0) / 100;
    return { whiteCaptured, blackCaptured, materialDiff: valueOf(whiteCaptured) - valueOf(blackCaptured) };
  }, [moves]);

  const openingMatch = useMemo(() => findDeepestOpeningMatch(moves.map((m) => m.san)), [moves]);

  if (phase === "setup") {
    return (
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Đánh với HLV</h1>
        <p className="text-gray-400 text-sm">
          Chơi một ván đấu với Stockfish. Sau mỗi nước đi của bạn, HLV sẽ đánh giá chất lượng nước đi:
          Tuyệt hay, Chính xác, Tốt, Thiếu chính xác, Sai lầm hoặc Sai lầm nghiêm trọng.
        </p>

        <div>
          <label className="block text-sm font-medium mb-2">Bạn cầm quân</label>
          <div className="flex gap-2">
            {(["white", "black"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setPlayerColor(c)}
                className={`flex-1 py-2 rounded font-medium border ${
                  playerColor === c ? "bg-blue-600 border-blue-500" : "bg-[#1a1d24] border-gray-700"
                }`}
              >
                {c === "white" ? "Trắng" : "Đen"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Độ khó của HLV</label>
          <div className="space-y-2">
            {DIFFICULTIES.map((d, i) => (
              <button
                key={d.label}
                onClick={() => setDifficultyIdx(i)}
                className={`w-full text-left py-2 px-3 rounded font-medium border ${
                  difficultyIdx === i ? "bg-blue-600 border-blue-500" : "bg-[#1a1d24] border-gray-700"
                }`}
              >
                {d.label} {d.elo ? `(~${d.elo} Elo)` : ""}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startGame} className="w-full bg-green-600 hover:bg-green-500 rounded py-3 font-semibold">
          Bắt đầu ván đấu
        </button>
      </div>
    );
  }

  const evalPct = Math.max(2, Math.min(98, 50 + whiteEvalCp / 20));

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 grid md:grid-cols-[40px_1fr_320px] gap-4">
      <div
        className="hidden md:flex flex-col-reverse rounded overflow-hidden border border-gray-700"
        style={{ height: boardSize }}
      >
        <div className="bg-[#eeeed5] w-full transition-all" style={{ height: `${evalPct}%` }} />
        <div className="bg-[#2a2d34] w-full transition-all" style={{ height: `${100 - evalPct}%` }} />
      </div>

      <div>
        <CapturedRow
          pieces={playerColor === "white" ? blackCaptured : whiteCaptured}
          color={playerColor === "white" ? "white" : "black"}
          advantage={playerColor === "white" ? Math.max(0, -materialDiff) : Math.max(0, materialDiff)}
        />
        <ChessBoard
          fen={fen}
          orientation={playerColor}
          onPieceDrop={handleDrop}
          allowDragging={phase === "playing" && !botThinking}
          squareIcon={squareIcon}
        />
        <CapturedRow
          pieces={playerColor === "white" ? whiteCaptured : blackCaptured}
          color={playerColor === "white" ? "black" : "white"}
          advantage={playerColor === "white" ? Math.max(0, materialDiff) : Math.max(0, -materialDiff)}
        />
        {botThinking && <p className="text-center text-sm text-gray-400 mt-2">HLV đang suy nghĩ…</p>}
        {resultText && (
          <div className="mt-4 bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
            <p className="font-semibold">{resultText}</p>
          </div>
        )}
      </div>

      <div className="bg-[#1a1d24] rounded-lg p-4 flex flex-col" style={{ height: Math.max(boardSize, 420) }}>
        <h3 className="font-semibold mb-2">Nhật ký nước đi</h3>
        {openingMatch && (
          <div className="mb-3 bg-[#242832] border border-gray-700 rounded px-3 py-2">
            <p className="text-xs text-gray-500">
              📖 Khai cuộc <span className="text-gray-600">({openingMatch.eco})</span>
            </p>
            <p className="text-sm font-medium text-amber-200">
              {openingMatch.family}
              {openingMatch.line !== openingMatch.family && (
                <span className="text-gray-400"> — {openingMatch.line}</span>
              )}
            </p>
          </div>
        )}
        <p className="text-xs text-gray-500 mb-3">
          Icon đánh giá nước đi vừa chơi hiện ngay trên ô cờ, ở góc trên-phải.
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4 text-[11px]">
          {Object.values(QUALITY_INFO).map((q) => (
            <span key={q.key} className="flex items-center gap-1 text-gray-400">
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-white"
                style={{ backgroundColor: q.color, fontSize: 9 }}
              >
                {q.short}
              </span>
              {q.label}
            </span>
          ))}
        </div>
        <ol className="flex-1 overflow-y-auto space-y-1 text-sm">
          {moves.map((m, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-gray-400 w-6">{Math.floor(i / 2) + 1}{m.color === "w" ? "." : "..."}</span>
              <span
                className="flex-1 font-mono"
                title={m.quality ? QUALITY_INFO[m.quality].label : undefined}
              >
                {m.san}
              </span>
              {m.analyzing && <span className="text-gray-500 text-xs">đang xét…</span>}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2 pt-4 mt-2 border-t border-gray-800">
          <button
            onClick={undoMove}
            disabled={moves.length === 0 || botThinking}
            className="flex-1 bg-[#242832] hover:bg-[#2d323d] border border-gray-700 rounded px-3 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↩ Đi lại
          </button>
          <button
            onClick={startGame}
            className="flex-1 bg-[#242832] hover:bg-[#2d323d] border border-gray-700 rounded px-3 py-2 text-sm font-medium"
          >
            Ván mới
          </button>
        </div>
      </div>
    </div>
  );
}
