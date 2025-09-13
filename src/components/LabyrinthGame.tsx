"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Labyrinth, LogicalRoom, Item, GameResult } from "@/lib/game"; // Import GameResult
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sword, Heart, Shield, Target, Goal, BookOpen, Backpack, Scroll, Gem, Compass } from "lucide-react"; // Added Gem and Compass icons
import { useIsMobile } from "@/hooks/use-mobile";
import { generateSvgPaths } from "@/lib/map-renderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Keep Tabs for now, but won't use for inventory/objective
import GameOverScreen from "@/components/GameOverScreen"; // Import GameOverScreen

// Import adventurer sprites from the new assets location
import AdventurerNorth from "@/assets/sprites/adventurer/adventurer-north.svg";
import AdventurerSouth from "@/assets/sprites/adventurer/adventurer-south.svg";
import AdventurerEast from "@/assets/sprites/adventurer/adventurer-east.svg";
import AdventurerWest from "@/assets/sprites/adventurer/adventurer-west.svg";
import AdventurerNorthSword from "@/assets/sprites/adventurer/adventurer-north-sword.svg";
import AdventurerSouthSword from "@/assets/sprites/adventurer/adventurer-south-sword.svg";
import AdventurerEastSword from "@/assets/sprites/adventurer/adventurer-east-sword.svg";
import AdventurerWestSword from "@/assets/sprites/adventurer/adventurer-west-sword.svg";
import AdventurerNorthShield from "@/assets/sprites/adventurer/adventurer-north-shield.svg";
import AdventurerSouthShield from "@/assets/sprites/adventurer/adventurer-south-shield.svg";
import AdventurerEastShield from "@/assets/sprites/adventurer/adventurer-east-shield.svg";
import AdventurerWestShield from "@/assets/sprites/adventurer/adventurer-west-shield.svg";
import AdventurerNorthSwordShield from "@/assets/sprites/adventurer/adventurer-north-sword-shield.svg";
import AdventurerSouthSwordShield from "@/assets/sprites/adventurer/adventurer-south-sword-shield.svg";
import AdventurerEastSwordShield from "@/assets/sprites/adventurer/adventurer-east-sword-shield.svg";
import AdventurerWestSwordShield from "@/assets/sprites/adventurer/adventurer-west-sword-shield.svg";

// Import enemy sprites
import GoblinSprite from "@/assets/sprites/enemies/goblin.svg";
import SkeletonSprite from "@/assets/sprites/enemies/skeleton.svg";
import ShadowSprite from "@/assets/sprites/enemies/shadow.svg";
import WatcherSprite from "@/assets/sprites/enemies/watcher.svg";

interface LabyrinthGameProps {
  playerName: string;
  gameStarted: boolean;
  startTime: number | null;
  elapsedTime: number;
  onGameOver: (result: GameResult) => void; // Use GameResult interface
  onGameRestart: () => void;
  gameResult: GameResult | null; // New prop for game result
}

const ENEMY_MOVE_SPEEDS_MS = [2000, 1500, 1000, 500];

const enemySpriteMap: { [key: string]: string } = {
  "Grumbling Goblin": GoblinSprite,
  "Rattling Skeleton": SkeletonSprite,
  "Whispering Shadow": ShadowSprite,
  "The Watcher of the Core": WatcherSprite,
};

