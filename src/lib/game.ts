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
  type: 'consumable' | 'weapon' | 'shield' | 'key' | 'artifact' | 'static' | 'generic';
  effectValue?: number; // e.g., health restore amount, attack bonus, defense bonus

  constructor(
    id: string,
    name: string,
    description: string,
    isStatic: boolean = false,
    type: 'consumable' | 'weapon' | 'shield' | 'key' | 'artifact' | 'static' | 'generic' = 'generic',
    effectValue?: number
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.isStatic = isStatic;
    this.type = type;
    this.effectValue = effectValue;
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
  private inventory: Item[];
  private messages: string[];
  private gameOver: boolean;
  private visitedCells: Map<number, Set<string>>; // Stores "x,y" strings of visited cells per floor
  private enemyLocations: Map<string, string>; // "x,y,floor" -> enemyId
  private puzzleLocations: Map<string, string>; // "x,y,floor" -> puzzleId
  private itemLocations: Map<string, string>; // "x,y,floor" -> itemId (for visible items)
  private staticItemLocations: Map<string, string>; // "x,y,floor" -> itemId (for hidden/static items)
  private revealedStaticItems: Set<string>; // Stores "x,y,floor" strings of revealed static items
  private trapsLocations: Map<string, boolean>; // "x,y,floor" -> true for trap locations
  private enemies: Map<string, Enemy>;
  private puzzles: Map<string, Puzzle>;
  private items: Map<string, Item>;
  private leverActivated: boolean; // This might need to be per-floor if multiple levers exist
  private floorObjectives: Map<number, { description: string; isCompleted: () => boolean; }>; // New: Objectives per floor
  private floorExitStaircases: Map<number, Coordinate>; // New: Location of the staircase to the next floor

  private readonly MAP_WIDTH = 50;
  private readonly MAP_HEIGHT = 50;
  private readonly NUM_FLOORS = 3; // Let's start with 3 floors
  private readonly MIN_ELEMENT_DISTANCE = 5; // Minimum distance between placed elements

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
    this.inventory = [];
    this.messages = [];
    this.gameOver = false;
    this.visitedCells = new Map();
    this.enemyLocations = new Map();
    this.puzzleLocations = new Map();
    this.itemLocations = new Map();
    this.staticItemLocations = new Map();
    this.revealedStaticItems = new Set<string>();
    this.trapsLocations = new Map();
    this.enemies = new Map();
    this.puzzles = new Map();
    this.items = new Map();
    this.leverActivated = false; // This will be global for now, consider making it per-floor if needed
    this.floorObjectives = new Map();
    this.floorExitStaircases = new Map();

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
    const enemyHealthMultiplier = 1 + (floor * 0.5); // +50% health per floor
    const enemyDamageMultiplier = 1 + (floor * 0.2); // +20% damage per floor

    // Common items (can be found on any floor)
    const potion = new Item(`potion-${floor}-1`, "Vial of Lumina", "A small vial containing a glowing, restorative liquid. It promises to mend wounds.", false, 'consumable', 100);
    this.items.set(potion.id, potion);
    this.placeElementRandomly(potion.id, this.itemLocations, floor);

    const sword = new Item(`sword-${floor}-1`, "Blade of the Labyrinth", "A finely crafted sword, its edge humming with ancient power. Increases your attack.", false, 'weapon', 15 + (floor * 5)); // Sword gets stronger
    this.items.set(sword.id, sword);
    this.placeElementRandomly(sword.id, this.itemLocations, floor);

    const shield = new Item(`shield-${floor}-1`, "Aegis of the Guardian", "A sturdy shield emblazoned with a forgotten crest. Increases your defense.", false, 'shield', 5 + (floor * 2)); // Shield gets stronger
    this.items.set(shield.id, shield);
    this.placeElementRandomly(shield.id, this.itemLocations, floor);

    const oilCan = new Item(`oil-can-${floor}-1`, "Rusty Oil Can", "A small can filled with thick, dark oil. Might be useful for rusted mechanisms.", false, 'generic');
    this.items.set(oilCan.id, oilCan);
    this.placeElementRandomly(oilCan.id, this.itemLocations, floor);

    // Floor-specific elements and objectives
    if (floor === 0) { // Floor 1
      const key = new Item("key-1", "Ornate Skeleton Key", "A heavy, intricately carved key, rumored to unlock ancient mechanisms.", false, 'key');
      this.items.set(key.id, key);
      this.placeElementRandomly(key.id, this.itemLocations, floor);

      const riddle = new Puzzle("riddle-1", "Riddle of the Echoing Chamber", "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "echo", new Item("gem-1", "Heart of the Labyrinth", "A pulsating, radiant gem. It feels incredibly powerful and might be the artifact you seek!", false, 'artifact'));
      this.puzzles.set(riddle.id, riddle);
      this.placeElementRandomly(riddle.id, this.puzzleLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Find the 'Heart of the Labyrinth' (a pulsating gem) to unlock the path to the next floor.",
        isCompleted: () => this.inventory.some(item => item.id === "gem-1")
      });

      // Place staircase to next floor
      const staircase = new Item(`staircase-f${floor}-to-f${floor + 1}`, "Mysterious Staircase", "A spiraling staircase leading deeper into the labyrinth. It seems to be magically sealed.", true, 'static');
      this.items.set(staircase.id, staircase);
      this.placeElementRandomly(staircase.id, this.staticItemLocations, floor);
      this.floorExitStaircases.set(floor, this.getCoordForElement(staircase.id, this.staticItemLocations, floor)!);

    } else if (floor === 1) { // Floor 2
      const floorGuardian = new Enemy("floor-guardian-2", "Ancient Golem", "A towering construct of stone and moss, guarding the passage to the lower levels.", Math.floor(5 * enemyHealthMultiplier));
      this.enemies.set(floorGuardian.id, floorGuardian);
      this.placeElementRandomly(floorGuardian.id, this.enemyLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Defeat the 'Ancient Golem' to unlock the path to the next floor.",
        isCompleted: () => this.enemies.get("floor-guardian-2")?.defeated || false
      });

      // Place staircase to next floor
      const staircase = new Item(`staircase-f${floor}-to-f${floor + 1}`, "Dark Chasm", "A gaping chasm with a faint glow at its bottom. A path seems to open only when the guardian is defeated.", true, 'static');
      this.items.set(staircase.id, staircase);
      this.placeElementRandomly(staircase.id, this.staticItemLocations, floor);
      this.floorExitStaircases.set(floor, this.getCoordForElement(staircase.id, this.staticItemLocations, floor)!);

    } else if (floor === this.NUM_FLOORS - 1) { // Last Floor (Floor 3)
      const grandRiddle = new Puzzle("grand-riddle-3", "The Grand Riddle of Eternity", "I have cities, but no houses; forests, but no trees; and water, but no fish. What am I?", "map", new Item("final-artifact", "Orb of Aethel", "A shimmering orb, pulsating with immense power. This is the key to escaping the Labyrinth!", false, 'artifact'));
      this.puzzles.set(grandRiddle.id, grandRiddle);
      this.placeElementRandomly(grandRiddle.id, this.puzzleLocations, floor);

      this.floorObjectives.set(floor, {
        description: "Solve the 'Grand Riddle of Eternity' to reveal the final exit portal.",
        isCompleted: () => this.puzzles.get("grand-riddle-3")?.solved || false
      });
      // The exit portal is implicitly at the end of the main path for the last floor
    }

    // Add generic enemies (scaled)
    const goblin = new Enemy(`goblin-${floor}-1`, "Grumbling Goblin", "A small, green-skinned creature with a rusty dagger and a mischievous glint in its eye.", Math.floor(2 * enemyHealthMultiplier));
    this.enemies.set(goblin.id, goblin);
    this.placeElementRandomly(goblin.id, this.enemyLocations, floor);

    const skeleton = new Enemy(`skeleton-${floor}-1`, "Rattling Skeleton", "An animated skeleton warrior, its bones clattering as it raises a chipped sword.", Math.floor(3 * enemyHealthMultiplier));
    this.enemies.set(skeleton.id, skeleton);
    this.placeElementRandomly(skeleton.id, this.enemyLocations, floor);

    const shadowBeast = new Enemy(`shadow-beast-${floor}-1`, "Whispering Shadow", "A formless entity of pure darkness, its presence chills you to the bone.", Math.floor(4 * enemyHealthMultiplier));
    this.enemies.set(shadowBeast.id, shadowBeast);
    this.placeElementRandomly(shadowBeast.id, this.enemyLocations, floor);

    // Add traps (half as many as enemies, scaled damage)
    const numEnemies = 3; // Fixed number of generic enemies per floor
    const numTraps = Math.floor(numEnemies / 2);
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
      const isExitPortalForLastFloor = (floor === this.NUM_FLOORS - 1) && (x === this.MAP_WIDTH - 1 && y === this.MAP_HEIGHT - 1);

      if (
        (x !== 0 || y !== 0) && // Not at floor entrance
        !isExitPortalForLastFloor && // Not at the final exit portal
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
    return this.baseAttackDamage + (this.equippedWeapon?.effectValue || 0);
  }

  getCurrentDefense(): number {
    return this.baseDefense + (this.equippedShield?.effectValue || 0);
  }

  // Made public for LabyrinthGame component
  public getEquippedWeapon(): Item | undefined {
    return this.equippedWeapon;
  }

  // Made public for LabyrinthGame component
  public getEquippedShield(): Item | undefined {
    return this.equippedShield;
  }

  getInventoryItems(): Item[] {
    return this.inventory;
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

  isGameOver(): boolean {
    return this.gameOver;
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

  ascendFloor() {
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

  move(direction: "north" | "south" | "east" | "west") {
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
          this.addMessage("SNAP! You triggered a hidden pressure plate! A sharp pain shoots through your leg. You take 10 damage!");
          this.trapsLocations.delete(trapTriggeredCoord);
          if (this.playerHealth <= 0) {
              this.addMessage("The trap's venom courses through your veins. Darkness consumes you... Game Over.");
              this.gameOver = true;
          }
      }

      // Check for game over condition (reaching the exit on the LAST floor)
      if (this.currentFloor === this.NUM_FLOORS - 1 && newX === this.MAP_WIDTH - 1 && newY === this.MAP_HEIGHT - 1) {
        const hasFinalArtifact = this.inventory.some(item => item.id === "final-artifact");
        const finalObjective = this.floorObjectives.get(this.currentFloor);
        if (finalObjective?.isCompleted() && hasFinalArtifact) {
          this.addMessage("A shimmering portal, bathed in ethereal light! You step through, the Orb of Aethel pulsating in your hand, escaping its grasp! Congratulations, brave adventurer!");
          this.gameOver = true;
        } else {
          this.addMessage("The shimmering portal hums with energy, but it seems to require a powerful artifact and the completion of this floor's objective to activate fully. You cannot escape yet!");
        }
      }

      // Check for enemy encounter
      const enemyId = this.enemyLocations.get(`${newX},${newY},${this.currentFloor}`);
      if (enemyId) {
        const enemy = this.enemies.get(enemyId);
        if (enemy && !enemy.defeated) {
          this.addMessage(`As you enter, a monstrous shadow stirs in the corner! A ${enemy.name} lunges! Prepare for combat!`);
        }
      }
    } else {
      this.addMessage("You cannot go that way. You've reached the edge of the known labyrinth.");
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

    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
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
                        this.inventory.push(item);
                        this.itemLocations.delete(coordStr);
                        this.addMessage(`You found a ${item.name} at your feet! It's a ${item.description}`);
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
                        // Auto-solve logic for key (Floor 1 riddle)
                        if (puzzle.id === "riddle-1" && this.inventory.some(item => item.id === "key-1")) {
                            if (puzzle.solve("echo")) {
                                this.addMessage(`With a click and a grind, the ancient mechanism yields! You used the Ornate Skeleton Key and solved the puzzle: "${puzzle.name}"!`);
                                if (puzzle.reward) {
                                    this.inventory.push(puzzle.reward);
                                    this.addMessage(`A hidden compartment opens, revealing a ${puzzle.reward.name}! You add it to your inventory.`);
                                }
                                foundSomethingInRadius = true;
                            }
                        } else if (puzzle.id === "grand-riddle-3") { // Grand Riddle on Floor 3
                            // This puzzle requires explicit 'interact' to solve, not auto-solve on search
                            this.addMessage(`You sense an unsolved puzzle at (${targetX},${targetY}). It seems to be the Grand Riddle of Eternity.`);
                            foundSomethingInRadius = true;
                        } else {
                            this.addMessage(`You attempt to interact with the ancient device, but it remains stubbornly inert. Perhaps a missing piece or a forgotten word is needed.`);
                            foundSomethingInRadius = true;
                        }
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
            }
        }
    }

    if (!foundSomethingInRadius) {
        this.addMessage("You meticulously search the area and its immediate surroundings, but find nothing new.");
    }
  }

  interact() {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
    let interacted = false;

    // Check for floor exit staircase
    const staircaseCoord = this.floorExitStaircases.get(this.currentFloor);
    if (staircaseCoord && staircaseCoord.x === this.playerLocation.x && staircaseCoord.y === this.playerLocation.y) {
      this.ascendFloor();
      interacted = true;
    }

    // Check for puzzles to interact with
    const puzzleId = this.puzzleLocations.get(currentCoord);
    if (puzzleId) {
      const puzzle = this.puzzles.get(puzzleId);
      if (puzzle && !puzzle.solved) {
        if (puzzle.id === "riddle-1") { // Floor 1 riddle
          if (this.inventory.some(item => item.id === "key-1")) {
            if (puzzle.solve("echo")) {
              this.addMessage(`With a click and a grind, the ancient mechanism yields! You used the Ornate Skeleton Key and solved the puzzle: "${puzzle.name}"!`);
              if (puzzle.reward) {
                this.inventory.push(puzzle.reward);
                this.addMessage(`A hidden compartment opens, revealing a ${puzzle.reward.name}! You add it to your inventory.`);
              }
              interacted = true;
            }
          } else {
            this.addMessage(`You attempt to interact with the ancient device, but it remains stubbornly inert. Perhaps a missing piece or a forgotten word is needed.`);
            interacted = true;
          }
        } else if (puzzle.id === "grand-riddle-3") { // Floor 3 Grand Riddle
            const attempt = prompt("The Grand Riddle of Eternity: I have cities, but no houses; forests, but no trees; and water, but no fish. What am I? (Type your answer)");
            if (attempt) {
                if (puzzle.solve(attempt)) {
                    this.addMessage(`A deep rumble echoes through the chamber as the riddle is solved! The path to escape is revealed!`);
                    if (puzzle.reward) {
                        this.inventory.push(puzzle.reward);
                        this.addMessage(`A shimmering Orb of Aethel appears! You add it to your inventory.`);
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

    // Also check for static items to interact with
    const staticItemId = this.staticItemLocations.get(currentCoord);
    if (staticItemId) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem) {
        if (staticItem.id.startsWith("lever-")) { // Generic lever interaction
          const oilCanIndex = this.inventory.findIndex(item => item.id.startsWith("oil-can-")); // Check for any oil can
          if (!this.leverActivated) { // Assuming one global lever for now
            if (oilCanIndex !== -1) {
              this.inventory.splice(oilCanIndex, 1);
              this.leverActivated = true;
              // Place a powerful consumable (e.g., Elixir of Might)
              const elixir = new Item(`elixir-${this.currentFloor}-1`, "Elixir of Might", "A potent concoction that temporarily boosts your strength and fully restores health.", false, 'consumable', 100);
              this.items.set(elixir.id, elixir);
              this.itemLocations.set(currentCoord, elixir.id); // Place at current location
              this.addMessage(`You apply the oil to the rusty lever. With a mighty heave, it grinds into place! A hidden compartment opens, revealing a shimmering Elixir of Might!`);
              this.addMessage(`The Elixir of Might has appeared at your current location. Use 'Search Area' to pick it up!`);
            } else {
              this.addMessage("The ancient lever is rusted solid. It seems to require something to loosen it.");
            }
          } else {
            this.addMessage("The lever is already activated, but nothing more happens.");
          }
          interacted = true;
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

    if (!interacted) {
      this.addMessage("There's nothing here that responds to your touch.");
    }
  }

  useItem(itemId: string) {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const itemIndex = this.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      this.addMessage("You don't have that item in your inventory.");
      return;
    }

    const item = this.inventory[itemIndex];

    switch (item.type) {
      case 'consumable':
        if (item.effectValue && this.playerHealth < this.playerMaxHealth) {
          this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + item.effectValue);
          this.inventory.splice(itemIndex, 1);
          this.addMessage(`You consume the ${item.name}. Your health is restored to ${this.playerHealth} HP!`);
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
        } else {
          if (this.equippedWeapon) {
            this.addMessage(`You unequip the ${this.equippedWeapon.name} and equip the ${item.name}.`);
          } else {
            this.addMessage(`You equip the ${item.name}.`);
          }
          this.equippedWeapon = item;
        }
        break;
      case 'shield':
        if (this.equippedShield?.id === item.id) {
          this.equippedShield = undefined;
          this.addMessage(`You unequip the ${item.name}.`);
        } else {
          if (this.equippedShield) {
            this.addMessage(`You unequip the ${this.equippedShield.name} and equip the ${item.name}.`);
          } else {
            this.addMessage(`You equip the ${item.name}.`);
          }
          this.equippedShield = item;
        }
        break;
      default:
        this.addMessage(`You can't seem to use the ${item.name} in this way.`);
        break;
    }
  }

  fight(playerChoice: "left" | "center" | "right") {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
    const enemyId = this.enemyLocations.get(currentCoord);

    if (!enemyId) {
      this.addMessage("There's no enemy here to fight.");
      return;
    }

    const enemy = this.enemies.get(enemyId);
    if (!enemy || enemy.defeated) {
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
    const enemyBaseDamage = 10;
    const enemyDamageMultiplier = 1 + (this.currentFloor * 0.2); // +20% damage per floor
    const actualEnemyDamage = Math.floor(enemyBaseDamage * enemyDamageMultiplier);

    if (playerWins) {
      enemy.takeDamage(this.getCurrentAttackDamage());
      this.addMessage(`A decisive blow! You hit the ${enemy.name} for ${this.getCurrentAttackDamage()} damage! Its health is now ${enemy.health}.`);
      if (enemy.defeated) {
        this.addMessage(`With a final, guttural cry, the ${enemy.name} collapses, defeated! The path is clear.`);
      }
    } else if (enemyWins) {
      const damageTaken = Math.max(0, actualEnemyDamage - this.getCurrentDefense());
      this.playerHealth -= damageTaken;
      this.addMessage(`The ${enemy.name} strikes true! You wince as you take ${damageTaken} damage. Your health is now ${this.playerHealth}.`);
      if (this.playerHealth <= 0) {
        this.addMessage("Darkness consumes you as your strength fails. The Labyrinth claims another victim... Game Over.");
        this.gameOver = true;
      }
    }
  }
}