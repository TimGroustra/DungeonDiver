"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapIcon, LocateFixedIcon } from 'lucide-react';
import { useMapData } from '@/hooks/useMapData';
import { useActiveQuest } from '@/hooks/useActiveQuest';
import { usePlayerPosition } from '@/hooks/usePlayerPosition';
import { useGameStore } from '@/stores/gameStore';

interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FullMapModal: React.FC<FullMapModalProps> = ({ isOpen, onClose }) => {
  const { floorPath, wallPath, mapBounds } = useMapData();
  const { activeQuestObjectives } = useActiveQuest();
  const { playerPosition } = usePlayerPosition();
  const { labyrinth, currentFloor } = useGameStore(); // Get labyrinth from store

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<string>("");
  const [isCentered, setIsCentered] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return; // Only update viewBox when modal is open

    if (mapBounds) {
      const { minX, minY, maxX, maxY } = mapBounds;
      const width = maxX - minX;
      const height = maxY - minY;
      // Initial viewBox to show the entire map
      setViewBox(`${minX} ${minY} ${width} ${height}`);
    }
  }, [mapBounds, isOpen]);

  useEffect(() => {
    if (!isOpen) return; // Only update viewBox when modal is open

    if (isCentered && playerPosition && mapBounds) {
      const { x, y } = playerPosition;
      const { minX, minY, maxX, maxY } = mapBounds;
      const mapWidth = maxX - minX;
      const mapHeight = maxY - minY;

      // Calculate a viewBox that centers the player
      // We want to show a certain area around the player, let's say 1/4th of the map's total width/height
      const viewportWidth = mapWidth / 4;
      const viewportHeight = mapHeight / 4;

      const newMinX = x - viewportWidth / 2;
      const newMinY = y - viewportHeight / 2;

      setViewBox(`${newMinX} ${newMinY} ${viewportWidth} ${viewportHeight}`);
    } else if (mapBounds && isOpen && !isCentered) { // If not centered, show full map when opened
      const { minX, minY, maxX, maxY } = mapBounds;
      const width = maxX - minX;
      const height = maxY - minY;
      setViewBox(`${minX} ${minY} ${width} ${height}`);
    }
  }, [isCentered, playerPosition, mapBounds, isOpen]);

  const handleCenterOnPlayer = () => {
    setIsCentered(prev => !prev);
  };

  // Get boss state and passage coordinates for the full map
  const bossState = labyrinth?.getBossState();
  const bossPassageCoords = labyrinth?.bossPassageCoords;
  const isBossDefeated = labyrinth?.isBossDefeated();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-auto">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Full Map - Floor {currentFloor + 1}</DialogTitle>
        </DialogHeader>
        <div className="relative flex-grow overflow-hidden">
          <svg
            ref={svgRef}
            className="w-full h-full bg-[#2a212b]"
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Define patterns for floor and wall */}
            <defs>
              <pattern id="floor-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect x="0" y="0" width="1" height="1" fill="#3a2d3c" />
              </pattern>
              <pattern id="wall-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect x="0" y="0" width="1" height="1" fill="#4a3d4c" />
              </pattern>
            </defs>

            <path d={floorPath} className="fill-[url(#floor-pattern-full)]" />
            <path d={wallPath} className="fill-[url(#wall-pattern-full)] stroke-[#4a3d4c]" strokeWidth={0.02} />

            {/* Render Boss Passage Overlay on full map */}
            {labyrinth && currentFloor === labyrinth.NUM_FLOORS - 1 && !isBossDefeated && Array.from(bossPassageCoords || []).map((coordStr) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;

              const isRedLight = bossState === 'red_light';
              const isSafeTile = labyrinth.bossSafeTiles.has(coordStr);

              const fill = isRedLight ? 'rgba(255, 0, 0, 0.3)' : 'transparent';
              const className = isRedLight && !isSafeTile ? 'animate-pulse-fast' : '';

              return (
                <rect
                  key={`boss-passage-full-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill={fill}
                  className={className}
                />
              );
            })}

            {/* Render active quest objectives with emojis */}
            {activeQuestObjectives.map((obj, index) => (
              <text
                key={`objective-${index}`}
                x={obj.x + 0.5}
                y={obj.y + 0.5}
                fontSize="0.7" // Adjust size for visibility on full map
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-yellow-300 stroke-yellow-600" // Use text color for emoji
                title={obj.description} // Show description on hover
              >
                {obj.emoji}
              </text>
            ))}

            {/* Render player position */}
            {playerPosition && (
              <circle
                cx={playerPosition.x}
                cy={playerPosition.y}
                r={1.8} // Increased radius by 3 times (0.6 * 3 = 1.8)
                className="fill-blue-500 stroke-blue-700 animate-pulse-slow" // Added animate-pulse-slow class
                strokeWidth={0.02}
              />
            )}
          </svg>
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4"
            onClick={handleCenterOnPlayer}
          >
            <LocateFixedIcon className="h-4 w-4" />
            <span className="sr-only">Center on Player</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;