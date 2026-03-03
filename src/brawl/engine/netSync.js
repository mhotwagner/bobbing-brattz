// Network sync for Brat Brawl
// Send local position @20Hz, interpolate remote players

const SEND_INTERVAL = 50; // 20Hz = 50ms
const LERP_FACTOR = 0.2;

export function createNetSync(send, getArenaParams) {
  let lastSendTime = 0;

  return {
    // Call every frame to potentially send position update
    // Positions are normalized: center=(0,0), arena edge=1.0
    maybeSend(state, time) {
      if (time - lastSendTime < SEND_INTERVAL) return;
      lastSendTime = time;

      const { centerX, centerY, radius } = getArenaParams();
      send({
        type: "pos",
        x: Math.round(((state.x - centerX) / radius) * 1000) / 1000,
        y: Math.round(((state.y - centerY) / radius) * 1000) / 1000,
        vx: Math.round((state.vx / radius) * 1000) / 1000,
        vy: Math.round((state.vy / radius) * 1000) / 1000,
        a: Math.round(state.angle) % 360,
        s: Math.round(state.spin * 10) / 10,
      });
    },
  };
}

// Remote player state with interpolation
export function createRemoteState() {
  return {
    // Current render position
    x: 0,
    y: 0,
    angle: 0,
    spin: 0,
    // Target from network
    targetX: 0,
    targetY: 0,
    targetVx: 0,
    targetVy: 0,
    targetAngle: 0,
    targetSpin: 0,
    // Local knock velocity from collisions (pool-ball momentum transfer)
    knockVx: 0,
    knockVy: 0,
    // Last update time
    lastUpdate: 0,
  };
}

// Convert normalized network coords back to screen space
export function updateRemoteTarget(remote, msg, centerX, centerY, radius) {
  remote.targetX = msg.x * radius + centerX;
  remote.targetY = msg.y * radius + centerY;
  remote.targetVx = msg.vx * radius;
  remote.targetVy = msg.vy * radius;
  remote.targetAngle = msg.a;
  remote.targetSpin = msg.s;
  remote.lastUpdate = performance.now();
}

const KNOCK_FRICTION = 0.92;
const KNOCK_THRESHOLD = 0.3;

export function interpolateRemote(remote) {
  // Apply knock velocity (pool-ball momentum from local collisions)
  if (Math.abs(remote.knockVx) > KNOCK_THRESHOLD || Math.abs(remote.knockVy) > KNOCK_THRESHOLD) {
    remote.x += remote.knockVx;
    remote.y += remote.knockVy;
    remote.knockVx *= KNOCK_FRICTION;
    remote.knockVy *= KNOCK_FRICTION;
  } else {
    remote.knockVx = 0;
    remote.knockVy = 0;
  }

  // Predict forward based on network velocity
  const timeSinceUpdate = performance.now() - remote.lastUpdate;
  const predFrames = timeSinceUpdate / 16.67; // frames at 60fps
  const predictedX = remote.targetX + remote.targetVx * Math.min(predFrames, 3) * 0.5;
  const predictedY = remote.targetY + remote.targetVy * Math.min(predFrames, 3) * 0.5;

  // Lerp toward predicted position (weaker while being knocked)
  const knockSpeed = Math.sqrt(remote.knockVx * remote.knockVx + remote.knockVy * remote.knockVy);
  const lerp = knockSpeed > 1 ? 0.05 : LERP_FACTOR;
  remote.x += (predictedX - remote.x) * lerp;
  remote.y += (predictedY - remote.y) * lerp;
  remote.angle += (remote.targetAngle - remote.angle) * LERP_FACTOR;
  remote.spin = remote.targetSpin;
}
