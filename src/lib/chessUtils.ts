import type { SoundName } from "./sound";

const PIECE_VALUES: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

export function pieceValue(type: string | undefined): number {
  if (!type) return 0;
  return PIECE_VALUES[type.toLowerCase()] ?? 0;
}

/**
 * Heuristic sacrifice check: did the played move leave a piece on its destination square that the
 * opponent's best reply simply captures for more value than the mover gained from their own move?
 */
export function isLikelySacrifice(
  playedMoveCapturedType: string | undefined,
  movedPieceType: string,
  opponentBestReplyUci: string | null,
  playedMoveTo: string
): boolean {
  if (!opponentBestReplyUci) return false;
  const replyTo = opponentBestReplyUci.slice(2, 4);
  if (replyTo !== playedMoveTo) return false;
  const gained = pieceValue(playedMoveCapturedType);
  const lost = pieceValue(movedPieceType);
  return lost - gained >= 150; // net material given up, not just an even trade
}

/** Unicode glyphs for a captured piece, keyed by the color it belonged to (not the capturer). */
export const PIECE_GLYPH: Record<string, { white: string; black: string }> = {
  p: { white: "♙", black: "♟" },
  n: { white: "♘", black: "♞" },
  b: { white: "♗", black: "♝" },
  r: { white: "♖", black: "♜" },
  q: { white: "♕", black: "♛" },
};

/** Display order for a row of captured pieces: pawns first, queens last. */
export const PIECE_DISPLAY_ORDER = ["p", "n", "b", "r", "q"];

interface MoveLike {
  captured?: string;
  promotion?: string;
  flags: string;
}

/** Picks the chess.com-style sound effect for a move: check overrides capture/castle/promote/plain. */
export function soundForMove(move: MoveLike, resultsInCheck: boolean): SoundName {
  if (resultsInCheck) return "check";
  if (move.flags.includes("k") || move.flags.includes("q")) return "castle";
  if (move.promotion) return "promote";
  if (move.captured) return "capture";
  return "move";
}
