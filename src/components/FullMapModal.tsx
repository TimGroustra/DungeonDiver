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
  children?: React.ReactNode;
}

const FullMapModal: React.FC<FullMapModalProps> = ({ children }) => {
  const { floorPath, wallPath, playerPath, mapBounds, mapScale } = useMapData();
  const { activeQuestObjectives } = useActiveQuest();
  const { playerPosition } = usePlayerPosition();
  const { currentFloor } = useGameStore();

  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState<string>("");
  const [isCentered, setIsCentered] = useState<boolean>(false);

  useEffect(() => {
    if (mapBounds) {
      const { minX, minY, maxX, maxY } = mapBounds;
      const width = maxX - minX;
      const height = maxY - minY;
      // Initial viewBox to show the entire map
      setViewBox(`${minX} ${minY} ${width} ${height}`);
    }
  }, [mapBounds]);

  useEffect(() => {
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
    } else if (mapBounds) {
      const { minX, minY, maxX, maxY } = mapBounds;
      const width = maxX - minX;
      const height = maxY - minY;
      setViewBox(`${minX} ${minY} ${width} ${height}`);
    }
  }, [isCentered, playerPosition, mapBounds]);

  const handleCenterOnPlayer = () => {
    setIsCentered(prev => !prev);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="icon" className="relative">
            <MapIcon className="h-4 w-4" />
            <span className="sr-only">Full Map</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-auto">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Full Map - Floor {currentFloor}</DialogTitle>
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
            <path d={wallPath} className="fill-[url(#wall-pattern-full)] stroke-[#4a3d4c]" strokeWidth={0.05} />

            {/* Render active quest objectives */}
            {activeQuestObjectives.map((obj, index) => (
              <circle
                key={`objective-${index}`}
                cx={obj.x}
                cy={obj.y}
                r={0.5}
                className="fill-yellow-400 stroke-yellow-600"
                strokeWidth={0.1}
              />
            ))}

            {/* Render player position */}
            {playerPosition && (
              <circle
                cx={playerPosition.x}
                cy={playerPosition.y}
                r={0.5}
                className="fill-red-500 stroke-red-700"
                strokeWidth={0.1}
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