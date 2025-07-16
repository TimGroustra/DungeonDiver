"use client";

import React, { useState, useEffect, useRef } from "react";
import { Labyrinth, LogicalRoom, Item, Enemy, Puzzle } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils"; // Utility for conditional class names

const VIEWPORT_SIZE = 25; // 25x25 blocks for the map display

const LabyrinthGame: React.FC = () => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [currentLogicalRoom, setCurrentLogicalRoom] = useState<LogicalRoom | undefined>(labyrinth.getCurrentLogicalRoom());
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [showRPS, setShowRPS] = useState<boolean>(false);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | undefined>(undefined);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    updateGameDisplay();
  }, [labyrinth, labyrinth.getPlayerLocation()]); // Depend on labyrinth instance and player location

  useEffect(() => {
    // Scroll to bottom of log
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

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
    setLabyrinth(labyrinth); // Pass the same instance to trigger re-render
  };

  const handleSearch = () => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot search right now.");
      return;
    }
    labyrinth.search();
    setLabyrinth(labyrinth);
  };

  const handleInteract = () => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot interact right now.");
      return;
    }
    labyrinth.interact();
    setLabyrinth(labyrinth);
  };

  const handleRPSChoice = (choice: "rock" | "paper" | "scissors") => {
    if (!currentEnemy) return;
    labyrinth.fight(choice);
    setLabyrinth(labyrinth);
    // The updateGameDisplay useEffect will handle showing/hiding RPS based on enemy status
  };

  const handleRestart = () => {
    const newLabyrinth = new Labyrinth();
    setLabyrinth(newLabyrinth);
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
    const fullGridWidth = mapGrid[0]?.length || 0;
    const fullGridHeight = mapGrid.length;

    // Calculate the visible window
    const halfViewport = Math.floor(VIEWPORT_SIZE / 2);
    let startX = Math.max(0, playerLoc.x - halfViewport);
    let startY = Math.max(0, playerLoc.y - halfViewport);
    let endX = Math.min(fullGridWidth - 1, playerLoc.x + halfViewport);
    let endY = Math.min(fullGridHeight - 1, playerLoc.y + halfViewport);

    // Adjust startX/Y if clamping occurred at the end
    if (endX - startX + 1 < VIEWPORT_SIZE) {
      startX = Math.max(0, endX - VIEWPORT_SIZE + 1);
    }
    if (endY - startY + 1 < VIEWPORT_SIZE) {
      startY = Math.max(0, endY - VIEWPORT_SIZE + 1);
    }

    // Final check to ensure viewport size is maintained if possible
    startX = Math.max(0, Math.min(startX, fullGridWidth - VIEWPORT_SIZE));
    startY = Math.max(0, Math.min(startY, fullGridHeight - VIEWPORT_SIZE));
    endX = startX + VIEWPORT_SIZE - 1;
    endY = startY + VIEWPORT_SIZE - 1;


    const cellSize = 20; // Adjust cell size for a 25x25 display
    const mapDisplayWidth = VIEWPORT_SIZE * cellSize;
    const mapDisplayHeight = VIEWPORT_SIZE * cellSize;

    const visibleCells = [];
    for (let y = startY; y <= endY; y++) {
      const rowCells = [];
      for (let x = startX; x <= endX; x++) {
        rowCells.push({ x, y, cellType: mapGrid[y][x] });
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
            {row.map((cell, colIndex) => {
              const cellCoord = `${cell.x},${cell.y}`;
              const isPlayerHere = playerLoc.x === cell.x && playerLoc.y === cell.y;
              const isVisited = visitedCells.has(cellCoord);
              const isWall = cell.cellType === 'wall'; // Currently all 'open' in game.ts, but kept for future maze logic

              // Determine cell content for title/visuals
              const hasVisibleItem = labyrinth["itemLocations"].has(cellCoord);
              const hasStaticItem = labyrinth["staticItemLocations"].has(cellCoord);
              const hasEnemy = labyrinth["enemyLocations"].has(cellCoord) && !labyrinth.getEnemy(labyrinth["enemyLocations"].get(cellCoord)!)?.defeated;
              const hasPuzzle = labyrinth["puzzleLocations"].has(cellCoord) && !labyrinth.getPuzzle(labyrinth["puzzleLocations"].get(cellCoord)!)?.solved;

              let cellContentIndicator = "";
              let cellTitle = isPlayerHere ? "You are here" : isVisited ? "Explored" : "Unexplored";
              let cellClasses = "";

              if (isPlayerHere) {
                cellContentIndicator = "P"; // Player
                cellClasses = "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700";
              } else if (isWall) {
                cellContentIndicator = "█"; // Wall character
                cellClasses = "bg-gray-800 dark:bg-gray-950 text-gray-600";
                cellTitle = "Solid Wall";
              } else if (isVisited) {
                if (hasEnemy) {
                  cellContentIndicator = "E"; // Enemy
                  cellClasses = "bg-red-800 text-red-200";
                  cellTitle += " (Enemy Lurks)";
                } else if (hasPuzzle) {
                  cellContentIndicator = "U"; // Unsolved Puzzle
                  cellClasses = "bg-purple-800 text-purple-200";
                  cellTitle += " (Ancient Puzzle)";
                } else if (hasVisibleItem) {
                  cellContentIndicator = "I"; // Item
                  cellClasses = "bg-yellow-700 text-yellow-200";
                  cellTitle += " (Glimmering Item)";
                } else if (hasStaticItem) {
                  cellContentIndicator = "H"; // Hidden/Static Item
                  cellClasses = "bg-green-700 text-green-200";
                  cellTitle += " (Hidden Feature)";
                } else {
                  cellContentIndicator = "·"; // Explored path
                  cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
                }
              } else {
                cellContentIndicator = "?"; // Unvisited, unknown
                cellClasses = "bg-gray-900 dark:bg-gray-800 text-gray-700";
              }

              return (
                <div
                  key={cellCoord}
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
            })}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderInventory = () => {
    const inventoryItems = labyrinth.getInventoryItems();
    if (inventoryItems.length === 0) {
      return <p className="text-gray-600 dark:text-gray-400">Your inventory is empty. Perhaps you'll find something useful...</p>;
    }
    return (
      <div className="mt-2">
        <p className="font-semibold text-lg">Your Inventory:</p>
        <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
          {inventoryItems.map((item) => (
            <li key={item.id}>
              <span className="font-medium">{item.name}</span>: {item.description}
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
          <CardTitle className="text-4xl font-extrabold text-center text-yellow-400 dark:text-yellow-600 drop-shadow-lg">The Labyrinth of Whispers</CardTitle>
          <CardDescription className="text-center text-gray-300 dark:text-gray-700 text-lg italic">A perilous journey into the unknown...</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Map and Controls */}
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
            </div>

            {/* Right Column: Game Info and Log */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2 text-cyan-300 dark:text-cyan-600">{currentLogicalRoom?.name || "The Void Beyond"}</h2>
                <p className="text-gray-300 dark:text-gray-700 text-lg italic">{currentLogicalRoom?.description || "You are lost in an unknown part of the labyrinth, where shadows dance and whispers echo."}</p>
              </div>

              <Separator className="my-4 bg-gray-700 dark:bg-gray-300" />

              <div className="mb-4">
                <h3 className="text-2xl font-bold text-lime-300 dark:text-lime-600">Adventurer's Status:</h3>
                <p className="text-lg text-gray-300 dark:text-gray-700">Health: <span className="font-bold text-red-400">{labyrinth.getPlayerHealth()} HP</span></p>
                {renderInventory()}
              </div>

              <Separator className="my-4 bg-gray-700 dark:bg-gray-300" />

              {showRPS && currentEnemy && (
                <div className="mb-4 p-4 border border-red-600 rounded-md bg-red-900/30 dark:bg-red-100/30 text-red-100 dark:text-red-900">
                  <h3 className="text-2xl font-bold text-red-400 dark:text-red-700 mb-2">Combat Encounter!</h3>
                  <p className="text-lg mb-3">You face a fearsome {currentEnemy.name}: <span className="italic">{currentEnemy.description}</span></p>
                  <p className="mb-3">Choose your move wisely, adventurer:</p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("rock")}>Rock</Button>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("paper")}>Paper</Button>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("scissors")}>Scissors</Button>
                  </div>
                </div>
              )}

              <div className="mb-4 flex-grow">
                <h3 className="text-2xl font-bold text-blue-300 dark:text-blue-600">Chronicles of the Labyrinth:</h3>
                <ScrollArea className="h-64 w-full rounded-md border border-gray-700 dark:border-gray-300 p-4 bg-gray-900 dark:bg-gray-200 text-gray-200 dark:text-gray-800 text-sm font-mono">
                  {gameLog.map((message, index) => (
                    <p key={index} className="mb-1 last:mb-0">{message}</p>
                  ))}
                </ScrollArea>
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