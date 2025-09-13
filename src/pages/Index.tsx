"use client";

import React from 'react';
import LabyrinthGame from '../components/LabyrinthGame';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-3xl font-bold">Welcome to the Labyrinth</h1>
      </header>
      <main className="p-4">
        <LabyrinthGame />
      </main>
    </div>
  );
};

export default Index;