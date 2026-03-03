// rAF game loop orchestrator for Brat Brawl

export function createGameLoop(tickFn) {
  let rafId = null;
  let running = false;
  let lastTime = 0;

  function frame(time) {
    if (!running) return;
    // Cap dt to prevent huge jumps after tab switch
    const dt = Math.min(time - lastTime, 33); // max ~30fps worth of dt
    lastTime = time;
    tickFn(dt);
    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    get running() {
      return running;
    },
  };
}
