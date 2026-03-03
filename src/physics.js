export const HEAD_SIZE = 130;
const BOUNCE = 0.8;
const SPIN_DECAY = 0.993;
const EDGE_OVERFLOW = 65;

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

      // Wall bounce (allow overflow so heads go partially offscreen)
      const minX = -EDGE_OVERFLOW;
      const minY = -EDGE_OVERFLOW;
      const maxX = window.innerWidth - HEAD_SIZE + EDGE_OVERFLOW;
      const maxY = window.innerHeight - HEAD_SIZE + EDGE_OVERFLOW;
      if (s.x < minX) { s.x = minX; s.vx = Math.abs(s.vx) * BOUNCE; }
      if (s.x > maxX) { s.x = maxX; s.vx = -Math.abs(s.vx) * BOUNCE; }
      if (s.y < minY) { s.y = minY; s.vy = Math.abs(s.vy) * BOUNCE; }
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
