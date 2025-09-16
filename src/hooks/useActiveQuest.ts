import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Coordinate } from '@/lib/game';

interface ObjectiveLocation extends Coordinate {
  description: string;
}

export function useActiveQuest() {
  const { labyrinth, currentFloor, gameVersion } = useGameStore();

  const activeQuestObjectives = useMemo(() => {
    if (!labyrinth) return [];

    const objectives: ObjectiveLocation[] = [];
    const currentObjective = labyrinth.getCurrentFloorObjective();

    // For simplicity, let's assume quest objectives are tied to specific item/static item/enemy locations
    // This is a placeholder and would need more sophisticated logic based on your game's quest design.
    // For now, we'll just return an empty array or a placeholder if no specific locations are defined.

    // Example: If the objective is to find a specific item, you could try to find its location
    // This part would need to be tailored to how your Labyrinth class stores quest-related locations.
    // For now, we'll just return an empty array.
    return objectives;

  }, [labyrinth, currentFloor, gameVersion]);

  return { activeQuestObjectives };
}