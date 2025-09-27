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
import { Loader2, Skull, ChevronLeft, ChevronRight } from "lucide-react";
import { GameResult } from "@/lib/game";
import { useIsMobile } from "@/hooks/use-mobile";
import { WalletConnect } from "@/components/WalletConnect";
import { useWalletStore } from "@/stores/walletStore";
import { truncateAddress } from "@/lib/utils";
import UserGuideModal from "@/components/UserGuideModal";

interface LeaderboardEntry {
  id: number;
  player_name: string;
  score_time: number;
  deaths: number;
  wallet_address: string | null;
}

interface PlayerSpell {
  spell_id: string;
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
  const [gameKey, setGameKey] = useState<number>(0);
  const [displayDate, setDisplayDate] = useState(new Date());
  const [showUserGuide, setShowUserGuide] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { balance, address } = useWalletStore();

  const hasElectrogem = balance !== null && balance > 0;

  // Removed: Supabase Auth Listener
  // useEffect(() => {
  //   const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
  //     if (event === 'SIGNED_OUT') {
  //       queryClient.invalidateQueries({ queryKey: ["learnedSpells"] });
  //       queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  //     }
  //   });
  //   return () => {
  //     authListener.subscription.unsubscribe();
  //   };
  // }, [queryClient]);

  // Fetch initial learned spells using react-query
  const { data: learnedSpellsData, isLoading: isLoadingLearnedSpells, error: learnedSpellsError } = useQuery<string[]>({
    queryKey: ["learnedSpells", address], // Depend on address to refetch if user changes
    queryFn: async () => {
      if (address) {
        const { data, error } = await supabase
          .from('player_spells')
          .select('spell_id')
          .eq('wallet_address', address); // Use wallet_address directly

        if (error) {
          console.error("Error fetching learned spells:", error);
          throw error;
        }
        return data.map(s => s.spell_id);
      }
      return [];
    },
    enabled: !!address, // Only run if wallet is connected
  });

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
    queryKey: ["leaderboard", displayDate.getFullYear(), displayDate.getMonth()],
    queryFn: async () => {
      const year = displayDate.getFullYear();
      const month = displayDate.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1);

