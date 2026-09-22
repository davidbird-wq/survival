import { Application } from 'pixi.js';
import { tribeStore } from './store.js';
import { mountTribeStats } from './ui/tribeStats.js';
import { createWorld } from './world/map.js';
import './styles.css';

const app = new Application();

await app.init({
  resizeTo: window,
  backgroundColor: 0x1f2933,
  antialias: true,
});

document.body.appendChild(app.canvas);
const unmountWorld = await createWorld(app, tribeStore);
const unmountTribeStats = mountTribeStats(tribeStore);
tribeStore.getState().startLoop();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmountWorld();
    unmountTribeStats();
    tribeStore.getState().stopLoop();
    app.destroy(true, { children: true, texture: true });
  });
}