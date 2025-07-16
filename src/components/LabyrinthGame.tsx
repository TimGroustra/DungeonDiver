"use client";

import React, { useState, useEffect, useRef } from "react";
import { Labyrinth, LogicalRoom, Item, Enemy, Puzzle } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Utility for conditional class names
import { PersonStanding, Sword, Puzzle as PuzzleIcon, Scroll, BookOpen, HelpCircle, Heart, Shield, Dices } from "lucide-react"; // Importing new icons and aliasing Puzzle

const VIEWPORT_SIZE = 10; // 10x10 blocks for the map display

const LabyrinthGame: React.FC = () => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0); // New state variable to force re-renders
  const [currentLogicalRoom, setCurrentLogicalRoom] = useState<LogicalRoom | undefined>(labyrinth.getCurrentLogicalRoom());
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [showRPS, setShowRPS] = useState<boolean>(false);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | undefined>(undefined);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateGameDisplay();
  }, [gameVersion]); // Depend on gameVersion to trigger updates

  useEffect(() => {
    // Scroll to bottom of log
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  // New useEffect for keyboard controls
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (labyrinth.isGameOver() || showRPS) {
        // Do not allow actions if game is over or in combat
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
  }, [labyrinth, showRPS]); // Re-run effect if labyrinth or showRPS state changes

  const updateGameDisplay = () => {
    setCurrentLogicalRoom(labyrinth.getCurrentLogicalRoom());
    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      setGameLog((prevLog) => [...prevLog, ...newMessages]);
      labyrinth.clearMessages();
    }

    // Check for enemy at current player location
    const playerLoc = labyrinth.getPlayerLocation();
    const enemyIdAtLocation = labyrinth["enemyLocations"].get(`${playerLoc.x},${playerLoc.y}`);
    if (enemyIdAtLocation) {
      const enemy = labyrinth.getEnemy(enemyIdAtLocation);
      if (enemy && !enemy.defeated) {
        setCurrentEnemy(enemy);
        setShowRPS(true);
      } else {
        setShowRPS(false);
        setCurrentEnemy(undefined);
      }
    } else {
      setShowRPS(false);
      setCurrentEnemy(undefined);
    }
  };

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot move right now.");
      return;
    }
    labyrinth.move(direction);
    setGameVersion(prev => prev + 1); // Increment version to force re-render
  };

  const handleSearch = () => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot search right now.");
      return;
    }
    labyrinth.search();
    setGameVersion(prev => prev + 1); // Increment version to force re-render
  };

  const handleInteract = () => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot interact right now.");
      return;
    }
    labyrinth.interact();
    setGameVersion(prev => prev + 1); // Increment version to force re-render
  };

  const handleRPSChoice = (choice: "left" | "center" | "right") => {
    if (!currentEnemy) return;
    labyrinth.fight(choice);
    setGameVersion(prev => prev + 1); // Increment version to force re-render
    // The updateGameDisplay useEffect will handle showing/hiding RPS based on enemy status
  };

  const handleUseItem = (itemId: string) => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot use items right now.");
      return;
    }
    labyrinth.useItem(itemId);
    setGameVersion(prev => prev + 1);
  };

  const handleRestart = () => {
    const newLabyrinth = new Labyrinth();
    setLabyrinth(newLabyrinth);
    setGameVersion(0); // Reset version on restart
    setCurrentLogicalRoom(newLabyrinth.getCurrentLogicalRoom());
    setGameLog(["Game restarted!"]);
    setShowRPS(false);
    setCurrentEnemy(undefined);
    toast.success("Game restarted!");
  };

  const renderMap = () => {
    const mapGrid = labyrinth.getMapGrid();
    const playerLoc = labyrinth.getPlayerLocation();
    const visitedCells = labyrinth.getVisitedCells();
    const revealedStaticItems = labyrinth.getRevealedStaticItems(); // Get the new set
    const fullGridWidth = mapGrid[0]?.length || 0;
    const fullGridHeight = mapGrid.length;

    const halfViewport = Math.floor(VIEWPORT_SIZE / 2);

    // Calculate the top-left corner of the viewport in map coordinates
    // This ensures the player is at (halfViewport, halfViewport) relative to this start
    const viewportMapStartX = playerLoc.x - halfViewport;
    const viewportMapStartY = playerLoc.y - halfViewport;

    const cellSize = 20; // Adjust cell size for a 25x25 display
    const mapDisplayWidth = VIEWPORT_SIZE * cellSize;
    const mapDisplayHeight = VIEWPORT_SIZE * cellSize;

    const visibleCells = [];
    for (let viewportY = 0; viewportY < VIEWPORT_SIZE; viewportY++) {
      const rowCells = [];
      for (let viewportX = 0; viewportX < VIEWPORT_SIZE; viewportX++) {
        const mapX = viewportMapStartX + viewportX;
        const mapY = viewportMapStartY + viewportY;

        const isPlayerHere = playerLoc.x === mapX && playerLoc.y === mapY;
        let cellContentIndicator: React.ReactNode = "";
        let cellTitle = "";
        let cellClasses = "";

        // Check if the map coordinates are within the actual labyrinth bounds
        if (mapX >= 0 && mapX < fullGridWidth && mapY >= 0 && mapY < fullGridHeight) {
          const cellCoord = `${mapX},${mapY}`;
          const isVisited = visitedCells.has(cellCoord);
          const isWall = mapGrid[mapY][mapX] === 'wall';

          if (isPlayerHere) {
            cellContentIndicator = <PersonStanding size={12} />; // Player icon
            cellClasses = "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700";
            cellTitle = "You are here";
          } else if (isWall) {
            cellContentIndicator = "█"; // Wall character
            cellClasses = "bg-gray-800 dark:bg-gray-950 text-gray-600";
            cellTitle = "Solid Wall";
          } else if (isVisited) { // Only show special indicators on visited cells
            const enemyId = labyrinth["enemyLocations"].get(cellCoord);
            const enemy = enemyId ? labyrinth.getEnemy(enemyId) : undefined;
            const hasUndefeatedEnemy = enemy && !enemy.defeated;

            const puzzleId = labyrinth["puzzleLocations"].get(cellCoord);
            const puzzle = puzzleId ? labyrinth.getPuzzle(puzzleId) : undefined;
            const hasUnsolvedPuzzle = puzzle && !puzzle.solved;
            const hasSolvedPuzzle = puzzle && puzzle.solved;

            const hasUnpickedItem = labyrinth["itemLocations"].has(cellCoord);

            const staticItemId = labyrinth["staticItemLocations"].get(cellCoord);
            const hasStaticItemAtLocation = !!staticItemId; // Check if a static item exists at this coord
            const isStaticItemCurrentlyRevealed = revealedStaticItems.has(cellCoord);

            // Determine content based on activation status
            if (hasUndefeatedEnemy) {
              // If player is currently fighting this specific enemy, show sword. Otherwise, question mark.
              if (currentEnemy && currentEnemy.id === enemyId && showRPS) {
                cellContentIndicator = <Sword size={12} />;
                cellClasses = "bg-red-800 text-red-200";
                cellTitle = `Explored (${mapX},${mapY}) (Combat Active!)`;
              } else {
                cellContentIndicator = <HelpCircle size={12} className="animate-pulse" />;
                cellClasses = "bg-yellow-900 text-yellow-300 border-yellow-600 dark:bg-yellow-200 dark:text-yellow-800 dark:border-yellow-500";
                cellTitle = `Explored (${mapX},${mapY}) (Enemy Lurks!)`;
              }
            } else if (hasUnsolvedPuzzle) {
              cellContentIndicator = <HelpCircle size={12} className="animate-pulse" />;
              cellClasses = "bg-yellow-900 text-yellow-300 border-yellow-600 dark:bg-yellow-200 dark:text-yellow-800 dark:border-yellow-500";
              cellTitle = `Explored (${mapX},${mapY}) (Ancient Puzzle!)`;
            } else if (hasUnpickedItem) {
              cellContentIndicator = <HelpCircle size={12} className="animate-pulse" />;
              cellClasses = "bg-yellow-900 text-yellow-300 border-yellow-600 dark:bg-yellow-200 dark:text-yellow-800 dark:border-yellow-500";
              cellTitle = `Explored (${mapX},${mapY}) (Glimmering Item!)`;
            } else if (hasStaticItemAtLocation && !isStaticItemCurrentlyRevealed) {
              cellContentIndicator = <HelpCircle size={12} className="animate-pulse" />;
              cellClasses = "bg-yellow-900 text-yellow-300 border-yellow-600 dark:bg-yellow-200 dark:text-yellow-800 dark:border-yellow-500";
              cellTitle = `Explored (${mapX},${mapY}) (Hidden Feature!)`;
            } else if (hasSolvedPuzzle) { // Show solved puzzle icon
              cellContentIndicator = <PuzzleIcon size={12} />;
              cellClasses = "bg-purple-800 text-purple-200";
              cellTitle = `Explored (${mapX},${mapY}) (Solved Puzzle)`;
            } else if (hasStaticItemAtLocation && isStaticItemCurrentlyRevealed) { // Show revealed static item icon
              cellContentIndicator = <BookOpen size={12} />;
              cellClasses = "bg-green-700 text-green-200";
              cellTitle = `Explored (${mapX},${mapY}) (Revealed Feature)`;
            } else {
              // Visited path with no special elements or all elements activated/removed
              cellContentIndicator = "·"; // Explored path
              cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
              cellTitle = `Explored (${mapX},${mapY})`;
            }
          } else { // Unvisited open path
            cellContentIndicator = "·";
            cellClasses = "bg-gray-900 dark:bg-gray-800 text-gray-700";
            cellTitle = `Unexplored (${mapX},${mapY})`;
          }
        } else {
          // Out of bounds - render as void
          cellContentIndicator = " "; // Empty space for void
          cellClasses = "bg-gray-950 dark:bg-gray-100 border-gray-900 dark:border-gray-200"; // Darker/lighter background for void
          cellTitle = "The Void";
        }
        rowCells.push(
          <div
            key={`${viewportX}-${viewportY}`} // Use viewport coordinates for key
            className={cn(
              "w-full h-full flex items-center justify-center text-[10px] font-bold",
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
        className="grid gap-0.5 p-1 border border-gray-700 dark:border-gray-300 bg-gray-900 dark:bg-gray-200 overflow-hidden font-mono"
        style={{
          gridTemplateColumns: `repeat(${VIEWPORT_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${VIEWPORT_SIZE}, ${cellSize}px)`,
          width: `${mapDisplayWidth}px`,
          height: `${mapDisplayHeight}px`,
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
    const inventoryItems = labyrinth.getInventoryItems();
    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();

    if (inventoryItems.length === 0) {
      return <p className="text-gray-600 dark:text-gray-400">Your inventory is empty. Perhaps you'll find something useful...</p>;
    }
    return (
      <div className="mt-2">
        <p className="font-semibold text-lg">Your Inventory:</p>
        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
          {inventoryItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between mb-1">
              <div>
                <span className="font-medium text-white dark:text-gray-950">{item.name}</span>: {item.description}
                {equippedWeapon?.id === item.id && <span className="ml-2 text-green-400 dark:text-green-600">(Equipped Weapon)</span>}
                {equippedShield?.id === item.id && <span className="ml-2 text-green-400 dark:text-green-600">(Equipped Shield)</span>}
              </div>
              {(item.type === 'consumable' || item.type === 'weapon' || item.type === 'shield') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white dark:bg-gray-300 dark:hover:bg-gray-400 dark:text-gray-900"
                  onClick={() => handleUseItem(item.id)}
                  disabled={labyrinth.isGameOver() || showRPS}
                >
                  {item.type === 'consumable' ? 'Use' : (equippedWeapon?.id === item.id || equippedShield?.id === item.id ? 'Unequip' : 'Equip')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 dark:bg-gray-50 p-4">
      <Card className="w-full max-w-5xl shadow-2xl bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300">
        <CardHeader className="border-b border-gray-700 dark:border-gray-300 pb-4">
          <CardTitle className="text-3xl sm:text-4xl font-extrabold text-center text-yellow-400 dark:text-yellow-600 drop-shadow-lg">The Labyrinth of Whispers</CardTitle>
          <CardDescription className="text-base sm:text-lg italic text-center text-gray-300 dark:text-gray-700">A perilous journey into the unknown...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Map, Controls, and Game Log */}
            <div className="flex flex-col items-center">
              <h3 className="text-2xl font-bold mb-3 text-orange-300 dark:text-orange-600">Ancient Map</h3>
              {renderMap()}
              <div className="grid grid-cols-3 gap-2 mt-6 w-64">
                <div />
                <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("north")} disabled={labyrinth.isGameOver() || showRPS}>North</Button>
                <div />
                <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("west")} disabled={labyrinth.isGameOver() || showRPS}>West</Button>
                <div />
                <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("east")} disabled={labyrinth.isGameOver() || showRPS}>East</Button>
                <div />
                <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("south")} disabled={labyrinth.isGameOver() || showRPS}>South</Button>
                <div />
              </div>
              <div className="flex gap-4 mt-4">
                <Button className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={handleSearch} disabled={labyrinth.isGameOver() || showRPS}>Search Area</Button>
                <Button className="bg-purple-700 hover:bg-purple-800 text-white" onClick={handleInteract} disabled={labyrinth.isGameOver() || showRPS}>Interact</Button>
              </div>

              {showRPS && currentEnemy && (
                <div className="mt-6 mb-4 p-4 border border-red-600 rounded-md bg-red-900/30 dark:bg-red-100/30 text-red-100 dark:text-red-900 w-full">
                  <h3 className="text-2xl font-bold text-red-400 dark:text-red-700 mb-2">Combat Encounter!</h3>
                  <p className="text-lg mb-3">You face a fearsome {currentEnemy.name}: <span className="italic">{currentEnemy.description}</span></p>
                  <p className="mb-3">Choose your move wisely, adventurer:</p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("left")}>Attack Left</Button>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("center")}>Attack Center</Button>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("right")}>Attack Right</Button>
                  </div>
                </div>
              )}

              <Separator className="my-6 w-full bg-gray-700 dark:bg-gray-300" />

              <div className="w-full">
                <h3 className="text-2xl font-bold text-blue-300 dark:text-blue-600 mb-2">Chronicles of the Labyrinth:</h3>
                <ScrollArea className="h-64 w-full rounded-md border border-gray-700 dark:border-gray-300 p-4 bg-gray-900 dark:bg-gray-200 text-gray-200 dark:text-gray-800 text-sm font-mono">
                  <div ref={logRef}>
                    {/* Reverse the gameLog array to show latest at top */}
                    {gameLog.slice().reverse().map((message, index) => (
                      <p key={index} className="mb-1 last:mb-0">{message}</p>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Right Column: Game Info */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2 text-cyan-300 dark:text-cyan-600">{currentLogicalRoom?.name || "The Void Beyond"}</h2>
                <p className="text-gray-300 dark:text-gray-700 text-lg italic">{currentLogicalRoom?.description || "You are lost in an unknown part of the labyrinth, where shadows dance and whispers echo."}</p>
              </div>

              <Separator className="my-4 bg-gray-700 dark:bg-gray-300" />

              <div className="mb-4">
                <h3 className="text-2xl font-bold text-lime-300 dark:text-lime-600">Adventurer's Status:</h3>
                <p className="text-lg text-gray-300 dark:text-gray-700 flex items-center">
                  <Heart className="mr-2 text-red-500" size={20} /> Health: <span className="font-bold text-red-400 ml-1">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()} HP</span>
                </p>
                <p className="text-lg text-gray-300 dark:text-gray-700 flex items-center">
                  <Sword className="mr-2 text-gray-400" size={20} /> Attack: <span className="font-bold text-orange-400 ml-1">{labyrinth.getCurrentAttackDamage()}</span>
                </p>
                <p className="text-lg text-gray-300 dark:text-gray-700 flex items-center">
                  <Shield className="mr-2 text-gray-400" size={20} /> Defense: <span className="font-bold text-blue-400 ml-1">{labyrinth.getCurrentDefense()}</span>
                </p>
                {labyrinth.getEquippedWeapon() && (
                  <p className="text-sm text-gray-400 dark:text-gray-600 ml-7">Weapon: {labyrinth.getEquippedWeapon()?.name}</p>
                )}
                {labyrinth.getEquippedShield() && (
                  <p className="text-sm text-gray-400 dark:text-gray-600 ml-7">Shield: {labyrinth.getEquippedShield()?.name}</p>
                )}
                {renderInventory()}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-gray-700 dark:border-gray-300 pt-4">
          {labyrinth.isGameOver() && (
            <Button onClick={handleRestart} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white text-lg px-6 py-3">
              Restart Journey
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabyrinthGame;