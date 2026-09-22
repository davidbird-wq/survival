import { Assets, Container, Graphics, Rectangle, Sprite, Text, TilingSprite } from 'pixi.js';

const nodeDefinitions = [
  { id: 'berries-east', activity: 'gather', kind: 'food', label: 'Berry bush', biome: 'Meadow', x: 0.72, y: 0.35, amount: 12, asset: '/img/berry_bush.jpeg' },
  { id: 'berries-south', activity: 'gather', kind: 'food', label: 'Berry bush', biome: 'Meadow', x: 0.28, y: 0.72, amount: 12, asset: '/img/berry_bush.jpeg' },
  { id: 'tree-north', activity: 'gather', kind: 'wood', label: 'Tree', biome: 'Forest', x: 0.48, y: 0.18, amount: 8, asset: '/img/tree.jpeg' },
  { id: 'tree-west', activity: 'gather', kind: 'wood', label: 'Tree', biome: 'Forest', x: 0.12, y: 0.43, amount: 8, asset: '/img/tree.jpeg' },
  { id: 'deer-east', activity: 'hunt', label: 'Deer', biome: 'Woodland edge', x: 0.84, y: 0.72, amount: 20, discovery: 2, asset: '/img/deer.jpeg' },
  { id: 'fox-north', activity: 'hunt', label: 'Fox', biome: 'Woodland edge', x: 0.82, y: 0.2, amount: 14, discovery: 2, asset: '/img/fox.jpeg' },
  { id: 'bear-west', activity: 'hunt', label: 'Bear', biome: 'Forest', x: 0.18, y: 0.22, amount: 35, discovery: 4, asset: '/img/bear.jpeg' },
];

const jobStationDefinitions = [
  { label: 'Well', asset: '/img/well.jpeg', x: 0.62, y: 0.62 },
  { label: 'Campfire', asset: '/img/campfire.jpeg', x: 0.38, y: 0.58 },
  { label: 'Storage', asset: '/img/storage_building.jpeg', x: 0.68, y: 0.52 },
  { label: 'Cattle', asset: '/img/cow.jpeg', x: 0.78, y: 0.82 },
  { label: 'Pigs', asset: '/img/pig.jpeg', x: 0.88, y: 0.84 },
];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(value, maximum));

