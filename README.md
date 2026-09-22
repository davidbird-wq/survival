# Ground Zero: Exploration and Creation

A 2D top-down civilization survival prototype built with Vite, PixiJS, and Zustand.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`, or preview the build with `npm run preview`.

## Current features

- Food, Wood, Population, and Discovery Point tracking
- Food decay based on population and the global day loop
- Pixel-art biome map with Forest, Woodland Edge, and Meadow regions
- Clickable berry bushes and trees for gathering
- Clickable deer, foxes, and bears for hunting
- Tribe member movement toward hunting targets
- Technology tree with Exploration plus early, agricultural, craft, building, and metalworking branches
- Discovery Point costs and technology prerequisites
- Agriculture plots with Seeded, Growing, Mature, and Harvestable states
- Harvesting crops for Food after the Agriculture unlock
- Automatic local save and restore across browser reloads
- Full-screen menu with Stats, Knowledge, and Jobs sections
- Startup menu with Continue and New Game options
- Assignable jobs with technology-gated roles and resource production

## Architecture

```text
src/
├── main.js              # PixiJS lifecycle and application composition
├── store.js             # Vanilla Zustand simulation state and actions
├── styles.css           # HTML overlay styling
├── ui/
│   ├── gameMenu.js      # Full-screen Stats, Knowledge, and Jobs menu
│   └── tribeStats.js    # Resource and calendar HUD
└── world/
	└── map.js           # PixiJS terrain, biomes, nodes, and entities
img/                     # Supplied pixel-art game assets
```

Rendering modules read and subscribe to the store, but simulation state does not depend on PixiJS. Gameplay state is persisted separately from transient renderer and timer handles.

## Controls

- Click berry bushes to gather Food.
- Click trees to gather Wood.
- Click animals to send a tribe member hunting.
- Unlock technologies from the Knowledge panel when enough Discovery Points are available.
- After unlocking Agriculture, click an Empty farm plot to plant it, then click it again when Harvestable.
- Open the Menu button to switch between full-screen Stats, Knowledge, and Jobs views.
- Hold `W`, `A`, `S`, or `D` to move the camera around the expansive world map.
- Follow the compass at the top of the screen to return to the settlement.
- Upgrade Exploration repeatedly in Knowledge to expand the playable world by 1.5x each level.