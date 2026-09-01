import type { PixelTool } from "./PixelCanvas";
import "./PixelToolbar.css";

const TOOLS: { tool: PixelTool; glyph: string; label: string }[] = [
  { tool: "brush", glyph: "✎", label: "Pinsel" },
  { tool: "eraser", glyph: "▱", label: "Radierer" },
  { tool: "bucket", glyph: "◆", label: "Eimer" },
  { tool: "eyedropper", glyph: "◎", label: "Pipette" }
];

export function PixelToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  onClear
}: {
  tool: PixelTool;
  onToolChange: (tool: PixelTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  onClear: () => void;
}): React.JSX.Element {
  return (
    <div className="pixel-toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          className={`pixel-toolbar__tool ${tool === t.tool ? "pixel-toolbar__tool--active" : ""}`}
          title={t.label}
          onClick={() => onToolChange(t.tool)}
        >
          {t.glyph}
        </button>
      ))}
      <input
        type="color"
        className="pixel-toolbar__color"
        value={color}
        onChange={(e) => onColorChange(e.target.value)}
        title="Farbe"
      />
      <button className="pixel-toolbar__clear" onClick={onClear} title="Alles löschen">
        ✕ Leeren
      </button>
    </div>
  );
}
