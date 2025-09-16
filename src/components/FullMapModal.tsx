import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMemo } from "react";
import { generateSvgPaths } from "@/lib/mapUtils";
import { Labyrinth } from "@/lib/labyrinth";

const FullMapModal = ({ isOpen, onClose, labyrinth, currentFloor, playerPosition, visited, bossPassageCoords, isBossDefeated }) => {
  const { floorPath, wallPath, viewBox } = useMemo(() => {
    if (!labyrinth) return { floorPath: '', wallPath: '', viewBox: '0 0 20 20' };
    // Generate paths for the entire labyrinth grid
    return generateSvgPaths(labyrinth.grid, { x: 0, y: 0 }, new Set(Object.keys(labyrinth.grid)), 1);
  }, [labyrinth]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-auto bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Labyrinth Map</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-full aspect-square">
          {labyrinth && (
            <svg viewBox={viewBox} className="w-full h-full">
              <defs>
                <pattern id="floor-pattern-full" patternUnits="userSpaceOnUse" width="0.5" height="0.5">
                  <path d="M0.25,0 L0.25,0.5 M0,0.25 L0.5,0.25" stroke="#4a3d4c" strokeWidth="0.05" />
                </pattern>
                <pattern id="wall-pattern-full" patternUnits="userSpaceOnUse" width="0.2" height="0.2">
                  <path d="M0,0 L0.2,0.2 M0.1,0 L0.2,0.1 M0,0.1 L0.1,0.2" stroke="#332a35" strokeWidth="0.03" />
                </pattern>
              </defs>
              <path d={floorPath} className="fill-[url(#floor-pattern-full)]" />
              <path d={wallPath} className="fill-[url(#wall-pattern-full)] stroke-[#4a3d4c]" strokeWidth={0.01} />

              {/* Render Boss Passage Overlay on full map */}
              {labyrinth && currentFloor === labyrinth.NUM_FLOORS - 1 && !isBossDefeated && Array.from(bossPassageCoords || []).map((coordStr) => {
                const [x, y] = coordStr.split(',').map(Number);
                return <rect key={coordStr} x={x} y={y} width="1" height="1" className="fill-red-500 opacity-50" />;
              })}

              {/* Render player position on full map */}
              {playerPosition && (
                <circle cx={playerPosition.x + 0.5} cy={playerPosition.y + 0.5} r="0.3" className="fill-blue-500" />
              )}
            </svg>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;