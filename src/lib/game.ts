// src/lib/game.ts

export type Coordinates = { x: number; y: number; };

export interface LogicalRoom {
  id: string;
  name: string;
  description: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'key' | 'weapon' | 'treasure' | 'static';
  effect?: string;
}

export interface Enemy {
  id: string;
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  attack: number;
  defeated: boolean;
  combatStrategy: 'rock' | 'paper' | 'scissors'; // Player choices: 'left', 'center', 'right'
}

export interface Puzzle {
  id: string;
  name: string;
  description: string;
  solved: boolean;
  solution: string; // e.g., a keyword or action
  reward?: Item;
}

class Labyrinth { // Renamed from GameState to Labyrinth
  playerLocation: Coordinates;
  playerHealth: number;
  inventory: Item[];
  gameMessages: string[];
  isGameOverFlag: boolean;
  isGameWonFlag: boolean;
  mapGrid: string[][]; // 'path' or 'wall'
  visitedCells: Set<string>; // Stores "x,y" strings
  enemyLocations: Map<string, string>; // "x,y" -> enemyId
  enemies: Map<string, Enemy>; // enemyId -> Enemy object
  puzzleLocations: Map<string, string>; // "x,y" -> puzzleId
  puzzles: Map<string, Puzzle>; // puzzleId -> Puzzle object
  itemLocations: Map<string, string>; // "x,y" -> itemId (for pickable items)
  items: Map<string, Item>; // itemId -> Item object
  staticItemLocations: Map<string, string>; // "x,y" -> staticItemId (e.g., a book)
  staticItems: Map<string, Item>; // staticItemId -> Static Item object
  revealedStaticItems: Set<string>; // Stores "x,y" strings of revealed static items

  constructor() {
    this.playerHealth = 100;
    this.inventory = [];
    this.gameMessages = [];
    this.isGameOverFlag = false;
    this.isGameWonFlag = false;
    this.visitedCells = new Set();
    this.enemyLocations = new Map();
    this.enemies = new Map();
    this.puzzleLocations = new Map();
    this.puzzles = new Map();
    this.itemLocations = new Map();
    this.items = new Map();
    this.staticItemLocations = new Map();
    this.staticItems = new Map();
    this.revealedStaticItems = new Set();

    // Initialize a simple 10x10 map
    this.mapGrid = Array(10).fill(null).map(() => Array(10).fill('path'));

    // Add some walls for complexity
    for (let i = 0; i < 10; i++) {
      this.mapGrid[0][i] = 'wall';
      this.mapGrid[9][i] = 'wall';
      this.mapGrid[i][0] = 'wall';
      this.mapGrid[i][9] = 'wall';
    }
    this.mapGrid[2][2] = 'wall';
    this.mapGrid[2][3] = 'wall';
    this.mapGrid[3][2] = 'wall';
    this.mapGrid[5][5] = 'wall';
    this.mapGrid[5][6] = 'wall';
    this.mapGrid[6][5] = 'wall';
    this.mapGrid[7][7] = 'wall';

    // Set player starting location (ensure it's not a wall)
    this.playerLocation = { x: 1, y: 1 };
    this.visitedCells.add(`${this.playerLocation.x},${this.playerLocation.y}`);

    this.addMessage("Welcome to the Labyrinth! Find the ancient artifact to escape.");

    this.initializeGameElements();
  }

