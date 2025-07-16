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
  private map: (LogicalRoom | 'wall')[][]; // Map can now contain walls
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
  private revealedStaticItems: Set<string>; // New: Stores "x,y" strings of revealed static items
  private enemies: Map<string, Enemy>;
  private puzzles: Map<string, Puzzle>;
  private items: Map<string, Item>;

  private readonly MAP_WIDTH = 50;
  private readonly MAP_HEIGHT = 50;

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
    this.revealedStaticItems = new Set<string>(); // Initialize new set
    this.enemies = new Map();
    this.puzzles = new Map();
    this.items = new Map();

    this.initializeLabyrinth();
    this.addMessage("Welcome, brave adventurer, to the Labyrinth of Whispers! Find the ancient artifact and escape!");
    this.markVisited(this.playerLocation);
  }

  private initializeLabyrinth() {
    // Initialize map with all walls
    this.map = Array(this.MAP_HEIGHT)
      .fill(null)
      .map(() => Array(this.MAP_WIDTH).fill('wall'));

    let currentX = 0;
    let currentY = 0;
    const path: Coordinate[] = [{ x: currentX, y: currentY }];
    const pathSet = new Set<string>();
    pathSet.add(`${currentX},${currentY}`);

    const targetX = this.MAP_WIDTH - 1;
    const targetY = this.MAP_HEIGHT - 1;

    // Carve out a path using a biased random walk
    let pathFound = false;
    while (!pathFound && path.length < this.MAP_WIDTH * this.MAP_HEIGHT * 3) { // Safety break
      const moves: { dx: number; dy: number }[] = [];

      // Prioritize moves towards the target
      if (currentX < targetX) moves.push({ dx: 1, dy: 0 }); // East
      if (currentY < targetY) moves.push({ dx: 0, dy: 1 }); // South
      if (currentX > targetX) moves.push({ dx: -1, dy: 0 }); // West
      if (currentY > targetY) moves.push({ dx: 0, dy: -1 }); // North

      // Add other valid moves (non-biased) to allow for more exploration
      // Add them with lower "weight" by only adding if not already present from biased moves
      if (currentX + 1 < this.MAP_WIDTH && !moves.some(m => m.dx === 1 && m.dy === 0)) moves.push({ dx: 1, dy: 0 });
      if (currentY + 1 < this.MAP_HEIGHT && !moves.some(m => m.dx === 0 && m.dy === 1)) moves.push({ dx: 0, dy: 1 });
      if (currentX - 1 >= 0 && !moves.some(m => m.dx === -1 && m.dy === 0)) moves.push({ dx: -1, dy: 0 });
      if (currentY - 1 >= 0 && !moves.some(m => m.dx === 0 && m.dy === -1)) moves.push({ dx: 0, dy: -1 });

      // Filter out moves that would go out of bounds
      const validMoves = moves.filter(move => {
        const nextX = currentX + move.dx;
        const nextY = currentY + move.dy;
        return nextX >= 0 && nextX < this.MAP_WIDTH && nextY >= 0 && nextY < this.MAP_HEIGHT;
      });

      if (validMoves.length === 0) {
        // Should not happen if map is large enough and not fully blocked
        // If it does, it means we are stuck. Break to prevent infinite loop.
        console.warn("Labyrinth path generation stuck, cannot find a path.");
        break;
      }

      // Choose a move: 80% chance to pick a move that reduces Manhattan distance, 20% any valid move
      let chosenMove: { dx: number; dy: number };
      const movesReducingDistance = validMoves.filter(move => {
        const newDist = Math.abs((currentX + move.dx) - targetX) + Math.abs((currentY + move.dy) - targetY);
        const currentDist = Math.abs(currentX - targetX) + Math.abs(currentY - targetY);
        return newDist < currentDist;
      });

      if (movesReducingDistance.length > 0 && Math.random() < 0.8) {
        chosenMove = movesReducingDistance[Math.floor(Math.random() * movesReducingDistance.length)];
      } else {
        chosenMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      }

      currentX += chosenMove.dx;
      currentY += chosenMove.dy; // Fixed: changed chosenY to chosenMove.dy

      const coordStr = `${currentX},${currentY}`;
      if (!pathSet.has(coordStr)) {
        path.push({ x: currentX, y: currentY });
        pathSet.add(coordStr);
      }

      if (currentX === targetX && currentY === targetY) {
        pathFound = true;
      }
    }

    // Fallback: If path not found by random walk, force a direct path from current position to target
    if (!pathFound) {
      console.warn("Forcing direct path to exit due to random walk failure.");
      let lastX = path[path.length - 1].x;
      let lastY = path[path.length - 1].y;

      while (lastX !== targetX || lastY !== targetY) {
        if (lastX < targetX) lastX++;
        else if (lastX > targetX) lastX--;
        else if (lastY < targetY) lastY++;
        else if (lastY > targetY) lastY--;

        const coordStr = `${lastX},${lastY}`;
        if (!pathSet.has(coordStr)) {
          path.push({ x: lastX, y: lastY });
          pathSet.add(coordStr);
        }
      }
    }

    // Convert path coordinates to LogicalRooms
    path.forEach(coord => {
      const roomId = `room-${coord.x}-${coord.y}`;
      const roomName = `Chamber ${coord.x},${coord.y}`;
      let roomDescription = `You are in a dimly lit chamber at (${coord.x},${coord.y}). The air is heavy with the scent of damp earth and ancient magic.`;

      // Special descriptions for start and end
      if (coord.x === 0 && coord.y === 0) {
        roomDescription = "You stand at the crumbling entrance of the Labyrinth. A cold, foreboding draft whispers from the darkness ahead.";
      } else if (coord.x === targetX && coord.y === targetY) {
        roomDescription = "A shimmering portal, bathed in ethereal light, beckons from the far end of this grand hall. This must be the way out!";
      } else {
        // Add some variety to other room descriptions
        if (Math.random() < 0.1) {
          roomDescription = "The walls here are adorned with grotesque carvings of forgotten beasts, their eyes seeming to follow your every move.";
        } else if (Math.random() < 0.05) {
          roomDescription = "An eerie, echoing silence fills this vast cavern, broken only by the drip of unseen water.";
        } else if (Math.random() < 0.07) {
          roomDescription = "Moss-covered stones line this narrow passage, leading deeper into the unknown.";
        }
      }
      this.map[coord.y][coord.x] = new LogicalRoom(roomId, roomName, roomDescription);
    });

    this.addGameElements();
  }

  private addGameElements() {
    // Add a key
    const key = new Item("key-1", "Ornate Skeleton Key", "A heavy, intricately carved key, rumored to unlock ancient mechanisms.");
    this.items.set(key.id, key);
    this.placeElementRandomly(key.id, this.itemLocations);

    // Add a potion
    const potion = new Item("potion-1", "Vial of Lumina", "A small vial containing a glowing, restorative liquid. It promises to mend wounds.");
    this.items.set(potion.id, potion);
    this.placeElementRandomly(potion.id, this.itemLocations);

    // Add a static item (e.g., a broken lever)
    const lever = new Item("lever-1", "Ancient Lever", "A rusted lever, part of a larger, defunct mechanism. It seems stuck.", true);
    this.items.set(lever.id, lever);
    this.placeElementRandomly(lever.id, this.staticItemLocations);

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
    const riddle = new Puzzle("riddle-1", "Riddle of the Echoing Chamber", "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", "echo", new Item("gem-1", "Heart of the Labyrinth", "A pulsating, radiant gem. It feels incredibly powerful and might be the artifact you seek!"));
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
        this.revealedStaticItems.add(currentCoord); // Mark as revealed
        foundSomething = true;
      }
    }

    // Check for puzzles
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
            foundSomething = true;
          }
        } else {
          this.addMessage(`You attempt to interact with the ancient device, but it remains stubbornly inert. Perhaps a missing piece or a forgotten word is needed.`);
          foundSomething = true;
        }
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

    // Also check for static items to interact with
    const staticItemId = this.staticItemLocations.get(currentCoord);
    if (staticItemId) {
      const staticItem = this.items.get(staticItemId);
      if (staticItem && !this.revealedStaticItems.has(currentCoord)) { // Only reveal if not already revealed
        this.addMessage(`You attempt to interact with the ${staticItem.name}. It seems to be ${staticItem.description}`);
        this.revealedStaticItems.add(currentCoord); // Mark as revealed
        interacted = true;
      }
    }

    if (!interacted) {
      this.addMessage("There's nothing here that responds to your touch.");
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