"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const { labyrinth, currentFloor } = useGameStore();

  // The equipped compass is needed to decide whether to show the player's location.
  const equippedCompass = labyrinth?.getEquippedCompass();

  const svgRef = useRef<SVGSVGElement>(null);

  // The viewBox is now static to always show the full map.
  const viewBox = mapBounds
    ? `${mapBounds.minX} ${mapBounds.minY} ${mapBounds.width} ${mapBounds.height}`
    : "0 0 100 100";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] flex flex-col p-4 bg-stone-900/90 border-amber-700 text-amber-50">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Full Map - Floor {currentFloor + 1}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow flex items-center justify-center overflow-hidden p-2">
          <div className="w-full h-full max-w-full max-h-full aspect-square relative">
            <svg
              ref={svgRef}
              className="w-full h-full bg-[#2a212b]"
              viewBox={viewBox}
              preserveAspectRatio="xMidYMid meet"
            >
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

              {activeQuestObjectives.map((obj, index) => (
                <text
                  key={`objective-${index}`}
                  x={obj.x + 0.5}
                  y={obj.y + 0.5}
                  fontSize="0.7"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-yellow-300 stroke-yellow-600"
                  title={obj.description}
                >
                  {obj.emoji}
                </text>
              ))}

              {playerPosition && equippedCompass?.id === "true-compass-f2" && (
                <circle
                  cx={playerPosition.x + 0.5}
                  cy={playerPosition.y + 0.5}
                  r={1.8}
                  className="fill-blue-500 stroke-blue-700 animate-pulse-slow"
                  strokeWidth={0.02}
                />
              )}
            </svg>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;