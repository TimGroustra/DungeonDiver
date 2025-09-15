"use client";

import React, { useState, useEffect, useCallback } from "react";
import LabyrinthGame from "@/components/LabyrinthGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Skull } from "lucide-react";
import { GameResult } from "@/lib/game";
import { useIsMobile } from "@/hooks/use-mobile"; // Import the hook

interface LeaderboardEntry {
  id: number;
  player_name: string;
  score_time: number;
  deaths: number;
  created_at: string;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const Index: React.FC = () => {
  const [playerName, setPlayerName] = useState<string>("");
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [gameKey, setGameKey] = useState<number>(0); // New state for forcing LabyrinthGame re-initialization
  const queryClient = useQueryClient();
  const isMobile = useIsMobile(); // Use the hook

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && startTime !== null && gameResult === null) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, startTime, gameResult]);

  const { data: leaderboard, isLoading: isLoadingLeaderboard, error: leaderboardError } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("id, player_name, score_time, deaths")
        .order("deaths", { ascending: true })
        .order("score_time", { ascending: true })
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
      setStartTime(Date.now());
      setShowLeaderboard(false);
      setGameResult(null); // Clear any previous game result
      setElapsedTime(0); // Reset timer for new game
      setGameKey(prev => prev + 1); // Increment key to force LabyrinthGame re-initialization
    } else {
      toast.error("Please enter your player name.");
    }
  };

  const handleGameOver = useCallback((result: GameResult) => {
    // Keep gameStarted true so LabyrinthGame remains mounted for overlay
    setStartTime(null); // Stop timer
    setGameResult(result); // Set game result to display overlay
    if (result.type === 'victory') {
      toast.success(`Congratulations, ${result.name}! You escaped the Labyrinth in ${formatTime(result.time)}!`);
      addLeaderboardEntryMutation.mutate({ player_name: result.name, score_time: result.time, deaths: result.deaths || 0 });
    } else {
      toast.error(`Game Over, ${result.name}. You were defeated in the Labyrinth.`);
    }
    setShowLeaderboard(false);
  }, [addLeaderboardEntryMutation]);

  const handleGameRestart = () => {
    setGameStarted(true); // Restart game
    setStartTime(Date.now());
    setElapsedTime(0);
    setShowLeaderboard(false);
    setGameResult(null); // Clear game result to hide overlay
    setGameKey(prev => prev + 1); // Increment key to force LabyrinthGame re-initialization
  };

  const handleRevive = () => {
    // Clear the game result to hide the overlay
    setGameResult(null); 
    // Resume the timer from the elapsed time at the point of defeat
    setStartTime(Date.now() - (elapsedTime * 1000));
    // Do NOT change gameStarted or gameKey here, as we are continuing the current session
  };

  return (
    <div className="relative h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center" style={{ backgroundImage: "url('/Eldoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      {!gameStarted && !showLeaderboard && !gameResult && ( // Only show main menu if game not started, no leaderboard, and no game result
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

      {showLeaderboard && !gameStarted && !gameResult && ( // Only show leaderboard if game not started, no game result
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
                    <div className="flex items-center space-x-2 text-stone-300">
                      <div className="flex items-center" title="Deaths">
                        <Skull className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{entry.deaths}</span>
                      </div>
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

      {gameStarted && ( // LabyrinthGame is always mounted if gameStarted is true
        <LabyrinthGame
          key={gameKey} // Use key to force re-initialization only when starting a new game
          playerName={playerName}
          gameStarted={gameStarted}
          startTime={startTime}
          elapsedTime={elapsedTime}
          onGameOver={handleGameOver}
          onGameRestart={handleGameRestart}
          gameResult={gameResult} // Pass gameResult to LabyrinthGame
          onRevive={handleRevive} // Pass handleRevive to LabyrinthGame
        />
      )}
    </div>
  );
};

export default Index;