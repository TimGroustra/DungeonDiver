"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { usePlayerPosition } from '@/hooks/usePlayerPosition';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { useMapData } from '@/hooks/useMapData';
import { useActiveQuest } from '@/hooks/useActiveQuest';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MapIcon, Swords, ScrollText, DoorOpen, ChevronRight, ChevronLeft, Skull } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FullMapModal from '@/components/FullMapModal';
import { GameLog } from '@/components/GameLog';
import { InventoryDisplay } from '@/components/InventoryDisplay';
import { GameEndModal } from '@/components/GameEndModal';
import { GameStartModal } from '@/components/GameStartModal';
import { getEmojiForElement } from '@/utils/game-assets';
import { useBossFight } from '@/hooks/useBossFight';
import { useGameTimer } from '@/hooks/useGameTimer';
import { formatTime } from '@/utils/time-formatter';

const LabyrinthGame: React.FC = () => {
  const {
    labyrinth,
    player,
    currentFloor,
    gameLog,
    gameStarted,
    gameEnded,
    gameWon,
    deaths,
    startGame,
    movePlayer,
    searchCurrentTile,
    interactWithElement,
    changeFloor,
    resetGame,
    setGameWon,
    setGameEnded,
    setDeaths,
    gameVersion,
  } = useGameStore();
  const { playerPosition, updatePlayerPosition } = usePlayerPosition();
  const { activeQuestObjectives } = useActiveQuest();
  const { floorPath, wallPath, mapBounds } = useMapData();
  const { toast } = useToast();
  const { bossState, bossFightActive, startBossFight, handleBossMove, bossHealth, playerHealth, attackBoss, takeBossDamage } = useBossFight();
  const { time, startTimer, stopTimer, resetTimer, isRunning: isTimerRunning } = useGameTimer();

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isGameStartModalOpen, setIsGameStartModalOpen] = useState(true);
  const [isGameEndModalOpen, setIsGameEndModalOpen] = useState(false);

  const currentObjective = labyrinth?.getCurrentFloorObjective();
  const currentFloorExit = labyrinth?.floorExitStaircases.get(currentFloor);
  const isBossDefeated = labyrinth?.isBossDefeated();

  const handlePlayerMove = useCallback((dx: number, dy: number) => {
    if (!labyrinth || !player || gameEnded) return;

    const newX = player.x + dx;
    const newY = player.y + dy;

    if (labyrinth.isWalkable(newX, newY, currentFloor)) {
      movePlayer(newX, newY);
      updatePlayerPosition({ x: newX, y: newY, floor: currentFloor });

      // Check for boss fight trigger
      if (currentFloor === labyrinth.NUM_FLOORS - 1 && labyrinth.bossRoomCoords.some(c => c.x === newX && c.y === newY)) {
        if (!isBossDefeated && !bossFightActive) {
          startBossFight();
          toast({
            title: "Boss Fight Initiated!",
            description: "Prepare for battle!",
            variant: "destructive",
          });
        }
      }
    } else {
      toast({
        title: "Movement Blocked",
        description: "You cannot move through walls.",
        variant: "destructive",
      });
    }
  }, [labyrinth, player, currentFloor, gameEnded, movePlayer, updatePlayerPosition, isBossDefeated, bossFightActive, startBossFight, toast]);

  useKeyboardControls(handlePlayerMove);

  useEffect(() => {
    if (gameStarted && !gameEnded && !isTimerRunning) {
      startTimer();
    }
    if (gameEnded && isTimerRunning) {
      stopTimer();
    }
  }, [gameStarted, gameEnded, isTimerRunning, startTimer, stopTimer]);

  useEffect(() => {
    if (gameStarted && !gameEnded && labyrinth && player) {
      const currentTile = labyrinth.getTile(player.x, player.y, currentFloor);
      if (currentTile?.type === 'exit' && currentObjective?.isCompleted()) {
        if (currentFloor < labyrinth.NUM_FLOORS - 1) {
          toast({
            title: "Stairs Found!",
            description: "You found the stairs to the next floor. Use the 'Change Floor' button.",
            variant: "success",
          });
        } else if (currentFloor === labyrinth.NUM_FLOORS - 1 && isBossDefeated) {
          setGameWon(true);
          setGameEnded(true);
          toast({
            title: "Victory!",
            description: `You have escaped the Labyrinth in ${formatTime(time)}!`,
            variant: "success",
          });
        }
      }
    }
  }, [player, currentFloor, labyrinth, currentObjective, gameStarted, gameEnded, isBossDefeated, setGameWon, setGameEnded, toast, time]);

  useEffect(() => {
    if (bossFightActive && !gameEnded) {
      const bossMoveInterval = setInterval(() => {
        handleBossMove();
      }, 1000); // Boss moves every second
      return () => clearInterval(bossMoveInterval);
    }
  }, [bossFightActive, handleBossMove, gameEnded]);

  useEffect(() => {
    if (playerHealth <= 0 && !gameEnded) {
      setDeaths(deaths + 1);
      setGameEnded(true);
      toast({
        title: "Defeat!",
        description: "You were defeated in battle. Game Over.",
        variant: "destructive",
      });
    }
  }, [playerHealth, gameEnded, setDeaths, deaths, setGameEnded, toast]);

  const handleSearch = () => {
    if (!labyrinth || !player || gameEnded) return;
    const revealed = searchCurrentTile();
    if (revealed.length > 0) {
      toast({
        title: "Found Something!",
        description: `You found: ${revealed.map(e => e.name).join(', ')}`,
        variant: "success",
      });
    } else {
      toast({
        title: "Nothing Found",
        description: "You searched the area but found nothing new.",
        variant: "info",
      });
    }
  };

  const handleInteract = () => {
    if (!labyrinth || !player || gameEnded) return;
    const interactionResult = interactWithElement();
    if (interactionResult) {
      toast({
        title: "Interaction",
        description: interactionResult,
        variant: "default",
      });
    } else {
      toast({
        title: "No Interaction",
        description: "There's nothing to interact with here.",
        variant: "info",
      });
    }
  };

  const handleFloorChange = (direction: 'up' | 'down') => {
    if (!labyrinth || !player || gameEnded) return;

    const targetFloor = direction === 'up' ? currentFloor + 1 : currentFloor - 1;
    const currentTile = labyrinth.getTile(player.x, player.y, currentFloor);

    if (currentTile?.type === 'exit' && currentObjective?.isCompleted() && direction === 'up') {
      if (targetFloor < labyrinth.NUM_FLOORS) {
        changeFloor(targetFloor);
        updatePlayerPosition({ x: player.x, y: player.y, floor: targetFloor });
        toast({
          title: "Floor Changed",
          description: `You are now on Floor ${targetFloor + 1}.`,
          variant: "success",
        });
      } else {
        toast({
          title: "No More Floors",
          description: "You are on the last floor.",
          variant: "info",
        });
      }
    } else if (currentTile?.type === 'entrance' && direction === 'down') {
      if (targetFloor >= 0) {
        changeFloor(targetFloor);
        updatePlayerPosition({ x: player.x, y: player.y, floor: targetFloor });
        toast({
          title: "Floor Changed",
          description: `You are now on Floor ${targetFloor + 1}.`,
          variant: "success",
        });
      } else {
        toast({
          title: "No More Floors",
          description: "You are on the first floor.",
          variant: "info",
        });
      }
    } else {
      toast({
        title: "Cannot Change Floor",
        description: "You must be on a staircase and complete the current floor's objective to go up.",
        variant: "destructive",
      });
    }
  };

  const handleRestartGame = () => {
    resetGame();
    resetTimer();
    setIsGameEndModalOpen(false);
    setIsGameStartModalOpen(true); // Re-open start modal for new game
  };

  if (!labyrinth || !player) {
    return <div>Loading Labyrinth...</div>;
  }

  const { minX, minY, maxX, maxY } = mapBounds || { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  const mapWidth = maxX - minX;
  const mapHeight = maxY - minY;

  const currentTile = labyrinth.getTile(player.x, player.y, currentFloor);
  const revealedStaticItems = labyrinth.getRevealedStaticItems();
  const revealedItems = labyrinth.getRevealedItems();
  const revealedPuzzles = labyrinth.getRevealedPuzzles();

  const visibleElements: { x: number; y: number; emoji: string; name: string }[] = [];

  // Add player
  visibleElements.push({ x: player.x, y: player.y, emoji: "👤", name: "Player" });

  // Add revealed static items on current tile
  Array.from(revealedStaticItems).forEach(coordStr => {
    const [x, y, f] = coordStr.split(',').map(Number);
    if (x === player.x && y === player.y && f === currentFloor) {
      const staticItemId = labyrinth.staticItemLocations.get(coordStr);
      if (staticItemId) {
        const staticItem = labyrinth.getItem(staticItemId);
        if (staticItem) {
          visibleElements.push({ x, y, emoji: getEmojiForElement(staticItem.name), name: staticItem.name });
        }
      }
    }
  });

  // Add revealed items on current tile
  Array.from(revealedItems).forEach(coordStr => {
    const [x, y, f] = coordStr.split(',').map(Number);
    if (x === player.x && y === player.y && f === currentFloor) {
      const itemId = labyrinth.itemLocations.get(coordStr);
      if (itemId) {
        const item = labyrinth.getItem(itemId);
        if (item && !labyrinth.getInventoryItems().some(entry => entry.item.id === itemId)) { // Only show if not in inventory
          visibleElements.push({ x, y, emoji: getEmojiForElement(item.name), name: item.name });
        }
      }
    }
  });

  // Add revealed puzzles on current tile
  Array.from(revealedPuzzles).forEach(coordStr => {
    const [x, y, f] = coordStr.split(',').map(Number);
    if (x === player.x && y === player.y && f === currentFloor) {
      const puzzleId = labyrinth.puzzleLocations.get(coordStr);
      if (puzzleId) {
        const puzzle = labyrinth.getPuzzle(puzzleId);
        if (puzzle && !puzzle.solved) { // Only show if not solved
          visibleElements.push({ x, y, emoji: getEmojiForElement(puzzle.name), name: puzzle.name });
        }
      }
    }
  });

  // Add staircase if on current tile
  if (currentFloorExit && currentFloorExit.x === player.x && currentFloorExit.y === player.y && currentFloorExit.floor === currentFloor) {
    const staircaseItem = labyrinth.getItem(`staircase-f${currentFloor}-to-f${currentFloor + 1}`);
    if (staircaseItem) {
      visibleElements.push({ x: player.x, y: player.y, emoji: getEmojiForElement(staircaseItem.name), name: staircaseItem.name });
    }
  }

  // Boss fight specific rendering
  const bossPassageCoords = labyrinth.bossPassageCoords;
  const isBossRoom = currentFloor === labyrinth.NUM_FLOORS - 1 && labyrinth.bossRoomCoords.some(c => c.x === player.x && c.y === player.y);
  const isRedLight = bossState === 'red_light';
  const isSafeTile = labyrinth.bossSafeTiles.has(`${player.x},${player.y},${currentFloor}`);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-900 text-gray-100 font-mono">
      <GameStartModal isOpen={isGameStartModalOpen} onClose={() => setIsGameStartModalOpen(false)} onStartGame={startGame} />
      <GameEndModal isOpen={isGameEndModalOpen} onClose={() => setIsGameEndModalOpen(false)} onRestartGame={handleRestartGame} gameWon={gameWon} time={time} deaths={deaths} />
      <FullMapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />

      {/* Left Panel: Map and Controls */}
      <div className="flex-none w-full lg:w-2/3 p-4 flex flex-col">
        <h1 className="text-3xl font-bold mb-4 text-center text-purple-300">The Labyrinth</h1>

        {/* Game Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-center">
          <div className="bg-gray-800 p-3 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Floor</p>
            <p className="text-lg font-semibold text-blue-300">{currentFloor + 1}</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Time</p>
            <p className="text-lg font-semibold text-yellow-300">{formatTime(time)}</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Deaths</p>
            <p className="text-lg font-semibold text-red-300">{deaths}</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-lg shadow-md">
            <p className="text-sm text-gray-400">Version</p>
            <p className="text-lg font-semibold text-green-300">{gameVersion}</p>
          </div>
        </div>

        {/* Map Display */}
        <div className="relative flex-grow bg-[#2a212b] rounded-lg shadow-lg overflow-hidden mb-4">
          <svg
            className="w-full h-full"
            viewBox={`${player.x - 5} ${player.y - 5} 11 11`} // Centered on player, 11x11 view
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Define patterns for floor and wall */}
            <defs>
              <pattern id="floor-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect x="0" y="0" width="1" height="1" fill="#3a2d3c" />
              </pattern>
              <pattern id="wall-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
                <rect x="0" y="0" width="1" height="1" fill="#4a3d4c" />
              </pattern>
            </defs>

            <path d={floorPath} className="fill-[url(#floor-pattern)]" />
            <path d={wallPath} className="fill-[url(#wall-pattern)] stroke-[#4a3d4c]" strokeWidth={0.02} />

            {/* Render Boss Passage Overlay */}
            {currentFloor === labyrinth.NUM_FLOORS - 1 && !isBossDefeated && Array.from(bossPassageCoords).map((coordStr) => {
              const [x, y, f] = coordStr.split(',').map(Number);
              if (f !== currentFloor) return null;

              const fill = isRedLight ? 'rgba(255, 0, 0, 0.3)' : 'transparent';
              const className = isRedLight && !isSafeTile ? 'animate-pulse-fast' : '';

              return (
                <rect
                  key={`boss-passage-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill={fill}
                  className={className}
                />
              );
            })}

            {/* Render visible elements (player, items, puzzles) */}
            {visibleElements.map((element, index) => (
              <text
                key={index}
                x={element.x + 0.5}
                y={element.y + 0.5}
                fontSize="0.8"
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white stroke-black"
                title={element.name}
              >
                {element.emoji}
              </text>
            ))}
          </svg>
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setIsMapModalOpen(true)}
          >
            <MapIcon className="h-4 w-4" />
            <span className="sr-only">Open Full Map</span>
          </Button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button onClick={() => handlePlayerMove(0, -1)} disabled={gameEnded}>Up</Button>
          <Button onClick={handleSearch} disabled={gameEnded}>Search</Button>
          <Button onClick={() => handlePlayerMove(0, 1)} disabled={gameEnded}>Down</Button>
          <Button onClick={() => handlePlayerMove(-1, 0)} disabled={gameEnded}>Left</Button>
          <Button onClick={handleInteract} disabled={gameEnded}>Interact</Button>
          <Button onClick={() => handlePlayerMove(1, 0)} disabled={gameEnded}>Right</Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleFloorChange('down')}
            disabled={gameEnded || currentFloor === 0}
            className="flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Previous Floor
          </Button>
          <Button
            onClick={() => handleFloorChange('up')}
            disabled={gameEnded || currentFloor === labyrinth.NUM_FLOORS - 1 || !currentObjective?.isCompleted()}
            className="flex items-center justify-center"
          >
            Next Floor <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Right Panel: Quest, Inventory, Log */}
      <div className="flex-none w-full lg:w-1/3 p-4 flex flex-col bg-gray-800 border-l border-gray-700">
        {/* Quest Objectives */}
        <div className="bg-gray-900 p-4 rounded-lg shadow-md mb-4 flex-none">
          <h2 className="text-xl font-bold mb-3 text-purple-200 flex items-center">
            <ScrollText className="h-5 w-5 mr-2" /> Current Quest
          </h2>
          {currentObjective ? (
            <div>
              <p className="text-lg font-semibold text-blue-300 mb-2">{currentObjective.title}</p>
              <p className="text-gray-300 mb-3">{currentObjective.description}</p>
              <h3 className="text-md font-semibold text-gray-400 mb-2">Objectives:</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {currentObjective.itemsToCollect.map(item => (
                  <li key={item.id} className={cn(item.collected ? "line-through text-green-400" : "text-red-400")}>
                    {item.name} {item.collected ? " (Collected)" : " (Missing)"}
                  </li>
                ))}
                {currentObjective.puzzlesToSolve.map(puzzle => (
                  <li key={puzzle.id} className={cn(puzzle.solved ? "line-through text-green-400" : "text-red-400")}>
                    {puzzle.name} {puzzle.solved ? " (Solved)" : " (Unsolved)"}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-400">No active quest.</p>
          )}
        </div>

        {/* Boss Fight UI */}
        {bossFightActive && (
          <div className="bg-red-900 p-4 rounded-lg shadow-md mb-4 flex-none border border-red-700">
            <h2 className="text-xl font-bold mb-3 text-red-200 flex items-center">
              <Swords className="h-5 w-5 mr-2" /> Boss Fight!
            </h2>
            <div className="mb-2">
              <p className="text-sm text-red-300">Boss Health:</p>
              <Progress value={(bossHealth / 100) * 100} className="w-full bg-red-700 [&>*]:bg-red-400" />
            </div>
            <div className="mb-4">
              <p className="text-sm text-blue-300">Your Health:</p>
              <Progress value={(playerHealth / 100) * 100} className="w-full bg-blue-700 [&>*]:bg-blue-400" />
            </div>
            <Button onClick={attackBoss} className="w-full bg-red-600 hover:bg-red-700" disabled={gameEnded}>
              Attack Boss!
            </Button>
          </div>
        )}

        {/* Inventory */}
        <InventoryDisplay />

        <Separator className="my-4 bg-gray-700" />

        {/* Game Log */}
        <GameLog />
      </div>
    </div>
  );
};

export default LabyrinthGame;