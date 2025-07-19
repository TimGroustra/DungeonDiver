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

  constructor(id: string, name: string, description: string, health: number = 1) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.health = health;
    this.defeated = false;
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
  private enemyLocations: Map<string, string>; // "x,y,floor" -> enemyId
  private puzzleLocations: Map<string, string>; // "x,y,floor" -> puzzleId
  private itemLocations: Map<string, string>; // "x,y,floor" -> itemId (for visible items)
  private staticItemLocations: Map<string, string>; // "x,y,floor" -> itemId (for hidden/static items)
  private revealedStaticItems: Set<string>; // Stores "x,y,floor" strings of revealed static items
  private trapsLocations: Map<string, boolean>; // "x,y,floor" -> true for trap locations
  private triggeredTraps: Set<string>; // Stores "x,y,floor" strings of triggered traps
  private enemies: Map<string, Enemy>;
  private puzzles: Map<string, Puzzle>;
  private items: Map<string, Item>;
  private floorObjectives: Map<number, { description: string; isCompleted: () => boolean; }>; // New: Objectives per floor
  private floorExitStaircases: Map<number, Coordinate>; // New: Location of the staircase to the next floor

  // New quest-related states
  private scholarAmuletQuestCompleted: boolean;
  private whisperingWellQuestCompleted: boolean;
  private trueCompassQuestCompleted: boolean;
  private labyrinthKeyFound: boolean; // New: For Floor 4 quest
  private mysteriousBoxOpened: boolean; // New: For Floor 4 quest
  private heartOfLabyrinthObtained: boolean; // New: For Floor 4 quest
  private heartSacrificed: boolean; // New: For Floor 4 quest

  private baseSearchRadius: number; // Base search radius
  private combatQueue: string[]; // Stores enemy IDs for queued combat
  private lastEnemyMoveTimestamp: number; // Timestamp for enemy movement on Floor 4

  private readonly MAP_WIDTH = 100; // Increased map width
  private readonly MAP_HEIGHT = 100; // Increased map height
  private readonly NUM_FLOORS = 4; // Increased to 4 floors
  private readonly MIN_ELEMENT_DISTANCE = 3; // Decreased minimum distance between placed elements

  private gameResult: { type: 'victory' | 'defeat', name: string, time: number } | null = null; // New: Stores game result

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
    this.combatQueue = [];
    this.lastEnemyMoveTimestamp = 0;

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

      // Carve a main path for each floor
      let currentX = 0;
      let currentY = 0;
      const endX = this.MAP_WIDTH - 1;
      const endY = this.MAP_HEIGHT - 1;

      // Simple path carving for now, can be improved later
      while (currentX !== endX || currentY !== endY) {
        floorMap[currentY][currentX] = new LogicalRoom(`room-${currentX}-${currentY}-f${floor}`, `Winding Passage ${currentX},${currentY} (Floor ${floor + 1})`, this.getRandomRoomDescription());

        const possibleMoves: { x: number, y: number }[] = [];
        if (currentX < endX) possibleMoves.push({ x: currentX + 1, y: currentY });
        if (currentY < endY) possibleMoves.push({ x: currentX, y: currentY + 1 });
        if (currentX > 0) possibleMoves.push({ x: currentX - 1, y: currentY });
        if (currentY > 0) possibleMoves.push({ x: currentX, y: currentY - 1 });

        const validMoves = possibleMoves.filter(move =>
          move.x >= 0 && move.x < this.MAP_WIDTH &&
          move.y >= 0 && move.y < this.MAP_HEIGHT
        );

        let nextMove: Coordinate;
        if (validMoves.length > 0) {
          const preferredMoves = validMoves.filter(move =>
            (move.x > currentX && move.x <= endX) || (move.y > currentY && move.y <= endY)
          );
          if (preferredMoves.length > 0 && Math.random() < 0.8) {
            nextMove = preferredMoves[Math.floor(Math.random() * preferredMoves.length)];
          } else {
            nextMove = validMoves[Math.floor(Math.random() * validMoves.length)];
          }
        } else {
          break;
        }
        currentX = nextMove.x;
        currentY = nextMove.y;
      }
      // Ensure the last cell of the main path is a room
      floorMap[endY][endX] = new LogicalRoom(`room-${endX}-${endY}-f${floor}`, `Floor ${floor + 1} End Chamber`, this.getRandomRoomDescription());

      // Set start room description for each floor
      floorMap[0][0] = new LogicalRoom(`room-0-0-f${floor}`, `Floor ${floor + 1} Entrance`, "You stand at the entrance of this floor. A cold, foreboding draft whispers from the darkness ahead.");

      // Add branching paths, loops, and open areas for each floor
      for (let i = 0; i < 5; i++) {
        for (let y = 0; y < this.MAP_HEIGHT; y++) {
          for (let x = 0; x < this.MAP_WIDTH; x++) {
            if (floorMap[y][x] === 'wall') {
              const neighbors = this.getValidNeighbors(x, y); // Use the new private method
              const numOpenNeighbors = neighbors.filter(n => floorMap[n.y][n.x] !== 'wall').length;
              if (numOpenNeighbors >= 1 && Math.random() < (numOpenNeighbors * 0.15)) {
                floorMap[y][x] = new LogicalRoom(`room-${x}-${y}-f${floor}`, `Hidden Nook ${x},${y} (Floor ${floor + 1})`, this.getRandomRoomDescription());
              }
            }
          }
        }
      }
      this.floors.set(floor, floorMap);
      this.visitedCells.set(floor, new Set<string>()); // Initialize visited cells for each floor
      this.addGameElements(floor);
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
    const enemyHealthMultiplier = 1 + (floor * 0.7); // Increased from 0.5
    const enemyDamageMultiplier = 1 + (floor * 0.3); // Increased from 0.2

    // Common items (can be found on any floor)
    const potion = new Item(`potion-${floor}-1`, "Vial of Lumina", "A small vial containing a glowing, restorative liquid. It promises to mend wounds.", false, 'consumable', 100, true); // Now stackable
    this.items.set(potion.id, potion);
    this.placeElementRandomly(potion.id, this.itemLocations, floor);

    const sword = new Item(`sword-${floor}-1`, "Blade of the Labyrinth", "A finely crafted sword, its edge humming with ancient power. Increases your attack.", false, 'weapon', 15 + (floor * 5)); // Sword gets stronger
    this.items.set(sword.id, sword);
    this.placeElementRandomly(sword.id, this.itemLocations, floor);

    const shield = new Item(`shield-${floor}-1`, "Aegis of the Guardian", "A sturdy shield emblazoned with a forgotten crest. Increases your defense.", false, 'shield', 5 + (floor * 2)); // Shield gets stronger
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

      // Place staircase to next floor
      const staircase = new Item(`staircase-f${floor}-to-f${floor + 1}`, "Mysterious Staircase", "A spiraling staircase leading deeper into the labyrinth. It seems to be magically sealed.", true, 'static');
      this.items.set(staircase.id, staircase);
      this.placeElementRandomly(staircase.id, this.staticItemLocations, floor);
      this.floorExitStaircases.set(floor, this.getCoordForElement(staircase.id, this.staticItemLocations, floor)!);

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

      // Place staircase to next floor
      const staircase = new Item(`staircase-f${floor}-to-f${floor + 1}`, "Dark Chasm", "A gaping chasm with a faint glow at its bottom. A path seems to open only when the guardian is defeated.", true, 'static');
      this.items.set(staircase.id, staircase);
      this.placeElementRandomly(staircase.id, this.staticItemLocations, floor);
      this.floorExitStaircases.set(floor, this.getCoordForElement(staircase.id, this.staticItemLocations, floor)!);

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

      // Place staircase to next floor (to Floor 4)
      const staircase = new Item(`staircase-f${floor}-to-f${floor + 1}`, "Descent to the Core", "A dark, foreboding staircase leading to the deepest floor of the Labyrinth.", true, 'static');
      this.items.set(staircase.id, staircase);
      this.placeElementRandomly(staircase.id, this.staticItemLocations, floor);
      this.floorExitStaircases.set(floor, this.getCoordForElement(staircase.id, this.staticItemLocations, floor)!);

    } else if (floor === this.NUM_FLOORS - 1) { // Last Floor (Floor 4): The Heart of the Labyrinth
      const labyrinthKey = new Item("labyrinth-key-f3", "Labyrinth Key", "A heavy, ornate key, pulsating with a faint, dark energy.", false, 'key');
      this.items.set(labyrinthKey.id, labyrinthKey);
      this.placeElementRandomly(labyrinthKey.id, this.itemLocations, floor);

      const mysteriousBox = new Item("mysterious-box-f3", "Mysterious Box", "A sturdy, iron-bound box, locked tight. It seems to hum with a hidden power.", true, 'static');
      this.items.set(mysteriousBox.id, mysteriousBox);
      this.placeElementRandomly(mysteriousBox.id, this.staticItemLocations, floor);

      const ancientAltar = new Item("ancient-altar-f3", "Ancient Altar", "A blood-stained stone altar, radiating an oppressive aura. It feels like a place of sacrifice.", true, 'static');
      this.items.set(ancientAltar.id, ancientAltar);
      this.placeElementRandomly(ancientAltar.id, this.staticItemLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Find the 'Labyrinth Key', use it to open the 'Mysterious Box' to obtain the 'Heart of the Labyrinth', then sacrifice the Heart at the 'Ancient Altar' to destroy the Labyrinth.",
        isCompleted: () => this.heartSacrificed
      });
      // The exit portal is implicitly at the end of the main path for the last floor, but the objective is to sacrifice the heart.
    }

    // Add generic enemies (scaled)
    const numGenericEnemies = 10; // Increased number of generic enemies
    for (let i = 0; i < numGenericEnemies; i++) {
      const goblin = new Enemy(`goblin-${floor}-${i}`, "Grumbling Goblin", "A small, green-skinned creature with a rusty dagger and a mischievous glint in its eye.", Math.floor(3 * enemyHealthMultiplier));
      this.enemies.set(goblin.id, goblin);
      this.placeElementRandomly(goblin.id, this.enemyLocations, floor);

      const skeleton = new Enemy(`skeleton-${floor}-${i}`, "Rattling Skeleton", "An animated skeleton warrior, its bones clattering as it raises a chipped sword.", Math.floor(4 * enemyHealthMultiplier));
      this.enemies.set(skeleton.id, skeleton);
      this.placeElementRandomly(skeleton.id, this.enemyLocations, floor);

      const shadowBeast = new Enemy(`shadow-beast-${floor}-${i}`, "Whispering Shadow", "A formless entity of pure darkness, its presence chills you to the bone.", Math.floor(5 * enemyHealthMultiplier));
      this.enemies.set(shadowBeast.id, shadowBeast);
      this.placeElementRandomly(shadowBeast.id, this.enemyLocations, floor);
    }

    // Add traps (same number as enemies)
    const numTraps = numGenericEnemies; // Increased number of traps
    for (let i = 0; i < numTraps; i++) {
      this.placeElementRandomly(`trap-${floor}-${i}`, this.trapsLocations, floor);
    }
  }

  // Helper to get coordinates of an element (used for staircase)
  private getCoordForElement(id: string, locationMap: Map<string, string | boolean>, floor: number): Coordinate | undefined {
    for (const [coordStr, elementId] of locationMap.entries()) {
      const [x, y, f] = coordStr.split(',').map(Number);
      if (elementId === id && f === floor) {
        return { x, y };
      }
    }
    return undefined;
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

  private placeElementRandomly(id: string, locationMap: Map<string, string | boolean>, floor: number) {
    let placed = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 1000; // Prevent infinite loops in very dense maps

    while (!placed && attempts < MAX_ATTEMPTS) {
      const x = Math.floor(Math.random() * this.MAP_WIDTH);
      const y = Math.floor(Math.random() * this.MAP_HEIGHT);
      const coordStr = `${x},${y},${floor}`; // Include floor in coordinate string
      const currentFloorMap = this.floors.get(floor)!;

      // Ensure not placed at player start (0,0) of this floor, or on an existing element, and only in an open room
      // The exit portal for the *last* floor is special, so we don't place other elements there.
      const isFinalExitPortal = (floor === this.NUM_FLOORS - 1) && (x === this.MAP_WIDTH - 1 && y === this.MAP_HEIGHT - 1);

      if (
        (x !== 0 || y !== 0) && // Not at floor entrance
        !isFinalExitPortal && // Not at the final exit portal (which is now the altar location)
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

  clearMessages() {
    this.messages = [];
  }

  getMessages(): string[] {
    return this.messages;
  }

  getPlayerLocation(): Coordinate {
    return this.playerLocation;
  }

  getCurrentFloor(): number {
    return this.currentFloor;
  }

  getPlayerHealth(): number {
    return this.playerHealth;
  }

  getPlayerMaxHealth(): number {
    return this.playerMaxHealth;
  }

  getCurrentAttackDamage(): number {
    return this.baseAttackDamage + (this.equippedWeapon?.effectValue || 0) + (this.equippedAmulet?.effectValue || 0);
  }

  getCurrentDefense(): number {
    return this.baseDefense + (this.equippedShield?.effectValue || 0) + (this.equippedAmulet?.effectValue || 0);
  }

  public getSearchRadius(): number {
    return this.baseSearchRadius + (this.equippedCompass?.effectValue || 0);
  }

  // Made public for LabyrinthGame component
  public getEquippedWeapon(): Item | undefined {
    return this.equippedWeapon;
  }

  // Made public for LabyrinthGame component
  public getEquippedShield(): Item | undefined {
    return this.equippedShield;
  }

  // New public getters for equipped accessories
  public getEquippedAmulet(): Item | undefined {
    return this.equippedAmulet;
  }

  public getEquippedCompass(): Item | undefined {
    return this.equippedCompass;
  }

  // Updated to return items with quantities
  getInventoryItems(): { item: Item, quantity: number }[] {
    return Array.from(this.inventory.values());
  }

  getCurrentLogicalRoom(): LogicalRoom | undefined {
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

  getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  getPuzzle(id: string): Puzzle | undefined {
    return this.puzzles.get(id);
  }

  getItem(id: string): Item | undefined {
    return this.items.get(id);
  }

  getRevealedStaticItems(): Set<string> {
    return this.revealedStaticItems;
  }

  public getTriggeredTraps(): Set<string> {
    return this.triggeredTraps;
  }

  isGameOver(): boolean {
    return this.gameOver;
  }

  // New method to get game result
  getGameResult(): { type: 'victory' | 'defeat', name: string, time: number } | null {
    return this.gameResult;
  }

  private setGameOver(type: 'victory' | 'defeat', playerName: string, time: number) {
    this.gameOver = true;
    this.gameResult = { type, name: playerName, time };
  }

  private markVisited(coord: Coordinate) {
    let floorVisited = this.visitedCells.get(this.currentFloor);
    if (!floorVisited) {
      floorVisited = new Set<string>();
      this.visitedCells.set(this.currentFloor, floorVisited);
    }
    floorVisited.add(`${coord.x},${coord.y}`);
  }

  getVisitedCells(): Set<string> {
    return this.visitedCells.get(this.currentFloor) || new Set<string>();
  }

  getMapGrid(): ('wall' | 'open')[][] {
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

  getCurrentFloorObjective(): { description: string; isCompleted: () => boolean; } {
    return this.floorObjectives.get(this.currentFloor)!; // Should always exist
  }

  ascendFloor(playerName: string, time: number) {
    if (this.currentFloor >= this.NUM_FLOORS - 1) {
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

  private _tryActivateWellBlessing(playerName: string, time: number): boolean {
    const blessingEntry = this.inventory.get("well-blessing-f1");
    if (blessingEntry && blessingEntry.quantity > 0 && blessingEntry.item.effectValue) {
      blessingEntry.quantity--;
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + blessingEntry.item.effectValue);
      if (blessingEntry.quantity <= 0) {
        this.inventory.delete("well-blessing-f1");
        this.addMessage(`The Whispering Well's Blessing activates, saving you from oblivion! You feel a surge of vitality as the last charge is consumed.`);
      } else {
        this.inventory.set("well-blessing-f1", blessingEntry);
        this.addMessage(`The Whispering Well's Blessing activates, saving you from oblivion! You feel a surge of vitality! (${blessingEntry.quantity} uses left)`);
      }
      return true;
    }
    return false;
  }

  move(direction: "north" | "south" | "east" | "west", playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const currentMap = this.floors.get(this.currentFloor)!; // Get current floor map

    let newX = this.playerLocation.x;
    let newY = this.playerLocation.y;

    switch (direction) {
      case "north":
        newY--;
        break;
      case "south":
        newY++;
        break;
      case "east":
        newX++;
        break;
      case "west":
        newX--;
        break;
    }

    if (
      newX >= 0 &&
      newX < this.MAP_WIDTH &&
      newY >= 0 &&
      newY < this.MAP_HEIGHT
    ) {
      if (currentMap[newY][newX] === 'wall') {
        this.addMessage("A solid, ancient stone wall blocks your path, cold to the touch. You cannot go that way.");
        return;
      }

      this.playerLocation = { x: newX, y: newY };
      this.markVisited(this.playerLocation);

      const currentRoom = this.getCurrentLogicalRoom();
      if (currentRoom) {
        this.addMessage(`You cautiously step ${direction} into the echoing darkness. ${currentRoom.description}`);
      } else {
        this.addMessage(`You cautiously step ${direction} into the echoing darkness.`);
      }

      const trapTriggeredCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
      if (this.trapsLocations.has(trapTriggeredCoord)) {
          this.playerHealth -= 10;
          this.triggeredTraps.add(trapTriggeredCoord); // Mark trap as triggered
          this.addMessage("SNAP! You triggered a hidden pressure plate! A sharp pain shoots through your leg. You take 10 damage!");
          if (this.playerHealth <= 0) {
              if (!this._tryActivateWellBlessing(playerName, time)) {
                  this.addMessage("The trap's venom courses through your veins. Darkness consumes you... Game Over.");
                  this.setGameOver('defeat', playerName, time);
              }
          }
      }

      // Check for game over condition (reaching the exit on the LAST floor)
      if (this.currentFloor === this.NUM_FLOORS - 1 && newX === this.MAP_WIDTH - 1 && newY === this.MAP_HEIGHT - 1) {
        const finalObjective = this.floorObjectives.get(this.currentFloor);
        if (finalObjective?.isCompleted()) {
          this.addMessage("A shimmering portal, bathed in ethereal light! You step through, escaping its grasp! Congratulations, brave adventurer!");
          this.setGameOver('victory', playerName, time);
        } else {
          this.addMessage("The shimmering portal hums with energy, but it seems to require the completion of this floor's objective to activate fully. You cannot escape yet!");
        }
      }

      // Check for enemy encounter (only if no combat is queued)
      if (this.combatQueue.length === 0) {
        const enemyId = this.enemyLocations.get(`${newX},${newY},${this.currentFloor}`);
        if (enemyId) {
          const enemy = this.enemies.get(enemyId);
          if (enemy && !enemy.defeated) {
            this.addMessage(`As you enter, a monstrous shadow stirs in the corner! A ${enemy.name} lunges! Prepare for combat!`);
            this.combatQueue.push(enemyId); // Add to queue for immediate combat
          }
        }
      }
    } else {
      this.addMessage("You cannot go that way. You've reached the edge of the known labyrinth.");
    }
  }

  // New private method to handle picking up items
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

  search() {
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
                        this._handleFoundItem(item, coordStr); // Use the new handler
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

  interact(playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
    let interacted = false;

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
        } else {
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

  useItem(itemId: string, playerName: string, time: number) {
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
          this.equippedWeapon = undefined;
          this.addMessage(`You unequip the ${item.name}.`);
          // When unequipped, it goes back to inventory with quantity 1
          this.inventory.set(item.id, { item: item, quantity: 1 });
        } else {
          // If another weapon is equipped, put it back into inventory (if not already there)
          if (this.equippedWeapon) {
            const oldEquipped = this.equippedWeapon;
            const oldEntry = this.inventory.get(oldEquipped.id);
            if (oldEntry) {
              oldEntry.quantity++;
              this.inventory.set(oldEquipped.id, oldEntry);
            } else {
              this.inventory.set(oldEquipped.id, { item: oldEquipped, quantity: 1 });
            }
            this.addMessage(`You unequip the ${oldEquipped.name} and equip the ${item.name}.`);
          } else {
            this.addMessage(`You equip the ${item.name}.`);
          }
          this.inventory.delete(itemId); // Remove from inventory as it's now equipped
        }
        break;
      case 'shield':
        if (this.equippedShield?.id === item.id) {
          this.equippedShield = undefined;
          this.addMessage(`You unequip the ${item.name}.`);
          // When unequipped, it goes back to inventory with quantity 1
          this.inventory.set(item.id, { item: item, quantity: 1 });
        } else {
          // If another shield is equipped, put it back into inventory (if not already there)
          if (this.equippedShield) {
            const oldEquipped = this.equippedShield;
            const oldEntry = this.inventory.get(oldEquipped.id);
            if (oldEntry) {
              oldEntry.quantity++;
              this.inventory.set(oldEquipped.id, oldEntry);
            } else {
              this.inventory.set(oldEquipped.id, { item: oldEquipped, quantity: 1 });
            }
            this.addMessage(`You unequip the ${oldEquipped.name} and equip the ${item.name}.`);
          } else {
            this.addMessage(`You equip the ${item.name}.`);
          }
          this.inventory.delete(itemId); // Remove from inventory as it's now equipped
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

  fight(playerChoice: "left" | "center" | "right", playerName: string, time: number) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    let enemyId: string | undefined;

    // If combat queue is active, fight the first enemy in the queue
    if (this.combatQueue.length > 0) {
        enemyId = this.combatQueue[0];
    } else {
        // Otherwise, check for an enemy at the current location
        const currentCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
        enemyId = this.enemyLocations.get(currentCoord);
    }

    if (!enemyId) {
      this.addMessage("There's no enemy here to fight.");
      return;
    }

    const enemy = this.enemies.get(enemyId);
    if (!enemy || enemy.defeated) {
      // This case should ideally not happen if combatQueue is managed well
      // but as a safeguard, if the enemy is already defeated, remove from queue
      if (this.combatQueue.length > 0 && this.combatQueue[0] === enemyId) {
          this.combatQueue.shift();
      }
      this.addMessage("The enemy here has already been defeated.");
      return;
    }

    const enemyChoices: ("left" | "center" | "right")[] = ["left", "center", "right"];
    const enemyChoice = enemyChoices[Math.floor(Math.random() * enemyChoices.length)];

    this.addMessage(`You prepare for battle, choosing to ${playerChoice}! The ${enemy.name} counters with ${enemyChoice}!`);

    let playerWins = false;
    let enemyWins = false;

    const winningMoves = {
      "left": "right",
      "center": "left",
      "right": "center",
    };

    if (playerChoice === enemyChoice) {
      this.addMessage("Clash! Your moves mirror each other, a momentary stalemate.");
    } else if (winningMoves[playerChoice] === enemyChoice) {
      playerWins = true;
    } else {
      enemyWins = true;
    }

    // Enemy damage scales with floor
    const enemyBaseDamage = 12; // Increased from 10
    const enemyDamageMultiplier = 1 + (this.currentFloor * 0.3); // Increased from 0.2
    const actualEnemyDamage = Math.floor(enemyBaseDamage * enemyDamageMultiplier);

    if (playerWins) {
      enemy.takeDamage(this.getCurrentAttackDamage());
      this.addMessage(`A decisive blow! You hit the ${enemy.name} for ${this.getCurrentAttackDamage()} damage! Its health is now ${enemy.health}.`);
      if (enemy.defeated) {
        this.addMessage(`With a final, guttural cry, the ${enemy.name} collapses, defeated! The path is clear.`);
        // Find and remove the defeated enemy from enemyLocations
        let enemyLocationKey: string | undefined;
        for (const [key, id] of this.enemyLocations.entries()) {
            if (id === enemyId) {
                enemyLocationKey = key;
                break;
            }
        }
        if (enemyLocationKey) {
            this.enemyLocations.delete(enemyLocationKey);
        }

        // Remove from combat queue
        const queueIndex = this.combatQueue.indexOf(enemyId);
        if (queueIndex > -1) {
            this.combatQueue.splice(queueIndex, 1);
        }

        // If there are more enemies in the queue, add a message
        if (this.combatQueue.length > 0) {
            const nextEnemyInQueue = this.enemies.get(this.combatQueue[0]);
            if (nextEnemyInQueue) {
                this.addMessage(`Another ${nextEnemyInQueue.name} is ready to attack!`);
            }
        }
      }
    } else if (enemyWins) {
      const damageTaken = Math.max(0, actualEnemyDamage - this.getCurrentDefense());
      this.playerHealth -= damageTaken;
      this.addMessage(`The ${enemy.name} strikes true! You wince as you take ${damageTaken} damage. Your health is now ${this.playerHealth}.`);
      if (this.playerHealth <= 0) {
        if (!this._tryActivateWellBlessing(playerName, time)) {
            this.addMessage("Darkness consumes you as your strength fails. The Labyrinth claims another victim... Game Over.");
            this.setGameOver('defeat', playerName, time);
        }
      }
    }
  }

  private _isValidEnemyMove(x: number, y: number, currentFloorMap: (LogicalRoom | 'wall')[][]): boolean {
    return x >= 0 && x < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT && currentFloorMap[y][x] !== 'wall';
  }

  public processEnemyMovement() {
    // Enemies only move if the current floor's objective is completed and game is not over
    if (this.gameOver || !this.getCurrentFloorObjective().isCompleted()) {
        return;
    }

    // Check if 2 seconds have passed since last enemy move
    if (Date.now() - this.lastEnemyMoveTimestamp < 2000) {
        return;
    }

    this.lastEnemyMoveTimestamp = Date.now();
    const playerX = this.playerLocation.x;
    const playerY = this.playerLocation.y;
    const currentFloorMap = this.floors.get(this.currentFloor)!;

    const enemiesToMove: { id: string; coordStr: string; enemy: Enemy }[] = [];
    for (const [coordStr, enemyId] of this.enemyLocations.entries()) {
        const [x, y, f] = coordStr.split(',').map(Number);
        if (f === this.currentFloor) { // Only consider enemies on the current floor
            const enemy = this.enemies.get(enemyId);
            if (enemy && !enemy.defeated) {
                enemiesToMove.push({ id: enemyId, coordStr, enemy });
            }
        }
    }

    if (enemiesToMove.length === 0) {
        return;
    }

    for (const { id: enemyId, coordStr, enemy } of enemiesToMove) {
        const [oldX, oldY] = coordStr.split(',').map(Number);
        let newX = oldX;
        let newY = oldY;

        const targetX = playerX;
        const targetY = playerY;

        const dx = targetX - oldX;
        const dy = targetY - oldY;

        let movedThisTurn = false;

        // Determine preferred move direction based on greater distance
        if (Math.abs(dx) > Math.abs(dy)) {
            // Try moving horizontally
            const potentialX = oldX + Math.sign(dx);
            if (this._isValidEnemyMove(potentialX, oldY, currentFloorMap)) {
                newX = potentialX;
                movedThisTurn = true;
            } else {
                // If horizontal blocked, try vertical
                const potentialY = oldY + Math.sign(dy);
                if (this._isValidEnemyMove(oldX, potentialY, currentFloorMap)) {
                    newY = potentialY;
                    movedThisTurn = true;
                }
            }
        } else {
            // Try moving vertically
            const potentialY = oldY + Math.sign(dy);
            if (this._isValidEnemyMove(oldX, potentialY, currentFloorMap)) {
                newY = potentialY;
                movedThisTurn = true;
            } else {
                // If vertical blocked, try horizontal
                const potentialX = oldX + Math.sign(dx);
                if (this._isValidEnemyMove(potentialX, oldY, currentFloorMap)) {
                    newX = potentialX;
                    movedThisTurn = true;
                }
            }
        }

        if (!movedThisTurn) {
            continue; // Skip to next enemy
        }

        // Check if the new position is the player's current location
        if (newX === playerX && newY === playerY) {
            if (!this.combatQueue.includes(enemyId)) {
                this.combatQueue.push(enemyId);
                this.addMessage(`A ${enemy.name} has caught up to you at your location! Prepare for combat!`);
            }
        } else {
            // Move enemy to new position
            this.enemyLocations.delete(coordStr); // Remove old location
            this.enemyLocations.set(`${newX},${newY},${this.currentFloor}`, enemyId); // Add new location
        }
    }
  }

  public getCombatQueue(): string[] {
    return this.combatQueue;
  }
}