export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // full UCI solution line, solver plays indices 0,2,4,...
  rating: number;
  isMate: boolean;
  mateIn: number | null;
}
