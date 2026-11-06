import { OPENINGS } from "../data/openings";

function normalizeSan(san: string): string {
  return san.replace("+", "").replace("#", "");
}

export interface OpeningMatch {
  family: string;
  line: string;
  eco: string;
  /** Number of leading moves (both colors, ply count) shared with this line. */
  depth: number;
}

/**
 * Finds the longest prefix of `playedSan` (in order, starting from move 1) that matches some
 * known opening line. Since this only ever compares leading moves, the result is stable as more
 * moves are appended — once the game diverges from every known line, the depth and matched
 * line/family stop changing, which is exactly the "book" cutoff point for the rest of the game.
 */
export function findDeepestOpeningMatch(playedSan: string[]): OpeningMatch | null {
  let best: OpeningMatch | null = null;
  for (const family of OPENINGS) {
    for (const line of family.lines) {
      const n = Math.min(line.steps.length, playedSan.length);
      let depth = 0;
      for (let i = 0; i < n; i++) {
        if (normalizeSan(line.steps[i].san) !== normalizeSan(playedSan[i])) break;
        depth++;
      }
      if (depth > 0 && (!best || depth > best.depth)) {
        best = { family: family.name, line: line.name, eco: line.eco, depth };
      }
    }
  }
  return best;
}

/** True if `playedSan` (the full move list so far) is still an exact prefix of a known opening line. */
export function isStillInBook(playedSan: string[]): boolean {
  const match = findDeepestOpeningMatch(playedSan);
  return match !== null && match.depth === playedSan.length;
}
