"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Labyrinth, LogicalRoom, Item, GameResult } from "@/lib/game"; // Import GameResult
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sword, Heart, Shield, Target, Goal, BookOpen, Backpack, Scroll, Gem, Compass, Skull } from "lucide-react"; // Added Skull icon
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

// Import new attack sprites
import AdventurerNorthAttack from "@/assets/sprites/adventurer/adventurer-north-attack.svg";
import AdventurerSouthAttack from "@/assets/sprites/adventurer/adventurer-south-attack.svg";
import AdventurerEastAttack from "@/assets/sprites/adventurer/adventurer-east-attack.svg";
import AdventurerWestAttack from "@/assets/sprites/adventurer/adventurer-west-attack.svg";
import AdventurerNorthSwordAttack from "@/assets/sprites/adventurer/adventurer-north-sword-attack.svg";
import AdventurerSouthSwordAttack from "@/assets/sprites/adventurer/adventurer-south-sword-attack.svg";
import AdventurerEastSwordAttack from "@/assets/sprites/adventurer/adventurer-east-sword-attack.svg";
import AdventurerWestSwordAttack from "@/assets/sprites/adventurer/adventurer-west-sword-attack.svg";
import AdventurerNorthShieldAttack from "@/assets/sprites/adventurer/adventurer-north-shield-attack.svg";
import AdventurerSouthShieldAttack from "@/assets/sprites/adventurer/adventurer-south-shield-attack.svg";
import AdventurerEastShieldAttack from "@/assets/sprites/adventurer/adventurer-east-shield-attack.svg";
import AdventurerWestShieldAttack from "@/assets/sprites/adventurer/adventurer-west-shield-attack.svg";
import AdventurerNorthSwordShieldAttack from "@/assets/sprites/adventurer/adventurer-north-sword-shield-attack.svg";
import AdventurerSouthSwordShieldAttack from "@/assets/sprites/adventurer/adventurer-south-sword-shield-attack.svg";
import AdventurerEastSwordShieldAttack from "@/assets/sprites/adventurer/adventurer-east-sword-shield-attack.svg";
import AdventurerWestSwordShieldAttack from "@/assets/sprites/adventurer/adventurer-west-sword-shield-attack.svg";


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
  onRevive: () => void; // New prop for revive action from Index
}

const ENEMY_MOVE_SPEEDS_MS = [2000, 1500, 1000, 500];
const ACTION_ANIMATION_DURATION = 300; // Milliseconds for attack/bash animation

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
  "Instant Death Trap": "💀", // NEW: Emoji for death trap
};

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, startTime, elapsedTime, onGameOver, onGameRestart, gameResult, onRevive }) => {
  const [labyrinth, setLabyrinth] = useState<Labyrinth>(new Labyrinth());
  const [gameVersion, setGameVersion] = useState(0);
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const [flashingEntityId, setFlashingEntityId] = useState<string | null>(null);
  const [verticalJumpOffset, setVerticalJumpOffset] = useState(0);
  const [animatedPlayerPosition, setAnimatedPlayerPosition] = useState(labyrinth.getPlayerLocation()); // Visual position for animation
  const [isAnimatingMovement, setIsAnimatingMovement] = useState(false); // New state to prevent actions during movement animation
  const [isPerformingAction, setIsPerformingAction] = useState(false); // New state for attack/bash animation
  const actionAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for action animation timeout
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for the game container

  // Ref to store the *last fully settled* logical position, used as the start of the next animation
  const lastSettledLogicalPositionRef = useRef(labyrinth.getPlayerLocation());

  // Initialize Labyrinth only when the component mounts or a new game is explicitly started (via key change)
  useEffect(() => {
    if (gameStarted) { // Only create a new Labyrinth if game is started
      const newLabyrinth = new Labyrinth();
      setLabyrinth(newLabyrinth);
      setAnimatedPlayerPosition(newLabyrinth.getPlayerLocation()); // Sync animated position
      lastSettledLogicalPositionRef.current = newLabyrinth.getPlayerLocation(); // Sync ref
      setGameVersion(0);
      setHasGameOverBeenDispatched(false);
      setIsPerformingAction(false); // Reset action animation state
      if (actionAnimationTimeoutRef.current) {
        clearTimeout(actionAnimationTimeoutRef.current);
        actionAnimationTimeoutRef.current = null;
      }
    }
  }, [gameStarted]); // Depend only on gameStarted for initial setup

  // Effect to smoothly animate player's visual position when game state position changes
  useEffect(() => {
    const newLogicalPos = labyrinth.getPlayerLocation();
    const currentFloor = labyrinth.getCurrentFloor(); // Also a dependency for re-triggering animation on floor change

    // Only animate if the logical position has actually changed from the last settled position
    if (newLogicalPos.x !== lastSettledLogicalPositionRef.current.x || newLogicalPos.y !== lastSettledLogicalPositionRef.current.y) {
      setIsAnimatingMovement(true); // Block input during animation

      const startX = lastSettledLogicalPositionRef.current.x;
      const startY = lastSettledLogicalPositionRef.current.y;
      const endX = newLogicalPos.x;
      const endY = newLogicalPos.y;
      const startTime = Date.now();

      const distance = Math.round(Math.max(Math.abs(endX - startX), Math.abs(endY - startY)));
      const wasJump = labyrinth.lastActionType === 'jump';

      let animationDuration = 200; // Default move duration
      let peakHeight = 0; // Default no vertical offset

      if (wasJump) {
        switch (distance) {
          case 3:
            animationDuration = 1000;
            peakHeight = -0.8;
            break;
          case 2:
            animationDuration = 700;
            peakHeight = -0.6;
            break;
          case 1:
            animationDuration = 400;
            peakHeight = -0.3;
            break;
          default:
            animationDuration = 200;
            peakHeight = 0;
        }
      }

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / animationDuration);

        const easedProgress = progress; // Linear progress for all movement

        const currentX = startX + (endX - startX) * easedProgress;
        const currentY = startY + (endY - startY) * easedProgress;

        setAnimatedPlayerPosition({ x: currentX, y: currentY });

        if (peakHeight !== 0) { // Only calculate vertical offset if it's a jump
          const distProgress = Math.max(0, Math.min(1, easedProgress));
          // A simple sine-based arc for all jumps
          const verticalOffset = peakHeight * Math.sin(distProgress * Math.PI);
          setVerticalJumpOffset(verticalOffset);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation finished
          setIsAnimatingMovement(false);
          setAnimatedPlayerPosition(newLogicalPos); // Ensure it snaps to final logical position
          lastSettledLogicalPositionRef.current = newLogicalPos; // Update ref to the new settled position
          setVerticalJumpOffset(0);

          // NEW: Clear jump-defeated enemy after animation
          if (labyrinth.lastJumpDefeatedEnemyId) {
            labyrinth.clearJumpDefeatedEnemy();
            setGameVersion(prev => prev + 1); // Trigger re-render to remove enemy
          }
        }
      };
      requestAnimationFrame(animate);
    }
  }, [labyrinth.getPlayerLocation().x, labyrinth.getPlayerLocation().y, labyrinth.getCurrentFloor()]); // Depend on actual game state player location and floor

  useEffect(() => {
    if (gameResult !== null) return; // Do not process game logic if game is over

    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
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
  }, [gameVersion, labyrinth, onGameOver, hasGameOverBeenDispatched, gameResult]); // Add gameResult to dependencies

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameStarted || gameResult !== null || isAnimatingMovement) return; // Do not allow input if game is over or animating
      switch (event.key.toLowerCase()) {
        case "arrowup":
        case "w":
          event.preventDefault(); handleMove("north"); break;
        case "arrowdown":
        case "s":
          event.preventDefault(); handleMove("south"); break;
        case "arrowleft":
        case "a":
          event.preventDefault(); handleMove("west"); break;
        case "arrowright":
        case "d":
          event.preventDefault(); handleMove("east"); break;
        case "q": event.preventDefault(); handleAttack(); break; // 'Q' for attack
        case " ": event.preventDefault(); handleJump(); break; // Space bar for jump
        case "shift": event.preventDefault(); handleSearch(); break;
        case "control": event.preventDefault(); handleInteract(); break;
        case "e": event.preventDefault(); handleShieldBash(); break; // 'e' for Shield Bash
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
  }, [gameStarted, labyrinth, playerName, elapsedTime, gameResult, isAnimatingMovement]); // Add gameResult and isAnimatingMovement to dependencies

  useEffect(() => {
    if (!gameStarted || gameResult !== null) return; // Do not process enemy movement if game is over
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
  }, [gameStarted, labyrinth, playerName, startTime, gameResult]); // Add gameResult to dependencies

  const triggerActionAnimation = () => {
    setIsPerformingAction(true);
    if (actionAnimationTimeoutRef.current) {
      clearTimeout(actionAnimationTimeoutRef.current);
    }
    actionAnimationTimeoutRef.current = setTimeout(() => {
      setIsPerformingAction(false);
      actionAnimationTimeoutRef.current = null;
    }, ACTION_ANIMATION_DURATION);
  };

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot move right now."); return; }
    labyrinth.move(direction, playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleAttack = () => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot attack right now."); return; }
    labyrinth.attack(playerName, elapsedTime);
    triggerActionAnimation(); // Trigger animation
    setGameVersion(prev => prev + 1);
  };

  const handleJump = () => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot jump right now."); return; }
    
    labyrinth.jump(playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleSearch = () => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot search right now."); return; }
    labyrinth.search();
    setGameVersion(prev => prev + 1);
  };

  const handleInteract = () => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot interact right now."); return; }
    labyrinth.interact(playerName, elapsedTime);
    setGameVersion(prev => prev + 1);
  };

  const handleShieldBash = () => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot perform Shield Bash right now."); return; }
    labyrinth.shieldBash(playerName, elapsedTime);
    triggerActionAnimation(); // Trigger animation
    setGameVersion(prev => prev + 1);
  };

  const handleUseItem = (itemId: string) => {
    if (gameResult !== null || isAnimatingMovement || isPerformingAction) { toast.info("Cannot use items right now."); return; }
    labyrinth.useItem(itemId, playerName, elapsedTime);
    setGameVersion(prev => prev + prev + 1);
  };

  const handleReviveClick = () => {
    labyrinth.revivePlayer();
    onRevive();
    setHasGameOverBeenDispatched(false);
    setGameVersion(prev => prev + 1);
    toast.success("You have been revived! Continue your adventure!");
  };

  const getEmojiForElement = (elementName: string): string => {
    return emojiMap[elementName] || "❓";
  };

  const { wallPath, floorPath } = useMemo(() => generateSvgPaths(labyrinth.getMapGrid()), [gameVersion === 0]);

  const renderMap = () => {
    const playerLoc = labyrinth.getPlayerLocation();
    const visitedCells = labyrinth.getVisitedCells();
    const viewportSize = 15;
    const viewBox = `${animatedPlayerPosition.x - viewportSize / 2 + 0.5} ${animatedPlayerPosition.y - viewportSize / 2 + 0.5} ${viewportSize} ${viewportSize}`;
    const currentFloor = labyrinth.getCurrentFloor();
    const mapWidth = labyrinth["MAP_WIDTH"];
    const mapHeight = labyrinth["MAP_HEIGHT"];

    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const direction = labyrinth.lastMoveDirection;

    const adventurerIdleSprites = {
      north: AdventurerNorth,
      south: AdventurerSouth,
      east: AdventurerEast,
      west: AdventurerWest,
    };

    const adventurerSwordSprites = {
      north: AdventurerNorthSword,
      south: AdventurerSouthSword,
      east: AdventurerEastSword,
      west: AdventurerWestSword,
    };

    const adventurerShieldSprites = {
      north: AdventurerNorthShield,
      south: AdventurerSouthShield,
      east: AdventurerEastShield,
      west: AdventurerWestShield,
    };

    const adventurerSwordShieldSprites = {
      north: AdventurerNorthSwordShield,
      south: AdventurerSouthSwordShield,
      east: AdventurerEastSwordShield,
      west: AdventurerWestSwordShield,
    };

    const adventurerAttackSprites = {
      north: AdventurerNorthAttack,
      south: AdventurerSouthAttack,
      east: AdventurerEastAttack,
      west: AdventurerWestAttack,
    };

    const adventurerSwordAttackSprites = {
      north: AdventurerNorthSwordAttack,
      south: AdventurerSouthSwordAttack,
      east: AdventurerEastSwordAttack,
      west: AdventurerWestSwordAttack,
    };

    const adventurerShieldAttackSprites = { // Used for Shield Bash
      north: AdventurerNorthShieldAttack,
      south: AdventurerSouthShieldAttack,
      east: AdventurerEastShieldAttack,
      west: AdventurerWestShieldAttack,
    };

    const adventurerSwordShieldAttackSprites = { // Used for attack when both are equipped
      north: AdventurerNorthSwordShieldAttack,
      south: AdventurerSouthSwordShieldAttack,
      east: AdventurerEastSwordShieldAttack,
      west: AdventurerWestSwordShieldAttack,
    };

    let currentAdventurerSprite: string;

    if (isPerformingAction) {
      if (labyrinth.lastActionType === 'attack') {
        if (equippedWeapon && equippedShield) {
          currentAdventurerSprite = adventurerSwordShieldAttackSprites[direction];
        } else if (equippedWeapon) {
          currentAdventurerSprite = adventurerSwordAttackSprites[direction];
        } else {
          currentAdventurerSprite = adventurerAttackSprites[direction]; // Unarmed attack
        }
      } else if (labyrinth.lastActionType === 'shieldBash') {
        if (equippedShield) {
          currentAdventurerSprite = adventurerShieldAttackSprites[direction]; // Shield bash animation
        } else {
          currentAdventurerSprite = adventurerIdleSprites[direction]; // Should not happen if bash is disabled without shield
        }
      } else {
        currentAdventurerSprite = adventurerIdleSprites[direction]; // Fallback
      }
    } else {
      // Idle sprites
      if (equippedWeapon && equippedShield) {
        currentAdventurerSprite = adventurerSwordShieldSprites[direction];
      } else if (equippedWeapon) {
        currentAdventurerSprite = adventurerSwordSprites[direction];
      } else if (equippedShield) {
        currentAdventurerSprite = adventurerShieldSprites[direction];
      } else {
        currentAdventurerSprite = adventurerIdleSprites[direction];
      }
    }

    const yOffset = direction === 'south' ? -0.55 : -0.6;

    const visibleDecorativeElements = Array.from(labyrinth.getDecorativeElements().entries()).filter(([coordStr, type]) => {
      const [x, y, f] = coordStr.split(',').map(Number);
      if (f !== currentFloor) return false;
      const isVisible = x >= animatedPlayerPosition.x - viewportSize / 2 && x < animatedPlayerPosition.x + viewportSize / 2 &&
                        y >= animatedPlayerPosition.y - viewportSize / 2 && y < animatedPlayerPosition.y + viewportSize / 2;
      return isVisible;
    });

    const revealedTraps = labyrinth.getRevealedTraps();
    const allVisibleTraps = new Set([...revealedTraps]);

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
          {/* NEW: Death Trap Pattern - Spike Pit */}
          <pattern id="death-trap-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="black" /> {/* Pitch black background */}
            {/* Many small spikes */}
            <path d="M0.1 0.9 L0.2 0.7 L0.3 0.9 Z" fill="#888" />
            <path d="M0.3 0.8 L0.4 0.6 L0.5 0.8 Z" fill="#888" />
            <path d="M0.5 0.9 L0.6 0.7 L0.7 0.9 Z" fill="#888" />
            <path d="M0.7 0.8 L0.8 0.6 L0.9 0.8 Z" fill="#888" />

            <path d="M0.1 0.5 L0.2 0.3 L0.3 0.5 Z" fill="#888" />
            <path d="M0.3 0.4 L0.4 0.2 L0.5 0.4 Z" fill="#888" />
            <path d="M0.5 0.5 L0.6 0.3 L0.7 0.5 Z" fill="#888" />
            <path d="M0.7 0.4 L0.8 0.2 L0.9 0.4 Z" fill="#888" />

            <path d="M0.1 0.1 L0.2 0.0 L0.3 0.1 Z" fill="#888" />
            <path d="M0.3 0.0 L0.4 -0.2 L0.5 0.0 Z" fill="#888" />
            <path d="M0.5 0.1 L0.6 0.0 L0.7 0.1 Z" fill="#888" />
            <path d="M0.7 0.0 L0.8 -0.2 L0.9 0.0 Z" fill="#888" />
          </pattern>
          {/* NEW: Revealed Trap Pattern (Floor background + spikes) */}
          <pattern id="revealed-trap-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#3a2d3c" /> {/* Floor background color */}
            <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth="0.1" /> {/* Floor grid lines */}
            <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
            <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
            {/* Spikes from death-trap-pattern */}
            <path d="M0.1 0.9 L0.2 0.7 L0.3 0.9 Z" fill="#888" />
            <path d="M0.3 0.8 L0.4 0.6 L0.5 0.8 Z" fill="#888" />
            <path d="M0.5 0.9 L0.6 0.7 L0.7 0.9 Z" fill="#888" />
            <path d="M0.7 0.8 L0.8 0.6 L0.9 0.8 Z" fill="#888" />

            <path d="M0.1 0.5 L0.2 0.3 L0.3 0.5 Z" fill="#888" />
            <path d="M0.3 0.4 L0.4 0.2 L0.5 0.4 Z" fill="#888" />
            <path d="M0.5 0.5 L0.6 0.3 L0.7 0.5 Z" fill="#888" />
            <path d="M0.7 0.4 L0.8 0.2 L0.9 0.4 Z" fill="#888" />

            <path d="M0.1 0.1 L0.2 0.0 L0.3 0.1 Z" fill="#888" />
            <path d="M0.3 0.0 L0.4 -0.2 L0.5 0.0 Z" fill="#888" />
            <path d="M0.5 0.1 L0.6 0.0 L0.7 0.1 Z" fill="#888" />
            <path d="M0.7 0.0 L0.8 -0.2 L0.9 0.0 Z" fill="#888" />
          </pattern>
        </defs>
        <g mask="url(#fog-mask)">
          <path d={floorPath} className="fill-[url(#floor-pattern)]" />
          <path d={wallPath} className="fill-[url(#wall-pattern)] stroke-[#4a3d4c]" strokeWidth={0.05} />
          {visibleDecorativeElements.map(([coordStr, type]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            return <use key={`deco-${coordStr}`} href={`#${type}`} x={x} y={y} width="1" height="1" />;
          })}
          {Array.from(labyrinth.enemyLocations.entries()).map(([coordStr, enemyId]) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            const enemy = labyrinth.getEnemy(enemyId);
            if (!enemy || (enemy.defeated && enemy.id !== labyrinth.lastJumpDefeatedEnemyId)) return null;
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
          {/* NEW: Render death traps first, as they are always visible and have a distinct look */}
          {Array.from(labyrinth.deathTrapsLocations.keys()).map((coordStr) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            return (
              <rect
                key={`death-trap-${coordStr}`}
                x={x}
                y={y}
                width="1"
                height="1"
                fill="url(#death-trap-pattern)"
                stroke="rgba(0,0,0,0.8)"
                strokeWidth={0.05}
                // Removed className="animate-pulse-slow"
              />
            );
          })}
          {/* Render normal traps (only if revealed and not a death trap) */}
          {Array.from(allVisibleTraps).map((coordStr) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor || labyrinth.deathTrapsLocations.has(coordStr)) return null; // Skip if it's a death trap

            const playerOnTrap = playerLoc.x === x && playerLoc.y === y;

            return (
              <rect
                key={`trap-glow-${coordStr}`}
                x={x}
                y={y}
                width="1"
                height="1"
                fill="url(#revealed-trap-pattern)" // Use the new pattern
                stroke="rgba(255, 0, 0, 0.8)" // Keep a subtle red border for danger
                strokeWidth={0.05}
                className={playerOnTrap ? "animate-pulse-fast" : ""}
              />
            );
          })}
        </g>
        <image
          href={currentAdventurerSprite}
          x={animatedPlayerPosition.x - 0.3}
          y={animatedPlayerPosition.y + yOffset + verticalJumpOffset}
          width="1.6"
          height="1.6"
          className={cn(
            flashingEntityId === 'player' && 'is-flashing'
          )}
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
                <Button
                  size="sm"
                  className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600"
                  onClick={handleAttack}
                  disabled={gameResult !== null || isAnimatingMovement || isPerformingAction}
                >
                  Attack (Q)
                </Button>
              </div>
            ) : (
              <p className="italic text-stone-400">No weapon equipped.</p>
            )}
            {equippedShield ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 flex justify-between items-center">
                <p className="font-bold text-amber-200 flex items-center"><Shield className="w-4 h-4 mr-2 text-blue-400"/> {equippedShield.name}</p>
                <Button
                  size="sm"
                  className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600"
                  onClick={handleShieldBash}
                  disabled={gameResult !== null || isAnimatingMovement || isPerformingAction}
                >
                  Bash (E)
                </Button>
              </div>
            ) : (
              <p className="italic text-stone-400">No shield equipped.</p>
            )}
            {equippedAmulet ? (
              <div className="p-2 bg-black/20 rounded border border-amber-700 flex justify-between items-center">
                <p className="font-bold text-amber-200 flex items-center"><Gem className="w-4 h-4 mr-2 text-purple-400"/> {equippedAmulet.name}</p>
                <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(equippedAmulet.id)} disabled={gameResult !== null || isAnimatingMovement || isPerformingAction}>
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
                <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(equippedCompass.id)} disabled={gameResult !== null || isAnimatingMovement || isPerformingAction}>
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
                        <Button size="sm" className="ml-2 px-2 py-1 text-xs flex-shrink-0 bg-amber-800 hover:bg-amber-700 border-amber-600" onClick={() => handleUseItem(item.id)} disabled={gameResult !== null || isAnimatingMovement || isPerformingAction}>
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
        <Separator orientation="vertical" className="h-3 bg-amber-800" />
        <div className="flex items-center gap-1" title="Deaths">
          <Skull className="text-gray-400" size={10} />
          <span className="font-bold">{labyrinth.getPlayerDeaths()}</span>
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
          <div className="absolute bottom-2 left-2 text-center text-stone-300 text-xs z-10 bg-black/ ৫০ p-1 px-2 rounded">
            <p>Move: <span className="font-bold text-amber-200">Arrows/WASD</span> | Attack: <span className="font-bold text-amber-200">Q</span> | Jump: <span className="font-bold text-amber-200">Space</span> | Search: <span className="font-bold text-amber-200">Shift</span> | Interact: <span className="font-bold text-amber-200">Ctrl</span> | Shield Bash: <span className="font-bold text-amber-200">E</span></p>
          </div>
          {renderHud()}

          {gameResult && (
            <GameOverScreen result={gameResult} onRestart={onGameRestart} onRevive={handleReviveClick} />
          )}
        </main>

        <aside className="w-full md:w-80 lg:w-[350px] flex-shrink-0 bg-stone-900/70 border border-amber-800/60 rounded-lg flex flex-col overflow-hidden">
          {renderSidebarContent()}
          <div className="p-2 border-t border-amber-800/60 bg-stone-950/50">
            <p className="text-xs text-stone-500 text-center break-words">Donations: <span className="font-mono text-stone-400">0x126aa663BdeDd6Ae477fd28a7d0b624b8109D15d</span></p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LabyrinthGame;