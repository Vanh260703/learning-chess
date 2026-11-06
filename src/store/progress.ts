import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProgressState {
  solvedPuzzleIds: string[];
  failedPuzzleIds: string[];
  puzzleRating: number;
  gamesPlayed: number;
  openingsPracticed: string[];
  soundEnabled: boolean;
  /** Preferred chess board size in pixels, shared across all pages, adjustable via the resize handle. */
  boardSize: number;
  markPuzzleSolved: (id: string, puzzleRating: number) => void;
  markPuzzleFailed: (id: string, puzzleRating: number) => void;
  incrementGamesPlayed: () => void;
  markOpeningPracticed: (lineId: string) => void;
  toggleSound: () => void;
  setBoardSize: (px: number) => void;
}

export const BOARD_SIZE_MIN = 320;
export const BOARD_SIZE_MAX = 1100;
export const BOARD_SIZE_DEFAULT = 640;

// Simple Elo-ish update: move 1/16th of the way toward the puzzle's rating.
function updateRating(current: number, puzzleRating: number, won: boolean): number {
  const k = 24;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - current) / 400));
  const score = won ? 1 : 0;
  return Math.round(current + k * (score - expected));
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      solvedPuzzleIds: [],
      failedPuzzleIds: [],
      puzzleRating: 1200,
      gamesPlayed: 0,
      openingsPracticed: [],
      soundEnabled: true,
      boardSize: BOARD_SIZE_DEFAULT,
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      setBoardSize: (px) =>
        set({ boardSize: Math.round(Math.min(BOARD_SIZE_MAX, Math.max(BOARD_SIZE_MIN, px))) }),
      markPuzzleSolved: (id, puzzleRating) =>
        set({
          solvedPuzzleIds: [...new Set([...get().solvedPuzzleIds, id])],
          puzzleRating: updateRating(get().puzzleRating, puzzleRating, true),
        }),
      markPuzzleFailed: (id, puzzleRating) =>
        set({
          failedPuzzleIds: [...new Set([...get().failedPuzzleIds, id])],
          puzzleRating: updateRating(get().puzzleRating, puzzleRating, false),
        }),
      incrementGamesPlayed: () => set({ gamesPlayed: get().gamesPlayed + 1 }),
      markOpeningPracticed: (lineId) =>
        set({ openingsPracticed: [...new Set([...get().openingsPracticed, lineId])] }),
    }),
    { name: "chess-trainer-progress" }
  )
);
