"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Labyrinth, GameResult } from "@/lib/game"; // Import GameResult
import LabyrinthGame from "@/components/LabyrinthGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Skull } from "lucide-react"; // Added Skull icon
import GameOverScreen from "@/components/GameOverScreen";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeaderboardEntry {
  id: number;
  player_name: string;
  score_time: number;
  deaths: number; // Added deaths property
  created_at: string;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Index: React.FC = () => {
  const [playerName, setPlayerName] = useState<string>("");
  const [labyrinth, setLabyrinth] = useState<Labyrinth | null>(null); // Manage Labyrinth instance here
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Initialize Labyrinth when game starts or on initial load
  useEffect(() => {
    if (gameStarted && !labyrinth) {
      setLabyrinth(new Labyrinth(0)); // Start with 0 deaths for a new game
      setStartTime(Date.now());
    }
  }, [gameStarted, labyrinth]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && startTime !== null) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [gameStarted, startTime]);

  const { data: leaderboard, isLoading: isLoadingLeaderboard, error: leaderboardError } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .order("deaths", { ascending: true }) // Order by deaths first
        .order("score_time", { ascending: true }) // Then by time
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: showLeaderboard,
  });

  const addLeaderboardEntryMutation = useMutation({
    mutationFn: async (entry: { player_name: string; score_time: number; deaths: number }) => {
      const { data, error } = await supabase
        .from("leaderboard")
        .insert([entry]);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("Score submitted to leaderboard!");
    },
    onError: (error) => {
      toast.error(`Failed to submit score: ${error.message}`);
    },
  });

  const handleStartGame = () => {
    if (playerName.trim()) {
      setGameStarted(true);
      setLabyrinth(new Labyrinth(0)); // New game, 0 deaths
      setStartTime(Date.now());
      setShowLeaderboard(false);
      setGameResult(null);
    } else {
      toast.error("Please enter your player name.");
    }
  };

  const handleGameOver = useCallback((result: GameResult) => {
    setGameStarted(false);
    setStartTime(null);
    setGameResult(result);
    if (result.type === 'victory') {
      toast.success(`Congratulations, ${result.name}! You escaped the Labyrinth in ${formatTime(result.time)} with ${result.deaths} deaths!`);
      addLeaderboardEntryMutation.mutate({ player_name: result.name, score_time: result.time, deaths: result.deaths });
    } else {
      toast.error(`Game Over, ${result.name}. You were defeated in the Labyrinth.`);
    }
    setShowLeaderboard(false);
  }, [addLeaderboardEntryMutation]);

  const handleGameRestart = () => {
    setGameStarted(false); // Go back to main menu
    setLabyrinth(null); // Clear labyrinth instance
    setStartTime(null);
    setElapsedTime(0);
    setShowLeaderboard(false);
    setGameResult(null);
  };

  const handleRevive = useCallback((revivePlayerName: string) => {
    if (labyrinth) {
      labyrinth.revivePlayer(); // Increment deaths, restore health, clear game over
      setGameStarted(true); // Continue game
      setGameResult(null); // Clear game result
      setLabyrinth(prevLabyrinth => prevLabyrinth ? { ...prevLabyrinth } : null); // Force re-render of LabyrinthGame
      toast.info(`You have been revived, ${revivePlayerName}!`);
    }
  }, [labyrinth]);

  return (
    <div className="relative h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center" style={{ backgroundImage: "url('/Eldoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      {!gameStarted && !showLeaderboard && !gameResult && (
        <Card className="w-full max-w-md bg-stone-900/80 backdrop-blur-sm border-amber-700 text-amber-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-300">Enter the Labyrinth</CardTitle>
            <CardDescription className="text-stone-400">Unravel the mysteries and escape with your life.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMobile ? (
              <p className="text-red-400 text-center font-bold text-lg">To play this game, visit this site from your desktop browser.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="playerName" className="text-amber-100">Player Name</Label>
                  <Input
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Your adventurer name"
                    className="bg-stone-800 border-amber-600 text-amber-50 placeholder:text-stone-500 focus:ring-amber-500"
                  />
                </div>
                <Button onClick={handleStartGame} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold">
                  Start New Game
                </Button>
              </>
            )}
            <Button onClick={() => setShowLeaderboard(true)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
              View Leaderboard
            </Button>
          </CardContent>
        </Card>
      )}

      {showLeaderboard && !gameStarted && !gameResult && (
        <Card className="w-full max-w-md bg-stone-900/80 backdrop-blur-sm border-amber-700 text-amber-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-300">Leaderboard</CardTitle>
            <CardDescription className="text-stone-400">Top adventurers who escaped the Labyrinth.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLeaderboard ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : leaderboardError ? (
              <p className="text-red-400 text-center">Error loading leaderboard: {leaderboardError.message}</p>
            ) : (
              <ul className="space-y-2">
                {leaderboard?.map((entry, index) => (
                  <li key={entry.id} className="flex justify-between items-center p-2 bg-stone-800 rounded">
                    <span className="font-semibold text-amber-200">{index + 1}. {entry.player_name}</span>
                    <div className="flex items-center gap-2 text-stone-300">
                      <span className="flex items-center"><Skull className="w-3 h-3 mr-1 text-gray-400" />{entry.deaths}</span>
                      <span>{formatTime(entry.score_time)}</span>
                    </div>
                  </li>
                ))}
                {leaderboard?.length === 0 && <p className="text-stone-400 text-center italic">No scores yet. Be the first!</p>}
              </ul>
            )}
            <Separator className="my-4 bg-amber-800" />
            <Button onClick={() => setShowLeaderboard(false)} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold">
              Back to Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {gameStarted && labyrinth && (
        <LabyrinthGame
          playerName={playerName}
          labyrinth={labyrinth}
          setLabyrinth={setLabyrinth}
          startTime={startTime}
          elapsedTime={elapsedTime}
          onGameOver={handleGameOver}
          onGameRestart={handleGameRestart}
          onRevive={handleRevive}
        />
      )}

      {gameResult && !gameStarted && (
        <GameOverScreen result={gameResult} onRestart={handleGameRestart} onRevive={handleRevive} />
      )}
    </div>
  );
};

export default Index;