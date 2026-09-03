import { NearestFilter, SRGBColorSpace, TextureLoader, type Texture } from "three";

// Vite-imported so these are bundled/hashed like any other static asset —
// the resulting strings are resolved URLs, not raw file paths.
import nebulaCrownRing from "../assets/textures/hats/nebula-crown-ring.png";
import nebulaCrownSpike from "../assets/textures/hats/nebula-crown-spike.png";
import vipDiadem from "../assets/textures/hats/vip-diadem.png";
import starmapHood from "../assets/textures/hats/starmap-hood.png";
import cometHelmet from "../assets/textures/hats/comet-helmet.png";
import cometHelmetTail from "../assets/textures/hats/comet-helmet-tail.png";
import astroVisor from "../assets/textures/hats/astro-visor.png";
import novaWings from "../assets/textures/wings/nova-wings.png";

const TEXTURE_URLS: Record<string, string> = {
  "nebula-crown-ring.png": nebulaCrownRing,
  "nebula-crown-spike.png": nebulaCrownSpike,
  "vip-diadem.png": vipDiadem,
  "starmap-hood.png": starmapHood,
  "comet-helmet.png": cometHelmet,
  "comet-helmet-tail.png": cometHelmetTail,
  "astro-visor.png": astroVisor,
  "nova-wings.png": novaWings
};

const loader = new TextureLoader();
// One Texture per file, reused across every mesh that references it — these
// are all hand-painted 16x16 pixel art, so NearestFilter keeps the crisp
// pixel look instead of blurring it into a smear when magnified onto a 3D box.
const cache = new Map<string, Texture>();

export function loadCosmeticTexture(fileName: string): Texture {
  const cached = cache.get(fileName);
  if (cached) return cached;

  const url = TEXTURE_URLS[fileName];
  if (!url) throw new Error(`Unbekannte Kosmetik-Textur: ${fileName}`);

  const texture = loader.load(url);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  cache.set(fileName, texture);
  return texture;
}
