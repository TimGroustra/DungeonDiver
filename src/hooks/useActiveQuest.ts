import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Coordinate } from '@/lib/game';
import { getEmojiForElement } from '@/utils/game-assets'; // Import getEmojiForElement

interface ObjectiveLocation extends Coordinate {
  description: string;
  emoji: string; // Add emoji property
}

export function useActiveQuest() {
  const { labyrinth, currentFloor, gameVersion } = useGameStore();

  const activeQuestObjectives = useMemo(() => {
    if (!labyrinth) return [];

    const objectives: ObjectiveLocation[] = [];

    // Helper to add elements if they are on the current floor and not yet completed/collected
    const addElementsFromMap = (
      locationMap: Map<string, string | boolean>,
      isItem: boolean,
      isStatic: boolean = false
    ) => {
      for (const [coordStr, id] of locationMap.entries()) {
        const [x, y, f] = coordStr.split(',').map(Number);
        if (f === currentFloor) {
          let element: { name: string; solved?: boolean; isStatic?: boolean; } | undefined;
          if (isItem) {
            element = labyrinth.getItem(id as string);
            // Only add if not in inventory (for non-static items) or if it's a static item that needs interaction
            if (element && !element.isStatic && labyrinth.getInventoryItems().some(entry => entry.item.id === id)) {
              continue; // Already collected
            }
            if (element && element.isStatic && !labyrinth.getRevealedStaticItems().has(coordStr)) {
              continue; // Static item not yet revealed by search
            }
          } else { // It's a puzzle
            element = labyrinth.getPuzzle(id as string);
            if (element && element.solved) {
              continue; // Already solved
            }
          }

          if (element) {
            objectives.push({
              x,
              y,
              description: element.name,
              emoji: getEmojiForElement(element.name),
            });
          }
        }
      }
    };

    // Add items from itemLocations (loose items)
    addElementsFromMap(labyrinth.itemLocations, true);
    // Add static items from staticItemLocations (quest objects, altars, etc.)
    addElementsFromMap(labyrinth.staticItemLocations, true, true);
    // Add puzzles from puzzleLocations
    addElementsFromMap(labyrinth.puzzleLocations, false);

    // Add staircase to next floor if current floor objective is completed and it's not the last floor
    const currentObjective = labyrinth.getCurrentFloorObjective();
    if (currentObjective.isCompleted() && currentFloor < labyrinth.NUM_FLOORS - 1) {
      const staircaseCoord = labyrinth.floorExitStaircases.get(currentFloor);
      if (staircaseCoord) {
        const staircaseItem = labyrinth.getItem(`staircase-f${currentFloor}-to-f${currentFloor + 1}`);
        if (staircaseItem) {
          objectives.push({
            x: staircaseCoord.x,
            y: staircaseCoord.y,
            description: staircaseItem.name,
            emoji: getEmojiForElement(staircaseItem.name),
          });
        }
      }
    }

    return objectives;

  }, [labyrinth, currentFloor, gameVersion]);

  return { activeQuestObjectives };
}