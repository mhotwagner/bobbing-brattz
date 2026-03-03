import React, { useRef, useEffect, useState, useCallback } from "react";
import ArenaRing from "../components/ArenaRing";
import PlayerHead from "../components/PlayerHead";
import RemotePlayerHead from "../components/RemotePlayerHead";
import ArenaItem from "../components/ArenaItem";
import HUD from "../components/HUD";
import ArenaPicker from "../components/ArenaPicker";
import { ARENAS } from "../lib/arenas";
import {
  createPlayerState,
  applyFling,
  stepPhysics,
  resolveCollision,
  clampSpeed,
} from "../engine/arenaPhysics";
import { createInputState, getSlingshotVector } from "../engine/inputHandler";
import { createGameLoop } from "../engine/gameLoop";
import {
  createNetSync,
  createRemoteState,
  updateRemoteTarget,
  interpolateRemote,
} from "../engine/netSync";

function triggerHit(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  // Remove and re-add class to allow re-triggering
  el.classList.remove("brawl-player-head--hit");
  void el.offsetWidth; // reflow
  el.classList.add("brawl-player-head--hit");
  clearTimeout(el._hitTimer);
  el._hitTimer = setTimeout(() => {
    el.classList.remove("brawl-player-head--hit");
  }, 250);
}

function triggerScreenShake() {
  const el = document.querySelector(".brawl-game");
  if (!el) return;
  el.classList.remove("brawl-game--shake");
  void el.offsetWidth; // reflow to allow re-trigger
  el.classList.add("brawl-game--shake");
  el.addEventListener("animationend", () => {
    el.classList.remove("brawl-game--shake");
  }, { once: true });
}

export default function Game({
  roomCode,
  myId,
  myCharacter,
  players,
  arena,
  spawns,
  arenaRadius: propRadius,
  send,
  phase,
  isHost,
  isRandom,
  onStart,
  onSetArena,
}) {
  const [countdownNum, setCountdownNum] = useState(phase === "countdown" ? 3 : null);
  const [livePlayers, setLivePlayers] = useState(() =>
    players.map((p) => ({ ...p, alive: true, hp: p.hp ?? 5, shield: false, speedBoost: false }))
  );
  const [items, setItems] = useState([]);
  const [localPowerups, setLocalPowerups] = useState({ shield: false, speedBoostUntil: 0 });

  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const arenaRadius = propRadius || Math.min(vw, vh) * 0.42;
  const centerX = vw / 2;
  const centerY = vh / 2;

  const localStateRef = useRef(null);
  const inputRef = useRef(createInputState());
  const remoteStatesRef = useRef(new Map());
  const gameLoopRef = useRef(null);
  const netSyncRef = useRef(null);
  const slingshotRef = useRef(null);
  const localPowerupsRef = useRef(localPowerups);
  // Keep ref in sync
  useEffect(() => { localPowerupsRef.current = localPowerups; }, [localPowerups]);

  // Initialize local player state from spawn position
  // Server sends normalized spawns (nx, ny as fraction of arena radius)
  // Client converts to screen coordinates
  useEffect(() => {
    if (!myId) return;
    const mySpawn = spawns?.[myId];
    if (mySpawn && mySpawn.nx != null) {
      localStateRef.current = createPlayerState(
        centerX + mySpawn.nx * arenaRadius,
        centerY + mySpawn.ny * arenaRadius
      );
    } else if (!localStateRef.current) {
      // Warmup: no spawn yet, place at center
      localStateRef.current = createPlayerState(centerX, centerY);
    }
  }, [spawns, myId, centerX, centerY, arenaRadius]);

  // Initialize remote player states
  useEffect(() => {
    const existing = remoteStatesRef.current;
    const remotes = new Map();
    for (const p of players) {
      if (p.id === myId) continue;
      // Reuse existing remote state if we have one (preserves interpolation)
      if (existing.has(p.id)) {
        remotes.set(p.id, existing.get(p.id));
      } else {
        const spawn = spawns?.[p.id];
        const remote = createRemoteState();
        if (spawn && spawn.nx != null) {
          remote.x = centerX + spawn.nx * arenaRadius;
          remote.y = centerY + spawn.ny * arenaRadius;
          remote.targetX = remote.x;
          remote.targetY = remote.y;
        } else {
          remote.x = centerX;
          remote.y = centerY;
          remote.targetX = centerX;
          remote.targetY = centerY;
        }
        remotes.set(p.id, remote);
      }
    }
    remoteStatesRef.current = remotes;
  }, [players, myId, spawns, centerX, centerY]);

  useEffect(() => {
    netSyncRef.current = createNetSync(send, () => ({
      centerX, centerY, radius: arenaRadius,
    }));
  }, [send, centerX, centerY, arenaRadius]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "countdown") {
      setCountdownNum(null);
      return;
    }

    setCountdownNum(3);
    const t2 = setTimeout(() => setCountdownNum(2), 1000);
    const t1 = setTimeout(() => setCountdownNum(1), 2000);
    const tGo = setTimeout(() => setCountdownNum("BRAWL!"), 3000);
    const tClear = setTimeout(() => setCountdownNum(null), 3800);

    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tGo);
      clearTimeout(tClear);
    };
  }, [phase]);

  // Main game loop — runs during BOTH warmup and playing
  useEffect(() => {
    if (phase !== "warmup" && phase !== "playing") return;
    if (!localStateRef.current) return;

    const isPlaying = phase === "playing";

    const loop = createGameLoop(() => {
      const local = localStateRef.current;
      if (!local || !local.alive) return;

      // Apply speed boost clamp if active
      const pwr = localPowerupsRef.current;
      const speedMult = pwr.speedBoostUntil > Date.now() ? 1.5 : 1;
      if (speedMult > 1) clampSpeed(local, speedMult);

      // Step local physics
      const { knocked } = stepPhysics(local, arenaRadius, centerX, centerY);

      if (knocked && isPlaying) {
        send({ type: "fell" });
        setLivePlayers((prev) =>
          prev.map((p) => (p.id === myId ? { ...p, alive: false } : p))
        );
        return;
      } else if (knocked && !isPlaying) {
        // Warmup: just bounce back, don't eliminate
        local.alive = true;
        // Reset to center if flung off
        local.x = centerX;
        local.y = centerY;
        local.vx = 0;
        local.vy = 0;
      }

      // Resolve collisions with remote players
      for (const [id, remote] of remoteStatesRef.current) {
        if (!remote) continue;
        // Skip collision while remote is mid-knock (already flying away)
        if (Math.abs(remote.knockVx) > 1 || Math.abs(remote.knockVy) > 1) continue;
        // Capture pre-collision velocity for momentum transfer
        const preVx = local.vx;
        const preVy = local.vy;
        const remoteAsState = {
          x: remote.x, y: remote.y,
          vx: remote.targetVx, vy: remote.targetVy, spin: 0,
        };
        const hit = resolveCollision(local, remoteAsState);
        // Always propagate overlap separation back to remote
        remote.x = remoteAsState.x;
        remote.y = remoteAsState.y;
        if (hit) {
          // Pool-ball momentum transfer: give remote the velocity local lost
          const transferVx = preVx - local.vx;
          const transferVy = preVy - local.vy;
          remote.knockVx = transferVx * 0.8;
          remote.knockVy = transferVy * 0.8;
          if (navigator.vibrate) navigator.vibrate(30);
          triggerHit(".brawl-player-head--local");
          triggerHit(`[data-player-id="${id}"]`);
          triggerScreenShake();
        }
      }

      // Interpolate remote players
      for (const [, remote] of remoteStatesRef.current) {
        interpolateRemote(remote);
      }

      // Send position
      netSyncRef.current?.maybeSend(local, performance.now());

      // Update slingshot indicator
      updateSlingshot();
    });

    gameLoopRef.current = loop;
    loop.start();

    return () => loop.stop();
  }, [phase, arenaRadius, centerX, centerY, myId, send]);

  // Handle network messages
  useEffect(() => {
    function handleBrawlMessage(e) {
      const msg = e.detail;
      if (!msg) return;

      if (msg.type === "pos" && msg.id !== myId) {
        const remote = remoteStatesRef.current.get(msg.id);
        if (remote) {
          updateRemoteTarget(remote, msg, centerX, centerY, arenaRadius);
        }
      }

      if (msg.type === "bump") {
        const local = localStateRef.current;
        if (!local) return;
        if (msg.a.id === myId) {
          local.vx = msg.a.vx * arenaRadius;
          local.vy = msg.a.vy * arenaRadius;
        }
        if (msg.b.id === myId) {
          local.vx = msg.b.vx * arenaRadius;
          local.vy = msg.b.vy * arenaRadius;
        }
        if (navigator.vibrate) navigator.vibrate(50);
      }

      if (msg.type === "hit") {
        setLivePlayers((prev) =>
          prev.map((p) => {
            const update = msg.players.find((u) => u.id === p.id);
            return update ? { ...p, hp: update.hp, shield: update.shield ?? p.shield } : p;
          })
        );
      }

      if (msg.type === "ko") {
        setLivePlayers((prev) =>
          prev.map((p) => (p.id === msg.playerId ? { ...p, alive: false } : p))
        );
      }

      // --- Power-up item messages ---
      if (msg.type === "room_items") {
        // Sync items from room state (reconnect / late join)
        setItems(msg.items.map((it) => ({ id: it.id, nx: it.nx, ny: it.ny, asset: it.asset, powerup: it.powerup })));
      }

      if (msg.type === "item_spawn") {
        setItems((prev) => [...prev, { id: msg.itemId, nx: msg.nx, ny: msg.ny, asset: msg.asset, powerup: msg.powerup }]);
      }

      if (msg.type === "item_collect") {
        setItems((prev) => prev.filter((it) => it.id !== msg.itemId));
        // Update player state
        setLivePlayers((prev) =>
          prev.map((p) => {
            if (p.id !== msg.playerId) return p;
            const updates = { hp: msg.hp };
            if (msg.powerup === "shield") updates.shield = true;
            if (msg.powerup === "speed") updates.speedBoost = true;
            return { ...p, ...updates };
          })
        );
        // If it's the local player, update local powerup state
        if (msg.playerId === myId) {
          if (navigator.vibrate) navigator.vibrate(20);
          if (msg.powerup === "speed") {
            setLocalPowerups((prev) => ({ ...prev, speedBoostUntil: Date.now() + 4000 }));
          } else if (msg.powerup === "shield") {
            setLocalPowerups((prev) => ({ ...prev, shield: true }));
          }
        }
      }

      if (msg.type === "item_despawn") {
        setItems((prev) => prev.filter((it) => it.id !== msg.itemId));
      }

      if (msg.type === "powerup_end") {
        setLivePlayers((prev) =>
          prev.map((p) => {
            if (p.id !== msg.playerId) return p;
            if (msg.powerup === "shield") return { ...p, shield: false };
            if (msg.powerup === "speed") return { ...p, speedBoost: false };
            return p;
          })
        );
        if (msg.playerId === myId) {
          if (msg.powerup === "speed") {
            setLocalPowerups((prev) => ({ ...prev, speedBoostUntil: 0 }));
          } else if (msg.powerup === "shield") {
            setLocalPowerups((prev) => ({ ...prev, shield: false }));
          }
        }
      }
    }

    window.addEventListener("brawl-msg", handleBrawlMessage);
    return () => window.removeEventListener("brawl-msg", handleBrawlMessage);
  }, [myId, centerX, centerY, arenaRadius]);

  const updateSlingshot = useCallback(() => {
    const svg = slingshotRef.current;
    if (!svg) return;
    const input = inputRef.current;
    const vec = getSlingshotVector(input);

    if (!vec) {
      svg.style.display = "none";
      return;
    }

    svg.style.display = "block";
    const line = svg.querySelector(".brawl-slingshot__line");
    const arrow = svg.querySelector(".brawl-slingshot__arrow");
    const local = localStateRef.current;
    if (!local) return;

    if (line) {
      const len = Math.min(vec.dist, 100);
      line.setAttribute("x1", local.x);
      line.setAttribute("y1", local.y);
      line.setAttribute("x2", local.x + vec.nx * len);
      line.setAttribute("y2", local.y + vec.ny * len);
    }

    if (arrow) {
      const len = Math.min(vec.dist, 100);
      const tipX = local.x + vec.nx * len;
      const tipY = local.y + vec.ny * len;
      const perpX = -vec.ny;
      const perpY = vec.nx;
      const sz = 8;
      arrow.setAttribute(
        "points",
        `${tipX},${tipY} ${tipX - vec.nx * sz + perpX * sz},${tipY - vec.ny * sz + perpY * sz} ${tipX - vec.nx * sz - perpX * sz},${tipY - vec.ny * sz - perpY * sz}`
      );
    }
  }, []);

  const handleDragStart = useCallback((px, py) => {
    const input = inputRef.current;
    input.active = true;
    input.startX = px;
    input.startY = py;
    input.currentX = px;
    input.currentY = py;
  }, []);

  const handleDragMove = useCallback((px, py) => {
    const input = inputRef.current;
    if (!input.active) return;
    input.currentX = px;
    input.currentY = py;
  }, []);

  const handleDragEnd = useCallback((px, py) => {
    const input = inputRef.current;
    if (!input.active) return;
    input.active = false;

    const local = localStateRef.current;
    if (!local || !local.alive) return;

    const pwr = localPowerupsRef.current;
    const speedMult = pwr.speedBoostUntil > Date.now() ? 1.5 : 1;
    applyFling(local, input.startX, input.startY, px, py, speedMult);

    if (slingshotRef.current) {
      slingshotRef.current.style.display = "none";
    }
  }, []);

  // Sync live players from props
  useEffect(() => {
    setLivePlayers((prev) => {
      const prevMap = new Map(prev.map((p) => [p.id, p]));
      return players.map((p) => ({
        ...p,
        alive: prevMap.has(p.id) ? prevMap.get(p.id).alive : true,
        hp: p.hp ?? (prevMap.has(p.id) ? prevMap.get(p.id).hp : 5),
        shield: p.shield ?? (prevMap.has(p.id) ? prevMap.get(p.id).shield : false),
        speedBoost: p.speedBoost ?? (prevMap.has(p.id) ? prevMap.get(p.id).speedBoost : false),
      }));
    });
  }, [players]);

  const needsMorePlayers = players.length < 2;
  const canStart = isHost && !isRandom && players.length >= 2 && arena;

  return (
    <ArenaRing arenaId={arena || "ignite"} radius={arenaRadius} centerX={centerX} centerY={centerY}>
      <HUD players={livePlayers} />

      {/* Power-up items */}
      {items.map((it) => (
        <ArenaItem
          key={it.id}
          itemId={it.id}
          nx={it.nx}
          ny={it.ny}
          asset={it.asset}
          powerup={it.powerup}
          centerX={centerX}
          centerY={centerY}
          arenaRadius={arenaRadius}
        />
      ))}

      {/* Remote players */}
      {players
        .filter((p) => p.id !== myId)
        .map((p) => {
          const lp = livePlayers.find((lp) => lp.id === p.id);
          return (
            <RemotePlayerHead
              key={p.id}
              playerId={p.id}
              remoteState={remoteStatesRef.current.get(p.id)}
              character={p.character}
              alive={lp?.alive ?? true}
              shielded={lp?.shield ?? false}
              speedBoost={lp?.speedBoost ?? false}
            />
          );
        })}

      {/* Local player */}
      {localStateRef.current && (
        <PlayerHead
          state={localStateRef.current}
          character={myCharacter}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          shielded={localPowerups.shield}
          speedBoost={localPowerups.speedBoostUntil > Date.now()}
        />
      )}

      {/* Slingshot indicator */}
      <svg
        ref={slingshotRef}
        className="brawl-slingshot"
        style={{ display: "none", position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <line className="brawl-slingshot__line" />
        <polygon className="brawl-slingshot__arrow" />
      </svg>

      {/* Warmup overlay — in-game waiting */}
      {phase === "warmup" && (
        <div className="brawl-warmup-overlay">
          {needsMorePlayers ? (
            <div className="brawl-warmup-overlay__text">
              Waiting for players...
            </div>
          ) : isRandom ? (
            <div className="brawl-warmup-overlay__text">
              Starting soon...
            </div>
          ) : (
            <>
              {!arena && isHost && (
                <div style={{ pointerEvents: "auto", marginBottom: 8 }}>
                  <ArenaPicker arenas={ARENAS} selected={arena} onSelect={onSetArena} />
                </div>
              )}
              {canStart && (
                <button
                  className="brawl-btn brawl-warmup-overlay__start"
                  onClick={onStart}
                >
                  Start Brawl
                </button>
              )}
              {!isHost && (
                <div className="brawl-warmup-overlay__text">
                  Waiting for host...
                </div>
              )}
            </>
          )}
          {roomCode && roomCode !== "RANDOM" && (
            <div
              className="brawl-warmup-overlay__code"
              onClick={() => {
                const url = `${window.location.origin}/brawl?room=${roomCode}`;
                if (navigator.share) {
                  navigator.share({ title: "Brat Brawl", url });
                } else {
                  navigator.clipboard.writeText(url);
                }
              }}
            >
              Room: {roomCode} (tap to share)
            </div>
          )}
        </div>
      )}

      {/* Countdown overlay */}
      {countdownNum !== null && (
        <div className="brawl-countdown">
          <div key={countdownNum} className="brawl-countdown__number">
            {countdownNum}
          </div>
        </div>
      )}

      <div className="brawl-connection brawl-connection--connected" />
    </ArenaRing>
  );
}
