"use client";

import React, { useState, useEffect, useRef } from "react";
import { Labyrinth, LogicalRoom, Item, Enemy, Puzzle } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { tileMapping } from "@/lib/tileMapping";
import { Sword, Heart, Shield, Target } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
      logRef.current.scrollTop = 0;
    }
  }, [gameLog]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameStarted || labyrinth.isGameOver()) return;

      if (showRPS) {
        switch (event.key) {
          case "ArrowLeft": event.preventDefault(); handleRPSChoice("left"); break;
          case "ArrowUp": event.preventDefault(); handleRPSChoice("center"); break;
          case "ArrowRight": event.preventDefault(); handleRPSChoice("right"); break;
        }
      } else {
        switch (event.key) {
          case "ArrowUp": event.preventDefault(); handleMove("north"); break;
          case "ArrowDown": event.preventDefault(); handleMove("south"); break;
          case "ArrowLeft": event.preventDefault(); handleMove("west"); break;
          case "ArrowRight": event.preventDefault(); handleMove("east"); break;
          case "Shift": event.preventDefault(); handleSearch(); break;
          case "Control": event.preventDefault(); handleInteract(); break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    return () => { if (intervalId) clearInterval(intervalId); };
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
    const triggeredTraps = labyrinth.getTriggeredTraps();
    const fullGridWidth = mapGrid[0]?.length || 0;
    const fullGridHeight = mapGrid.length;
    const currentFloor = labyrinth.getCurrentFloor();

    const halfViewport = Math.floor(dynamicViewportSize / 2);
    const viewportMapStartX = playerLoc.x - halfViewport;
    const viewportMapStartY = playerLoc.y - halfViewport;

    const visibleCells = [];
    for (let viewportY = 0; viewportY < dynamicViewportSize; viewportY++) {
      for (let viewportX = 0; viewportX < dynamicViewportSize; viewportX++) {
        const mapX = viewportMapStartX + viewportX;
        const mapY = viewportMapStartY + viewportY;

        let baseTileUrl = tileMapping.WALL;
        let entityTileUrl: string | null = null;
        let cellTitle = "The Void";
        let isVisible = false;
        let animationClass = "";

        if (mapX >= 0 && mapX < fullGridWidth && mapY >= 0 && mapY < fullGridHeight) {
          const isWall = mapGrid[mapY][mapX] === 'wall';
          const isVisited = visitedCells.has(`${mapX},${mapY}`);
          isVisible = isVisited;
          cellTitle = isWall ? "Solid Wall" : `Unexplored (${mapX},${mapY})`;

          if (!isWall) {
            const fullCoordStr = `${mapX},${mapY},${currentFloor}`;
            baseTileUrl = tileMapping.FLOOR;

            if (isVisited) {
              cellTitle = `Explored (${mapX},${mapY})`;
              if (triggeredTraps.has(fullCoordStr)) {
                baseTileUrl = tileMapping.TRAP_TRIGGERED;
              }

              // Entity rendering order: Player > Enemy > Items/Features
              if (playerLoc.x === mapX && playerLoc.y === mapY) {
                entityTileUrl = tileMapping.PLAYER;
              } else {
                const enemyId = labyrinth["enemyLocations"].get(fullCoordStr);
                const enemy = enemyId ? labyrinth.getEnemy(enemyId) : undefined;
                if (enemy && !enemy.defeated) {
                  animationClass = "animate-pulse";
                  if (enemy.name.includes("Goblin")) entityTileUrl = tileMapping.GOBLIN;
                  else if (enemy.name.includes("Skeleton")) entityTileUrl = tileMapping.SKELETON;
                  else if (enemy.name.includes("Shadow")) entityTileUrl = tileMapping.SHADOW;
                  else if (enemy.name.includes("Watcher")) entityTileUrl = tileMapping.WATCHER;
                  else entityTileUrl = tileMapping.GOBLIN;
                } else {
                  const itemId = labyrinth["itemLocations"].get(fullCoordStr);
                  const item = itemId ? labyrinth.getItem(itemId) : undefined;
                  if (item) {
                    animationClass = "animate-pulse";
                    if (item.name.includes("Sword")) entityTileUrl = tileMapping.SWORD;
                    else if (item.name.includes("Shield")) entityTileUrl = tileMapping.SHIELD;
                    else if (item.name.includes("Vial") || item.name.includes("Potion")) entityTileUrl = tileMapping.POTION;
                    else if (item.name.includes("Key")) entityTileUrl = tileMapping.KEY;
                    else if (item.name.includes("Journal")) entityTileUrl = tileMapping.JOURNAL;
                    else if (item.name.includes("Flask")) entityTileUrl = tileMapping.FLASK;
                    else if (item.name.includes("Amulet")) entityTileUrl = tileMapping.AMULET;
                    else if (item.name.includes("Compass")) entityTileUrl = tileMapping.COMPASS;
                    else if (item.name.includes("Heart")) entityTileUrl = tileMapping.HEART;
                    else entityTileUrl = tileMapping.POTION;
                  } else {
                    const staticItemId = labyrinth["staticItemLocations"].get(fullCoordStr);
                    const staticItem = staticItemId ? labyrinth.getItem(staticItemId) : undefined;
                    if (staticItem) {
                      if (staticItem.name.includes("Staircase")) entityTileUrl = tileMapping.STAIRS;
                      else if (staticItem.name.includes("Box")) entityTileUrl = tileMapping.CHEST;
                      else if (staticItem.name.includes("Altar")) { entityTileUrl = tileMapping.ALTAR; animationClass = "animate-pulse"; }
                      else if (staticItem.name.includes("Well")) entityTileUrl = tileMapping.WELL;
                      else if (staticItem.name.includes("Spring")) entityTileUrl = tileMapping.SPRING;
                      else if (staticItem.name.includes("Bench")) entityTileUrl = tileMapping.BENCH;
                      else if (staticItem.name.includes("Mechanism")) entityTileUrl = tileMapping.MECHANISM;
                    }
                  }
                }
              }
            }
          }
        }

        visibleCells.push(
          <div key={`${viewportX}-${viewportY}-${mapX}-${mapY}`} className="relative aspect-square" title={cellTitle}>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${baseTileUrl})`,
                opacity: isVisible ? 1 : 0.4,
              }}
            />
            {entityTileUrl && isVisible && (
              <div
                className={cn("absolute inset-0 bg-cover bg-center", animationClass)}
                style={{ backgroundImage: `url(${entityTileUrl})` }}
              />
            )}
          </div>
        );
      }
    }
    return visibleCells;
  };

  const renderInventory = () => {
    const inventoryItems = labyrinth.getInventoryItems();
    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const equippedAmulet = labyrinth.getEquippedAmulet();
    const equippedCompass = labyrinth.getEquippedCompass();

    if (inventoryItems.length === 0) {
      return <p className="text-white text-sm italic">Your inventory is empty.</p>;
    }
    return (
      <div className="mt-2">
        <p className="font-semibold text-base text-white">Your Inventory:</p>
        <ul className="list-disc list-inside text-xs text-white">
          {inventoryItems.map(({ item, quantity }) => {
            let equippedStatus = "";
            let isEquipped = false;

            if (item.type === 'weapon' && equippedWeapon?.id === item.id) { equippedStatus = "(Equipped Weapon)"; isEquipped = true; }
            else if (item.type === 'shield' && equippedShield?.id === item.id) { equippedStatus = "(Equipped Shield)"; isEquipped = true; }
            else if (item.type === 'accessory') {
              if (equippedAmulet?.id === item.id) { equippedStatus = "(Equipped Amulet)"; isEquipped = true; }
              else if (equippedCompass?.id === item.id) { equippedStatus = "(Equipped Compass)"; isEquipped = true; }
            }

            const isConsumableWithUses = item.type === 'consumable' && item.stackable;
            const canUse = !labyrinth.isGameOver() && !showRPS && (isConsumableWithUses ? quantity > 0 : true);
            const buttonText = isConsumableWithUses ? 'Use' : (isEquipped ? 'Unequip' : 'Equip');

            return (
              <li key={item.id} className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-medium text-white">{item.name}</span>
                  {isConsumableWithUses && <span className="ml-1 text-white"> (x{quantity})</span>}: {item.description}
                  {equippedStatus && <span className="ml-2 text-green-400 dark:text-green-600">{equippedStatus}</span>}
                </div>
                {(item.type === 'consumable' || item.type === 'weapon' || item.type === 'shield' || item.type === 'accessory') && (
                  <Button variant="outline" size="sm" className="ml-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white" onClick={() => handleUseItem(item.id)} disabled={!canUse}>
                    {buttonText}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  if (!gameStarted) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-1">
      <Card className="w-full max-w-4xl shadow-2xl bg-gray-800/90 text-gray-100 border-gray-700 min-h-[calc(100vh-0.5rem)] flex flex-col">
        <CardHeader className="border-b border-gray-700 pb-2">
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-center text-yellow-400 drop-shadow-lg">The Labyrinth of Whispers</CardTitle>
          <CardDescription className="text-sm italic text-center text-gray-300">A perilous journey into the unknown...</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex-grow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center relative">
              <h3 className="text-lg font-bold mb-2 text-orange-300">Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})</h3>
              <div className="w-full sm:max-w-64 grid gap-0 p-1 border border-gray-700 bg-gray-900 overflow-hidden" style={{ gridTemplateColumns: `repeat(${dynamicViewportSize}, 1fr)` }}>
                {renderMap()}
              </div>
              <div className="w-full sm:max-w-64 mt-3 flex flex-col justify-center items-center min-h-[12rem]">
                {showRPS && currentEnemy ? (
                  <div className="p-2 border border-red-600 rounded-md bg-red-900/80 text-red-100 w-full">
                    <h3 className="text-lg font-bold text-red-400 mb-1">Combat Encounter!</h3>
                    <p className="text-sm mb-2">You face a fearsome {currentEnemy.name}: <span className="italic">{currentEnemy.description}</span></p>
                    <p className="mb-2 text-sm">Choose your move wisely:</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("left")}>Attack Left</Button>
                      <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("center")}>Attack Center</Button>
                      <Button size="sm" variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white" onClick={() => handleRPSChoice("right")}>Attack Right</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <div /><Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("north")} disabled={labyrinth.isGameOver() || showRPS}>North</Button><div />
                      <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("west")} disabled={labyrinth.isGameOver() || showRPS}>West</Button><div />
                      <Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("east")} disabled={labyrinth.isGameOver() || showRPS}>East</Button>
                      <div /><Button size="sm" className="bg-green-700 hover:bg-green-800 text-white" onClick={() => handleMove("south")} disabled={labyrinth.isGameOver() || showRPS}>South</Button><div />
                    </div>
                    <div className="flex gap-2 mt-2 justify-center">
                      <Button size="sm" className="bg-indigo-700 hover:bg-indigo-800 text-white" onClick={handleSearch} disabled={labyrinth.isGameOver() || showRPS}>Search</Button>
                      <Button size="sm" className="bg-purple-700 hover:bg-purple-800 text-white" onClick={handleInteract} disabled={labyrinth.isGameOver() || showRPS}>Interact</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Separator className="my-2 w-full bg-gray-700 md:hidden" />
              <div className="mb-2 w-full text-center">
                <h3 className="text-lg font-bold text-lime-300 mb-1">Adventurer's Status:</h3>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-gray-300">
                  <p className="flex items-center"><Heart className="mr-1 text-red-500" size={16} /> <span className="font-bold text-red-400">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span></p>
                  <p className="flex items-center"><Sword className="mr-1 text-gray-400" size={16} /> <span className="font-bold text-orange-400">{labyrinth.getCurrentAttackDamage()}</span></p>
                  <p className="flex items-center"><Shield className="mr-1 text-gray-400" size={16} /> <span className="font-bold text-blue-400">{labyrinth.getCurrentDefense()}</span></p>
                  <p className="flex items-center"><Target className="mr-1 text-gray-400" size={16} /> <span className="font-bold text-purple-400">{labyrinth.getSearchRadius()}</span></p>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {labyrinth.getEquippedWeapon() && (<p>Weapon: {labyrinth.getEquippedWeapon()?.name}</p>)}
                  {labyrinth.getEquippedShield() && (<p>Shield: {labyrinth.getEquippedShield()?.name}</p>)}
                  {labyrinth.getEquippedAmulet() && (<p>Accessory: {labyrinth.getEquippedAmulet()?.name}</p>)}
                  {labyrinth.getEquippedCompass() && (<p>Accessory: {labyrinth.getEquippedCompass()?.name}</p>)}
                </div>
                {renderInventory()}
              </div>
              <Separator className="my-2 w-full bg-gray-700" />
              <h3 className="text-lg font-bold text-blue-300 mb-2">Chronicles:</h3>
              <div ref={logRef} className="w-full rounded-md border border-gray-700 p-2 bg-gray-900 text-gray-200 text-xs font-mono max-h-40 overflow-y-auto">
                {gameLog.slice(-6).reverse().map((message, index) => (
                  <p key={index} className="mb-1 last:mb-0">{message}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col justify-center items-center border-t border-gray-700 pt-2">
          {labyrinth.isGameOver() && (
            <Button onClick={onGameRestart} className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-base px-4 py-2">Restart Journey</Button>
          )}
          <p className="text-xs text-gray-400 mt-2 text-center">
            Please consider supporting this project. Donations can be received at this ETN wallet address: <span className="font-mono text-gray-300 break-all">0x3Ab5cBFfa0C2A3f15641DCA0fbEEBa1EFb166EE8</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabyrinthGame;