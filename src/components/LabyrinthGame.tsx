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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const emojiMap: { [key: string]: string } = {
  "Grumbling Goblin": "👹",
  "Rattling Skeleton": "💀",
  "Whispering Shadow": "👻",
  "The Watcher of the Core": "👁️",
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
  // Decorative elements will now be rendered as SVG symbols, not emojis.
};

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, startTime, elapsedTime, onGameOver, onGameRestart, gameResult }) => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0);
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const [flashingEntityId, setFlashingEntityId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for the game container

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
    // Only return emojis for non-decorative elements
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

    // Filter decorative elements to only show those within the viewport
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
          {/* Floor Pattern inspired by tileset */}
          <pattern id="floor-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#3a2d3c" /> {/* Dark purple-brown base */}
            <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" /> {/* Subtle grid lines */}
            <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
            <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
          </pattern>
          {/* Wall Pattern inspired by tileset */}
          <pattern id="wall-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#5a4d5c" /> {/* Slightly lighter purple-brown base */}
            <path d="M 0 0.2 L 1 0.2 M 0 0.8 L 1 0.8 M 0.2 0 L 0.2 1 M 0.8 0 L 0.8 1" stroke="#6a5d6c" strokeWidth="0.1" /> {/* Brick-like lines */}
          </pattern>
          <mask id="fog-mask">
            <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="black" />
            {Array.from(visitedCells).map(cellCoord => {
              const [x, y] = cellCoord.split(',').map(Number);
              return <circle key={cellCoord} cx={x + 0.5} cy={y + 0.5} r={labyrinth.getSearchRadius()} fill="white" />;
            })}
          </mask>

          {/* Decorative Element Symbols - Multiple variations for floor elements */}
          <symbol id="rubble-1" viewBox="0 0 1 1">
            <rect x="0.1" y="0.1" width="0.3" height="0.2" fill="#8b4513" />
            <rect x="0.5" y="0.4" width="0.2" height="0.3" fill="#8b4513" />
            <rect x="0.2" y="0.6" width="0.4" height="0.2" fill="#8b4513" />
          </symbol>
          <symbol id="rubble-2" viewBox="0 0 1 1">
            <rect x="0.05" y="0.5" width="0.2" height="0.15" fill="#8b4513" />
            <rect x="0.3" y="0.2" width="0.3" height="0.25" fill="#8b4513" />
            <rect x="0.6" y="0.6" width="0.25" height="0.2" fill="#8b4513" />
          </symbol>
          <symbol id="rubble-3" viewBox="0 0 1 1">
            <rect x="0.4" y="0.1" width="0.2" height="0.3" fill="#8b4513" />
            <rect x="0.1" y="0.7" width="0.35" height="0.2" fill="#8b4513" />
            <rect x="0.65" y="0.3" width="0.2" height="0.25" fill="#8b4513" />
          </symbol>

          <symbol id="moss-1" viewBox="0 0 1 1">
            <path d="M0.1 0.5 Q0.3 0.2 0.5 0.3 T0.9 0.5 Q0.7 0.8 0.5 0.7 T0.1 0.5Z" fill="#6b8e23" />
          </symbol>
          <symbol id="moss-2" viewBox="0 0 1 1">
            <path d="M0.2 0.3 Q0.4 0.1 0.6 0.2 T0.8 0.4 Q0.6 0.7 0.4 0.6 T0.2 0.3Z" fill="#6b8e23" />
            <path d="M0.3 0.7 Q0.5 0.5 0.7 0.6 T0.9 0.8 Q0.7 1.0 0.5 0.9 T0.3 0.7Z" fill="#6b8e23" />
          </symbol>
          <symbol id="moss-3" viewBox="0 0 1 1">
            <circle cx="0.3" cy="0.4" r="0.15" fill="#6b8e23" />
            <circle cx="0.7" cy="0.6" r="0.1" fill="#6b8e23" />
            <circle cx="0.5" cy="0.8" r="0.12" fill="#6b8e23" />
          </symbol>

          <symbol id="glowing_fungi-1" viewBox="0 0 1 1">
            <circle cx="0.5" cy="0.6" r="0.2" fill="#8b4513" /> {/* Cap */}
            <rect x="0.45" y="0.6" width="0.1" height="0.3" fill="#8b4513" /> {/* Stem */}
            <circle cx="0.5" cy="0.6" r="0.1" fill="#ffcc00" className="animate-pulse-slow" /> {/* Glow */}
          </symbol>
          <symbol id="glowing_fungi-2" viewBox="0 0 1 1">
            <circle cx="0.3" cy="0.7" r="0.15" fill="#8b4513" />
            <rect x="0.27" y="0.7" width="0.06" height="0.2" fill="#8b4513" />
            <circle cx="0.3" cy="0.7" r="0.08" fill="#ffcc00" className="animate-pulse-slow" />
            <circle cx="0.7" cy="0.5" r="0.1" fill="#8b4513" />
            <rect x="0.68" y="0.5" width="0.04" height="0.15" fill="#8b4513" />
            <circle cx="0.7" cy="0.5" r="0.05" fill="#ffcc00" className="animate-pulse-slow" />
          </symbol>
          <symbol id="glowing_fungi-3" viewBox="0 0 1 1">
            <circle cx="0.6" cy="0.4" r="0.18" fill="#8b4513" />
            <rect x="0.57" y="0.4" width="0.06" height="0.25" fill="#8b4513" />
            <circle cx="0.6" cy="0.4" r="0.09" fill="#ffcc00" className="animate-pulse-slow" />
          </symbol>

          <symbol id="puddle-1" viewBox="0 0 1 1">
            <path d="M0.2 0.5 Q0.3 0.2 0.5 0.3 T0.8 0.5 Q0.7 0.8 0.5 0.7 T0.2 0.5Z" fill="#4682b4" />
          </symbol>
          <symbol id="puddle-2" viewBox="0 0 1 1">
            <ellipse cx="0.5" cy="0.5" rx="0.3" ry="0.2" fill="#4682b4" />
          </symbol>
          <symbol id="puddle-3" viewBox="0 0 1 1">
            <path d="M0.1 0.3 L0.4 0.1 L0.7 0.3 L0.9 0.6 L0.6 0.9 L0.3 0.7 Z" fill="#4682b4" />
          </symbol>

          <symbol id="cracks-1" viewBox="0 0 1 1">
            <path d="M0.1 0.1 L0.4 0.3 L0.3 0.5 L0.6 0.7 L0.5 0.9" stroke="#6a5d6c" strokeWidth="0.05" fill="none" />
            <path d="M0.9 0.1 L0.7 0.4 L0.8 0.6" stroke="#6a5d6c" strokeWidth="0.05" fill="none" />
          </symbol>
          <symbol id="cracks-2" viewBox="0 0 1 1">
            <path d="M0.2 0.8 L0.5 0.5 L0.8 0.8 M0.5 0.5 L0.5 0.2" stroke="#6a5d6c" strokeWidth="0.04" fill="none" />
          </symbol>
          <symbol id="cracks-3" viewBox="0 0 1 1">
            <path d="M0.1 0.5 L0.3 0.3 L0.5 0.5 L0.7 0.3 L0.9 0.5" stroke="#6a5d6c" strokeWidth="0.03" fill="none" />
          </symbol>

          <symbol id="bones-1" viewBox="0 0 1 1">
            <circle cx="0.2" cy="0.5" r="0.1" fill="#f0f0f0" />
            <rect x="0.2" y="0.45" width="0.6" height="0.1" fill="#f0f0f0" />
            <circle cx="0.8" cy="0.5" r="0.1" fill="#f0f0f0" />
          </symbol>
          <symbol id="bones-2" viewBox="0 0 1 1">
            <rect x="0.1" y="0.3" width="0.2" height="0.08" fill="#f0f0f0" />
            <rect x="0.3" y="0.4" width="0.4" height="0.08" fill="#f0f0f0" />
            <rect x="0.6" y="0.5" width="0.2" height="0.08" fill="#f0f0f0" />
          </symbol>
          <symbol id="bones-3" viewBox="0 0 1 1">
            <path d="M0.2 0.2 L0.3 0.4 L0.5 0.3 L0.7 0.5 L0.6 0.7 L0.4 0.6 L0.2 0.8 Z" fill="#f0f0f0" />
          </symbol>

          <symbol id="crate-1" viewBox="0 0 1 1">
            <rect x="0.1" y="0.1" width="0.8" height="0.8" fill="#8b4513" stroke="#5a2d0c" strokeWidth="0.05" />
            <line x1="0.1" y1="0.5" x2="0.9" y2="0.5" stroke="#5a2d0c" strokeWidth="0.05" />
            <line x1="0.5" y1="0.1" x2="0.5" y2="0.9" stroke="#5a2d0c" strokeWidth="0.05" />
          </symbol>
          <symbol id="crate-2" viewBox="0 0 1 1">
            <rect x="0.15" y="0.15" width="0.7" height="0.7" fill="#8b4513" stroke="#5a2d0c" strokeWidth="0.04" />
            <line x1="0.15" y1="0.4" x2="0.85" y2="0.4" stroke="#5a2d0c" strokeWidth="0.04" />
            <line x1="0.15" y1="0.65" x2="0.85" y2="0.65" stroke="#5a2d0c" strokeWidth="0.04" />
          </symbol>
          <symbol id="crate-3" viewBox="0 0 1 1">
            <rect x="0.2" y="0.2" width="0.6" height="0.6" fill="#8b4513" stroke="#5a2d0c" strokeWidth="0.03" />
            <line x1="0.2" y1="0.5" x2="0.8" y2="0.5" stroke="#5a2d0c" strokeWidth="0.03" />
            <line x1="0.5" y1="0.2" x2="0.5" y2="0.8" stroke="#5a2d0c" strokeWidth="0.03" />
            <circle cx="0.5" cy="0.5" r="0.05" fill="#5a2d0c" />
          </symbol>

          {/* Torch Symbols (wall-mounted) */}
          <symbol id="torch_unlit" viewBox="0 0 1 1">
            <rect x="0.4" y="0.4" width="0.2" height="0.5" fill="#8b4513" /> {/* Stick */}
            <circle cx="0.5" cy="0.4" r="0.15" fill="#333" /> {/* Unlit top */}
            <rect x="0.45" y="0.6" width="0.1" height="0.05" fill="#5a2d0c" /> {/* Wall mount detail */}
          </symbol>
          <symbol id="torch_lit" viewBox="0 0 1 1">
            <rect x="0.4" y="0.4" width="0.2" height="0.5" fill="#8b4513" /> {/* Stick */}
            <rect x="0.45" y="0.6" width="0.1" height="0.05" fill="#5a2d0c" /> {/* Wall mount detail */}
            <path d="M0.5 0.2 L0.4 0.4 L0.5 0.3 L0.6 0.4 Z" fill="#ffa500" className="animate-pulse-fast" /> {/* Flame */}
            <circle cx="0.5" cy="0.3" r="0.2" fill="rgba(255,165,0,0.3)" className="animate-pulse-fast" /> {/* Glow */}
          </symbol>

        </defs>
        <g mask="url(#fog-mask)">
          <path d={floorPath} className="fill-[url(#floor-pattern)]" />
          <path d={wallPath} className="fill-[url(#wall-pattern)] stroke-[#4a3d4c]" strokeWidth={0.05} /> {/* Adjusted stroke color */}
          {/* Render decorative elements using <use> tags */}
          {visibleDecorativeElements.map(([coordStr, type]) => {
            const [x, y] = coordStr.split(',').map(Number);
            // The animation class is now part of the symbol definition for glowing_fungi and torch_lit
            return (
              <use
                key={`deco-${coordStr}`}
                href={`#${type}`}
                x={x}
                y={y}
                width="1"
                height="1"
              />
            );
          })}
          {Array.from(labyrinth.enemyLocations.entries()).map(([coordStr, enemyId]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            const enemy = labyrinth.getEnemy(enemyId);
            if (!enemy || enemy.defeated) return null;
            return <text key={`enemy-${enemyId}`} x={x + 0.5} y={y + 0.5} fontSize="0.8" textAnchor="middle" dominantBaseline="central" className={cn(enemy.id.includes('watcher') && 'animate-pulse', flashingEntityId === enemy.id && 'is-flashing')}>{getEmojiForElement(enemy.name)}</text>;
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
        {/* Adventurer Sprite */}
        <image
          href={adventurerSprite}
          x={playerLoc.x - 0.3}
          y={playerLoc.y - 0.3}
          width="1.6"
          height="1.6"
          className={cn(flashingEntityId === 'player' && 'is-flashing')}
        />
      </svg>
    );
  };

  const renderInventory = () => {
    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const equippedAmulet = labyrinth.getEquippedAmulet();
    const equippedCompass = labyrinth.getEquippedCompass();
    const inventoryItems = labyrinth.getInventoryItems();

    return (
      <ScrollArea className="h-full w-full">
        <div className="p-4 text-amber-50">
          <h3 className="text-lg font-bold text-amber-300 mb-3 text-center">Equipped Gear</h3>
          <div className="space-y-3 mb-6">
            {equippedWeapon ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 text-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-200 flex items-center"><Sword className="w-4 h-4 mr-2 text-orange-400"/> {equippedWeapon.name}</p>
                  <p className="text-xs text-stone-300 italic mt-1">{equippedWeapon.description}</p>
                </div>
              </div>
            ) : (
              <p className="italic text-stone-400 text-center">No weapon equipped.</p>
            )}
            {equippedShield ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 text-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-200 flex items-center"><Shield className="w-4 h-4 mr-2 text-blue-400"/> {equippedShield.name}</p>
                  <p className="text-xs text-stone-300 italic mt-1">{equippedShield.description}</p>
                </div>
              </div>
            ) : (
              <p className="italic text-stone-400 text-center">No shield equipped.</p>
            )}
            {equippedAmulet ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 text-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-200 flex items-center"><Gem className="w-4 h-4 mr-2 text-purple-400"/> {equippedAmulet.name}</p>
                  <p className="text-xs text-stone-300 italic mt-1">{equippedAmulet.description}</p>
                </div>
                <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(equippedAmulet.id)}>
                  Unequip
                </Button>
              </div>
            ) : (
              <p className="italic text-stone-400 text-center">No amulet equipped.</p>
            )}
            {equippedCompass ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 text-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-amber-200 flex items-center"><Compass className="w-4 h-4 mr-2 text-green-400"/> {equippedCompass.name}</p>
                  <p className="text-xs text-stone-300 italic mt-1">{equippedCompass.description}</p>
                </div>
                <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(equippedCompass.id)}>
                  Unequip
                </Button>
              </div>
            ) : (
              <p className="italic text-stone-400 text-center">No compass equipped.</p>
            )}
          </div>

          <Separator className="my-4 bg-amber-800/60" />

          <h3 className="text-lg font-bold text-amber-300 mb-3 text-center">Backpack</h3>
          {inventoryItems.length === 0 ? (
            <p className="italic text-stone-400 text-center">Your backpack is empty.</p>
          ) : (
            <ul className="space-y-3">
              {inventoryItems.map(({ item, quantity }) => {
                const isEquippable = ['weapon', 'shield', 'accessory'].includes(item.type);
                // Check if item is in an equipped slot (weapon, shield, amulet, compass)
                const isCurrentlyEquipped = (equippedWeapon?.id === item.id) || (equippedShield?.id === item.id) || (equippedAmulet?.id === item.id) || (equippedCompass?.id === item.id);

                // Only display items in the backpack that are not currently equipped in a dedicated slot
                if (isCurrentlyEquipped) return null;

                return (
                  <li key={item.id} className="p-2 bg-black/20 rounded border border-amber-900/50 text-sm">
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
    <div className="absolute top-2 right-2 w-auto bg-stone-900/80 backdrop-blur-sm border-b-2 border-amber-700/70 rounded-b-lg p-1 px-3 shadow-2xl shadow-black/50">
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

  if (!gameStarted) return null; // LabyrinthGame only renders if gameStarted is true

  return (
    <div 
      ref={gameContainerRef} // Attach the ref here
      tabIndex={0} // Make the div focusable
      className="flex items-center justify-center h-full p-4 focus:outline-none" // Add focus styling
    >
      <div className="relative w-full max-w-screen-2xl mx-auto h-[calc(100vh-2rem)] bg-black/50 backdrop-blur-sm border-2 border-amber-900/50 shadow-2xl shadow-black/50 rounded-lg p-4 flex flex-col md:flex-row gap-4">
        <main className="flex-grow h-1/2 md:h-full relative bg-black rounded-md overflow-hidden border border-amber-900/50">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center z-10">
            <h3 className="text-lg font-bold text-orange-300 bg-black/50 px-3 py-1 rounded">
              Ancient Map ({labyrinth.getPlayerLocation().x},{labyrinth.getPlayerLocation().y})
            </h3>
          </div>
          {renderMap()}
          <div className="absolute top-2 left-2 text-center text-stone-300 text-xs z-10 bg-black/50 p-1 px-2 rounded">
            <p>Move: <span className="font-bold text-amber-200">Arrows</span> | Search: <span className="font-bold text-amber-200">Shift</span> | Interact: <span className="font-bold text-amber-200">Ctrl</span></p>
          </div>
          {renderHud()}
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
            <p className="text-xs text-stone-500 text-center">Donations: <span className="font-mono text-stone-400">0x742d35Cc6634C0532925a3b844Bc454e4438f444</span></p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LabyrinthGame;