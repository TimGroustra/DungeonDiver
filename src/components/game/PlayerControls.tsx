"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Enemy } from "@/lib/game";

interface PlayerControlsProps {
  isGameOver: boolean;
  showRPS: boolean;
  currentEnemy: Enemy | undefined;
  onMove: (direction: "north" | "south" | "east" | "west") => void;
  onSearch: () => void;
  onInteract: () => void;
  onRPSChoice: (choice: "left" | "center" | "right") => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isGameOver,
  showRPS,
  currentEnemy,
  onMove,
  onSearch,
  onInteract,
  onRPSChoice,
}) => {
  if (showRPS && currentEnemy) {
    return (
      <div className="p-3 border border-red-600 rounded-md bg-red-900/80 dark:bg-red-100/80 text-red-100 dark:text-red-900 w-full max-w-sm mt-4">
        <h3 className="text-xl font-bold text-red-400 dark:text-red-700 mb-2">Combat Encounter!</h3>
        <p className="text-base mb-2">You face a fearsome {currentEnemy.name}: <span className="italic">{currentEnemy.description}</span></p>
        <p className="mb-2">Choose your move wisely, adventurer:</p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => onRPSChoice("left")}>Attack Left</Button>
          <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => onRPSChoice("center")}>Attack Center</Button>
          <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => onRPSChoice("right")}>Attack Right</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-4 w-full sm:max-w-64">
        <div />
        <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => onMove("north")} disabled={isGameOver || showRPS}>North</Button>
        <div />
        <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => onMove("west")} disabled={isGameOver || showRPS}>West</Button>
        <div />
        <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => onMove("east")} disabled={isGameOver || showRPS}>East</Button>
        <div />
        <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => onMove("south")} disabled={isGameOver || showRPS}>South</Button>
        <div />
      </div>
      <div className="flex gap-3 mt-3">
        <Button className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={onSearch} disabled={isGameOver || showRPS}>Search Area</Button>
        <Button className="bg-purple-700 hover:bg-purple-800 text-white" onClick={onInteract} disabled={isGameOver || showRPS}>Interact</Button>
      </div>
    </>
  );
};

export default PlayerControls;