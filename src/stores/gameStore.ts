import { create } from 'zustand';
import { Labyrinth, Coordinate } from '@/lib/game';

interface GameState {
  labyrinth: Labyrinth | null;
  currentFloor: number;
  playerPosition: Coordinate | null;
  setLabyrinth: (labyrinth: Labyrinth | null) => void;
  setCurrentFloor: (floor: number) => void;
  setPlayerPosition: (position: Coordinate) => void;
  // Add a way to trigger re-renders for map/quest data
  gameVersion: number;
  incrementGameVersion: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  labyrinth: null,
  currentFloor: 0,
  playerPosition: null,
  gameVersion: 0,
  setLabyrinth: (labyrinth) => set({ labyrinth }),
  setCurrentFloor: (floor) => set({ currentFloor: floor }),
  setPlayerPosition: (position) => set({ playerPosition: position }),
  incrementGameVersion: () => set((state) => ({ gameVersion: state.gameVersion + 1 })),
}));