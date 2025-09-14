"use client";

import { v4 as uuidv4 } from 'uuid';

// --- Interfaces ---
export interface LogicalRoom {
  x: number;
  y: number;
  floor: number;
  exits: { north: boolean; south: boolean; east: boolean; west: boolean };
  visited: boolean;
  searched: boolean;
  hasPlayer: boolean;
  hasExit: boolean;
  hasEntrance: boolean;
  hasBoss: boolean;
  hasBossEntrance: boolean;
  hasBossExit: boolean;
  hasStairsUp: boolean;
  hasStairsDown: boolean;
  decorativeElements: { type: string; id: string }[];
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'weapon' | 'shield' | 'accessory' | 'key' | 'objective' | 'static';
  effect?: string; // e.g., 'heal', 'damage_boost', 'defense_boost', 'search_boost'
  value?: number; // e.g., heal amount, damage bonus, defense bonus, search radius bonus
  stackable: boolean;
  isStatic?: boolean; // If true, item is part of the environment and not picked up
  isEquipped?: boolean;
  isRevealed?: boolean; // For static items, if they have been revealed by search
}

export interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number; // How often it moves (lower is faster)
  defeated: boolean;
  isBoss: boolean;
  messages: string[]; // Messages specific to this enemy
}

export interface GameResult {
  type: 'victory' | 'defeat';
  name: string;
  time: number;
  deaths: number;
  causeOfDeath?: string;
}

export interface Objective {
  description: string[];
  isCompleted: () => boolean;
}

// --- Constants ---
const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;
const NUM_FLOORS = 3; // Number of floors in the labyrinth
const INITIAL_SEARCH_RADIUS = 2;
const MAX_SEARCH_RADIUS = 5;
const PLAYER_BASE_ATTACK = 10;
const PLAYER_BASE_DEFENSE = 5;
const PLAYER_MAX_HEALTH = 100;
const BOSS_HEALTH_MULTIPLIER = 5; // Boss has 5x health of a regular enemy
const BOSS_ATTACK_MULTIPLIER = 2; // Boss has 2x attack of a regular enemy

// --- Labyrinth Class ---
export class Labyrinth {
  private map: Map<string, LogicalRoom>;
  private playerLocation: { x: number; y: number; floor: number };
  private playerHealth: number;
  private playerMaxHealth: number;
  private playerDeaths: number;
  private inventory: Map<string, { item: Item; quantity: number }>;
  private messages: string[];
  private visitedCells: Set<string>;
  private searchRadius: number;
  private equippedWeapon: Item | null;
  private equippedShield: Item | null;
  private equippedAmulet: Item | null;
  private equippedCompass: Item | null;
  private currentFloor: number;
  private isGameOverFlag: boolean;
  private causeOfDeath: string | undefined;
  private bossDefeated: boolean;
  private playerName: string;
  private elapsedTime: number;
  private lastMoveDirection: "north" | "south" | "east" | "west";
  public enemyLocations: Map<string, string>; // Map<"x,y,f", enemyId>
  private enemies: Map<string, Enemy>; // Map<enemyId, Enemy>
  public itemLocations: Map<string, string>; // Map<"x,y,f", itemId>
  public staticItemLocations: Map<string, string>; // Map<"x,y,f", itemId>
  private items: Map<string, Item>; // Map<itemId, Item>
  private revealedStaticItems: Set<string>; // Set of "x,y,f" for revealed static items
  public lastHitEntityId: string | null; // To track which entity was last hit for flashing effect

  // Public constants for external access
  public readonly MAP_WIDTH = MAP_WIDTH;
  public readonly MAP_HEIGHT = MAP_HEIGHT;
  public readonly NUM_FLOORS = NUM_FLOORS;

  constructor(initialDeaths: number = 0) {
    this.map = new Map();
    this.playerLocation = { x: 0, y: 0, floor: 0 };
    this.playerHealth = PLAYER_MAX_HEALTH;
    this.playerMaxHealth = PLAYER_MAX_HEALTH;
    this.playerDeaths = initialDeaths;
    this.inventory = new Map();
    this.messages = [];
    this.visitedCells = new Set();
    this.searchRadius = INITIAL_SEARCH_RADIUS;
    this.equippedWeapon = null;
    this.equippedShield = null;
    this.equippedAmulet = null;
    this.equippedCompass = null;
    this.currentFloor = 0;
    this.isGameOverFlag = false;
    this.bossDefeated = false;
    this.playerName = "Adventurer"; // Default, will be set by game component
    this.elapsedTime = 0;
    this.lastMoveDirection = "south"; // Initial direction
    this.enemyLocations = new Map();
    this.enemies = new Map();
    this.itemLocations = new Map();
    this.staticItemLocations = new Map();
    this.items = new Map();
    this.revealedStaticItems = new Set();
    this.lastHitEntityId = null;

    this.generateLabyrinth();
    this.placePlayerAtEntrance();
    this.updateVisitedCells();
  }

  // --- Core Game Logic ---

  private generateLabyrinth(): void {
    for (let f = 0; f < NUM_FLOORS; f++) {
      this.generateFloor(f);
    }
    this.connectFloors();
    this.placeItemsAndEnemies();
    this.placeDecorativeElements();
  }

