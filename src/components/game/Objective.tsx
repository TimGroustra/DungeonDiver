"use client";

import React from "react";
import { Labyrinth } from "@/lib/game";
import { cn } from "@/lib/utils";

interface ObjectiveProps {
  labyrinth: Labyrinth;
}

const Objective: React.FC<ObjectiveProps> = ({ labyrinth }) => {
  const objective = labyrinth.getCurrentFloorObjective();
  return (
    <div>
      <h3 className="text-xl font-bold text-yellow-300 dark:text-yellow-600 mb-2">Current Objective (Floor {labyrinth.getCurrentFloor() + 1}):</h3>
      <p className="text-base text-gray-300 dark:text-gray-700 italic">
          {objective.description}
      </p>
      <p className={cn(
          "text-sm font-semibold mt-1",
          objective.isCompleted() ? "text-green-400 dark:text-green-500" : "text-red-400 dark:text-red-500"
      )}>
          Status: {objective.isCompleted() ? "Completed!" : "In Progress"}
      </p>
    </div>
  );
};

export default Objective;