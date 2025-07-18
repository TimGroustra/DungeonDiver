import React, { useState, useEffect } from "react";
import LabyrinthGame from "@/components/LabyrinthGame";
import StartGameModal from "@/components/StartGameModal";
import LeaderboardModal from "@/components/LeaderboardModal";
import { toast } from "sonner";

interface LeaderboardEntry {
  name: string;
  time: number;
}

const Index = () => {
  const [showStartModal, setShowStartModal] = useState(true);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [highlightPlayer, setHighlightPlayer] = useState<string | null>(null);

  // Load leaderboard from localStorage on mount
  useEffect(() => {
    const storedLeaderboard = localStorage.getItem("labyrinthLeaderboard");
    if (storedLeaderboard) {
      setLeaderboard(JSON.parse(storedLeaderboard));
    }
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

  const handleGameOver = (result: { type: 'victory' | 'defeat', name: string, time: number }) => {
    setGameStarted(false);
    setStartTime(null); // Stop the timer

    if (result.type === 'victory') {
      toast.success(`Congratulations, ${result.name}! You escaped the Labyrinth in ${result.time.toFixed(2)} seconds!`);
      const newLeaderboard = [...leaderboard, { name: result.name, time: result.time }];
      newLeaderboard.sort((a, b) => a.time - b.time); // Sort by fastest time
      setLeaderboard(newLeaderboard);
      localStorage.setItem("labyrinthLeaderboard", JSON.stringify(newLeaderboard));
      setHighlightPlayer(result.name);
      setShowLeaderboardModal(true);
    } else {
      toast.error(`Alas, ${result.name}, the Labyrinth claims another victim. Game Over.`);
      // Optionally show leaderboard on defeat too, or just restart
      setShowLeaderboardModal(false); // Don't show leaderboard on defeat by default
    }
  };

  const handleRestartGame = () => {
    setShowStartModal(true);
    setShowLeaderboardModal(false);
    setGameStarted(false); // This will trigger LabyrinthGame to re-initialize
    setPlayerName("");
    setStartTime(null);
    setElapsedTime(0);
    setHighlightPlayer(null);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <StartGameModal isOpen={showStartModal} onStartGame={handleStartGame} />
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={handleRestartGame} // Close leaderboard and restart game
        leaderboard={leaderboard}
        highlightName={highlightPlayer}
      />

      {gameStarted && (
        <div className="absolute top-4 right-4 bg-gray-700 text-white px-3 py-1 rounded-md text-sm font-mono z-10">
          Time: {formatTime(elapsedTime)}
        </div>
      )}

      <LabyrinthGame
        playerName={playerName}
        gameStarted={gameStarted}
        elapsedTime={elapsedTime}
        onGameOver={handleGameOver}
        onGameRestart={handleRestartGame}
      />
    </>
  );
};

export default Index;