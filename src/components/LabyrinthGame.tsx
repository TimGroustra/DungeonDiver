"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Labyrinth, LogicalRoom, Item, Enemy, Puzzle } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PersonStanding, Sword, Heart, Shield, Target, Goal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateSvgPaths } from "@/lib/map-renderer";

interface LabyrinthGameProps {
  playerName: string;
  gameStarted: boolean;
  startTime: number | null;
  elapsedTime: number;
  onGameOver: (result: { type: 'victory' | 'defeat', name: string, time: number }) => void;
  onGameRestart: () => void;
}

const ENEMY_MOVE_SPEEDS_MS = [2000, 1500, 1000, 500];

const emojiMap: { [key: string]: string } = {
  "Grumbling Goblin": "👹",
  "Rattling Skeleton": "💀",
  "Whispering Shadow": "👻",
  "The Watcher of the Core": "👁️",
  "Vial of Lumina": "🧪",
  "Blade of the Labyrinth": "🗡️",
  "Aegis of the Guardian": "🛡️",
  "Tattered Journal": "📖",
  "Pulsating Crystal": "🔮",
  "Scholar's Amulet": "💎",
  "Enchanted Flask": "🍶",
  "Living Water": "🌊",
  "Whispering Well's Blessing": "✨",
  "Broken Compass": "🧭",
  "Artisan's Fine Tools": "🛠️",
  "Prismatic Lens": "🌈",
  "True Compass": "🗺️",
  "Labyrinth Key": "🔑",
  "Heart of the Labyrinth": "❤️‍🔥",
  "Ancient Mechanism": "⚙️",
  "Whispering Well": "💧",
  "Hidden Spring": "🌿",
  "Ancient Repair Bench": "🔨",
  "Mysterious Box": "📦",
  "Ancient Altar": "🛐",
  "Mysterious Staircase": "🪜",
  "Grand Riddle of Eternity": "❓",
  "Triggered Trap": "☠️",
};

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, startTime, elapsedTime, onGameOver, onGameRestart }) => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0);
  const [currentLogicalRoom, setCurrentLogicalRoom] = useState<LogicalRoom | undefined>(labyrinth.getCurrentLogicalRoom());
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  useEffect(() => {
    if (gameStarted) {
      setLabyrinth(new Labyrinth());
      setGameVersion(0);
      setGameLog(["Game started!"]);
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
      switch (event.key) {
        case "ArrowUp": event.preventDefault(); handleMove("north"); break;
        case "ArrowDown": event.preventDefault(); handleMove("south"); break;
        case "ArrowLeft": event.preventDefault(); handleMove("west"); break;
        case "ArrowRight": event.preventDefault(); handleMove("east"); break;
        case "Shift": event.preventDefault(); handleSearch(); break;
        case "Control": event.preventDefault(); handleInteract(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted, labyrinth, playerName, elapsedTime]);

  useEffect(() => {
    if (!gameStarted || labyrinth.isGameOver()) return;
    const currentFloor = labyrinth.getCurrentFloor();
    const moveSpeed = ENEMY_MOVE_SPEEDS_MS[currentFloor] || 2000;
    const intervalId = setInterval(() => {
      const currentElapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      labyrinth.processEnemyMovement(playerName, currentElapsedTime);
      if (labyrinth.getCurrentFloor() === labyrinth["NUM_FLOORS"] - 1 && !labyrinth.isBossDefeated()) {
        labyrinth.processBossLogic();
      }
      setGameVersion(prev => prev + 1);
    }, moveSpeed);
    return () => clearInterval(intervalId);
  }, [gameStarted, labyrinth, labyrinth.isGameOver(), labyrinth.getCurrentFloor(), playerName, startTime]);

  const updateGameDisplay = () => {
    setCurrentLogicalRoom(labyrinth.getCurrentLogicalRoom());
    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      setGameLog((prevLog) => [...prevLog, ...newMessages]);
      labyrinth.clearMessages();
    }
  };

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (labyrinth.isGameOver()) { toast.info("Cannot move right now."); return; }
    labyrinth.move(direction, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleSearch = () => {
    if (labyrinth.isGameOver()) { toast.info("Cannot search right now."); return; }
    labyrinth.search();
    setGameVersion(prev => prev + 1);
  };

  const handleInteract = () => {
    if (labyrinth.isGameOver()) { toast.info("Cannot interact right now."); return; }
    labyrinth.interact(playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleUseItem = (itemId: string) => {
    if (labyrinth.isGameOver()) { toast.info("Cannot use items right now."); return; }
    labyrinth.useItem(itemId, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const getEmojiForElement = (elementName: string): string => {
    if (elementName.includes("Blade of the Labyrinth")) return emojiMap["Blade of the Labyrinth"];
    if (elementName.includes("Aegis of the Guardian")) return emojiMap["Aegis of the Guardian"];
    return emojiMap[elementName] || "❓";
  };

  const { wallPath, floorPath } = useMemo(() => {
    const grid = labyrinth.getMapGrid();
    if (!grid || grid.length === 0) return { wallPath: '', floorPath: '' };
    return generateSvgPaths(grid);
  }, [gameVersion === 0]);

  const renderMap = () => {
    const playerLoc = labyrinth.getPlayerLocation();
    const visitedCells = labyrinth.getVisitedCells();
    const viewportSize = 15;
    const viewBox = `${playerLoc.x - viewportSize / 2 + 0.5} ${playerLoc.y - viewportSize / 2 + 0.5} ${viewportSize} ${viewportSize}`;
    const currentFloor = labyrinth.getCurrentFloor();
    const mapWidth = labyrinth["MAP_WIDTH"];
    const mapHeight = labyrinth["MAP_HEIGHT"];

    return (
      <svg
        viewBox={viewBox}
        className="max-w-full max-h-full aspect-square border border-gray-700 dark:border-gray-300 bg-gray-950 dark:bg-black"
        shapeRendering="crispEdges"
      >
        <defs>
          <pattern id="floor-pattern-light" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" className="fill-stone-400" />
            <path d="M 0 1 L 1 1 L 1 0" className="stroke-stone-500" strokeWidth="0.05" fill="none" />
          </pattern>
          <pattern id="floor-pattern-dark" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" className="fill-stone-700" />
            <path d="M 0 1 L 1 1 L 1 0" className="stroke-stone-800" strokeWidth="0.05" fill="none" />
          </pattern>
          <pattern id="wall-pattern-light" patternUnits="userSpaceOnUse" width="0.4" height="0.4">
            <rect width="0.4" height="0.4" className="fill-gray-800" />
            <path d="M -0.1 0.1 L 0.1 -0.1 M 0.3 0.5 L 0.5 0.3" className="stroke-gray-900" strokeWidth="0.04" />
          </pattern>
          <pattern id="wall-pattern-dark" patternUnits="userSpaceOnUse" width="0.4" height="0.4">
            <rect width="0.4" height="0.4" className="fill-gray-900" />
            <path d="M -0.1 0.1 L 0.1 -0.1 M 0.3 0.5 L 0.5 0.3" className="stroke-black" strokeWidth="0.04" />
          </pattern>
          <mask id="fog-mask">
            <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="white" />
            {Array.from(visitedCells).map(cellCoord => {
              const [x, y] = cellCoord.split(',').map(Number);
              return <circle key={cellCoord} cx={x + 0.5} cy={y + 0.5} r={labyrinth.getSearchRadius()} fill="black" />;
            })}
          </mask>
        </defs>

        <path d={floorPath} className="fill-[url(#floor-pattern-light)] dark:fill-[url(#floor-pattern-dark)]" />
        <path d={floorPath} className="fill-stone-950/95 dark:fill-black/95" mask="url(#fog-mask)" />
        <path d={wallPath} className="fill-[url(#wall-pattern-light)] dark:fill-[url(#wall-pattern-dark)] stroke-gray-600 dark:stroke-gray-700" strokeWidth={0.05} />

        {Array.from(labyrinth.enemyLocations.entries()).map(([coordStr, enemyId]) => {
          const [x, y, f] = coordStr.split(',').map(Number);
          if (f !== currentFloor || !visitedCells.has(`${x},${y}`)) return null;
          const enemy = labyrinth.getEnemy(enemyId);
          if (!enemy || enemy.defeated) return null;
          return <text key={`enemy-${enemyId}`} x={x + 0.5} y={y + 0.5} fontSize="0.8" textAnchor="middle" dominantBaseline="central" className={cn(enemy.id.includes('watcher') && 'animate-pulse')}>{getEmojiForElement(enemy.name)}</text>;
        })}
        {Array.from(labyrinth.itemLocations.entries()).map(([coordStr, itemId]) => {
          const [x, y, f] = coordStr.split(',').map(Number);
          if (f !== currentFloor || !visitedCells.has(`${x},${y}`)) return null;
          const item = labyrinth.getItem(itemId);
          return <text key={`item-${itemId}`} x={x + 0.5} y={y + 0.5} fontSize="0.6" textAnchor="middle" dominantBaseline="central" className="animate-pulse">{getEmojiForElement(item.name)}</text>;
        })}
        {Array.from(labyrinth.staticItemLocations.entries()).map(([coordStr, itemId]) => {
          const [x, y, f] = coordStr.split(',').map(Number);
          if (f !== currentFloor || !labyrinth.getRevealedStaticItems().has(coordStr)) return null;
          const item = labyrinth.getItem(itemId);
          return <text key={`static-${itemId}`} x={x + 0.5} y={y + 0.5} fontSize="0.7" textAnchor="middle" dominantBaseline="central">{getEmojiForElement(item.name)}</text>;
        })}

        <rect 
          x="0" 
          y="0" 
          width={mapWidth} 
          height={mapHeight} 
          fill="none" 
          className="stroke-gray-600 dark:stroke-gray-500" 
          strokeWidth="0.5" 
        />

        <circle cx={playerLoc.x + 0.5} cy={playerLoc.y + 0.5} r={0.4} className="fill-blue-500 stroke-blue-300" strokeWidth={0.1} />
      </svg>
    );
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
        <ul className="list-disc list-inside text-xs text-white space-y-2">
          {inventoryItems.map(({ item, quantity }) => {
            let equippedStatus = "";
            let isEquipped = false;
            if (item.type === 'weapon' && equippedWeapon?.id === item.id) { equippedStatus = "(Equipped Weapon)"; isEquipped = true; }
            else if (item.type === 'shield' && equippedShield?.id === item.id) { equippedStatus = "(Equipped Shield)"; isEquipped = true; }
            else if (item.id === "scholar-amulet-f0" && equippedAmulet?.id === item.id) { equippedStatus = "(Equipped Amulet)"; isEquipped = true; }
            else if (item.id === "true-compass-f2" && equippedCompass?.id === item.id) { equippedStatus = "(Equipped Compass)"; isEquipped = true; }
            
            const isConsumableWithUses = item.type === 'consumable' && item.stackable;
            const canUse = !labyrinth.isGameOver() && (isConsumableWithUses ? quantity > 0 : true);
            const buttonText = isConsumableWithUses ? 'Use' : (isEquipped ? 'Unequip' : 'Equip');

            return (
              <li key={item.id} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-white">{item.name}</span>
                  {isConsumableWithUses && <span className="ml-1 text-white"> (x{quantity})</span>}: {item.description}
                  {equippedStatus && <span className="ml-2 text-green-400 dark:text-green-600">{equippedStatus}</span>}
                </div>
                {(item.type === 'consumable' || item.type === 'weapon' || item.type === 'shield' || item.type === 'accessory') && (
                  <Button variant="outline" size="sm" className="ml-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white dark:bg-gray-300 dark:hover:bg-gray-400 dark:text-gray-900 flex-shrink-0" onClick={() => handleUseItem(item.id)} disabled={!canUse}>
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

  const currentObjective = labyrinth.getCurrentFloorObjective();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-1" style={{ backgroundImage: "url('/Eldoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <Card className="w-full max-w-7xl shadow-2xl bg-gray-800/90 text-gray-100 dark:bg-gray-100/90 dark:text-gray-900 border-gray-700 dark:border-gray-300 h-[calc(100vh-0.5rem)] flex flex-col">
        <CardHeader className="border-b border-gray-700 dark:border-gray-300 pb-2 relative">
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-center text-yellow-400 dark:text-yellow-600 drop-shadow-lg">The Labyrinth of Whispers</CardTitle>
          <CardDescription className="text-sm italic text-center text-gray-300 dark:text-gray-700">A perilous journey...</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 flex-grow overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4 h-full">
            <main className="flex-grow flex flex-col items-center justify-center p-2 relative">
              <h3 className="text-lg font-bold mb-2 text-orange-300 dark:text-orange-600">Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})</h3>
              <div className="w-full flex-grow flex items-center justify-center min-h-0">
                {renderMap()}
              </div>
              <div className="mt-2 text-center text-gray-400 dark:text-gray-600 text-sm">
                <p>Use <span className="font-bold text-gray-300 dark:text-gray-500">Arrow Keys</span> to Move/Attack.</p>
                <p><span className="font-bold text-gray-300 dark:text-gray-500">Shift</span> to Search, <span className="font-bold text-gray-300 dark:text-gray-500">Control</span> to Interact.</p>
              </div>
            </main>
            <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-gray-900/50 dark:bg-gray-200/50 rounded-lg border border-gray-700 dark:border-gray-300 flex flex-col">
              <ScrollArea className="h-full w-full">
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-lime-300 dark:text-lime-600 mb-2 text-center">Adventurer's Status</h3>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-300 dark:text-gray-700">
                      <p className="flex items-center"><Heart className="mr-1.5 text-red-500" size={16} /> <span className="font-bold text-red-400">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span></p>
                      <p className="flex items-center"><Sword className="mr-1.5 text-gray-400" size={16} /> <span className="font-bold text-orange-400">{labyrinth.getCurrentAttackDamage()}</span></p>
                      <p className="flex items-center"><Shield className="mr-1.5 text-gray-400" size={16} /> <span className="font-bold text-blue-400">{labyrinth.getCurrentDefense()}</span></p>
                      <p className="flex items-center"><Target className="mr-1.5 text-gray-400" size={16} /> <span className="font-bold text-purple-400">{labyrinth.getSearchRadius()}</span></p>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center space-y-1">
                      {labyrinth.getEquippedWeapon() && (<p>Weapon: {labyrinth.getEquippedWeapon()?.name}</p>)}
                      {labyrinth.getEquippedShield() && (<p>Shield: {labyrinth.getEquippedShield()?.name}</p>)}
                      {labyrinth.getEquippedAmulet() && (<p>Accessory: {labyrinth.getEquippedAmulet()?.name}</p>)}
                      {labyrinth.getEquippedCompass() && (<p>Accessory: {labyrinth.getEquippedCompass()?.name}</p>)}
                    </div>
                  </div>
                  <Separator className="bg-gray-700 dark:bg-gray-300" />
                  <div>
                    <h3 className="text-lg font-bold text-cyan-300 dark:text-cyan-600 mb-2 flex items-center justify-center"><Goal className="mr-2" size={20} /> Objective (Floor {labyrinth.getCurrentFloor() + 1})</h3>
                    <p className={cn("text-sm italic text-center px-2", currentObjective.isCompleted() ? "text-green-400 dark:text-green-500" : "text-gray-300 dark:text-gray-700")}>{currentObjective.description}</p>
                    <p className={cn("text-xs font-semibold mt-1 text-center", currentObjective.isCompleted() ? "text-green-500 dark:text-green-600" : "text-red-400 dark:text-red-500")}>Status: {currentObjective.isCompleted() ? "Completed!" : "In Progress"}</p>
                  </div>
                  <Separator className="bg-gray-700 dark:bg-gray-300" />
                  <div>
                    <h3 className="text-lg font-bold text-yellow-300 dark:text-yellow-600 mb-2 text-center">Inventory</h3>
                    {renderInventory()}
                  </div>
                  <Separator className="bg-gray-700 dark:bg-gray-300" />
                  <div>
                    <h3 className="text-lg font-bold text-blue-300 dark:text-blue-600 mb-2 text-center">Chronicles</h3>
                    <div ref={logRef} className="w-full rounded-md border border-gray-700 dark:border-gray-300 p-2 bg-gray-900 dark:bg-gray-200 text-gray-200 dark:text-gray-800 text-xs font-mono h-40 overflow-y-auto">
                      {[...gameLog].reverse().map((message, index) => (<p key={index} className="mb-1 last:mb-0">{message}</p>))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </aside>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col justify-center items-center border-t border-gray-700 dark:border-gray-300 pt-2">
          {labyrinth.isGameOver() && (<Button onClick={onGameRestart} className="mt-2 bg-amber-500 hover:bg-amber-600 text-white text-base px-4 py-2">Restart Journey</Button>)}
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 text-center">Please consider supporting this project. Donations can be received at this ETN wallet address: <span className="font-mono text-gray-300 dark:text-gray-700 break-all">0x3Ab5cBFfa0C2A3f15641DCA0fbEEBa1EFb166EE8</span></p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LabyrinthGame;