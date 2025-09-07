import React from 'react';
import { Button } from './ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface ControlsProps {
  onMove: (dx: number, dy: number) => void;
}

const Controls: React.FC<ControlsProps> = ({ onMove }) => {
  return (
    <div className="grid grid-cols-3 gap-2 w-48">
      <div />
      <Button onClick={() => onMove(0, -1)} className="col-start-2 p-2 h-12 w-12">
        <ArrowUp />
      </Button>
      <div />
      <Button onClick={() => onMove(-1, 0)} className="p-2 h-12 w-12">
        <ArrowLeft />
      </Button>
      <Button onClick={() => onMove(0, 1)} className="p-2 h-12 w-12">
        <ArrowDown />
      </Button>
      <Button onClick={() => onMove(1, 0)} className="p-2 h-12 w-12">
        <ArrowRight />
      </Button>
    </div>
  );
};

export default Controls;