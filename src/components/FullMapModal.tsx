import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallPath: string; // Changed from mapImage
  floorPath: string; // New prop for floor path
  mapDimensions: { width: number; height: number };
  playerPosition: { x: number; y: number } | null;
  playerRotation: number;
  // Removed obstacles prop as paths define the map
}

const FullMapModal: React.FC<FullMapModalProps> = ({
  isOpen,
  onClose,
  wallPath,
  floorPath,
  mapDimensions,
  playerPosition,
  playerRotation,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 border-none bg-transparent">
        <div className="relative w-full h-[80vh] overflow-hidden rounded-lg">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${mapDimensions.width} ${mapDimensions.height}`}
            className="absolute inset-0 w-full h-full bg-gray-800"
            shapeRendering="crispEdges"
          >
            <defs>
              <filter id="playerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#007bff" floodOpacity="0.8"/>
              </filter>
              {/* Define patterns for floor and wall here, similar to LabyrinthGame */}
              <pattern id="floor-pattern-modal" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect width="1" height="1" fill="#3a2d3c" />
                <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" />
                <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
                <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
              </pattern>
              <pattern id="wall-pattern-modal" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect width="1" height="1" fill="#5a4d5c" />
                <path d="M 0 0.2 L 1 0.2 M 0 0.8 L 1 0.8 M 0.2 0 L 0.2 1 M 0.8 0 L 0.8 1" stroke="#6a5d6c" stroke-width="0.1" />
              </pattern>
            </defs>
            <path d={floorPath} className="fill-[url(#floor-pattern-modal)]" />
            <path d={wallPath} className="fill-[url(#wall-pattern-modal)] stroke-[#4a3d4c]" strokeWidth={0.05} />
            <rect x="0" y="0" width={mapDimensions.width} height={mapDimensions.height} fill="none" stroke="gold" strokeWidth="0.2" />
            {playerPosition && (
              <circle
                cx={playerPosition.x + 0.5} // Center the circle on the tile
                cy={playerPosition.y + 0.5} // Center the circle on the tile
                r={0.6}
                fill="#007bff"
                filter="url(#playerGlow)"
                transform={`rotate(${playerRotation} ${playerPosition.x + 0.5} ${playerPosition.y + 0.5})`}
              />
            )}
          </svg>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;