export const playSound = (soundFile: string) => {
  const audio = new Audio(soundFile);
  audio.play().catch(error => {
    // Autoplay is often prevented by browsers until the user interacts with the page.
    // We can log this, but it's usually safe to let it fail silently.
    console.log(`Audio playback failed for ${soundFile}:`, error);
  });
};