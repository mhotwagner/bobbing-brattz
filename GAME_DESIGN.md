# Brat Brawl — Multiplayer Game Design

A multiplayer bumper/sumo arena game for Brian & Matt's wedding at [Playa Fiesta](https://www.playafiesta.com/) in Puerto Vallarta. Wedding guests hop on their phones, pick a character, and brawl it out across three themed arenas — one for each party night.

## Characters

- **Matt** — wedding boy #1
- **Brian** — wedding boy #2
- **Ru** — their pup (a dog bumper character is inherently funny)

Optional per-level cosmetic accessories (tiny party hats, leis, sunglasses, etc.) — gravy, not required.

## Arenas (Themed Nights)

Each arena matches a real themed party night at the wedding. Visual identity, hazards, and collectible items shift per level.

### 1. Ignite (Red/Fire Party)
- **Vibe:** Intense, warm, fiery
- **Palette:** Reds, oranges, deep golds
- **Background:** Beachside fire party — tiki torches, bonfires, warm sunset
- **Hazards:** Fire pits or tiki torches around the edges that knock you back or damage
- **Collectibles:** Spicy cocktails, chili peppers, flame icons
- **Music feel:** High energy

### 2. White Lotus (White Party)
- **Vibe:** Elegant, chill but cutthroat — lean into the HBO resort satire energy
- **Palette:** Whites, creams, golds, soft blues
- **Background:** Pristine resort poolside at night, white draping, candles
- **Hazards:** Maybe floating lounge rafts that drift across the arena and block movement
- **Collectibles:** Lotus flowers, champagne flutes, white roses
- **Music feel:** Smooth, slightly sinister

### 3. Tropical Glamour (The Wedding)
- **Vibe:** Grand finale. Full celebration chaos
- **Palette:** Tropical brights — hot pink, emerald, gold, turquoise
- **Background:** Beach wedding ceremony / reception — flowers, lights, ocean
- **Hazards:** Most chaotic arena — confetti bursts, champagne cork projectiles
- **Collectibles:** Rings, champagne bottles, tropical flowers, wedding cake slices
- **Music feel:** Celebratory, over the top
- **Special:** Winner gets crowned (visual crown on character)

## Gameplay

### Core Mechanics
- **2-4 players** join a room — perfect for wedding guests on their phones
- **Bumper physics** — characters bounce and collide, fling each other around
- **Pick your character** at the start (Matt, Brian, or Ru)
- Leverages the existing physics engine (velocity, bouncing, drag/fling)

### Knockout System
- Each player starts with **5 HP**
- Collisions deal **mutual damage** (bumper cars style) — both players lose 1 HP per hit
- Server enforces a **500ms per-pair cooldown** so a single overlap doesn't register multiple hits
- When HP reaches 0 → KO animation → eliminated
- **Edge knockout** still exists as a rare bonus path (flung off the arena boundary)
- Last one standing wins
- HUD shows HP as green pips next to each player's face

### Round Structure
- Quick rounds so people can hop in and out casually
- **Quick Play** — random matchmaking, auto-start after 5 seconds with 2+ players, auto-rematch after 6 seconds
- **Private Rooms** — host picks arena and starts manually, shareable room codes/links
- Warmup phase lets players fling around the arena before the game starts

### Controls
- Mobile-first: drag to aim a slingshot, release to fling (opposite direction)
- Touch-friendly, one-thumb playable

## Tech Stack

### Frontend
- **Vite + React** (existing stack)
- Existing physics engine adapted for multiplayer collision
- Canvas or DOM-based rendering (DOM works fine at this scale)

### Multiplayer
- **PartyKit** (now part of Cloudflare) for WebSocket rooms
  - Built for exactly this kind of real-time multiplayer
  - Simple room-based architecture
  - Pairs well with existing Cloudflare Pages deployment
- Alternative: Cloudflare Durable Objects with WebSockets

### Screens / Flow
1. **Landing** — "Brat Brawl" title, big play button
2. **Lobby** — Enter a room code or create one, pick your character
3. **Waiting room** — See who's joined, host starts the game
4. **Game** — The arena, real-time brawling
5. **Results** — Winner screen, play again

## Assets Needed

### Characters (have)
- [x] Matt head (130x130 webp)
- [x] Brian head (130x130 webp)
- [x] Ru head (130x130 webp)

### Backgrounds (need)
- [ ] Ignite arena background (fire party beach scene)
- [ ] White Lotus arena background (elegant resort poolside)
- [ ] Tropical Glamour arena background (beach wedding scene)

### Collectible Items (need)
- [ ] Ignite: spicy cocktail, chili pepper, flame
- [ ] White Lotus: lotus flower, champagne flute, white rose
- [ ] Tropical Glamour: ring, champagne bottle, tropical flower, cake slice

### UI (need)
- [ ] Arena border/ring graphic (or just a clean CSS boundary)
- [ ] Character select portraits
- [ ] Crown graphic for the winner
- [ ] Simple lobby UI elements

### Optional Cosmetics
- [ ] Per-level character accessories (party hat, lei, sunglasses, veil, bowtie)

## Decisions

- **Game mode:** HP-based knockout (5 HP, mutual damage on collision) with edge knockout as a bonus path. Item collection is a future addition.
- **Players per room:** 2 players, one character per player, no duplicates (Matt, Brian, Ru).
- **Sound/music:** Pinned for later. Focus on gameplay first.
- **Arena selection:** Host picks in private rooms. Random rooms auto-pick an arena.
- **Room joining:** Quick Play (random matchmaking) and Private Rooms (codes + shareable links).

## Open Questions

- Item spawns: do items give score points, temporary power-ups (speed boost, shield), or both?
- Sumo ring shape: circular arena? rectangular? does it vary per level?
- What happens when you get knocked off — eliminated, or respawn with a point penalty?