const emojiMap: { [key: string]: string } = {
  "Vial of Lumina": "🧪",
  "Blade of the Labyrinth": "🗡️",
  "Aegis of the Guardian": "🛡️",
  "Tattered Journal": "📜",
  "Pulsating Crystal": "🔮",
  "Scholar's Amulet": "💎",
  "Enchanted Flask": "🍶",
  "Living Water": "💧",
  "Whispering Well's Blessing": "✨",
  "Broken Compass": "🧭",
  "Artisan's Fine Tools": "🛠️",
  "Prismatic Lens": "🌈",
  "True Compass": "🗺️",
  "Labyrinth Key": "🔑",
  "Heart of the Labyrinth": "❤️‍🔥",
  "Ancient Mechanism": "⚙️",
  "Whispering Well": "🕳️",
  "Hidden Spring": "🌿",
  "Ancient Repair Bench": "🔨",
  "Mysterious Box": "📦",
  "Ancient Altar": "🛐",
  "Mysterious Staircase": "🪜",
  "Grand Riddle of Eternity": "❓",
  "Triggered Trap": "☠️",
};

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, startTime, elapsedTime, onGameOver, onGameRestart, gameResult }) => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const [flashingEntityId, setFlashingEntityId] = useState<string | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for the game container

  useEffect(() => {
    if (gameStarted) {
      setLabyrinth(new Labyrinth());
      setGameVersion(0);
      setHasGameOverBeenDispatched(false);
    }
  }, [gameStarted]);

  useEffect(() => {
    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      // If you want to display messages elsewhere, you'd handle them here.
      // For now, they are just cleared.
      labyrinth.clearMessages();
    }
    if (labyrinth.isGameOver() && !hasGameOverBeenDispatched) {
      const result = labyrinth.getGameResult();
      if (result) {
        onGameOver(result);
        setHasGameOverBeenDispatched(true);
      }
    }
    const hitId = labyrinth.lastHitEntityId;
    if (hitId) {
      setFlashingEntityId(hitId);
      setTimeout(() => {
        setFlashingEntityId(null);
      }, 200);
      labyrinth.clearLastHit();
    }
  }, [gameVersion, labyrinth, onGameOver, hasGameOverBeenDispatched]);

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

    const gameElement = gameContainerRef.current;
    if (gameElement) {
      gameElement.addEventListener("keydown", handleKeyDown);
      gameElement.focus(); // Automatically focus the game container when it mounts
    }
    return () => {
      if (gameElement) {
        gameElement.removeEventListener("keydown", handleKeyDown);
      }
    };
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

    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const direction = labyrinth.lastMoveDirection;

    const spriteMap = {
      default: {
        north: AdventurerNorth,
        south: AdventurerSouth,
        east: AdventurerEast,
        west: AdventurerWest,
      },
      sword: {
        north: AdventurerNorthSword,
        south: AdventurerSouthSword,
        east: AdventurerEastSword,
        west: AdventurerWestSword,
      },
      shield: {
        north: AdventurerNorthShield,
        south: AdventurerSouthShield,
        east: AdventurerEastShield,
        west: AdventurerWestShield,
      },
      sword_shield: {
        north: AdventurerNorthSwordShield,
        south: AdventurerSouthSwordShield,
        east: AdventurerEastSwordShield,
        west: AdventurerWestSwordShield,
      },
    };

    let equipmentState: keyof typeof spriteMap = 'default';
    if (equippedWeapon && equippedShield) {
      equipmentState = 'sword_shield';
    } else if (equippedWeapon) {
      equipmentState = 'sword';
    } else if (equippedShield) {
      equipmentState = 'shield';
    }

    const adventurerSprite = spriteMap[equipmentState][direction];

    const visibleDecorativeElements = Array.from(labyrinth.getDecorativeElements().entries()).filter(([coordStr, type]) => {
      const [x, y, f] = coordStr.split(',').map(Number);
      if (f !== currentFloor) return false;
      const isVisible = x >= playerLoc.x - viewportSize / 2 && x < playerLoc.x + viewportSize / 2 &&
                        y >= playerLoc.y - viewportSize / 2 && y < playerLoc.y + viewportSize / 2;
      return isVisible;
    });

    return (
      <svg viewBox={viewBox} className="w-full h-full" shapeRendering="crispEdges">
        <defs>
          <pattern id="floor-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#3a2d3c" />
            <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" />
            <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
            <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
          </pattern>
          <pattern id="wall-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#5a4d5c" />
            <path d="M 0 0.2 L 1 0.2 M 0 0.8 L 1 0.8 M 0.2 0 L 0.2 1 M 0.8 0 L 0.8 1" stroke="#6a5d6c" strokeWidth="0.1" />
          </pattern>
          <mask id="fog-mask">
            <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="black" />
            {Array.from(visitedCells).map(cellCoord => {
              const [x, y] = cellCoord.split(',').map(Number);
              return <circle key={cellCoord} cx={x + 0.5} cy={y + 0.5} r={labyrinth.getSearchRadius()} fill="white" />;
            })}
          </mask>
          {/* Decorative Elements - Only Torches */}
          <symbol id="torch_unlit" viewBox="0 0 1 1">
            <rect x="0.4" y="0.4" width="0.2" height="0.5" fill="#8b4513" />
            <circle cx="0.5" cy="0.4" r="0.15" fill="#333" />
            <rect x="0.45" y="0.6" width="0.1" height="0.05" fill="#5a2d0c" />
            <path d="M0.4 0.4 L0.45 0.35 L0.55 0.35 L0.6 0.4 Z" fill="#222" /> {/* Top shading */}
          </symbol>
          <symbol id="torch_lit" viewBox="0 0 1 1">
            <rect x="0.4" y="0.4" width="0.2" height="0.5" fill="#8b4513" />
            <rect x="0.45" y="0.6" width="0.1" height="0.05" fill="#5a2d0c" />
            <path d="M0.5 0.2 L0.4 0.4 L0.5 0.3 L0.6 0.4 Z" fill="#ffa500" className="animate-pulse-fast" />
            <circle cx="0.5" cy="0.3" r="0.2" fill="rgba(255,165,0,0.3)" className="animate-pulse-fast" />
            <circle cx="0.5" cy="0.3" r="0.4" fill="url(#torch-light-gradient)" opacity="0.4" className="animate-pulse-fast" />
            <radialGradient id="torch-light-gradient">
              <stop offset="0%" stopColor="#ffcc00" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffcc00" stopOpacity="0" />
            </radialGradient>
          </symbol>
        </defs>
        <g mask="url(#fog-mask)">
          <path d={floorPath} className="fill-[url(#floor-pattern)]" />
          <path d={wallPath} className="fill-[url(#wall-pattern)] stroke-[#4a3d4c]" strokeWidth={0.05} />
          {visibleDecorativeElements.map(([coordStr, type]) => {
            const [x, y] = coordStr.split(',').map(Number);
            return <use key={`deco-${coordStr}`} href={`#${type}`} x={x} y={y} width="1" height="1" />;
          })}
          {Array.from(labyrinth.enemyLocations.entries()).map(([coordStr, enemyId]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            const enemy = labyrinth.getEnemy(enemyId);
            if (!enemy || enemy.defeated) return null;
            const enemySprite = enemySpriteMap[enemy.name];
            if (enemySprite) {
              return (
                <image
                  key={`enemy-${enemyId}`}
                  href={enemySprite}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  className={cn(enemy.id.includes('watcher') && 'animate-pulse', flashingEntityId === enemy.id && 'is-flashing')}
                />
              );
            }
            return null;
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
        <image
          href={adventurerSprite}
          x={playerLoc.x - 0.3}
          y={playerLoc.y - 0.6}
          width="1.6"
          height="1.6"
          className={cn(flashingEntityId === 'player' && 'is-flashing')}
        />
      </svg>
    );
  };

  const renderSidebarContent = () => {
    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const equippedAmulet = labyrinth.getEquippedAmulet();
    const equippedCompass = labyrinth.getEquippedCompass();
    const inventoryItems = labyrinth.getInventoryItems();
    const currentObjective = labyrinth.getCurrentFloorObjective();

    return (
      <ScrollArea className="h-full w-full">
        <div className="p-4 text-amber-50">
          <h4 className="text-md font-bold text-amber-300 mb-2">Equipped Gear</h4>
          <div className="space-y-2 mb-4 text-sm">
            {equippedWeapon ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 flex justify-between items-center">
                <p className="font-bold text-amber-200 flex items-center"><Sword className="w-4 h-4 mr-2 text-orange-400"/> {equippedWeapon.name}</p>
              </div>
            ) : (
              <p className="italic text-stone-400">No weapon equipped.</p>
            )}
            {equippedShield ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 flex justify-between items-center">
                <p className="font-bold text-amber-200 flex items-center"><Shield className="w-4 h-4 mr-2 text-blue-400"/> {equippedShield.name}</p>
              </div>
            ) : (
              <p className="italic text-stone-400">No shield equipped.</p>
            )}
            {equippedAmulet ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 flex justify-between items-center">
                <p className="font-bold text-amber-200 flex items-center"><Gem className="w-4 h-4 mr-2 text-purple-400"/> {equippedAmulet.name}</p>
                <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(equippedAmulet.id)}>
                  Unequip
                </Button>
              </div>
            ) : (
              <p className="italic text-stone-400">No amulet equipped.</p>
            )}
            {equippedCompass ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-200 flex items-center"><Compass className="w-4 h-4 mr-2 text-green-400"/> {equippedCompass.name}</p>
                </div>
                <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(equippedCompass.id)}>
                  Unequip
                </Button>
              </div>
            ) : (
              <p className="italic text-stone-400">No compass equipped.</p>
            )}
          </div>

          <Separator className="my-4 bg-amber-800/60" />

          <h4 className="text-md font-bold text-amber-300 mb-2">Backpack</h4>
          {inventoryItems.length === 0 ? (
            <p className="italic text-stone-400 text-center">Your backpack is empty.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {inventoryItems.map(({ item, quantity }) => {
                const isEquippable = ['weapon', 'shield', 'accessory'].includes(item.type);
                const isCurrentlyEquipped = (equippedWeapon?.id === item.id) || (equippedShield?.id === item.id) || (equippedAmulet?.id === item.id) || (equippedCompass?.id === item.id);
                if (isCurrentlyEquipped) return null;
                return (
                  <li key={item.id} className="p-2 bg-black/20 rounded border border-amber-900/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-amber-200">{item.name} {item.stackable && `(x${quantity})`}</p>
                        <p className="text-xs text-stone-300 italic mt-1">{item.description}</p>
                      </div>
                      {(item.type === 'consumable' || isEquippable) && (
                        <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(item.id)}>
                          {isEquippable ? 'Equip' : 'Use'}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <Separator className="my-4 bg-amber-800/60" />

          <h4 className="text-md font-bold text-amber-300 mb-2">Objective: Floor {labyrinth.getCurrentFloor() + 1}</h4>
          <div className="p-2 text-center text-amber-50 flex flex-col items-center justify-center">
            <ul className="list-disc list-inside text-left space-y-1 text-sm text-stone-300 italic mt-1">
              {currentObjective.description.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
            <p className={cn("text-sm font-semibold mt-4", currentObjective.isCompleted() ? "text-green-400" : "text-red-400")}>
              Status: {currentObjective.isCompleted() ? "Completed" : "In Progress"}
            </p>
          </div>
        </div>
      </ScrollArea>
    );
  };

  const renderHud = () => (
    <div className="absolute bottom-2 right-2 w-auto bg-stone-900/80 backdrop-blur-sm border-t-2 border-amber-700/70 rounded-t-lg p-1 px-3 shadow-2xl shadow-black/50">
      <div className="flex justify-center items-center gap-x-3 gap-y-1 text-amber-50 flex-wrap text-xs">
        <div className="flex items-center gap-1" title="Health">
          <Heart className="text-red-500" size={10} />
          <span className="font-bold">{labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-amber-800" />
        <div className="flex items-center gap-1" title="Attack">
          <Sword className="text-orange-400" size={10} />
          <span className="font-bold">{labyrinth.getCurrentAttackDamage()}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-amber-800" />
        <div className="flex items-center gap-1" title="Defense">
          <Shield className="text-blue-400" size={10} />
          <span className="font-bold">{labyrinth.getCurrentDefense()}</span>
        </div>
        <Separator orientation="vertical" className="h-3 bg-amber-800" />
        <div className="flex items-center gap-1" title="Search Radius">
          <Target className="text-purple-400" size={10} />
          <span className="font-bold">{labyrinth.getSearchRadius()}</span>
        </div>
      </div>
    </div>
  );

  if (!gameStarted) return null;

  return (
    <div 
      ref={gameContainerRef}
      tabIndex={0}
      className="flex items-center justify-center h-full p-4 focus:outline-none"
    >
      <div className="relative w-full max-w-screen-2xl mx-auto h-[calc(100vh-2rem)] bg-black/50 backdrop-blur-sm border-2 border-amber-900/50 shadow-2xl shadow-black/50 rounded-lg p-4 flex flex-col md:flex-row gap-4">
        <main className="flex-grow h-1/2 md:h-full relative bg-black rounded-md overflow-hidden border border-amber-900/50">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center z-10">
            <h3 className="text-lg font-bold text-orange-300 bg-black/50 px-3 py-1 rounded">
              Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})
            </h3>
          </div>
          {renderMap()}
          <div className="absolute bottom-2 left-2 text-center text-stone-300 text-xs z-10 bg-black/50 p-1 px-2 rounded">
            <p>Move: <span className="font-bold text-amber-200">Arrows</span> | Search: <span className="font-bold text-amber-200">Shift</span> | Interact: <span className="font-bold text-amber-200">Ctrl</span></p>
          </div>
          {renderHud()}
        </main>

        <aside className="w-full md:w-96 lg:w-[450px] flex-shrink-0 bg-stone-900/70 border border-amber-800/60 rounded-lg flex flex-col overflow-hidden">
          {renderSidebarContent()}
          <div className="p-2 border-t border-amber-800/60 bg-stone-950/50">
            <p className="text-xs text-stone-500 text-center">Donations: <span className="font-mono text-stone-400">0x742d35Cc6634C0532925a3b844Bc454e4438f444</span></p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LabyrinthGame;