// Arena physics engine for Brat Brawl
// Circular boundary, player-player collision, knockoff detection

const FRICTION = 0.97;
const SPIN_DECAY = 0.96;
const BOUNCE_DAMPING = 0.6;
const PLAYER_RADIUS = 40; // half of 80px head
const FLING_MULT = 1.8;
const TAP_BOOST = 6;
const MAX_SPEED = 25;

export function createPlayerState(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    spin: 0,
    alive: true,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCurrentX: 0,
    dragCurrentY: 0,
  };
}

export function applyFling(state, dragStartX, dragStartY, dragEndX, dragEndY, speedMultiplier = 1) {
  // Slingshot: fling OPPOSITE direction of drag
  const dx = dragStartX - dragEndX;
  const dy = dragStartY - dragEndY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) {
    // Tap — mini boost in a random direction
    const angle = Math.random() * Math.PI * 2;
    state.vx += Math.cos(angle) * TAP_BOOST * speedMultiplier;
    state.vy += Math.sin(angle) * TAP_BOOST * speedMultiplier;
  } else {
    // Scale fling by drag distance, cap it
    const scale = Math.min(dist / 80, 1) * FLING_MULT;
    const nx = dx / dist;
    const ny = dy / dist;
    state.vx += nx * dist * scale * 0.15 * speedMultiplier;
    state.vy += ny * dist * scale * 0.15 * speedMultiplier;
  }
  // Add spin from fling
  state.spin += (state.vx + state.vy) * 2;
  clampSpeed(state, speedMultiplier);
}

export function clampSpeed(state, speedMultiplier = 1) {
  const maxSpd = MAX_SPEED * speedMultiplier;
  const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
  if (speed > maxSpd) {
    state.vx = (state.vx / speed) * maxSpd;
    state.vy = (state.vy / speed) * maxSpd;
  }
}

export function stepPhysics(state, arenaRadius, centerX, centerY) {
  if (!state.alive || state.dragging) return { knocked: false };

  // Integrate velocity
  state.x += state.vx;
  state.y += state.vy;
  state.angle += state.spin;

  // Friction
  state.vx *= FRICTION;
  state.vy *= FRICTION;
  state.spin *= SPIN_DECAY;

  // Stop tiny movements
  if (Math.abs(state.vx) < 0.01) state.vx = 0;
  if (Math.abs(state.vy) < 0.01) state.vy = 0;

  // Circular boundary check (relative to arena center)
  const dx = state.x - centerX;
  const dy = state.y - centerY;
  const distFromCenter = Math.sqrt(dx * dx + dy * dy);
  const boundary = arenaRadius - PLAYER_RADIUS;

  if (distFromCenter > boundary) {
    // Check if fully past the edge (knocked off)
    if (distFromCenter > arenaRadius + PLAYER_RADIUS * 2) {
      state.alive = false;
      return { knocked: true };
    }

    // Soft boundary — push back with decreasing force as they get closer to edge
    // This gives a "teetering on the edge" feel
    const overshot = distFromCenter - boundary;
    const pushForce = overshot * 0.1;
    const nx = dx / distFromCenter;
    const ny = dy / distFromCenter;

    state.vx -= nx * pushForce;
    state.vy -= ny * pushForce;

    // If moving outward fast, they break through
    const radialVelocity = (state.vx * nx + state.vy * ny);
    if (radialVelocity > 8 && overshot > PLAYER_RADIUS) {
      // Too fast, they're going off
      state.alive = false;
      return { knocked: true };
    }
  }

  return { knocked: false };
}

let lastCollisionTime = 0;
const COLLISION_COOLDOWN = 150; // ms between collisions for same pair

export function resolveCollision(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = PLAYER_RADIUS * 2;

  if (dist >= minDist || dist === 0) return false;

  // Separate overlap regardless of cooldown to prevent sticking
  const overlap = minDist - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x += (nx * overlap) / 2;
  a.y += (ny * overlap) / 2;
  b.x -= (nx * overlap) / 2;
  b.y -= (ny * overlap) / 2;

  // Debounce impulse/spin — only apply once per cooldown
  const now = performance.now();
  if (now - lastCollisionTime < COLLISION_COOLDOWN) return false;
  lastCollisionTime = now;

  // Relative velocity along collision normal
  const dvx = a.vx - b.vx;
  const dvy = a.vy - b.vy;
  const impulse = dvx * nx + dvy * ny;

  // Use velocity-based impulse when approaching, otherwise guarantee a
  // minimum bump — remote velocities are often stale (20Hz network updates)
  // so overlap alone is enough proof that a collision happened.
  const MIN_BUMP = -4;
  const effectiveImpulse = Math.min(impulse, MIN_BUMP);

  // Elastic collision with bump boost
  const bumpForce = 1.3;
  a.vx -= effectiveImpulse * nx * bumpForce;
  a.vy -= effectiveImpulse * ny * bumpForce;
  b.vx += effectiveImpulse * nx * bumpForce;
  b.vy += effectiveImpulse * ny * bumpForce;

  // Add spin from collision (clamped)
  const spinImpulse = Math.max(-15, Math.min(15, effectiveImpulse * 0.8));
  a.spin += spinImpulse;
  b.spin -= spinImpulse;

  clampSpeed(a);
  clampSpeed(b);

  return true;
}

export { PLAYER_RADIUS };
