import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Coordinate } from '@/lib/game';

export function usePlayerPosition() {
  const { labyrinth, gameVersion } = useGameStore();

  const playerPosition: Coordinate | null = useMemo(() => {
    if (!labyrinth) return null;
    return labyrinth.getPlayerLocation();
  }, [labyrinth, gameVersion]); // Re-calculate when labyrinth or gameVersion changes

  return { playerPosition };
}