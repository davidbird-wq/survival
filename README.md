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
- JSON-backed member names, preferred jobs, and job definitions
- JSON-backed upgrade definitions for future technology branches
- Hostile enemy clans with timed raids against the settlement

## Architecture

```text
src/
├── main.js              # PixiJS lifecycle and application composition
├── store.js             # Vanilla Zustand simulation state and actions
├── styles.css           # HTML overlay styling
├── data/
│   └── tribeData.json   # Member profiles and job definitions
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
- Press `Escape` to open or close the full-screen Stats, Knowledge, and Jobs menu.
- Move the mouse to the edge of the screen to scroll the camera in that direction.
- Follow the compass at the top of the screen to return to the settlement.
- Press `M` to open the large world map with yellow resource dots, blue animal dots, and the current view outline.
- Enemy clans launch raids every 30 seconds, costing Food and potentially Population.
- Active raids display a warning banner and visible enemy raiders moving toward camp.
- Assign at least one Hunter and click Repel during a raid to end it immediately.
- Upgrade Exploration repeatedly in Knowledge to expand the playable world by 1.5x each level.