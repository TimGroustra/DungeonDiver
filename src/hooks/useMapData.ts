import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { generateSvgPaths } from '@/lib/map-renderer';

interface MapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function useMapData() {
  const { labyrinth, gameVersion } = useGameStore();

  const { floorPath, wallPath, mapBounds } = useMemo(() => {
    if (!labyrinth) {
      return { floorPath: '', wallPath: '', mapBounds: null };
    }

    const grid = labyrinth.getMapGrid();
    const { wallPath, floorPath } = generateSvgPaths(grid);

    const mapWidth = labyrinth["MAP_WIDTH"];
    const mapHeight = labyrinth["MAP_HEIGHT"];

    const bounds: MapBounds = {
      minX: 0,
      minY: 0,
      maxX: mapWidth,
      maxY: mapHeight,
      width: mapWidth,
      height: mapHeight,
    };

    return { floorPath, wallPath, mapBounds: bounds };
  }, [labyrinth, gameVersion]); // Re-calculate when labyrinth or gameVersion changes

  // Player path is not needed for the full map, as it's a single point.
  // The FullMapModal will render a circle for the player position.
  const playerPath = ''; 
  const mapScale = 1; // Assuming 1 unit = 1 tile for simplicity

  return { floorPath, wallPath, playerPath, mapBounds, mapScale };
}