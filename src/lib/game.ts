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
  private map: (LogicalRoom | 'wall')[][]; // Map can now contain walls
  private playerLocation: Coordinate;
  private playerHealth: number;
  private playerMaxHealth: number; // New: Max health for potion
  private baseAttackDamage: number; // New: Base attack damage
  private baseDefense: number; // New: Base defense
  private equippedWeapon: Item | undefined; // New: Equipped weapon
  private equippedShield: Item | undefined; // New: Equipped shield
  private inventory: Item[];
  private messages: string[];
  private gameOver: boolean;
  private visitedCells: Set<string>; // Stores "x,y" strings of visited cells
  private enemyLocations: Map<string, string>; // "x,y" -> enemyId
  private puzzleLocations: Map<string, string>; // "x,y" -> puzzleId
  private itemLocations: Map<string, string>; // "x,y" -> itemId (for visible items)
  private staticItemLocations: Map<string, string>; // "x,y" -> itemId (for hidden/static items)
  private revealedStaticItems: Set<string>; // New: Stores "x,y" strings of revealed static items
  private enemies: Map<string, Enemy>;
  private puzzles: Map<string, Puzzle>;
  private items: Map<string, Item>;
  private leverActivated: boolean; // New property

  private readonly MAP_WIDTH = 50;
  private readonly MAP_HEIGHT = 50;

  constructor() {
    this.map = [];
    this.playerLocation = { x: 0, y: 0 };
    this.playerHealth = 100;
    this.playerMaxHealth = 100; // Initialize max health
    this.baseAttackDamage = 10; // Initialize base attack
    this.baseDefense = 0; // Initialize base defense
    this.equippedWeapon = undefined;
    this.equippedShield = undefined;
    this.inventory = [];
    this.messages = [];
    this.gameOver = false;
    this.visitedCells = new Set<string>();
    this.enemyLocations = new Map();
    this.puzzleLocations = new Map();
    this.itemLocations = new Map();
    this.staticItemLocations = new Map();
    this.revealedStaticItems = new Set<string>(); // Initialize new set
    this.enemies = new Map();
    this.puzzles = new Map();
    this.items = new Map();
    this.leverActivated = false; // Initialize new property

    this.initializeLabyrinth();
    this.addMessage("Welcome, brave adventurer, to the Labyrinth of Whispers! Find the ancient artifact and escape!");
    this.markVisited(this.playerLocation);
  }

  private initializeLabyrinth() {
    // 1. Initialize map with all walls
    this.map = Array(this.MAP_HEIGHT)
      .fill(null)
      .map(() => Array(this.MAP_WIDTH).fill('wall'));

    // Helper to get valid neighbors of a certain type
    const getNeighbors = (x: number, y: number, type: 'wall' | 'room') => {
      const neighbors: Coordinate[] = [];
      const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
      for (const dir of directions) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < this.MAP_WIDTH && ny >= 0 && ny < this.MAP_HEIGHT) {
          if (type === 'wall' && this.map[ny][nx] === 'wall') {
            neighbors.push({ x: nx, y: ny });
          } else if (type === 'room' && this.map[ny][nx] !== 'wall') {
            neighbors.push({ x: nx, y: ny });
          }
        }
      }
      return neighbors;
    };

    // 2. Create a frontier list for maze generation
    const frontier: Coordinate[] = [];

    // 3. Start point: Set (0,0) to a LogicalRoom. Add its valid 'wall' neighbors to frontier.
    const startX = 0;
    const startY = 0;
    this.map[startY][startX] = new LogicalRoom(`room-${startX}-${startY}`, `The Labyrinth Entrance`, "You stand at the crumbling entrance of the Labyrinth. A cold, foreboding draft whispers from the darkness ahead.");
    frontier.push(...getNeighbors(startX, startY, 'wall'));

    // 4. Main generation loop (Prim's-like algorithm)
    while (frontier.length > 0) {
      // Pick a random cell from frontier
      const randomIndex = Math.floor(Math.random() * frontier.length);
      const { x, y } = frontier.splice(randomIndex, 1)[0]; // Remove from frontier

      // If (x,y) is still a 'wall' (it might have been opened by another path)
      if (this.map[y][x] === 'wall') {
        // Convert map[y][x] to a LogicalRoom
        this.map[y][x] = new LogicalRoom(`room-${x}-${y}`, `Winding Passage ${x},${y}`, this.getRandomRoomDescription());

        // Add its new 'wall' neighbors to frontier
        frontier.push(...getNeighbors(x, y, 'wall'));
      }
    }

    // 5. Ensure End Point: Force the end cell to be a LogicalRoom if it's still a wall
    const endX = this.MAP_WIDTH - 1;
    const endY = this.MAP_HEIGHT - 1;
    if (this.map[endY][endX] === 'wall') {
      this.map[endY][endX] = new LogicalRoom(`room-${endX}-${endY}`, `The Exit Portal Chamber`, "A shimmering portal, bathed in ethereal light, beckons from the far end of this grand hall. This must be the way out!");
      // If for some reason it's still isolated, connect it to a neighbor
      const roomNeighbors = getNeighbors(endX, endY, 'room');
      if (roomNeighbors.length === 0) {
        const wallNeighbors = getNeighbors(endX, endY, 'wall');
        if (wallNeighbors.length > 0) {
          const { x: wx, y: wy } = wallNeighbors[0];
          this.map[wy][wx] = new LogicalRoom(`room-${wx}-${wy}`, `Connecting Passage`, `A newly opened path to the exit.`);
        }
      }
    } else {
        // If it's already a room, just update its description to be the exit
        const exitRoom = this.map[endY][endX] as LogicalRoom;
        exitRoom.name = `The Exit Portal Chamber`;
        exitRoom.description = "A shimmering portal, bathed in ethereal light, beckons from the far end of this grand hall. This must be the way out!";
    }

    // 6. Add "open areas" and "dead ends" by randomly converting some walls near rooms
    // This step creates more interconnectedness and larger rooms.
    const numExtraOpenings = Math.floor(this.MAP_WIDTH * this.MAP_HEIGHT * 0.15); // Open 15% more cells
    for (let i = 0; i < numExtraOpenings; i++) {
      const x = Math.floor(Math.random() * this.MAP_WIDTH);
      const y = Math.floor(Math.random() * this.MAP_HEIGHT);
      if (this.map[y][x] === 'wall') {
        const roomNeighbors = getNeighbors(x, y, 'room');
        if (roomNeighbors.length > 0) { // Only open walls adjacent to existing rooms
          this.map[y][x] = new LogicalRoom(`room-${x}-${y}`, `Hidden Nook ${x},${y}`, this.getRandomRoomDescription());
        }
      }
    }

    // Add game elements after the map is fully generated
    this.addGameElements();
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

  private addGameElements() {
    // Add a key
    const key = new Item("key-1", "Ornate Skeleton Key", "A heavy, intricately carved key, rumored to unlock ancient mechanisms.", false, 'key');
    this.items.set(key.id, key);
    this.placeElementRandomly(key.id, this.itemLocations);

    // Add a potion (now consumable)
    const potion = new Item("potion-1", "Vial of Lumina", "A small vial containing a glowing, restorative liquid. It promises to mend wounds.", false, 'consumable', 100);
    this.items.set(potion.id, potion);
    this.placeElementRandomly(potion.id, this.itemLocations);

    // Add a sword
    const sword = new Item("sword-1", "Blade of the Labyrinth", "A finely crafted sword, its edge humming with ancient power. Increases your attack.", false, 'weapon', 15);
    this.items.set(sword.id, sword);
    this.placeElementRandomly(sword.id, this.itemLocations);

    // Add a shield
    const shield = new Item("shield-1", "Aegis of the Guardian", "A sturdy shield emblazoned with a forgotten crest. Increases your defense.", false, 'shield', 5);
    this.items.set(shield.id, shield);
    this.placeElementRandomly(shield.id, this.itemLocations);

    // Add a static item (e.g., a broken lever)
    const lever = new Item("lever-1", "Ancient Lever", "A rusted lever, part of a larger, defunct mechanism. It seems stuck.", true, 'static');
    this.items.set(lever.id, lever);
    this.placeElementRandomly(lever.id, this.staticItemLocations);

    // Add a new powerful consumable item to be revealed by the lever
    const elixir = new Item("elixir-1", "Elixir of Might", "A potent concoction that temporarily boosts your strength and fully restores health.", false, 'consumable', 100); // 100 for full health
    this.items.set(elixir.id, elixir); // Add to global items map, but don't place randomly yet

    // Add some enemies
    const goblin = new Enemy("goblin-1", "Grumbling Goblin", "A small, green-skinned creature with a rusty dagger and a mischievous glint in its eye.", 2);
    this.enemies.set(goblin.id, goblin);
    this.placeElementRandomly(goblin.id, this.enemyLocations);

    const skeleton = new Enemy("skeleton-1", "Rattling Skeleton", "An animated skeleton warrior, its bones clattering as it raises a chipped sword.", 3);
    this.enemies.set(skeleton.id, skeleton);
    this.placeElementRandomly(skeleton.id, this.enemyLocations);

    const shadowBeast = new Enemy("shadow-beast-1", "Whispering Shadow", "A formless entity of pure darkness, its presence chills you to the bone.", 4);
    this.enemies.set(shadowBeast.id, shadowBeast);
    this.placeElementRandomly(shadowBeast.id, this.enemyLocations);

    // Add a puzzle
    const riddle = new Puzzle("riddle-1", "Riddle of the Echoing Chamber", "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "echo", new Item("gem-1", "Heart of the Labyrinth", "A pulsating, radiant gem. It feels incredibly powerful and might be the artifact you seek!", false, 'artifact'));
    this.puzzles.set(riddle.id, riddle);
    this.placeElementRandomly(riddle.id, this.puzzleLocations);
  }

  private placeElementRandomly(id: string, locationMap: Map<string, string>) {
    let placed = false;
    while (!placed) {
      const x = Math.floor(Math.random() * this.MAP_WIDTH);
      const y = Math.floor(Math.random() * this.MAP_HEIGHT);
      const coordStr = `${x},${y}`;
      // Ensure not placed at player start, exit, or on an existing element, and only in an open room
      if (
        (x !== 0 || y !== 0) &&
        (x !== this.MAP_WIDTH - 1 || y !== this.MAP_HEIGHT - 1) &&
        this.map[y][x] !== 'wall' && // Must be an open room
        !locationMap.has(coordStr) &&
        !this.enemyLocations.has(coordStr) &&
        !this.puzzleLocations.has(coordStr) &&
        !this.itemLocations.has(coordStr) &&
        !this.staticItemLocations.has(coordStr)
      ) {
        locationMap.set(coordStr, id);
        placed = true;
      }
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

  getEquippedWeapon(): Item | undefined {
    return this.equippedWeapon;
  }

  getEquippedShield(): Item | undefined {
    return this.equippedShield;
  }

  getInventoryItems(): Item[] {
    return this.inventory;
  }

  getCurrentLogicalRoom(): LogicalRoom | undefined {
    if (
      this.playerLocation.y >= 0 &&
      this.playerLocation.y < this.map.length &&
      this.playerLocation.x >= 0 &&
      this.playerLocation.x < this.map[0].length
    ) {
      const cell = this.map[this.playerLocation.y][this.playerLocation.x];
      return typeof cell !== 'string' ? cell : undefined; // Return LogicalRoom if not 'wall'
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
    this.visitedCells.add(`${coord.x},${coord.y}`);
  }

  getVisitedCells(): Set<string> {
    return this.visitedCells;
  }

  getMapGrid(): ('wall' | 'open')[][] {
    const grid: ('wall' | 'open')[][] = Array(this.MAP_HEIGHT)
      .fill(null)
      .map(() => Array(this.MAP_WIDTH).fill('open')); // Initialize with 'open'

    for (let y = 0; y < this.MAP_HEIGHT; y++) {
      for (let x = 0; x < this.MAP_WIDTH; x++) {
        grid[y][x] = this.map[y][x] === 'wall' ? 'wall' : 'open';
      }
    }
    return grid;
  }

  move(direction: "north" | "south" | "east" | "west") {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

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

    // Check if new coordinates are within bounds and not a wall
    if (
      newX >= 0 &&
      newX < this.MAP_WIDTH &&
      newY >= 0 &&
      newY < this.MAP_HEIGHT
    ) {
      if (this.map[newY][newX] === 'wall') {
        this.addMessage("A solid, ancient stone wall blocks your path, cold to the touch. You cannot go that way.");
        return; // Prevent movement into a wall
      }

      this.playerLocation = { x: newX, y: newY };
      this.markVisited(this.playerLocation);

      const currentRoom = this.getCurrentLogicalRoom();
      if (currentRoom) {
        this.addMessage(`You cautiously step ${direction} into the echoing darkness. ${currentRoom.description}`);
      } else {
        // This case should ideally not be reached if map generation is correct
        this.addMessage(`You cautiously step ${direction} into the echoing darkness.`);
      }

      // Check for game over condition (e.g., reaching the exit)
      if (newX === this.MAP_WIDTH - 1 && newY === this.MAP_HEIGHT - 1) {
        const hasArtifact = this.inventory.some(item => item.id === "gem-1");
        if (hasArtifact) {
          this.addMessage("A shimmering portal, bathed in ethereal light! You step through, the Heart of the Labyrinth pulsating in your hand, escaping its grasp! Congratulations, brave adventurer!");
          this.gameOver = true;
        } else {
          this.addMessage("The shimmering portal hums with energy, but it seems to require a powerful artifact to activate fully. You cannot escape yet!");
        }
      }

      // Check for enemy encounter
      const enemyId = this.enemyLocations.get(`${newX},${newY}`);
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
            const coordStr = `${targetX},${targetY}`;

            // Check bounds
            if (targetX < 0 || targetX >= this.MAP_WIDTH || targetY < 0 || targetY >= this.MAP_HEIGHT) {
                continue;
            }

            // Check if it's a wall
            if (this.map[targetY][targetX] === 'wall') {
                continue;
            }

            // Mark the cell as visited if it's an open room within the radius
            this.markVisited({ x: targetX, y: targetY });

            // If it's the player's current location, perform full interaction
            if (dx === 0 && dy === 0) {
                // Existing logic for current cell
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
                        // Auto-solve logic for key
                        if (this.inventory.some(item => item.id === "key-1") && puzzle.solution === "echo") {
                            if (puzzle.solve("echo")) {
                                this.addMessage(`With a click and a grind, the ancient mechanism yields! You used the Ornate Skeleton Key and solved the puzzle: "${puzzle.name}"!`);
                                if (puzzle.reward) {
                                    this.inventory.push(puzzle.reward);
                                    this.addMessage(`A hidden compartment opens, revealing a ${puzzle.reward.name}! You add it to your inventory.`);
                                }
                                foundSomethingInRadius = true;
                            }
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
                        this.revealedStaticItems.add(coordStr); // Mark as revealed for map
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

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y}`;
    let interacted = false;

    // Check for puzzles to interact with
    const puzzleId = this.puzzleLocations.get(currentCoord);
    if (puzzleId) {
      const puzzle = this.puzzles.get(puzzleId);
      if (puzzle && !puzzle.solved) {
        // For simplicity, we'll auto-solve if the player has the "key" and it's the "echo" puzzle
        if (this.inventory.some(item => item.id === "key-1") && puzzle.solution === "echo") {
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
            interacted = true; // Mark as interacted even if not solved, to prevent "nothing responds"
        }
      }
    }

    // Also check for static items to interact with
    const staticItemId = this.staticItemLocations.get(currentCoord);
    if (staticItemId) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem) { // Always allow interaction with static items, even if already revealed
        if (staticItem.id === "lever-1") {
          if (!this.leverActivated) {
            this.leverActivated = true;
            // Place the elixir at the current location for pickup
            this.itemLocations.set(currentCoord, "elixir-1");
            this.addMessage(`With a mighty heave, the ancient lever grinds into place! A hidden compartment opens, revealing a shimmering Elixir of Might!`);
            this.addMessage(`The Elixir of Might has appeared at your current location. Use 'Search Area' to pick it up!`);
          } else {
            this.addMessage("The lever is already activated, but nothing more happens.");
          }
          interacted = true;
        } else {
          // Default behavior for other static items (just reveal message)
          if (!this.revealedStaticItems.has(currentCoord)) {
            this.addMessage(`You attempt to interact with the ${staticItem.name}. It seems to be ${staticItem.description}`);
            this.revealedStaticItems.add(currentCoord); // Mark as revealed
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
          this.inventory.splice(itemIndex, 1); // Remove consumed item
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

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y}`;
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

    // Define winning conditions for Attack Left/Center/Right
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

    if (playerWins) {
      enemy.takeDamage(this.getCurrentAttackDamage()); // Use player's current attack damage
      this.addMessage(`A decisive blow! You hit the ${enemy.name} for ${this.getCurrentAttackDamage()} damage! Its health is now ${enemy.health}.`);
      if (enemy.defeated) {
        this.addMessage(`With a final, guttural cry, the ${enemy.name} collapses, defeated! The path is clear.`);
      }
    } else if (enemyWins) {
      const enemyBaseDamage = 10; // Assuming a base damage for enemies
      const damageTaken = Math.max(0, enemyBaseDamage - this.getCurrentDefense()); // Reduce damage by player's defense
      this.playerHealth -= damageTaken;
      this.addMessage(`The ${enemy.name} strikes true! You wince as you take ${damageTaken} damage. Your health is now ${this.playerHealth}.`);
      if (this.playerHealth <= 0) {
        this.addMessage("Darkness consumes you as your strength fails. The Labyrinth claims another victim... Game Over.");
        this.gameOver = true;
      }
    }
  }
}