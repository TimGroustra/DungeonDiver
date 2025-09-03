"use client";

import React, { useState, useEffect, useRef } from "react";
import { Labyrinth, LogicalRoom, Item, Enemy, Puzzle } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Utility for conditional class names
import { PersonStanding, Sword, Heart, Shield, Target, Goal } from "lucide-react"; // Keeping player, status icons
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile hook
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Import Dialog components

interface LabyrinthGameProps {
  playerName: string;
  gameStarted: boolean;
  startTime: number | null;
  elapsedTime: number;
  onGameOver: (result: { type: 'victory' | 'defeat', name: string, time: number }) => void;
  onGameRestart: () => void;
}

const ENEMY_MOVE_SPEEDS_MS = [2000, 1500, 1000, 500]; // Speeds for Floor 1, 2, 3, 4 (indices 0, 1, 2, 3)

// Emoji mapping for game elements
const emojiMap: { [key: string]: string } = {
  // Enemies
  "Grumbling Goblin": "👹",
  "Rattling Skeleton": "💀",
  "Whispering Shadow": "👻",
  "The Watcher of the Core": "👁️",

  // Items
  "Vial of Lumina": "🧪",
  "Blade of the Labyrinth": "🗡️",
  "Aegis of the Guardian": "🛡️",
  "Tattered Journal": "📖",
  "Pulsating Crystal": "🔮",
  "Scholar's Amulet": "💎",
  "Enchanted Flask": "🍶",
  "Living Water": "🌊",
  "Whispering Well's Blessing": "✨",
  "Broken Compass": "🧭",
  "Artisan's Fine Tools": "🛠️",
  "Prismatic Lens": "🌈",
  "True Compass": "🗺️",
  "Labyrinth Key": "🔑",
  "Heart of the Labyrinth": "❤️‍🔥",

  // Static Interactables
  "Ancient Mechanism": "⚙️",
  "Whispering Well": "💧",
  "Hidden Spring": "🌿",
  "Ancient Repair Bench": "🔨",
  "Mysterious Box": "📦",
  "Ancient Altar": "🛐",
  "Mysterious Staircase": "🪜",

  // Puzzles
  "Grand Riddle of Eternity": "❓",

  // Traps
  "Triggered Trap": "☠️", // This is for triggered traps
};

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, startTime, elapsedTime, onGameOver, onGameRestart }) => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0); // New state variable to force re-renders
  const [currentLogicalRoom, setCurrentLogicalRoom] = useState<LogicalRoom | undefined>(labyrinth.getCurrentLogicalRoom());
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false); // New state to prevent multiple dispatches
  const [showControlsModal, setShowControlsModal] = useState(false); // State for controls modal
  const logRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile(); // Determine if on mobile
  const dynamicViewportSize = 10; // Restored to fixed size

  // Initialize labyrinth on component mount or game restart
  useEffect(() => {
    if (gameStarted) {
      setLabyrinth(new Labyrinth());
      setGameVersion(0);
      setGameLog(["Game started!"]);
      setHasGameOverBeenDispatched(false); // Reset the flag for a new game
    }
  }, [gameStarted]); // Only re-initialize when gameStarted changes (e.g., from false to true)

  useEffect(() => {
    updateGameDisplay();
    // Only call onGameOver if the game is over AND it hasn't been dispatched yet
    if (labyrinth.isGameOver() && !hasGameOverBeenDispatched) {
      const result = labyrinth.getGameResult();
      if (result) {
        onGameOver(result);
        setHasGameOverBeenDispatched(true); // Set the flag to true after dispatching
      }
    }
  }, [gameVersion, labyrinth, onGameOver, hasGameOverBeenDispatched]); // Add hasGameOverBeenDispatched to dependencies

  useEffect(() => {
    // Scroll to top of log to show newest messages
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [gameLog]);

  // New useEffect for keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameStarted || labyrinth.isGameOver()) {
        // Do not allow actions if game is not started or game is over
        return;
      }

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          handleMove("north");
          break;
        case "ArrowDown":
          event.preventDefault();
          handleMove("south");
          break;
        case "ArrowLeft":
          event.preventDefault();
          handleMove("west");
          break;
        case "ArrowRight":
          event.preventDefault();
          handleMove("east");
          break;
        case "Shift": // For Search
          event.preventDefault();
          handleSearch();
          break;
        case "Control": // For Interact
          event.preventDefault();
          handleInteract();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStarted, labyrinth, playerName, elapsedTime]);

  // useEffect for enemy movement and boss logic
  useEffect(() => {
    if (!gameStarted || labyrinth.isGameOver()) {
      return;
    }

    const currentFloor = labyrinth.getCurrentFloor();
    const moveSpeed = ENEMY_MOVE_SPEEDS_MS[currentFloor] || 2000;

    const intervalId = setInterval(() => {
        // Calculate elapsed time inside the interval to avoid stale state
        const currentElapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        
        labyrinth.processEnemyMovement(playerName, currentElapsedTime);
        
        if (labyrinth.getCurrentFloor() === labyrinth["NUM_FLOORS"] - 1 && !labyrinth.isBossDefeated()) {
            labyrinth.processBossLogic();
        }
        setGameVersion(prev => prev + 1); // Trigger re-render
    }, moveSpeed);

    return () => {
        clearInterval(intervalId);
    };
  }, [gameStarted, labyrinth, labyrinth.isGameOver(), labyrinth.getCurrentFloor(), playerName, startTime]);

  const updateGameDisplay = () => {
    setCurrentLogicalRoom(labyrinth.getCurrentLogicalRoom());
    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      setGameLog((prevLog) => [...prevLog, ...newMessages]);
      labyrinth.clearMessages();
    }
  };

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (labyrinth.isGameOver()) {
      toast.info("Cannot move right now.");
      return;
    }
    labyrinth.move(direction, playerName, elapsedTime);
    setGameVersion(prev => prev + 1); // Increment version to force re-render
  };

  const handleSearch = () => {
    if (labyrinth.isGameOver()) {
      toast.info("Cannot search right now.");
      return;
    }
    labyrinth.search();
    setGameVersion(prev => prev + 1); // Increment version to force re-render
  };

  const handleInteract = () => {
    if (labyrinth.isGameOver()) {
      toast.info("Cannot interact right now.");
      return;
    }
    labyrinth.interact(playerName, elapsedTime);
    setGameVersion(prev => prev + 1); // Increment version to force re-render
  };

  const handleUseItem = (itemId: string) => {
    if (labyrinth.isGameOver()) {
      toast.info("Cannot use items right now.");
      return;
    }
    labyrinth.useItem(itemId, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const getButtonProps = (direction: "north" | "south" | "east" | "west") => {
    const playerX = labyrinth.getPlayerLocation().x;
    const playerY = labyrinth.getPlayerLocation().y;
    const currentFloor = labyrinth.getCurrentFloor();
    const mapGrid = labyrinth.getMapGrid();
  
    let targetX = playerX;
    let targetY = playerY;
  
    switch (direction) {
      case "north": targetY--; break;
      case "south": targetY++; break;
      case "east": targetX++; break;
      case "west": targetX--; break;
    }
  
    // Capitalize the direction for display
    const capitalizedDirection = direction.charAt(0).toUpperCase() + direction.slice(1);

    // Check bounds first
    if (targetX < 0 || targetX >= labyrinth["MAP_WIDTH"] || targetY < 0 || targetY >= labyrinth["MAP_HEIGHT"]) {
      return { text: capitalizedDirection, className: "bg-gray-500 text-gray-300 cursor-not-allowed", disabled: true };
    }
  
    const targetCoordStr = `${targetX},${targetY},${currentFloor}`;
    const isWall = mapGrid[targetY][targetX] === 'wall';
    const enemyId = labyrinth.enemyLocations.get(targetCoordStr);
    const enemy = enemyId ? labyrinth.getEnemy(enemyId) : undefined;
    const hasUndefeatedEnemy = enemy && !enemy.defeated;
  
    if (isWall) {
      return { text: capitalizedDirection, className: "bg-gray-500 hover:bg-gray-500 text-gray-300 cursor-not-allowed", disabled: true };
    } else if (hasUndefeatedEnemy) {
      return { text: "Attack", className: "bg-red-600 hover:bg-red-700 text-white", disabled: false };
    } else {
      return { text: capitalizedDirection, className: "bg-green-700 hover:bg-green-800 text-white", disabled: false };
    }
  };

  const getEmojiForElement = (elementName: string): string => {
    // Handle prefixed items like "Rusty Blade of the Labyrinth"
    if (elementName.includes("Blade of the Labyrinth")) return emojiMap["Blade of the Labyrinth"];
    if (elementName.includes("Aegis of the Guardian")) return emojiMap["Aegis of the Guardian"];
    
    return emojiMap[elementName] || "❓"; // Default to a question mark if no emoji is found
  };

  const renderMap = () => {
    const mapGrid = labyrinth.getMapGrid();
    const playerLoc = labyrinth.getPlayerLocation();
    const visitedCells = labyrinth.getVisitedCells(); // This now gets visited cells for the current floor
    const revealedStaticItems = labyrinth.getRevealedStaticItems();
    const triggeredTraps = labyrinth.getTriggeredTraps(); // Get triggered traps
    const fullGridWidth = mapGrid[0]?.length || 0;
    const fullGridHeight = mapGrid.length;
    const currentFloor = labyrinth.getCurrentFloor();
    const numFloors = labyrinth["NUM_FLOORS"]; // Access private property for display

    const halfViewport = Math.floor(dynamicViewportSize / 2);

    // Calculate the top-left corner of the viewport in map coordinates
    // This ensures the player is at (halfViewport, halfViewport) relative to this start
    const viewportMapStartX = playerLoc.x - halfViewport;
    const viewportMapStartY = playerLoc.y - halfViewport;

    const visibleCells = [];
    for (let viewportY = 0; viewportY < dynamicViewportSize; viewportY++) {
      const rowCells = [];
      for (let viewportX = 0; viewportX < dynamicViewportSize; viewportX++) {
        const mapX = viewportMapStartX + viewportX;
        const mapY = viewportMapStartY + viewportY;

        const isPlayerHere = playerLoc.x === mapX && playerLoc.y === mapY;
        let cellContentIndicator: React.ReactNode = "";
        let cellTitle = "";
        let cellClasses = "";

        // Check if the map coordinates are within the actual labyrinth bounds
        if (mapX >= 0 && mapX < fullGridWidth && mapY >= 0 && mapY < fullGridHeight) {
          const cellCoord = `${mapX},${mapY}`; // For visitedCells set
          const fullCoordStr = `${mapX},${mapY},${currentFloor}`; // For element locations
          const isVisited = visitedCells.has(cellCoord);
          const isWall = mapGrid[mapY][mapX] === 'wall';

          // Check for final exit portal (now the Altar on Floor 4)
          const isAltar = (currentFloor === numFloors - 1) && (labyrinth["staticItemLocations"].get(fullCoordStr) === "ancient-altar-f3");
          // Check if this cell has a trap and if it has been triggered
          const hasTrap = labyrinth["trapsLocations"].has(fullCoordStr);
          const isTrapTriggered = triggeredTraps.has(fullCoordStr);

          // Watcher of the Core specific checks
          const isBossPassage = labyrinth.isBossPassage(mapX, mapY, currentFloor);
          const isRedLight = labyrinth.getBossState() === 'red_light';
          const isBossDefeated = labyrinth.isBossDefeated();
          const isWatcherLocation = (currentFloor === numFloors - 1) && (labyrinth["watcherLocation"]?.x === mapX && labyrinth["watcherLocation"]?.y === mapY);


          if (isPlayerHere) {
            cellContentIndicator = <PersonStanding size={16} />; // Adjusted size
            cellClasses = "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700";
            cellTitle = "You are here";
          } else if (isWall) {
            cellContentIndicator = "█";
            cellClasses = "bg-gray-800 dark:bg-gray-950 text-gray-600";
            cellTitle = "Solid Wall";
          } else if (isTrapTriggered) { // Prioritize triggered traps to show them
              cellContentIndicator = getEmojiForElement("Triggered Trap"); // Emoji for triggered trap
              cellClasses = "bg-orange-700 text-orange-200"; // A different color for triggered traps
              cellTitle = `Explored (${mapX},${mapY}) (Triggered Trap!)`;
          } else if (isVisited) { // Only show special indicators on visited cells if not a triggered trap
            const enemyId = labyrinth["enemyLocations"].get(fullCoordStr);
            const enemy = enemyId ? labyrinth.getEnemy(enemyId) : undefined;
            const hasUndefeatedEnemy = enemy && !enemy.defeated;

            const puzzleId = labyrinth["puzzleLocations"].get(fullCoordStr);
            const puzzle = puzzleId ? labyrinth.getPuzzle(puzzleId) : undefined;
            const hasUnsolvedPuzzle = puzzle && !puzzle.solved;
            const hasSolvedPuzzle = puzzle && puzzle.solved;

            const itemId = labyrinth["itemLocations"].get(fullCoordStr);
            const item = itemId ? labyrinth.getItem(itemId) : undefined;
            const hasUnpickedItem = item && !item.isStatic;

            const staticItemId = labyrinth["staticItemLocations"].get(fullCoordStr);
            const staticItem = staticItemId ? labyrinth.getItem(staticItemId) : undefined;
            const hasStaticItemAtLocation = !!staticItemId;
            const isStaticItemCurrentlyRevealed = revealedStaticItems.has(fullCoordStr);

            // Check for staircase to next floor
            const staircaseLoc = labyrinth["floorExitStaircases"].get(currentFloor);
            const isStaircase = staircaseLoc && staircaseLoc.x === mapX && staircaseLoc.y === mapY;

            if (isAltar && staticItem) {
                cellContentIndicator = getEmojiForElement(staticItem.name);
                cellClasses = "bg-purple-600 text-white animate-pulse";
                cellTitle = `${staticItem.name} (Final Objective)`;
            } else if (isWatcherLocation && !isBossDefeated && enemy) {
                cellContentIndicator = getEmojiForElement(enemy.name);
                cellClasses = "bg-red-700 text-red-200 animate-pulse";
                cellTitle = `${enemy.name}!`;
            } else if (isStaircase && staticItem) {
                cellContentIndicator = getEmojiForElement(staticItem.name);
                cellClasses = "bg-indigo-600 text-white";
                cellTitle = `${staticItem.name} to Floor ${currentFloor + 2}`;
            } else if (hasUndefeatedEnemy && enemy) {
                cellContentIndicator = getEmojiForElement(enemy.name);
                cellClasses = "bg-red-900 text-red-300 animate-pulse"; // Darker red, more menacing
                cellTitle = `Explored (${mapX},${mapY}) (${enemy.name} Lurks!)`;
            } else if (hasUnsolvedPuzzle && puzzle) {
                cellContentIndicator = getEmojiForElement(puzzle.name);
                cellClasses = "bg-yellow-800 text-yellow-300 animate-pulse"; // More golden/mysterious
                cellTitle = `Explored (${mapX},${mapY}) (${puzzle.name}!)`;
            } else if (hasUnpickedItem && item) {
                cellContentIndicator = getEmojiForElement(item.name);
                cellClasses = "bg-emerald-800 text-emerald-300 animate-pulse"; // Green for treasure
                cellTitle = `Explored (${mapX},${mapY}) (${item.name}!)`;
            } else if (hasTrap) { // Trap is present but not yet triggered
                cellContentIndicator = " "; // Invisible until triggered
                cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500"; // Same as visited empty room
                cellTitle = `Explored (${mapX},${mapY})`; // Don't reveal trap in title
            } else if (hasStaticItemAtLocation && isStaticItemCurrentlyRevealed && staticItem) {
                cellContentIndicator = getEmojiForElement(staticItem.name);
                cellClasses = "bg-green-700 text-green-200";
                cellTitle = `Explored (${mapX},${mapY}) (Revealed ${staticItem.name})`;
            } else if (hasSolvedPuzzle) {
                cellContentIndicator = "✨"; // Emoji for Sparkles
                cellClasses = "bg-purple-800 text-purple-200";
                cellTitle = `Explored (${mapX},${mapY}) (Solved Puzzle)`;
            } else {
                cellContentIndicator = "·";
                cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
                cellTitle = `Explored (${mapX},${mapY})`;
            }
          } else { // Unvisited open path
            cellContentIndicator = "·";
            cellClasses = "bg-gray-900 dark:bg-gray-800 text-gray-700";
            cellTitle = `Unexplored (${mapX},${mapY})`;
          }

          // Apply boss passage glow if on the last floor and boss is not defeated
          if (currentFloor === numFloors - 1 && !isBossDefeated && isBossPassage) {
            if (isRedLight) {
              cellClasses = cn(cellClasses, "bg-red-900/50 dark:bg-red-200/50 animate-pulse-fast"); // Faster pulse for red light
            } else {
              cellClasses = cn(cellClasses, "bg-green-900/50 dark:bg-green-200/50"); // Subtle green for green light
            }
          }

        } else {
          // Out of bounds - render as void
          cellContentIndicator = " ";
          cellClasses = "bg-gray-950 dark:bg-gray-100 border-gray-900 dark:border-gray-200";
          cellTitle = "The Void";
        }
        rowCells.push(
          <div
            key={`${viewportX}-${viewportY}`} // Use viewport coordinates for key
            className={cn(
              "w-6 h-6 flex items-center justify-center text-base font-bold", // Fixed size, text-base
              "border border-gray-800 dark:border-gray-500",
              cellClasses,
            )}
            title={cellTitle}
          >
            {cellContentIndicator}
          </div>
        );
      }
      visibleCells.push(rowCells);
    }

    return (
      <div
        className="w-full sm:max-w-72 grid gap-0.5 p-1 border border-gray-700 dark:border-gray-300 bg-gray-900 dark:bg-gray-200 overflow-hidden font-mono" // Changed sm:max-w-64 to sm:max-w-72
        style={{
          gridTemplateColumns: `repeat(${dynamicViewportSize}, 1fr)`,
          gridTemplateRows: `repeat(${dynamicViewportSize}, 1fr)`,
          aspectRatio: '1 / 1',
        }}
      >
        {visibleCells.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderInventory = () => {
    const inventoryItems = labyrinth.getInventoryItems(); // Now returns { item: Item, quantity: number }[]
    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const equippedAmulet = labyrinth.getEquippedAmulet();
    const equippedCompass = labyrinth.getEquippedCompass();

    if (inventoryItems.length === 0) {
      return <p className="text-white text-sm italic">Your inventory is empty. Perhaps you'll find something useful...</p>;
    }
    return (
      <div className="mt-2">
        <p className="font-semibold text-base text-white">Your Inventory:</p>
        <ul className="list-disc list-inside text-xs text-white">
          {inventoryItems.map(({ item, quantity }) => {
            let equippedStatus = "";
            let isEquipped = false;

            if (item.type === 'weapon' && equippedWeapon?.id === item.id) {
              equippedStatus = "(Equipped Weapon)";
              isEquipped = true;
            } else if (item.type === 'shield' && equippedShield?.id === item.id) {
              equippedStatus = "(Equipped Shield)";
              isEquipped = true;
            } else if (item.type === 'accessory') {
              if (item.id === "scholar-amulet-f0" && equippedAmulet?.id === item.id) {
                equippedStatus = "(Equipped Amulet)";
                isEquipped = true;
              } else if (item.id === "true-compass-f2" && equippedCompass?.id === item.id) {
                equippedStatus = "(Equipped Compass)";
                isEquipped = true;
              }
            }

            const isConsumableWithUses = item.type === 'consumable' && item.stackable;
            const canUse = !labyrinth.isGameOver() && (isConsumableWithUses ? quantity > 0 : true);
            const buttonText = isConsumableWithUses ? 'Use' : (isEquipped ? 'Unequip' : 'Equip');

            return (
              <li key={item.id} className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-white">{item.name}</span>
                  {isConsumableWithUses && <span className="ml-1 text-white"> (x{quantity})</span>}: {item.description}
                  {equippedStatus && <span className="ml-2 text-green-400 dark:text-green-600">{equippedStatus}</span>}
                </div>
                {(item.type === 'consumable' || item.type === 'weapon' || item.type === 'shield' || item.type === 'accessory') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white dark:bg-gray-300 dark:hover:bg-gray-400 dark:text-gray-900"
                    onClick={() => handleUseItem(item.id)}
                    disabled={!canUse}
                  >
                    {buttonText}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  if (!gameStarted) {
    return null; // Don't render game content until game starts
  }

  const northProps = getButtonProps("north");
  const southProps = getButtonProps("south");
  const westProps = getButtonProps("west");
  const eastProps = getButtonProps("east");

  const currentObjective = labyrinth.getCurrentFloorObjective();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-1"
      style={{
        backgroundImage: "url('/Eldoria.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card className="w-full max-w-4xl shadow-2xl bg-gray-800/90 text-gray-100 dark:bg-gray-100/90 dark:text-gray-900 border-gray-700 dark:border-gray-300 min-h-[calc(100vh-0.5rem)] flex flex-col">
        <CardHeader className="border-b border-gray-700 dark:border-gray-300 pb-2 relative">
          <div className="absolute top-4 left-4">
            <Dialog open={showControlsModal} onOpenChange={setShowControlsModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-gray-700 hover:bg-gray-600 text-white dark:bg-gray-300 dark:hover:bg-gray-400 dark:text-gray-900">
                  Controls
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300">
                <DialogHeader>
                  <DialogTitle className="text-yellow-400 dark:text-yellow-600">Game Controls</DialogTitle>
                  <DialogDescription className="text-gray-300 dark:text-gray-700">
                    Navigate the labyrinth and interact with your surroundings.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4 text-gray-200 dark:text-gray-800">
                  <p><span className="font-bold">Arrow Keys:</span> Move North, South, East, West</p>
                  <p><span className="font-bold">Shift:</span> Search current area for hidden items or features</p>
                  <p><span className="font-bold">Control:</span> Interact with objects (puzzles, mechanisms, altars)</p>
                  <p className="mt-2 text-sm italic">Click 'Use'/'Equip'/'Unequip' buttons in Inventory for items.</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-center text-yellow-400 dark:text-yellow-600 drop-shadow-lg">The Labyrinth of Whispers</CardTitle>
          <CardDescription className="text-sm italic text-center text-gray-300 dark:text-gray-700">A perilous journey into the unknown...</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Map, Controls, Combat */}
            <div className="flex flex-col items-center relative">
              <h3 className="text-lg font-bold mb-2 text-orange-300 dark:text-orange-600">Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})</h3>
              {renderMap()}

              <div className="w-full sm:max-w-64 mt-3 flex flex-col justify-center items-center min-h-[12rem]">
                <div>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div />
                    <Button size="sm" className={northProps.className} onClick={() => handleMove("north")} disabled={northProps.disabled || labyrinth.isGameOver()}>{northProps.text}</Button>
                    <div />
                    <Button size="sm" className={westProps.className} onClick={() => handleMove("west")} disabled={westProps.disabled || labyrinth.isGameOver()}>{westProps.text}</Button>
                    <div />
                    <Button size="sm" className={eastProps.className} onClick={() => handleMove("east")} disabled={eastProps.disabled || labyrinth.isGameOver()}>{eastProps.text}</Button>
                    <div />
                    <Button size="sm" className={southProps.className} onClick={() => handleMove("south")} disabled={southProps.disabled || labyrinth.isGameOver()}>{southProps.text}</Button>
                    <div />
                  </div>
                  <div className="flex gap-2 mt-2 justify-center">
                    <Button size="sm" className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={handleSearch} disabled={labyrinth.isGameOver()}>Search</Button>
                    <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white" onClick={handleInteract} disabled={labyrinth.isGameOver()}>Interact</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Adventurer's Status, Chronicles, Floor Objective */}
            <div className="flex flex-col items-center">
              <Separator className="my-2 w-full bg-gray-700 dark:bg-gray-300 md:hidden" />

              <div className="mb-2 w-full text-center">
                <h3 className="text-lg font-bold text-lime-300 dark:text-lime-600 mb-1">Adventurer's Status:</h3>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-gray-300 dark:text-gray-700">
                  <p className="flex items-center">
                    <Heart className="mr-1 text-red-500" size={16} /> <span className="font-bold text-red-400">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span>
                  </p>
                  <p className="flex items-center">
                    <Sword className="mr-1 text-gray-400" size={16} /> <span className="font-bold text-orange-400">{labyrinth.getCurrentAttackDamage()}</span>
                  </p>
                  <p className="flex items-center">
                    <Shield className="mr-1 text-gray-400" size={16} /> <span className="font-bold text-blue-400">{labyrinth.getCurrentDefense()}</span>
                  </p>
                  <p className="flex items-center">
                    <Target className="mr-1 text-gray-400" size={16} /> <span className="font-bold text-purple-400">{labyrinth.getSearchRadius()}</span>
                  </p>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                  {labyrinth.getEquippedWeapon() && (
                    <p>Weapon: {labyrinth.getEquippedWeapon()?.name}</p>
                  )}
                  {labyrinth.getEquippedShield() && (
                    <p>Shield: {labyrinth.getEquippedShield()?.name}</p>
                  )}
                  {labyrinth.getEquippedAmulet() && (
                    <p>Accessory: {labyrinth.getEquippedAmulet()?.name}</p>
                  )}
                  {labyrinth.getEquippedCompass() && (
                    <p>Accessory: {labyrinth.getEquippedCompass()?.name}</p>
                  )}
                </div>
                {renderInventory()}
              </div>

              <Separator className="my-2 w-full bg-gray-700 dark:bg-gray-300 md:hidden" />

              <h3 className="text-lg font-bold text-blue-300 dark:text-blue-600 mb-2">Chronicles:</h3>
              <div ref={logRef} className="w-full rounded-md border border-gray-700 dark:border-gray-300 p-2 bg-gray-900 dark:bg-gray-200 text-gray-200 dark:text-gray-800 text-xs font-mono h-40 overflow-y-auto">
                {[...gameLog].reverse().map((message, index) => (
                  <p key={index} className="mb-1 last:mb-0">{message}</p>
                ))}
              </div>

              <Separator className="my-2 w-full bg-gray-700 dark:bg-gray-300" />

              {/* Floor Objective Section */}
              <div className="mb-2 w-full text-center">
                <h3 className="text-lg font-bold text-cyan-300 dark:text-cyan-600 mb-1 flex items-center justify-center">
                  <Goal className="mr-2" size={20} /> Current Objective (Floor {labyrinth.getCurrentFloor() + 1}):
                </h3>
                <p className={cn(
                  "text-sm italic px-4",
                  currentObjective.isCompleted() ? "text-green-400 dark:text-green-500" : "text-gray-300 dark:text-gray-700"
                )}>
                  {currentObjective.description}
                </p>
                <p className={cn(
                  "text-xs font-semibold mt-1",
                  currentObjective.isCompleted() ? "text-green-500 dark:text-green-600" : "text-red-400 dark:text-red-500"
                )}>
                  Status: {currentObjective.isCompleted() ? "Completed!" : "In Progress"}
                </p>
              </div>
              {/* End Floor Objective Section */}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col justify-center items-center border-t border-gray-700 dark:border-gray-300 pt-2">
          {labyrinth.isGameOver() && (
            <Button onClick={onGameRestart} className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-base px-4 py-2">
              Restart Journey
            </Button>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center">
            Please consider supporting this project. Donations can be received at this ETN wallet address: <span className="font-mono text-gray-300 dark:text-gray-700 break-all">0x3Ab5cBFfa0C2A3f15641DCA0fbEEBa1EFb166EE8</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabyrinthGame;