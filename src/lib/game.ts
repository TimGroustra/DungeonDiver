// Add to Labyrinth class properties
public bloodyFootprints: Map<string, { createdAt: number, direction: 'left' | 'right' }> = new Map();

// Add this method to Labyrinth class
public addBloodyFootprint(x: number, y: number, direction: 'left' | 'right') {
  const coordStr = `${x},${y},${this.currentFloor}`;
  this.bloodyFootprints.set(coordStr, { 
    createdAt: Date.now(),
    direction
  });
}

// Update the Player class to track movement
class Player {
  private lastFootprintTime = 0;
  private footprintSide: 'left' | 'right' = 'left';

  move(direction: Direction) {
    // ... existing move logic ...
    
    // Add bloody footprints every 0.5 seconds when moving while injured
    if (this.health < this.maxHealth && Date.now() - this.lastFootprintTime > 500) {
      this.labyrinth.addBloodyFootprint(
        this.x, 
        this.y, 
        this.footprintSide
      );
      this.footprintSide = this.footprintSide === 'left' ? 'right' : 'left';
      this.lastFootprintTime = Date.now();
    }
  }
}