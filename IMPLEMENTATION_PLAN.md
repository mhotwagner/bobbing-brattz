# Brat Brawl — Implementation Plan

## Context
Adding a multiplayer bumper/sumo arena game at `/brawl` to the wedding website. Wedding guests join on their phones (landscape, mobile-first), pick a character (Matt/Brian/Ru), pick an arena (Ignite/White Lotus/Tropical Glamour), and brawl — knock each other off the arena edge. Last one standing wins.

## Architecture

**Two deployments, one repo:**
- **Frontend** → Cloudflare Pages (existing) — Vite + React + React Router
- **PartyKit server** → separate deploy via `npx partykit deploy` — handles WebSocket rooms, game lifecycle, collision authority

**Networking model:** Client owns its own physics (snappy on spotty WiFi). Server relays positions between clients and is authoritative for: collisions, knockoff detection, game lifecycle (countdown/start/end/winner).

## New Dependencies
```
npm install react-router-dom partysocket
```

## File Structure

```
src/
  main.jsx                    ← MODIFY: add React Router (/ and /brawl)
  App.jsx                     ← UNCHANGED
  brawl/
    BrawlApp.jsx              ← State machine: landing → lobby → waiting → countdown → playing → results
    screens/
      Landing.jsx             ← Splash screen, Play button
      Lobby.jsx               ← Create/join room, pick character + arena
      WaitingRoom.jsx         ← Room code display, share link, player list, host starts
      Game.jsx                ← Arena gameplay
      Results.jsx             ← Winner + crown, rematch button
    components/
      PlayerHead.jsx          ← Local player renderer (CSS transforms)
      RemotePlayerHead.jsx    ← Interpolated remote player
      ArenaRing.jsx           ← Circular arena boundary + background
      CharacterPicker.jsx     ← 3 character cards, grays out taken ones
      ArenaPicker.jsx         ← 3 arena cards with bg thumbnails
      HUD.jsx                 ← Lives/status during gameplay
    engine/
      arenaPhysics.js         ← Circular boundary, player-player collision, knockoff detection
      inputHandler.js         ← Touch/mouse → slingshot fling mechanic
      netSync.js              ← Send positions @20Hz, interpolate remote players
      gameLoop.js             ← rAF orchestrator
    hooks/
      usePartyRoom.js         ← PartyKit WebSocket wrapper
    lib/
      arenas.js               ← Arena definitions (bg, items, hazard, colors)
      characters.js           ← Character definitions (name, src)
      protocol.js             ← Message type constants
      roomCode.js             ← Generate/validate 4-char room codes
    styles/
      brawl.css
party/
  brawlServer.js              ← PartyKit server
  partykit.json               ← PartyKit config
```

## Key Technical Decisions

1. **New physics engine** (`arenaPhysics.js`) — don't modify existing `physics.js`. Brawl needs circular arena boundary + player-player collision. Borrow patterns (rAF loop, SPIN_DECAY, velocity integration, CSS transform rendering) from existing code.

2. **Circular arena** — `distance from center > radius` for boundary. Consistent shape across all arenas. Radius = ~42% of smaller viewport dimension.

3. **Slingshot input** — drag FROM your character to aim, release to fling (opposite direction). Different from existing drag-the-head mechanic. Tap = mini-boost.

4. **Room codes** — 4-char uppercase alpha (no ambiguous I/L/O). URL: `/brawl?room=BXMR`. Both code entry and shareable links.

5. **Knockoff = elimination** — cross the arena edge, you're out. Last standing wins. Fast rounds (30-90 sec).

6. **State machine, not nested routes** — game phase driven by WebSocket messages, not URL navigation. URL stays at `/brawl?room=XXXX`.

## Implementation Phases

### Phase 0: Project Setup
- Install `react-router-dom` and `partysocket`
- Modify `src/main.jsx` — wrap in BrowserRouter, route `/` → App, `/brawl/*` → BrawlApp
- Create `party/partykit.json` and `party/brawlServer.js` skeleton
- Add scripts: `dev:party` (PartyKit dev on :1999)
- Create `src/brawl/` directory structure
- Create static data files: `characters.js`, `arenas.js`, `protocol.js`, `roomCode.js`

