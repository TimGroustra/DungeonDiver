import React, { useState, useEffect, useCallback } from 'react';
import { Labyrinth } from '../lib/game';
import Controls from './Controls';
import { Button } from './ui/button';

const TILE_SIZE = 24; // size of each tile in pixels

const LabyrinthGame = () => {
  const [labyrinth, setLabyrinth] = useState(new Labyrinth(15, 15));
  const [playerHealth, setPlayerHealth] = useState(100);
  const [inventory, setInventory] = useState({ keys: 0, treasures: 0 });
  const [eventLog, setEventLog] = useState<{message: string, type: 'success' | 'error' | 'info'}[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const resetGame = useCallback(() => {
    const newLabyrinth = new Labyrinth(15, 15);
    setLabyrinth(newLabyrinth);
    setPlayerHealth(100);
    setInventory({ keys: 0, treasures: 0 });
    setEventLog([{ message: 'A new adventure begins!', type: 'info' }]);
    setGameOver(false);
    setGameWon(false);
  }, []);

  const logEvent = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setEventLog(prevLog => [{ message, type }, ...prevLog].slice(0, 100));
  };

  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameOver) return;

    const result = labyrinth.movePlayer(dx, dy);
    if (result.moved) {
      const playerPos = labyrinth.getPlayerLocation();
      logEvent(`You move to (${playerPos.x}, ${playerPos.y}).`);
      
      // Handle tile events
      const tile = labyrinth.getTile(playerPos.x, playerPos.y);
      if (tile.content === 'T') {
        setInventory(prev => ({ ...prev, treasures: prev.treasures + 1 }));
        logEvent('You found a treasure!', 'success');
        labyrinth.clearTile(playerPos.x, playerPos.y);
      } else if (tile.content === 'K') {
        setInventory(prev => ({ ...prev, keys: prev.keys + 1 }));
        logEvent('You found a key!', 'success');
        labyrinth.clearTile(playerPos.x, playerPos.y);
      } else if (tile.content === 'P') {
        const damage = Math.floor(Math.random() * 10) + 5;
        setPlayerHealth(prev => {
          const newHealth = Math.max(0, prev - damage);
          if (newHealth === 0) {
            setGameOver(true);
            setGameWon(false);
            logEvent('You have fallen in the labyrinth!', 'error');
          }
          return newHealth;
        });
        logEvent(`You stepped on a trap and lost ${damage} health!`, 'error');
      } else if (tile.content === 'E') {
        if (inventory.treasures > 0) {
            setGameOver(true);
            setGameWon(true);
            logEvent('Congratulations! You escaped with treasure!', 'success');
        } else {
            logEvent('You need to find at least one treasure to escape!', 'error');
        }
      }

    } else {
      logEvent("You can't move there, a wall is in the way.", 'error');
    }
  }, [labyrinth, gameOver, inventory.treasures]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      switch (e.key) {
        case 'w':
        case 'ArrowUp':
          movePlayer(0, -1);
          break;
        case 's':
        case 'ArrowDown':
          movePlayer(0, 1);
          break;
        case 'a':
        case 'ArrowLeft':
          movePlayer(-1, 0);
          break;
        case 'd':
        case 'ArrowRight':
          movePlayer(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [movePlayer]);

  const renderMap = () => {
    const { x: playerX, y: playerY } = labyrinth.getPlayerLocation();
    const map = labyrinth.getMap();
    const mapSize = map.length * TILE_SIZE;

    return (
      <div className="bg-gray-900 p-2 rounded-lg border-2 border-orange-500/50">
        <svg width={mapSize} height={mapSize} viewBox={`0 0 ${mapSize} ${mapSize}`}>
          <defs>
            <pattern id="wallPattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#4a5568" strokeWidth="1" />
            </pattern>
          </defs>
          {map.map((row, y) =>
            row.map((tile, x) => {
              const key = `${x}-${y}`;
              let content = null;
              if (tile.isWall) {
                content = <rect key={key} x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill="url(#wallPattern)" />;
              } else {
                content = <rect key={key} x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill="#1a202c" />;
              }
              
              let item = null;
              if (tile.content === 'S') item = <text key={`${key}-s`} x={x * TILE_SIZE + TILE_SIZE / 2} y={y * TILE_SIZE + TILE_SIZE / 2} dominantBaseline="middle" textAnchor="middle" fontSize="12" fill="cyan">S</text>;
              if (tile.content === 'E') item = <text key={`${key}-e`} x={x * TILE_SIZE + TILE_SIZE / 2} y={y * TILE_SIZE + TILE_SIZE / 2} dominantBaseline="middle" textAnchor="middle" fontSize="12" fill="lime">E</text>;
              if (tile.content === 'T') item = <text key={`${key}-t`} x={x * TILE_SIZE + TILE_SIZE / 2} y={y * TILE_SIZE + TILE_SIZE / 2} dominantBaseline="middle" textAnchor="middle" fontSize="16" fill="gold">💎</text>;
              if (tile.content === 'K') item = <text key={`${key}-k`} x={x * TILE_SIZE + TILE_SIZE / 2} y={y * TILE_SIZE + TILE_SIZE / 2} dominantBaseline="middle" textAnchor="middle" fontSize="16" fill="silver">🔑</text>;
              if (tile.content === 'P') item = <text key={`${key}-p`} x={x * TILE_SIZE + TILE_SIZE / 2} y={y * TILE_SIZE + TILE_SIZE / 2} dominantBaseline="middle" textAnchor="middle" fontSize="16" fill="red">🔥</text>;

              return <g key={`g-${key}`}>{content}{item}</g>;
            })
          )}
          <circle cx={playerX * TILE_SIZE + TILE_SIZE / 2} cy={playerY * TILE_SIZE + TILE_SIZE / 2} r={TILE_SIZE / 3} fill="blue" stroke="lightblue" strokeWidth="2" />
        </svg>
      </div>
    );
  };

  return (
    <div className="p-4 bg-gray-800 dark:bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4 text-orange-400 dark:text-orange-500">Labyrinth of Shadows</h1>
        {gameOver && (
          <div className="text-center p-8 bg-gray-700 rounded-lg">
            <h2 className="text-4xl font-bold mb-4">{gameWon ? "You Escaped!" : "Game Over"}</h2>
            <p className="text-xl mb-6">{gameWon ? "Your bravery will be sung for ages." : "The labyrinth claims another soul."}</p>
            <Button onClick={resetGame} className="bg-orange-500 hover:bg-orange-600">
              Play Again
            </Button>
          </div>
        )}
        {!gameOver && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center relative md:col-span-2">
              <h3 className="text-lg font-bold mb-2 text-orange-300 dark:text-orange-600">Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})</h3>
              {renderMap()}
              <div className="w-full sm:max-w-64 mt-3 flex flex-col justify-center items-center min-h-[12rem]">
                <Controls onMove={movePlayer} />
                <p className="mt-4 text-sm text-gray-400">Use WASD or arrow keys to move.</p>
              </div>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-700 dark:bg-gray-800 rounded-lg md:col-span-1">
              <h2 className="text-2xl font-bold mb-4 text-orange-300 dark:text-orange-600">Status</h2>
              <div className="text-lg space-y-2 text-left">
                <p><strong>Health:</strong> {playerHealth} / 100</p>
                <p><strong>Keys:</strong> {inventory.keys}</p>
                <p><strong>Treasures:</strong> {inventory.treasures}</p>
              </div>
              <div className="mt-4 w-full">
                <h3 className="text-xl font-semibold mb-2 text-orange-300 dark:text-orange-600">Event Log</h3>
                <div className="h-64 bg-gray-800 dark:bg-gray-900 rounded p-2 overflow-y-auto text-sm font-mono">
                  {eventLog.map((event, index) => (
                    <p key={index} className={event.type === 'error' ? 'text-red-400' : 'text-green-300'}>{event.message}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabyrinthGame;