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
        className="grid gap-0.5 p-1 border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 overflow-hidden"
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
              const isWall = cell.cellType === 'wall';

              // Determine cell content for title/visuals
              const hasVisibleItem = labyrinth["itemLocations"].has(cellCoord);
              const hasStaticItem = labyrinth["staticItemLocations"].has(cellCoord);
              const hasEnemy = labyrinth["enemyLocations"].has(cellCoord) && !labyrinth.getEnemy(labyrinth["enemyLocations"].get(cellCoord)!)?.defeated;
              const hasPuzzle = labyrinth["puzzleLocations"].has(cellCoord) && !labyrinth.getPuzzle(labyrinth["puzzleLocations"].get(cellCoord)!)?.solved;

              let cellContentIndicator = "";
              let cellTitle = isPlayerHere ? "You are here" : isVisited ? "Explored" : "Unexplored";

              if (isPlayerHere) {
                cellContentIndicator = "P";
              } else if (isWall) {
                cellContentIndicator = "";
                cellTitle = "Solid Wall";
              } else if (isVisited) {
                if (hasEnemy) cellContentIndicator = "E";
                else if (hasPuzzle) cellContentIndicator = "U"; // Unsolved puzzle
                else if (hasVisibleItem) cellContentIndicator = "I";
                else if (hasStaticItem) cellContentIndicator = "H"; // Hidden item
                else cellContentIndicator = " ";
              } else {
                cellContentIndicator = "?";
              }

              if (hasEnemy) cellTitle += " (Enemy)";
              if (hasPuzzle) cellTitle += " (Puzzle)";
              if (hasVisibleItem) cellTitle += " (Item)";
              if (hasStaticItem) cellTitle += " (Hidden Item)";


              return (
                <div
                  key={cellCoord}
                  className={cn(
                    "w-full h-full flex items-center justify-center text-[10px] font-bold", // Adjusted font size
                    "border border-gray-400 dark:border-gray-600",
                    isWall
                      ? "bg-gray-700 dark:bg-gray-900"
                      : isPlayerHere
                      ? "bg-blue-500 text-white"
                      : isVisited
                      ? "bg-gray-300 dark:bg-gray-600"
                      : "bg-gray-500 dark:bg-gray-700", // Unvisited, unknown
                    isPlayerHere && "ring-2 ring-blue-300 dark:ring-blue-700",
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
      return <p>Your inventory is empty.</p>;
    }
    return (
      <div className="mt-2">
        <p className="font-semibold">Your Inventory:</p>
        <ul className="list-disc list-inside text-sm">
          {inventoryItems.map((item) => (
            <li key={item.id}>
              {item.name} - {item.description}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-5xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">The Labyrinth</CardTitle>
          <CardDescription className="text-center">A text-based adventure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Map and Controls */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-2">Labyrinth Map</h3>
              {renderMap()}
              <div className="grid grid-cols-3 gap-2 mt-4 w-48">
                <div />
                <Button onClick={() => handleMove("north")} disabled={labyrinth.isGameOver() || showRPS}>North</Button>
                <div />
                <Button onClick={() => handleMove("west")} disabled={labyrinth.isGameOver() || showRPS}>West</Button>
                <div />
                <Button onClick={() => handleMove("east")} disabled={labyrinth.isGameOver() || showRPS}>East</Button>
                <div />
                <Button onClick={() => handleMove("south")} disabled={labyrinth.isGameOver() || showRPS}>South</Button>
                <div />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSearch} disabled={labyrinth.isGameOver() || showRPS}>Search Area</Button>
                <Button onClick={handleInteract} disabled={labyrinth.isGameOver() || showRPS}>Interact</Button>
              </div>
            </div>

            {/* Right Column: Game Info and Log */}
            <div className="flex flex-col">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">{currentLogicalRoom?.name || "Unknown Area"}</h2>
                <p className="text-gray-700 dark:text-gray-300">{currentLogicalRoom?.description || "You are in an unknown part of the labyrinth."}</p>
              </div>

              <Separator className="my-4" />

              <div className="mb-4">
                <h3 className="text-xl font-semibold">Player Status:</h3>
                <p>Health: {labyrinth.getPlayerHealth()}</p>
                {renderInventory()}
              </div>

              <Separator className="my-4" />

              {showRPS && currentEnemy && (
                <div className="mb-4 p-4 border rounded-md bg-red-50 dark:bg-red-900/20">
                  <h3 className="text-xl font-semibold text-red-600 dark:text-red-400">Combat Encounter!</h3>
                  <p className="text-lg mb-2">You face a {currentEnemy.name}: {currentEnemy.description}</p>
                  <p className="mb-2">Choose your move:</p>
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => handleRPSChoice("rock")}>Rock</Button>
                    <Button variant="destructive" onClick={() => handleRPSChoice("paper")}>Paper</Button>
                    <Button variant="destructive" onClick={() => handleRPSChoice("scissors")}>Scissors</Button>
                  </div>
                </div>
              )}

              <div className="mb-4 flex-grow">
                <h3 className="text-xl font-semibold">Game Log:</h3>
                <ScrollArea className="h-64 w-full rounded-md border p-4 bg-gray-100 dark:bg-gray-800 text-sm" ref={logRef}>
                  {gameLog.map((message, index) => (
                    <p key={index} className="mb-1 last:mb-0">{message}</p>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          {labyrinth.isGameOver() && (
            <Button onClick={handleRestart} className="mt-4">
              Restart Game
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabyrinthGame;