import React, { useState, useEffect } from "react";
import LabyrinthGame from "@/components/LabyrinthGame";
import StartGameModal from "@/components/StartGameModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import LeaderboardPage from "@/components/LeaderboardPage";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardEntry {
  name: string;
  time: number;
}

const Index = () => {
  const [showStartModal, setShowStartModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlightPlayer, setHighlightPlayer] = useState<string | null>(null);

  // Load leaderboard from Supabase on mount
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("player_name, score_time")
        .order("score_time", { ascending: true })
        .limit(10); // Fetch top 10 scores

      if (error) {
        console.error("Error fetching leaderboard:", error);
        toast.error("Failed to load leaderboard.");
      } else {
        setLeaderboard(data.map(entry => ({ name: entry.player_name, time: entry.score_time })));
      }
    };

    fetchLeaderboard();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameStarted && startTime !== null) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else if (!gameStarted && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, startTime]);

  const handleStartGame = (name: string) => {
    setPlayerName(name);
    setGameStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setShowStartModal(false);
    setShowLeaderboardModal(false);
    setHighlightPlayer(null);
    toast.success(`Welcome, ${name}! Your journey begins.`);
  };

  const handleGameOver = async (result: { type: 'victory' | 'defeat', name: string, time: number }) => {
    setGameStarted(false);
    setStartTime(null); // Stop the timer

    if (result.type === 'victory') {
      toast.success(`Congratulations, ${result.name}! You escaped the Labyrinth in ${result.time.toFixed(2)} seconds!`);
      
      // Save score to Supabase
      const { error } = await supabase
        .from("leaderboard")
        .insert({ player_name: result.name, score_time: result.time });

      if (error) {
        console.error("Error saving score:", error);
        toast.error("Failed to save your score to the leaderboard.");
      } else {
        toast.success("Your score has been recorded!");
        // Re-fetch leaderboard to include new score
        const { data, error: fetchError } = await supabase
          .from("leaderboard")
          .select("player_name, score_time")
          .order("score_time", { ascending: true })
          .limit(10);

        if (fetchError) {
          console.error("Error re-fetching leaderboard:", fetchError);
        } else {
          setLeaderboard(data.map(entry => ({ name: entry.player_name, time: entry.score_time })));
        }
      }

      setHighlightPlayer(result.name);
      setShowLeaderboardModal(true);
    } else {
      toast.error(`Alas, ${result.name}, the Labyrinth claims another victim. Game Over.`);
      setShowLeaderboardModal(false); // Don't show leaderboard on defeat by default
    }
  };

  const handleRestartGame = () => {
    setShowLeaderboardModal(false);
    setGameStarted(false);
    setPlayerName("");
    setStartTime(null);
    setElapsedTime(0);
    setHighlightPlayer(null);
  };

  const handlePlayClick = () => {
    setShowStartModal(true);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (gameStarted) {
    return (
      <>
        <div className="absolute top-4 right-4 bg-gray-700 text-white px-3 py-1 rounded-md text-sm font-mono z-10">
          Time: {formatTime(elapsedTime)}
        </div>
        <LabyrinthGame
          playerName={playerName}
          gameStarted={gameStarted}
          elapsedTime={elapsedTime}
          onGameOver={handleGameOver}
          onGameRestart={handleRestartGame}
        />
      </>
    );
  }

  return (
    <>
      <StartGameModal isOpen={showStartModal} onStartGame={handleStartGame} onClose={() => setShowStartModal(false)} />
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={handleRestartGame}
        leaderboard={leaderboard}
        highlightName={highlightPlayer}
      />
      <LeaderboardPage leaderboard={leaderboard} onPlay={handlePlayClick} />
    </>
  );
};

export default Index;