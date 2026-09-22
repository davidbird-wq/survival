import { Application } from 'pixi.js';
import { tribeStore } from './store.js';
import { mountTribeStats } from './ui/tribeStats.js';
import { mountGameMenu } from './ui/gameMenu.js';
import { mountMainMenu } from './ui/mainMenu.js';
import { createWorld } from './world/map.js';
import './styles.css';

const app = new Application();

await app.init({
  resizeTo: window,
  backgroundColor: 0x1f2933,
  antialias: true,
});

document.body.appendChild(app.canvas);
tribeStore.getState().loadGame();
const unmountWorld = await createWorld(app, tribeStore);
const unmountTribeStats = mountTribeStats(tribeStore);
const unmountGameMenu = mountGameMenu(tribeStore);
const unmountMainMenu = mountMainMenu(tribeStore, () => tribeStore.getState().startLoop());
const saveOnExit = () => tribeStore.getState().saveGame();
window.addEventListener('pagehide', saveOnExit);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('pagehide', saveOnExit);
    saveOnExit();
    unmountWorld();
    unmountTribeStats();
    unmountGameMenu();
    unmountMainMenu();
    tribeStore.getState().stopLoop();
    app.destroy(true, { children: true, texture: true });
  });
}