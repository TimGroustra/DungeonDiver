// ... (in the processBossLogic method)
  if (isInBossPassage) {
    const passageStartX = this.MAP_WIDTH - 40;
    const isSafeTile = (this.playerLocation.x - passageStartX) % 6 === 0;
    
    if (this.bossState === 'red_light' && !isSafeTile) {
      const damageTaken = 25;
      this.playerHealth -= damageTaken;
      this.lastHitEntityId = 'player';
      this.playerStunnedTurns = 1;
      this.addMessage(`The Labyrinth's Gaze pulses brightly! You moved and are caught in the temporal distortion! You take ${damageTaken} damage and feel disoriented!`);
      if (this.playerHealth <= 0) {
        if (!this._tryActivateWellBlessing(playerName, time, "Temporal Distortion (Moved during Red Light)")) {
          this.addMessage("The Labyrinth's Gaze consumes you. Darkness... Game Over.");
          this.setGameOver('defeat', playerName, time, "Temporal Distortion (Moved during Red Light)");
          return;
        }
      }
    }
  }
  // ... (rest of the method remains the same)