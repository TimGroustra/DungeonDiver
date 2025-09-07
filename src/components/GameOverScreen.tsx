"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Crown, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameResult {
  type: 'victory' | 'defeat';
  name: string;
  time: number;
  causeOfDeath?: string;
}

interface GameOverScreenProps {
  result: GameResult;
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ result, onRestart }) => {
  const isVictory = result.type === 'victory';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        backgroundImage: "url('/Eldoria.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
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
          {!isVictory && result.causeOfDeath && (
            <p className="text-xl mt-2">
              Cause: <span className="font-bold">{result.causeOfDeath}</span>
            </p>
          )}
        </div>
        <div className="flex justify-center pt-4">
          <Button
            onClick={onRestart}
            className={cn(
              "text-lg px-8 py-4 text-white",
              isVictory ? "bg-yellow-600 hover:bg-yellow-700" : "bg-gray-600 hover:bg-gray-700"
            )}
          >
            Play Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;