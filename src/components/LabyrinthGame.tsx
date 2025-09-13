"use client";

import React from 'react';
import SkeletonWithLegs from './SkeletonWithLegs';

const LabyrinthGame: React.FC = () => {
  // Dummy enemy data for demonstration
  const enemies = [
    { id: 'skeleton-1', x: 100, y: 50 },
    { id: 'skeleton-2', x: 200, y: 150 },
    { id: 'skeleton-3', x: 300, y: 100 },
  ];

  return (
    <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center">
      <h1 className="absolute top-4 left-4 text-white text-2xl">Labyrinth Game</h1>
      <svg className="w-full h-full absolute top-0 left-0" viewBox="0 0 800 600">
        {/* Background grid or map elements could go here */}
        <rect x="0" y="0" width="800" height="600" fill="#333" />

        {enemies.map((enemy) => (
          <SkeletonWithLegs
            key={enemy.id}
            x={enemy.x}
            y={enemy.y}
            width={40}
            height={40}
            color="lightgray"
          />
        ))}
      </svg>
    </div>
  );
};

export default LabyrinthGame;