export const HEAD_SIZE = 130;
const BOUNCE = 0.8;
const SPIN_DECAY = 0.993;

const heads = new Map();
let animId = null;

export function register(id, stateRef, elRef) {
  heads.set(id, { stateRef, elRef });
  if (heads.size === 1) start();
}

export function unregister(id) {
  heads.delete(id);
  if (heads.size === 0) stop();
}

function start() {
  function tick(time) {
    const entries = [...heads.values()];

    // Update positions
    for (const { stateRef } of entries) {
      const s = stateRef.current;
      if (s.dragging) continue;

      s.x += s.vx;
      s.y += s.vy;
      s.angle += s.spin;
      s.spin *= SPIN_DECAY;
      if (Math.abs(s.spin) < 0.05) s.spin = 0;

      // Wall bounce
      const maxX = window.innerWidth - HEAD_SIZE;
      const maxY = window.innerHeight - HEAD_SIZE;
      if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx) * BOUNCE; }
      if (s.x > maxX) { s.x = maxX; s.vx = -Math.abs(s.vx) * BOUNCE; }
      if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy) * BOUNCE; }
      if (s.y > maxY) { s.y = maxY; s.vy = -Math.abs(s.vy) * BOUNCE; }
    }

    // Render
    for (const { stateRef, elRef } of entries) {
      const s = stateRef.current;
      const el = elRef.current;
      if (!el) continue;
      el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.angle}deg)`;
    }

    animId = requestAnimationFrame(tick);
  }

  animId = requestAnimationFrame(tick);
}

function stop() {
  cancelAnimationFrame(animId);
  animId = null;
}
