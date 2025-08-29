"use client";

import React, { useEffect, useRef } from "react";
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
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  name: string;
  time: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  highlightName: string | null;
}

const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  leaderboard,
  highlightName,
}) => {
  const highlightRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isOpen && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isOpen, highlightName, leaderboard]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-gray-100 dark:bg-gray-100 dark:text-gray-900 border-gray-700 dark:border-gray-300">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 dark:text-yellow-600">Labyrinth Conquerors!</DialogTitle>
          <DialogDescription className="text-gray-300 dark:text-gray-700">
            See who has escaped the Labyrinth the fastest.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full rounded-md border border-gray-700 dark:border-gray-300 p-4 bg-gray-900 dark:bg-gray-200">
          <ul className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-600 italic">No scores yet. Be the first!</p>
            ) : (
              leaderboard.map((entry, index) => (
                <li
                  key={`${entry.name}-${entry.time}-${index}`}
                  ref={entry.name === highlightName ? highlightRef : null}
                  className={cn(
                    "flex justify-between items-center py-1 px-2 rounded-md",
                    "text-gray-200 dark:text-gray-800",
                    entry.name === highlightName && "bg-blue-600 dark:bg-blue-400 text-white dark:text-gray-900 font-bold"
                  )}
                >
                  <span>{index + 1}. {entry.name}</span>
                  <span>{entry.time.toFixed(2)}s</span>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
        <Button onClick={onClose} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardModal;