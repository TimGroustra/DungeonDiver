// Add this to the Labyrinth class properties
public bloodPools: Map<string, { createdAt: number }> = new Map(); // "x,y,floor" -> timestamp

// Add this method to the Labyrinth class
public addBloodPool(x: number, y: number) {
  const coordStr = `${x},${y},${this.currentFloor}`;
  this.bloodPools.set(coordStr, { createdAt: Date.now() });
}

// Add this to the takeDamage method in the Enemy class
takeDamage(amount: number) {
  this.health -= amount;
  if (this.health <= 0) {
    this.defeated = true;
    // Add blood pool at enemy's location when defeated
    const coord = this.labyrinth.getCoordForElement(this.id, this.labyrinth.enemyLocations, this.labyrinth.currentFloor);
    if (coord) {
      this.labyrinth.addBloodPool(coord.x, coord.y);
    }
  }
}