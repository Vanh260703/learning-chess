export type MoveQuality = "book" | "brilliant" | "best" | "good" | "inaccuracy" | "mistake" | "blunder";

export interface QualityInfo {
  key: MoveQuality;
  label: string; // Vietnamese label shown to the user
  short: string; // 1-2 char badge
  color: string; // tailwind text/bg color token
}

export const QUALITY_INFO: Record<MoveQuality, QualityInfo> = {
  book: { key: "book", label: "Khai cuộc (sách)", short: "📖", color: "#9c7b4f" },
  brilliant: { key: "brilliant", label: "Tuyệt hay", short: "!!", color: "#1abc9c" },
  best: { key: "best", label: "Chính xác", short: "★", color: "#4caf50" },
  good: { key: "good", label: "Tốt", short: "✓", color: "#8bc34a" },
  inaccuracy: { key: "inaccuracy", label: "Thiếu chính xác", short: "?!", color: "#f1c40f" },
  mistake: { key: "mistake", label: "Sai lầm", short: "?", color: "#e67e22" },
  blunder: { key: "blunder", label: "Sai lầm nghiêm trọng", short: "??", color: "#e74c3c" },
};

export interface ClassifyInput {
  /** Engine eval (cp, mover's perspective) of the position before the move was played, assuming best play. */
  evalBeforeCp: number;
  /** Engine eval (cp, mover's perspective) of the position after the move was actually played. */
  evalAfterCp: number;
  /** UCI move the engine considered best from the position before the move. */
  bestMoveUci: string | null;
  /** UCI move that was actually played. */
  playedMoveUci: string;
  /** True if the played move gives up material relative to staying put (a real sacrifice, not just an even trade). */
  isSacrifice: boolean;
}

/** Centipawn-loss thresholds, loosely modeled on chess.com / lichess move-annotation conventions. */
export function classifyMove(input: ClassifyInput): MoveQuality {
  const { evalBeforeCp, evalAfterCp, bestMoveUci, playedMoveUci, isSacrifice } = input;
  const cpLoss = Math.max(0, evalBeforeCp - evalAfterCp);
  const playedBest = bestMoveUci !== null && playedMoveUci === bestMoveUci;

  if (playedBest) {
    // A "brilliant" move: the best move available, it sacrifices material, the position
    // wasn't already a trivial blowout, and the sacrifice still leaves the mover doing fine.
    const positionWasUnclear = Math.abs(evalBeforeCp) < 300;
    const stillOk = evalAfterCp > -50;
    if (isSacrifice && positionWasUnclear && stillOk) return "brilliant";
    return "best";
  }

  if (cpLoss <= 20) return "good";
  if (cpLoss <= 100) return "inaccuracy";
  if (cpLoss <= 250) return "mistake";
  return "blunder";
}
