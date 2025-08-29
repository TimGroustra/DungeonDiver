"use client";

import React from 'react';
import { Labyrinth } from '@/lib/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Inventory from './Inventory'; // Import Inventory
import GameLog from './GameLog'; // Import GameLog

interface PlayerStatusProps {
  labyrinth: Labyrinth;
  onUseItem: (itemId: string) => void;
  isGameOver: boolean;
  showRPS: boolean;
  gameLog: string[];
  logRef: React.RefObject<HTMLDivElement>;
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({
  labyrinth,
  onUseItem,
  isGameOver,
  showRPS,
  gameLog,
  logRef,
}) => {
  const player = labyrinth.getPlayer();
  const currentFloor = labyrinth.getCurrentFloor();
  const maxHealth = player.getMaxHealth();
  const currentHealth = player.getHealth();
  const healthPercentage = (currentHealth / maxHealth) * 100;

  return (
    <div className="flex flex-col items-center w-full">
      <Card className="w-full max-w-sm bg-gray-700 text-gray-100 dark:bg-gray-200 dark:text-gray-900 border-gray-600 dark:border-gray-400 mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold text-green-300 dark:text-green-700">Adventurer's Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg"><strong>Name:</strong> {player.getName()}</p>
            <p className="text-lg"><strong>Floor:</strong> {currentFloor + 1}</p>
            <div>
              <p className="text-lg mb-1"><strong>Health:</strong> {currentHealth} / {maxHealth}</p>
              <Progress value={healthPercentage} className="w-full h-3 bg-red-900 dark:bg-red-200 [&>*]:bg-red-500 [&>*]:dark:bg-red-600" />
            </div>
            <p className="text-lg"><strong>Attack:</strong> {player.getAttack()}</p>
            <p className="text-lg"><strong>Defense:</strong> {player.getDefense()}</p>
            <p className="text-lg"><strong>Gold:</strong> {player.getGold()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Inventory content */}
      <Inventory
        labyrinth={labyrinth}
        onUseItem={onUseItem}
        isGameOver={isGameOver}
        showRPS={showRPS}
      />

      {/* GameLog content */}
      <GameLog gameLog={gameLog} logRef={logRef} />
    </div>
  );
};

export default PlayerStatus;