      const { data, error } = await supabase
        .from("leaderboard")
        .select("id, player_name, score_time, deaths, wallet_address")
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .order("deaths", { ascending: true })
        .order("score_time", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: showLeaderboard,
  });

  const addLeaderboardEntryMutation = useMutation({
    mutationFn: async (entry: { player_name: string; score_time: number; deaths: number; wallet_address: string | null }) => {
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
      if (error.message.includes("duplicate key value violates unique constraint")) {
        toast.info("This exact score has already been recorded on the leaderboard.");
      } else {
        toast.error(`Failed to submit score: ${error.message}`);
      }
    },
  });

  const saveLearnedSpellsMutation = useMutation({
    mutationFn: async (spellsToSave: { wallet_address: string; spell_id: string }[]) => { // Removed user_id
      console.log("[Index] Attempting to save spells:", spellsToSave); // LOG
      const { error } = await supabase
        .from('player_spells')
        .upsert(spellsToSave, { onConflict: 'wallet_address,spell_id' }); // Use wallet_address for onConflict
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Learned spells saved!");
      queryClient.invalidateQueries({ queryKey: ["learnedSpells"] }); // Invalidate to refetch next game
    },
    onError: (error) => {
      console.error("Error saving learned spells:", error);
      toast.error("Failed to save learned spells.");
    },
  });

  const handleStartGame = () => {
    if (playerName.trim()) {
      setGameStarted(true);
      setStartTime(Date.now());
      setShowLeaderboard(false);
      setGameResult(null);
      setElapsedTime(0);
      setGameKey(prev => prev + 1);
    } else {
      toast.error("Please enter your player name.");
    }
  };

  const handleGameOver = useCallback(async (result: GameResult, learnedSpells: Set<string>) => {
    setStartTime(null);
    setGameResult(result);
    if (result.type === 'victory') {
      toast.success(`Congratulations, ${result.name}! You escaped the Labyrinth in ${formatTime(result.time)}!`);
      addLeaderboardEntryMutation.mutate({
        player_name: result.name,
        score_time: result.time,
        deaths: result.deaths || 0,
        wallet_address: address
      });

      // Save learned spells if wallet is connected
      if (address) { // Use address directly
        const spellsToSave: { wallet_address: string; spell_id: string }[] = [];
        // Filter out the default "Lightning Strike" spell as it's not "learned" in the same way
        const currentLearnedSpells = Array.from(learnedSpells).filter(spellId => spellId !== "spellbook-lightning");
        console.log("[Index] Learned spells from game (excluding Lightning Strike):", currentLearnedSpells); // LOG

        // Always attempt to upsert all learned spells from the current game session
        const allSpellsToUpsert = currentLearnedSpells.map(spellId => ({
          wallet_address: address,
          spell_id: spellId
        }));
        console.log("[Index] Spells to upsert:", allSpellsToUpsert); // LOG

        if (allSpellsToUpsert.length > 0) {
          saveLearnedSpellsMutation.mutate(allSpellsToUpsert);
        } else {
          toast.info("No spells to save.");
        }
      } else {
        toast.info("Connect your wallet to save your learned spells!");
      }

    } else {
      toast.error(`Game Over, ${result.name}. You were defeated in the Labyrinth.`);
    }
    setShowLeaderboard(false);
  }, [addLeaderboardEntryMutation, saveLearnedSpellsMutation, address]);

  const handleGameRestart = () => {
    setGameStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setShowLeaderboard(false);
    setGameResult(null);
    setGameKey(prev => prev + 1);
  };

  const handleRevive = () => {
    setGameResult(null); 
    setStartTime(Date.now() - (elapsedTime * 1000));
  };

  const handlePrevMonth = () => {
    setDisplayDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setDisplayDate(currentDate => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate > new Date() ? currentDate : newDate;
    });
  };

  const isNextMonthDisabled = () => {
    const nextMonth = new Date(displayDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth > new Date();
  };

  // Determine if any modal is open to pass to LabyrinthGame
  const isAnyModalOpen = showLeaderboard || showUserGuide || (gameStarted && gameResult !== null);

  return (
    <div className="relative h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-center" style={{ backgroundImage: "url('/Eldoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      {!gameStarted && !showLeaderboard && !gameResult && (
        <div className="flex flex-col items-center text-center">
          <h1
            className="font-cinzel text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 mb-6"
            style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.7)", transform: "translateY(-2cm)" }}
          >
            Labyrinth of Eldoria
          </h1>
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
                  <WalletConnect />
                  <Button onClick={handleStartGame} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold">
                    Start New Game
                  </Button>
                </>
              )}
              <Button onClick={() => setShowLeaderboard(true)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
                View Leaderboard
              </Button>
              <Button onClick={() => setShowUserGuide(true)} variant="outline" className="w-full bg-transparent border-amber-600 text-amber-200 hover:bg-amber-900/50 hover:text-amber-100 font-bold">
                User Guide
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showLeaderboard && !gameStarted && !gameResult && (
        <Card className="w-full max-w-md bg-stone-900/80 backdrop-blur-sm border-amber-700 text-amber-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-amber-300">Leaderboard</CardTitle>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardDescription className="text-stone-400 text-center">
                {displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </CardDescription>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={isNextMonthDisabled()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
                    <div className="flex flex-col items-start">
                      <span className="font-semibold text-amber-200">{index + 1}. {entry.player_name}</span>
                      {entry.wallet_address && (
                        <span className="text-xs font-mono text-stone-400">{truncateAddress(entry.wallet_address)}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-stone-300">
                      <div className="flex items-center" title="Deaths">
                        <Skull className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{entry.deaths}</span>
                      </div>
                      <span>{formatTime(entry.score_time)}</span>
                    </div>
                  </li>
                ))}
                {leaderboard?.length === 0 && <p className="text-stone-400 text-center italic">No scores yet for this month. Be the first!</p>}
              </ul>
            )}
            <Separator className="my-4 bg-amber-800" />
            <Button onClick={() => setShowLeaderboard(false)} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold">
              Back to Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {gameStarted && (
        <LabyrinthGame
          key={gameKey}
          playerName={playerName}
          gameStarted={gameStarted}
          startTime={startTime}
          elapsedTime={elapsedTime}
          onGameOver={handleGameOver}
          onGameRestart={handleGameRestart}
          gameResult={gameResult}
          onRevive={handleRevive}
          hasElectrogem={hasElectrogem}
          initialLearnedSpells={learnedSpellsData || []} // Pass initial learned spells from query
          isAnyModalOpen={isAnyModalOpen} // Pass the new prop
        />
      )}
      
      {showUserGuide && <UserGuideModal isOpen={showUserGuide} onClose={() => setShowUserGuide(false)} />}
    </div>
  );
};

export default Index;