  private initializeGameElements() {
    // Items
    const sword: Item = { id: "sword1", name: "Rusty Sword", description: "A basic sword, better than nothing.", type: "weapon" };
    const potion: Item = { id: "potion1", name: "Healing Potion", description: "Restores a small amount of health.", type: "consumable", effect: "heal" };
    const artifact: Item = { id: "artifact1", name: "Ancient Artifact", description: "The key to escaping the labyrinth!", type: "treasure" };
    this.items.set(sword.id, sword);
    this.items.set(potion.id, potion);
    this.items.set(artifact.id, artifact);

    this.itemLocations.set("1,2", sword.id);
    this.itemLocations.set("3,1", potion.id);
    this.itemLocations.set("8,8", artifact.id); // Win condition item

    // Enemies
    const goblin: Enemy = { id: "goblin1", name: "Goblin", description: "A small, green-skinned creature.", health: 30, maxHealth: 30, attack: 10, defeated: false, combatStrategy: "rock" };
    const orc: Enemy = { id: "orc1", name: "Orc", description: "A brutish, powerful warrior.", health: 50, maxHealth: 50, attack: 15, defeated: false, combatStrategy: "scissors" };
    this.enemies.set(goblin.id, goblin);
    this.enemies.set(orc.id, orc);

    this.enemyLocations.set("4,4", goblin.id);
    this.enemyLocations.set("7,2", orc.id);

    // Puzzles
    const riddle: Puzzle = { id: "riddle1", name: "Ancient Riddle", description: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", solved: false, solution: "echo" };
    this.puzzles.set(riddle.id, riddle);
    this.puzzleLocations.set("2,5", riddle.id);

    // Static Items (revealed by search)
    const oldBook: Item = { id: "book1", name: "Dusty Tome", description: "An old book containing forgotten lore. (Revealed by searching)", type: "static" };
    this.staticItems.set(oldBook.id, oldBook);
    this.staticItemLocations.set("1,3", oldBook.id);
  }

  addMessage(message: string) {
    this.gameMessages.push(message);
  }

  getMessages(): string[] {
    const messages = [...this.gameMessages];
    this.gameMessages = []; // Clear messages after retrieval
    return messages;
  }

  clearMessages() {
    this.gameMessages = [];
  }

  isGameOver(): boolean {
    return this.isGameOverFlag || this.isGameWonFlag;
  }

  getPlayerLocation(): Coordinates {
    return { ...this.playerLocation };
  }

  getPlayerHealth(): number {
    return this.playerHealth;
  }

  getInventoryItems(): Item[] {
    return [...this.inventory];
  }

  getMapGrid(): string[][] {
    return this.mapGrid;
  }

  getVisitedCells(): Set<string> {
    return new Set(this.visitedCells);
  }

  getRevealedStaticItems(): Set<string> {
    return new Set(this.revealedStaticItems);
  }

  getCurrentLogicalRoom(): LogicalRoom {
    const { x, y } = this.playerLocation;
    const coord = `${x},${y}`;

    let roomName = `Chamber (${x},${y})`;
    let roomDescription = "A dimly lit chamber within the labyrinth.";

    if (this.itemLocations.has(coord)) {
      const itemId = this.itemLocations.get(coord)!;
      const item = this.items.get(itemId)!;
      roomDescription += ` You see a ${item.name} here.`;
    }
    if (this.enemyLocations.has(coord)) {
      const enemyId = this.enemyLocations.get(coord)!;
      const enemy = this.enemies.get(enemyId)!;
      if (!enemy.defeated) {
        roomDescription += ` A fearsome ${enemy.name} stands in your way!`;
      }
    }
    if (this.puzzleLocations.has(coord)) {
      const puzzleId = this.puzzleLocations.get(coord)!;
      const puzzle = this.puzzles.get(puzzleId)!;
      if (!puzzle.solved) {
        roomDescription += ` An ancient puzzle awaits your intellect.`;
      }
    }
    if (this.staticItemLocations.has(coord) && !this.revealedStaticItems.has(coord)) {
      roomDescription += ` You sense something hidden here.`;
    } else if (this.staticItemLocations.has(coord) && this.revealedStaticItems.has(coord)) {
      const staticItemId = this.staticItemLocations.get(coord)!;
      const staticItem = this.staticItems.get(staticItemId)!;
      roomDescription += ` You found a ${staticItem.name} here.`;
    }

    return { id: coord, name: roomName, description: roomDescription };
  }

  getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  getPuzzle(id: string): Puzzle | undefined {
    return this.puzzles.get(id);
  }

  move(direction: 'north' | 'south' | 'east' | 'west') {
    if (this.isGameOverFlag) return;

    let newX = this.playerLocation.x;
    let newY = this.playerLocation.y;

    switch (direction) {
      case 'north': newY--; break;
      case 'south': newY++; break;
      case 'east': newX++; break;
      case 'west': newX--; break;
    }

    // Check boundaries and walls
    if (newX < 0 || newX >= this.mapGrid[0].length || newY < 0 || newY >= this.mapGrid.length || this.mapGrid[newY][newX] === 'wall') {
      this.addMessage("You hit a wall! Choose another direction.");
      return;
    }

    this.playerLocation = { x: newX, y: newY };
    this.visitedCells.add(`${newX},${newY}`);
    this.addMessage(`You moved ${direction}.`);

    this.checkEncounters();
    this.checkWinCondition();
  }

  private checkEncounters() {
    const coord = `${this.playerLocation.x},${this.playerLocation.y}`;

    // Check for enemies
    if (this.enemyLocations.has(coord)) {
      const enemyId = this.enemyLocations.get(coord)!;
      const enemy = this.enemies.get(enemyId)!;
      if (!enemy.defeated) {
        this.addMessage(`A ${enemy.name} attacks! Prepare for combat!`);
        // The UI will pick up on this and show RPS
      }
    }
  }

  search() {
    if (this.isGameOverFlag) return;

    const { x, y } = this.playerLocation;
    const coord = `${x},${y}`;
    let foundSomething = false;

    // Check for pickable items
    if (this.itemLocations.has(coord)) {
      const itemId = this.itemLocations.get(coord)!;
      const item = this.items.get(itemId)!;
      this.addMessage(`You found a ${item.name}! It has been added to your inventory.`);
      this.inventory.push(item);
      this.itemLocations.delete(coord); // Item is picked up
      foundSomething = true;
    }

    // Check for static items to reveal
    if (this.staticItemLocations.has(coord) && !this.revealedStaticItems.has(coord)) {
      const staticItemId = this.staticItemLocations.get(coord)!;
      const staticItem = this.staticItems.get(staticItemId)!;
      this.addMessage(`You searched thoroughly and found a hidden ${staticItem.name}!`);
      this.revealedStaticItems.add(coord);
      foundSomething = true;
    }

    // Check for puzzles
    if (this.puzzleLocations.has(coord)) {
      const puzzleId = this.puzzleLocations.get(coord)!;
      const puzzle = this.puzzles.get(puzzleId)!;
      if (!puzzle.solved) {
        this.addMessage(`You found an unsolved puzzle: "${puzzle.name}".`);
        foundSomething = true;
      }
    }

    if (!foundSomething) {
      this.addMessage("You searched the area but found nothing new.");
    }
  }

  interact() {
    if (this.isGameOverFlag) return;

    const { x, y } = this.playerLocation;
    const coord = `${x},${y}`;
    let interacted = false;

    // Try to solve a puzzle
    if (this.puzzleLocations.has(coord)) {
      const puzzleId = this.puzzleLocations.get(coord)!;
      const puzzle = this.puzzles.get(puzzleId)!;
      if (!puzzle.solved) {
        // For simplicity, let's assume 'interact' solves the puzzle if it's the correct room
        // In a real game, this would involve inputting the solution.
        if (puzzle.solution === "echo") { // Example solution
          puzzle.solved = true;
          this.addMessage(`You solved the "${puzzle.name}"! The path ahead seems clearer.`);
          if (puzzle.reward) {
            this.inventory.push(puzzle.reward);
            this.addMessage(`You received a ${puzzle.reward.name} as a reward!`);
          }
          interacted = true;
        } else {
          this.addMessage(`You tried to interact with the puzzle, but nothing happened. Perhaps you need a specific item or knowledge.`);
          interacted = true;
        }
      } else {
        this.addMessage(`You've already solved this puzzle.`);
        interacted = true;
      }
    }

    // Try to use a static item (if revealed)
    if (this.staticItemLocations.has(coord) && this.revealedStaticItems.has(coord)) {
      const staticItemId = this.staticItemLocations.get(coord)!;
      const staticItem = this.staticItems.get(staticItemId)!;
      this.addMessage(`You interact with the ${staticItem.name}. It feels ancient.`);
      interacted = true;
    }

    if (!interacted) {
      this.addMessage("There's nothing obvious to interact with here.");
    }
  }

  fight(playerChoice: 'left' | 'center' | 'right') {
    if (this.isGameOverFlag) return;

    const { x, y } = this.playerLocation;
    const coord = `${x},${y}`;
    const enemyId = this.enemyLocations.get(coord);

    if (!enemyId) {
      this.addMessage("There's no enemy to fight here.");
      return;
    }

    const enemy = this.enemies.get(enemyId);
    if (!enemy || enemy.defeated) {
      this.addMessage("The enemy is already defeated.");
      return;
    }

    // Map player choice to RPS
    const playerRPS: 'rock' | 'paper' | 'scissors' =
      playerChoice === 'left' ? 'rock' :
      playerChoice === 'center' ? 'paper' :
      'scissors';

    const enemyRPS = enemy.combatStrategy;

    this.addMessage(`You chose ${playerRPS}. The ${enemy.name} chose ${enemyRPS}.`);

    let playerDamage = 0;
    let enemyDamage = enemy.attack;

    // Determine winner based on RPS
    if (playerRPS === enemyRPS) {
      this.addMessage("It's a tie! Both sides take minor damage.");
      playerDamage = 5; // Small damage for tie
      enemyDamage = 5;
    } else if (
      (playerRPS === 'rock' && enemyRPS === 'scissors') ||
      (playerRPS === 'paper' && enemyRPS === 'rock') ||
      (playerRPS === 'scissors' && enemyRPS === 'paper')
    ) {
      this.addMessage("You landed a strong hit!");
      playerDamage = 0; // Player takes no damage on win
      enemyDamage = 15 + (this.inventory.some(item => item.type === 'weapon') ? 5 : 0); // Player deals more damage
    } else {
      this.addMessage("The enemy's attack connects!");
      playerDamage = enemy.attack; // Player takes full enemy damage on loss
      enemyDamage = 0; // Enemy takes no damage
    }

    this.playerHealth -= playerDamage;
    enemy.health -= enemyDamage;

    this.addMessage(`You took ${playerDamage} damage. Your health: ${this.playerHealth} HP.`);
    this.addMessage(`${enemy.name} took ${enemyDamage} damage. ${enemy.name}'s health: ${enemy.health} HP.`);

    if (enemy.health <= 0) {
      enemy.defeated = true;
      this.addMessage(`You defeated the ${enemy.name}!`);
      this.enemyLocations.delete(coord); // Remove enemy from map
    }

    this.checkLoseCondition();
  }

  private checkWinCondition() {
    const { x, y } = this.playerLocation;
    const coord = `${x},${y}`;

    // Check if player has the artifact and is at the exit (e.g., 8,8 where artifact is)
    const hasArtifact = this.inventory.some(item => item.id === "artifact1");
    if (hasArtifact && coord === "8,8") {
      this.isGameWonFlag = true;
      this.isGameOverFlag = true;
      this.addMessage("Congratulations! You found the Ancient Artifact and escaped the Labyrinth!");
    }
  }

  private checkLoseCondition() {
    if (this.playerHealth <= 0) {
      this.playerHealth = 0; // Ensure health doesn't go negative in display
      this.isGameOverFlag = true;
      this.addMessage("Your health has dropped to zero. You have fallen in the Labyrinth...");
    }
  }
}

export { Labyrinth as Labyrinth };