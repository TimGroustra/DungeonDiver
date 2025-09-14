"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Crown, Skull } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameResult } from "@/lib/game"; // Import GameResult

interface GameOverScreenProps {
  result: GameResult;
  onRestart: () => void; // For starting a completely new game
  onRevive: (playerName: string) => void; // New prop for reviving
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ result, onRestart, onRevive }) => {
  const isVictory = result.type === 'victory';

  return (
    <div
      className="flex flex-col items-center justify-center p-4"
    >
      <div className={cn(
        "w-full max-w-md text-center border-4 rounded-lg p-6 space-y-4",
        isVictory ? "bg-yellow-900/50 border-yellow-500 text-yellow-100" : "bg-red-900/50 border-red-500 text-red-100"
      )}>
        <div>
          <div className="flex justify-center mb-4">
            {isVictory ? (
              <Crown className="w-24 h-24 text-yellow-400" />
            ) : (
              <Skull className="w-24 h-24 text-red-400" />
            )}
          </div>
          <h2 className={cn(
            "text-6xl font-extrabold tracking-widest",
            isVictory ? "text-yellow-300" : "text-red-300"
          )}>
            {isVictory ? "VICTORY" : "DEFEAT"}
          </h2>
          <p className={cn(
            "text-lg italic mt-2",
            isVictory ? "text-yellow-200" : "text-red-200"
          )}>
            {isVictory
              ? `Congratulations, ${result.name}! You have conquered the Labyrinth!`
              : `Alas, ${result.name}, the Labyrinth has claimed another soul.`}
          </p>
        </div>
        <div>
          <p className="text-2xl">
            Time: <span className="font-bold">{result.time.toFixed(2)}s</span>
          </p>
          <p className="text-2xl">
            Deaths: <span className="font-bold">{result.deaths}</span>
          </p>
          {!isVictory && result.causeOfDeath && (
            <p className="text-xl mt-2">
              Cause: <span className="font-bold">{result.causeOfDeath}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col space-y-3 pt-4">
          {!isVictory && (
            <Button
              onClick={() => onRevive(result.name)}
              className="text-lg px-8 py-4 text-white bg-blue-600 hover:bg-blue-700"
            >
              Revive (Cost: 1 Death)
            </Button>
          )}
          <Button
            onClick={onRestart}
            className={cn(
              "text-lg px-8 py-4 text-white",
              isVictory ? "bg-yellow-600 hover:bg-yellow-700" : "bg-gray-600 hover:bg-gray-700"
            )}
          >
            Start New Game
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;