"use client";

import React from "react";
import { Labyrinth } from "@/lib/game";
import { cn } from "@/lib/utils";
import { PersonStanding, Sword, Puzzle as PuzzleIcon, Dices, ArrowDownCircle, Target, Gem, BookOpen, Swords, Crown, Sparkles, Eye } from "lucide-react";

interface MapViewProps {
  labyrinth: Labyrinth;
  cellSize: number;
  dynamicViewportSize: number;
}

const MapView: React.FC<MapViewProps> = ({ labyrinth, cellSize, dynamicViewportSize }) => {
  const mapGrid = labyrinth.getMapGrid();
  const playerLoc = labyrinth.getPlayerLocation();
  const visitedCells = labyrinth.getVisitedCells();
  const revealedStaticItems = labyrinth.getRevealedStaticItems();
  const triggeredTraps = labyrinth.getTriggeredTraps();
  const fullGridWidth = mapGrid[0]?.length || 0;
  const fullGridHeight = mapGrid.length;
  const currentFloor = labyrinth.getCurrentFloor();
  const numFloors = labyrinth["NUM_FLOORS"];

  const halfViewport = Math.floor(dynamicViewportSize / 2);
  const viewportMapStartX = playerLoc.x - halfViewport;
  const viewportMapStartY = playerLoc.y - halfViewport;

  const mapDisplayWidth = dynamicViewportSize * cellSize;
  const mapDisplayHeight = dynamicViewportSize * cellSize;

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

      if (mapX >= 0 && mapX < fullGridWidth && mapY >= 0 && mapY < fullGridHeight) {
        const cellCoord = `${mapX},${mapY}`;
        const fullCoordStr = `${mapX},${mapY},${currentFloor}`;
        const isVisited = visitedCells.has(cellCoord);
        const isWall = mapGrid[mapY][mapX] === 'wall';

        const isAltar = (currentFloor === numFloors - 1) && (labyrinth["staticItemLocations"].get(fullCoordStr) === "ancient-altar-f3");
        const hasTrap = labyrinth["trapsLocations"].has(fullCoordStr);
        const isTrapTriggered = triggeredTraps.has(fullCoordStr);

        const isBossPassage = labyrinth.isBossPassage(mapX, mapY, currentFloor);
        const isRedLight = labyrinth.getBossState() === 'red_light';
        const isBossDefeated = labyrinth.isBossDefeated();
        const isWatcherLocation = (currentFloor === numFloors - 1) && (labyrinth["watcherLocation"]?.x === mapX && labyrinth["watcherLocation"]?.y === mapY);

        if (isPlayerHere) {
          cellContentIndicator = <PersonStanding size={12} />;
          cellClasses = "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700";
          cellTitle = "You are here";
        } else if (isWall) {
          cellContentIndicator = "█";
          cellClasses = "bg-gray-800 dark:bg-gray-950 text-gray-600";
          cellTitle = "Solid Wall";
        } else if (isTrapTriggered) {
            cellContentIndicator = <Dices size={12} />;
            cellClasses = "bg-orange-700 text-orange-200";
            cellTitle = `Explored (${mapX},${mapY}) (Triggered Trap!)`;
        } else if (isVisited) {
          const enemyId = labyrinth["enemyLocations"].get(fullCoordStr);
          const enemy = enemyId ? labyrinth.getEnemy(enemyId) : undefined;
          const hasUndefeatedEnemy = enemy && !enemy.defeated;

          const puzzleId = labyrinth["puzzleLocations"].get(fullCoordStr);
          const puzzle = puzzleId ? labyrinth.getPuzzle(puzzleId) : undefined;
          const hasUnsolvedPuzzle = puzzle && !puzzle.solved;
          const hasSolvedPuzzle = puzzle && puzzle.solved;

          const hasUnpickedItem = labyrinth["itemLocations"].has(fullCoordStr);

          const staticItemId = labyrinth["staticItemLocations"].get(fullCoordStr);
          const hasStaticItemAtLocation = !!staticItemId;
          const isStaticItemCurrentlyRevealed = revealedStaticItems.has(fullCoordStr);

          const staircaseLoc = labyrinth["floorExitStaircases"].get(currentFloor);
          const isStaircase = staircaseLoc && staircaseLoc.x === mapX && staircaseLoc.y === mapY;

          if (isAltar) {
              cellContentIndicator = <Crown size={12} />;
              cellClasses = "bg-purple-600 text-white animate-pulse";
              cellTitle = `Ancient Altar (Final Objective)`;
          } else if (isWatcherLocation && !isBossDefeated) {
              cellContentIndicator = <Eye size={12} />;
              cellClasses = "bg-red-700 text-red-200 animate-pulse";
              cellTitle = `The Watcher of the Core!`;
          } else if (isStaircase) {
              cellContentIndicator = <ArrowDownCircle size={12} />;
              cellClasses = "bg-indigo-600 text-white";
              cellTitle = `Staircase to Floor ${currentFloor + 2}`;
          } else if (hasUndefeatedEnemy) {
              cellContentIndicator = <Swords size={12} />;
              cellClasses = "bg-red-900 text-red-300 animate-pulse";
              cellTitle = `Explored (${mapX},${mapY}) (Enemy Lurks!)`;
          } else if (hasUnsolvedPuzzle) {
              cellContentIndicator = <PuzzleIcon size={12} />;
              cellClasses = "bg-yellow-800 text-yellow-300 animate-pulse";
              cellTitle = `Explored (${mapX},${mapY}) (Ancient Puzzle!)`;
          } else if (hasUnpickedItem) {
              cellContentIndicator = <Gem size={12} />;
              cellClasses = "bg-emerald-800 text-emerald-300 animate-pulse";
              cellTitle = `Explored (${mapX},${mapY}) (Glimmering Item!)`;
          } else if (hasTrap) {
              cellContentIndicator = " ";
              cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
              cellTitle = `Explored (${mapX},${mapY})`;
          } else if (hasStaticItemAtLocation && isStaticItemCurrentlyRevealed) {
              cellContentIndicator = <BookOpen size={12} />;
              cellClasses = "bg-green-700 text-green-200";
              cellTitle = `Explored (${mapX},${mapY}) (Revealed Feature)`;
          } else if (hasSolvedPuzzle) {
              cellContentIndicator = <Sparkles size={12} />;
              cellClasses = "bg-purple-800 text-purple-200";
              cellTitle = `Explored (${mapX},${mapY}) (Solved Puzzle)`;
          } else {
              cellContentIndicator = "·";
              cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
              cellTitle = `Explored (${mapX},${mapY})`;
          }
        } else {
          cellContentIndicator = "·";
          cellClasses = "bg-gray-900 dark:bg-gray-800 text-gray-700";
          cellTitle = `Unexplored (${mapX},${mapY})`;
        }

        if (currentFloor === numFloors - 1 && !isBossDefeated && isBossPassage) {
          if (isRedLight) {
            cellClasses = cn(cellClasses, "bg-red-900/50 dark:bg-red-200/50 animate-pulse-fast");
          } else {
            cellClasses = cn(cellClasses, "bg-green-900/50 dark:bg-green-200/50");
          }
        }

      } else {
        cellContentIndicator = " ";
        cellClasses = "bg-gray-950 dark:bg-gray-100 border-gray-900 dark:border-gray-200";
        cellTitle = "The Void";
      }
      rowCells.push(
        <div
          key={`${viewportX}-${viewportY}`}
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
        gridTemplateColumns: `repeat(${dynamicViewportSize}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${dynamicViewportSize}, ${cellSize}px)`,
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

export default MapView;