import { useEffect, useMemo, useState } from "react";
import type { TextureEntry } from "../../../shared/instance";
import { createEmptyGrid, gridToCanvas, PixelCanvas, type PixelGrid, type PixelTool } from "../components/editor/PixelCanvas";
import { PixelToolbar } from "../components/editor/PixelToolbar";
import { SkinViewer3D } from "../components/skin/SkinViewer3D";
import { useEconomy, useShopCatalog } from "../api/useEconomy";
import { useAuthStore } from "../state/authStore";
import { useInstancesStore } from "../state/instancesStore";
import "./SkinEditorView.css";

const SKIN_SIZE = 64;
const PIXEL_SIZE = 6;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

// intensity 0-100: 50 is the shop color unchanged, below fades toward black
// (dim/muted), above blends toward white (bright, "hot" glow) — a paint-time
// brightness the exported pixels actually carry, not a real light source.
function applyGlowIntensity(baseHex: string, intensity: number): string {
  const [r, g, b] = hexToRgb(baseHex);
  if (intensity === 50) return baseHex;
  if (intensity < 50) {
    const t = (50 - intensity) / 50;
    return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
  }
  const t = (intensity - 50) / 50;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

const GUIDE_REGIONS: { label: string; x: number; y: number; w: number; h: number; color: string }[] = [
  { label: "Kopf", x: 8, y: 8, w: 8, h: 8, color: "#22d3ee" },
  { label: "Körper", x: 20, y: 20, w: 8, h: 12, color: "#8b5cf6" },
  { label: "Arm R", x: 44, y: 20, w: 4, h: 12, color: "#d946ef" },
  { label: "Arm L", x: 36, y: 52, w: 4, h: 12, color: "#d946ef" },
  { label: "Bein R", x: 4, y: 20, w: 4, h: 12, color: "#4ade80" },
  { label: "Bein L", x: 20, y: 52, w: 4, h: 12, color: "#4ade80" }
];

async function imageToGrid(url: string, width: number, height: number): Promise<PixelGrid> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Kein 2D-Kontext verfügbar."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);
      const grid = createEmptyGrid(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
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
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
    img.src = url;
  });
}

// Real textures load at their own natural size (a 16×16 item vs. a much
// larger GUI sprite sheet) rather than through imageToGrid's canvas-scaling
// path, which is meant for a known target size like the 64×64 skin.
async function loadImageNaturalSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
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
    void imageToGrid(skinUrl, SKIN_SIZE, SKIN_SIZE)
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

const MAX_LISTED_RESULTS = 300;

function textureCanvasPixelSize(width: number): number {
  if (width <= 16) return 20;
  if (width <= 32) return 10;
  if (width <= 64) return 6;
  if (width <= 128) return 3;
  return 1;
}

function TextureMode(): React.JSX.Element {
  const { data: catalog } = useShopCatalog();
  const { data: economy } = useEconomy();
  const ownedGlowItems = useMemo(() => {
    if (!catalog || !economy) return [];
    const ownedIds = new Set(economy.inventory.map((i) => i.itemId));
    return catalog.filter((item) => item.category === "glow" && ownedIds.has(item.id));
  }, [catalog, economy]);

  const instances = useInstancesStore((s) => s.instances);
  const storeSelectedId = useInstancesStore((s) => s.selectedInstanceId);

  const downloadedInstances = useMemo(() => instances.filter((i) => i.resolvedVersionId !== null), [instances]);
  const [instanceId, setInstanceId] = useState<string | null>(null);

  useEffect(() => {
    if (instanceId) return;
    const preferred = downloadedInstances.find((i) => i.id === storeSelectedId) ?? downloadedInstances[0];
    if (preferred) setInstanceId(preferred.id);
    // Only meant to pick an initial default once instances are known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadedInstances]);

  const [textures, setTextures] = useState<TextureEntry[] | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId) return;
    setTextures(null);
    setListError(null);
    setIsLoadingList(true);
    window.galaxy.textures
      .list(instanceId)
      .then(setTextures)
      .catch((error: unknown) => setListError(error instanceof Error ? error.message : "Texturen konnten nicht geladen werden."))
      .finally(() => setIsLoadingList(false));
  }, [instanceId]);

  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TextureEntry | null>(null);
  const [grid, setGrid] = useState<PixelGrid>(() => createEmptyGrid(16, 16));
  const [dims, setDims] = useState({ width: 16, height: 16 });
  const [tool, setTool] = useState<PixelTool>("brush");
  const [color, setColor] = useState("#8b5cf6");
  const [activeGlowColor, setActiveGlowColor] = useState<string | null>(null);
  const [glowIntensity, setGlowIntensity] = useState(50);
  const [isLoadingTexture, setIsLoadingTexture] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeGlowColor) setColor(applyGlowIntensity(activeGlowColor, glowIntensity));
  }, [activeGlowColor, glowIntensity]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of textures ?? []) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [textures]);

  const matchingResults = useMemo(() => {
    if (!textures) return [];
    const query = search.trim().toLowerCase();
    if (query) return textures.filter((t) => t.path.toLowerCase().includes(query));
    if (category) return textures.filter((t) => t.category === category);
    return [];
  }, [textures, search, category]);

  const visibleResults = useMemo(() => matchingResults.slice(0, MAX_LISTED_RESULTS), [matchingResults]);
  const totalMatching = matchingResults.length;

  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!instanceId || visibleResults.length === 0) return;
    const missing = visibleResults.map((t) => t.path).filter((path) => !(path in thumbnails));
    if (missing.length === 0) return;
    window.galaxy.textures
      .readBatch(instanceId, missing)
      .then((batch) => setThumbnails((prev) => ({ ...prev, ...batch })))
      .catch(() => {
        // Missing thumbnails just fall back to the path label — not worth surfacing as an error.
      });
    // Only the path set matters here, not thumbnails itself (that would refetch forever).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, visibleResults]);

  async function handleSelectTexture(entry: TextureEntry): Promise<void> {
    if (!instanceId) return;
    setIsLoadingTexture(true);
    setSaveMessage(null);
    try {
      const base64 = await window.galaxy.textures.read(instanceId, entry.path);
      const url = `data:image/png;base64,${base64}`;
      const { width, height } = await loadImageNaturalSize(url);
      const nextGrid = await imageToGrid(url, width, height);
      setDims({ width, height });
      setGrid(nextGrid);
      setSelected(entry);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Textur konnte nicht geladen werden.");
    } finally {
      setIsLoadingTexture(false);
    }
  }

  async function handleApply(): Promise<void> {
    if (!instanceId || !selected) return;
    const canvas = gridToCanvas(grid, dims.width, dims.height);
    const base64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
    await window.galaxy.textures.apply(instanceId, selected.path, base64);
    setSaveMessage("In der Instanz gespeichert — im Spiel unter Resourcenpakete \"galaxy-custom\" aktivieren.");
  }

  async function handleExportFile(): Promise<void> {
    if (!selected) return;
    const canvas = gridToCanvas(grid, dims.width, dims.height);
    const base64 = canvas.toDataURL("image/png").split(",")[1] ?? "";
    const path = await window.galaxy.dialogs.saveTexture(`${selected.fileName}.png`, base64);
    if (path) setSaveMessage(`Als Datei gespeichert: ${path}`);
  }

  if (downloadedInstances.length === 0) {
    return (
      <p className="skin-editor-view__hint">
        Lade zuerst eine Instanz herunter (Instanzen-Ansicht) — Texturen werden aus ihren echten Spieldateien gelesen.
      </p>
    );
  }

  if (!selected) {
    return (
      <div className="skin-editor-view__texture-picker">
        <label className="skin-editor-view__field">
          <span>Instanz</span>
          <select
            value={instanceId ?? ""}
            onChange={(e) => {
              setInstanceId(e.target.value);
              setCategory(null);
              setSearch("");
            }}
          >
            {downloadedInstances.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.minecraftVersion})
              </option>
            ))}
          </select>
        </label>

        {isLoadingList && <p className="skin-editor-view__hint">Lade Texturliste…</p>}
        {listError && <p className="skin-editor-view__hint">{listError}</p>}

        {textures && (
          <>
            <input
              className="skin-editor-view__texture-search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCategory(null);
              }}
              placeholder={`Suche unter ${textures.length} Texturen (z. B. "hotbar", "diamond", "zombie")…`}
            />

            {!search.trim() && (
              <div className="skin-editor-view__texture-grid">
                {categoryCounts.map(([cat, count]) => (
                  <button
                    key={cat}
                    className={`skin-editor-view__texture-item ${category === cat ? "skin-editor-view__texture-item--active" : ""}`}
                    onClick={() => setCategory(cat === category ? null : cat)}
                  >
                    <span>{cat}</span>
                    <span className="skin-editor-view__texture-item-count">{count}</span>
                  </button>
                ))}
              </div>
            )}

            {(search.trim() || category) && (
              <div className="skin-editor-view__texture-results">
                {visibleResults.map((entry) => (
                  <button
                    key={entry.path}
                    className="skin-editor-view__texture-result"
                    onClick={() => void handleSelectTexture(entry)}
                  >
                    <span className="skin-editor-view__texture-result-thumb">
                      {thumbnails[entry.path] && (
                        <img src={`data:image/png;base64,${thumbnails[entry.path]}`} alt="" />
                      )}
                    </span>
                    {entry.path}
                  </button>
                ))}
                {totalMatching > MAX_LISTED_RESULTS && (
                  <p className="skin-editor-view__hint">
                    {totalMatching} Treffer — zeige die ersten {MAX_LISTED_RESULTS}, Suche verfeinern für mehr.
                  </p>
                )}
                {visibleResults.length === 0 && <p className="skin-editor-view__hint">Keine Treffer.</p>}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="skin-editor-view__layout">
      <div className="skin-editor-view__paint-column">
        <div className="skin-editor-view__texture-active">
          <button
            className="skin-editor-view__texture-back"
            onClick={() => {
              setSelected(null);
              setSaveMessage(null);
            }}
          >
            ← Andere Textur wählen
          </button>
          <strong>{selected.path}</strong>
          <span className="skin-editor-view__hint">
            {dims.width}×{dims.height}
          </span>
        </div>

        {isLoadingTexture ? (
          <p className="skin-editor-view__hint">Lade Textur…</p>
        ) : (
          <>
            <PixelToolbar
              tool={tool}
              onToolChange={setTool}
              color={color}
              onColorChange={(next) => {
                setActiveGlowColor(null);
                setColor(next);
              }}
              onClear={() => setGrid(createEmptyGrid(dims.width, dims.height))}
            />

            <div className="skin-editor-view__glow-paint">
              <span className="skin-editor-view__hint">Shop-Leuchtfarben</span>
              <div className="skin-editor-view__glow-swatches">
                {ownedGlowItems.map((item) => (
                  <button
                    key={item.id}
                    className={`skin-editor-view__glow-swatch ${activeGlowColor === item.glowColor ? "skin-editor-view__glow-swatch--active" : ""}`}
                    style={{ background: item.glowColor }}
                    onClick={() => item.glowColor && setActiveGlowColor(item.glowColor)}
                    title={item.name}
                  />
                ))}
                {ownedGlowItems.length === 0 && (
                  <span className="skin-editor-view__hint">Noch keine Leuchtfarbe im Besitz — im Shop erhältlich.</span>
                )}
              </div>
              {activeGlowColor && (
                <label className="skin-editor-view__glow-intensity">
                  <span>Stärke: {glowIntensity}%</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={glowIntensity}
                    onChange={(e) => setGlowIntensity(Number(e.target.value))}
                  />
                </label>
              )}
            </div>

            <div className="skin-editor-view__canvas-wrap">
              <PixelCanvas
                gridWidth={dims.width}
                gridHeight={dims.height}
                pixelSize={textureCanvasPixelSize(dims.width)}
                grid={grid}
                onChange={setGrid}
                tool={tool}
                color={color}
                onEyedrop={(next) => {
                  setActiveGlowColor(null);
                  setColor(next);
                }}
              />
            </div>

            <div className="skin-editor-view__texture-actions">
              <button className="skin-editor-view__save" onClick={() => void handleApply()}>
                ✓ In Instanz übernehmen
              </button>
              <button className="skin-editor-view__texture-back" onClick={() => void handleExportFile()}>
                Als Datei exportieren
              </button>
              {saveMessage && <span className="skin-editor-view__save-message">{saveMessage}</span>}
            </div>
          </>
        )}
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
