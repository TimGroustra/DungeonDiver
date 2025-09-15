// Add this useEffect hook to the component
useEffect(() => {
  if (!gameStarted || gameResult !== null) return;
  
  const interval = setInterval(() => {
    // Trigger re-render to update blood pool opacities
    setGameVersion(prev => prev + 1);
  }, 1000);
  
  return () => clearInterval(interval);
}, [gameStarted, gameResult]);