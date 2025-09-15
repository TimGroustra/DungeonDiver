// Add to player rendering
{player.health < player.maxHealth && (
  <circle 
    cx={player.x + 0.5} 
    cy={player.y + 0.9} 
    r={0.1} 
    fill="#8a0303" 
    opacity={0.7}
  />
)}

{player.isInBlood && (
  <>
    <circle 
      cx={player.x + 0.3 + (Math.random() * 0.4)} 
      cy={player.y + 0.9} 
      r={0.05 + (Math.random() * 0.05)} 
      fill="#8a0303" 
      opacity={0.6}
    />
    <circle 
      cx={player.x + 0.3 + (Math.random() * 0.4)} 
      cy={player.y + 0.95} 
      r={0.03 + (Math.random() * 0.03)} 
      fill="#8a0303" 
      opacity={0.4}
    />
  </>
)}