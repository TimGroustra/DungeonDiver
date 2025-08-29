"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GameLogProps {
  gameLog: string[];
  logRef: React.RefObject<HTMLDivElement>;
}

const GameLog: React.FC<GameLogProps> = ({ gameLog, logRef }) => {
  return (
    <div>
      <h3 className="text-xl font-bold text-blue-300 dark:text-blue-600 mb-2">Chronicles of the Labyrinth:</h3>
      <ScrollArea className="h-24 w-full rounded-md border border-gray-700 dark:border-gray-300 p-3 bg-gray-900 dark:bg-gray-200">
        <div ref={logRef} className="text-gray-200 dark:text-gray-800 text-sm font-mono">
          {gameLog.slice(-10).map((message, index) => (
            <p key={index} className="mb-1 last:mb-0">{message}</p>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default GameLog;