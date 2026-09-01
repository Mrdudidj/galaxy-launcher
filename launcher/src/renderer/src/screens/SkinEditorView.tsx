import { useEffect, useMemo, useState } from "react";
import { createEmptyGrid, gridToCanvas, PixelCanvas, type PixelGrid, type PixelTool } from "../components/editor/PixelCanvas";
import { PixelToolbar } from "../components/editor/PixelToolbar";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { MINECRAFT_ITEMS, type MinecraftItemEntry } from "../data/minecraftItems";
import { useEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import "./SkinEditorView.css";

const SKIN_SIZE = 64;
const PIXEL_SIZE = 6;

const GUIDE_REGIONS: { label: string; x: number; y: number; w: number; h: number; color: string }[] = [
  { label: "Kopf", x: 8, y: 8, w: 8, h: 8, color: "#22d3ee" },
  { label: "Körper", x: 20, y: 20, w: 8, h: 12, color: "#8b5cf6" },
  { label: "Arm R", x: 44, y: 20, w: 4, h: 12, color: "#d946ef" },
  { label: "Arm L", x: 36, y: 52, w: 4, h: 12, color: "#d946ef" },
  { label: "Bein R", x: 4, y: 20, w: 4, h: 12, color: "#4ade80" },
  { label: "Bein L", x: 20, y: 52, w: 4, h: 12, color: "#4ade80" }
];

async function imageToGrid(url: string, size: number): Promise<PixelGrid> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Kein 2D-Kontext verfügbar."));
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);
      const grid = createEmptyGrid(size, size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          const alpha = data[i + 3] ?? 0;
          if (alpha === 0) continue;
          const r = (data[i] ?? 0).toString(16).padStart(2, "0");
          const g = (data[i + 1] ?? 0).toString(16).padStart(2, "0");
          const b = (data[i + 2] ?? 0).toString(16).padStart(2, "0");
          grid[y]![x] = `#${r}${g}${b}`;
        }
      }
      resolve(grid);
    };
    img.onerror = () => reject(new Error("Skin konnte nicht geladen werden."));
    img.src = url;
  });
}

