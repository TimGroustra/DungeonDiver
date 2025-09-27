// src/utils/game-assets.ts

// Import SVG files directly
import goblinSprite from "@/assets/sprites/enemies/goblin.svg";
import skeletonSprite from "@/assets/sprites/enemies/skeleton.svg";
import shadowSprite from "@/assets/sprites/enemies/shadow.svg";
import watcherSprite from "@/assets/sprites/enemies/watcher.svg";
import ancientRepairBenchSprite from "@/assets/sprites/static-items/ancient-repair-bench.svg";
import ancientMechanismSprite from "@/assets/sprites/static-items/ancient-mechanism.svg";
import hiddenSpringSprite from "@/assets/sprites/static-items/hidden-spring.svg";
import mysteriousBoxSprite from "@/assets/sprites/static-items/mysterious-box.svg";
import ancientAltarSprite from "@/assets/sprites/static-items/ancient-altar.svg";
import lightningStrikeSprite from "@/assets/sprites/spells/lightning-strike.svg";

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
  "Hidden Spring": "⛲",
  "Ancient Repair Bench": "🛠️",
  "Ancient Altar": "🛐",
  "Mysterious Staircase": "🪜",
  "Triggered Trap": "☠️",
  "Instant Death Trap": "💀",
  "Lightning Strike": "⚡",
  "Tome of Embers": "🔥", // Added fire emoji
  "Tome of Hoarfrost": "❄️", // Added ice emoji
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
  "Ancient Mechanism": ancientMechanismSprite,
  "Hidden Spring": hiddenSpringSprite,
  "Mysterious Box": mysteriousBoxSprite,
  "Ancient Altar": ancientAltarSprite,
};

/**
 * Gets the emoji for a given game element name.
 * Handles prefixed items like "Rusty Blade of the Labyrinth".
 * @param elementName The name of the element.
 * @returns The corresponding emoji string or a question mark if not found.
 */
export const getEmojiForElement = (elementName: string | undefined): string => {
  if (!elementName) return '❓';

  // Direct match first
  if (emojiMap[elementName]) {
    return emojiMap[elementName];
  }

  // Check for prefixed items
  if (elementName.includes("Blade of the Labyrinth")) {
    return emojiMap["Blade of the Labyrinth"];
  }
  if (elementName.includes("Aegis of the Guardian")) {
    return emojiMap["Aegis of the Guardian"];
  }

  return '❓';
};