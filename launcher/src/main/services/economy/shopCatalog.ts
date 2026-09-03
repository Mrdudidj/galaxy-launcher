import type { ShopItem } from "../../../shared/economy.js";

export const SHOP_CATALOG: ShopItem[] = [
  {
    id: "emote-star-wave",
    name: "Sternenregen-Winken",
    description: "Ein Winken, das einen kurzen Sternenregen hinterlässt.",
    category: "emote",
    price: 150,
    icon: "✦",
    colorFrom: "#7c3aed",
    colorTo: "#22d3ee"
  },
  {
    id: "emote-galaxy-dance",
    name: "Galaxie-Tanz",
    description: "Eine kleine Nebelwolke dreht sich beim Tanzen mit.",
    category: "emote",
    price: 200,
    icon: "🌀",
    colorFrom: "#d946ef",
    colorTo: "#7c3aed"
  },
  {
    id: "emote-nova-cheer",
    name: "Nova-Jubel",
    description: "Kurzer Jubel mit einem hellen Lichtblitz.",
    category: "emote",
    price: 150,
    icon: "✺",
    colorFrom: "#f59e0b",
    colorTo: "#d946ef"
  },
  {
    id: "emote-zero-g-flip",
    name: "Schwerelos-Flip",
    description: "Ein Flip, als gäbe es für einen Moment keine Schwerkraft.",
    category: "emote",
    price: 250,
    icon: "⟲",
    colorFrom: "#22d3ee",
    colorTo: "#7c3aed"
  },
  {
    id: "emote-star-mockery",
    name: "Sternenspott",
    description: "Zeigt spöttisch und lacht dabei — nichts für Verlierer mit dünner Haut.",
    category: "emote",
    price: 175,
    icon: "☆",
    colorFrom: "#f59e0b",
    colorTo: "#7c3aed"
  },
  {
    id: "emote-cold-shoulder",
    name: "Kalte Schulter",
    description: "Dreht dir demonstrativ den Rücken zu.",
    category: "emote",
    price: 175,
    icon: "❄",
    colorFrom: "#22d3ee",
    colorTo: "#3730a3"
  },
  {
    id: "emote-noodle-arms",
    name: "Nudelarme",
    description: "Komplett entspannt — die Arme wackeln einfach mit.",
    category: "emote",
    price: 150,
    icon: "〰",
    colorFrom: "#d946ef",
    colorTo: "#f59e0b"
  },
  {
    id: "emote-astro-stumble",
    name: "Astro-Stolperer",
    description: "Verliert kurz das Gleichgewicht — und fängt sich gerade noch.",
    category: "emote",
    price: 150,
    icon: "⁉",
    colorFrom: "#7c3aed",
    colorTo: "#22d3ee"
  },
  {
    id: "emote-warm-greeting",
    name: "Herzlicher Gruß",
    description: "Winkt mit beiden Armen und verbeugt sich freundlich.",
    category: "emote",
    price: 175,
    icon: "☺",
    colorFrom: "#fde047",
    colorTo: "#d946ef"
  },
  {
    id: "emote-applause",
    name: "Applaus",
    description: "Klatscht begeistert Beifall.",
    category: "emote",
    price: 175,
    icon: "👏",
    colorFrom: "#22d3ee",
    colorTo: "#7c3aed"
  },
  {
    id: "hat-nebula-crown",
    name: "Nebel-Krone",
    description: "Eine Krone aus verdichtetem Nebeldunst.",
    category: "hat",
    price: 300,
    icon: "♛",
    colorFrom: "#d946ef",
    colorTo: "#22d3ee"
  },
  {
    id: "hat-starmap-hood",
    name: "Sternenkarten-Kapuze",
    description: "Innen mit einer leuchtenden Sternenkarte bestickt.",
    category: "hat",
    price: 250,
    icon: "🧢",
    colorFrom: "#3730a3",
    colorTo: "#7c3aed"
  },
  {
    id: "hat-comet-helmet",
    name: "Kometen-Helm",
    description: "Mit einer kleinen Schweifspur, die dir folgt.",
    category: "hat",
    price: 350,
    icon: "☄",
    colorFrom: "#eff6ff",
    colorTo: "#3b82f6"
  },
  {
    id: "hat-astro-visor",
    name: "Astro-Visier",
    description: "Spiegelt die Sterne über dir.",
    category: "hat",
    price: 200,
    icon: "🥽",
    colorFrom: "#4ade80",
    colorTo: "#064e3b"
  },
  {
    id: "wings-nova",
    name: "Nova-Schwingen",
    description: "Ein Paar leuchtender Flügel aus geschmolzenem Sternenlicht.",
    category: "wings",
    price: 450,
    icon: "🪽",
    colorFrom: "#fde047",
    colorTo: "#f59e0b"
  },
  {
    id: "outfit-violet-suit",
    name: "Raumanzug: Violett",
    description: "Der Klassiker in kräftigem Nebel-Violett.",
    category: "outfit",
    price: 400,
    icon: "🚀",
    colorFrom: "#7c3aed",
    colorTo: "#4c1d95",
    outfitSkinAsset: "violet-suit.png"
  },
  {
    id: "outfit-cyan-protocol",
    name: "Raumanzug: Cyan-Protokoll",
    description: "Kühles Cyan mit leuchtenden Nahtlinien.",
    category: "outfit",
    price: 400,
    icon: "🚀",
    colorFrom: "#22d3ee",
    colorTo: "#0e7490",
    outfitSkinAsset: "cyan-protocol.png"
  },
  {
    id: "hat-vip-diadem",
    name: "VIP-Diadem",
    description: "Reines Gold, nur für VIP und Owner erhältlich.",
    category: "hat",
    price: 500,
    icon: "♕",
    colorFrom: "#fbbf24",
    colorTo: "#b45309",
    vipOnly: true
  },
  {
    id: "outfit-vip-robe",
    name: "VIP-Prachtrobe",
    description: "Ein Umhang aus gewobenem Sternenlicht — exklusiv für VIP und Owner.",
    category: "outfit",
    price: 600,
    icon: "✨",
    colorFrom: "#fde047",
    colorTo: "#d97706",
    vipOnly: true,
    outfitSkinAsset: "vip-robe.png"
  },
  {
    id: "emote-vip-supernova",
    name: "Supernova-Krönung",
    description: "Eine goldene Explosion aus Sternenstaub — exklusiv für VIP und Owner.",
    category: "emote",
    price: 350,
    icon: "✹",
    colorFrom: "#fde047",
    colorTo: "#f59e0b",
    vipOnly: true
  },
  {
    id: "pet-galaxy-companion",
    name: "Logo-Begleiter",
    description: "Ein kleiner Begleitplanet mit Ring und Sternenstaub — exklusiv für die ersten 10 Gründer.",
    category: "pet",
    price: 0,
    icon: "🪐",
    colorFrom: "#7c3aed",
    colorTo: "#22d3ee",
    founderOnly: true
  },
  {
    id: "glow-neon",
    name: "Neon-Leuchten",
    description: "Grelles Neongrün für deinen Skin — freischaltbar im Skin-Editor.",
    category: "glow",
    price: 200,
    icon: "⚡",
    colorFrom: "#39ff14",
    colorTo: "#00c2a8",
    glowColor: "#39ff14"
  },
  {
    id: "glow-gold",
    name: "Gold-Leuchten",
    description: "Warmer Goldschimmer für deinen Skin — freischaltbar im Skin-Editor.",
    category: "glow",
    price: 250,
    icon: "🌟",
    colorFrom: "#fde047",
    colorTo: "#b45309",
    glowColor: "#f5b700"
  },
  {
    id: "glow-silver",
    name: "Silber-Leuchten",
    description: "Kühler Silberschein für deinen Skin — freischaltbar im Skin-Editor.",
    category: "glow",
    price: 250,
    icon: "🌙",
    colorFrom: "#e5e7eb",
    colorTo: "#9ca3af",
    glowColor: "#e0e0e0"
  }
];
