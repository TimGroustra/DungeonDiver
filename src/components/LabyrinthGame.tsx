"use client";

import React, { useState, useEffect, useRef } from "react";
import { Labyrinth, LogicalRoom, Item, Enemy, Puzzle } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PersonStanding, Sword, Puzzle as PuzzleIcon, Scroll, BookOpen, HelpCircle, Heart, Shield, Dices, ArrowDownCircle, Target, Gem, Compass, Swords, Crown, Sparkles, Eye } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  const isMobile = useIsMobile();
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
    if (labyrinth.isGameOver() || showRPS) {
      toast.info("Cannot use items right now.");
      return;
    }
    labyrinth.useItem(itemId, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const renderMap = () => {
    const mapGrid = labyrinth.getMapGrid();
    const playerLoc = labyrinth.getPlayerLocation();
    const visitedCells = labyrinth.getVisitedCells();
    const revealedStaticItems = labyrinth.getRevealedStaticItems();
    const triggeredTraps = labyrinth.getTriggeredTraps();
    const fullGridWidth = mapGrid[0]?.length || 0;
    const fullGridHeight = mapGrid.length;
    const currentFloor = labyrinth.getCurrentFloor();
    const numFloors = labyrinth["NUM_FLOORS"];

    const halfViewport = Math.floor(dynamicViewportSize / 2);
    const viewportMapStartX = playerLoc.x - halfViewport;
    const viewportMapStartY = playerLoc.y - halfViewport;

    const mapDisplayWidth = dynamicViewportSize * cellSize;
    const mapDisplayHeight = dynamicViewportSize * cellSize;

    const visibleCells = [];
    for (let viewportY = 0; viewportY < dynamicViewportSize; viewportY++) {
      const rowCells = [];
      for (let viewportX = 0; viewportX < dynamicViewportSize; viewportX++) {
        const mapX = viewportMapStartX + viewportX;
        const mapY = viewportMapStartY + viewportY;

        const isPlayerHere = playerLoc.x === mapX && playerLoc.y === mapY;
        let cellContentIndicator: React.ReactNode = "";
        let cellTitle = "";
        let cellClasses = "";

        if (mapX >= 0 && mapX < fullGridWidth && mapY >= 0 && mapY < fullGridHeight) {
          const cellCoord = `${mapX},${mapY}`;
          const fullCoordStr = `${mapX},${mapY},${currentFloor}`;
          const isVisited = visitedCells.has(cellCoord);
          const isWall = mapGrid[mapY][mapX] === 'wall';

          const isAltar = (currentFloor === numFloors - 1) && (labyrinth["staticItemLocations"].get(fullCoordStr) === "ancient-altar-f3");
          const hasTrap = labyrinth["trapsLocations"].has(fullCoordStr);
          const isTrapTriggered = triggeredTraps.has(fullCoordStr);

          const isBossPassage = labyrinth.isBossPassage(mapX, mapY, currentFloor);
          const isRedLight = labyrinth.getBossState() === 'red_light';
          const isBossDefeated = labyrinth.isBossDefeated();
          const isWatcherLocation = (currentFloor === numFloors - 1) && (labyrinth["watcherLocation"]?.x === mapX && labyrinth["watcherLocation"]?.y === mapY);

          if (isPlayerHere) {
            cellContentIndicator = <PersonStanding size={12} />;
            cellClasses = "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700";
            cellTitle = "You are here";
          } else if (isWall) {
            cellContentIndicator = "█";
            cellClasses = "bg-gray-800 dark:bg-gray-950 text-gray-600";
            cellTitle = "Solid Wall";
          } else if (isTrapTriggered) {
              cellContentIndicator = <Dices size={12} />;
              cellClasses = "bg-orange-700 text-orange-200";
              cellTitle = `Explored (${mapX},${mapY}) (Triggered Trap!)`;
          } else if (isVisited) {
            const enemyId = labyrinth["enemyLocations"].get(fullCoordStr);
            const enemy = enemyId ? labyrinth.getEnemy(enemyId) : undefined;
            const hasUndefeatedEnemy = enemy && !enemy.defeated;

            const puzzleId = labyrinth["puzzleLocations"].get(fullCoordStr);
            const puzzle = puzzleId ? labyrinth.getPuzzle(puzzleId) : undefined;
            const hasUnsolvedPuzzle = puzzle && !puzzle.solved;
            const hasSolvedPuzzle = puzzle && puzzle.solved;

            const hasUnpickedItem = labyrinth["itemLocations"].has(fullCoordStr);

            const staticItemId = labyrinth["staticItemLocations"].get(fullCoordStr);
            const hasStaticItemAtLocation = !!staticItemId;
            const isStaticItemCurrentlyRevealed = revealedStaticItems.has(fullCoordStr);

            const staircaseLoc = labyrinth["floorExitStaircases"].get(currentFloor);
            const isStaircase = staircaseLoc && staircaseLoc.x === mapX && staircaseLoc.y === mapY;

            if (isAltar) {
                cellContentIndicator = <Crown size={12} />;
                cellClasses = "bg-purple-600 text-white animate-pulse";
                cellTitle = `Ancient Altar (Final Objective)`;
            } else if (isWatcherLocation && !isBossDefeated) {
                cellContentIndicator = <Eye size={12} />;
                cellClasses = "bg-red-700 text-red-200 animate-pulse";
                cellTitle = `The Watcher of the Core!`;
            } else if (isStaircase) {
                cellContentIndicator = <ArrowDownCircle size={12} />;
                cellClasses = "bg-indigo-600 text-white";
                cellTitle = `Staircase to Floor ${currentFloor + 2}`;
            } else if (hasUndefeatedEnemy) {
                cellContentIndicator = <Swords size={12} />;
                cellClasses = "bg-red-900 text-red-300 animate-pulse";
                cellTitle = `Explored (${mapX},${mapY}) (Enemy Lurks!)`;
            } else if (hasUnsolvedPuzzle) {
                cellContentIndicator = <PuzzleIcon size={12} />;
                cellClasses = "bg-yellow-800 text-yellow-300 animate-pulse";
                cellTitle = `Explored (${mapX},${mapY}) (Ancient Puzzle!)`;
            } else if (hasUnpickedItem) {
                cellContentIndicator = <Gem size={12} />;
                cellClasses = "bg-emerald-800 text-emerald-300 animate-pulse";
                cellTitle = `Explored (${mapX},${mapY}) (Glimmering Item!)`;
            } else if (hasTrap) {
                cellContentIndicator = " ";
                cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
                cellTitle = `Explored (${mapX},${mapY})`;
            } else if (hasStaticItemAtLocation && isStaticItemCurrentlyRevealed) {
                cellContentIndicator = <BookOpen size={12} />;
                cellClasses = "bg-green-700 text-green-200";
                cellTitle = `Explored (${mapX},${mapY}) (Revealed Feature)`;
            } else if (hasSolvedPuzzle) {
                cellContentIndicator = <Sparkles size={12} />;
                cellClasses = "bg-purple-800 text-purple-200";
                cellTitle = `Explored (${mapX},${mapY}) (Solved Puzzle)`;
            } else {
                cellContentIndicator = "·";
                cellClasses = "bg-gray-700 dark:bg-gray-600 text-gray-500";
                cellTitle = `Explored (${mapX},${mapY})`;
            }
          } else {
            cellContentIndicator = "·";
            cellClasses = "bg-gray-900 dark:bg-gray-800 text-gray-700";
            cellTitle = `Unexplored (${mapX},${mapY})`;
          }

          if (currentFloor === numFloors - 1 && !isBossDefeated && isBossPassage) {
            if (isRedLight) {
              cellClasses = cn(cellClasses, "bg-red-900/50 dark:bg-red-200/50 animate-pulse-fast");
            } else {
              cellClasses = cn(cellClasses, "bg-green-900/50 dark:bg-green-200/50");
            }
          }

        } else {
          cellContentIndicator = " ";
          cellClasses = "bg-gray-950 dark:bg-gray-100 border-gray-900 dark:border-gray-200";
          cellTitle = "The Void";
        }
        rowCells.push(
          <div
            key={`${viewportX}-${viewportY}`}
            className={cn(
              "w-full h-full flex items-center justify-center text-[10px] font-bold",
              "border border-gray-800 dark:border-gray-500",
              cellClasses,
            )}
            title={cellTitle}
          >
            {cellContentIndicator}
          </div>
        );
      }
      visibleCells.push(rowCells);
    }

    return (
      <div
        className="grid gap-0.5 p-1 border border-gray-700 dark:border-gray-300 bg-gray-900 dark:bg-gray-200 overflow-hidden font-mono"
        style={{
          gridTemplateColumns: "repeat(" + dynamicViewportSize + ", " + cellSize + "px)",
          gridTemplateRows: "repeat(" + dynamicViewportSize + ", " + cellSize + "px)",
          width: mapDisplayWidth + "px",
          height: mapDisplayHeight + "px",
        }}
      >
        {visibleCells.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderInventory = () => {
    const inventoryItems = labyrinth.getInventoryItems();
    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const equippedAmulet = labyrinth.getEquippedAmulet();
    const equippedCompass = labyrinth.getEquippedCompass();

    return (
      <div className="mt-4">
        <h3 className="text-xl font-bold text-lime-300 dark:text-lime-600 mb-2">Inventory:</h3>
        {inventoryItems.length === 0 ? (
          <p className="text-gray-300 dark:text-gray-700 text-sm italic">Your inventory is empty.</p>
        ) : (
          <ScrollArea className="h-[200px] w-full pr-3">
            <ul className="space-y-2 text-xs text-gray-300 dark:text-gray-700">
              {inventoryItems.map(({ item, quantity }) => {
                let equippedStatus = "";
                let isEquipped = false;

                if (item.type === 'weapon' && equippedWeapon?.id === item.id) {
                  equippedStatus = "(Equipped Weapon)";
                  isEquipped = true;
                } else if (item.type === 'shield' && equippedShield?.id === item.id) {
                  equippedStatus = "(Equipped Shield)";
                  isEquipped = true;
                } else if (item.type === 'accessory') {
                  if (item.id === "scholar-amulet-f0" && equippedAmulet?.id === item.id) {
                    equippedStatus = "(Equipped Amulet)";
                    isEquipped = true;
                  } else if (item.id === "true-compass-f2" && equippedCompass?.id === item.id) {
                    equippedStatus = "(Equipped Compass)";
                    isEquipped = true;
                  }
                }

                const isConsumableWithUses = item.type === 'consumable' && item.stackable;
                const canUse = !labyrinth.isGameOver() && !showRPS && (isConsumableWithUses ? quantity > 0 : true);
                const buttonText = isConsumableWithUses ? 'Use' : (isEquipped ? 'Unequip' : 'Equip');

                return (
                  <li key={item.id} className="flex items-center justify-between">
                    <Tooltip>
                      <TooltipTrigger className="text-left">
                        <span className="font-medium text-white dark:text-gray-950">{item.name}</span>
                        {isConsumableWithUses && <span className="ml-1 text-gray-400 dark:text-gray-600">(x{quantity})</span>}
                        {equippedStatus && <span className="ml-2 text-green-400 dark:text-green-600 text-xs">{equippedStatus}</span>}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                    {(item.type === 'consumable' || item.type === 'weapon' || item.type === 'shield' || item.type === 'accessory') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white dark:bg-gray-300 dark:hover:bg-gray-400 dark:text-gray-900"
                        onClick={() => handleUseItem(item.id)}
                        disabled={!canUse}
                      >
                        {buttonText}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    );
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
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Map & Controls */}
            <div className="flex flex-col items-center lg:w-1/2">
              <h3 className="text-xl font-bold mb-2 text-orange-300 dark:text-orange-600">Ancient Map</h3>
              {renderMap()}

              {showRPS && currentEnemy ? (
                <div className="p-3 border border-red-600 rounded-md bg-red-900/80 dark:bg-red-100/80 text-red-100 dark:text-red-900 w-full max-w-sm mt-4">
                  <h3 className="text-xl font-bold text-red-400 dark:text-red-700 mb-2">Combat Encounter!</h3>
                  <p className="text-base mb-2">You face a fearsome {currentEnemy.name}: <span className="italic">{currentEnemy.description}</span></p>
                  <p className="mb-2">Choose your move wisely, adventurer:</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                    <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("left")}>Attack Left</Button>
                    <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("center")}>Attack Center</Button>
                    <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("right")}>Attack Right</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mt-4 w-full sm:max-w-64">
                    <div />
                    <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("north")} disabled={labyrinth.isGameOver() || showRPS}>North</Button>
                    <div />
                    <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("west")} disabled={labyrinth.isGameOver() || showRPS}>West</Button>
                    <div />
                    <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("east")} disabled={labyrinth.isGameOver() || showRPS}>East</Button>
                    <div />
                    <Button className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("south")} disabled={labyrinth.isGameOver() || showRPS}>South</Button>
                    <div />
                  </div>
                  <div className="flex gap-3 mt-3">
                    <Button className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={handleSearch} disabled={labyrinth.isGameOver() || showRPS}>Search Area</Button>
                    <Button className="bg-purple-700 hover:bg-purple-800 text-white" onClick={handleInteract} disabled={labyrinth.isGameOver() || showRPS}>Interact</Button>
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Stats, Health, Inventory */}
            <div className="flex-grow lg:w-1/2 flex flex-col items-center">
              <h3 className="text-xl font-bold text-lime-300 dark:text-lime-600 mb-2 text-center">Adventurer's Status:</h3>
              <div className="flex justify-center items-center gap-6 text-base text-gray-300 dark:text-gray-700 p-2 rounded-md bg-gray-900/50 dark:bg-gray-200/50 mb-4">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1.5 cursor-help transition-transform hover:scale-110">
                    <Sword size={20} className="text-orange-400" />
                    <span className="font-bold text-lg">{labyrinth.getCurrentAttackDamage()}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p><strong>Attack Power:</strong> The amount of damage you deal in combat.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1.5 cursor-help transition-transform hover:scale-110">
                    <Shield size={20} className="text-blue-400" />
                    <span className="font-bold text-lg">{labyrinth.getCurrentDefense()}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p><strong>Defense:</strong> Reduces incoming damage from enemies.</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1.5 cursor-help transition-transform hover:scale-110">
                    <Target size={20} className="text-purple-400" />
                    <span className="font-bold text-lg">{labyrinth.getSearchRadius()}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p><strong>Search Radius:</strong> The range of your 'Search Area' action.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="w-full mb-2" style={{ maxWidth: `${dynamicViewportSize * cellSize}px` }}>
                <div className="flex justify-between items-center mb-1 px-1">
                  <span className="text-sm font-bold text-lime-300 dark:text-lime-600">Health</span>
                  <span className="text-xs font-mono text-gray-300 dark:text-gray-700">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span>
                </div>
                <div className="w-full bg-red-900/70 rounded-full h-4 border border-gray-600 dark:bg-red-300/50">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(labyrinth.getPlayerHealth() / labyrinth.getPlayerMaxHealth()) * 100}%` }}
                  />
                </div>
              </div>
              {renderInventory()}
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
            <div>
              <h3 className="text-xl font-bold text-blue-300 dark:text-blue-600 mb-2">Chronicles of the Labyrinth:</h3>
              <ScrollArea className="h-24 w-full rounded-md border border-gray-700 dark:border-gray-300 p-3 bg-gray-900 dark:bg-gray-200">
                <div ref={logRef} className="text-gray-200 dark:text-gray-800 text-sm font-mono">
                  {gameLog.slice(-10).map((message, index) => (
                    <p key={index} className="mb-1 last:mb-0">{message}</p>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-300 dark:text-yellow-600 mb-2">Current Objective (Floor {labyrinth.getCurrentFloor() + 1}):</h3>
              <p className="text-base text-gray-300 dark:text-gray-700 italic">
                  {labyrinth.getCurrentFloorObjective().description}
              </p>
              <p className={cn(
                  "text-sm font-semibold mt-1",
                  labyrinth.getCurrentFloorObjective().isCompleted() ? "text-green-400 dark:text-green-500" : "text-red-400 dark:text-red-500"
              )}>
                  Status: {labyrinth.getCurrentFloorObjective().isCompleted() ? "Completed!" : "In Progress"}
              </p>
            </div>
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