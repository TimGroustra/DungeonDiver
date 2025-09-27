"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Keyboard } from "lucide-react";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-stone-900/90 border-amber-700 text-amber-50">
        <DialogHeader>
          <DialogTitle className="text-amber-300">How to Play: Labyrinth of Eldoria</DialogTitle>
          <DialogDescription className="text-stone-400">
            Your guide to surviving the treacherous depths.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-stone-300">
            <div>
              <h3 className="font-bold text-amber-200 mb-2">Objective</h3>
              <p>
                Navigate through 4 perilous floors of the labyrinth. On each floor, you must complete a specific objective to unlock the staircase to the next level. Your ultimate goal is to defeat the final boss, The Watcher of the Core, and destroy the Heart of the Labyrinth to escape.
              </p>
            </div>

            <Separator className="bg-amber-800/60" />

            <div>
              <h3 className="font-bold text-amber-200 mb-2 flex items-center"><Keyboard className="mr-2 h-5 w-5" /> Controls</h3>
              <ul className="space-y-2">
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">Arrows / WASD:</strong> Move your character. Pressing a new direction key will turn your character to face that way. Pressing the same key again will move one step forward.</li>
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">Q:</strong> Attack the space directly in front of you.</li>
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">Spacebar:</strong> Jump forward up to 3 spaces, clearing gaps and landing on enemies to defeat them instantly.</li>
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">E:</strong> Shield Bash. If you have a shield equipped, this will push an enemy in front of you backwards. If they hit an obstacle or another enemy, they take damage.</li>
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">Ctrl:</strong> Interact with objects in your current space (like chests or altars) or search your surroundings.</li>
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">M:</strong> Toggle the full-screen map view.</li>
                <li className="flex items-start"><strong className="w-32 font-mono text-amber-300">Shift + Type:</strong> Cast spells. Hold Shift and type the spell name (e.g., 'ICE' or 'BOLT') to cast.</li>
              </ul>
            </div>

            <Separator className="bg-amber-800/60" />

            <div>
              <h3 className="font-bold text-amber-200 mb-2">Gameplay Tips</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong className="text-amber-300">Search Often:</strong> Use the Interact/Search key (Ctrl) to reveal hidden items, traps, and enemies in your vicinity.</li>
                <li><strong className="text-amber-300">Manage Inventory:</strong> Double-click items in your backpack to equip or use them. Better weapons and shields are crucial for survival.</li>
                <li><strong className="text-amber-300">Watch for Traps:</strong> Searching can reveal traps, but some are deadly. Tread carefully. Pushing enemies into traps is a valid strategy!</li>
                <li><strong className="text-amber-300">Complete Objectives:</strong> You cannot proceed to the next floor until the current floor's objective is complete. Check your objective list in the sidebar.</li>
                <li><strong className="text-amber-300">Wallet Bonus:</strong> Connecting your wallet and holding an ElectroGem NFT grants you a powerful starting spell!</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <Button onClick={onClose} className="mt-4 bg-amber-600 hover:bg-amber-500 text-white font-bold">
          Close Guide
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default UserGuideModal;