"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Labyrinth, LogicalRoom, Item, GameResult, Coordinate } from "@/lib/game"; // Import GameResult & Coordinate
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sword, Heart, Shield, Target, Goal, BookOpen, Backpack, Scroll, Gem, Compass, Skull, Zap } from "lucide-react"; // Added Skull icon
import { useIsMobile } from "@/hooks/use-mobile";
import { generateSvgPaths } from "@/lib/map-renderer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Keep Tabs for now, but won't use for inventory/objective
import GameOverScreen from "./GameOverScreen"; // Import GameOverScreen
import FullMapModal from "./FullMapModal"; // Import the new FullMapModal
import { emojiMap, enemySpriteMap, staticItemSpriteMap, getEmojiForElement } from "@/utils/game-assets"; // Import new staticItemSpriteMap
import { useGameStore } from '@/stores/gameStore'; // Import the game store
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
import lightningStrikeSprite from "@/assets/sprites/spells/lightning-strike.svg";


interface LabyrinthGameProps {
  playerName: string;
  gameStarted: boolean;
  startTime: number | null;
  elapsedTime: number;
  onGameOver: (result: GameResult, learnedSpells: Set<string>) => void; // Updated to pass learnedSpells
  onGameRestart: () => void;
  gameResult: GameResult | null; // New prop for game result
  onRevive: () => void; // New prop for revive action from Index
  hasElectrogem: boolean; // New prop for NFT ownership
  initialLearnedSpells: string[]; // New prop for initial learned spells
}

const ENEMY_MOVE_SPEEDS_MS = [3600, 2700, 1800, 900]; // Regular enemy speeds (sped up by 10%)
const BOSS_MOVE_SPEED_MS = 336; // Watcher's speed (halved again)


const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, gameStarted, startTime, elapsedTime, onGameOver, onGameRestart, gameResult, onRevive, hasElectrogem, initialLearnedSpells }) => {
  const { labyrinth, setLabyrinth, currentFloor, setCurrentFloor, setPlayerPosition, incrementGameVersion, gameVersion } = useGameStore();
  const [hasGameOverBeenDispatched, setHasGameOverBeenDispatched] = useState(false);
  const [flashingEntityId, setFlashingEntityId] = useState<string[]>([]);
  const [verticalJumpOffset, setVerticalJumpOffset] = useState(0);
  const [animatedPlayerPosition, setAnimatedPlayerPosition] = useState({ x: 0, y: 0 }); // Initialize with default values
  const [isAnimatingMovement, setIsAnimatingMovement] = useState(false); // New state to prevent actions during movement animation
  const [isMapModalOpen, setIsMapModalOpen] = useState(false); // State for the full map modal
  const [lightningStrikes, setLightningStrikes] = useState<{ position: Coordinate; key: number }[]>([]); // New state for lightning effect
  const [spellInput, setSpellInput] = useState("");
  const gameContainerRef = useRef<HTMLDivElement>(null); // Ref for the game container

  // Ref to store the *last fully settled* logical position, used as the start of the next animation
  const lastSettledLogicalPositionRef = useRef({ x: 0, y: 0 }); // Initialize with default values

  // Initialize Labyrinth only when the component mounts or a new game is explicitly started (via key change)
  useEffect(() => {
    if (gameStarted) { // Only create a new Labyrinth if game is started
      try {
        const newLabyrinth = new Labyrinth(hasElectrogem, initialLearnedSpells); // Pass initialLearnedSpells here
        setLabyrinth(newLabyrinth);
        setCurrentFloor(newLabyrinth.getCurrentFloor());
        setPlayerPosition(newLabyrinth.getPlayerLocation());
        setAnimatedPlayerPosition(newLabyrinth.getPlayerLocation()); // Sync animated position
        lastSettledLogicalPositionRef.current = newLabyrinth.getPlayerLocation(); // Sync ref
        incrementGameVersion(); // Trigger a game version update
        setHasGameOverBeenDispatched(false);
        console.log("Labyrinth initialized. Map grid:", newLabyrinth.getMapGrid());
      } catch (error) {
        console.error("Error initializing Labyrinth:", error);
        toast.error("Failed to start game: " + (error as Error).message);
        setLabyrinth(null); // Ensure labyrinth is null if initialization fails
      }
    }
  }, [gameStarted, hasElectrogem, initialLearnedSpells]); // Depend on gameStarted, hasElectrogem, and initialLearnedSpells for initial setup

  // Effect to smoothly animate player's visual position when game state position changes
  useEffect(() => {
    if (!labyrinth) return; // Ensure labyrinth is initialized

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

      let animationDuration = 150; // Default move duration
      let peakHeight = 0; // Default no vertical offset

      if (wasJump) {
        switch (distance) {
          case 3:
            animationDuration = 650;
            peakHeight = -0.8;
            break;
          case 2:
            animationDuration = 450;
            peakHeight = -0.6;
            break;
          case 1:
            animationDuration = 250;
            peakHeight = -0.3;
            break;
          default:
            animationDuration = 150;
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
            incrementGameVersion(); // Trigger re-render to remove enemy
          }
        }
      };
      requestAnimationFrame(animate);
    }
  }, [labyrinth?.getPlayerLocation().x, labyrinth?.getPlayerLocation().y, labyrinth?.getCurrentFloor()]); // Depend on actual game state player location and floor

  useEffect(() => {
    if (gameResult !== null || !labyrinth) return; // Do not process game logic if game is over or labyrinth not initialized

    const newMessages = labyrinth.getMessages();
    if (newMessages.length > 0) {
      labyrinth.clearMessages();
    }
    if (labyrinth.isGameOver() && !hasGameOverBeenDispatched) {
      const result = labyrinth.getGameResult();
      if (result) {
        onGameOver(result, labyrinth.getLearnedSpells()); // Pass learned spells here
        setHasGameOverBeenDispatched(true);
      }
    }
    const hitIds = labyrinth.lastHitEntityId;
    if (hitIds && hitIds.length > 0) {
      setFlashingEntityId(hitIds);
      setTimeout(() => {
        setFlashingEntityId([]);
      }, 200);
      labyrinth.clearLastHit();
    }
  }, [gameVersion, labyrinth, onGameOver, hasGameOverBeenDispatched, gameResult]); // Add gameResult to dependencies

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameStarted || gameResult !== null || isAnimatingMovement || event.repeat || !labyrinth) return;

      // Spell casting logic with Shift key
      if (event.shiftKey) {
        event.preventDefault(); // Prevent default browser actions for shift+key

        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
          const newSpellInput = (spellInput + event.key).toUpperCase();
          setSpellInput(newSpellInput);

          if (newSpellInput.endsWith('BOLT')) {
            handleCastGemSpell();
            setSpellInput(''); // Reset after successful cast
          } else if (newSpellInput.endsWith('ICE')) {
            handleCastSpell();
            setSpellInput(''); // Reset after successful cast
          }
        }
        // Do not process any other actions while shift is held down.
        return;
      }

      // Handle 'M' key press to toggle map modal
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setIsMapModalOpen(prev => !prev);
        return; // Return after handling 'M' key
      }

      // If the map modal is open, and it wasn't the 'M' key that was pressed,
      // then prevent other game actions.
      if (isMapModalOpen) return;

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
        case "q": event.preventDefault(); handleAttack(); break;
        case " ": event.preventDefault(); handleJump(); break;
        case "control": event.preventDefault(); handleInteract(); break;
        case "e": event.preventDefault(); handleShieldBash(); break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setSpellInput(''); // Reset spell input when shift is released
      }
    };

    const gameElement = gameContainerRef.current;
    if (gameElement) {
      gameElement.addEventListener("keydown", handleKeyDown);
      gameElement.addEventListener("keyup", handleKeyUp);
      gameElement.focus();
    }
    return () => {
      if (gameElement) {
        gameElement.removeEventListener("keydown", handleKeyDown);
        gameElement.removeEventListener("keyup", handleKeyUp);
      }
    };
  }, [gameStarted, labyrinth, playerName, elapsedTime, gameResult, isAnimatingMovement, isMapModalOpen, spellInput]);

  useEffect(() => {
    if (!gameStarted || gameResult !== null || !labyrinth) return;

    // --- MINION MOVEMENT ---
    const moveSpeed = ENEMY_MOVE_SPEEDS_MS[currentFloor] || 2000;
    const minionIntervalId = setInterval(() => {
      const currentElapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      labyrinth.processEnemyMovement(playerName, currentElapsedTime, 'minion');
      setCurrentFloor(labyrinth.getCurrentFloor());
      setPlayerPosition(labyrinth.getPlayerLocation());
      incrementGameVersion();
    }, moveSpeed);

    // --- BOSS MOVEMENT ---
    let bossIntervalId: NodeJS.Timeout | undefined;
    if (currentFloor === labyrinth.NUM_FLOORS - 1) {
      bossIntervalId = setInterval(() => {
        const currentElapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        labyrinth.processEnemyMovement(playerName, currentElapsedTime, 'boss');
        setCurrentFloor(labyrinth.getCurrentFloor());
        setPlayerPosition(labyrinth.getPlayerLocation());
        incrementGameVersion();
      }, BOSS_MOVE_SPEED_MS);
    }

    return () => {
      clearInterval(minionIntervalId);
      if (bossIntervalId) {
        clearInterval(bossIntervalId);
      }
    };
  }, [gameStarted, labyrinth, playerName, startTime, gameResult, currentFloor]);

  const handleMove = (direction: "north" | "south" | "east" | "west") => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot move right now."); return; }
    labyrinth.move(direction, playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
  };

  const handleAttack = () => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot attack right now."); return; }
    labyrinth.attack(playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
  };

  const handleJump = () => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot jump right now."); return; }
    
    labyrinth.jump(playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
  };

  const handleInteract = () => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot interact right now."); return; }
    labyrinth.interact(playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
  };

  const handleShieldBash = () => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot perform Shield Bash right now."); return; }
    labyrinth.shieldBash(playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
  };

  const handleCastSpell = () => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot cast spells right now."); return; }
    labyrinth.castSpell(playerName, elapsedTime);
    if (labyrinth.lastSpellEffect?.type === 'lightning' && labyrinth.lastSpellEffect.positions) {
      const newStrikes = labyrinth.lastSpellEffect.positions.map(pos => ({
        position: pos,
        key: Date.now() + Math.random()
      }));
      setLightningStrikes(newStrikes);
      setTimeout(() => {
        setLightningStrikes([]);
      }, 300);
    }
    incrementGameVersion();
  };

  const handleCastGemSpell = () => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { return; }
    labyrinth.castGemSpell(playerName, elapsedTime);
    if (labyrinth.lastSpellEffect?.type === 'lightning' && labyrinth.lastSpellEffect.positions) {
      const newStrikes = labyrinth.lastSpellEffect.positions.map(pos => ({
        position: pos,
        key: Date.now() + Math.random()
      }));
      setLightningStrikes(newStrikes);
      setTimeout(() => setLightningStrikes([]), 300);
    }
    incrementGameVersion();
  };

  const handleUseItem = (itemId: string) => {
    if (gameResult !== null || isAnimatingMovement || !labyrinth) { toast.info("Cannot use items right now."); return; }
    labyrinth.useItem(itemId, playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
  };

  const handleReviveClick = () => {
    if (!labyrinth) return;
    labyrinth.revivePlayer();
    onRevive();
    setHasGameOverBeenDispatched(false);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion();
    toast.success("You have been revived! Continue your adventure!");
  };

  // NEW: Handler for the "Next Floor (DEV)" button
  const handleNextFloorDev = () => {
    if (gameResult !== null || !labyrinth) {
      toast.info("Game is over. Cannot skip floors.");
      return;
    }
    labyrinth.nextFloor(playerName, elapsedTime);
    setCurrentFloor(labyrinth.getCurrentFloor());
    setPlayerPosition(labyrinth.getPlayerLocation());
    incrementGameVersion(); // Force re-render
    // If it was the last floor and nextFloor triggered victory, onGameOver will be called
    if (labyrinth.isGameOver()) {
      const result = labyrinth.getGameResult();
      if (result) {
        onGameOver(result, labyrinth.getLearnedSpells()); // Pass learned spells here
        setHasGameOverBeenDispatched(true);
      }
    }
  };

  const { wallPath, floorPath } = useMemo(() => {
    if (!labyrinth) return { wallPath: '', floorPath: '' };
    return generateSvgPaths(labyrinth.getMapGrid());
  }, [labyrinth, gameVersion]);

  const renderMap = () => {
    if (!labyrinth) return null; // Ensure labyrinth is initialized

    const playerLoc = labyrinth.getPlayerLocation();
    const viewportSize = 15;
    const viewBox = `${animatedPlayerPosition.x - viewportSize / 2 + 0.5} ${animatedPlayerPosition.y - viewportSize / 2 + 0.5} ${viewportSize} ${viewportSize}`;
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

    // Get boss state and passage coordinates
    const isBossDefeated = labyrinth.isBossDefeated();

    const frozenTiles = labyrinth.frozenTiles;

    return (
      <svg viewBox={viewBox} className="w-full h-full" shapeRendering="crispEdges">
        <defs>
          <pattern id="floor-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#3a2d3c" />
            <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth={0.1} />
            <circle cx="0.25" cy="0.25" r="0.05" fill="#4a3d4c" />
            <circle cx="0.75" cy="0.75" r="0.05" fill="#4a3d4c" />
          </pattern>
          <pattern id="wall-pattern" patternUnits="userSpaceOnUse" width="1" height="1">
            <rect width="1" height="1" fill="#5a4d5c" />
            <path d="M 0 0.2 L 1 0.2 M 0 0.8 L 1 0.8 M 0.2 0 L 0.2 1 M 0.8 0 L 0.8 1" stroke="#6a5d6c" strokeWidth={0.1} />
          </pattern>
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
            <path d="M 0 0.5 L 1 0.5 M 0.5 0 L 0.5 1" stroke="#4a3d4c" strokeWidth={0.1} /> {/* Floor grid lines */}
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
        <g>
          <path d={floorPath} className="fill-[url(#floor-pattern)]" />
          <path d={wallPath} className="fill-[url(#wall-pattern)] stroke-[#4a3d4c]" strokeWidth={0.05} />
          <rect x="0" y="0" width={mapWidth} height={mapHeight} fill="none" stroke="gold" strokeWidth={0.2} />
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
              const healthPercentage = enemy.health > 0 ? enemy.health / enemy.maxHealth : 0;
              const showHealthBar = enemy.health < enemy.maxHealth;

              return (
                <g key={`enemy-group-${enemyId}`}>
                  <image
                    href={enemySprite}
                    x={x}
                    y={y}
                    width="1"
                    height="1"
                    className={cn(enemy.id.includes('watcher') && 'animate-pulse', flashingEntityId.includes(enemy.id) && 'is-flashing')}
                  />
                  {showHealthBar && (
                    <g>
                      <rect
                        x={x + 0.1}
                        y={y - 0.15}
                        width={0.8}
                        height={0.1}
                        fill="#b91c1c" // red-700
                        stroke="#450a0a" // red-950
                        strokeWidth={0.02}
                      />
                      <rect
                        x={x + 0.1}
                        y={y - 0.15}
                        width={0.8 * healthPercentage}
                        height={0.1}
                        fill="#22c55e" // green-500
                      />
                    </g>
                  )}
                </g>
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
            const staticItemSprite = staticItemSpriteMap[item.name]; // Check for a dedicated sprite

            if (staticItemSprite) {
              return (
                <image
                  key={`static-${itemId}`}
                  href={staticItemSprite}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                />
              );
            }
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
          {/* NEW: Render persistent frozen tiles */}
          {Array.from(frozenTiles.keys()).map((coordStr) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;
            return (
              <rect
                key={`frozen-tile-${coordStr}`}
                x={x}
                y={y}
                width="1"
                height="1"
                fill="rgba(0, 191, 255, 0.3)"
                className="animate-pulse-slow"
              />
            );
          })}
        </g>
        <image
          href={adventurerSprite}
          x={animatedPlayerPosition.x - 0.3}
          y={animatedPlayerPosition.y + yOffset + verticalJumpOffset}
          width="1.6"
          height="1.6"
          className={cn(
            flashingEntityId.includes('player') && 'is-flashing'
          )}
        />
        {/* Lightning Strike Effects */}
        {lightningStrikes.map(strike => (
          <image
            key={strike.key}
            href={lightningStrikeSprite}
            x={strike.position.x}
            y={strike.position.y}
            width="1"
            height="1"
            className="is-lightning-striking"
          />
        ))}
      </svg>
    );
  };

  const renderSidebarContent = () => {
    if (!labyrinth) return null; // Ensure labyrinth is initialized

    const equippedWeapon = labyrinth.getEquippedWeapon();
    const equippedShield = labyrinth.getEquippedShield();
    const equippedAmulet = labyrinth.getEquippedAmulet();
    const equippedCompass = labyrinth.getEquippedCompass();
    const equippedSpellbook = labyrinth.getEquippedSpellbook();
    const equippedGemSpell = labyrinth.getEquippedGemSpell();
    const inventoryItems = labyrinth.getInventoryItems();
    const currentObjective = labyrinth.getCurrentFloorObjective();
    const spellCooldown = labyrinth.getSpellCooldown();
    const gemSpellCooldown = labyrinth.getGemSpellCooldown();

    const renderEquippedItemSlot = (item: Item | undefined, placeholderIcon: React.ReactNode, slotName: string, cooldown?: number, isUnequippable: boolean = false, keybind?: string) => {
      // Use getEmojiForElement for all item icons
      const itemIcon = getEmojiForElement(item?.name || '');

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onDoubleClick={item && !isUnequippable ? () => handleUseItem(item.id) : undefined}
              className={cn(
                "relative flex items-center justify-center w-12 h-12 bg-black/20 rounded border border-amber-700 aspect-square",
                item && !isUnequippable && "cursor-pointer hover:bg-amber-900/50 hover:border-amber-600"
              )}
            >
              {item ? <span className="text-2xl">{itemIcon}</span> : placeholderIcon}
              {cooldown > 0 && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded">
                  <span className="text-white font-bold text-lg select-none">{cooldown}</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-bold">{item ? item.name : slotName}</p>
            {item && <p className="text-xs text-stone-400 mt-1">{item.description}</p>}
            {keybind && item && <p className="text-xs text-amber-300 italic mt-1">Hold Shift and type '{keybind}' to cast.</p>}
            {item && !isUnequippable && <p className="text-xs text-amber-300 italic mt-1">Double-click to unequip.</p>}
          </TooltipContent>
        </Tooltip>
      );
    };

    const unequippedInventory = inventoryItems.filter(invItem => {
      const { item } = invItem;
      return !(
        (equippedWeapon?.id === item.id) ||
        (equippedShield?.id === item.id) ||
        (equippedAmulet?.id === item.id) ||
        (equippedCompass?.id === item.id) ||
        (equippedSpellbook?.id === item.id)
      );
    });

    return (
      <ScrollArea className="h-full w-full">
        <div className="p-4 text-amber-50">
          <h4 className="text-md font-bold text-amber-300 mb-2">Equipped Gear</h4>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {renderEquippedItemSlot(equippedWeapon, <Sword className="w-6 h-6 text-stone-600" />, "Weapon Slot")}
            {renderEquippedItemSlot(equippedShield, <Shield className="w-6 h-6 text-stone-600" />, "Shield Slot")}
            {renderEquippedItemSlot(equippedAmulet, <Gem className="w-6 h-6 text-stone-600" />, "Amulet Slot")}
            {renderEquippedItemSlot(equippedCompass, <Compass className="w-6 h-6 text-stone-600" />, "Compass Slot")}
            {renderEquippedItemSlot(equippedGemSpell, <Zap className="w-6 h-6 text-stone-600" />, "Gem Spell Slot", gemSpellCooldown, true, 'BOLT')}
            {renderEquippedItemSlot(equippedSpellbook, <BookOpen className="w-6 h-6 text-stone-600" />, "Spellbook Slot", spellCooldown, false, 'ICE')}
          </div>

          <Separator className="my-4 bg-amber-800/60" />

          <h4 className="text-md font-bold text-amber-300 mb-2">Backpack</h4>
          {unequippedInventory.length === 0 ? (
            <p className="italic text-stone-400 text-center">Your backpack is empty.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {unequippedInventory.map(({ item, quantity }) => {
                const isEquippable = ['weapon', 'shield', 'accessory', 'spellbook'].includes(item.type);
                const isUsable = item.type === 'consumable' || isEquippable;
                // Use getEmojiForElement for all item icons
                const itemIcon = getEmojiForElement(item.name);

                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <div
                        onDoubleClick={isUsable ? () => handleUseItem(item.id) : undefined}
                        className={cn(
                          "relative flex items-center justify-center w-12 h-12 bg-black/20 rounded border border-amber-900/50 aspect-square",
                          isUsable ? "cursor-pointer hover:bg-amber-900/50 hover:border-amber-600" : "cursor-default"
                        )}
                      >
                        <span className="text-2xl">{itemIcon}</span>
                        {item.stackable && quantity > 1 && (
                          <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                            {quantity}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-stone-400 mt-1">{item.description}</p>
                      {isUsable && <p className="text-xs text-amber-300 italic mt-1">Double-click to {isEquippable ? 'equip' : 'use'}.</p>}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          <Separator className="my-4 bg-amber-800/60" />

          <h4 className="text-md font-bold text-amber-300 mb-2">Objective: Floor {labyrinth.getCurrentFloor() + 1} - {currentObjective.title}</h4>
          <div className="p-2 text-center text-amber-50 flex flex-col items-center justify-center">
            <ul className="list-disc list-inside text-left space-y-1 text-sm text-stone-300 italic mt-1">
              {currentObjective.steps.map((step, index) => (
                <li key={index} className={cn(step.isCompleted() && "line-through text-green-400")}>
                  {step.description}
                </li>
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

  const renderHud = () => {
    if (!labyrinth) return null; // Ensure labyrinth is initialized

    const healthPercentage = (labyrinth.getPlayerHealth() / labyrinth.getPlayerMaxHealth()) * 100;

    return (
      <>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-auto bg-stone-900/80 backdrop-blur-sm border-b-2 border-amber-700/70 rounded-b-lg p-2 px-4 shadow-2xl shadow-black/50">
          <div className="flex justify-center items-center gap-x-4 gap-y-2 text-amber-50 flex-wrap text-sm">
            {/* Health Bar */}
            <div className="flex items-center gap-2" title="Health">
              <Heart className="text-red-500" size={16} />
              <div className="relative w-32 h-5">
                <div className="absolute inset-0 w-full h-full bg-red-900/70 rounded-full overflow-hidden border border-red-700">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300"
                    style={{ width: `${healthPercentage}%` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold text-xs text-white" style={{ textShadow: '1px 1px 2px black' }}>
                    {labyrinth.getPlayerHealth()} / {labyrinth.getPlayerMaxHealth()}
                  </span>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="h-4 bg-amber-800" />
            
            <div className="flex items-center gap-1" title="Attack">
              <Sword className="text-orange-400" size={12} />
              <span className="font-bold">{labyrinth.getCurrentAttackDamage()}</span>
            </div>
            
            <Separator orientation="vertical" className="h-4 bg-amber-800" />

            <div className="flex items-center gap-1" title="Defense">
              <Shield className="text-blue-400" size={12} />
              <span className="font-bold">{labyrinth.getCurrentDefense()}</span>
            </div>
          </div>
        </div>
        {/* NEW: Player Stunned Status */}
        {labyrinth.getPlayerStunnedTurns() > 0 && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-blue-800/80 text-white text-sm px-3 py-1 rounded-md animate-pulse-fast">
            Stunned! ({labyrinth.getPlayerStunnedTurns()} turns left)
          </div>
        )}
        {spellInput && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-purple-800/80 text-white text-lg px-4 py-2 rounded-md font-mono tracking-widest border-2 border-purple-400 shadow-lg">
            {spellInput}
          </div>
        )}
      </>
    );
  };

  if (!gameStarted) return null;

  // Display a loading/error screen if labyrinth is not initialized
  if (!labyrinth) {
    return (
      <div className="fixed inset-0 bg-red-800 text-white flex items-center justify-center text-2xl">
        Loading Labyrinth... (If this persists, check console for errors)
      </div>
    );
  }

  return (
    <div 
      ref={gameContainerRef}
      tabIndex={0}
      className="flex items-center justify-center h-full p-4 focus:outline-none"
    >
      <div className="relative w-full max-w-screen-2xl mx-auto h-[calc(100vh-2rem)] bg-black/50 backdrop-blur-sm border-2 border-amber-900/50 shadow-2xl shadow-black/50 rounded-lg p-4 flex flex-col md:flex-row gap-4">
        <main className="flex-grow h-1/2 md:h-full relative bg-black rounded-md overflow-hidden border border-amber-900/50">
          {renderMap()}
          <div className="absolute bottom-2 left-2 right-2 text-center text-stone-300 text-xs z-10 bg-black/50 p-1 px-2 rounded">
            <p>Move: <span className="font-bold text-amber-200">Arrows/WASD</span> | Attack: <span className="font-bold text-amber-200">Q</span> | Jump: <span className="font-bold text-amber-200">Space</span> | Interact/Search: <span className="font-bold text-amber-200">Ctrl</span> | Shield Bash: <span className="font-bold text-amber-200">E</span> | Spells: <span className="font-bold text-amber-200">Hold Shift + Type</span> | Map: <span className="font-bold text-amber-200">M</span></p>
          </div>
          {renderHud()}

          {/* NEW: Next Floor (DEV) button */}
          {import.meta.env.DEV && (
            <div className="absolute top-2 right-2 z-10">
              <Button 
                onClick={handleNextFloorDev} 
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1"
                disabled={gameResult !== null}
              >
                Next Floor (DEV)
              </Button>
            </div>
          )}

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
      <FullMapModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
    </div>
  );
};

export default LabyrinthGame;