import { useCallback, useEffect, useRef } from "react";
import "./PixelCanvas.css";

export type PixelTool = "brush" | "eraser" | "bucket" | "eyedropper";
export type PixelGrid = (string | null)[][];

interface PixelCanvasProps {
  gridWidth: number;
  gridHeight: number;
  pixelSize?: number;
  grid: PixelGrid;
  onChange: (grid: PixelGrid) => void;
  tool: PixelTool;
  color: string;
  onEyedrop?: (color: string) => void;
}

export function createEmptyGrid(width: number, height: number): PixelGrid {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => null));
}

export function gridToCanvas(grid: PixelGrid, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = grid[y]?.[x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return canvas;
}

export function PixelCanvas({
  gridWidth,
  gridHeight,
  pixelSize = 12,
  grid,
  onChange,
  tool,
  color,
  onEyedrop
}: PixelCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const cell = grid[y]?.[x] ?? null;
        ctx.fillStyle = cell ?? ((x + y) % 2 === 0 ? "#2a2a3d" : "#242436");
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }, [grid, gridWidth, gridHeight, pixelSize]);

  useEffect(() => draw(), [draw]);

  function cellFromEvent(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * gridWidth);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * gridHeight);
    if (x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) return null;
    return { x, y };
  }

  function bucketFill(startX: number, startY: number, next: PixelGrid): void {
    const target = next[startY]?.[startX] ?? null;
    const fillColor = color;
    if (target === fillColor) return;
    const stack: [number, number][] = [[startX, startY]];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (seen.has(key) || x < 0 || y < 0 || x >= gridWidth || y >= gridHeight) continue;
      if ((next[y]?.[x] ?? null) !== target) continue;
      seen.add(key);
      next[y]![x] = fillColor;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  function applyAt(x: number, y: number): void {
    if (tool === "eyedropper") {
      onEyedrop?.(grid[y]?.[x] ?? "#000000");
      return;
    }
    const next = grid.map((row) => [...row]);
    if (tool === "brush") next[y]![x] = color;
    else if (tool === "eraser") next[y]![x] = null;
    else if (tool === "bucket") bucketFill(x, y, next);
    onChange(next);
  }

  function handleDown(e: React.MouseEvent<HTMLCanvasElement>): void {
    const cell = cellFromEvent(e);
    if (!cell) return;
    isDrawingRef.current = true;
    applyAt(cell.x, cell.y);
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (!isDrawingRef.current || tool === "bucket" || tool === "eyedropper") return;
    const cell = cellFromEvent(e);
    if (cell) applyAt(cell.x, cell.y);
  }

  function handleUp(): void {
    isDrawingRef.current = false;
  }

  return (
    <canvas
      ref={canvasRef}
      width={gridWidth * pixelSize}
      height={gridHeight * pixelSize}
      className="pixel-canvas"
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
    />
  );
}