function SkinMode(): React.JSX.Element {
  const skinUrl = useAuthStore((s) => s.skinUrl);
  const glowColor = useAuthStore((s) => s.glowColor);
  const setSkin = useAuthStore((s) => s.setSkin);
  const setGlowColorInStore = useAuthStore((s) => s.setGlowColor);
  const { data: catalog } = useShopCatalog();
  const { data: economy } = useEconomy();

  const [grid, setGrid] = useState<PixelGrid>(() => createEmptyGrid(SKIN_SIZE, SKIN_SIZE));
  const [tool, setTool] = useState<PixelTool>("brush");
  const [color, setColor] = useState("#8b5cf6");
  const [showGuide, setShowGuide] = useState(true);
  const [localGlow, setLocalGlow] = useState<string | null>(glowColor);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void imageToGrid(skinUrl, SKIN_SIZE)
      .then(setGrid)
      .catch(() => setGrid(createEmptyGrid(SKIN_SIZE, SKIN_SIZE)))
      .finally(() => setIsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftSkinUrl = useMemo(() => {
    if (!isLoaded) return skinUrl;
    const canvas = gridToCanvas(grid, SKIN_SIZE, SKIN_SIZE);
    return canvas.toDataURL("image/png");
  }, [grid, isLoaded, skinUrl]);

  const ownedGlowItems = useMemo(() => {
    if (!catalog || !economy) return [];
    const ownedIds = new Set(economy.inventory.map((i) => i.itemId));
    return catalog.filter((item) => item.category === "glow" && ownedIds.has(item.id));
  }, [catalog, economy]);

  async function handleSave(): Promise<void> {
    const base64 = draftSkinUrl.split(",")[1] ?? "";
    await window.galaxy.skin.save(base64);
    setSkin(base64);
    setSaveMessage("Skin gespeichert!");
    setTimeout(() => setSaveMessage(null), 2500);
  }

  async function handleGlowChange(next: string | null): Promise<void> {
    setLocalGlow(next);
    await window.galaxy.skin.setGlow(next);
    setGlowColorInStore(next);
  }

  return (
    <div className="skin-editor-view__layout">
      <div className="skin-editor-view__paint-column">
        <PixelToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          onClear={() => setGrid(createEmptyGrid(SKIN_SIZE, SKIN_SIZE))}
        />

        <label className="skin-editor-view__guide-toggle">
          <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
          Vorlage anzeigen
        </label>

        <div className="skin-editor-view__canvas-wrap">
          <PixelCanvas
            gridWidth={SKIN_SIZE}
            gridHeight={SKIN_SIZE}
            pixelSize={PIXEL_SIZE}
            grid={grid}
            onChange={setGrid}
            tool={tool}
            color={color}
            onEyedrop={setColor}
          />
          {showGuide && (
            <svg
              className="skin-editor-view__guide-overlay"
              width={SKIN_SIZE * PIXEL_SIZE}
              height={SKIN_SIZE * PIXEL_SIZE}
            >
              {GUIDE_REGIONS.map((region) => (
                <rect
                  key={region.label}
                  x={region.x * PIXEL_SIZE}
                  y={region.y * PIXEL_SIZE}
                  width={region.w * PIXEL_SIZE}
                  height={region.h * PIXEL_SIZE}
                  fill="none"
                  stroke={region.color}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      <div className="skin-editor-view__preview-column">
        <div
          className="skin-editor-view__preview-frame"
          style={localGlow ? ({ "--glow-color": localGlow } as React.CSSProperties) : undefined}
        >
          <SkinViewer3D skinUrl={draftSkinUrl} width={170} height={360} />
        </div>

        <div className="skin-editor-view__glow-picker">
          <span>Leuchtfarbe</span>
          <div className="skin-editor-view__glow-swatches">
            {ownedGlowItems.map((item) => (
              <button
                key={item.id}
                className={`skin-editor-view__glow-swatch ${localGlow === item.glowColor ? "skin-editor-view__glow-swatch--active" : ""}`}
                style={{ background: item.glowColor }}
                onClick={() => void handleGlowChange(item.glowColor ?? null)}
                title={item.name}
              />
            ))}
            {localGlow && (
              <button className="skin-editor-view__glow-remove" onClick={() => void handleGlowChange(null)}>
                Entfernen
              </button>
            )}
          </div>
          {ownedGlowItems.length === 0 && (
            <p className="skin-editor-view__glow-hint">
              Noch keine Leuchtfarbe im Besitz — im Shop unter "Leuchtfarben" erhältlich.
            </p>
          )}
        </div>
        <p className="skin-editor-view__glow-hint">
          Die Leuchtfarbe umgibt deinen Charakter im Launcher. Im Spiel sichtbar wird sie erst mit dem
          Begleit-Mod (noch nicht gebaut).
        </p>

        <button className="skin-editor-view__save" onClick={() => void handleSave()}>
          ✓ Skin speichern
        </button>
        {saveMessage && <span className="skin-editor-view__save-message">{saveMessage}</span>}
      </div>
    </div>
  );
}

const TEXTURE_SIZES = [16, 32, 64] as const;

function TextureMode(): React.JSX.Element {
  const [selectedItem, setSelectedItem] = useState<MinecraftItemEntry | null>(null);
  const [size, setSize] = useState<(typeof TEXTURE_SIZES)[number]>(16);
  const [grid, setGrid] = useState<PixelGrid>(() => createEmptyGrid(16, 16));
  const [tool, setTool] = useState<PixelTool>("brush");
  const [color, setColor] = useState("#8b5cf6");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, MinecraftItemEntry[]>();
    for (const item of MINECRAFT_ITEMS) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, []);

  function handleSelectItem(item: MinecraftItemEntry): void {
    setSelectedItem(item);
    setGrid(createEmptyGrid(size, size));
    setExportMessage(null);
  }

  function handleSizeChange(nextSize: (typeof TEXTURE_SIZES)[number]): void {
    setSize(nextSize);
    setGrid(createEmptyGrid(nextSize, nextSize));
    setExportMessage(null);
  }

  async function handleExport(): Promise<void> {
    if (!selectedItem) return;
    const canvas = gridToCanvas(grid, size, size);
    const base64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
    const path = await window.galaxy.dialogs.saveTexture(`${selectedItem.id}.png`, base64);
    setExportMessage(path ? `Gespeichert: ${path}` : null);
  }

  if (!selectedItem) {
    return (
      <div className="skin-editor-view__texture-picker">
        <p className="skin-editor-view__hint">
          Wähle ein Item oder einen Block aus, um seine Textur zu bearbeiten.
        </p>
        {grouped.map(([category, items]) => (
          <div key={category} className="skin-editor-view__texture-category">
            <h3>{category}</h3>
            <div className="skin-editor-view__texture-grid">
              {items.map((item) => (
                <button key={item.id} className="skin-editor-view__texture-item" onClick={() => handleSelectItem(item)}>
                  <span className="skin-editor-view__texture-item-icon">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skin-editor-view__layout">
      <div className="skin-editor-view__paint-column">
        <div className="skin-editor-view__texture-active">
          <button className="skin-editor-view__texture-back" onClick={() => setSelectedItem(null)}>
            ← Andere Textur wählen
          </button>
          <strong>
            {selectedItem.icon} {selectedItem.name}
          </strong>
        </div>

        <div className="skin-editor-view__size-tabs">
          {TEXTURE_SIZES.map((s) => (
            <button key={s} className={size === s ? "active" : ""} onClick={() => handleSizeChange(s)}>
              {s}×{s}
            </button>
          ))}
        </div>

        <PixelToolbar
          tool={tool}
          onToolChange={setTool}
          color={color}
          onColorChange={setColor}
          onClear={() => setGrid(createEmptyGrid(size, size))}
        />

        <div className="skin-editor-view__canvas-wrap">
          <PixelCanvas
            gridWidth={size}
            gridHeight={size}
            pixelSize={size === 16 ? 20 : size === 32 ? 10 : 5}
            grid={grid}
            onChange={setGrid}
            tool={tool}
            color={color}
            onEyedrop={setColor}
          />
        </div>

        <div className="skin-editor-view__texture-actions">
          <button className="skin-editor-view__save" onClick={() => void handleExport()}>
            ⬇ Als {selectedItem.id}.png exportieren
          </button>
          {exportMessage && <span className="skin-editor-view__save-message">{exportMessage}</span>}
        </div>
      </div>
    </div>
  );
}

export function SkinEditorView(): React.JSX.Element {
  const [mode, setMode] = useState<"skin" | "texture">("skin");

  return (
    <div className="skin-editor-view">
      <div className="skin-editor-view__header">
        <div>
          <h2>Skin &amp; Texturen</h2>
          <p className="skin-editor-view__hint">
            {mode === "skin"
              ? "Male direkt auf deinem 64×64-Skin. Die Vorlage zeigt, wo Kopf, Körper, Arme und Beine liegen."
              : "Wähle ein Item oder einen Block und bearbeite seine Textur."}
          </p>
        </div>
        <div className="skin-editor-view__mode-tabs">
          <button className={mode === "skin" ? "active" : ""} onClick={() => setMode("skin")}>
            Skin
          </button>
          <button className={mode === "texture" ? "active" : ""} onClick={() => setMode("texture")}>
            Textur
          </button>
        </div>
      </div>

      {mode === "skin" ? <SkinMode /> : <TextureMode />}
    </div>
  );
}