### Phase 1: Lobby Flow
- `BrawlApp.jsx` — state machine shell
- `Landing.jsx` — splash screen with Play button
- `Lobby.jsx` — create room (generates code + connects) or enter code to join. Character picker + arena picker.
- `WaitingRoom.jsx` — room code + share button (`navigator.share` with clipboard fallback), player list with character faces, host Start button (enabled at 2+ players)
- PartyKit server handles: `join` (validate room not full, character not taken), `arena` (host sets arena), `start`, room state broadcasts, disconnect/reconnect
- **Deliverable:** Two phones can join a room, pick characters, pick arena, host presses Start → placeholder "starting" screen

### Phase 2: Arena Physics Engine
- `arenaPhysics.js` — circular boundary enforcement, velocity reflection, player-player elastic collision with bump force, knockoff detection
- `inputHandler.js` — slingshot drag mechanic (pointer events adapted from BobbingHead.jsx)
- `gameLoop.js` — rAF loop: input → velocity → position → friction → boundary → collision → render
- `ArenaRing.jsx` — renders arena background + circular boundary visual
- `PlayerHead.jsx` — renders local player with CSS transforms (same pattern as existing physics.js)
- **Deliverable:** Single-player local physics working — fling around a circular arena, bounce off edges

### Phase 3: Multiplayer Networking
- `netSync.js` — send local position @20Hz (~80 bytes/msg), receive + interpolate remote players with lerp + velocity prediction
- `RemotePlayerHead.jsx` — renders interpolated remote players
- Server `pos` relay — receive from sender, broadcast to others
- Server collision detection — check pairs on pos updates, broadcast `bump` events with corrected velocities
- Server knockoff detection — `ko` event when player crosses boundary
- Server game lifecycle — countdown (3-2-1), `go` with spawn positions (evenly spaced on circle), `result` when 1 player remains
- Reconnection — PartySocket auto-reconnects, re-send `join`, server restores state
- **Deliverable:** Full playable MVP — join, pick, brawl, winner crowned

### Phase 4: Polish (after MVP works)
- 3-2-1-BRAWL countdown overlay
- Knockoff animation (spin + fade off screen)
- Crown overlay on winner in results
- Landscape orientation prompt (if portrait)
- Haptic feedback on collision (`navigator.vibrate`)
- Connection status indicator

### Phase 5: Items & Scoring (future)
- Server spawns themed items at intervals
- Collision-based collection
- Points + power-ups (speed boost, shield)
- Hazard spawning
- Scoring: survival time + items

### Phase 4.5: HP-Based Knockout ✅
- Server tracks `hp: 5` per player, decrements on collision with 500ms per-pair cooldown
- Server broadcasts `hit` message with updated HP for both players
- Client HUD shows HP as green pips (filled) / grey pips (depleted)
- HP reaching 0 triggers KO animation + elimination
- Edge knockout preserved as a rare bonus path
- HP resets on rematch, game start, and auto-rematch

### Phase 5: Items & Scoring (future)
- Server spawns themed items at intervals
- Collision-based collection
- Points + power-ups (speed boost, shield)
- Hazard spawning
- Scoring: survival time + items

## Message Protocol (compact keys for bandwidth)

**Client → Server:** `join`, `arena`, `start`, `pos` (x,y,vx,vy,a,s), `fell`, `rematch`
**Server → Client:** `room` (full state + hp), `countdown`, `go` (spawn positions), `pos` (relayed), `bump`, `hit` (hp updates for collision pair), `ko`, `result`, `left`, `error`

## Deployment

**Two separate deploys from one repo:**

```sh
# Frontend → Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name bobbing-brattz

# PartyKit server → Cloudflare Workers
npm run deploy:party
```

Note: `wrangler` requires Node 20+. Use `nvm use 20` if needed.

## Dev Environment
Two processes: `npm run dev` (Vite :5173) + `npm run dev:party` (PartyKit :1999). Client uses `import.meta.env.DEV` to toggle PartyKit host between localhost and production URL.

## Verification
1. `npm run dev` + `npm run dev:party` — open two tabs to `/brawl`
2. Join same room, start game
3. Collide — both HUDs should show HP drop by 1, hit animation plays
4. Rapid collisions — 500ms pair cooldown prevents double-counting
5. 5 hits on one player → KO animation, results screen
6. Rematch → HP resets to 5
7. Edge knockout still works as a bonus path
8. Mobile test: two phones on same WiFi, touch controls work
