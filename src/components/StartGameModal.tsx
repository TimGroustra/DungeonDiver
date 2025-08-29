"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface StartGameModalProps {
  isOpen: boolean;
  onStartGame: (playerName: string) => void;
  onClose: () => void;
}

const StartGameModal: React.FC<StartGameModalProps> = ({ isOpen, onStartGame, onClose }) => {
  const [playerName, setPlayerName] = useState("");

  const handleStart = () => {
    if (playerName.trim()) {
      onStartGame(playerName.trim());
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleStart();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 dark:text-yellow-600">Welcome, Adventurer!</DialogTitle>
          <DialogDescription className="text-gray-300 dark:text-gray-700">
            Enter your name to begin your perilous journey into the Labyrinth of Whispers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-gray-200 dark:text-gray-800">
              Player Name
            </Label>
            <Input
              id="name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="col-span-3 bg-gray-700 text-gray-100 border-gray-600 dark:bg-gray-200 dark:text-gray-900 dark:border-gray-400"
              placeholder="Your Hero's Name"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleStart}
            disabled={!playerName.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Start Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartGameModal;