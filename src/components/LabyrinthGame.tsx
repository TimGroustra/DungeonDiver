"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Labyrinth, LogicalRoom, Item } from "@/lib/game";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sword, Heart, Shield, Target, Goal, BookOpen, Backpack, Scroll } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateSvgPaths } from "@/lib/map-renderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameStarted) {
      setLabyrinth(new Labyrinth());
      setGameVersion(0);
      setGameLog(["Welcome to the Labyrinth of Whispers..."]);
      setHasGameOverBeenDispatched(false);
    }
  }, [gameStarted]);

  useEffect(() => {
    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      setGameLog((prevLog) => [...newMessages, ...prevLog]);
      labyrinth.clearMessages();
    }
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
        case "ArrowUp": case "w": event.preventDefault(); handleMove("north"); break;
        case "ArrowDown": case "s": event.preventDefault(); handleMove("south"); break;
        case "ArrowLeft": case "a": event.preventDefault(); handleMove("west"); break;
        case "ArrowRight": case "d": event.preventDefault(); handleMove("east"); break;
        case "Shift": case "f": event.preventDefault(); handleSearch(); break;
        case "Control": case "e": event.preventDefault(); handleInteract(); break;
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
  }, [gameStarted, labyrinth, playerName, startTime]);

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

  const { wallPath, floorPath } = useMemo(() => generateSvgPaths(labyrinth.getMapGrid()), [gameVersion === 0]);

  const renderMap = () => {
    const playerLoc = labyrinth.getPlayerLocation();
    const visitedCells = labyrinth.getVisitedCells();
    const viewportSize = 15;
    const viewBox = `${playerLoc.x - viewportSize / 2 + 0.5} ${playerLoc.y - viewportSize / 2 + 0.5} ${viewportSize} ${viewportSize}`;
    const currentFloor = labyrinth.getCurrentFloor();
    const mapWidth = labyrinth["MAP_WIDTH"];
    const mapHeight = labyrinth["MAP_HEIGHT"];

    return (
      <svg viewBox={viewBox} className="w-full h-full" shapeRendering="crispEdges">
        <defs>
          <pattern id="floor-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" className="fill-stone-700" />
            <path d="M 0 1 L 1 1 L 1 0" className="stroke-stone-800" strokeWidth="0.05" fill="none" />
          </pattern>
          <pattern id="wall-pattern" patternUnits="userSpaceOnUse" width="0.4" height="0.4">
            <rect width="0.4" height="0.4" className="fill-gray-900" />
            <path d="M -0.1 0.1 L 0.1 -0.1 M 0.3 0.5 L 0.5 0.3" className="stroke-black" strokeWidth="0.04" />
          </pattern>
          <mask id="fog-mask">
            <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="black" />
            {Array.from(visitedCells).map(cellCoord => {
              const [x, y] = cellCoord.split(',').map(Number);
              return <circle key={cellCoord} cx={x + 0.5} cy={y + 0.5} r={labyrinth.getSearchRadius()} fill="white" />;
            })}
          </mask>
        </defs>
        <g mask="url(#fog-mask)">
          <path d={floorPath} className="fill-[url(#floor-pattern)]" />
          <path d={wallPath} className="fill-[url(#wall-pattern)] stroke-gray-700" strokeWidth={0.05} />
          {Array.from(labyrinth.enemyLocations.entries()).map(([coordStr, enemyId]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            const enemy = labyrinth.getEnemy(enemyId);
            if (!enemy || enemy.defeated) return null;
            return <text key={`enemy-${enemyId}`} x={x + 0.5} y={y + 0.5} fontSize="0.8" textAnchor="middle" dominantBaseline="central" className={cn(enemy.id.includes('watcher') && 'animate-pulse')}>{getEmojiForElement(enemy.name)}</text>;
          })}
          {Array.from(labyrinth.itemLocations.entries()).map(([coordStr, itemId]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            const item = labyrinth.getItem(itemId);
            return <text key={`item-${itemId}`} x={x + 0.5} y={y + 0.5} fontSize="0.6" textAnchor="middle" dominantBaseline="central" className="animate-pulse">{getEmojiForElement(item.name)}</text>;
          })}
          {Array.from(labyrinth.staticItemLocations.entries()).map(([coordStr, itemId]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor || !labyrinth.getRevealedStaticItems().has(coordStr)) return null;
            const item = labyrinth.getItem(itemId);
            return <text key={`static-${itemId}`} x={x + 0.5} y={y + 0.5} fontSize="0.7" textAnchor="middle" dominantBaseline="central">{getEmojiForElement(item.name)}</text>;
          })}
        </g>
        <circle cx={playerLoc.x + 0.5} cy={playerLoc.y + 0.5} r={0.4} className="fill-blue-500 stroke-blue-300" strokeWidth={0.1} />
      </svg>
    );
  };

  const renderInventory = () => {
    const inventoryItems = labyrinth.getInventoryItems();
    return (
      <ScrollArea className="h-full w-full">
        <div className="p-4 text-amber-50">
          {inventoryItems.length === 0 ? (
            <p className="italic text-stone-400 text-center">Your backpack is empty.</p>
          ) : (
            <ul className="space-y-3">
              {inventoryItems.map(({ item, quantity }) => {
                const isEquippable = ['weapon', 'shield', 'accessory'].includes(item.type);
                const isEquipped = (labyrinth.getEquippedWeapon()?.id === item.id) || (labyrinth.getEquippedShield()?.id === item.id) || (labyrinth.getEquippedAmulet()?.id === item.id) || (labyrinth.getEquippedCompass()?.id === item.id);
                return (
                  <li key={item.id} className="p-2 bg-black/20 rounded border border-amber-900/50 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-amber-200">{item.name} {item.stackable && `(x${quantity})`}</p>
                        <p className="text-xs text-stone-300 italic mt-1">{item.description}</p>
                      </div>
                      {(item.type === 'consumable' || isEquippable) && (
                        <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(item.id)}>
                          {isEquippable ? (isEquipped ? 'Unequip' : 'Equip') : 'Use'}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ScrollArea>
    );
  };

  const renderObjective = () => {
    const currentObjective = labyrinth.getCurrentFloorObjective();
    return (
      <div className="p-4 text-center text-amber-50 flex flex-col items-center justify-center h-full">
        <Goal className="w-16 h-16 text-amber-400 mb-4" />
        <h4 className="font-bold text-lg text-amber-200">Objective: Floor {labyrinth.getCurrentFloor() + 1}</h4>
        <p className="text-sm text-stone-300 italic mt-2">{currentObjective.description}</p>
        <p className={cn("text-sm font-semibold mt-4", currentObjective.isCompleted() ? "text-green-400" : "text-red-400")}>
          Status: {currentObjective.isCompleted() ? "Completed" : "In Progress"}
        </p>
      </div>
    );
  };

  const renderChronicles = () => (
    <div ref={logRef} className="h-full w-full p-2 bg-black/20 text-amber-50 text-sm font-mono overflow-y-auto flex flex-col-reverse">
      <div>
        {gameLog.map((message, index) => (<p key={index} className="mb-1 last:mb-0 animate-in fade-in duration-500">{`> ${message}`}</p>))}
      </div>
    </div>
  );

  const renderHud = () => (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-lg bg-stone-900/80 backdrop-blur-sm border-t-2 border-amber-700/70 rounded-t-lg p-2 px-6 shadow-2xl shadow-black/50">
      <div className="flex justify-center items-center gap-x-6 gap-y-2 text-amber-50 flex-wrap">
        <div className="flex items-center gap-2" title="Health">
          <Heart className="text-red-500" size={20} />
          <span className="font-bold text-lg">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-amber-800" />
        <div className="flex items-center gap-2" title="Attack">
          <Sword className="text-orange-400" size={20} />
          <span className="font-bold text-lg">{labyrinth.getCurrentAttackDamage()}</span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-amber-800" />
        <div className="flex items-center gap-2" title="Defense">
          <Shield className="text-blue-400" size={20} />
          <span className="font-bold text-lg">{labyrinth.getCurrentDefense()}</span>
        </div>
        <Separator orientation="vertical" className="h-6 bg-amber-800" />
        <div className="flex items-center gap-2" title="Search Radius">
          <Target className="text-purple-400" size={20} />
          <span className="font-bold text-lg">{labyrinth.getSearchRadius()}</span>
        </div>
      </div>
    </div>
  );

  if (!gameStarted) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundImage: "url('/Eldoria.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="relative w-full max-w-screen-2xl mx-auto h-[calc(100vh-2rem)] bg-black/50 backdrop-blur-sm border-2 border-amber-900/50 shadow-2xl shadow-black/50 rounded-lg p-4 flex flex-col md:flex-row gap-4">
        <main className="flex-grow h-1/2 md:h-full relative bg-black rounded-md overflow-hidden border border-amber-900/50">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center z-10">
            <h3 className="text-lg font-bold text-orange-300 bg-black/50 px-3 py-1 rounded">
              Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})
            </h3>
          </div>
          {renderMap()}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center text-stone-300 text-xs z-10 bg-black/50 p-1 px-2 rounded">
            <p>Move: <span className="font-bold text-amber-200">WASD/Arrows</span> | Search: <span className="font-bold text-amber-200">F/Shift</span> | Interact: <span className="font-bold text-amber-200">E/Ctrl</span></p>
          </div>
        </main>

        <aside className="w-full md:w-96 lg:w-[450px] flex-shrink-0 bg-stone-900/70 border border-amber-800/60 rounded-lg flex flex-col overflow-hidden">
          <Tabs defaultValue="log" className="flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-3 bg-stone-950/50 rounded-b-none">
              <TabsTrigger value="log" className="text-stone-400 data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200"><BookOpen className="w-4 h-4 mr-2"/>Chronicles</TabsTrigger>
              <TabsTrigger value="inventory" className="text-stone-400 data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200"><Backpack className="w-4 h-4 mr-2"/>Inventory</TabsTrigger>
              <TabsTrigger value="objective" className="text-stone-400 data-[state=active]:bg-amber-900/50 data-[state=active]:text-amber-200"><Scroll className="w-4 h-4 mr-2"/>Objective</TabsTrigger>
            </TabsList>
            <TabsContent value="log" className="flex-grow relative">{renderChronicles()}</TabsContent>
            <TabsContent value="inventory" className="flex-grow relative">{renderInventory()}</TabsContent>
            <TabsContent value="objective" className="flex-grow relative">{renderObjective()}</TabsContent>
          </Tabs>
          <div className="p-2 border-t border-amber-800/60 bg-stone-950/50">
            <p className="text-xs text-stone-500 text-center">Donations: <span className="font-mono text-stone-400">0x3Ab5...6EE8</span></p>
          </div>
        </aside>

        {renderHud()}
        
        {labyrinth.isGameOver() && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <Button onClick={onGameRestart} size="lg" className="bg-amber-600 hover:bg-amber-500 text-white text-xl px-8 py-6">Restart Journey</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabyrinthGame;