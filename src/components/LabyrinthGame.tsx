import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Labyrinth, Item, Enemy, Puzzle } from '../lib/game';
import { generateSvgPaths } from '../lib/map-renderer';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Sword, Shield, Heart, HelpCircle, Search, Hand, Key, Gem, Bone, Ghost, Box, BrainCircuit, Compass, BookOpen, FlaskConical, Star } from 'lucide-react';

const TILE_SIZE = 32;
const VIEWPORT_RADIUS_TILES = 12;

interface LabyrinthGameProps {
  playerName: string;
  onGameOver: (result: any) => void;
  elapsedTime: number;
}

const LabyrinthGame: React.FC<LabyrinthGameProps> = ({ playerName, onGameOver, elapsedTime }) => {
  const [game, setGame] = useState(() => new Labyrinth());
  const [gameState, setGameState] = useState<any | null>(null);
  const [svgPaths, setSvgPaths] = useState({ wallPath: '', floorPath: '' });

  const syncGameState = useCallback(() => {
    setGameState({
      playerLocation: game.getPlayerLocation(),
      health: game.getPlayerHealth(),
      maxHealth: game.getPlayerMaxHealth(),
      attack: game.getCurrentAttackDamage(),
      defense: game.getCurrentDefense(),
      inventory: game.getInventoryItems(),
      equippedWeapon: game.getEquippedWeapon(),
      equippedShield: game.getEquippedShield(),
      equippedAmulet: game.getEquippedAmulet(),
      equippedCompass: game.getEquippedCompass(),
      messages: [...game.getMessages()],
      visitedCells: new Set(game.getVisitedCells()),
      currentFloor: game.getCurrentFloor(),
      bossState: game.getBossState(),
      isBossDefeated: game.isBossDefeated(),
    });
    game.clearMessages();

    if (game.isGameOver()) {
      onGameOver(game.getGameResult()!);
    }
  }, [game, onGameOver]);

  useEffect(() => {
    syncGameState();
    const grid = game.getMapGrid();
    const paths = generateSvgPaths(grid);
    setSvgPaths(paths);
  }, []);

  const handleGameAction = useCallback((action: () => void) => {
    action();
    game.processEnemyMovement(playerName, elapsedTime);
    game.processBossLogic();
    // Create a new object reference to trigger re-render for the mutable game object
    setGame(Object.create(Object.getPrototypeOf(game), Object.getOwnPropertyDescriptors(game)));
    syncGameState();
  }, [game, playerName, elapsedTime, syncGameState]);

  const handleMove = (direction: 'north' | 'south' | 'east' | 'west') => handleGameAction(() => game.move(direction, playerName, elapsedTime));
  const handleSearch = () => handleGameAction(() => game.search());
  const handleInteract = () => handleGameAction(() => game.interact(playerName, elapsedTime));
  const handleUseItem = (itemId: string) => handleGameAction(() => game.useItem(itemId, playerName, elapsedTime));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'w': case 'ArrowUp': handleMove('north'); break;
        case 's': case 'ArrowDown': handleMove('south'); break;
        case 'a': case 'ArrowLeft': handleMove('west'); break;
        case 'd': case 'ArrowRight': handleMove('east'); break;
        case 'e': handleInteract(); break;
        case 'f': handleSearch(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, handleInteract, handleSearch]);

  const renderableObjects = useMemo(() => {
    if (!gameState) return [];
    const objects = [];
    const { playerLocation, visitedCells } = gameState;

    const isVisible = (x: number, y: number) => {
      const dx = Math.abs(x - playerLocation.x);
      const dy = Math.abs(y - playerLocation.y);
      return dx <= VIEWPORT_RADIUS_TILES && dy <= VIEWPORT_RADIUS_TILES && visitedCells.has(`${x},${y}`);
    };

    for (const [coord, id] of game.enemyLocations.entries()) {
      const [x, y, floor] = coord.split(',').map(Number);
      if (floor === game.getCurrentFloor() && isVisible(x, y)) {
        const enemy = game.getEnemy(id as string);
        if (enemy && !enemy.defeated) objects.push({ x, y, type: 'enemy', data: enemy });
      }
    }
    for (const [coord, id] of game.itemLocations.entries()) {
      const [x, y, floor] = coord.split(',').map(Number);
      if (floor === game.getCurrentFloor() && isVisible(x, y)) {
        const item = game.getItem(id as string);
        if (item) objects.push({ x, y, type: 'item', data: item });
      }
    }
    return objects;
  }, [gameState, game]);

  if (!gameState) return <div>Loading...</div>;

  const { playerLocation } = gameState;
  const viewBox = `${(playerLocation.x - VIEWPORT_RADIUS_TILES) * TILE_SIZE} ${(playerLocation.y - VIEWPORT_RADIUS_TILES) * TILE_SIZE} ${VIEWPORT_RADIUS_TILES * 2 * TILE_SIZE} ${VIEWPORT_RADIUS_TILES * 2 * TILE_SIZE}`;

  const getIconForItem = (item: Item) => {
    switch (item.type) {
        case 'key': return <Key className="w-4 h-4 text-gray-400" />;
        case 'artifact': return <Gem className="w-4 h-4 text-yellow-400" />;
        case 'quest': return <BookOpen className="w-4 h-4 text-purple-400" />;
        case 'consumable': return <FlaskConical className="w-4 h-4 text-green-400" />;
        case 'accessory': return <Star className="w-4 h-4 text-blue-400" />;
        default: return <Box className="w-4 h-4 text-orange-300" />;
    }
  };

  const getIconForEnemy = (enemy: Enemy) => {
    if (enemy.name.includes("Goblin")) return <span className="text-lg">👺</span>;
    if (enemy.name.includes("Skeleton")) return <Bone className="w-5 h-5 text-gray-200" />;
    if (enemy.name.includes("Shadow")) return <Ghost className="w-5 h-5 text-purple-300" />;
    if (enemy.name.includes("Watcher")) return <span className="text-2xl">👁️</span>;
    return <span className="text-lg">❓</span>;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-gray-200 font-mono">
      {/* Game View */}
      <div className="flex-grow flex flex-col items-center justify-center p-2 relative">
        <div className="absolute top-2 left-2 bg-black/50 p-2 rounded">
          Floor {gameState.currentFloor + 1}
        </div>
        <div className="w-full h-full border-2 border-gray-700 rounded-lg overflow-hidden bg-black">
          <svg className="w-full h-full" viewBox={viewBox}>
            <path d={svgPaths.floorPath} fill="#2d3748" transform={`scale(${TILE_SIZE})`} />
            <path d={svgPaths.wallPath} fill="#1a202c" transform={`scale(${TILE_SIZE})`} />
            
            {/* Render Fog of War */}
            <defs>
              <mask id="fogMask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {Array.from(gameState.visitedCells).map(cell => {
                  const [x, y] = cell.split(',').map(Number);
                  return <rect key={cell} x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill="black" />;
                })}
              </mask>
            </defs>
            {/* <rect x="0" y="0" width={100 * TILE_SIZE} height={100 * TILE_SIZE} fill="rgba(0,0,0,0.7)" mask="url(#fogMask)" /> */}

            {/* Render Objects */}
            {renderableObjects.map(({ x, y, type, data }, index) => (
              <foreignObject key={index} x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE}>
                <div className="flex items-center justify-center w-full h-full">
                  {type === 'enemy' ? getIconForEnemy(data) : getIconForItem(data)}
                </div>
              </foreignObject>
            ))}

            {/* Player */}
            <circle cx={playerLocation.x * TILE_SIZE + TILE_SIZE / 2} cy={playerLocation.y * TILE_SIZE + TILE_SIZE / 2} r={TILE_SIZE / 3} fill="cyan" />
          </svg>
        </div>
      </div>

      {/* UI Panel */}
      <div className="w-full md:w-96 flex-shrink-0 bg-gray-800 p-2 flex flex-col gap-2">
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle>{playerName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="text-red-500" />
              <Progress value={(gameState.health / gameState.maxHealth) * 100} className="w-full" />
              <span>{gameState.health}/{gameState.maxHealth}</span>
            </div>
            <div className="flex justify-around text-sm">
              <span><Sword className="inline-block mr-1" /> ATK: {gameState.attack}</span>
              <span><Shield className="inline-block mr-1" /> DEF: {gameState.defense}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader><CardTitle>Equipment</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><Sword className="inline-block mr-2" />{gameState.equippedWeapon?.name || 'None'}</p>
            <p><Shield className="inline-block mr-2" />{gameState.equippedShield?.name || 'None'}</p>
            <p><Star className="inline-block mr-2" />{gameState.equippedAmulet?.name || 'None'}</p>
            <p><Compass className="inline-block mr-2" />{gameState.equippedCompass?.name || 'None'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700 flex-grow flex flex-col">
          <CardHeader><CardTitle>Inventory</CardTitle></CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-4">
                {gameState.inventory.length === 0 && <p className="text-gray-500 italic">Empty</p>}
                {gameState.inventory.map(({ item, quantity }: { item: Item, quantity: number }) => (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
                        <div className="flex items-center gap-2">
                          {getIconForItem(item)}
                          <span>{item.name} {quantity > 1 ? `(x${quantity})` : ''}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleUseItem(item.id)}>Use</Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{item.description}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button onClick={handleSearch}><Search className="mr-2" />Search (F)</Button>
            <Button onClick={handleInteract}><Hand className="mr-2" />Interact (E)</Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-700 flex-grow flex flex-col">
          <CardHeader><CardTitle>Log</CardTitle></CardHeader>
          <CardContent className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1 pr-4 text-xs">
                {gameState.messages.map((msg: string, i: number) => <p key={i}>{msg}</p>)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LabyrinthGame;