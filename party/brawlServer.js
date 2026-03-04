// PartyKit server for Brat Brawl
// Handles: room management, game lifecycle, collision authority

const MAX_PLAYERS = 2;
const COUNTDOWN_MS = 3000;
const PLAYER_RADIUS = 0.133; // ~40px at 300px arena radius, in normalized space
const AUTO_START_DELAY = 5000; // auto-start 5s after 2+ players in random rooms
const MAX_HP = 5;
const COLLISION_COOLDOWN_MS = 500;

// TODO: Add round timer for potential future addition (e.g. 60s time limit per round)

// Power-up item constants
const ITEM_SPAWN_INTERVAL = 8000;
const ITEM_FIRST_SPAWN = 4000;
const MAX_ITEMS = 2;
const ITEM_DESPAWN = 12000;
const ITEM_PICKUP_RADIUS = 0.17;
const SPEED_BOOST_MULT = 1.5;
const SPEED_BOOST_DURATION = 4000;

// Arena item assets per theme (cosmetic only — glow color indicates power-up type)
const ARENA_ITEMS = {
  ignite: ["ignite-chili", "ignite-cocktail", "ignite-discoball", "ignite-firepit"],
  whitelotus: ["whitelotus-hat", "whitelotus-lotus", "white-lotus-mojito", "whitelotus-poolfloat"],
  glamour: ["glamour-bouquet", "glamour-champagne", "glamour-cork", "glamour-ring"],
};

export default class BrawlServer {
  constructor(room) {
    this.room = room;
    this.players = new Map();
    this.host = null;
    this.arena = null;
    this.phase = "lobby"; // lobby | warmup | countdown | playing | results
    this.winner = null;
    this.isRandom = false;
    this.autoStartTimer = null;
    this._collisionCooldowns = new Map(); // keyed by "id1:id2" (sorted), value = timestamp
    this.items = new Map(); // itemId → { id, nx, ny, asset, powerup, spawnedAt }
    this._nextItemId = 0;
    this._itemSpawnTimer = null;
    this._itemFirstSpawnTimer = null;
  }

  onConnect(conn, ctx) {
    conn.send(JSON.stringify({
      type: "room",
      phase: this.phase,
      arena: this.arena,
      players: this._playerList(),
      host: this.host,
      you: conn.id,
      isRandom: this.isRandom,
      items: [...this.items.values()],
    }));
  }

  onMessage(message, sender) {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    switch (msg.type) {
      case "join":
        this._handleJoin(sender, msg);
        break;
      case "arena":
        this._handleArena(sender, msg);
        break;
      case "start":
        this._handleStart(sender);
        break;
      case "pos":
        this._handlePos(sender, msg);
        break;
      case "fell":
        this._handleFell(sender);
        break;
      case "rematch":
        this._handleRematch(sender);
        break;
    }
  }

  onClose(conn) {
    const player = this.players.get(conn.id);
    if (!player) return;

    this.players.delete(conn.id);

    if (this.host === conn.id) {
      const remaining = [...this.players.keys()];
      this.host = remaining.length > 0 ? remaining[0] : null;
    }

    this._broadcast({
      type: "left",
      playerId: conn.id,
      players: this._playerList(),
      host: this.host,
    });

    if (this.phase === "playing") {
      this._checkWinner();
    }

    if (this.players.size === 0) {
      this.phase = "lobby";
      this.arena = null;
      this.winner = null;
      this.isRandom = false;
      this._clearAutoStart();
      this._clearItemSpawning();
    }
  }

  _handleJoin(sender, msg) {
    if (this.players.size >= MAX_PLAYERS) {
      sender.send(JSON.stringify({ type: "error", message: "Room is full" }));
      return;
    }

    // Allow joining during lobby, warmup, and results (but not mid-game)
    if (this.phase === "playing" || this.phase === "countdown") {
      sender.send(JSON.stringify({ type: "error", message: "Game in progress" }));
      return;
    }

    // Check character not taken
    const takenChars = [...this.players.values()].map((p) => p.character);
    if (takenChars.includes(msg.character)) {
      sender.send(JSON.stringify({ type: "error", message: "Character taken" }));
      return;
    }

    // Track if this is a random room
    if (msg.random) {
      this.isRandom = true;
    }

    // Add player
    this.players.set(sender.id, {
      id: sender.id,
      name: msg.name || "Player",
      character: msg.character,
      alive: true,
      hp: MAX_HP,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      shield: false,
      speedBoostUntil: 0,
    });

    if (!this.host) {
      this.host = sender.id;
    }

    // For random rooms, auto-pick arena if not set
    if (this.isRandom && !this.arena) {
      const arenas = ["ignite", "whitelotus", "glamour"];
      this.arena = arenas[Math.floor(Math.random() * arenas.length)];
    }

    // Move to warmup if still in lobby (player is in the arena now)
    if (this.phase === "lobby" || this.phase === "results") {
      this.phase = "warmup";
    }

    // Broadcast updated room state (includes spawn for warmup)
    this._broadcastRoomWithSpawns();

    // Auto-start logic for random rooms
    if (this.isRandom && this.players.size >= 2) {
      this._scheduleAutoStart();
    }
  }

  _handleArena(sender, msg) {
    if (sender.id !== this.host) return;
    this.arena = msg.arena;
    this._broadcastRoomWithSpawns();
  }

  _handleStart(sender) {
    if (sender.id !== this.host) return;
    if (this.players.size < 2) return;
    if (!this.arena) return;
    this._startCountdown();
  }

  _startCountdown() {
    if (this.phase === "countdown" || this.phase === "playing") return;
    this._clearAutoStart();

    this.phase = "countdown";
    this._broadcast({ type: "countdown", duration: COUNTDOWN_MS });

    setTimeout(() => {
      if (this.phase !== "countdown") return;
      this.phase = "playing";

      const spawns = this._getSpawnPositions();
      this._collisionCooldowns.clear();
      for (const [connId, player] of this.players) {
        player.alive = true;
        player.hp = MAX_HP;
        player.x = 0;
        player.y = 0;
        player.vx = 0;
        player.vy = 0;
        player.shield = false;
        player.speedBoostUntil = 0;
      }

      this._broadcast({
        type: "go",
        spawns: Object.fromEntries(spawns),
        arena: this.arena,
      });

      this._startItemSpawning();
    }, COUNTDOWN_MS);
  }

  _scheduleAutoStart() {
    this._clearAutoStart();
    this.autoStartTimer = setTimeout(() => {
      if (this.phase === "warmup" && this.players.size >= 2) {
        this._startCountdown();
      }
    }, AUTO_START_DELAY);
  }

  _clearAutoStart() {
    if (this.autoStartTimer) {
      clearTimeout(this.autoStartTimer);
      this.autoStartTimer = null;
    }
  }

  _handlePos(sender, msg) {
    const player = this.players.get(sender.id);
    if (!player) return;

    // Allow pos updates during warmup (free movement) and playing
    if (this.phase !== "warmup" && this.phase !== "playing") return;

    player.x = msg.x;
    player.y = msg.y;
    player.vx = msg.vx;
    player.vy = msg.vy;

    for (const conn of this.room.getConnections()) {
      if (conn.id !== sender.id) {
        conn.send(JSON.stringify({
          type: "pos",
          id: sender.id,
          x: msg.x,
          y: msg.y,
          vx: msg.vx,
          vy: msg.vy,
          a: msg.a,
          s: msg.s,
        }));
      }
    }

    // Only check collisions and pickups during actual play
    if (this.phase === "playing") {
      this._checkCollisions(sender.id);
      this._checkItemPickups(sender.id);
      this._checkPowerupExpiry(sender.id);
    }
  }

  _handleFell(sender) {
    if (this.phase !== "playing") return;
    const player = this.players.get(sender.id);
    if (!player) return;
    player.alive = false;

    this._broadcast({
      type: "ko",
      playerId: sender.id,
    });

    this._checkWinner();
  }

  _handleRematch(sender) {
    // Anyone can trigger rematch in random rooms, only host in private
    if (!this.isRandom && sender.id !== this.host) return;

    this.phase = "warmup";
    this.winner = null;
    this._collisionCooldowns.clear();
    this._clearItemSpawning();
    for (const player of this.players.values()) {
      player.alive = true;
      player.hp = MAX_HP;
      player.x = 0;
      player.y = 0;
      player.vx = 0;
      player.vy = 0;
      player.shield = false;
      player.speedBoostUntil = 0;
    }
    this._broadcastRoomWithSpawns();

    // Auto-start again for random rooms
    if (this.isRandom && this.players.size >= 2) {
      this._scheduleAutoStart();
    }
  }

  _checkCollisions(moverId) {
    const mover = this.players.get(moverId);
    if (!mover || !mover.alive) return;

    for (const [otherId, other] of this.players) {
      if (otherId === moverId || !other.alive) continue;

      const dx = mover.x - other.x;
      const dy = mover.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = PLAYER_RADIUS * 2;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // Always separate overlap to prevent sticking
        const overlap = minDist - dist;
        mover.x += (nx * overlap) / 2;
        mover.y += (ny * overlap) / 2;
        other.x -= (nx * overlap) / 2;
        other.y -= (ny * overlap) / 2;

        // Cooldown gates BOTH bump and damage to prevent oscillation
        const pairKey = [moverId, otherId].sort().join(":");
        const now = Date.now();
        const lastHit = this._collisionCooldowns.get(pairKey) || 0;
        if (now - lastHit < COLLISION_COOLDOWN_MS) continue;

        const dvx = mover.vx - other.vx;
        const dvy = mover.vy - other.vy;
        const impulse = dvx * nx + dvy * ny;
        if (impulse <= 0) continue; // not approaching

        this._collisionCooldowns.set(pairKey, now);

        // Capture pre-bump speeds to determine attacker
        const moverPreSpeed = Math.sqrt(mover.vx * mover.vx + mover.vy * mover.vy);
        const otherPreSpeed = Math.sqrt(other.vx * other.vx + other.vy * other.vy);

        // Apply bump force
        const bumpForce = 1.2;
        mover.vx -= impulse * nx * bumpForce;
        mover.vy -= impulse * ny * bumpForce;
        other.vx += impulse * nx * bumpForce;
        other.vy += impulse * ny * bumpForce;

        this._broadcast({
          type: "bump",
          a: { id: moverId, x: mover.x, y: mover.y, vx: mover.vx, vy: mover.vy },
          b: { id: otherId, x: other.x, y: other.y, vx: other.vx, vy: other.vy },
        });

        // The player who was moving faster is the attacker; defender takes damage.
        // For head-on at similar speeds, both take damage.
        let moverTakesDmg = true;
        let otherTakesDmg = true;
        const speedRatio = moverPreSpeed / (otherPreSpeed || 0.001);
        if (speedRatio > 1.3) {
          // Mover was faster (attacker) — only other takes damage
          moverTakesDmg = false;
        } else if (speedRatio < 0.77) {
          // Other was faster (attacker) — only mover takes damage
          otherTakesDmg = false;
        }
        // else similar speed → head-on, both take damage

        if (moverTakesDmg) {
          if (mover.shield) {
            mover.shield = false;
            this._broadcast({ type: "powerup_end", playerId: moverId, powerup: "shield" });
          } else {
            mover.hp = Math.max(0, mover.hp - 1);
          }
        }

        if (otherTakesDmg) {
          if (other.shield) {
            other.shield = false;
            this._broadcast({ type: "powerup_end", playerId: otherId, powerup: "shield" });
          } else {
            other.hp = Math.max(0, other.hp - 1);
          }
        }

        this._broadcast({
          type: "hit",
          players: [
            { id: moverId, hp: mover.hp, shield: !!mover.shield },
            { id: otherId, hp: other.hp, shield: !!other.shield },
          ],
        });

        if (mover.hp <= 0) {
          mover.alive = false;
          this._broadcast({ type: "ko", playerId: moverId });
        }
        if (other.hp <= 0) {
          other.alive = false;
          this._broadcast({ type: "ko", playerId: otherId });
        }
        if (mover.hp <= 0 || other.hp <= 0) {
          this._checkWinner();
        }
      }
    }
  }

  _checkWinner() {
    if (this.phase !== "playing") return;

    const alive = [...this.players.entries()].filter(([, p]) => p.alive);
    if (alive.length <= 1) {
      this.phase = "results";
      this._clearItemSpawning();
      this.winner = alive.length === 1 ? alive[0][0] : null;
      this._broadcast({
        type: "result",
        winner: this.winner,
        winnerCharacter: this.winner ? this.players.get(this.winner)?.character : null,
        players: this._playerList(),
      });

      // Auto-rematch for random rooms after 6 seconds
      if (this.isRandom) {
        setTimeout(() => {
          if (this.phase === "results" && this.players.size >= 2) {
            this.phase = "warmup";
            this.winner = null;
            this._collisionCooldowns.clear();
            this._clearItemSpawning();
            for (const player of this.players.values()) {
              player.alive = true;
              player.hp = MAX_HP;
              player.x = 0;
              player.y = 0;
              player.vx = 0;
              player.vy = 0;
              player.shield = false;
              player.speedBoostUntil = 0;
            }
            this._broadcastRoomWithSpawns();
            this._scheduleAutoStart();
          }
        }, 6000);
      }
    }
  }

  // Returns normalized spawn directions (unit circle * 0.6)
  // Client multiplies by its own arenaRadius to get screen positions
  _getSpawnPositions() {
    const spawns = new Map();
    const players = [...this.players.keys()];
    const count = players.length;

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      spawns.set(players[i], {
        nx: Math.cos(angle) * 0.6,
        ny: Math.sin(angle) * 0.6,
      });
    }
    return spawns;
  }

  _playerList() {
    const now = Date.now();
    return [...this.players.entries()].map(([id, p]) => ({
      id,
      name: p.name,
      character: p.character,
      alive: p.alive,
      hp: p.hp,
      shield: !!p.shield,
      speedBoost: p.speedBoostUntil > now,
    }));
  }

  _broadcastRoomWithSpawns() {
    const spawns = Object.fromEntries(this._getSpawnPositions());
    for (const conn of this.room.getConnections()) {
      conn.send(JSON.stringify({
        type: "room",
        phase: this.phase,
        arena: this.arena,
        players: this._playerList(),
        host: this.host,
        you: conn.id,
        isRandom: this.isRandom,
        spawns,
        items: [...this.items.values()],
      }));
    }
  }

  // --- Power-up item system ---

  _startItemSpawning() {
    this._clearItemSpawning();
    // First item spawns after 4s, then every 8s
    this._itemFirstSpawnTimer = setTimeout(() => {
      this._spawnItemTick();
      this._itemSpawnTimer = setInterval(() => this._spawnItemTick(), ITEM_SPAWN_INTERVAL);
    }, ITEM_FIRST_SPAWN);
  }

  _clearItemSpawning() {
    if (this._itemFirstSpawnTimer) {
      clearTimeout(this._itemFirstSpawnTimer);
      this._itemFirstSpawnTimer = null;
    }
    if (this._itemSpawnTimer) {
      clearInterval(this._itemSpawnTimer);
      this._itemSpawnTimer = null;
    }
    // Despawn all existing items
    for (const [itemId] of this.items) {
      this._broadcast({ type: "item_despawn", itemId });
    }
    this.items.clear();
  }

  _spawnItemTick() {
    if (this.phase !== "playing") return;

    // Prune expired items
    const now = Date.now();
    for (const [itemId, item] of this.items) {
      if (now - item.spawnedAt >= ITEM_DESPAWN) {
        this.items.delete(itemId);
        this._broadcast({ type: "item_despawn", itemId });
      }
    }

    // Spawn if under max
    if (this.items.size < MAX_ITEMS) {
      this._spawnItem();
    }
  }

  _spawnItem() {
    // Random position in 0.25–0.75 radius ring
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.25 + Math.random() * 0.5;
    const nx = Math.cos(angle) * radius;
    const ny = Math.sin(angle) * radius;

    // Weighted random power-up type: 35% speed, 35% shield, 30% heal
    const roll = Math.random();
    const powerup = roll < 0.35 ? "speed" : roll < 0.70 ? "shield" : "heal";

    // Random cosmetic asset from current arena
    const arenaItems = ARENA_ITEMS[this.arena] || ARENA_ITEMS.ignite;
    const asset = arenaItems[Math.floor(Math.random() * arenaItems.length)];

    const itemId = this._nextItemId++;
    const item = { id: itemId, nx, ny, asset, powerup, spawnedAt: Date.now() };
    this.items.set(itemId, item);

    this._broadcast({ type: "item_spawn", itemId, nx, ny, asset, powerup });
  }

  _checkItemPickups(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    for (const [itemId, item] of this.items) {
      const dx = player.x - item.nx;
      const dy = player.y - item.ny;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ITEM_PICKUP_RADIUS) {
        this.items.delete(itemId);
        this._applyPowerup(playerId, item.powerup);
        this._broadcast({
          type: "item_collect",
          itemId,
          playerId,
          powerup: item.powerup,
          hp: player.hp,
        });
      }
    }
  }

  _applyPowerup(playerId, type) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (type) {
      case "speed":
        // Reset timer (no double-speed stacking)
        player.speedBoostUntil = Date.now() + SPEED_BOOST_DURATION;
        break;
      case "shield":
        player.shield = true;
        break;
      case "heal":
        player.hp = Math.min(MAX_HP, player.hp + 1);
        break;
    }
  }

  _checkPowerupExpiry(playerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    if (player.speedBoostUntil > 0 && player.speedBoostUntil < Date.now()) {
      player.speedBoostUntil = 0;
      this._broadcast({ type: "powerup_end", playerId, powerup: "speed" });
    }
  }

  _broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const conn of this.room.getConnections()) {
      conn.send(data);
    }
  }
}
