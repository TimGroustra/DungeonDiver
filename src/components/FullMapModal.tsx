"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useGame } from "@/contexts/GameContext";
import { generateMapSvgPaths } from "@/utils/map-utils";
import { getEmojiForElement, staticItemSpriteMap } from "@/utils/game-assets";
import { getStaticItemDetails } from "@/definitions/static-items";

interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FullMapModal: React.FC<FullMapModalProps> = ({ isOpen, onClose }) => {
  const { game, playerPosition, currentFloor, activeQuestObjectives } = useGame();
  const [mapSvg, setMapSvg] = useState<{ floorPath: string; wallPath: string } | null>(null);
  const [mapDimensions, setMapDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (game && currentFloor) {
      const { floorPath, wallPath, width, height } = generateMapSvgPaths(currentFloor.map, game.player.position);
      setMapSvg({ floorPath, wallPath });
      setMapDimensions({ width, height });
    }
  }, [game, currentFloor]);

  if (!mapSvg || !mapDimensions) {
    return null;
  }

  const { floorPath, wallPath } = mapSvg;
  const { width, height } = mapDimensions;

  // Define a scale factor to make the map smaller and fit within the modal
  // Increase this value to make the map appear smaller, decrease to make it larger.
  const MAP_SCALE_FACTOR = 2.5; 

  const scaledWidth = width * MAP_SCALE_FACTOR;
  const scaledHeight = height * MAP_SCALE_FACTOR;
  // Calculate offsets to center the map within the scaled viewBox
  const offsetX = -width * (MAP_SCALE_FACTOR - 1) / 2;
  const offsetY = -height * (MAP_SCALE_FACTOR - 1) / 2;

  // Calculate player position in SVG coordinates
  const playerSvgX = playerPosition.x + 0.5;
  const playerSvgY = playerPosition.y + 0.5;

  // Calculate static item positions
  const staticItemPositions = currentFloor?.staticItems.map((item) => ({
    ...item,
    details: getStaticItemDetails(item.id),
  })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
          <svg
            viewBox={`${offsetX} ${offsetY} ${scaledWidth} ${scaledHeight}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Define patterns for floor and wall */}
            <defs>
              <pattern id="floor-pattern-full" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="1" height="1" fill="#333" />
              </pattern>
              <pattern id="wall-pattern-full" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="1" height="1" fill="#555" />
              </pattern>
            </defs>

            <path d={floorPath} className="fill-[url(#floor-pattern-full)]" />
            <path d={wallPath} className="fill-[url(#wall-pattern-full)] stroke-[#4a3d4c]" strokeWidth={0.05} />

            {/* Render active quest objectives */}
            {activeQuestObjectives.map((obj, index) => (
              <circle
                key={`objective-${index}`}
                cx={obj.position.x + 0.5}
                cy={obj.position.y + 0.5}
                r={0.3}
                fill="yellow"
                stroke="orange"
                strokeWidth={0.1}
              />
            ))}

            {/* Render static items */}
            {staticItemPositions.map((item) => {
              const SpriteComponent = staticItemSpriteMap[item.details.name];
              if (SpriteComponent) {
                return (
                  <image
                    key={item.id}
                    href={SpriteComponent}
                    x={item.position.x}
                    y={item.position.y}
                    width="1"
                    height="1"
                    alt={item.details.name}
                  />
                );
              }
              return (
                <text
                  key={item.id}
                  x={item.position.x + 0.5}
                  y={item.position.y + 0.5}
                  fontSize="0.7"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                >
                  {getEmojiForElement(item.details.name)}
                </text>
              );
            })}

            {/* Render player */}
            <circle cx={playerSvgX} cy={playerSvgY} r={0.4} fill="red" stroke="darkred" strokeWidth={0.1} />
          </svg>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;