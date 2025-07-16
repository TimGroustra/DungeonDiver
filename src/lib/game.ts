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

  constructor(id: string, name: string, description: string, isStatic: boolean = false) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.isStatic = isStatic;
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
  private map: LogicalRoom[][];
  private playerLocation: Coordinate;
  private playerHealth: number;
  private inventory: Item[];
  private messages: string[];
  private gameOver: boolean;
  private visitedCells: Set<string>; // Stores "x,y" strings of visited cells
  private enemyLocations: Map<string, string>; // "x,y" -> enemyId
  private puzzleLocations: Map<string, string>; // "x,y" -> puzzleId
  private itemLocations: Map<string, string>; // "x,y" -> itemId (for visible items)
  private staticItemLocations: Map<string, string>; // "x,y" -> itemId (for hidden/static items)
  private enemies: Map<string, Enemy>;
  private puzzles: Map<string, Puzzle>;
  private items: Map<string, Item>;

  constructor() {
    this.map = [];
    this.playerLocation = { x: 0, y: 0 };
    this.playerHealth = 100;
    this.inventory = [];
    this.messages = [];
    this.gameOver = false;
    this.visitedCells = new Set<string>();
    this.enemyLocations = new Map();
    this.puzzleLocations = new Map();
    this.itemLocations = new Map();
    this.staticItemLocations = new Map();
    this.enemies = new Map();
    this.puzzles = new Map();
    this.items = new Map();

    this.initializeLabyrinth();
    this.addMessage("Welcome, brave adventurer, to the Labyrinth of Whispers! Find the ancient artifact and escape!");
    this.markVisited(this.playerLocation);
  }

  private initializeLabyrinth() {
    const width = 50; // Increased map size
    const height = 50; // Increased map size
    this.map = Array(height)
      .fill(null)
      .map(() => Array(width).fill(null));

    // Simple room generation
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const roomId = `room-${x}-${y}`;
        const roomName = `Chamber ${x},${y}`;
        let roomDescription = `You are in a dimly lit chamber at (${x},${y}). The air is heavy with the scent of damp earth and ancient magic.`;

        // Add some variety
        if (x === 0 && y === 0) {
          roomDescription = "You stand at the crumbling entrance of the Labyrinth. A cold, foreboding draft whispers from the darkness ahead.";
        } else if (x === width - 1 && y === height - 1) {
          roomDescription = "A shimmering portal, bathed in ethereal light, beckons from the far end of this grand hall. This must be the way out!";
        } else if (Math.random() < 0.1) {
          roomDescription = "The walls here are adorned with grotesque carvings of forgotten beasts, their eyes seeming to follow your every move.";
        } else if (Math.random() < 0.05) {
          roomDescription = "An eerie, echoing silence fills this vast cavern, broken only by the drip of unseen water.";
        } else if (Math.random() < 0.07) {
          roomDescription = "Moss-covered stones line this narrow passage, leading deeper into the unknown.";
        }

        this.map[y][x] = new LogicalRoom(roomId, roomName, roomDescription);
      }
    }

    // Add some items, enemies, and puzzles
    this.addGameElements(width, height);
  }

  private addGameElements(width: number, height: number) {
    // Add a key
    const key = new Item("key-1", "Ornate Skeleton Key", "A heavy, intricately carved key, rumored to unlock ancient mechanisms.");
    this.items.set(key.id, key);
    this.placeElementRandomly(key.id, this.itemLocations, width, height);

    // Add a potion
    const potion = new Item("potion-1", "Vial of Lumina", "A small vial containing a glowing, restorative liquid. It promises to mend wounds.");
    this.items.set(potion.id, potion);
    this.placeElementRandomly(potion.id, this.itemLocations, width, height);

    // Add a static item (e.g., a broken lever)
    const lever = new Item("lever-1", "Ancient Lever", "A rusted lever, part of a larger, defunct mechanism. It seems stuck.", true);
    this.items.set(lever.id, lever);
    this.placeElementRandomly(lever.id, this.staticItemLocations, width, height);

    // Add some enemies
    const goblin = new Enemy("goblin-1", "Grumbling Goblin", "A small, green-skinned creature with a rusty dagger and a mischievous glint in its eye.", 2);
    this.enemies.set(goblin.id, goblin);
    this.placeElementRandomly(goblin.id, this.enemyLocations, width, height);

    const skeleton = new Enemy("skeleton-1", "Rattling Skeleton", "An animated skeleton warrior, its bones clattering as it raises a chipped sword.", 3);
    this.enemies.set(skeleton.id, skeleton);
    this.placeElementRandomly(skeleton.id, this.enemyLocations, width, height);

    const shadowBeast = new Enemy("shadow-beast-1", "Whispering Shadow", "A formless entity of pure darkness, its presence chills you to the bone.", 4);
    this.enemies.set(shadowBeast.id, shadowBeast);
    this.placeElementRandomly(shadowBeast.id, this.enemyLocations, width, height);

    // Add a puzzle
    const riddle = new Puzzle("riddle-1", "Riddle of the Echoing Chamber", "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "echo", new Item("gem-1", "Heart of the Labyrinth", "A pulsating, radiant gem. It feels incredibly powerful and might be the artifact you seek!"));
    this.puzzles.set(riddle.id, riddle);
    this.placeElementRandomly(riddle.id, this.puzzleLocations, width, height);
  }

  private placeElementRandomly(id: string, locationMap: Map<string, string>, width: number, height: number) {
    let placed = false;
    while (!placed) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const coordStr = `${x},${y}`;
      // Ensure not placed at player start or on an existing element
      if ((x !== 0 || y !== 0) && !locationMap.has(coordStr) && !this.enemyLocations.has(coordStr) && !this.puzzleLocations.has(coordStr) && !this.itemLocations.has(coordStr) && !this.staticItemLocations.has(coordStr)) {
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
      return this.map[this.playerLocation.y][this.playerLocation.x];
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
    const grid: ('wall' | 'open')[][] = Array(this.map.length)
      .fill(null)
      .map(() => Array(this.map[0].length).fill('open'));
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

    if (
      newX >= 0 &&
      newX < this.map[0].length &&
      newY >= 0 &&
      newY < this.map.length
    ) {
      this.playerLocation = { x: newX, y: newY };
      this.addMessage(`You cautiously step ${direction} into the echoing darkness.`);
      this.markVisited(this.playerLocation);

      // Check for game over condition (e.g., reaching the exit)
      if (newX === this.map[0].length - 1 && newY === this.map.length - 1) {
        this.addMessage("A shimmering portal appears, bathed in ethereal light! You step through, escaping the Labyrinth's grasp! Congratulations, brave adventurer!");
        this.gameOver = true;
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
      this.addMessage("A solid, ancient stone wall blocks your path, cold to the touch. You cannot go that way.");
    }
  }

  search() {
    if (this.gameOver) {
      this.addMessage("The game is over. Please restart.");
      return;
    }

    const currentCoord = `${this.playerLocation.x},${this.playerLocation.y}`;
    let foundSomething = false;

    // Check for visible items
    const itemId = this.itemLocations.get(currentCoord);
    if (itemId) {
      const item = this.items.get(itemId);
      if (item && !item.isStatic) {
        this.inventory.push(item);
        this.itemLocations.delete(currentCoord); // Remove from map once picked up
        this.addMessage(`Your fingers brush against something hidden in the rubble... you found a ${item.name}! It's a ${item.description}`);
        foundSomething = true;
      }
    }

    // Check for static/hidden items
    const staticItemId = this.staticItemLocations.get(currentCoord);
    if (staticItemId) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem) {
        this.addMessage(`You notice a ${staticItem.name} embedded in the wall: ${staticItem.description}`);
        foundSomething = true;
      }
    }

    // Check for puzzles
    const puzzleId = this.puzzleLocations.get(currentCoord);
    if (puzzleId) {
      const puzzle = this.puzzles.get(puzzleId);
      if (puzzle && !puzzle.solved) {
        this.addMessage(`An ancient inscription glows faintly on the wall, revealing a puzzle: "${puzzle.name}". Description: "${puzzle.description}"`);
        foundSomething = true;
      }
    }

    if (!foundSomething) {
      this.addMessage("You meticulously search the area, but find nothing but dust and cobwebs.");
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
          interacted = true;
        }
      }
    }

    if (!interacted) {
      this.addMessage("There's nothing here that responds to your touch.");
    }
  }

  fight(playerChoice: "rock" | "paper" | "scissors") {
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

    const enemyChoices: ("rock" | "paper" | "scissors")[] = ["rock", "paper", "scissors"];
    const enemyChoice = enemyChoices[Math.floor(Math.random() * enemyChoices.length)];

    this.addMessage(`You prepare for battle, choosing ${playerChoice}! The ${enemy.name} counters with ${enemyChoice}!`);

    let playerWins = false;
    let enemyWins = false;

    if (playerChoice === enemyChoice) {
      this.addMessage("Clash! Your moves mirror each other, a momentary stalemate.");
    } else if (
      (playerChoice === "rock" && enemyChoice === "scissors") ||
      (playerChoice === "paper" && enemyChoice === "rock") ||
      (playerChoice === "scissors" && enemyChoice === "paper")
    ) {
      playerWins = true;
    } else {
      enemyWins = true;
    }

    if (playerWins) {
      enemy.takeDamage(1); // Each win reduces enemy health by 1
      this.addMessage(`A decisive blow! You hit the ${enemy.name}! Its health is now ${enemy.health}.`);
      if (enemy.defeated) {
        this.addMessage(`With a final, guttural cry, the ${enemy.name} collapses, defeated! The path is clear.`);
      }
    } else if (enemyWins) {
      this.playerHealth -= 10; // Player takes damage
      this.addMessage(`The ${enemy.name} strikes true! You wince as you take damage. Your health is now ${this.playerHealth}.`);
      if (this.playerHealth <= 0) {
        this.addMessage("Darkness consumes you as your strength fails. The Labyrinth claims another victim... Game Over.");
        this.gameOver = true;
      }
    }
  }
}