export async function createWorld(app, store) {
  const world = new Container();
  const background = new TilingSprite({ texture: await Assets.load('/img/grass.jpeg'), width: 1, height: 1 });
  const biomeLayer = new Graphics();
  const biomeLabels = new Container();
  const settlement = Sprite.from(await Assets.load('/img/house.jpeg'));
  const compass = document.createElement('div');
  compass.className = 'world-compass';
  compass.setAttribute('aria-label', 'Compass pointing toward settlement');
  const compassLabel = document.createElement('span');
  compassLabel.textContent = 'SETTLEMENT';
  const compassArrow = document.createElement('span');
  compassArrow.className = 'world-compass__arrow';
  compassArrow.textContent = '▲';
  compass.append(compassLabel, compassArrow);
  document.body.appendChild(compass);
  const resourceLayer = new Container();
  const farmLayer = new Container();
  const stationLayer = new Container();
  const memberLayer = new Container();
  const memberSprites = [];
  const pressedKeys = new Set();
  let mapWidth = 0;
  let mapHeight = 0;
  let cameraX = 0;
  let cameraY = 0;
  let explorationLevel = store.getState().explorationLevel;

  world.addChild(background, biomeLayer, biomeLabels, farmLayer, stationLayer, settlement, resourceLayer, memberLayer);

  const farmNodes = Array.from({ length: 6 }, (_, index) => {
    const node = new Container();
    const plot = new Graphics();
    const label = new Text({
      text: `${index + 1}`,
      style: { fill: '#f4ead5', fontSize: 11, stroke: { color: '#16201f', width: 3 } },
    });
    label.anchor.set(0.5);
    node.eventMode = 'static';
    node.cursor = 'pointer';
    node.addChild(plot, label);
    farmLayer.addChild(node);
    return { id: `farm-${index + 1}`, node, plot, label };
  });

  const renderFarms = ({ farmTiles, technologies }) => {
    for (const farmNode of farmNodes) {
      const tile = farmTiles.find((farmTile) => farmTile.id === farmNode.id);
      const isLocked = !technologies.agriculture;
      const colors = {
        Empty: 0x6f5135,
        Seeded: 0x9d7b4c,
        Growing: 0x71934f,
        Mature: 0xa7b85b,
        Harvestable: 0xe7b85c,
      };
      farmNode.plot.clear();
      farmNode.plot.rect(-22, -16, 44, 32).fill({ color: colors[tile.state], alpha: isLocked ? 0.35 : 0.9 });
      farmNode.plot.stroke({ color: isLocked ? 0x59645b : 0xf4ead5, alpha: 0.7, width: 1 });
      farmNode.label.text = isLocked ? 'Locked' : tile.state;
      farmNode.label.style.fontSize = isLocked ? 9 : 8;
      farmNode.label.position.set(0, 0);
      farmNode.node.alpha = isLocked ? 0.65 : 1;
      farmNode.node.eventMode = isLocked ? 'none' : 'static';
    }
  };

  for (const farmNode of farmNodes) {
    farmNode.node.on('pointerdown', () => {
      const tile = store.getState().farmTiles.find((farmTile) => farmTile.id === farmNode.id);
      if (!tile) return;
      if (tile.state === 'Harvestable') store.getState().harvestTile(farmNode.id);
      else if (tile.state === 'Empty') store.getState().plantTile(farmNode.id);
    });
  }

  const stations = await Promise.all(jobStationDefinitions.map(async (definition) => {
    const station = Sprite.from(await Assets.load(definition.asset));
    station.anchor.set(0.5, 1);
    stationLayer.addChild(station);
    return { definition, station };
  }));
  app.stage.addChild(world);

  const nodes = await Promise.all(
    nodeDefinitions.map(async (definition) => {
      const node = new Container();
      const sprite = Sprite.from(await Assets.load(definition.asset));
      const label = new Text({
        text: definition.label,
        style: { fill: '#f4ead5', fontSize: 12, stroke: { color: '#16201f', width: 3 } },
      });

      node.eventMode = 'static';
      node.cursor = 'pointer';
      node.hitArea = new Rectangle(
        -sprite.texture.width / 2,
        -sprite.texture.height,
        sprite.texture.width,
        sprite.texture.height + 24,
      );
      sprite.anchor.set(0.5, 1);
      label.anchor.set(0.5, 0);
      label.position.set(0, 5);
      node.addChild(sprite, label);
      node.on('pointerdown', () => {
        if (!node.visible) return;
        if (definition.activity === 'hunt') {
          store.getState().assignHunt(definition.id);
          store.getState().hunt(definition.amount, definition.discovery);
          node.eventMode = 'none';
          node.alpha = 0.65;
          window.setTimeout(() => {
            node.visible = false;
            store.getState().clearHunt();
          }, 3000);
        } else {
          store.getState().gather(definition.kind, definition.amount);
          node.visible = false;
        }
      });
      resourceLayer.addChild(node);

      return { definition, node, sprite };
    }),
  );

  const memberTexture = await Assets.load('/img/job_sprite.jpeg');

  const addMemberSprite = (member) => {
    const sprite = new Container();
    const body = Sprite.from(memberTexture);
    body.anchor.set(0.5, 1);
    body.scale.set(0.65);
    const name = new Text({
      text: member.name,
      style: { fill: '#f4ead5', fontSize: 10, stroke: { color: '#16201f', width: 3 } },
    });
    name.anchor.set(0.5, 1);
    name.position.y = -10;
    sprite.addChild(body, name);
    memberLayer.addChild(sprite);
    memberSprites.push({ id: member.id, sprite, progress: 0 });
  };

  for (const member of store.getState().tribeMembers) addMemberSprite(member);

  const syncMembers = ({ tribeMembers }) => {
    for (const member of tribeMembers) {
      if (!memberSprites.some((memberSprite) => memberSprite.id === member.id)) {
        addMemberSprite(member);
      }
    }
  };

  const updateMembers = () => {
    const members = store.getState().tribeMembers;
    for (const [index, memberSprite] of memberSprites.entries()) {
      const member = members[index];
      const target = nodes.find(({ definition, node }) =>
        definition.id === member.targetId ||
        (member.job === 'hunter' && definition.activity === 'hunt' && node.visible),
      );
      const homeX = mapWidth * 0.5 + (index - 1) * 28;
      const homeY = mapHeight * 0.58 + 24;
      const targetX = target?.node.x ?? homeX;
      const targetY = target?.node.y ?? homeY;
      const isHunting = (member.task === 'hunting' || member.job === 'hunter') && target?.node.visible;
      const destinationX = isHunting ? targetX : homeX;
      const destinationY = isHunting ? targetY : homeY;
      memberSprite.sprite.x += (destinationX - memberSprite.sprite.x) * 0.18;
      memberSprite.sprite.y += (destinationY - memberSprite.sprite.y) * 0.18;
    }
  };

  const updateCamera = (ticker) => {
    const speed = 420 * (ticker.deltaMS / 1000);
    if (pressedKeys.has('w')) cameraY -= speed;
    if (pressedKeys.has('s')) cameraY += speed;
    if (pressedKeys.has('a')) cameraX -= speed;
    if (pressedKeys.has('d')) cameraX += speed;

    cameraX = clamp(cameraX, 0, Math.max(0, mapWidth - app.screen.width));
    cameraY = clamp(cameraY, 0, Math.max(0, mapHeight - app.screen.height));
    world.position.set(-cameraX, -cameraY);

    const directionX = settlement.x - cameraX - app.screen.width / 2;
    const directionY = settlement.y - cameraY - app.screen.height / 2;
    const angle = Math.atan2(directionX, -directionY) * (180 / Math.PI);
    compassArrow.style.transform = `rotate(${angle}deg)`;
  };

  const handleKeydown = (event) => {
    const key = event.key.toLowerCase();
    if (!['w', 'a', 's', 'd'].includes(key)) return;
    event.preventDefault();
    pressedKeys.add(key);
  };

  const handleKeyup = (event) => {
    pressedKeys.delete(event.key.toLowerCase());
  };

  const resize = () => {
    const { width, height } = app.screen;
    const isFirstResize = mapWidth === 0;
    const worldScale = 3 * (1.5 ** explorationLevel);
    mapWidth = Math.max(width * worldScale, width + (worldScale - 1) * 800);
    mapHeight = Math.max(height * worldScale, height + (worldScale - 1) * 600);
    background.width = mapWidth;
    background.height = mapHeight;

    biomeLayer.clear();
    biomeLayer.rect(0, 0, mapWidth * 0.4, mapHeight).fill({ color: 0x38583a, alpha: 0.22 });
    biomeLayer.rect(mapWidth * 0.68, 0, mapWidth * 0.32, mapHeight).fill({ color: 0x9d7b4c, alpha: 0.16 });
    biomeLayer.rect(0, mapHeight * 0.55, mapWidth, mapHeight * 0.45).fill({ color: 0x8b9d69, alpha: 0.15 });
    biomeLayer.moveTo(mapWidth * 0.58, 0);
    biomeLayer.lineTo(mapWidth * 0.63, mapHeight * 0.3);
    biomeLayer.lineTo(mapWidth * 0.56, mapHeight * 0.58);
    biomeLayer.lineTo(mapWidth * 0.62, mapHeight);
    biomeLayer.stroke({ color: 0x7899a1, alpha: 0.7, width: 24 });

    biomeLabels.removeChildren().forEach((label) => label.destroy());
    for (const [text, x, y] of [['Forest', 0.08, 0.08], ['Woodland edge', 0.7, 0.08], ['Meadow', 0.08, 0.88]]) {
      const label = new Text({
        text,
        style: { fill: '#f4ead5', fontSize: 14, fontStyle: 'italic', stroke: { color: '#16201f', width: 4 } },
      });
      label.position.set(mapWidth * x, mapHeight * y);
      label.alpha = 0.8;
      biomeLabels.addChild(label);
    }

    const mapScale = clamp(Math.min(width / 900, height / 650), 0.65, 1.25);
    settlement.scale.set(mapScale * 0.55);
    settlement.anchor.set(0.5, 1);
    settlement.position.set(mapWidth * 0.5, mapHeight * 0.58);

    for (const [index, memberSprite] of memberSprites.entries()) {
      if (memberSprite.sprite.x === 0 && memberSprite.sprite.y === 0) {
        memberSprite.sprite.position.set(mapWidth * 0.5 + (index - 1) * 28, mapHeight * 0.58 + 24);
      }
    }

    for (const { definition, node, sprite } of nodes) {
      node.position.set(mapWidth * definition.x, mapHeight * definition.y);
      sprite.scale.set(mapScale * 0.8);
    }

    for (const [index, farmNode] of farmNodes.entries()) {
      farmNode.node.position.set(mapWidth * 0.42 + (index % 3) * 52, mapHeight * 0.76 + Math.floor(index / 3) * 42);
    }

    for (const { definition, station } of stations) {
      station.position.set(mapWidth * definition.x, mapHeight * definition.y);
      station.scale.set(mapScale * 0.7);
    }

    if (isFirstResize) {
      cameraX = (mapWidth - width) / 2;
      cameraY = (mapHeight - height) / 2;
    } else {
      cameraX = clamp(cameraX, 0, Math.max(0, mapWidth - width));
      cameraY = clamp(cameraY, 0, Math.max(0, mapHeight - height));
    }
    world.position.set(-cameraX, -cameraY);
    const directionX = settlement.x - cameraX - width / 2;
    const directionY = settlement.y - cameraY - height / 2;
    compassArrow.style.transform = `rotate(${Math.atan2(directionX, -directionY) * (180 / Math.PI)}deg)`;
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  const unsubscribe = store.subscribe(renderFarms);
  const unsubscribeTechnology = store.subscribe(({ explorationLevel: nextLevel }) => {
    if (nextLevel === explorationLevel) return;
    explorationLevel = nextLevel;
    resize();
  });
  const unsubscribeMembers = store.subscribe(syncMembers);
  renderFarms(store.getState());
  syncMembers(store.getState());
  app.ticker.add(updateMembers);
  app.ticker.add(updateCamera);

  return () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('keyup', handleKeyup);
    pressedKeys.clear();
    compass.remove();
    unsubscribe();
    unsubscribeTechnology();
    unsubscribeMembers();
    app.ticker.remove(updateMembers);
    app.ticker.remove(updateCamera);
    world.destroy({ children: true });
  };
}