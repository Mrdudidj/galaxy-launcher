export interface MinecraftItemEntry {
  /** Real Minecraft texture file name (without extension) — kept accurate so an
   *  exported PNG can drop straight into a resource pack's textures folder. */
  id: string;
  name: string;
  category: "Werkzeuge & Waffen" | "Nahrung" | "Blöcke" | "Deko";
  icon: string;
}

export const MINECRAFT_ITEMS: MinecraftItemEntry[] = [
  { id: "diamond_sword", name: "Diamantschwert", category: "Werkzeuge & Waffen", icon: "🗡" },
  { id: "netherite_sword", name: "Netherit-Schwert", category: "Werkzeuge & Waffen", icon: "🗡" },
  { id: "diamond_pickaxe", name: "Diamantspitzhacke", category: "Werkzeuge & Waffen", icon: "⛏" },
  { id: "diamond_axe", name: "Diamantaxt", category: "Werkzeuge & Waffen", icon: "🪓" },
  { id: "bow", name: "Bogen", category: "Werkzeuge & Waffen", icon: "🏹" },
  { id: "shield", name: "Schild", category: "Werkzeuge & Waffen", icon: "🛡" },
  { id: "trident", name: "Dreizack", category: "Werkzeuge & Waffen", icon: "🔱" },
  { id: "fishing_rod", name: "Angel", category: "Werkzeuge & Waffen", icon: "🎣" },
  { id: "apple", name: "Apfel", category: "Nahrung", icon: "🍎" },
  { id: "golden_apple", name: "Goldener Apfel", category: "Nahrung", icon: "🍏" },
  { id: "bread", name: "Brot", category: "Nahrung", icon: "🍞" },
  { id: "cookie", name: "Keks", category: "Nahrung", icon: "🍪" },
  { id: "cake", name: "Kuchen", category: "Nahrung", icon: "🍰" },
  { id: "carrot", name: "Karotte", category: "Nahrung", icon: "🥕" },
  { id: "melon_slice", name: "Melonenscheibe", category: "Nahrung", icon: "🍉" },
  { id: "cooked_beef", name: "Steak", category: "Nahrung", icon: "🥩" },
  { id: "grass_block", name: "Grasblock", category: "Blöcke", icon: "🟩" },
  { id: "stone", name: "Stein", category: "Blöcke", icon: "🪨" },
  { id: "diamond_block", name: "Diamantblock", category: "Blöcke", icon: "💎" },
  { id: "gold_block", name: "Goldblock", category: "Blöcke", icon: "🟨" },
  { id: "obsidian", name: "Obsidian", category: "Blöcke", icon: "🟪" },
  { id: "oak_planks", name: "Eichenbretter", category: "Blöcke", icon: "🟫" },
  { id: "glass", name: "Glas", category: "Blöcke", icon: "⬜" },
  { id: "tnt", name: "TNT", category: "Blöcke", icon: "🧨" },
  { id: "pumpkin", name: "Kürbis", category: "Deko", icon: "🎃" },
  { id: "torch", name: "Fackel", category: "Deko", icon: "🔦" },
  { id: "chest", name: "Truhe", category: "Deko", icon: "📦" },
  { id: "flower_pot", name: "Blumentopf", category: "Deko", icon: "🪴" },
  { id: "banner", name: "Banner", category: "Deko", icon: "🚩" },
  { id: "item_frame", name: "Rahmen", category: "Deko", icon: "🖼" }
];
