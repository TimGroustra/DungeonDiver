"use client";

import React from 'react';
import { cn } from '@/lib/utils';

// Define the props interface
interface LabyrinthGameProps {
  playerName: string;
  gameStarted: boolean;
  startTime: number | null;
  elapsedTime: number;
  onGameOver: (result: any) => void;
  onGameRestart: () => void;
  gameResult: any;
  onRevive: () => void;
}

// Define the component with proper typing
const LabyrinthGame: React.FC<LabyrinthGameProps> = ({
  playerName,
  gameStarted,
  startTime,
  elapsedTime,
  onGameOver,
  onGameRestart,
  gameResult,
  onRevive
}) => {
  // ... (rest of your component implementation)

  return (
    <div className={cn(
      "relative w-full h-full",
      !gameStarted && "hidden"
    )}>
      {/* Your game rendering logic here */}
    </div>
  );
};

// Ensure default export
export default LabyrinthGame;