// Thin wrapper around the Stockfish 19 (lite, single-threaded) WASM build.
// The engine speaks plain UCI text over postMessage inside a Web Worker.

export type EngineScore =
  | { type: "cp"; value: number } // centipawns, from the side-to-move's perspective
  | { type: "mate"; value: number }; // moves to mate, from the side-to-move's perspective (negative = being mated)

export interface AnalysisResult {
  bestMove: string | null; // UCI move, e.g. "e2e4"
  ponder: string | null;
  score: EngineScore | null;
  depth: number;
  pv: string[];
}

export interface AnalyzeOptions {
  depth?: number;
  movetimeMs?: number;
  multiPv?: number;
  onInfo?: (partial: AnalysisResult) => void;
  /** UCI setoption commands to apply right before this search, while the engine lock is held. */
  setupCommands?: string[];
}

export interface Difficulty {
  label: string;
  limitStrength: boolean;
  elo?: number;
  movetimeMs: number;
  depth?: number;
}

export const DIFFICULTIES: Difficulty[] = [
  { label: "Mới tập", limitStrength: true, elo: 1320, movetimeMs: 500 },
  { label: "Trung bình", limitStrength: true, elo: 1600, movetimeMs: 700 },
  { label: "Khá giỏi", limitStrength: true, elo: 2000, movetimeMs: 900 },
  { label: "Nâng cao", limitStrength: true, elo: 2600, movetimeMs: 1200 },
  { label: "Cao thủ (engine đầy đủ)", limitStrength: false, movetimeMs: 1800, depth: 16 },
];

function parseScore(tokens: string[], i: number): [EngineScore | null, number] {
  const kind = tokens[i + 1];
  const value = Number(tokens[i + 2]);
  if (kind === "cp") return [{ type: "cp", value }, i + 3];
  if (kind === "mate") return [{ type: "mate", value }, i + 3];
  return [null, i + 1];
}

function parseInfoLine(line: string): Partial<AnalysisResult> | null {
  if (!line.startsWith("info")) return null;
  const tokens = line.split(/\s+/);
  const result: Partial<AnalysisResult> = {};
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === "depth") {
      result.depth = Number(tokens[i + 1]);
      i++;
    } else if (tok === "score") {
      const [score, next] = parseScore(tokens, i);
      result.score = score;
      i = next - 1;
    } else if (tok === "pv") {
      result.pv = tokens.slice(i + 1);
      break;
    }
  }
  return result;
}

export class StockfishEngine {
  private worker: Worker;
  private readyPromise: Promise<void>;
  private busy = false;
  private queue: Array<() => void> = [];

  constructor() {
    this.worker = new Worker("/engine/stockfish-19-lite-single.js");
    this.readyPromise = new Promise((resolve) => {
      const onReady = (ev: MessageEvent<string>) => {
        if (ev.data === "readyok") {
          this.worker.removeEventListener("message", onReady);
          resolve();
        }
      };
      this.worker.addEventListener("message", onReady);
      this.worker.postMessage("uci");
      this.worker.postMessage("isready");
    });
  }

  async ready(): Promise<void> {
    return this.readyPromise;
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    if (this.busy) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.busy = true;
    try {
      return await fn();
    } finally {
      this.busy = false;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  setOption(name: string, value: string | number | boolean) {
    this.worker.postMessage(`setoption name ${name} value ${value}`);
  }

  difficultyCommands(d: Difficulty): string[] {
    const cmds = [`setoption name UCI_LimitStrength value ${d.limitStrength}`];
    if (d.limitStrength && d.elo) cmds.push(`setoption name UCI_Elo value ${d.elo}`);
    return cmds;
  }

  readonly fullStrengthCommands = ["setoption name UCI_LimitStrength value false"];

  stop() {
    this.worker.postMessage("stop");
  }

  terminate() {
    this.worker.terminate();
  }

  async analyze(fen: string, opts: AnalyzeOptions = {}): Promise<AnalysisResult> {
    await this.ready();
    return this.withLock(
      () =>
        new Promise<AnalysisResult>((resolve) => {
          const result: AnalysisResult = { bestMove: null, ponder: null, score: null, depth: 0, pv: [] };

          const onMessage = (ev: MessageEvent<string>) => {
            const line: string = ev.data;
            if (line.startsWith("info") && line.includes(" pv ")) {
              const partial = parseInfoLine(line);
              if (partial) {
                if (partial.depth !== undefined) result.depth = partial.depth;
                if (partial.score !== undefined) result.score = partial.score;
                if (partial.pv !== undefined) result.pv = partial.pv;
                opts.onInfo?.({ ...result });
              }
            } else if (line.startsWith("bestmove")) {
              const parts = line.split(/\s+/);
              result.bestMove = parts[1] === "(none)" ? null : parts[1];
              result.ponder = parts[3] ?? null;
              this.worker.removeEventListener("message", onMessage);
              resolve(result);
            }
          };

          this.worker.addEventListener("message", onMessage);
          for (const cmd of opts.setupCommands ?? []) this.worker.postMessage(cmd);
          this.worker.postMessage(`position fen ${fen}`);
          if (opts.multiPv) this.setOption("MultiPV", opts.multiPv);
          const goCmd = opts.movetimeMs
            ? `go movetime ${opts.movetimeMs}`
            : `go depth ${opts.depth ?? 14}`;
          this.worker.postMessage(goCmd);
        })
    );
  }
}

// Named instances, each backed by its own Worker. Using separate instances for separate
// concerns (e.g. "the bot's own move" vs. "reviewing the player's move") lets those searches
// run truly in parallel instead of queueing behind each other on a single shared worker.
const instances = new Map<string, StockfishEngine>();
export function getEngine(key = "default"): StockfishEngine {
  let instance = instances.get(key);
  if (!instance) {
    instance = new StockfishEngine();
    instances.set(key, instance);
  }
  return instance;
}

/** Converts a score to centipawns from the side-to-move's perspective, for easy comparison. Mate scores become large magnitudes. */
export function scoreToCp(score: EngineScore | null): number {
  if (!score) return 0;
  if (score.type === "cp") return score.value;
  // Mate in N: huge value, sign preserved, closer mates score higher.
  const sign = score.value > 0 ? 1 : -1;
  return sign * (100000 - Math.abs(score.value) * 100);
}
