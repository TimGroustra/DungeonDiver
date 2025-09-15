"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Labyrinth } from "@/lib/game";
import { generateSvgPaths } from "@/lib/map-renderer";
import { cn } from "@/lib/utils";

interface FullMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  labyrinth: Labyrinth;
}

const FullMapModal: React.FC<FullMapModalProps> = ({ isOpen, onClose, labyrinth }) => {
  const currentFloor = labyrinth.getCurrentFloor();
  const mapWidth = labyrinth["MAP_WIDTH"];
  const mapHeight = labyrinth["MAP_HEIGHT"];
  const playerLoc = labyrinth.getPlayerLocation();

  const { wallPath, floorPath } = React.useMemo(() => generateSvgPaths(labyrinth.getMapGrid()), [labyrinth, currentFloor]);

  // Helper function to get active quest objective coordinates
  const getActiveQuestObjectiveCoords = (): { x: number; y: number; type: string; }[] => {
    const activeObjectives: { x: number; y: number; type: string; }[] = [];
    if (!labyrinth) return activeObjectives;

    // Helper to add an objective if it's not completed and exists on the map
    const addObjective = (id: string, map: Map<string, string | boolean>, type: string) => {
      for (const [coordStr, elementId] of map.entries()) {
        const [x, y, f] = coordStr.split(',').map(Number);
        if (f === currentFloor && elementId === id) {
          activeObjectives.push({ x, y, type });
          return; // Found it, no need to search further for this ID
        }
      }
    };

    // Floor 0: The Echoes of the Lost Scholar
    if (currentFloor === 0 && !labyrinth["scholarAmuletQuestCompleted"]) {
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "journal-f0")) {
        addObjective("journal-f0", labyrinth.itemLocations, "item");
      }
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "charged-crystal-f0")) {
        addObjective("charged-crystal-f0", labyrinth.itemLocations, "item");
      }
      addObjective("ancient-mechanism-f0", labyrinth.staticItemLocations, "static");
    }
    // Floor 1: The Whispering Well's Thirst
    else if (currentFloor === 1 && !labyrinth["whisperingWellQuestCompleted"]) {
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "enchanted-flask-f1")) {
        addObjective("enchanted-flask-f1", labyrinth.itemLocations, "item");
      }
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "living-water-f1")) { // If flask is filled, water is in inventory
        addObjective("hidden-spring-f1", labyrinth.staticItemLocations, "static");
      }
      addObjective("dry-well-f1", labyrinth.staticItemLocations, "static");
    }
    // Floor 2: The Broken Compass's Secret
    else if (currentFloor === 2 && !labyrinth["trueCompassQuestCompleted"]) {
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "broken-compass-f2")) {
        addObjective("broken-compass-f2", labyrinth.itemLocations, "item");
      }
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "fine-tools-f2")) {
        addObjective("fine-tools-f2", labyrinth.itemLocations, "item");
      }
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "prismatic-lens-f2")) {
        addObjective("prismatic-lens-f2", labyrinth.itemLocations, "item");
      }
      addObjective("repair-bench-f2", labyrinth.staticItemLocations, "static");
    }
    // Floor 3 (last floor): The Heart of the Labyrinth
    else if (currentFloor === labyrinth["NUM_FLOORS"] - 1 && (!labyrinth["bossDefeated"] || !labyrinth["heartSacrificed"])) {
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "labyrinth-key-f3")) {
        addObjective("labyrinth-key-f3", labyrinth.itemLocations, "item");
      }
      if (!labyrinth["mysteriousBoxOpened"]) {
        addObjective("mysterious-box-f3", labyrinth.staticItemLocations, "static");
      }
      if (!labyrinth.getInventoryItems().some(i => i.item.id === "heart-of-labyrinth-f3")) {
         if (labyrinth["mysteriousBoxOpened"]) {
            addObjective("heart-of-labyrinth-f3", labyrinth.itemLocations, "item");
         }
      }
      if (!labyrinth["bossDefeated"]) {
        addObjective("watcher-of-the-core-f3", labyrinth.enemyLocations, "enemy");
      }
      if (!labyrinth["heartSacrificed"]) {
        addObjective("ancient-altar-f3", labyrinth.staticItemLocations, "static");
      }
    }

    return activeObjectives;
  };

  const activeQuestObjectives = getActiveQuestObjectiveCoords();

  const renderFullMap = () => {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full" shapeRendering="crispEdges">
          <defs>
            <pattern id="floor-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
              <rect width="1" height="1" fill="#3a2d3c" />
              <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" />
              <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
              <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
            </pattern>
            <pattern id="wall-pattern-full" patternUnits="userSpaceOnUse" width="1" height="1">
              <rect width="1" height="1" fill="#5a4d5c" />
              <path d="M 0 0.2 L 1 0.2 M 0 0.8 L 1 0.8 M 0.2 0 L 0.2 1 M 0.8 0 L 0.8 1" stroke="#6a5d6c" strokeWidth="0.1" />
            </pattern>
          </defs>

          <g>
            {/* Render floor and walls */}
            <path d={floorPath} className="fill-[url(#floor-pattern-full)]" />
            <path d={wallPath} className="fill-[url(#wall-pattern-full)] stroke-[#4a3d4c]" strokeWidth={0.05} />

            {/* Render active quest objectives */}
            {activeQuestObjectives.map((obj, index) => (
              <circle key={`objective-${obj.x}-${obj.y}-${index}`} cx={obj.x + 0.5} cy={obj.y + 0.5} r="0.3" fill="gold" stroke="orange" strokeWidth="0.1" />
            ))}

            {/* Render player */}
            <circle cx={playerLoc.x + 0.5} cy={playerLoc.y + 0.5} r="0.4" fill="cyan" stroke="white" strokeWidth="0.1" className="animate-pulse-fast" />
          </g>
        </svg>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] sm:max-w-[800px] sm:max-h-[600px] bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 dark:text-yellow-600">Labyrinth Map - Floor {currentFloor + 1}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden border border-gray-700 dark:border-gray-300 rounded-md bg-gray-900 dark:bg-gray-200">
          <ScrollArea className="h-full w-full">
            <div className="p-2">
              {renderFullMap()}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullMapModal;