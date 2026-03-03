# Bobbing Bratts

A fun interactive website for Brian and Matt's wedding. Floating heads bounce around the screen — tap to duplicate, drag to toss!

## Features

- Drag and fling heads with physics-based motion
- Tap heads to duplicate them
- Milestone taps unlock surprise items (Ru, tropical drinks, sandwiches, beachballs)
- Spin animation on toss with natural decay
- Wall bouncing
- Mobile/touch friendly

## Brat Brawl

A multiplayer sumo-style arena game for the wedding party. Guests join from their phones, pick a character (Matt, Brian, or Ru), and fling each other off the edge of a circular arena. Last one standing wins.

### How it works

- **2 players** per room on mobile — drag to aim a slingshot, release to fling
- **Quick Play** for random matchmaking or **Private Rooms** with shareable codes
- **5 HP per player** — collisions deal mutual damage, last one standing wins
- Edge knockout as a rare bonus path
- Server-authoritative via PartyKit (Cloudflare Workers WebSocket)
- 20Hz network sync with client-side interpolation

### Arenas

Each arena matches a real party night at Playa Fiesta:

| Arena | Theme | Vibe |
|-------|-------|------|
| **Ignite** | Red Party | Fiery, tiki torches, fire pits |
| **White Lotus** | White Party | Elegant poolside, floating lounge rafts |
| **Tropical Glamour** | Wedding Night | Grand finale chaos, confetti, champagne corks |

### Running locally

```sh
# Terminal 1: frontend
npm run dev

# Terminal 2: PartyKit server
npm run dev:party
```

## Development

```sh
npm install
npm run dev
npm run dev:party
```

## Deploy

Frontend on Cloudflare Pages, PartyKit server on Cloudflare Workers.

```sh
# Frontend (requires Node 20+)
npm run build
npx wrangler pages deploy dist --project-name bobbing-brattz

# PartyKit server
npm run deploy:party
```
