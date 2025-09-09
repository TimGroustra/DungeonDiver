export type Coordinate = { x: number; y: number };

export class LogicalRoom {
  id: string;
  name: string;
  description: string;
  items: Item[];
  enemies: Enemy[];
  puzzles: Puzzle[];
  exits: { [key: string]: Coordinate }; // Stores coordinates of adjacent rooms

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.items = [];
    this.enemies = [];
    this.puzzles = [];
    this.exits = {};
  }

  addItem(item: Item) {
    this.items.push(item);
  }

  removeItem(itemId: string): Item | undefined {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index > -1) {
      return this.items.splice(index, 1)[0];
    }
    return undefined;
  }

  addEnemy(enemy: Enemy) {
    this.enemies.push(enemy);
  }

  addPuzzle(puzzle: Puzzle) {
    this.puzzles.push(puzzle);
  }
}

export class Item {
  id: string;
  name: string;
  description: string;
  isStatic: boolean; // If true, item is part of the room's fixed features, not picked up
  type: 'consumable' | 'weapon' | 'shield' | 'key' | 'artifact' | 'static' | 'generic' | 'quest' | 'accessory'; // Added 'accessory' type
  effectValue?: number; // e.g., health restore amount, attack bonus, defense bonus
  stackable: boolean; // New: Can this item stack in inventory?

  constructor(
    id: string,
    name: string,
    description: string,
    isStatic: boolean = false,
    type: 'consumable' | 'weapon' | 'shield' | 'key' | 'artifact' | 'static' | 'generic' | 'quest' | 'accessory' = 'generic',
    effectValue?: number,
    stackable: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.isStatic = isStatic;
    this.type = type;
    this.effectValue = effectValue;
    this.stackable = stackable;
  }
}

export class Enemy {
  id: string;
  name: string;
  description: string;
  health: number;
  defeated: boolean;
  isAggro: boolean;
  attackDamage: number;

  constructor(id: string, name: string, description: string, health: number = 1, attackDamage: number = 5) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.health = health;
    this.defeated = false;
    this.isAggro = false;
    this.attackDamage = attackDamage;
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.defeated = true;
    }
  }
}

export class Puzzle {
  id: string;
  name: string;
  description: string;
  solution: string;
  solved: boolean;
  reward?: Item;

  constructor(id: string, name: string, description: string, solution: string, reward?: Item) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.solution = solution;
    this.solved = false;
    this.reward = reward;
  }

  solve(attempt: string): boolean {
    if (attempt.toLowerCase() === this.solution.toLowerCase()) {
      this.solved = true;
      return true;
    }
    return false;
  }
}

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  center: Coordinate;
}

// Updated GameResult interface to include causeOfDeath
interface GameResult {
  type: 'victory' | 'defeat';
  name: string;
  time: number;
  causeOfDeath?: string; // Optional cause of death for defeat
}

export class Labyrinth {
  private floors: Map<number, (LogicalRoom | 'wall')[][]>; // Map of floor number to its grid
  private playerLocation: Coordinate;
  private currentFloor: number; // New: Current floor the player is on
  private playerHealth: number;
  private playerMaxHealth: number;
  private baseAttackDamage: number;
  private baseDefense: number;
  private equippedWeapon: Item | undefined;
  private equippedShield: Item | undefined;
  private equippedAmulet: Item | undefined; // New: For Scholar's Amulet
  private equippedCompass: Item | undefined; // New: For True Compass
  private inventory: Map<string, { item: Item, quantity: number }>; // Changed to Map for stacking/unique items
  private messages: string[];
  private gameOver: boolean;
  private visitedCells: Map<number, Set<string>>; // Stores "x,y" strings of visited cells per floor
  public enemyLocations: Map<string, string>; // "x,y,floor" -> enemyId
  public puzzleLocations: Map<string, string>; // "x,y,floor" -> puzzleId
  public itemLocations: Map<string, string>; // "x,y,floor" -> itemId (for visible items)
  public staticItemLocations: Map<string, string>; // "x,y,floor" -> itemId (for hidden/static items)
  public revealedStaticItems: Set<string>; // Stores "x,y,floor" strings of revealed static items
  public trapsLocations: Map<string, boolean>; // "x,y,floor" -> true for trap locations
  public triggeredTraps: Set<string>; // Stores "x,y,floor" strings of triggered traps
  public enemies: Map<string, Enemy>;
  public puzzles: Map<string, Puzzle>;
  public items: Map<string, Item>;
  private floorObjectives: Map<number, { description: string; isCompleted: () => boolean; }>; // New: Objectives per floor
  public floorExitStaircases: Map<number, Coordinate>; // New: Location of the staircase to the next floor
  public lastMoveDirection: "north" | "south" | "east" | "west" = "north"; // New: Track last move direction
  public lastHitEntityId: string | null = null; // For flash effect

  // New quest-related states
  private scholarAmuletQuestCompleted: boolean;
  private whisperingWellQuestCompleted: boolean;
  private trueCompassQuestCompleted: boolean;
  private labyrinthKeyFound: boolean; // New: For Floor 4 quest
  private mysteriousBoxOpened: boolean; // New: For Floor 4 quest
  private heartOfLabyrinthObtained: boolean; // New: For Floor 4 quest
  private heartSacrificed: boolean; // New: For Floor 4 quest

  private baseSearchRadius: number; // Base search radius
  private lastEnemyMoveTimestamp: number; // Timestamp for enemy movement on Floor 4

  // Watcher of the Core Boss specific states
  public watcherOfTheCore: Enemy | undefined;
  public watcherLocation: Coordinate | undefined;
  private bossState: 'red_light' | 'green_light';
  private lastBossStateChange: number;
  private isRedLightPulseActive: boolean; // Flag for current pulse
  private playerStunnedTurns: number; // How many turns player is stunned/misdirected
  private bossDefeated: boolean;
  public bossPassageCoords: Set<string>; // Coordinates of the boss's "passage"

  private readonly MAP_WIDTH = 100; // Increased map width
  private readonly MAP_HEIGHT = 100; // Increased map height
  public readonly NUM_FLOORS = 4; // Increased to 4 floors
  private readonly MIN_ELEMENT_DISTANCE = 3; // Decreased minimum distance between placed elements

  // New constants for map generation
  private readonly MIN_ROOM_SIZE = 5;
  private readonly MAX_ROOM_SIZE = 15;
  private readonly NUM_ROOMS_PER_FLOOR = 15; // Number of rooms per floor
  private readonly CORRIDOR_WIDTH = 3; // Width of corridors - CHANGED TO 3

  private gameResult: GameResult | null = null; // New: Stores game result

  constructor() {
    this.floors = new Map();
    this.playerLocation = { x: 0, y: 0 };
    this.currentFloor = 0; // Start on floor 0
    this.playerHealth = 100;
    this.playerMaxHealth = 100;
    this.baseAttackDamage = 10;
    this.baseDefense = 0;
    this.equippedWeapon = undefined;
    this.equippedShield = undefined;
    this.equippedAmulet = undefined; // Initialize new equipped slot
    this.equippedCompass = undefined; // Initialize new equipped slot
    this.inventory = new Map(); // Initialize as a Map
    this.messages = [];
    this.gameOver = false;
    this.visitedCells = new Map();
    this.enemyLocations = new Map();
    this.puzzleLocations = new Map();
    this.itemLocations = new Map();
    this.staticItemLocations = new Map();
    this.revealedStaticItems = new Set<string>();
    this.trapsLocations = new Map();
    this.triggeredTraps = new Set<string>(); // Initialize new set for triggered traps
    this.enemies = new Map();
    this.puzzles = new Map();
    this.items = new Map();
    this.floorObjectives = new Map();
    this.floorExitStaircases = new Map();

    // Initialize new quest states
    this.scholarAmuletQuestCompleted = false;
    this.whisperingWellQuestCompleted = false;
    this.trueCompassQuestCompleted = false;
    this.labyrinthKeyFound = false;
    this.mysteriousBoxOpened = false;
    this.heartOfLabyrinthObtained = false;
    this.heartSacrificed = false;

    this.baseSearchRadius = 2; // Initial base search radius
    this.lastEnemyMoveTimestamp = 0;

    // Watcher of the Core Boss specific initializations
    this.watcherOfTheCore = undefined;
    this.watcherLocation = undefined;
    this.bossState = 'green_light'; // Starts not watching
    this.lastBossStateChange = Date.now();
    this.isRedLightPulseActive = false;
    this.playerStunnedTurns = 0;
    this.bossDefeated = false;
    this.bossPassageCoords = new Set<string>(); // Initialize here, will be populated in initializeLabyrinth

    this.initializeLabyrinth();
    this.addMessage(`Welcome, brave adventurer, to the Labyrinth of Whispers! You are on Floor ${this.currentFloor + 1}.`);
    this.addMessage(this.getCurrentFloorObjective().description);
    this.markVisited(this.playerLocation);
  }

  private initializeLabyrinth() {
    for (let floor = 0; floor < this.NUM_FLOORS; floor++) {
      const floorMap: (LogicalRoom | 'wall')[][] = Array(this.MAP_HEIGHT)
        .fill(null)
        .map(() => Array(this.MAP_WIDTH).fill('wall'));

      const rooms: Room[] = this._generateRooms(floorMap, floor);
      this._connectRoomsWithMST(floorMap, rooms, floor);
      this._addExtraConnections(floorMap, rooms, floor, 5); // Add 5 extra connections for loops

      // Ensure all carved paths are LogicalRoom instances
      for (let y = 0; y < this.MAP_HEIGHT; y++) {
        for (let x = 0; x < this.MAP_WIDTH; x++) {
          if (floorMap[y][x] === 'open') { // 'open' is a temporary state during generation
            floorMap[y][x] = new LogicalRoom(`room-${x}-${y}-f${floor}`, `Labyrinth Path ${x},${y} (Floor ${floor + 1})`, this.getRandomRoomDescription());
          }
        }
      }

      // Place player start and floor exit
      this._placeStartAndExit(floorMap, floor, rooms);

      // Handle boss passage for the last floor
      if (floor === this.NUM_FLOORS - 1) {
        this._placeBossArea(floorMap, floor, rooms);
      }

      this.floors.set(floor, floorMap);
      this.visitedCells.set(floor, new Set<string>()); // Initialize visited cells for each floor
      this.addGameElements(floor);
    }
  }

