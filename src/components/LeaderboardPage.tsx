"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeaderboardEntry {
  name: string;
  time: number;
}

interface LeaderboardPageProps {
  leaderboard: LeaderboardEntry[];
  onPlay: () => void;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ leaderboard, onPlay }) => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-4"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card className="w-full max-w-md bg-gray-800/90 text-gray-100 dark:bg-gray-100/90 dark:text-gray-900 border-gray-700 dark:border-gray-300">
        <CardHeader>
          <CardTitle className="text-yellow-400 dark:text-yellow-600 text-2xl text-center">Labyrinth Conquerors!</CardTitle>
          <CardDescription className="text-gray-300 dark:text-gray-700 text-center">
            Top 10 fastest adventurers to escape the Labyrinth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 dark:border-gray-300 p-4 bg-gray-900 dark:bg-gray-200">
            <ul className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-600 italic text-center">No scores yet. Be the first!</p>
              ) : (
                leaderboard.map((entry, index) => (
                  <li
                    key={`${entry.name}-${entry.time}-${index}`}
                    className="flex justify-between items-center py-1 px-2 rounded-md text-gray-200 dark:text-gray-800"
                  >
                    <span>{index + 1}. {entry.name}</span>
                    <span>{entry.time.toFixed(2)}s</span>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
          <div className="mt-6 flex justify-center">
            <Button onClick={onPlay} className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4">
              Play Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;