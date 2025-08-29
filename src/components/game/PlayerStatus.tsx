"use client";

import React from "react";
import { Labyrinth } from "@/lib/game";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sword, Shield, Target } from "lucide-react";

interface PlayerStatusProps {
  labyrinth: Labyrinth;
  cellSize: number;
  dynamicViewportSize: number;
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({ labyrinth, cellSize, dynamicViewportSize }) => {
  return (
    <div className="w-full" style={{ maxWidth: `${dynamicViewportSize * cellSize}px` }}> {/* Constrain width to match map */}
      <h3 className="text-xl font-bold text-lime-300 dark:text-lime-600 mb-2 text-center lg:text-left">Adventurer's Status:</h3>
      <div className="flex justify-center lg:justify-start items-center gap-4 text-base text-gray-300 dark:text-gray-700 p-2 rounded-md bg-gray-900/50 dark:bg-gray-200/50 mb-4">
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5 cursor-help transition-transform hover:scale-110">
            <Sword size={20} className="text-orange-400" />
            <span className="font-bold text-lg">{labyrinth.getCurrentAttackDamage()}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p><strong>Attack Power:</strong> The amount of damage you deal in combat.</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5 cursor-help transition-transform hover:scale-110">
            <Shield size={20} className="text-blue-400" />
            <span className="font-bold text-lg">{labyrinth.getCurrentDefense()}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p><strong>Defense:</strong> Reduces incoming damage from enemies.</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5 cursor-help transition-transform hover:scale-110">
            <Target size={20} className="text-purple-400" />
            <span className="font-bold text-lg">{labyrinth.getSearchRadius()}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p><strong>Search Radius:</strong> The range of your 'Search Area' action.</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="w-full mb-2">
        <div className="flex justify-between items-center mb-1 px-1">
          <span className="text-sm font-bold text-lime-300 dark:text-lime-600">Health</span>
          <span className="text-xs font-mono text-gray-300 dark:text-gray-700">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span>
        </div>
        <div className="w-full bg-red-900/70 rounded-full h-4 border border-gray-600 dark:bg-red-300/50">
          <div
            className="bg-green-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${(labyrinth.getPlayerHealth() / labyrinth.getPlayerMaxHealth()) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerStatus;