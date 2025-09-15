// Add to imports
import BloodyFootprints from "@/assets/sprites/bloody-footprints.svg";

// Add to renderMap function
{Array.from(labyrinth.bloodyFootprints.entries()).map(([coordStr, { createdAt, direction }]) => {
  const [x, y, f] = coordStr.split(',').map(Number);
  if (f !== currentFloor) return null;
  
  const age = (Date.now() - createdAt) / 1000;
  if (age > 15) { // Footprints last longer than blood pools
    labyrinth.bloodyFootprints.delete(coordStr);
    return null;
  }
  
  const opacity = 1 - (age / 15); // Fade over 15 seconds
  
  return (
    <image
      key={`footprint-${coordStr}`}
      href={BloodyFootprints}
      x={x}
      y={y}
      width="1"
      height="1"
      opacity={opacity}
      transform={direction === 'left' ? '' : 'scale(-1,1) translate(-32,0)'}
    />
  );
})}