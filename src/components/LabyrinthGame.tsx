"use client";

import React, { useState, useEffect, useRef } from "react";
import { Labyrinth, LogicalRoom, Enemy } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import MapView from "./game/MapView";
import PlayerControls from "./game/PlayerControls";
import PlayerStatus from "./game/PlayerStatus";
import Inventory from "./game/Inventory";
import GameLog from "./game/GameLog";
import Objective from "./game/Objective";

interface LabyrinthGameProps {
  playerName: string;
  gameStarted: boolean;
  elapsedTime: number;
  onGameOver: (result: { type: 'victory' | 'defeat', name: string, time: number }) => void;
  onGameRestart: () => void;
}

const ENEMY_MOVE_SPEEDS_MS = [2000, 1500, 1000, 500];

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, elapsedTime, onGameOver, onGameRestart }) => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0);
  const [currentLogicalRoom, setCurrentLogicalRoom] = useState<LogicalRoom | undefined>(labyrinth.getCurrentLogicalRoom());
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [showRPS, setShowRPS] = useState<boolean>(false);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | undefined>(undefined);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const dynamicViewportSize = 10;
  const cellSize = 20;

  useEffect(() => {
    if (gameStarted) {
      setLabyrinth(new Labyrinth());
      setGameVersion(0);
      setGameLog(["Game started!"]);
      setShowRPS(false);
      setCurrentEnemy(undefined);
      setHasGameOverBeenDispatched(false);
    }
  }, [gameStarted]);

  useEffect(() => {
    updateGameDisplay();
    if (labyrinth.isGameOver() && !hasGameOverBeenDispatched) {
      const result = labyrinth.getGameResult();
      if (result) {
        onGameOver(result);
        setHasGameOverBeenDispatched(true);
      }
    }
  }, [gameVersion, labyrinth, onGameOver, hasGameOverBeenDispatched]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameStarted || labyrinth.isGameOver()) {
        return;
      }

      if (showRPS) {
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault();
            handleRPSChoice("left");
            break;
          case "ArrowUp":
            event.preventDefault();
            handleRPSChoice("center");
            break;
          case "ArrowRight":
            event.preventDefault();
            handleRPSChoice("right");
            break;
          default:
            break;
        }
      } else {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            handleMove("north");
            break;
          case "ArrowDown":
            event.preventDefault();
            handleMove("south");
            break;
          case "ArrowLeft":
            event.preventDefault();
            handleMove("west");
            break;
          case "ArrowRight":
            event.preventDefault();
            handleMove("east");
            break;
          case "Shift":
            event.preventDefault();
            handleSearch();
            break;
          case "Control":
            event.preventDefault();
            handleInteract();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStarted, labyrinth, showRPS, playerName, elapsedTime]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;
    const isObjectiveCompleted = labyrinth.getCurrentFloorObjective().isCompleted();
    const isGameOver = labyrinth.isGameOver();
    const currentFloor = labyrinth.getCurrentFloor();
    const moveSpeed = ENEMY_MOVE_SPEEDS_MS[currentFloor] || 2000;

    if (!isGameOver) {
        intervalId = setInterval(() => {
            if (isObjectiveCompleted) {
                labyrinth.processEnemyMovement();
            }
            if (currentFloor === labyrinth["NUM_FLOORS"] - 1 && !labyrinth.isBossDefeated()) {
                labyrinth.processBossLogic();
            }
            setGameVersion(prev => prev + 1);
        }, moveSpeed);
    }

    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [labyrinth, gameVersion, labyrinth.getCurrentFloor(), labyrinth.getCurrentFloorObjective().isCompleted(), labyrinth.isBossDefeated()]);

  const updateGameDisplay = () => {
    setCurrentLogicalRoom(labyrinth.getCurrentLogicalRoom());
    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      setGameLog((prevLog) => [...prevLog, ...newMessages]);
      labyrinth.clearMessages();
    }

    const playerLoc = labyrinth.getPlayerLocation();
    const enemyIdAtLocation = labyrinth["enemyLocations"].get(`${playerLoc.x},${playerLoc.y},${labyrinth.getCurrentFloor()}`);
    const combatQueue = labyrinth.getCombatQueue();

    if (combatQueue.length > 0) {
      const nextEnemyId = combatQueue[0];
      const enemyInQueue = labyrinth.getEnemy(nextEnemyId);
      if (enemyInQueue && !enemyInQueue.defeated) {
        setCurrentEnemy(enemyInQueue);
        setShowRPS(true);
      } else {
        if (enemyInQueue?.defeated) {
            labyrinth.getCombatQueue().shift();
        }
        setGameVersion(prev => prev + 1);
      }
    } else if (enemyIdAtLocation && enemyIdAtLocation !== labyrinth["watcherOfTheCore"]?.id) {
      const enemy = labyrinth.getEnemy(enemyIdAtLocation);
      if (enemy && !enemy.defeated) {
        setCurrentEnemy(enemy);
        setShowRPS(true);
      } else {
        setShowRPS(false);
        setCurrentEnemy(undefined);
      }
    } else {
      setShowRPS(false);
      setCurrentEnemy(undefined);
    }
  };

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot move right now.");
      return;
    }
    labyrinth.move(direction, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleSearch = () => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot search right now.");
      return;
    }
    labyrinth.search();
    setGameVersion(prev => prev + 1);
  };

  const handleInteract = () => {
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot interact right now.");
      return;
    }
    labyrinth.interact(playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleRPSChoice = (choice: "left" | "center" | "right") => {
    if (!currentEnemy) return;
    labyrinth.fight(choice, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleUseItem = (itemId: string) => {
    labyrinth.useItem(itemId, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  if (!gameStarted) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 dark:bg-gray-50 p-1 sm:p-2">
      <Card className="w-full max-w-5xl shadow-2xl bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300">
        <CardHeader className="border-b border-gray-700 dark:border-gray-300 pb-2 sm:pb-3">
          <CardTitle className="text-2xl sm:text-3xl font-extrabold text-center text-yellow-400 dark:text-yellow-600 drop-shadow-lg">The Labyrinth of Whispers</CardTitle>
          <CardDescription className="text-sm sm:text-base italic text-center text-gray-300 dark:text-gray-700">A perilous journey into the unknown...</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Changed to md:grid-cols-2 */}
            {/* Left Column: Map & Controls */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-bold mb-2 text-orange-300 dark:text-orange-600">Ancient Map</h3>
              <MapView labyrinth={labyrinth} cellSize={cellSize} dynamicViewportSize={dynamicViewportSize} />
              <PlayerControls
                isGameOver={labyrinth.isGameOver()}
                showRPS={showRPS}
                currentEnemy={currentEnemy}
                onMove={handleMove}
                onSearch={handleSearch}
                onInteract={handleInteract}
                onRPSChoice={handleRPSChoice}
              />
            </div>

            {/* Right Column: Stats, Health, Inventory */}
            <div className="flex flex-col items-center">
              <PlayerStatus labyrinth={labyrinth} cellSize={cellSize} dynamicViewportSize={dynamicViewportSize} />
              <Inventory
                labyrinth={labyrinth}
                onUseItem={handleUseItem}
                isGameOver={labyrinth.isGameOver()}
                showRPS={showRPS}
              />
            </div>
          </div>

          <Separator className="my-4 w-full bg-gray-700 dark:bg-gray-300" />

          {/* Bottom Section: Log, Description, Objective */}
          <div className="w-full text-center">
            <h2 className="text-2xl font-bold mb-1 text-cyan-300 dark:text-cyan-600">{currentLogicalRoom?.name || "The Void Beyond"}</h2>
            <p className="text-base text-gray-300 dark:text-gray-700 italic">{currentLogicalRoom?.description || "You are lost in an unknown part of the labyrinth, where shadows dance and whispers echo."}</p>
          </div>

          <Separator className="my-4 w-full bg-gray-700 dark:bg-gray-300" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GameLog gameLog={gameLog} logRef={logRef} />
            <Objective labyrinth={labyrinth} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col justify-center items-center border-t border-gray-700 dark:border-gray-300 pt-2 sm:pt-3">
          {labyrinth.isGameOver() && (
            <Button onClick={onGameRestart} className="mt-3 bg-amber-500 hover:bg-amber-600 text-white text-base px-4 py-2">
              Restart Journey
            </Button>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center">
            Please consider supporting this project. Donations can be received at this ETN wallet address: <span className="font-mono text-gray-300 dark:text-gray-700 break-all">0x3Ab5cBFfa0C2A3f15641DCA0fbEEBa1EFb166EE8</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabyrinthGame;