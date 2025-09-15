// In the _placeBossArea method, update the wall placement logic:
private _placeBossArea(floorMap: (LogicalRoom | 'wall')[][], floor: number, rooms: Room[]) {
  const passageStartX = this.MAP_WIDTH - 40;
  const passageEndX = this.MAP_WIDTH - 1;
  const passageCenterY = Math.floor(this.MAP_HEIGHT / 2);

  const halfCorridor = Math.floor(this.CORRIDOR_WIDTH / 2);

  // Carve the main boss passage
  for (let x = passageStartX; x <= passageEndX; x++) {
    for (let y = passageCenterY - halfCorridor; y <= passageCenterY + halfCorridor; y++) {
      if (x >= 0 && x < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT) {
        floorMap[y][x] = new LogicalRoom(`boss-passage-${x}-${y}-f${floor}`, `Watcher's Domain ${x},${y}`, "The air here is thick with an oppressive presence. You feel watched.");
        this.bossPassageCoords.add(`${x},${y},${floor}`);
      }
    }
  }

  // Add wall tiles every second tile in the central row of the boss passage
  for (let x = passageStartX; x <= passageEndX; x++) {
    const coordStr = `${x},${passageCenterY},${floor}`;
    // Ensure it's an open tile before converting to wall
    if (floorMap[passageCenterY][x] !== 'wall') {
      // Place a wall every second tile, starting from passageStartX
      if ((x - passageStartX) % 2 === 0) { // Check if it's an even offset from the start
        floorMap[passageCenterY][x] = 'wall';
        this.bossPassageCoords.delete(coordStr); // Remove from boss passage coords
      } else {
        // If it's an odd offset, it remains open and is a safe tile
        this.bossSafeTiles.add(coordStr); // Add to safe tiles
      }
    }
  }

  // Rest of the method remains the same...
}

// Update the processBossLogic method to check for safe tiles:
public processBossLogic() {
  if (this.gameOver || this.currentFloor !== this.NUM_FLOORS - 1 || this.bossDefeated) {
      return;
  }

  const now = Date.now();
  const stateChangeInterval = 4000;
  const gazeDamageInterval = 1000;

  const playerCoordStr = `${this.playerLocation.x},${this.playerLocation.y},${this.currentFloor}`;
  const isInBossPassage = this.bossPassageCoords.has(playerCoordStr);
  const isOnSafeTile = this.bossSafeTiles.has(playerCoordStr);

  // Handle boss state changes
  if (now - this.lastBossStateChange > stateChangeInterval) {
      this.lastBossStateChange = now;
      
      if (this.bossState === 'not_watching') {
          this.bossState = 'red_light';
          this.isRedLightPulseActive = true;
          this.lastGazeDamageTimestamp = now;
          if (isInBossPassage && !isOnSafeTile) {
              this.addMessage("The Labyrinth's Gaze turns towards you! The passage pulses with a blinding light! Find shelter between the pillars!");
          }
      } else {
          this.bossState = 'not_watching';
          this.isRedLightPulseActive = false;
          this.lastGazeDamageTimestamp = 0;
          if (isInBossPassage) {
              this.addMessage("The Labyrinth's Gaze shifts away. The passage dims. You may move freely.");
          }

          if (isInBossPassage && this.playerStunnedTurns === 0) { 
              if (this.watcherOfTheCore) {
                  const stressDamage = 10;
                  this.watcherOfTheCore.takeDamage(stressDamage);
                  this.addMessage(`You successfully evaded The Watcher's gaze! It shudders, taking ${stressDamage} stress damage. Its remaining will: ${this.watcherOfTheCore.health}`);
                  if (this.watcherOfTheCore.defeated) {
                      this.addMessage("The Watcher of the Core's will is broken! It stands defeated, its gaze no longer a threat.");
                      this.bossDefeated = true;
                  }
              }
          }
      }
  }

  // Apply gaze damage only if not on a safe tile
  if (this.bossState === 'red_light' && isInBossPassage && !isOnSafeTile) {
      if (now - this.lastGazeDamageTimestamp > gazeDamageInterval) {
          const damageTaken = 25;
          this.playerHealth -= damageTaken;
          this.lastHitEntityId = 'player';
          this.playerStunnedTurns = 1;
          this.addMessage(`The Labyrinth's Gaze burns into your mind! You take ${damageTaken} damage and feel disoriented!`);
          this.lastGazeDamageTimestamp = now;

          if (this.playerHealth <= 0) {
              if (!this._tryActivateWellBlessing(playerName, time, "The Watcher's Gaze")) {
                  this.addMessage("The Labyrinth's Gaze consumes you. Darkness... Game Over.");
                  this.setGameOver('defeat', playerName, time, "The Watcher's Gaze");
                  return;
              }
          }
      }
  }
}