// src/utils/game-assets.ts

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
  "Ancient Repair Bench": " forge",
  "Mysterious Box": " chest",
  "Ancient Altar": "🛐",
  "Mysterious Staircase": "🪜",
  "Triggered Trap": "☠️",
  "Instant Death Trap": "💀",
};

// Map for enemy sprites
export const enemySpriteMap: { [key: string]: string } = {
  "Grumbling Goblin": "/assets/sprites/enemies/goblin.svg",
  "Rattling Skeleton": "/assets/sprites/enemies/skeleton.svg",
  "Whispering Shadow": "/assets/sprites/enemies/shadow.svg",
  "The Watcher of the Core": "/assets/sprites/enemies/watcher.svg",
};

// Helper function to get emoji for an element, handling prefixes
export const getEmojiForElement = (elementName: string): string => {
  const baseName = elementName
    .replace(/^(Rusty|Iron|Steel|Mithril|Ancient)\s/, "")
    .trim();
  return emojiMap[baseName] || "❓";
};