  private generateFloor(floor: number): void {
    const grid: LogicalRoom[][] = Array(MAP_HEIGHT).fill(0).map(() =>
      Array(MAP_WIDTH).fill(0).map(() => ({
        x: 0, y: 0, floor: 0,
        exits: { north: false, south: false, east: false, west: false },
        visited: false, searched: false, hasPlayer: false, hasExit: false, hasEntrance: false,
        hasBoss: false, hasBossEntrance: false, hasBossExit: false,
        hasStairsUp: false, hasStairsDown: false,
        decorativeElements: [],
      }))
    );

    // Initialize rooms with coordinates and floor
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        grid[y][x] = { ...grid[y][x], x, y, floor };
        this.map.set(`${x},${y},${floor}`, grid[y][x]);
      }
    }

    // Simple maze generation (e.g., Randomized Prim's Algorithm)
    const startX = Math.floor(Math.random() * MAP_WIDTH);
    const startY = Math.floor(Math.random() * MAP_HEIGHT);
    const frontier: { x: number; y: number; floor: number; prevX: number; prevY: number; direction: string }[] = [];
    const visited = new Set<string>();

    const addFrontier = (x: number, y: number, prevX: number, prevY: number, direction: string) => {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && !visited.has(`${x},${y},${floor}`)) {
        frontier.push({ x, y, floor, prevX, prevY, direction });
      }
    };

    visited.add(`${startX},${startY},${floor}`);
    addFrontier(startX, startY - 1, startX, startY, "north");
    addFrontier(startX, startY + 1, startX, startY, "south");
    addFrontier(startX - 1, startY, startX, startY, "west");
    addFrontier(startX + 1, startY, startX, startY, "east");

    while (frontier.length > 0) {
      const randomIndex = Math.floor(Math.random() * frontier.length);
      const { x, y, prevX, prevY, direction } = frontier.splice(randomIndex, 1)[0];

      if (visited.has(`${x},${y},${floor}`)) continue;

      visited.add(`${x},${y},${floor}`);

      const currentRoom = this.map.get(`${x},${y},${floor}`);
      const previousRoom = this.map.get(`${prevX},${prevY},${floor}`);

      if (currentRoom && previousRoom) {
        switch (direction) {
          case "north":
            currentRoom.exits.south = true;
            previousRoom.exits.north = true;
            break;
          case "south":
            currentRoom.exits.north = true;
            previousRoom.exits.south = true;
            break;
          case "west":
            currentRoom.exits.east = true;
            previousRoom.exits.west = true;
            break;
          case "east":
            currentRoom.exits.west = true;
            previousRoom.exits.east = true;
            break;
        }
      }

      addFrontier(x, y - 1, x, y, "north");
      addFrontier(x, y + 1, x, y, "south");
      addFrontier(x - 1, y, x, y, "west");
      addFrontier(x + 1, y, x, y, "east");
    }

    // Ensure an entrance and exit for each floor (except final exit)
    const entranceRoom = this.getRandomUnoccupiedRoom(floor);
    if (entranceRoom) {
      entranceRoom.hasEntrance = true;
      if (floor === 0) {
        this.playerLocation = { x: entranceRoom.x, y: entranceRoom.y, floor: entranceRoom.floor };
      }
    }

    const exitRoom = this.getRandomUnoccupiedRoom(floor);
    if (exitRoom) {
      if (floor < NUM_FLOORS - 1) {
        exitRoom.hasStairsDown = true; // Stairs to next floor
      } else {
        exitRoom.hasExit = true; // Final exit
      }
    }

    // Place boss on the last floor
    if (floor === NUM_FLOORS - 1) {
      const bossRoom = this.getRandomUnoccupiedRoom(floor);
      if (bossRoom) {
        bossRoom.hasBoss = true;
        const bossEntrance = this.getRandomUnoccupiedRoom(floor);
        if (bossEntrance) bossEntrance.hasBossEntrance = true;
        const bossExit = this.getRandomUnoccupiedRoom(floor);
        if (bossExit) bossExit.hasBossExit = true;
      }
    }
  }

  private connectFloors(): void {
    for (let f = 0; f < NUM_FLOORS - 1; f++) {
      const roomUp = Array.from(this.map.values()).find(r => r.floor === f && r.hasStairsDown);
      const roomDown = Array.from(this.map.values()).find(r => r.floor === f + 1 && r.hasEntrance);

      if (roomUp && roomDown) {
        roomUp.hasStairsDown = true;
        roomDown.hasStairsUp = true;
        this.messages.push(`Stairs found connecting Floor ${f + 1} and Floor ${f + 2}.`);
      }
    }
  }

  private placeItemsAndEnemies(): void {
    // Define all possible items
    const allItems: Item[] = [
      { id: uuidv4(), name: "Vial of Lumina", description: "Restores a small amount of health.", type: "consumable", effect: "heal", value: 20, stackable: true },
      { id: uuidv4(), name: "Blade of the Labyrinth", description: "A sharp blade, increases attack.", type: "weapon", effect: "damage_boost", value: 10, stackable: false },
      { id: uuidv4(), name: "Aegis of the Guardian", description: "A sturdy shield, increases defense.", type: "shield", effect: "defense_boost", value: 5, stackable: false },
      { id: uuidv4(), name: "Tattered Journal", description: "Contains cryptic notes. Increases search radius.", type: "accessory", effect: "search_boost", value: 1, stackable: false },
      { id: uuidv4(), name: "Pulsating Crystal", description: "A rare crystal, restores a large amount of health.", type: "consumable", effect: "heal", value: 50, stackable: true },
      { id: uuidv4(), name: "Scholar's Amulet", description: "An ancient amulet that slightly boosts all stats.", type: "accessory", effect: "all_boost", value: 2, stackable: false },
      { id: uuidv4(), name: "Enchanted Flask", description: "A flask that slowly regenerates health over time.", type: "consumable", effect: "regen_health", value: 5, stackable: true },
      { id: uuidv4(), name: "Living Water", description: "A rare, glowing liquid that fully restores health.", type: "consumable", effect: "heal", value: 100, stackable: true },
      { id: uuidv4(), name: "Whispering Well's Blessing", description: "A powerful blessing that grants temporary invincibility.", type: "consumable", effect: "invincibility", value: 10, stackable: false },
      { id: uuidv4(), name: "Broken Compass", description: "Points vaguely towards the exit.", type: "accessory", effect: "exit_hint", value: 0, stackable: false },
      { id: uuidv4(), name: "Artisan's Fine Tools", description: "Allows for repairing certain ancient mechanisms.", type: "objective", stackable: false },
      { id: uuidv4(), name: "Prismatic Lens", description: "Reveals hidden details in the environment.", type: "objective", stackable: false },
      { id: uuidv4(), name: "True Compass", description: "Points directly to the current floor's objective.", type: "accessory", effect: "objective_hint", value: 0, stackable: false },
      { id: uuidv4(), name: "Labyrinth Key", description: "A key to unlock the final exit.", type: "key", stackable: false },
      { id: uuidv4(), name: "Heart of the Labyrinth", description: "The core of the labyrinth's power. Defeat the boss to claim it.", type: "objective", stackable: false },
    ];

    // Define static items (interactable environment elements)
    const staticItems: Item[] = [
      { id: uuidv4(), name: "Ancient Mechanism", description: "A complex device. Perhaps it can be repaired?", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Whispering Well", description: "A well of mysterious liquid. What will happen if you drink?", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Hidden Spring", description: "A small, hidden spring. The water looks pure.", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Ancient Repair Bench", description: "A sturdy workbench, perfect for intricate repairs.", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Mysterious Box", description: "A locked box. It might contain something valuable.", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Ancient Altar", description: "An altar with strange carvings. Perhaps an offering is needed?", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Mysterious Staircase", description: "A staircase leading to an unknown destination.", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Grand Riddle of Eternity", description: "A grand inscription with a complex riddle.", type: "static", isStatic: true, isRevealed: false, stackable: false },
      { id: uuidv4(), name: "Triggered Trap", description: "A dangerous trap that has been sprung.", type: "static", isStatic: true, isRevealed: false, stackable: false },
    ];

    // Add all items to the master items map
    [...allItems, ...staticItems].forEach(item => this.items.set(item.id, item));

    // Place items randomly on each floor
    for (let f = 0; f < NUM_FLOORS; f++) {
      // Place regular items
      for (let i = 0; i < 5; i++) { // 5 random items per floor
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        const room = this.getRandomUnoccupiedRoom(f);
        if (room && randomItem) {
          this.itemLocations.set(`${room.x},${room.y},${room.floor}`, randomItem.id);
        }
      }

      // Place static items (fewer, more unique)
      for (let i = 0; i < 2; i++) { // 2 random static items per floor
        const randomStaticItem = staticItems[Math.floor(Math.random() * staticItems.length)];
        const room = this.getRandomUnoccupiedRoom(f);
        if (room && randomStaticItem) {
          this.staticItemLocations.set(`${room.x},${room.y},${room.floor}`, randomStaticItem.id);
        }
      }

      // Place enemies randomly on each floor
      const enemyTypes = [
        { name: "Grumbling Goblin", health: 30, attack: 5, defense: 2, speed: 2000 },
        { name: "Rattling Skeleton", health: 40, attack: 7, defense: 3, speed: 1500 },
        { name: "Whispering Shadow", health: 25, attack: 10, defense: 1, speed: 1000 },
      ];

      const numEnemies = 3 + f * 2; // More enemies on higher floors
      for (let i = 0; i < numEnemies; i++) {
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemyId = uuidv4();
        const newEnemy: Enemy = { id: enemyId, defeated: false, isBoss: false, messages: [], ...enemyType };
        this.enemies.set(enemyId, newEnemy);
        const room = this.getRandomUnoccupiedRoom(f);
        if (room) {
          this.enemyLocations.set(`${room.x},${room.y},${room.floor}`, enemyId);
        }
      }
    }

    // Place the boss on the last floor
    const bossRoom = Array.from(this.map.values()).find(r => r.floor === NUM_FLOORS - 1 && r.hasBoss);
    if (bossRoom) {
      const bossId = uuidv4();
      const boss: Enemy = {
        id: bossId,
        name: "The Watcher of the Core",
        health: PLAYER_MAX_HEALTH * BOSS_HEALTH_MULTIPLIER,
        maxHealth: PLAYER_MAX_HEALTH * BOSS_HEALTH_MULTIPLIER,
        attack: PLAYER_BASE_ATTACK * BOSS_ATTACK_MULTIPLIER,
        defense: PLAYER_BASE_DEFENSE * BOSS_ATTACK_MULTIPLIER,
        speed: 500, // Boss moves faster
        defeated: false,
        isBoss: true,
        messages: [],
      };
      this.enemies.set(bossId, boss);
      this.enemyLocations.set(`${bossRoom.x},${bossRoom.y},${bossRoom.floor}`, bossId);
      this.messages.push("A powerful presence emanates from the final floor...");
    }
  }

  private placeDecorativeElements(): void {
    for (let f = 0; f < NUM_FLOORS; f++) {
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          const room = this.map.get(`${x},${y},${f}`);
          if (room && Math.random() < 0.1) { // 10% chance for a torch
            room.decorativeElements.push({ type: Math.random() < 0.7 ? 'torch_unlit' : 'torch_lit', id: uuidv4() });
          }
        }
      }
    }
  }

  private getRandomUnoccupiedRoom(floor: number): LogicalRoom | undefined {
    const availableRooms = Array.from(this.map.values()).filter(
      room => room.floor === floor &&
        !room.hasPlayer &&
        !room.hasExit &&
        !room.hasEntrance &&
        !room.hasStairsUp &&
        !room.hasStairsDown &&
        !room.hasBoss &&
        !room.hasBossEntrance &&
        !room.hasBossExit &&
        !this.enemyLocations.has(`${room.x},${room.y},${room.floor}`) &&
        !this.itemLocations.has(`${room.x},${room.y},${room.floor}`) &&
        !this.staticItemLocations.has(`${room.x},${room.y},${room.floor}`)
    );
    if (availableRooms.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * availableRooms.length);
    return availableRooms[randomIndex];
  }

  private placePlayerAtEntrance(): void {
    const entrance = Array.from(this.map.values()).find(r => r.hasEntrance && r.floor === 0);
    if (entrance) {
      this.playerLocation = { x: entrance.x, y: entrance.y, floor: entrance.floor };
      entrance.hasPlayer = true;
    } else {
      // Fallback if no entrance found (shouldn't happen with proper generation)
      this.playerLocation = { x: 0, y: 0, floor: 0 };
      const room = this.map.get("0,0,0");
      if (room) room.hasPlayer = true;
    }
  }

  private updateVisitedCells(): void {
    const { x, y, floor } = this.playerLocation;
    for (let dy = -this.searchRadius; dy <= this.searchRadius; dy++) {
      for (let dx = -this.searchRadius; dx <= this.searchRadius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
          this.visitedCells.add(`${nx},${ny},${floor}`);
        }
      }
    }
  }

  // --- Player Actions ---

  move(direction: "north" | "south" | "east" | "west", playerName: string, elapsedTime: number): void {
    if (this.isGameOverFlag) return;

    this.playerName = playerName;
    this.elapsedTime = elapsedTime;

    const currentRoom = this.map.get(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
    if (!currentRoom) return;

    let newX = this.playerLocation.x;
    let newY = this.playerLocation.y;
    let moved = false;

    this.lastMoveDirection = direction; // Update last move direction

    switch (direction) {
      case "north":
        if (currentRoom.exits.north) { newY--; moved = true; }
        break;
      case "south":
        if (currentRoom.exits.south) { newY++; moved = true; }
        break;
      case "east":
        if (currentRoom.exits.east) { newX++; moved = true; }
        break;
      case "west":
        if (currentRoom.exits.west) { newX--; moved = true; }
        break;
    }

    if (moved) {
      currentRoom.hasPlayer = false;
      this.playerLocation = { x: newX, y: newY, floor: this.playerLocation.floor };
      const newRoom = this.map.get(`${newX},${newY},${this.playerLocation.floor}`);
      if (newRoom) {
        newRoom.hasPlayer = true;
        this.updateVisitedCells();
        this.checkRoomForEvents(newRoom);
      }
    } else {
      this.messages.push("You can't go that way.");
    }
  }

  search(): void {
    if (this.isGameOverFlag) return;

    const currentRoom = this.map.get(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
    if (!currentRoom) return;

    if (currentRoom.searched) {
      this.messages.push("You've already thoroughly searched this area.");
      return;
    }

    currentRoom.searched = true;
    this.messages.push("You search the area carefully...");

    let foundSomething = false;

    // Check for items
    const itemCoord = `${currentRoom.x},${currentRoom.y},${currentRoom.floor}`;
    const itemId = this.itemLocations.get(itemCoord);
    if (itemId) {
      const item = this.items.get(itemId);
      if (item) {
        this.addItemToInventory(item);
        this.itemLocations.delete(itemCoord);
        this.messages.push(`You found a ${item.name}!`);
        foundSomething = true;
      }
    }

    // Check for static items (reveal them)
    const staticItemId = this.staticItemLocations.get(itemCoord);
    if (staticItemId) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem && staticItem.isStatic && !this.revealedStaticItems.has(itemCoord)) {
        this.revealedStaticItems.add(itemCoord);
        this.messages.push(`You discovered an ${staticItem.name}.`);
        foundSomething = true;
      }
    }

    // Check for hidden exits/passages (rare)
    if (Math.random() < 0.1) { // 10% chance to find a hidden passage
      const directions = ["north", "south", "east", "west"] as const;
      const unrevealedExits = directions.filter(dir => !currentRoom.exits[dir]);
      if (unrevealedExits.length > 0) {
        const randomDirection = unrevealedExits[Math.floor(Math.random() * unrevealedExits.length)];
        currentRoom.exits[randomDirection] = true;
        this.messages.push(`You found a hidden passage to the ${randomDirection}!`);
        foundSomething = true;
      }
    }

    if (!foundSomething) {
      this.messages.push("You found nothing new.");
    }
  }

  interact(playerName: string, elapsedTime: number): void {
    if (this.isGameOverFlag) return;

    this.playerName = playerName;
    this.elapsedTime = elapsedTime;

    const currentRoom = this.map.get(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
    if (!currentRoom) return;

    let interacted = false;

    // Check for static items to interact with
    const itemCoord = `${currentRoom.x},${currentRoom.y},${currentRoom.floor}`;
    const staticItemId = this.staticItemLocations.get(itemCoord);
    if (staticItemId && this.revealedStaticItems.has(itemCoord)) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem) {
        this.handleStaticItemInteraction(staticItem);
        interacted = true;
      }
    }

    // Check for stairs
    if (currentRoom.hasStairsDown) {
      this.messages.push(`You descend to Floor ${this.currentFloor + 2}.`);
      this.currentFloor++;
      this.playerLocation.floor = this.currentFloor;
      this.updateVisitedCells();
      interacted = true;
    } else if (currentRoom.hasStairsUp) {
      this.messages.push(`You ascend to Floor ${this.currentFloor}.`);
      this.currentFloor--;
      this.playerLocation.floor = this.currentFloor;
      this.updateVisitedCells();
      interacted = true;
    } else if (currentRoom.hasExit) {
      // Final exit
      if (this.hasItem("Labyrinth Key")) {
        this.messages.push("You use the Labyrinth Key to unlock the final exit!");
        this.isGameOverFlag = true;
        this.bossDefeated = true; // Consider escaping as a victory
        interacted = true;
      } else {
        this.messages.push("The final exit is locked. You need a Labyrinth Key.");
      }
    } else if (currentRoom.hasBossEntrance) {
      this.messages.push("You stand before the entrance to the boss's lair. Prepare yourself!");
      // Potentially trigger a mini-cutscene or a warning before moving to boss room
      interacted = true;
    } else if (currentRoom.hasBossExit) {
      this.messages.push("You found an exit from the boss's lair.");
      // Allow player to leave boss room
      interacted = true;
    }

    if (!interacted) {
      this.messages.push("There's nothing to interact with here.");
    }
  }

  private handleStaticItemInteraction(item: Item): void {
    switch (item.name) {
      case "Ancient Mechanism":
        if (this.hasItem("Artisan's Fine Tools")) {
          this.messages.push("You use the Artisan's Fine Tools to repair the Ancient Mechanism. A hidden passage opens!");
          // Example: Open a random hidden passage
          const currentRoom = this.map.get(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
          if (currentRoom) {
            const directions = ["north", "south", "east", "west"] as const;
            const unrevealedExits = directions.filter(dir => !currentRoom.exits[dir]);
            if (unrevealedExits.length > 0) {
              const randomDirection = unrevealedExits[Math.floor(Math.random() * unrevealedExits.length)];
              currentRoom.exits[randomDirection] = true;
            }
          }
          this.staticItemLocations.delete(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`); // Mechanism is used up
          this.revealedStaticItems.delete(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
        } else {
          this.messages.push("The Ancient Mechanism is broken. Perhaps some tools could fix it?");
        }
        break;
      case "Whispering Well":
        this.messages.push("You drink from the Whispering Well. You feel invigorated!");
        this.playerHealth = this.playerMaxHealth;
        break;
      case "Hidden Spring":
        this.messages.push("You drink from the Hidden Spring. Your search radius temporarily increases!");
        this.searchRadius = Math.min(MAX_SEARCH_RADIUS, this.searchRadius + 1);
        break;
      case "Mysterious Box":
        this.messages.push("You open the Mysterious Box. It contains a 'Labyrinth Key'!");
        const keyItem = this.items.get(Array.from(this.items.values()).find(i => i.name === "Labyrinth Key")?.id || '');
        if (keyItem) this.addItemToInventory(keyItem);
        this.staticItemLocations.delete(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
        this.revealedStaticItems.delete(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
        break;
      case "Ancient Altar":
        this.messages.push("You approach the Ancient Altar. A faint glow emanates from it.");
        // Could be a puzzle or a buff/debuff
        break;
      case "Mysterious Staircase":
        this.messages.push("You found a mysterious staircase. It seems to lead to a secret area!");
        // Could lead to a bonus room or a shortcut
        break;
      case "Grand Riddle of Eternity":
        this.messages.push("You read the Grand Riddle of Eternity. It speaks of 'The Heart of the Labyrinth'.");
        // Hint for the main objective
        break;
      case "Triggered Trap":
        this.messages.push("You interact with the triggered trap. It seems to be disarmed now, but you took some damage from its residual energy!");
        this.takeDamage(10, "a disarmed trap");
        this.staticItemLocations.delete(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
        this.revealedStaticItems.delete(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
        break;
      default:
        this.messages.push(`You interact with the ${item.name}. Nothing happens.`);
        break;
    }
  }

  useItem(itemId: string, playerName: string, elapsedTime: number): void {
    if (this.isGameOverFlag) return;

    this.playerName = playerName;
    this.elapsedTime = elapsedTime;

    const inventoryEntry = this.inventory.get(itemId);
    if (!inventoryEntry) {
      this.messages.push("You don't have that item.");
      return;
    }

    const item = inventoryEntry.item;

    // Handle unequipping
    if (item.isEquipped) {
      this.unequipItem(item);
      this.messages.push(`You unequipped ${item.name}.`);
      return;
    }

    switch (item.type) {
      case "consumable":
        this.applyConsumableEffect(item);
        if (inventoryEntry.quantity > 1) {
          inventoryEntry.quantity--;
        } else {
          this.inventory.delete(itemId);
        }
        this.messages.push(`You used ${item.name}.`);
        break;
      case "weapon":
      case "shield":
      case "accessory":
        this.equipItem(item);
        this.messages.push(`You equipped ${item.name}.`);
        break;
      default:
        this.messages.push(`You can't use ${item.name} right now.`);
        break;
    }
  }

  private applyConsumableEffect(item: Item): void {
    switch (item.effect) {
      case "heal":
        this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + (item.value || 0));
        this.messages.push(`You healed for ${item.value} health. Current health: ${this.playerHealth}`);
        break;
      case "regen_health":
        this.messages.push("You feel a warm sensation. Your health will slowly regenerate.");
        // Implement regeneration logic (e.g., a temporary buff)
        break;
      case "invincibility":
        this.messages.push("You are temporarily invincible!");
        // Implement invincibility logic (e.g., a temporary buff)
        break;
      default:
        this.messages.push(`Using ${item.name} had no discernible effect.`);
        break;
    }
  }

  private equipItem(item: Item): void {
    // Unequip existing item of the same type
    switch (item.type) {
      case "weapon":
        if (this.equippedWeapon) this.equippedWeapon.isEquipped = false;
        this.equippedWeapon = item;
        break;
      case "shield":
        if (this.equippedShield) this.equippedShield.isEquipped = false;
        this.equippedShield = item;
        break;
      case "accessory":
        // Special handling for compass vs other accessories
        if (item.name.includes("Compass")) {
          if (this.equippedCompass) this.equippedCompass.isEquipped = false;
          this.equippedCompass = item;
        } else {
          if (this.equippedAmulet) this.equippedAmulet.isEquipped = false;
          this.equippedAmulet = item;
        }
        break;
    }
    item.isEquipped = true;
  }

  private unequipItem(item: Item): void {
    item.isEquipped = false;
    switch (item.type) {
      case "weapon":
        if (this.equippedWeapon?.id === item.id) this.equippedWeapon = null;
        break;
      case "shield":
        if (this.equippedShield?.id === item.id) this.equippedShield = null;
        break;
      case "accessory":
        if (this.equippedAmulet?.id === item.id) this.equippedAmulet = null;
        if (this.equippedCompass?.id === item.id) this.equippedCompass = null;
        break;
    }
  }

  // --- Combat & Enemy Logic ---

  processEnemyMovement(playerName: string, elapsedTime: number): void {
    if (this.isGameOverFlag) return;

    this.playerName = playerName;
    this.elapsedTime = elapsedTime;

    const playerCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`;

    // Create a temporary map for new enemy positions to avoid conflicts
    const newEnemyLocations = new Map<string, string>();
    const movedEnemyIds = new Set<string>();

    for (const [coordStr, enemyId] of this.enemyLocations.entries()) {
      const [ex, ey, ef] = coordStr.split(',').map(Number);
      if (ef !== this.playerLocation.floor) {
        newEnemyLocations.set(coordStr, enemyId); // Keep enemies on other floors in place
        continue;
      }

      const enemy = this.enemies.get(enemyId);
      if (!enemy || enemy.defeated || movedEnemyIds.has(enemyId)) {
        newEnemyLocations.set(coordStr, enemyId);
        continue;
      }

      // Simple AI: move towards the player if within a certain range
      const distance = Math.abs(ex - this.playerLocation.x) + Math.abs(ey - this.playerLocation.y);
      if (distance <= this.searchRadius + 2) { // Enemies react if player is somewhat close
        let targetX = ex;
        let targetY = ey;

        if (this.playerLocation.x > ex) targetX++;
        else if (this.playerLocation.x < ex) targetX--;

        if (this.playerLocation.y > ey) targetY++;
        else if (this.playerLocation.y < ey) targetY--;

        const newCoordStr = `${targetX},${targetY},${ef}`;
        const targetRoom = this.map.get(newCoordStr);

        // Check if the target room is valid and not occupied by another enemy
        if (targetRoom && !this.enemyLocations.has(newCoordStr) && !newEnemyLocations.has(newCoordStr)) {
          // Check if there's an actual path (simple check for now)
          const currentRoom = this.map.get(coordStr);
          if (currentRoom) {
            let canMove = false;
            if (targetX > ex && currentRoom.exits.east) canMove = true;
            if (targetX < ex && currentRoom.exits.west) canMove = true;
            if (targetY > ey && currentRoom.exits.south) canMove = true;
            if (targetY < ey && currentRoom.exits.north) canMove = true;

            if (canMove) {
              newEnemyLocations.set(newCoordStr, enemyId);
              movedEnemyIds.add(enemyId);
              // If enemy moves into player's square, initiate combat
              if (newCoordStr === playerCoord) {
                this.initiateCombat(enemy);
              }
              continue; // Enemy moved, go to next
            }
          }
        }
      }
      // If enemy didn't move or couldn't, keep its current position
      newEnemyLocations.set(coordStr, enemyId);
    }
    this.enemyLocations = newEnemyLocations; // Update with new positions

    // After all enemies moved, check for combat if player is on an enemy square
    const enemyIdOnPlayerSquare = this.enemyLocations.get(playerCoord);
    if (enemyIdOnPlayerSquare && !movedEnemyIds.has(enemyIdOnPlayerSquare)) {
      const enemy = this.enemies.get(enemyIdOnPlayerSquare);
      if (enemy && !enemy.defeated) {
        this.initiateCombat(enemy);
      }
    }
  }

  processBossLogic(): void {
    if (this.isGameOverFlag || this.bossDefeated) return;

    const bossRoom = Array.from(this.map.values()).find(r => r.floor === NUM_FLOORS - 1 && r.hasBoss);
    if (!bossRoom) return;

    const bossCoord = `${bossRoom.x},${bossRoom.y},${bossRoom.floor}`;
    const bossId = this.enemyLocations.get(bossCoord);
    if (!bossId) return;

    const boss = this.enemies.get(bossId);
    if (!boss || boss.defeated) return;

    // If player is in the boss room, initiate combat
    if (this.playerLocation.x === bossRoom.x && this.playerLocation.y === bossRoom.y && this.playerLocation.floor === bossRoom.floor) {
      this.initiateCombat(boss);
    } else {
      // Boss might have other effects even if player is not in the room
      // e.g., global debuffs, spawning minions, sending messages
      if (Math.random() < 0.05) { // 5% chance to send a message
        this.messages.push("A chilling roar echoes through the labyrinth...");
      }
    }
  }

  private initiateCombat(enemy: Enemy): void {
    if (enemy.defeated) return;

    this.messages.push(`You are attacked by a ${enemy.name}!`);

    // Player attacks first
    const playerDamage = Math.max(0, this.getCurrentAttackDamage() - enemy.defense);
    enemy.health -= playerDamage;
    this.lastHitEntityId = enemy.id; // Set for flashing
    this.messages.push(`You hit the ${enemy.name} for ${playerDamage} damage.`);

    if (enemy.health <= 0) {
      enemy.health = 0;
      enemy.defeated = true;
      this.messages.push(`You defeated the ${enemy.name}!`);
      if (enemy.isBoss) {
        this.bossDefeated = true;
        this.messages.push("The Watcher of the Core falls! The Labyrinth trembles...");
        // Add Labyrinth Key to inventory upon boss defeat
        const keyItem = this.items.get(Array.from(this.items.values()).find(i => i.name === "Labyrinth Key")?.id || '');
        if (keyItem) this.addItemToInventory(keyItem);
      }
      // Remove enemy from map
      const enemyCoord = Array.from(this.enemyLocations.entries()).find(([, id]) => id === enemy.id)?.[0];
      if (enemyCoord) {
        this.enemyLocations.delete(enemyCoord);
      }
      return;
    }

    // Enemy retaliates
    const enemyDamage = Math.max(0, enemy.attack - this.getCurrentDefense());
    this.takeDamage(enemyDamage, enemy.name);
    this.lastHitEntityId = 'player'; // Set for flashing
  }

  takeDamage(amount: number, source: string): void {
    this.playerHealth -= amount;
    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      this.isGameOverFlag = true;
      this.causeOfDeath = `Defeated by ${source}`;
      this.messages.push(`You were defeated by ${source}!`);
      this.playerDeaths++; // Increment deaths when player health drops to 0
    } else {
      this.messages.push(`You took ${amount} damage from ${source}. Health: ${this.playerHealth}`);
    }
  }

  revivePlayer(): void {
    // Deaths are now incremented when health drops to 0, not on revive.
    this.playerHealth = this.playerMaxHealth;
    this.isGameOverFlag = false;
    this.causeOfDeath = undefined;
    this.messages.push("You feel a surge of energy as you are brought back from the brink.");
    // Reset player location to a safe spot, e.g., the entrance of the current floor
    const entrance = Array.from(this.map.values()).find(r => r.hasEntrance && r.floor === this.currentFloor);
    if (entrance) {
      this.playerLocation = { x: entrance.x, y: entrance.y, floor: entrance.floor };
    } else {
      // Fallback to a random room on the current floor if no entrance is found
      const randomRoom = this.getRandomUnoccupiedRoom(this.currentFloor);
      if (randomRoom) {
        this.playerLocation = { x: randomRoom.x, y: randomRoom.y, floor: randomRoom.floor };
      } else {
        this.playerLocation = { x: 0, y: 0, floor: this.currentFloor }; // Last resort
      }
    }
    this.updateVisitedCells();
    this.clearLastHit();
  }

  // --- Utility Methods ---

  private checkRoomForEvents(room: LogicalRoom): void {
    // Check for items to pick up automatically (e.g., keys, quest items)
    const itemCoord = `${room.x},${room.y},${room.floor}`;
    const itemId = this.itemLocations.get(itemCoord);
    if (itemId) {
      const item = this.items.get(itemId);
      if (item && (item.type === 'key' || item.type === 'objective')) {
        this.addItemToInventory(item);
        this.itemLocations.delete(itemCoord);
        this.messages.push(`You automatically picked up a ${item.name}!`);
      }
    }
  }

  addItemToInventory(item: Item, quantity: number = 1): void {
    const existingEntry = this.inventory.get(item.id);
    if (existingEntry && item.stackable) {
      existingEntry.quantity += quantity;
    } else {
      this.inventory.set(item.id, { item: { ...item }, quantity }); // Store a copy
    }
  }

  hasItem(itemName: string): boolean {
    return Array.from(this.inventory.values()).some(entry => entry.item.name === itemName);
  }

  getMessages(): string[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  getMapGrid(): LogicalRoom[][] {
    const grid: LogicalRoom[][] = Array(MAP_HEIGHT).fill(0).map(() =>
      Array(MAP_WIDTH).fill(0).map(() => ({
        x: 0, y: 0, floor: 0,
        exits: { north: false, south: false, east: false, west: false },
        visited: false, searched: false, hasPlayer: false, hasExit: false, hasEntrance: false,
        hasBoss: false, hasBossEntrance: false, hasBossExit: false,
        hasStairsUp: false, hasStairsDown: false,
        decorativeElements: [],
      }))
    );

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const room = this.map.get(`${x},${y},${this.currentFloor}`);
        if (room) {
          grid[y][x] = { ...room };
          grid[y][x].hasPlayer = (x === this.playerLocation.x && y === this.playerLocation.y && this.currentFloor === this.playerLocation.floor);
          grid[y][x].visited = this.visitedCells.has(`${x},${y},${this.currentFloor}`);
        }
      }
    }
    return grid;
  }

  getPlayerLocation(): { x: number; y: number; floor: number } {
    return { ...this.playerLocation };
  }

  getPlayerHealth(): number {
    return this.playerHealth;
  }

  getPlayerMaxHealth(): number {
    return this.playerMaxHealth;
  }

  getPlayerDeaths(): number {
    return this.playerDeaths;
  }

  getVisitedCells(): Set<string> {
    return new Set(Array.from(this.visitedCells).filter(coord => coord.endsWith(`,${this.currentFloor}`)));
  }

  getSearchRadius(): number {
    let radius = INITIAL_SEARCH_RADIUS;
    if (this.equippedAmulet?.effect === "search_boost") {
      radius += (this.equippedAmulet.value || 0);
    }
    if (this.hasItem("Prismatic Lens")) { // Example: Prismatic Lens also boosts search
      radius += 1;
    }
    return Math.min(MAX_SEARCH_RADIUS, radius);
  }

  getEquippedWeapon(): Item | null {
    return this.equippedWeapon;
  }

  getEquippedShield(): Item | null {
    return this.equippedShield;
  }

  getEquippedAmulet(): Item | null {
    return this.equippedAmulet;
  }

  getEquippedCompass(): Item | null {
    return this.equippedCompass;
  }

  getInventoryItems(): { item: Item; quantity: number }[] {
    return Array.from(this.inventory.values());
  }

  getCurrentAttackDamage(): number {
    let damage = PLAYER_BASE_ATTACK;
    if (this.equippedWeapon?.effect === "damage_boost") {
      damage += (this.equippedWeapon.value || 0);
    }
    if (this.equippedAmulet?.effect === "all_boost") {
      damage += (this.equippedAmulet.value || 0);
    }
    return damage;
  }

  getCurrentDefense(): number {
    let defense = PLAYER_BASE_DEFENSE;
    if (this.equippedShield?.effect === "defense_boost") {
      defense += (this.equippedShield.value || 0);
    }
    if (this.equippedAmulet?.effect === "all_boost") {
      defense += (this.equippedAmulet.value || 0);
    }
    return defense;
  }

  getCurrentFloor(): number {
    return this.currentFloor;
  }

  isGameOver(): boolean {
    return this.isGameOverFlag;
  }

  getGameResult(): GameResult | null {
    if (this.isGameOverFlag || this.bossDefeated) {
      return {
        type: this.bossDefeated ? 'victory' : 'defeat',
        name: this.playerName,
        time: this.elapsedTime,
        deaths: this.playerDeaths,
        causeOfDeath: this.causeOfDeath,
      };
    }
    return null;
  }

  isBossDefeated(): boolean {
    return this.bossDefeated;
  }

  getEnemy(enemyId: string): Enemy | undefined {
    return this.enemies.get(enemyId);
  }

  getItem(itemId: string): Item {
    return this.items.get(itemId)!;
  }

  getRevealedStaticItems(): Set<string> {
    return this.revealedStaticItems;
  }

  clearLastHit(): void {
    this.lastHitEntityId = null;
  }

  getDecorativeElements(): Map<string, string> {
    const elements = new Map<string, string>();
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const room = this.map.get(`${x},${y},${this.currentFloor}`);
        if (room && room.decorativeElements.length > 0) {
          room.decorativeElements.forEach(deco => {
            elements.set(`${x},${y},${this.currentFloor}-${deco.id}`, deco.type);
          });
        }
      }
    }
    return elements;
  }

  getCurrentFloorObjective(): Objective {
    if (this.currentFloor === 0) {
      return {
        description: [
          "Find the stairs down to Floor 2.",
          "Explore the floor to find useful items.",
          "Defeat any enemies that stand in your way."
        ],
        isCompleted: () => {
          const currentRoom = this.map.get(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
          return currentRoom?.hasStairsDown && this.playerLocation.floor === 0;
        }
      };
    } else if (this.currentFloor === 1) {
      return {
        description: [
          "Find the stairs down to Floor 3.",
          "Locate the 'Artisan's Fine Tools' to repair the Ancient Mechanism.",
          "Be wary of stronger enemies."
        ],
        isCompleted: () => {
          const currentRoom = this.map.get(`${this.playerLocation.x},${this.playerLocation.y},${this.playerLocation.floor}`);
          return currentRoom?.hasStairsDown && this.playerLocation.floor === 1 && this.hasItem("Artisan's Fine Tools");
        }
      };
    } else if (this.currentFloor === NUM_FLOORS - 1) {
      return {
        description: [
          "Locate and defeat 'The Watcher of the Core'.",
          "Obtain the 'Labyrinth Key' from the boss.",
          "Find the final exit to escape the Labyrinth."
        ],
        isCompleted: () => this.isBossDefeated() && this.hasItem("Labyrinth Key")
      };
    }
    return {
      description: ["Survive and find the next objective."],
      isCompleted: () => false
    };
  }
}