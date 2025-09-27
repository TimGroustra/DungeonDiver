"use client";

import React, { useState, useEffect } from "react";
import LabyrinthGame from "@/components/LabyrinthGame";
import StartGameModal from "@/components/StartGameModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import UserGuideModal from "@/components/UserGuideModal";
import { Button } from "@/components/ui/button";
import { BookOpen, Crown, Info, Wallet } from "lucide-react";
import { WalletConnect } from "@/components/WalletConnect";
import { useWalletStore } from "@/stores/walletStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NftToken } from "@/stores/walletStore"; // Import NftToken type

interface LeaderboardEntry {
  player_name: string;
  score_time: number;
  deaths: number;
}

interface GameResult {
  type: 'victory' | 'defeat';
  name: string;
  time: number;
  causeOfDeath?: string;
  deaths?: number;
}

const Index: React.FC = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isStartModalOpen, setIsStartModalOpen] = useState(true);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [initialLearnedSpells, setInitialLearnedSpells] = useState<string[]>([]);

  const { isConnected, address, tokens, selectedTokenIndex } = useWalletStore();

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("player_name, score_time, deaths")
      .order("score_time", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard.");
    } else {
      setLeaderboard(data || []);
    }
  };

  // Save score to leaderboard
  const saveScore = async (result: GameResult) => {
    if (result.type === 'victory') {
      const { error } = await supabase.from("leaderboard").insert({
        player_name: result.name,
        score_time: result.time,
        deaths: result.deaths || 0,
        wallet_address: isConnected && address ? address : null,
      });

      if (error) {
        console.error("Error saving score:", error);
        toast.error("Failed to save score to leaderboard.");
      } else {
        toast.success("Score saved to leaderboard!");
        fetchLeaderboard(); // Refresh leaderboard after saving
        setHighlightedPlayer(result.name); // Highlight the player's name
      }
    }
  };

  // Fetch player spells
  const fetchPlayerSpells = async (identifier: string, isWallet: boolean) => {
    let query = supabase.from("player_spells").select("spell_id");
    if (isWallet) {
      query = query.eq("wallet_address", identifier);
    } else {
      query = query.eq("player_name", identifier);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching player spells:", error);
      toast.error("Failed to load player spells.");
      return [];
    } else {
      return data.map((entry) => entry.spell_id);
    }
  };

  // Save player spells
  const savePlayerSpells = async (spells: Set<string>) => {
    const identifier = isConnected && address ? address : playerName;
    const isWallet = isConnected && address !== null;

    if (!identifier) {
      console.warn("Cannot save spells: No player name or wallet address.");
      return;
    }

    // First, delete existing spells for this identifier
    let deleteQuery = supabase.from("player_spells").delete();
    if (isWallet) {
      deleteQuery = deleteQuery.eq("wallet_address", identifier);
    } else {
      deleteQuery = deleteQuery.eq("player_name", identifier);
    }
    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      console.error("Error deleting old spells:", deleteError);
      toast.error("Failed to clear old spell data.");
      return;
    }

    // Then, insert new spells
    const spellsToInsert = Array.from(spells).map((spellId) => ({
      spell_id: spellId,
      wallet_address: isWallet ? identifier : null,
      player_name: !isWallet ? identifier : null,
    }));

    if (spellsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("player_spells").insert(spellsToInsert);

      if (insertError) {
        console.error("Error saving new spells:", insertError);
        toast.error("Failed to save new spell data.");
      } else {
        toast.success("Player spells saved!");
      }
    } else {
      toast.info("No spells to save.");
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && startTime !== null && gameResult === null) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!gameStarted || gameResult !== null) {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [gameStarted, startTime, gameResult]);

  // Load spells when wallet connects or player name is set
  useEffect(() => {
    const loadSpells = async () => {
      let spells: string[] = [];
      if (isConnected && address) {
        spells = await fetchPlayerSpells(address, true);
      } else if (playerName) {
        spells = await fetchPlayerSpells(playerName, false);
      }
      setInitialLearnedSpells(spells);
    };

    if ((isConnected && address) || playerName) {
      loadSpells();
    } else {
      setInitialLearnedSpells([]); // Clear spells if no identifier
    }
  }, [isConnected, address, playerName]);

  const handleStartGame = (name: string) => {
    setPlayerName(name);
    setGameStarted(true);
    setStartTime(Date.now());
    setIsStartModalOpen(false);
    setGameResult(null); // Clear previous game result
    setHighlightedPlayer(null); // Clear highlighted player
  };

  const handleGameOver = (result: GameResult, learnedSpells: Set<string>) => {
    setGameStarted(false);
    setGameResult(result);
    saveScore(result); // Save score only for victory
    savePlayerSpells(learnedSpells); // Save learned spells
  };

  const handleGameRestart = () => {
    setGameStarted(false);
    setPlayerName("");
    setStartTime(null);
    setElapsedTime(0);
    setIsStartModalOpen(true);
    setGameResult(null);
    setHighlightedPlayer(null);
    setInitialLearnedSpells([]); // Clear spells on full restart
  };

  const handleRevive = () => {
    setGameResult(null); // Clear game over state
    setGameStarted(true); // Resume game
    setStartTime(Date.now() - elapsedTime * 1000); // Adjust start time to keep elapsed time
  };

  const hasElectrogem = isConnected && tokens.length > 0;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 font-cinzel text-white"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!gameStarted && gameResult === null && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4">
          <h1 className="text-6xl font-extrabold text-amber-400 drop-shadow-lg mb-8 animate-pulse-slow">
            Labyrinth of Eldoria
          </h1>
          <div className="flex flex-col space-y-4 w-full max-w-xs">
            <Button
              onClick={() => setIsStartModalOpen(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 shadow-lg"
            >
              <BookOpen className="mr-2 h-6 w-6" /> Start New Adventure
            </Button>
            <Button
              onClick={() => {
                fetchLeaderboard();
                setIsLeaderboardModalOpen(true);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6 shadow-lg"
            >
              <Crown className="mr-2 h-6 w-6" /> View Leaderboard
            </Button>
            <Button
              onClick={() => setIsUserGuideModalOpen(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-lg py-6 shadow-lg"
            >
              <Info className="mr-2 h-6 w-6" /> How to Play
            </Button>
            <WalletConnect />
          </div>
        </div>
      )}

      {gameStarted && (
        <LabyrinthGame
          playerName={playerName}
          gameStarted={gameStarted}
          startTime={startTime}
          elapsedTime={elapsedTime}
          onGameOver={handleGameOver}
          onGameRestart={handleGameRestart}
          gameResult={gameResult}
          onRevive={handleRevive}
          hasElectrogem={hasElectrogem}
          initialLearnedSpells={initialLearnedSpells}
        />
      )}

      <StartGameModal
        isOpen={isStartModalOpen && !gameStarted && gameResult === null}
        onStartGame={handleStartGame}
        onClose={() => setIsStartModalOpen(false)}
      />

      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
        leaderboard={leaderboard}
        highlightName={highlightedPlayer}
      />

      <UserGuideModal
        isOpen={isUserGuideModalOpen}
        onClose={() => setIsUserGuideModalOpen(false)}
      />
    </div>
  );
};

export default Index;