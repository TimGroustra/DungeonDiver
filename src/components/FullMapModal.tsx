import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapImage: string;
  mapDimensions: { width: number; height: number };
  playerPosition: { x: number; y: number } | null;
  playerRotation: number;
  obstacles: { x: number; y: number; width: number; height: number }[];
}

const FullMapModal: React.FC<FullMapModalProps> = ({
  isOpen,
  onClose,
  mapImage,
  mapDimensions,
  playerPosition,
  playerRotation,
  obstacles,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // You might have other useEffects or functions here, they are preserved.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 border-none bg-transparent">
        <div className="relative w-full h-[80vh] overflow-hidden rounded-lg">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${mapDimensions.width} ${mapDimensions.height}`}
            className="absolute inset-0 w-full h-full bg-gray-800"
          >
            <defs>
              <filter id="playerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#007bff" floodOpacity="0.8"/>
              </filter>
            </defs>
            <image
              href={mapImage}
              x="0"
              y="0"
              width={mapDimensions.width}
              height={mapDimensions.height}
            />
            {obstacles.map((obstacle, index) => (
              <rect
                key={index}
                x={obstacle.x}
                y={obstacle.y}
                width={obstacle.width}
                height={obstacle.height}
                fill="rgba(255, 0, 0, 0.5)"
              />
            ))}
            {playerPosition && (
              <circle
                cx={playerPosition.x}
                cy={playerPosition.y}
                r={0.6} // Made 3 times bigger (0.2 * 3 = 0.6)
                fill="#007bff" // Set to blue
                filter="url(#playerGlow)" // Applied glow effect
                transform={`rotate(${playerRotation} ${playerPosition.x} ${playerPosition.y})`}
              />
            )}
          </svg>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;