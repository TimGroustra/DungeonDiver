// ... (previous code remains the same until the boss passage rendering section)

          {/* Render Boss Passage Overlay */}
          {currentFloor === labyrinth["NUM_FLOORS"] - 1 && !isBossDefeated && Array.from(bossPassageCoords).map((coordStr) => {
            const [x, y, f] = coordStr.split(',').map(Number);
            if (f !== currentFloor) return null;

            const isRedLight = bossState === 'red_light';
            // Only show red light effect, no green light
            if (isRedLight) {
              return (
                <rect
                  key={`boss-passage-${coordStr}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  fill="rgba(255, 0, 0, 0.3)"
                  className="animate-pulse-fast"
                />
              );
            }
            return null;
          })}

// ... (rest of the code remains the same)