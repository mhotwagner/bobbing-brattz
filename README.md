# Bobbing Bratts

A fun interactive website for Brian and Matt's wedding. Floating heads bounce around the screen — tap to duplicate, drag to toss!

## Features

- Drag and fling heads with physics-based motion
- Tap heads to duplicate them
- Milestone taps unlock surprise items (Ru, tropical drinks, sandwiches, beachballs)
- Spin animation on toss with natural decay
- Wall bouncing
- Mobile/touch friendly

## Development

```sh
npm install
npm run dev
```

## Deploy

Hosted on Cloudflare Pages.

```sh
npm run build
npx wrangler pages deploy dist --project-name bobbing-brattz
```