  private _generateRooms(floorMap: (LogicalRoom | 'wall')[][], floor: number): Room[] {
    const rooms: Room[] = [];
    let attempts = 0;
    const MAX_ROOM_ATTEMPTS = 500; // Prevent infinite loops

    while (rooms.length < this.NUM_ROOMS_PER_FLOOR && attempts < MAX_ROOM_ATTEMPTS) {
      const width = Math.floor(Math.random() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE + 1)) + this.MIN_ROOM_SIZE;
      const height = Math.floor(Math.random() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE + 1)) + this.MIN_ROOM_SIZE;
      const x = Math.floor(Math.random() * (this.MAP_WIDTH - width));
      const y = Math.floor(Math.random() * (this.MAP_HEIGHT - height));

      const newRoom: Room = { x, y, width, height, id: `room-${rooms.length}-f${floor}`, center: { x: x + Math.floor(width / 2), y: y + Math.floor(height / 2) } };

      if (this._isValidRoomPlacement(floorMap, newRoom, rooms)) {
        rooms.push(newRoom);
        // Carve out the room
        for (let ry = y; ry < y + height; ry++) {
          for (let rx = x; rx < x + width; rx++) {
            floorMap[ry][rx] = 'open'; // Temporarily mark as open
          }
        }
      }
      attempts++;
    }
    return rooms;
  }

  private _isValidRoomPlacement(floorMap: (LogicalRoom | 'wall')[][], newRoom: Room, existingRooms: Room[]): boolean {
    // Check map boundaries
    if (newRoom.x < 0 || newRoom.x + newRoom.width > this.MAP_WIDTH ||
        newRoom.y < 0 || newRoom.y + newRoom.height > this.MAP_HEIGHT) {
      return false;
    }

    // Check for overlap with existing rooms (with a small buffer)
    const buffer = this.CORRIDOR_WIDTH; // Minimum buffer between rooms and corridors - CHANGED
    for (const room of existingRooms) {
      if (newRoom.x < room.x + room.width + buffer &&
          newRoom.x + newRoom.width > room.x - buffer &&
          newRoom.y < room.y + room.height + buffer &&
          newRoom.y + newRoom.height > room.y - buffer) {
        return false; // Overlaps
      }
    }
    return true;
  }

  private _connectRoomsWithMST(floorMap: (LogicalRoom | 'wall')[][], rooms: Room[], floor: number) {
    if (rooms.length <= 1) return;

    const numRooms = rooms.length;
    const minCostEdge: number[] = Array(numRooms).fill(Infinity);
    const parent: (number | null)[] = Array(numRooms).fill(null);
    const inMST: boolean[] = Array(numRooms).fill(false);

    minCostEdge[0] = 0; // Start with the first room

    for (let count = 0; count < numRooms - 1; count++) {
      let u = -1;
      let min = Infinity;

      // Find vertex with minimum key value, from the set of vertices not yet included in MST
      for (let v = 0; v < numRooms; v++) {
        if (!inMST[v] && minCostEdge[v] < min) {
          min = minCostEdge[v];
          u = v;
        }
      }

      if (u === -1) break; // No reachable unvisited vertex
      inMST[u] = true;

      // Update key value and parent index of the adjacent vertices of the picked vertex.
      for (let v = 0; v < numRooms; v++) {
        if (u !== v && !inMST[v]) {
          const dist = this._getDistance(rooms[u].center, rooms[v].center);
          if (dist < minCostEdge[v]) {
            minCostEdge[v] = dist;
            parent[v] = u;
          }
        }
      }
    }

    // Carve corridors based on the MST
    for (let i = 1; i < numRooms; i++) {
      if (parent[i] !== null) {
        this._carveCorridor(floorMap, rooms[i].center, rooms[parent[i]!].center);
      }
    }
  }

  private _addExtraConnections(floorMap: (LogicalRoom | 'wall')[][], rooms: Room[], floor: number, numConnections: number) {
    if (rooms.length < 2) return;

    for (let i = 0; i < numConnections; i++) {
      const room1Index = Math.floor(Math.random() * rooms.length);
      let room2Index = Math.floor(Math.random() * rooms.length);
      while (room1Index === room2Index) { // Ensure different rooms
        room2Index = Math.floor(Math.random() * rooms.length);
      }
      this._carveCorridor(floorMap, rooms[room1Index].center, rooms[room2Index].center);
    }
  }

  private _getDistance(coord1: Coordinate, coord2: Coordinate): number {
    return Math.abs(coord1.x - coord2.x) + Math.abs(coord1.y - coord2.y); // Manhattan distance
  }

  private _carveCorridor(floorMap: (LogicalRoom | 'wall')[][], start: Coordinate, end: Coordinate) {
    let x = start.x;
    let y = start.y;

    const halfWidth = Math.floor(this.CORRIDOR_WIDTH / 2);

    while (x !== end.x || y !== end.y) {
      // Carve a square around the current point
      for (let cy = y - halfWidth; cy <= y + halfWidth; cy++) {
        for (let cx = x - halfWidth; cx <= x + halfWidth; cx++) {
          if (cx >= 0 && cx < this.MAP_WIDTH && cy >= 0 && cy < this.MAP_HEIGHT) {
            floorMap[cy][cx] = 'open';
          }
        }
      }

      // Move towards the end point
      if (x < end.x) x++;
      else if (x > end.x) x--;
      else if (y < end.y) y++;
      else if (y > end.y) y--;
    }
    // Ensure the end point area is also carved
    for (let cy = y - halfWidth; cy <= y + halfWidth; cy++) {
      for (let cx = x - halfWidth; cx <= x + halfWidth; cx++) {
        if (cx >= 0 && cx < this.MAP_WIDTH && cy >= 0 && cy < this.MAP_HEIGHT) {
          floorMap[cy][cx] = 'open';
        }
      }
    }
  }

  private _placeStartAndExit(floorMap: (LogicalRoom | 'wall')[][], floor: number, rooms: Room[]) {
    const startX = 0;
    const startY = 0;

    // Ensure the starting cell is an open room
    if (floorMap[startY][startX] === 'wall') {
      floorMap[startY][startX] = new LogicalRoom(`room-${startX}-${startY}-f${floor}`, `Floor ${floor + 1} Entrance`, "You stand at the entrance of this floor. A cold, foreboding draft whispers from the darkness ahead.");
    } else {
      // If it's already 'open' from room generation, convert it to LogicalRoom
      floorMap[startY][startX] = new LogicalRoom(`room-${startX}-${startY}-f${floor}`, `Floor ${floor + 1} Entrance`, "You stand at the entrance of this floor. A cold, foreboding draft whispers from the darkness ahead.");
    }
    this.playerLocation = { x: startX, y: startY };

    // Connect to first room if it exists and is not the start room itself
    if (rooms.length > 0 && (rooms[0].center.x !== startX || rooms[0].center.y !== startY)) {
      this._carveCorridor(floorMap, {x: startX, y: startY}, rooms[0].center);
    } else if (rooms.length > 1) { // If first room is start, connect to second
      this._carveCorridor(floorMap, {x: startX, y: startY}, rooms[1].center);
    }

    // Place staircase to next floor in a random, accessible room (not the start room)
    if (floor < this.NUM_FLOORS - 1) {
      let exitRoom: Room | undefined;
      let attempts = 0;
      const MAX_ATTEMPTS = 100;
      while (!exitRoom && attempts < MAX_ATTEMPTS) {
        const randomIndex = Math.floor(Math.random() * rooms.length);
        const potentialExitRoom = rooms[randomIndex];
        if (potentialExitRoom.x !== startX || potentialExitRoom.y !== startY) { // Not the start room
          exitRoom = potentialExitRoom;
        }
        attempts++;
      }

      if (exitRoom) {
        const staircase = new Item(`staircase-f${floor}-to-f${floor + 1}`, "Mysterious Staircase", "A spiraling staircase leading deeper into the labyrinth. It seems to be magically sealed.", true, 'static');
        this.items.set(staircase.id, staircase);
        const staircaseCoord = { x: exitRoom.center.x, y: exitRoom.center.y };
        this.staticItemLocations.set(`${staircaseCoord.x},${staircaseCoord.y},${floor}`, staircase.id);
        this.floorExitStaircases.set(floor, staircaseCoord);
      } else {
        console.warn(`Could not place staircase on floor ${floor}.`);
      }
    }
  }

  private _placeBossArea(floorMap: (LogicalRoom | 'wall')[][], floor: number, rooms: Room[]) {
    const passageStartX = this.MAP_WIDTH - 40;
    const passageEndX = this.MAP_WIDTH - 1;
    const passageCenterY = Math.floor(this.MAP_HEIGHT / 2); // Center the passage vertically

    const halfCorridor = Math.floor(this.CORRIDOR_WIDTH / 2);

    // Carve the main boss passage
    for (let x = passageStartX; x <= passageEndX; x++) {
      for (let y = passageCenterY - halfCorridor; y <= passageCenterY + halfCorridor; y++) {
        if (x >= 0 && x < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT) {
          floorMap[y][x] = new LogicalRoom(`boss-passage-${x}-${y}-f${floor}`, `Watcher's Domain ${x},${y}`, "The air here is thick with an oppressive presence. You feel watched.");
          this.bossPassageCoords.add(`${x},${y},${floor}`);
        }
      }
    }

    // Add some "alcoves" or wider sections to make it less linear
    const numAlcoves = 3;
    for (let i = 0; i < numAlcoves; i++) {
      const alcoveX = passageStartX + Math.floor(Math.random() * (passageEndX - passageStartX - 5)); // Ensure space for alcove
      const alcoveY = passageCenterY + (Math.random() > 0.5 ? halfCorridor + 1 : -(halfCorridor + 1)); // Above or below main path
      const alcoveWidth = Math.floor(Math.random() * 3) + 3; // 3-5 cells wide
      const alcoveHeight = Math.floor(Math.random() * 2) + 2; // 2-3 cells high

      for (let y = alcoveY; y < alcoveY + alcoveHeight; y++) {
        for (let x = alcoveX; x < alcoveX + alcoveWidth; x++) {
          if (x >= 0 && x < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT) {
            floorMap[y][x] = new LogicalRoom(`boss-alcove-${x}-${y}-f${floor}`, `Watcher's Alcove ${x},${y}`, "A small, dark alcove, filled with an unsettling silence.");
            this.bossPassageCoords.add(`${x},${y},${floor}`);
          }
        }
      }
    }

    // Add some pillars to break up the vastness of the boss passage
    const numPillars = 20;
    for (let i = 0; i < numPillars; i++) {
        const pX = passageStartX + 1 + Math.floor(Math.random() * (passageEndX - passageStartX - 2));
        const pY = passageCenterY - halfCorridor + Math.floor(Math.random() * (this.CORRIDOR_WIDTH));
        // Ensure pillar is not on the direct middle path
        if (floorMap[pY][pX] !== 'wall') { // Only place pillar if it's currently open
            floorMap[pY][pX] = 'wall';
            this.bossPassageCoords.delete(`${pX},${pY},${floor}`); // It's a wall now
        }
    }

    // Connect a random room to the boss passage entrance
    if (rooms.length > 0) {
      const entranceX = passageStartX - 1; // Cell just before the passage
      const entranceY = passageCenterY;
      if (entranceX >= 0 && floorMap[entranceY][entranceX] === 'wall') {
        floorMap[entranceY][entranceX] = 'open'; // Make sure it's open
      }
      const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];
      this._carveCorridor(floorMap, randomRoom.center, { x: entranceX, y: entranceY });
    }
  }

  private getValidNeighbors(x: number, y: number): Coordinate[] {
    const neighbors: Coordinate[] = [];
    const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx >= 0 && nx < this.MAP_WIDTH && ny >= 0 && ny < this.MAP_HEIGHT) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    return neighbors;
  }

  private getRandomRoomDescription(): string {
    const descriptions = [
        "A dimly lit chamber. The air is heavy with the scent of damp earth and ancient magic.",
        "The walls here are adorned with grotesque carvings of forgotten beasts, their eyes seeming to follow your every move.",
        "An eerie, echoing silence fills this vast cavern, broken only by the drip of unseen water.",
        "Moss-covered stones line this narrow passage, leading deeper into the unknown.",
        "This chamber feels strangely familiar, yet you cannot recall ever being here before.",
        "Dust motes dance in the faint light filtering from above, revealing intricate patterns on the floor.",
        "The air grows colder here, and a faint, metallic tang hints at something unnatural.",
        "A small, stagnant pool of water reflects the faint glow of your lantern.",
        "The passage narrows significantly, forcing you to squeeze through.",
        "This area is surprisingly well-preserved, with faint murals depicting ancient rituals."
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private addGameElements(floor: number) {
    const currentFloorMap = this.floors.get(floor)!; // Get the map for the current floor

    // Difficulty scaling for enemies
    const enemyHealthMultiplier = 1 + (floor * 1.0); // Increased health scaling
    const enemyDamageMultiplier = 1 + (floor * 0.5); // Increased damage scaling

    // Prefixes for gear based on floor
    const prefixes = ["Rusty", "Iron", "Steel", "Mithril"];
    const prefix = prefixes[floor] || "Ancient"; // Fallback to Ancient if floor > 3

    // Common items (can be found on any floor)
    const potionId = "vial-of-lumina";
    if (!this.items.has(potionId)) {
      const potion = new Item(potionId, "Vial of Lumina", "A small vial containing a glowing, restorative liquid. It promises to mend wounds.", false, 'consumable', 100, true);
      this.items.set(potionId, potion);
    }
    this.placeElementRandomly(potionId, this.itemLocations, floor);

    const sword = new Item(`sword-${floor}-1`, `${prefix} Blade of the Labyrinth`, `A ${prefix.toLowerCase()} sword, its edge humming with ancient power. Increases your attack.`, false, 'weapon', 10 + (floor * 3)); // Adjusted player weapon scaling
    this.items.set(sword.id, sword);
    this.placeElementRandomly(sword.id, this.itemLocations, floor);

    const shield = new Item(`shield-${floor}-1`, `${prefix} Aegis of the Guardian`, `A sturdy ${prefix.toLowerCase()} shield emblazoned with a forgotten crest. Increases your defense.`, false, 'shield', 5 + (floor * 2)); // Shield scaling remains
    this.items.set(shield.id, shield);
    this.placeElementRandomly(shield.id, this.itemLocations, floor);

    // Floor-specific elements and objectives
    if (floor === 0) { // Floor 1: The Echoes of the Lost Scholar
      const journal = new Item("journal-f0", "Tattered Journal", "A water-damaged journal, its pages filled with cryptic notes about an ancient mechanism and a powerful amulet.", false, 'quest');
      this.items.set(journal.id, journal);
      this.placeElementRandomly(journal.id, this.itemLocations, floor);

      const chargedCrystal = new Item("charged-crystal-f0", "Pulsating Crystal", "A crystal humming with latent energy, it feels like it could power something ancient.", false, 'quest');
      this.items.set(chargedCrystal.id, chargedCrystal);
      this.placeElementRandomly(chargedCrystal.id, this.itemLocations, floor);

      const ancientMechanism = new Item("ancient-mechanism-f0", "Ancient Mechanism", "A large, intricate device embedded in the wall, covered in strange symbols. It has a slot for a crystal.", true, 'static');
      this.items.set(ancientMechanism.id, ancientMechanism);
      this.placeElementRandomly(ancientMechanism.id, this.staticItemLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Find the 'Tattered Journal', locate a 'Pulsating Crystal', and use them to activate the 'Ancient Mechanism' to obtain the Scholar's Amulet.",
        isCompleted: () => this.scholarAmuletQuestCompleted
      });

    } else if (floor === 1) { // Floor 2: The Whispering Well's Thirst
      const dryWell = new Item("dry-well-f1", "Whispering Well", "A stone well, completely dry, but you hear faint whispers emanating from its depths. It seems to yearn for water.", true, 'static');
      this.items.set(dryWell.id, dryWell);
      this.placeElementRandomly(dryWell.id, this.staticItemLocations, floor);

      const hiddenSpring = new Item("hidden-spring-f1", "Hidden Spring", "A small, gurgling spring hidden behind some mossy rocks. The water here feels alive.", true, 'static');
      this.items.set(hiddenSpring.id, hiddenSpring);
      this.placeElementRandomly(hiddenSpring.id, this.staticItemLocations, floor);

      const enchantedFlask = new Item("enchanted-flask-f1", "Enchanted Flask", "A small, empty flask that seems to shimmer faintly. Perfect for holding special liquids.", false, 'quest');
      this.items.set(enchantedFlask.id, enchantedFlask);
      this.placeElementRandomly(enchantedFlask.id, this.itemLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Find the 'Enchanted Flask', locate the 'Hidden Spring' to fill it with 'Living Water', then use the water to quench the 'Whispering Well'.",
        isCompleted: () => this.whisperingWellQuestCompleted
      });

    } else if (floor === 2) { // Floor 3: The Broken Compass's Secret
      const brokenCompass = new Item("broken-compass-f2", "Broken Compass", "A beautiful but shattered compass. Its needle spins wildly, useless.", false, 'quest');
      this.items.set(brokenCompass.id, brokenCompass);
      this.placeElementRandomly(brokenCompass.id, this.itemLocations, floor);

      const fineTools = new Item("fine-tools-f2", "Artisan's Fine Tools", "A collection of delicate, well-maintained tools, perfect for intricate repairs.", false, 'quest');
      this.items.set(fineTools.id, fineTools);
      this.placeElementRandomly(fineTools.id, this.itemLocations, floor);

      const prismaticLens = new Item("prismatic-lens-f2", "Prismatic Lens", "A small, faceted lens that refracts light into a rainbow of colors. It seems to be a missing piece.", false, 'quest');
      this.items.set(prismaticLens.id, prismaticLens);
      this.placeElementRandomly(prismaticLens.id, this.itemLocations, floor);

      const repairBench = new Item("repair-bench-f2", "Ancient Repair Bench", "A sturdy stone bench covered in arcane symbols and faint scorch marks. It looks like a place for crafting.", true, 'static');
      this.items.set(repairBench.id, repairBench);
      this.placeElementRandomly(repairBench.id, this.staticItemLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Gather the 'Broken Compass', 'Artisan's Fine Tools', and a 'Prismatic Lens', then use them at the 'Ancient Repair Bench' to fix the compass.",
        isCompleted: () => this.trueCompassQuestCompleted
      });

    } else if (floor === this.NUM_FLOORS - 1) { // Last Floor (Floor 4): The Heart of the Labyrinth
      const passageStartX = this.MAP_WIDTH - 40;
      const passageEndX = this.MAP_WIDTH - 1;
      const passageCenterY = Math.floor(this.MAP_HEIGHT / 2);

      // Place The Watcher of the Core (Boss) at the start of the passage
      const watcherX = passageStartX + Math.floor(this.CORRIDOR_WIDTH / 2); // Place within the wider passage
      const watcherY = passageCenterY;
      this.watcherOfTheCore = new Enemy("watcher-of-the-core-f3", "The Watcher of the Core", "A colossal, multi-eyed entity that guards the final passage. Its gaze distorts reality.", 100, 25); // Health for stress, and attack damage
      this.enemies.set(this.watcherOfTheCore.id, this.watcherOfTheCore);
      this.enemyLocations.set(`${watcherX},${watcherY},${floor}`, this.watcherOfTheCore.id);
      this.watcherLocation = { x: watcherX, y: watcherY };

      // Place Ancient Altar at the end of the passage
      const altarX = this.MAP_WIDTH - 1 - Math.floor(this.CORRIDOR_WIDTH / 2); // Place within the wider passage
      const altarY = passageCenterY;
      const ancientAltar = new Item("ancient-altar-f3", "Ancient Altar", "A blood-stained stone altar, radiating an oppressive aura. It feels like a place of sacrifice.", true, 'static');
      this.items.set(ancientAltar.id, ancientAltar);
      this.staticItemLocations.set(`${altarX},${altarY},${floor}`, ancientAltar.id);

      // Place Labyrinth Key and Mysterious Box somewhere within the passage, but not on Watcher/Altar
      const labyrinthKey = new Item("labyrinth-key-f3", "Labyrinth Key", "A heavy, ornate key, pulsating with a faint, dark energy.", false, 'key');
      this.items.set(labyrinthKey.id, labyrinthKey);
      this.placeElementInBossPassage(labyrinthKey.id, this.itemLocations, floor);

      const mysteriousBox = new Item("mysterious-box-f3", "Mysterious Box", "A sturdy, iron-bound box, locked tight. It seems to hum with a hidden power.", true, 'static');
      this.items.set(mysteriousBox.id, mysteriousBox);
      this.placeElementInBossPassage(mysteriousBox.id, this.staticItemLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Find the 'Labyrinth Key', use it to open the 'Mysterious Box' to obtain the 'Heart of the Labyrinth', then defeat 'The Watcher of the Core', and finally sacrifice the Heart at the 'Ancient Altar' to destroy the Labyrinth.",
        isCompleted: () => this.bossDefeated && this.heartSacrificed
      });
    }

    // Add generic enemies (scaled)
    const numGenericEnemies = 10; // Increased number of generic enemies
    for (let i = 0; i < numGenericEnemies; i++) {
      const goblin = new Enemy(`goblin-${floor}-${i}`, "Grumbling Goblin", "A small, green-skinned creature with a rusty dagger and a mischievous glint in its eye.", Math.floor(30 * enemyHealthMultiplier), Math.floor(15 * enemyDamageMultiplier)); // Adjusted base health and damage
      this.enemies.set(goblin.id, goblin);
      this.placeElementRandomly(goblin.id, this.enemyLocations, floor, true);

      const skeleton = new Enemy(`skeleton-${floor}-${i}`, "Rattling Skeleton", "An animated skeleton warrior, its bones clattering as it raises a chipped sword.", Math.floor(35 * enemyHealthMultiplier), Math.floor(18 * enemyDamageMultiplier)); // Adjusted base health and damage
      this.enemies.set(skeleton.id, skeleton);
      this.placeElementRandomly(skeleton.id, this.enemyLocations, floor, true);

      const shadowBeast = new Enemy(`shadow-beast-${floor}-${i}`, "Whispering Shadow", "A formless entity of pure darkness, its presence chills you to the bone.", Math.floor(40 * enemyHealthMultiplier), Math.floor(20 * enemyDamageMultiplier)); // Adjusted base health and damage
      this.enemies.set(shadowBeast.id, shadowBeast);
      this.placeElementRandomly(shadowBeast.id, this.enemyLocations, floor, true);
    }

    // Add traps (same number as enemies)
    const numTraps = numGenericEnemies; // Increased number of traps
    for (let i = 0; i < numTraps; i++) {
      this.placeElementRandomly(`trap-${floor}-${i}`, this.trapsLocations, floor, true);
    }
  }

  private getCoordForElement(id: string, locationMap: Map<string, string | boolean>, floor: number): Coordinate | undefined {
    for (const [coordStr, elementId] of locationMap.entries()) {
      const [x, y, f] = coordStr.split(',').map(Number);
      if (elementId === id && f === floor) {
        return { x, y };
      }
    }
    return undefined;
  }

  private placeElementInBossPassage(id: string, locationMap: Map<string, string | boolean>, floor: number) {
    if (floor !== this.NUM_FLOORS - 1) {
      this.placeElementRandomly(id, locationMap, floor); // Fallback for other floors
      return;
    }

    let placed = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000;

    const passageStartX = this.MAP_WIDTH - 40;
    const passageEndX = this.MAP_WIDTH - 1;
    const passageCenterY = Math.floor(this.MAP_HEIGHT / 2);
    const halfCorridor = Math.floor(this.CORRIDOR_WIDTH / 2);

    while (!placed && attempts < MAX_ATTEMPTS) {
      // Place within the main corridor area of the boss passage
      const x = passageStartX + Math.floor(Math.random() * (passageEndX - passageStartX + 1));
      const y = passageCenterY - halfCorridor + Math.floor(Math.random() * (this.CORRIDOR_WIDTH));
      const coordStr = `${x},${y},${floor}`;

      // Ensure not placed on Watcher or Altar
      const isWatcher = (this.watcherLocation?.x === x && this.watcherLocation?.y === y);
      const isAltar = (this.staticItemLocations.get(coordStr) === "ancient-altar-f3");

      if (
        (x !== 0 || y !== 0) && // Not at floor entrance
        !isWatcher &&
        !isAltar &&
        !locationMap.has(coordStr) &&
        !this.enemyLocations.has(coordStr) && // Check other element maps
        !this.puzzleLocations.has(coordStr) &&
        !this.itemLocations.has(coordStr) &&
        !this.staticItemLocations.has(coordStr) &&
        !this.trapsLocations.has(coordStr) &&
        !this.isTooClose(x, y, floor) && // Still respect minimum distance
        this.floors.get(floor)![y][x] !== 'wall' // Must be an open room
      ) {
        locationMap.set(coordStr, id);
        placed = true;
      }
      attempts++;
    }

    if (!placed) {
      console.warn(`Could not place element ${id} in boss passage on floor ${floor} after ${MAX_ATTEMPTS} attempts.`);
    }
  }

  private isTooClose(newX: number, newY: number, floor: number): boolean {
    const checkMaps = [
      this.enemyLocations,
      this.puzzleLocations,
      this.itemLocations,
      this.staticItemLocations,
      this.trapsLocations
    ];

    for (const map of checkMaps) {
      for (const coordStr of map.keys()) {
        const [x, y, f] = coordStr.split(',').map(Number);
        if (f === floor) { // Only check elements on the same floor
          const distance = Math.max(Math.abs(newX - x), Math.abs(newY - y)); // Chebyshev distance
          if (distance < this.MIN_ELEMENT_DISTANCE) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private placeElementRandomly(id: string, locationMap: Map<string, string | boolean>, floor: number, isHostile: boolean = false) {
    let placed = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000; // Prevent infinite loops in very dense maps

    while (!placed && attempts < MAX_ATTEMPTS) {
      const x = Math.floor(Math.random() * this.MAP_WIDTH);
      const y = Math.floor(Math.random() * this.MAP_HEIGHT);
      const coordStr = `${x},${y},${floor}`; // Include floor in coordinate string
      const currentFloorMap = this.floors.get(this.currentFloor)!;

      // Ensure not placed at player start (0,0) of this floor, or on an existing element, and only in an open room
      // Also, avoid placing elements on the boss's passage or altar location on the last floor
      const isBossPassageOrAltar = (floor === this.NUM_FLOORS - 1) && this.bossPassageCoords.has(coordStr);

      if (
        (!isHostile || Math.max(x, y) > 5) && // New condition for safe zone
        (x !== 0 || y !== 0) && // Not at floor entrance
        !isBossPassageOrAltar && // Not on boss passage or altar
        currentFloorMap[y][x] !== 'wall' && // Must be an open room
        !locationMap.has(coordStr) && // Check if the *current* locationMap already has something here
        !this.enemyLocations.has(coordStr) &&
        !this.puzzleLocations.has(coordStr) &&
        !this.itemLocations.has(coordStr) &&
        !this.staticItemLocations.has(coordStr) &&
        !this.trapsLocations.has(coordStr) &&
        !this.isTooClose(x, y, floor) // Check for minimum distance to other elements
      ) {
        locationMap.set(coordStr, id);
        placed = true;
      }
      attempts++;
    }

    if (!placed) {
      console.warn(`Could not place element ${id} on floor ${floor} after ${MAX_ATTEMPTS} attempts. Map might be too dense or small.`);
    }
  }

  private addMessage(message: string) {
    this.messages.push(message);
  }

  public clearMessages() {
    this.messages = [];
  }

  public clearLastHit() {
    this.lastHitEntityId = null;
  }

  public getMessages(): string[] {
    return this.messages;
  }

  public getPlayerLocation(): Coordinate {
    return this.playerLocation;
  }

  public getCurrentFloor(): number {
    return this.currentFloor;
  }

  public getPlayerHealth(): number {
    return this.playerHealth;
  }

  public getPlayerMaxHealth(): number {
    return this.playerMaxHealth;
  }

  public getCurrentAttackDamage(): number {
    return this.baseAttackDamage + (this.equippedWeapon?.effectValue || 0) + (this.equippedAmulet?.effectValue || 0);
  }

  public getCurrentDefense(): number {
    return this.baseDefense + (this.equippedShield?.effectValue || 0) + (this.equippedAmulet?.effectValue || 0);
  }

  public getSearchRadius(): number {
    return this.baseSearchRadius + (this.equippedCompass?.effectValue || 0);
  }

  public getEquippedWeapon(): Item | undefined {
    return this.equippedWeapon;
  }

  public getEquippedShield(): Item | undefined {
    return this.equippedShield;
  }

  public getEquippedAmulet(): Item | undefined {
    return this.equippedAmulet;
  }

  public getEquippedCompass(): Item | undefined {
    return this.equippedCompass;
  }

  public getInventoryItems(): { item: Item, quantity: number }[] {
    return Array.from(this.inventory.values());
  }

  public getCurrentLogicalRoom(): LogicalRoom | undefined {
    const currentMap = this.floors.get(this.currentFloor);
    if (!currentMap) return undefined;

    if (
      this.playerLocation.y >= 0 &&
      this.playerLocation.y < currentMap.length &&
      this.playerLocation.x >= 0 &&
      this.playerLocation.x < currentMap[0].length
    ) {
      const cell = currentMap[this.playerLocation.y][this.playerLocation.x];
      return typeof cell !== 'string' ? cell : undefined;
    }
    return undefined;
  }

  public getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  public getPuzzle(id: string): Puzzle | undefined {
    return this.puzzles.get(id);
  }

  public getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  public getRevealedStaticItems(): Set<string> {
    return this.revealedStaticItems;
  }

  public getTriggeredTraps(): Set<string> {
    return this.triggeredTraps;
  }

  public isGameOver(): boolean {
    return this.gameOver;
  }

  public getGameResult(): GameResult | null {
    return this.gameResult;
  }

  private setGameOver(type: 'victory' | 'defeat', playerName: string, time: number, causeOfDeath?: string) {
    this.gameOver = true;
    this.gameResult = { type, name: playerName, time, causeOfDeath };
  }

  private markVisited(coord: Coordinate) {
    let floorVisited = this.visitedCells.get(this.currentFloor);
    if (!floorVisited) {
      floorVisited = new Set<string>();
      this.visitedCells.set(this.currentFloor, floorVisited);
    }
    floorVisited.add(`${coord.x},${coord.y}`);
  }

  public getVisitedCells(): Set<string> {
    return this.visitedCells.get(this.currentFloor) || new Set<string>();
  }

  public getMapGrid(): ('wall' | 'open')[][] {
    const currentMap = this.floors.get(this.currentFloor);
    if (!currentMap) {
      // Should not happen if initialization is correct
      return Array(this.MAP_HEIGHT).fill(null).map(() => Array(this.MAP_WIDTH).fill('wall'));
    }

    const grid: ('wall' | 'open')[][] = Array(this.MAP_HEIGHT)
      .fill(null)
      .map(() => Array(this.MAP_WIDTH).fill('open'));

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        grid[y][x] = currentMap[y][x] === 'wall' ? 'wall' : 'open';
      }
    }
    return grid;
  }

  public getCurrentFloorObjective(): { description: string; isCompleted: () => boolean; } {
    return this.floorObjectives.get(this.currentFloor)!; // Should always exist
  }

  public ascendFloor(playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("You are already on the deepest floor. There's no way further down.");
      return;
    }

    const currentObjective = this.getCurrentFloorObjective();
    if (!currentObjective.isCompleted()) {
      this.addMessage(`You cannot proceed to the next floor yet. Objective: ${currentObjective.description}`);
      return;
    }

    this.currentFloor++;
    this.playerLocation = { x: 0, y: 0 }; // Appear at the entrance of the new floor
    this.markVisited(this.playerLocation);
    this.addMessage(`You successfully descended to Floor ${this.currentFloor + 1}!`);
    this.addMessage(this.getCurrentFloorObjective().description);
  }

  private _tryActivateWellBlessing(playerName: string, time: number, currentCause: string): boolean {
    const blessingEntry = this.inventory.get("well-blessing-f1");
    if (blessingEntry && blessingEntry.quantity > 0 && blessingEntry.item.effectValue) {
      blessingEntry.quantity--;
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + blessingEntry.item.effectValue);
      if (blessingEntry.quantity <= 0) {
        this.inventory.delete("well-blessing-f1");
        this.addMessage(`The Whispering Well's Blessing activates, saving you from oblivion! You feel a surge of vitality as the last charge is consumed.`);
      } else {
        this.inventory.set(blessingEntry.item.id, blessingEntry);
        this.addMessage(`The Whispering Well's Blessing activates, saving you from oblivion! You feel a surge of vitality! (${blessingEntry.quantity} uses left)`);
      }
      return true;
    }
    return false;
  }

  public move(direction: "north" | "south" | "east" | "west", playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    if (this.playerStunnedTurns > 0) {
        this.playerStunnedTurns--;
        const directions = ["north", "south", "east", "west"];
        const randomDirection = directions[Math.floor(Math.random() * directions.length)] as "north" | "south" | "east" | "west";
        this.addMessage(`You are disoriented! You attempt to move ${direction}, but stumble ${randomDirection} instead!`);
        direction = randomDirection;
    }

    const currentMap = this.floors.get(this.currentFloor)!;
    let newX = this.playerLocation.x;
    let newY = this.playerLocation.y;

    switch (direction) {
      case "north": newY--; break;
      case "south": newY++; break;
      case "east": newX++; break;
      case "west": newX--; break;
    }

    if (newX < 0 || newX >= this.MAP_WIDTH || newY < 0 || newY >= this.MAP_HEIGHT) {
      this.addMessage("You cannot go that way. You've reached the edge of the known labyrinth.");
      return;
    }

    const targetCoordStr = `${newX},${newY},${this.currentFloor}`;
    const enemyId = this.enemyLocations.get(targetCoordStr);
    if (enemyId) {
        const enemy = this.enemies.get(enemyId);
        if (enemy && !enemy.defeated) {
            const damageDealt = this.getCurrentAttackDamage();
            enemy.takeDamage(damageDealt);
            this.lastHitEntityId = enemy.id;
            this.addMessage(`You attack the ${enemy.name}, dealing ${damageDealt} damage! Its health is now ${enemy.health}.`);
            if (enemy.defeated) {
                this.addMessage(`You have defeated the ${enemy.name}!`);
                this.enemyLocations.delete(targetCoordStr);
            }
            return; // Player attacks and does not move
        }
    }

    if (currentMap[newY][newX] === 'wall') {
      this.addMessage("A solid, ancient stone wall blocks your path, cold to the touch. You cannot go that way.");
      return;
    }

    if (this.currentFloor === this.NUM_FLOORS - 1 && !this.bossDefeated) {
        const currentCoordStr = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
        const wasInPassage = this.bossPassageCoords.has(currentCoordStr);
        const isInPassage = this.bossPassageCoords.has(targetCoordStr);
        if (this.bossState === 'red_light' && (wasInPassage || isInPassage)) {
            const damageTaken = 25;
            this.playerHealth -= damageTaken;
            this.lastHitEntityId = 'player';
            this.playerStunnedTurns = 1;
            this.addMessage(`The Labyrinth's Gaze pulses brightly! You moved and are caught in the temporal distortion! You take ${damageTaken} damage and feel disoriented!`);
            if (this.playerHealth <= 0) {
                if (!this._tryActivateWellBlessing(playerName, time, "Temporal Distortion (Moved during Red Light)")) {
                    this.addMessage("The Labyrinth's Gaze consumes you. Darkness... Game Over.");
                    this.setGameOver('defeat', playerName, time, "Temporal Distortion (Moved during Red Light)");
                    return;
                }
            }
        }
    }

    this.playerLocation = { x: newX, y: newY };
    this.lastMoveDirection = direction; // Update last move direction
    this.markVisited(this.playerLocation);

    const currentRoom = this.getCurrentLogicalRoom();
    this.addMessage(currentRoom ? `You cautiously step ${direction} into the echoing darkness. ${currentRoom.description}` : `You cautiously step ${direction} into the echoing darkness.`);

    if (this.trapsLocations.has(targetCoordStr)) {
        this.playerHealth -= 10;
        this.lastHitEntityId = 'player';
        this.triggeredTraps.add(targetCoordStr);
        this.addMessage("SNAP! You triggered a hidden pressure plate! A sharp pain shoots through your leg. You take 10 damage!");
        if (this.playerHealth <= 0) {
            if (!this._tryActivateWellBlessing(playerName, time, "Hidden Trap")) {
                this.addMessage("The trap's venom courses through your veins. Darkness consumes you... Game Over.");
                this.setGameOver('defeat', playerName, time, "Hidden Trap");
            }
        }
    }
  }

  private _handleFoundItem(foundItem: Item, coordStr: string) {
    if (foundItem.type === 'consumable' && foundItem.stackable) {
      const existing = this.inventory.get(foundItem.id);
      if (existing) {
        existing.quantity++;
        this.inventory.set(foundItem.id, existing);
        this.addMessage(`You found another ${foundItem.name}! You now have ${existing.quantity}.`);
      } else {
        this.inventory.set(foundItem.id, { item: foundItem, quantity: 1 });
        this.addMessage(`You found a ${foundItem.name}! It's a ${foundItem.description}`);
      }
      this.itemLocations.delete(coordStr);
    } else if (foundItem.type === 'weapon') {
      if (!this.equippedWeapon || (foundItem.effectValue || 0) > (this.equippedWeapon.effectValue || 0)) {
        if (this.equippedWeapon) {
          this.addMessage(`You discard your old ${this.equippedWeapon.name} and equip the superior ${foundItem.name}!`);
        } else {
          this.addMessage(`You equip the ${foundItem.name}!`);
        }
        this.equippedWeapon = foundItem;
        this.itemLocations.delete(coordStr);
      } else {
        this.addMessage(`You found a ${foundItem.name}, but your current weapon is stronger.`);
      }
    } else if (foundItem.type === 'shield') {
      if (!this.equippedShield || (foundItem.effectValue || 0) > (this.equippedShield.effectValue || 0)) {
        if (this.equippedShield) {
          this.addMessage(`You discard your old ${this.equippedShield.name} and equip the superior ${foundItem.name}!`);
        } else {
          this.addMessage(`You equip the ${foundItem.name}!`);
        }
        this.equippedShield = foundItem;
        this.itemLocations.delete(coordStr);
      } else {
        this.addMessage(`You found a ${foundItem.name}, but your current shield is stronger.`);
      }
    } else if (foundItem.type === 'accessory') { // Handle accessories like amulet/compass
      if (!this.inventory.has(foundItem.id)) {
        this.inventory.set(foundItem.id, { item: foundItem, quantity: 1 });
        this.addMessage(`You found a ${foundItem.name}! It's a ${foundItem.description}`);
        this.itemLocations.delete(coordStr); // Remove from map once picked up
        this.staticItemLocations.delete(coordStr); // If it was a static item that became an artifact
      } else {
        this.addMessage(`You already have the ${foundItem.name}.`);
      }
    }
    else { // Generic, key, artifact, quest items
      if (!this.inventory.has(foundItem.id)) {
        this.inventory.set(foundItem.id, { item: foundItem, quantity: 1 });
        this.addMessage(`You found a ${foundItem.name}! It's a ${foundItem.description}`);
        this.itemLocations.delete(coordStr); // Remove from map once picked up
        this.staticItemLocations.delete(coordStr); // If it was a static item that became an artifact
      } else {
        this.addMessage(`You already have the ${foundItem.name}.`);
      }
    }
  }

  public search() {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const playerX = this.playerLocation.x;
    const playerY = this.playerLocation.y;
    let foundSomethingInRadius = false;

    this.addMessage("You carefully scan your surroundings...");

    for (let dy = -this.getSearchRadius(); dy <= this.getSearchRadius(); dy++) {
        for (let dx = -this.getSearchRadius(); dx <= this.getSearchRadius(); dx++) {
            const targetX = playerX + dx;
            const targetY = playerY + dy;
            const coordStr = `${targetX},${targetY},${this.currentFloor}`; // Include floor

            // Check bounds
            if (targetX < 0 || targetX >= this.MAP_WIDTH || targetY < 0 || targetY >= this.MAP_HEIGHT) {
                continue;
            }

            const currentMap = this.floors.get(this.currentFloor)!;
            // Check if it's a wall
            if (currentMap[targetY][targetX] === 'wall') {
                continue;
            }

            // Mark the cell as visited if it's an open room within the radius
            this.markVisited({ x: targetX, y: targetY });

            // If it's the player's current location, perform full interaction
            if (dx === 0 && dy === 0) {
                const itemId = this.itemLocations.get(coordStr);
                if (itemId) {
                    const item = this.items.get(itemId);
                    if (item && !item.isStatic) {
                        this.addMessage(`You see a ${item.name} lying on the ground here.`);
                        foundSomethingInRadius = true;
                    }
                }

                const staticItemId = this.staticItemLocations.get(coordStr);
                if (staticItemId) {
                    const staticItem = this.items.get(staticItemId);
                    if (staticItem && !this.revealedStaticItems.has(coordStr)) {
                        this.addMessage(`You notice a ${staticItem.name} embedded in the wall: ${staticItem.description}`);
                        this.revealedStaticItems.add(coordStr);
                        foundSomethingInRadius = true;
                    }
                }

                const puzzleId = this.puzzleLocations.get(coordStr);
                if (puzzleId) {
                    const puzzle = this.puzzles.get(puzzleId);
                    if (puzzle && !puzzle.solved) {
                        this.addMessage(`You sense an unsolved puzzle at (${targetX},${targetY}). It seems to be the ${puzzle.name}.`);
                        foundSomethingInRadius = true;
                    }
                }
            } else {
                // Logic for cells within radius but not current location (only reveal)
                const itemId = this.itemLocations.get(coordStr);
                if (itemId) {
                    const item = this.items.get(itemId);
                    if (item && !item.isStatic) {
                        this.addMessage(`You spot a ${item.name} at (${targetX},${targetY}).`);
                        foundSomethingInRadius = true;
                    }
                }

                const staticItemId = this.staticItemLocations.get(coordStr);
                if (staticItemId) {
                    const staticItem = this.items.get(staticItemId);
                    if (staticItem && !this.revealedStaticItems.has(coordStr)) {
                        this.addMessage(`You discern a hidden ${staticItem.name} at (${targetX},${targetY}).`);
                        this.revealedStaticItems.add(coordStr);
                        foundSomethingInRadius = true;
                    }
                }

                const puzzleId = this.puzzleLocations.get(coordStr);
                if (puzzleId) {
                    const puzzle = this.puzzles.get(puzzleId);
                    if (puzzle && !puzzle.solved) {
                        this.addMessage(`You sense an unsolved puzzle at (${targetX},${targetY}).`);
                        foundSomethingInRadius = true;
                    }
                }

                const enemyId = this.enemyLocations.get(coordStr);
                if (enemyId) {
                    const enemy = this.enemies.get(enemyId);
                    if (enemy && !enemy.defeated) {
                        this.addMessage(`You hear a faint growl from a ${enemy.name} at (${targetX},${targetY}).`);
                        foundSomethingInRadius = true;
                    }
                }
                // New: Reveal traps in the log
                const hasTrap = this.trapsLocations.has(coordStr);
                const isTrapTriggered = this.triggeredTraps.has(coordStr);
                if (hasTrap && !isTrapTriggered) {
                    this.addMessage(`You detect a hidden trap at (${targetX},${targetY}).`);
                    foundSomethingInRadius = true;
                }
            }
        }
    }

    if (!foundSomethingInRadius) {
        this.addMessage("You meticulously search the area and its immediate surroundings, but find nothing new.");
    }
  }

  public interact(playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
    let interacted = false;

    // Check for loose items to pick up first.
    const itemId = this.itemLocations.get(currentCoord);
    if (itemId) {
        const item = this.items.get(itemId);
        if (item && !item.isStatic) {
            this._handleFoundItem(item, currentCoord);
            return; // Exit after picking up an item to prevent multiple interactions.
        }
    }

    // Check for floor exit staircase
    const staircaseCoord = this.floorExitStaircases.get(this.currentFloor);
    if (staircaseCoord && staircaseCoord.x === this.playerLocation.x && staircaseCoord.y === this.playerLocation.y) {
      this.ascendFloor(playerName, time);
      interacted = true;
    }

    // Check for static items to interact with (including quest elements)
    const staticItemId = this.staticItemLocations.get(currentCoord);
    if (staticItemId) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem) {
        if (staticItem.id.startsWith("ancient-mechanism-")) { // Floor 1 Quest
          const journalEntry = this.inventory.get("journal-f0");
          const crystalEntry = this.inventory.get("charged-crystal-f0");
          if (journalEntry && crystalEntry) {
            this.inventory.delete("journal-f0");
            this.inventory.delete("charged-crystal-f0");
            this.scholarAmuletQuestCompleted = true;
            // Scholar's Amulet is now an accessory, not an artifact from this interaction
            const scholarAmulet = new Item("scholar-amulet-f0", "Scholar's Amulet", "A shimmering amulet that hums with ancient knowledge. It feels like it enhances your mind and body.", false, 'accessory', 5); // +5 to attack/defense
            this.items.set(scholarAmulet.id, scholarAmulet);
            this._handleFoundItem(scholarAmulet, currentCoord); // Add to inventory
            this.addMessage("The Ancient Mechanism whirs to life, revealing the Scholar's Amulet! You feel a surge of power!");
            interacted = true;
          } else {
            this.addMessage("The ancient mechanism requires both the Tattered Journal and a Pulsating Crystal to activate.");
            interacted = true;
          }
        } else if (staticItem.id.startsWith("dry-well-")) { // Floor 2 Quest
          const livingWaterEntry = this.inventory.get("living-water-f1");
          if (livingWaterEntry) {
            this.inventory.delete("living-water-f1"); // Water is consumed
            this.whisperingWellQuestCompleted = true;
            // Well Blessing is now a consumable, not an artifact
            const blessing = new Item("well-blessing-f1", "Whispering Well's Blessing", "The well's water, now flowing freely, grants you vitality. Has 5 uses.", false, 'consumable', 20, true); // 20 HP restore, 5 uses, stackable
            this.items.set(blessing.id, blessing);
            // Add to inventory with 5 quantity
            const existingBlessing = this.inventory.get(blessing.id);
            if (existingBlessing) {
                existingBlessing.quantity += 5; // Add 5 uses if already exists
                this.inventory.set(blessing.id, existingBlessing);
            } else {
                this.inventory.set(blessing.id, { item: blessing, quantity: 5 });
            }
            this.addMessage("You pour the Living Water into the Whispering Well. It gurgles, then overflows with pure, shimmering liquid! You obtain the Whispering Well's Blessing (5 uses)!");
            interacted = true;
          } else {
            this.addMessage("The Whispering Well is dry. It needs a special kind of water to be quenched.");
            interacted = true;
          }
        } else if (staticItem.id.startsWith("hidden-spring-")) { // Floor 2 Quest
          const flaskEntry = this.inventory.get("enchanted-flask-f1");
          if (flaskEntry) {
            if (!this.inventory.has("living-water-f1")) { // Only get water once
              const livingWater = new Item("living-water-f1", "Living Water", "Water from a hidden spring, shimmering with life. It feels potent.", false, 'quest');
              this.items.set(livingWater.id, livingWater);
              this._handleFoundItem(livingWater, currentCoord); // Add to inventory
              this.addMessage("You fill your Enchanted Flask with the Living Water from the Hidden Spring!");
            } else {
              this.addMessage("Your Enchanted Flask is already filled with Living Water.");
            }
            interacted = true;
          } else {
            this.addMessage("You need an Enchanted Flask to collect the Living Water from this spring.");
            interacted = true;
          }
        } else if (staticItem.id.startsWith("repair-bench-")) { // Floor 3 Quest
          const brokenCompassEntry = this.inventory.get("broken-compass-f2");
          const fineToolsEntry = this.inventory.get("fine-tools-f2");
          const prismaticLensEntry = this.inventory.get("prismatic-lens-f2");
          if (brokenCompassEntry && fineToolsEntry && prismaticLensEntry) {
            this.inventory.delete("broken-compass-f2");
            this.inventory.delete("fine-tools-f2");
            this.inventory.delete("prismatic-lens-f2");
            this.trueCompassQuestCompleted = true;
            // True Compass is now an accessory
            const trueCompass = new Item("true-compass-f2", "True Compass", "A perfectly repaired compass, its needle points unerringly. It feels like it expands your perception.", false, 'accessory', 1); // Effect value 1 for search radius increase
            this.items.set(trueCompass.id, trueCompass);
            this._handleFoundItem(trueCompass, currentCoord); // Add to inventory
            this.addMessage("With careful work, you repair the Broken Compass! It now hums with a powerful directional magic!");
            interacted = true;
          } else {
            this.addMessage("The Ancient Repair Bench requires the Broken Compass, Artisan's Fine Tools, and a Prismatic Lens to function.");
            interacted = true;
          }
        } else if (staticItem.id.startsWith("mysterious-box-")) { // Floor 4 Quest
            const labyrinthKeyEntry = this.inventory.get("labyrinth-key-f3");
            if (labyrinthKeyEntry) {
                this.inventory.delete("labyrinth-key-f3");
                this.mysteriousBoxOpened = true;
                const heartOfLabyrinth = new Item("heart-of-labyrinth-f3", "Heart of the Labyrinth", "A pulsating, dark orb. It feels like the very essence of this place.", false, 'quest');
                this.items.set(heartOfLabyrinth.id, heartOfLabyrinth);
                this._handleFoundItem(heartOfLabyrinth, currentCoord);
                this.heartOfLabyrinthObtained = true; // Set state that heart is obtained
                this.addMessage("The Mysterious Box clicks open, revealing the throbbing Heart of the Labyrinth!");
                interacted = true;
            } else {
                this.addMessage("The Mysterious Box is locked. It requires a special key.");
                interacted = true;
            }
        } else if (staticItem.id.startsWith("ancient-altar-")) { // Floor 4 Quest
            // Check if boss is defeated before allowing altar interaction
            if (this.currentFloor === this.NUM_FLOORS - 1 && !this.bossDefeated) {
                this.addMessage("The Ancient Altar is guarded by a powerful presence. You must defeat The Watcher of the Core first!");
                interacted = true;
                return;
            }

            const heartEntry = this.inventory.get("heart-of-labyrinth-f3");
            if (heartEntry) {
                this.inventory.delete("heart-of-labyrinth-f3");
                this.heartSacrificed = true;
                this.setGameOver('victory', playerName, time); // Game over condition
                this.addMessage("You place the Heart of the Labyrinth upon the Ancient Altar. A blinding flash of light erupts, followed by a deafening roar as the Labyrinth crumbles around you! You have destroyed it and escaped!");
                interacted = true;
            } else {
                this.addMessage("The Ancient Altar demands a sacrifice, but you have nothing worthy to offer.");
                interacted = true;
            }
        } else if (staticItem.id.startsWith("staircase-")) {
            // This is handled by the specific staircase check above, but good to have a fallback message
            this.addMessage(`You stand before the ${staticItem.name}. It seems to be the way to the next floor.`);
            interacted = true;
        } else if (staticItem.id.startsWith("watcher-of-the-core-")) { // NEW: Direct interaction to defeat Watcher
            if (this.watcherOfTheCore && !this.bossDefeated) {
                this.watcherOfTheCore.health = 0; // Set health to 0 to mark as defeated
                this.watcherOfTheCore.defeated = true;
                this.bossDefeated = true;
                this.addMessage("You confront The Watcher of the Core directly! Its gaze falters as you stand your ground, and with a final, desperate shriek, it dissipates into nothingness! The path is clear!");
                // Remove boss from enemy locations
                const bossCoordStr = `${this.watcherLocation?.x},${this.watcherLocation?.y},${this.currentFloor}`;
                if (bossCoordStr) {
                    this.enemyLocations.delete(bossCoordStr);
                }
                interacted = true;
            } else if (this.bossDefeated) {
                this.addMessage("The Watcher of the Core is already defeated. Its lingering presence is harmless.");
                interacted = true;
            } else {
                this.addMessage("You stand before The Watcher of the Core. It watches you intently.");
                interacted = true;
            }
        }
        else {
          if (!this.revealedStaticItems.has(currentCoord)) {
            this.addMessage(`You attempt to interact with the ${staticItem.name}. It seems to be ${staticItem.description}`);
            this.revealedStaticItems.add(currentCoord);
          } else {
            this.addMessage(`You examine the ${staticItem.name} again. It's still ${staticItem.description}`);
          }
          interacted = true;
        }
      }
    }

    // Check for puzzles to interact with (only Grand Riddle remains)
    const puzzleId = this.puzzleLocations.get(currentCoord);
    if (puzzleId) {
      const puzzle = this.puzzles.get(puzzleId);
      if (puzzle && !puzzle.solved) {
        if (puzzle.id === "grand-riddle-3") { // Floor 3 Grand Riddle
            const attempt = prompt("The Grand Riddle of Eternity: I have cities, but no houses; forests, but no trees; and water, but no fish. What am I? (Type your answer)");
            if (attempt) {
                if (puzzle.solve(attempt)) {
                    this.addMessage(`A deep rumble echoes through the chamber as the riddle is solved! The path to escape is revealed!`);
                    if (puzzle.reward) {
                        this._handleFoundItem(puzzle.reward, currentCoord); // Use the new handler for puzzle reward
                    }
                } else {
                    this.addMessage(`Your answer echoes, but the riddle remains unsolved. Try again.`);
                }
            } else {
                this.addMessage("You decide not to attempt the riddle for now.");
            }
            interacted = true;
        }
      }
    }

    if (!interacted) {
      this.addMessage("There's nothing here that responds to your touch.");
    }
  }

  public useItem(itemId: string, playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const inventoryEntry = this.inventory.get(itemId);
    if (!inventoryEntry) {
      this.addMessage("You don't have that item in your inventory.");
      return;
    }

    const item = inventoryEntry.item;

    switch (item.type) {
      case 'consumable':
        if (item.effectValue && inventoryEntry.quantity > 0) {
          this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + item.effectValue);
          inventoryEntry.quantity--;
          if (inventoryEntry.quantity <= 0) {
            this.inventory.delete(itemId);
            this.addMessage(`You consume the last charge of ${item.name}. Your health is restored to ${this.playerHealth} HP!`);
          } else {
            this.inventory.set(itemId, inventoryEntry);
            this.addMessage(`You consume a charge of ${item.name}. Your health is restored to ${this.playerHealth} HP! (${inventoryEntry.quantity} uses left)`);
          }
        } else if (inventoryEntry.quantity === 0) {
          this.addMessage(`You are out of charges for the ${item.name}.`);
        } else if (this.playerHealth >= this.playerMaxHealth) {
          this.addMessage(`You are already at full health. No need to use the ${item.name} now.`);
        } else {
          this.addMessage(`The ${item.name} seems to have no effect.`);
        }
        break;
      case 'weapon':
        if (this.equippedWeapon?.id === item.id) {
          this.addMessage(`The ${item.name} is already equipped.`);
        } else {
          // Check if the new weapon is stronger than the currently equipped one
          if (!this.equippedWeapon || (item.effectValue || 0) > (this.equippedWeapon.effectValue || 0)) {
            if (this.equippedWeapon) {
              // Put the old equipped weapon back into inventory
              const oldEquipped = this.equippedWeapon;
              const oldEntry = this.inventory.get(oldEquipped.id);
              if (oldEntry) {
                oldEntry.quantity++;
                this.inventory.set(oldEquipped.id, oldEntry);
              } else {
                this.inventory.set(oldEquipped.id, { item: oldEquipped, quantity: 1 });
              }
              this.addMessage(`You unequip the ${oldEquipped.name} and equip the superior ${item.name}!`);
            } else {
              this.addMessage(`You equip the ${item.name}!`);
            }
            this.equippedWeapon = item;
            this.inventory.delete(itemId); // Remove from inventory as it's now equipped
          } else {
            this.addMessage(`You found a ${item.name}, but your current weapon is stronger.`);
          }
        }
        break;
      case 'shield':
        if (this.equippedShield?.id === item.id) {
          this.addMessage(`The ${item.name} is already equipped.`);
        } else {
          // Check if the new shield is stronger than the currently equipped one
          if (!this.equippedShield || (item.effectValue || 0) > (this.equippedShield.effectValue || 0)) {
            if (this.equippedShield) {
              // Put the old equipped shield back into inventory
              const oldEquipped = this.equippedShield;
              const oldEntry = this.inventory.get(oldEquipped.id);
              if (oldEntry) {
                oldEntry.quantity++;
                this.inventory.set(oldEquipped.id, oldEntry);
              } else {
                this.inventory.set(oldEquipped.id, { item: oldEquipped, quantity: 1 });
              }
              this.addMessage(`You unequip the ${oldEquipped.name} and equip the superior ${item.name}!`);
            } else {
              this.addMessage(`You equip the ${item.name}!`);
            }
            this.equippedShield = item;
            this.inventory.delete(itemId); // Remove from inventory as it's now equipped
          } else {
            this.addMessage(`You found a ${item.name}, but your current shield is stronger.`);
          }
        }
        break;
      case 'accessory': // Handle accessory usage (equip/unequip)
        if (item.id === "scholar-amulet-f0") {
            if (this.equippedAmulet?.id === item.id) {
                this.equippedAmulet = undefined;
                this.addMessage(`You unequip the Scholar's Amulet.`);
                this.inventory.set(item.id, { item: item, quantity: 1 }); // Put back to inventory
            } else {
                if (this.equippedAmulet) {
                    const oldEquipped = this.equippedAmulet;
                    this.inventory.set(oldEquipped.id, { item: oldEquipped, quantity: 1 });
                    this.addMessage(`You unequip the ${oldEquipped.name} and equip the Scholar's Amulet.`);
                } else {
                    this.addMessage(`You equip the Scholar's Amulet.`);
                }
                this.equippedAmulet = item;
                this.inventory.delete(itemId); // Remove from inventory as it's now equipped
            }
        } else if (item.id === "true-compass-f2") {
            if (this.equippedCompass?.id === item.id) {
                this.equippedCompass = undefined;
                this.addMessage(`You unequip the True Compass.`);
                this.inventory.set(item.id, { item: item, quantity: 1 }); // Put back to inventory
            } else {
                if (this.equippedCompass) {
                    const oldEquipped = this.equippedCompass;
                    this.inventory.set(oldEquipped.id, { item: oldEquipped, quantity: 1 });
                    this.addMessage(`You unequip the ${oldEquipped.name} and equip the True Compass.`);
                } else {
                    this.addMessage(`You equip the True Compass.`);
                }
                this.equippedCompass = item;
                this.inventory.delete(itemId); // Remove from inventory as it's now equipped
            }
        } else {
            this.addMessage(`You can't seem to use the ${item.name} in this way.`);
        }
        break;
      default: // Generic, key, quest items
        this.addMessage(`You can't seem to use the ${item.name} in this way.`);
        break;
    }
  }

  private _isValidEnemyMove(x: number, y: number, currentFloorMap: (LogicalRoom | 'wall')[][]): boolean {
    return x >= 0 && x < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT && currentFloorMap[y][x] !== 'wall';
  }

  public processEnemyMovement(playerName: string, time: number) {
    if (this.gameOver) {
        return;
    }

    const playerX = this.playerLocation.x;
    const playerY = this.playerLocation.y;
    const currentFloorMap = this.floors.get(this.currentFloor)!;
    const AGGRO_RADIUS = 3;

    // Aggro logic
    for (const [coordStr, enemyId] of this.enemyLocations.entries()) {
        const [x, y, f] = coordStr.split(',').map(Number);
        if (f === this.currentFloor) {
            const enemy = this.enemies.get(enemyId);
            if (enemy && !enemy.defeated && !enemy.isAggro) {
                const distance = Math.max(Math.abs(playerX - x), Math.abs(playerY - y));
                if (distance <= AGGRO_RADIUS) {
                    enemy.isAggro = true;
                    this.addMessage(`A ${enemy.name} has spotted you and is now hunting you down!`);
                }
            }
        }
    }

    const enemiesToMove: { id: string; coordStr: string; enemy: Enemy }[] = [];
    for (const [coordStr, enemyId] of this.enemyLocations.entries()) {
        if (coordStr.endsWith(`,${this.currentFloor}`) && enemyId !== this.watcherOfTheCore?.id) {
            const enemy = this.enemies.get(enemyId);
            if (enemy && !enemy.defeated && enemy.isAggro) {
                enemiesToMove.push({ id: enemyId, coordStr, enemy });
            }
        }
    }

    if (enemiesToMove.length === 0) {
        return;
    }

    for (const { id: enemyId, coordStr, enemy } of enemiesToMove) {
        const [oldX, oldY] = coordStr.split(',').map(Number);
        
        const dx = playerX - oldX;
        const dy = playerY - oldY;

        // Create a prioritized list of moves
        const moves: {x: number, y: number}[] = [];
        if (Math.abs(dx) > Math.abs(dy)) {
            moves.push({x: oldX + Math.sign(dx), y: oldY}); // Primary horizontal
            if (dy !== 0) moves.push({x: oldX, y: oldY + Math.sign(dy)}); // Secondary vertical
        } else {
            moves.push({x: oldX, y: oldY + Math.sign(dy)}); // Primary vertical
            if (dx !== 0) moves.push({x: oldX + Math.sign(dx), y: oldY}); // Secondary horizontal
        }

        let moved = false;
        for (const move of moves) {
            if (!this._isValidEnemyMove(move.x, move.y, currentFloorMap)) {
                continue;
            }

            if (move.x === playerX && move.y === playerY) {
                const damageDealt = Math.max(0, enemy.attackDamage - this.getCurrentDefense());
                this.playerHealth -= damageDealt;
                this.lastHitEntityId = 'player';
                this.addMessage(`The ${enemy.name} lunges at you, dealing ${damageDealt} damage! Your health is now ${this.playerHealth}.`);
                if (this.playerHealth <= 0) {
                    if (!this._tryActivateWellBlessing(playerName, time, `${enemy.name}'s Attack`)) {
                        this.addMessage("You have been slain... Game Over.");
                        this.setGameOver('defeat', playerName, time, `${enemy.name}'s Attack`);
                    }
                }
                moved = true;
                break; // Enemy attacked, stop trying to move
            }

            const newCoordStr = `${move.x},${move.y},${this.currentFloor}`;
            if (this.enemyLocations.has(newCoordStr)) {
                continue; // Path is blocked by another enemy, try next move
            }

            this.enemyLocations.delete(coordStr);
            this.enemyLocations.set(newCoordStr, enemyId);
            this.addMessage(`${enemy.name} moved from (${oldX},${oldY}) to (${move.x},${move.y}).`);
            moved = true;
            break; // Enemy moved, stop trying other moves
        }
    }
  }

  public processBossLogic() {
    if (this.gameOver || this.currentFloor !== this.NUM_FLOORS - 1 || this.bossDefeated) {
        return; // Only run on the last floor if boss is not defeated
    }

    const now = Date.now();
    const stateChangeInterval = 4000; // 4 seconds for state change

    const playerCoordStr = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
    const isInBossPassage = this.bossPassageCoords.has(playerCoordStr);

    if (now - this.lastBossStateChange > stateChangeInterval) {
        this.lastBossStateChange = now;
        
        if (this.bossState === 'green_light') {
            this.bossState = 'red_light';
            this.isRedLightPulseActive = true; // Set pulse active
            if (isInBossPassage) { // Only show message if player is in the passage
                this.addMessage("The Labyrinth's Gaze turns towards you! The passage pulses with a blinding light! DO NOT MOVE!");
            }
        } else {
            this.bossState = 'green_light';
            this.isRedLightPulseActive = false; // Reset pulse
            if (isInBossPassage) { // Only show message if player is in the passage
                this.addMessage("The Labyrinth's Gaze shifts away. The passage dims. You may move.");
            }

            // If player was in the passage and didn't move during Red Light, boss takes stress damage
            if (isInBossPassage && this.playerStunnedTurns === 0) { // Check isInBossPassage here too
                if (this.watcherOfTheCore) {
                    const stressDamage = 10; // Damage to boss for successful evasion
                    this.watcherOfTheCore.takeDamage(stressDamage);
                    this.addMessage(`You successfully evaded The Watcher's gaze! It shudders, taking ${stressDamage} stress damage. Its remaining will: ${this.watcherOfTheCore.health}`);
                    if (this.watcherOfTheCore.defeated) {
                        this.addMessage("The Watcher of the Core's will is broken! It stands defeated, its gaze no longer a threat. You can now interact with it to clear the path.");
                        this.bossDefeated = true; // Mark as defeated for objective
                    }
                }
            }
        }
    }
  }

  public getBossState(): 'red_light' | 'green_light' {
    return this.bossState;
  }

  public isBossPassage(x: number, y: number, floor: number): boolean {
    return this.bossPassageCoords.has(`${x},${y},${floor}`);
  }

  public isBossDefeated(): boolean {
    return this.bossDefeated;
  }
  
  private getContiguousArea(startX: number, startY: number, type: 'wall' | 'open', floorMap: (LogicalRoom | 'wall')[][], globalVisited: Set<string>): { size: number, cells: Coordinate[] } {
    const areaCells: Coordinate[] = [];
    const queue: Coordinate[] = [{ x: startX, y: startY }];
    const visitedInArea = new Set<string>();
    
    const startCoord = `${startX},${startY}`;
    
    const startCellType = floorMap[startY][startX] === 'wall' ? 'wall' : 'open';
    if (startCellType !== type) {
        return { size: 0, cells: [] };
    }

    visitedInArea.add(startCoord);
    globalVisited.add(startCoord);
    
    while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        areaCells.push({x, y});

        const neighbors = this.getValidNeighbors(x, y);
        for (const neighbor of neighbors) {
            const neighborCoord = `${neighbor.x},${neighbor.y}`;
            if (!visitedInArea.has(neighborCoord)) {
                const neighborType = floorMap[neighbor.y][neighbor.x] === 'wall' ? 'wall' : 'open';
                if (neighborType === type) {
                    visitedInArea.add(neighborCoord);
                    globalVisited.add(neighborCoord);
                    queue.push(neighbor);
                }
            }
        }
    }
    return { size: areaCells.length, cells: areaCells };
  }

  private reduceOpenArea(areaCells: Coordinate[], floorMap: (LogicalRoom | 'wall')[][], floor: number) {
    const cellsToConvert = Math.floor(areaCells.length - 100);
    
    areaCells.sort((a, b) => {
        const aNeighbors = this.getValidNeighbors(a.x, a.y).filter(n => floorMap[n.y][n.x] !== 'wall').length;
        const bNeighbors = this.getValidNeighbors(b.x, b.y).filter(n => floorMap[n.y][n.x] !== 'wall').length;
        return bNeighbors - aNeighbors;
    });

    for (let i = 0; i < cellsToConvert && i < areaCells.length; i++) {
        const cell = areaCells[i];
        if ((cell.x === 0 && cell.y === 0) || (cell.x === this.MAP_WIDTH - 1 && cell.y === this.MAP_HEIGHT - 1)) continue;
        floorMap[cell.y][cell.x] = 'wall';
    }
  }

  private breakUpWallArea(areaCells: Coordinate[], floorMap: (LogicalRoom | 'wall')[][], floor: number) {
    const cellsToConvert = Math.floor((areaCells.length - 225) / 10);

    for (let i = 0; i < cellsToConvert; i++) {
        if (areaCells.length === 0) break;
        const randIndex = Math.floor(Math.random() * areaCells.length);
        const cell = areaCells[randIndex];
        
        const neighbors = this.getValidNeighbors(cell.x, cell.y);
        const openNeighbors = neighbors.filter(n => floorMap[n.y][n.x] !== 'wall').length;
        if (openNeighbors === 0) {
            floorMap[cell.y][cell.x] = new LogicalRoom(`room-${cell.x}-${cell.y}-f${floor}`, `Secluded Chamber ${cell.x},${cell.y} (Floor ${floor + 1})`, this.getRandomRoomDescription());
        }
        areaCells.splice(randIndex, 1);
    }
  }

  private postProcessMap(floorMap: (LogicalRoom | 'wall')[][], floor: number) {
    // This method is no longer needed with the new generation algorithm,
    // but keeping it as a placeholder if future post-processing is desired.
  }
}