// Slingshot input handler for Brat Brawl
// Drag FROM character to aim, release flings opposite direction

export function getPointerPos(e) {
  const touch = e.touches?.[0] ?? e.changedTouches?.[0] ?? e;
  return { px: touch.clientX, py: touch.clientY };
}

export function createInputState() {
  return {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  };
}

// Returns the slingshot vector (direction of fling, opposite of drag)
export function getSlingshotVector(input) {
  if (!input.active) return null;

  const dx = input.startX - input.currentX;
  const dy = input.startY - input.currentY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) return null;

  return {
    // Arrow points in fling direction (opposite of drag)
    dx,
    dy,
    dist,
    // Normalized
    nx: dx / dist,
    ny: dy / dist,
    // Start position (player center)
    sx: input.startX,
    sy: input.startY,
  };
}
