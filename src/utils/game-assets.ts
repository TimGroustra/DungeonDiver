// src/utils/game-assets.ts

// Import SVG files directly
import goblinSprite from "@/assets/sprites/enemies/goblin.svg";
import skeletonSprite from "@/assets/sprites/enemies/skeleton.svg";
import shadowSprite from "@/assets/sprites/enemies/shadow.svg";
import watcherSprite from "@/assets/sprites/enemies/watcher.svg";
import ancientRepairBenchSprite from "@/assets/sprites/static-items/ancient-repair-bench.svg"; // New import

// Emoji map for various game elements
export const emojiMap: { [key: string]: string } = {
  "Vial of Lumina": "🧪",
  "Blade of the Labyrinth": "🗡️",
  "Aegis of the Guardian": "🛡️",
  "Tattered Journal": "📜",
  "Pulsating Crystal": "🔮",
  "Scholar's Amulet": "💎",
  "Enchanted Flask": "🍶",
  "Living Water": "💧",
  "Whispering Well's Blessing": "✨",
  "Broken Compass": "🧭",
  "Artisan's Fine Tools": "🛠️",
  "Prismatic Lens": "🌈",
  "True Compass": "🗺️",
  "Labyrinth Key": "🔑",
  "Heart of the Labyrinth": "❤️‍🔥",
  "Ancient Mechanism": "⚙️",
  "Whispering Well": "🕳️",
  "Hidden Spring": "🌿",
  "Ancient Repair Bench": "🛠️", // Changed to a more generic tool emoji
  "Mysterious Box": "📦", // Changed to a more generic box emoji
  "Ancient Altar": "🛐",
  "Mysterious Staircase": "🪜",
  "Triggered Trap": "☠️",
  "Instant Death Trap": "💀",
};

// Map for enemy sprites
export const enemySpriteMap: { [key: string]: string } = {
  "Grumbling Goblin": goblinSprite,
  "Rattling Skeleton": skeletonSprite,
  "Whispering Shadow": shadowSprite,
  "The Watcher of the Core": watcherSprite,
};

// New map for static item sprites
export const staticItemSpriteMap: { [key: string]: string } = {
  "Ancient Repair Bench": ancientRepairBenchSprite,
};

// Helper function to get emoji for an element, handling prefixes
export const getEmojiForElement = (elementName: string): string => {
  // Ensure the elementName is a string before calling replace and trim
  const cleanedName = typeof elementName === 'string' ? elementName.replace(/^(Rusty|Iron|Steel|Mithril|Ancient)\s/, "").trim() : '';
  return emojiMap[cleanedName] || "❓";
};