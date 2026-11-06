import { useCallback, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard, type Arrow, type SquareRenderer } from "react-chessboard";
import { useProgress, BOARD_SIZE_MIN, BOARD_SIZE_MAX } from "../store/progress";

export interface SquareIcon {
  square: string;
  glyph: string;
  color: string;
}

interface ChessBoardProps {
  fen: string;
  orientation?: "white" | "black";
  onPieceDrop?: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  squareStyles?: Record<string, React.CSSProperties>;
  arrows?: Arrow[];
  allowDragging?: boolean;
  /** Small badge drawn on top of one square, e.g. a move-quality icon on the just-played square. */
  squareIcon?: SquareIcon | null;
}

export default function ChessBoard({
  fen,
  orientation = "white",
  onPieceDrop,
  squareStyles,
  arrows,
  allowDragging = true,
  squareIcon,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<Record<string, boolean>>({});
  const [lastFen, setLastFen] = useState(fen);

  const boardSize = useProgress((s) => s.boardSize);
  const setStoredBoardSize = useProgress((s) => s.setBoardSize);
  const [size, setSize] = useState(boardSize);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; size: number } | null>(null);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setResizeStart({ x: e.clientX, y: e.clientY, size });
  }, [size]);

  const moveResize = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeStart) return;
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      // Whichever axis moved further drives the resize, with its full (unhalved) distance — so
      // dragging purely sideways or purely up/down is just as responsive as a diagonal drag,
      // instead of averaging the two and making a single-axis drag feel like it does half as much.
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      setSize(Math.min(BOARD_SIZE_MAX, Math.max(BOARD_SIZE_MIN, resizeStart.size + delta)));
    },
    [resizeStart]
  );

  const endResize = useCallback(() => {
    if (!resizeStart) return;
    setResizeStart(null);
    setStoredBoardSize(size);
  }, [resizeStart, size, setStoredBoardSize]);

  // The position changes whenever a move lands (ours or the opponent's) — drop any pending
  // selection. Adjusted during render (not an effect) to avoid an extra render pass.
  if (fen !== lastFen) {
    setLastFen(fen);
    setSelectedSquare(null);
    setLegalTargets({});
  }

  const selectSquare = useCallback(
    (square: string) => {
      const chess = new Chess(fen);
      const legal = chess.moves({ square: square as Square, verbose: true });
      if (legal.length === 0) {
        setSelectedSquare(null);
        setLegalTargets({});
        return;
      }
      setSelectedSquare(square);
      const targets: Record<string, boolean> = {};
      for (const m of legal) targets[m.to] = Boolean(m.captured) || m.flags.includes("e");
      setLegalTargets(targets);
    },
    [fen]
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!allowDragging) return;

      if (selectedSquare && square in legalTargets) {
        const chess = new Chess(fen);
        const piece = chess.get(selectedSquare as Square);
        const pieceType = piece ? `${piece.color}${piece.type.toUpperCase()}` : "";
        setSelectedSquare(null);
        setLegalTargets({});
        onPieceDrop?.(selectedSquare, square, pieceType);
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        setLegalTargets({});
        return;
      }

      selectSquare(square);
    },
    [allowDragging, selectedSquare, legalTargets, fen, onPieceDrop, selectSquare]
  );

  // Rendering a wrapper <div> for every one of the 64 squares (plus several more conditionally
  // rendered overlay divs) is cheap in isolation, but react-chessboard re-invokes this renderer
  // for every square on every internal state change it makes (picking up a piece, hovering a
  // square while dragging, settling after a drop, …) — not just on our own re-renders. For the
  // overwhelming majority of those calls nothing needs to be drawn on top of the square, so we
  // skip the wrapper (and chess.js/object-allocation work) entirely and hand back the square's
  // own content unchanged. This keeps drag/drop and click-to-move responsive instead of doing
  // 64x the DOM work on every pointer event.
  const squareRenderer: SquareRenderer = useCallback(
    ({ square, piece, children }) => {
      const extraStyle = squareStyles?.[square];
      const isSelected = square === selectedSquare;
      const isTarget = square in legalTargets;
      const hasIcon = squareIcon?.square === square;

      if (!extraStyle && !isSelected && !isTarget && !hasIcon) {
        return <>{children}</>;
      }

      return (
        <div style={{ position: "relative", width: "100%", height: "100%", ...extraStyle }}>
          {children}
          {isSelected && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255, 221, 0, 0.45)",
                pointerEvents: "none",
              }}
            />
          )}
          {isTarget &&
            (legalTargets[square] || piece ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.35)",
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "32%",
                  height: "32%",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                }}
              />
            ))}
          {hasIcon && squareIcon && (
            <div
              style={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: squareIcon.color,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              {squareIcon.glyph}
            </div>
          )}
        </div>
      );
    },
    [selectedSquare, legalTargets, squareIcon, squareStyles]
  );

  return (
    <div
      className="relative mx-auto rounded-lg overflow-hidden shadow-2xl shadow-black/40"
      style={{ width: size, maxWidth: "100%", aspectRatio: "1 / 1" }}
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging,
          // The library's default (1px) treats almost any real mouse click as a tiny drag —
          // the pointer nearly always moves a pixel or two between mousedown and mouseup — so a
          // plain click on a piece would silently become a "drop on the same square" (an illegal
          // move we reject) instead of firing onSquareClick to show legal-move dots. Requiring a
          // few more pixels of movement before it counts as a drag fixes that without making
          // intentional dragging feel sluggish.
          dragActivationDistance: 6,
          arrows,
          animationDurationInMs: 150,
          darkSquareStyle: { backgroundColor: "#7a9a65" },
          lightSquareStyle: { backgroundColor: "#eeeed5" },
          dropSquareStyle: { boxShadow: "inset 0 0 0 4px rgba(255,255,255,0.5)" },
          squareRenderer,
          onSquareClick: ({ square }) => handleSquareClick(square),
          onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
            if (!targetSquare || !onPieceDrop) return false;
            setSelectedSquare(null);
            setLegalTargets({});
            return onPieceDrop(sourceSquare, targetSquare, piece.pieceType);
          },
        }}
      />
      <div
        onPointerDown={startResize}
        onPointerMove={moveResize}
        onPointerUp={endResize}
        onLostPointerCapture={endResize}
        title="Kéo để thay đổi kích thước bàn cờ"
        className="absolute bottom-0 right-0 w-7 h-7 flex items-center justify-center text-gray-300/80 hover:text-white bg-black/35 hover:bg-black/55 rounded-tl-lg cursor-nwse-resize select-none transition-colors"
        style={{ touchAction: "none" }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="pointer-events-none">
          <path d="M11 2L2 11M11 6.5L6.5 11M11 11L10.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
