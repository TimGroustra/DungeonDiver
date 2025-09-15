"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Labyrinth } from "@/lib/game";
import { generateSvgPaths } from "@/lib/map-renderer";
import { cn } from "@/lib/utils";
import { Skull } from "lucide-react"; // Import Skull icon for traps
import { emojiMap, enemySpriteMap, getEmojiForElement } from "@/utils/game-assets"; // Import shared assets


interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  labyrinth: Labyrinth;
}


const FullMapModal: React.FC<FullMapModalProps> = ({ isOpen, onClose, labyrinth }) => {
  const currentFloor = labyrinth.getCurrentFloor();
  const mapWidth = labyrinth["MAP_WIDTH"];
  const mapHeight = labyrinth["MAP_HEIGHT"];
  const playerLoc = labyrinth.getPlayerLocation();
  const visitedCells = labyrinth.getVisitedCells();
  const revealedTraps = labyrinth.getRevealedTraps();
  const allVisibleTraps = new Set([...revealedTraps]);

  const { wallPath, floorPath } = React.useMemo(() => generateSvgPaths(labyrinth.getMapGrid()), [labyrinth, currentFloor]);

  const renderFullMap = () => {
    const bossState = labyrinth.getBossState();
    const bossPassageCoords = labyrinth.bossPassageCoords;
    const isBossDefeated = labyrinth.isBossDefeated();

    return (
      <div className="relative w-full h-full overflow-hidden">
        <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full" shapeRendering="crispEdges">
          <defs>
            <pattern id="floor-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
              <rect width="1" height="1" fill="#3a2d3c" />
              <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" />
              <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
              <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
            </pattern>
            <pattern id="wall-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
              <rect width="1" height="1" fill="#5a4d5c" />
              <path d="M 0 0.2 L 1 0.2 M 0 0.8 L 1 0.8 M 0.2 0 L 0.2 1 M 0.8 0 L 0.8 1" stroke="#6a5d6c" strokeWidth="0.1" />
            </pattern>
            <pattern id="death-trap-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
              <rect width="1" height="1" fill="black" />
              <path d="M0.1 0.9 L0.2 0.7 L0.3 0.9 Z" fill="#888" />
              <path d="M0.3 0.8 L0.4 0.6 L0.5 0.8 Z" fill="#888" />
              <path d="M0.5 0.9 L0.6 0.7 L0.7 0.9 Z" fill="#888" />
              <path d="M0.7 0.8 L0.8 0.6 L0.9 0.8 Z" fill="#888" />
              <path d="M0.1 0.5 L0.2 0.3 L0.3 0.5 Z" fill="#888" />
              <path d="M0.3 0.4 L0.4 0.2 L0.5 0.4 Z" fill="#888" />
              <path d="M0.5 0.5 L0.6 0.3 L0.7 0.5 Z" fill="#888" />
              <path d="M0.7 0.4 L0.8 0.2 L0.9 0.4 Z" fill="#888" />
              <path d="M0.1 0.1 L0.2 0.0 L0.3 0.1 Z" fill="#888" />
              <path d="M0.3 0.0 L0.4 -0.2 L0.5 0.0 Z" fill="#888" />
              <path d="M0.5 0.1 L0.6 0.0 L0.7 0.1 Z" fill="#888" />
              <path d="M0.7 0.0 L0.8 -0.2 L0.9 0.0 Z" fill="#888" />
            </pattern>
            <pattern id="revealed-trap-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
              <rect width="1" height="1" fill="#3a2d3c" />
              <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" />
              <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
              <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
              <path d="M0.1 0.9 L0.2 0.7 L0.3 0.9 Z" fill="#888" />
              <path d="M0.3 0.8 L0.4 0.6 L0.5 0.8 Z" fill="#888" />
              <path d="M0.5 0.9 L0.6 0.7 L0.7 0.9 Z" fill="#888" />
              <path d="M0.7 0.8 L0.8 0.6 L0.9 0.8 Z" fill="#888" />
              <path d="M0.1 0.5 L0.2 0.3 L0.3 0.5 Z" fill="#888" />
              <path d="M0.3 0.4 L0.4 0.2 L0.5 0.4 Z" fill="#888" />
              <path d="M0.5 0.5 L0.6 0.3 L0.7 0.5 Z" fill="#888" />
              <path d="M0.7 0.4 L0.8 0.2 L0.9 0.4 Z" fill="#888" />
              <path d="M0.1 0.1 L0.2 0.0 L0.3 0.1 Z" fill="#888" />
              <path d="M0.3 0.0 L0.4 -0.2 L0.5 0.0 Z" fill="#888" />
              <path d="M0.5 0.1 L0.6 0.0 L0.7 0.1 Z" fill="#888" />
              <path d="M0.7 0.0 L0.8 -0.2 L0.9 0.0 Z" fill="#888" />
            </pattern>
          </defs>

          <g>
            {/* Render floor and walls */}
            <path d={floorPath} className="fill-[url(#floor-pattern-full)]" />
            <path d={wallPath} className="fill-[url(#wall-pattern-full)] stroke-[#4a3d4c]" strokeWidth={0.05} />

            {/* Render visited cells overlay */}
            {Array.from(visitedCells).map(coordStr => {
              const [x, y] = coordStr.split(',').map(Number);
              return (
                <rect
                  key={`visited-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill="rgba(0, 255, 0, 0.1)" // Light green overlay for visited cells
                />
              );
            })}

            {/* Render Boss Passage Overlay */}
            {currentFloor === labyrinth["NUM_FLOORS"] - 1 && !isBossDefeated && Array.from(bossPassageCoords).map((coordStr) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;

              const isRedLight = bossState === 'red_light';
              const isSafeTile = labyrinth.bossSafeTiles.has(coordStr);

              const fill = isRedLight ? 'rgba(255, 0, 0, 0.3)' : 'transparent';
              const className = isRedLight && !isSafeTile ? 'animate-pulse-fast' : '';

              return (
                <rect
                  key={`boss-passage-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill={fill}
                  className={className}
                />
              );
            })}

            {/* Render decorative elements (torches) */}
            {Array.from(labyrinth.getDecorativeElements().entries()).map(([coordStr, type]) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;
              // For full map, just show a small indicator for torches
              return <circle key={`deco-${coordStr}`} cx={x + 0.5} cy={y + 0.5} r="0.1" fill={type === 'torch_lit' ? 'yellow' : '#555'} />;
            })}

            {/* Render enemies */}
            {Array.from(labyrinth.enemyLocations.entries()).map(([coordStr, enemyId]) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;
              const enemy = labyrinth.getEnemy(enemyId);
              if (!enemy || enemy.defeated) return null;
              const enemySprite = enemySpriteMap[enemy.name];
              if (enemySprite) {
                return (
                  <image
                    key={`enemy-${enemyId}`}
                    href={enemySprite}
                    x={x}
                    y={y}
                    width="1"
                    height="1"
                  />
                );
              }
              return null;
            })}

            {/* Render items */}
            {Array.from(labyrinth.itemLocations.entries()).map(([coordStr, itemId]) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;
              const item = labyrinth.getItem(itemId);
              return <text key={`item-${itemId}`} x={x + 0.5} y={y + 0.5} fontSize="0.6" textAnchor="middle" dominantBaseline="central">{getEmojiForElement(item.name)}</text>;
            })}

            {/* Render static items */}
            {Array.from(labyrinth.staticItemLocations.entries()).map(([coordStr, itemId]) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor || !labyrinth.getRevealedStaticItems().has(coordStr)) return null;
              const item = labyrinth.getItem(itemId);
              return <text key={`static-${itemId}`} x={x + 0.5} y={y + 0.5} fontSize="0.7" textAnchor="middle" dominantBaseline="central">{getEmojiForElement(item.name)}</text>;
            })}

            {/* Render death traps */}
            {Array.from(labyrinth.deathTrapsLocations.keys()).map((coordStr) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;
              return (
                <rect
                  key={`death-trap-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill="url(#death-trap-pattern-full)"
                  stroke="rgba(0,0,0,0.8)"
                  strokeWidth={0.05}
                />
              );
            })}

            {/* Render normal traps (only if revealed and not a death trap) */}
            {Array.from(allVisibleTraps).map((coordStr) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor || labyrinth.deathTrapsLocations.has(coordStr)) return null;
              return (
                <rect
                  key={`trap-glow-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill="url(#revealed-trap-pattern-full)"
                  stroke="rgba(255, 0, 0, 0.8)"
                  strokeWidth={0.05}
                />
              );
            })}

            {/* Render player */}
            <circle cx={playerLoc.x + 0.5} cy={playerLoc.y + 0.5} r="0.4" fill="cyan" stroke="white" strokeWidth="0.1" />
          </g>
        </svg>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] sm:max-w-[800px] sm:max-h-[600px] bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 dark:text-yellow-600">Labyrinth Map - Floor {currentFloor + 1}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden border border-gray-700 dark:border-gray-300 rounded-md bg-gray-900 dark:bg-gray-200">
          <ScrollArea className="h-full w-full">
            <div className="p-2">
              {renderFullMap()}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;