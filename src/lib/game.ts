class Player {
  private lastFootprintTime = 0;
  private footprintSide: 'left' | 'right' = 'left';
  private isInBlood = false;
  private lastBloodContactTime = 0;

  // Add this method to check blood contact
  checkBloodContact() {
    const coordStr = `${this.x},${this.y},${this.labyrinth.currentFloor}`;
    this.isInBlood = this.labyrinth.bloodPools.has(coordStr);
    
    if (this.isInBlood) {
      this.lastBloodContactTime = Date.now();
    }
  }

  move(direction: Direction) {
    // ... existing move logic ...
    
    this.checkBloodContact(); // Check for blood contact after moving
    
    // Add bloody footprints when:
    // 1. Injured, or 
    // 2. Recently stepped in blood (within last 3 seconds)
    const shouldLeaveFootprints = 
      this.health < this.maxHealth || 
      (this.isInBlood || Date.now() - this.lastBloodContactTime < 3000);
    
    if (shouldLeaveFootprints && Date.now() - this.lastFootprintTime > 500) {
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