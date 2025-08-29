"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameResult {
  type: 'victory' | 'defeat';
  name: string;
  time: number;
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
      <Card className={cn(
        "w-full max-w-md text-center border-4",
        isVictory ? "bg-yellow-900/50 border-yellow-500 text-yellow-100" : "bg-red-900/50 border-red-500 text-red-100"
      )}>
        <CardHeader>
          <div className="flex justify-center mb-4">
            {isVictory ? (
              <Crown className="w-24 h-24 text-yellow-400" />
            ) : (
              <Skull className="w-24 h-24 text-red-400" />
            )}
          </div>
          <CardTitle className={cn(
            "text-6xl font-extrabold tracking-widest",
            isVictory ? "text-yellow-300" : "text-red-300"
          )}>
            {isVictory ? "VICTORY" : "DEFEAT"}
          </CardTitle>
          <CardDescription className={cn(
            "text-lg italic",
            isVictory ? "text-yellow-200" : "text-red-200"
          )}>
            {isVictory
              ? `Congratulations, ${result.name}! You have conquered the Labyrinth!`
              : `Alas, ${result.name}, the Labyrinth has claimed another soul.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl">
            Time: <span className="font-bold">{result.time.toFixed(2)}s</span>
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={onRestart}
            className={cn(
              "text-lg px-8 py-4 text-white",
              isVictory ? "bg-yellow-600 hover:bg-yellow-700" : "bg-gray-600 hover:bg-gray-700"
            )}
          >
            Play Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GameOverScreen;