import { Assets, Container, Graphics, Rectangle, Sprite, Text, TilingSprite } from 'pixi.js';

const createNodes = (prefix, positions, definition) => positions.map(([x, y], index) => ({
  id: `${prefix}-${index + 1}`,
  ...definition,
  x,
  y,
}));

const nodeDefinitions = [
  ...createNodes('tree-forest', [
    [0.05, 0.08], [0.14, 0.12], [0.23, 0.07], [0.32, 0.13], [0.42, 0.08],
    [0.06, 0.24], [0.16, 0.3], [0.26, 0.23], [0.35, 0.3], [0.44, 0.24],
    [0.05, 0.42], [0.15, 0.48], [0.25, 0.4], [0.34, 0.47], [0.43, 0.4],
    [0.08, 0.58], [0.18, 0.64], [0.29, 0.57], [0.38, 0.64], [0.46, 0.56],
  ], { activity: 'gather', kind: 'wood', label: 'Forest tree', biome: 'Forest', amount: 8, asset: '/img/tree.jpeg' }),
  ...createNodes('berry-meadow', [
    [0.08, 0.7], [0.16, 0.78], [0.25, 0.68], [0.34, 0.82], [0.43, 0.72],
    [0.54, 0.86], [0.63, 0.73], [0.73, 0.84], [0.82, 0.66], [0.92, 0.78],
    [0.2, 0.9], [0.45, 0.92],
  ], { activity: 'gather', kind: 'food', label: 'Berry bush', biome: 'Meadow', amount: 12, asset: '/img/berry_bush.jpeg' }),
  ...createNodes('deer-edge', [[0.68, 0.23], [0.77, 0.3], [0.88, 0.4], [0.7, 0.52]], {
    activity: 'hunt', label: 'Deer', biome: 'Woodland edge', amount: 20, discovery: 2, asset: '/img/deer.jpeg',
  }),
  ...createNodes('fox-edge', [[0.82, 0.12], [0.94, 0.24], [0.74, 0.62]], {
    activity: 'hunt', label: 'Fox', biome: 'Woodland edge', amount: 14, discovery: 2, asset: '/img/fox.jpeg',
  }),
  ...createNodes('bear-forest', [[0.12, 0.18], [0.36, 0.36]], {
    activity: 'hunt', label: 'Bear', biome: 'Forest', amount: 35, discovery: 4, asset: '/img/bear.jpeg',
  }),
];

const jobStationDefinitions = [
  { label: 'Well', asset: '/img/well.jpeg', offsetX: 0.2, offsetY: 0.02 },
  { label: 'Campfire', asset: '/img/campfire.jpeg', offsetX: -0.2, offsetY: 0.02 },
  { label: 'Storage', asset: '/img/storage_building.jpeg', offsetX: 0.28, offsetY: -0.16 },
  { label: 'Cattle', asset: '/img/cow.jpeg', offsetX: 0.3, offsetY: 0.25 },
  { label: 'Pigs', asset: '/img/pig.jpeg', offsetX: 0.45, offsetY: 0.28 },
];

const enemyTribeDefinitions = [
  { id: 'ash-clan', name: 'Ash Clan', x: 0.86, y: 0.08 },
  { id: 'stone-clan', name: 'Stone Clan', x: 0.9, y: 0.5 },
  { id: 'marsh-clan', name: 'Marsh Clan', x: 0.08, y: 0.86 },
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
  const raidAlert = document.createElement('div');
  raidAlert.className = 'raid-alert';
  const raidMessage = document.createElement('span');
  raidMessage.textContent = 'RAID IN PROGRESS';
  const repelButton = document.createElement('button');
  repelButton.type = 'button';
  repelButton.textContent = 'Repel';
  repelButton.addEventListener('click', () => store.getState().repelRaid());
  raidAlert.append(raidMessage, repelButton);
  raidAlert.hidden = true;
  document.body.appendChild(raidAlert);
  const minimap = document.createElement('div');
  minimap.className = 'world-map-panel';
  minimap.hidden = true;
  minimap.setAttribute('aria-label', 'World map');
  const minimapTitle = document.createElement('span');
  minimapTitle.className = 'world-map-panel__title';
  minimapTitle.textContent = 'WORLD MAP · PRESS M TO CLOSE';
  const minimapField = document.createElement('div');
  minimapField.className = 'world-map-panel__field';
  const minimapViewport = document.createElement('span');
  minimapViewport.className = 'world-map-panel__viewport';
  minimapField.appendChild(minimapViewport);
  minimap.append(minimapTitle, minimapField);
  document.body.appendChild(minimap);
  const minimapMarkers = nodeDefinitions.map((definition) => {
    const marker = document.createElement('span');
    marker.className = `world-map-panel__marker ${definition.activity === 'hunt' ? 'is-animal' : 'is-resource'}`;
    marker.title = definition.label;
    marker.style.left = `${definition.x * 100}%`;
    marker.style.top = `${definition.y * 100}%`;
    minimapField.appendChild(marker);
    return { definition, marker };
  });
  const resourceLayer = new Container();
  const farmLayer = new Container();
  const stationLayer = new Container();
  const enemyLayer = new Container();
  const memberLayer = new Container();
  const memberSprites = [];
  const mousePosition = { x: 0, y: 0 };
  const edgeScrollMargin = 48;
  let hasPointerPosition = false;
  let mapWidth = 0;
  let mapHeight = 0;
  let cameraX = 0;
  let cameraY = 0;
  let explorationLevel = store.getState().explorationLevel;

  world.addChild(background, biomeLayer, biomeLabels, farmLayer, stationLayer, settlement, resourceLayer, enemyLayer, memberLayer);

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

  const enemyCamps = await Promise.all(enemyTribeDefinitions.map(async (definition) => {
    const camp = Sprite.from(await Assets.load('/img/house.jpeg'));
    const label = new Text({
      text: definition.name,
      style: { fill: '#ffb3a7', fontSize: 12, stroke: { color: '#32191b', width: 4 } },
    });
    label.anchor.set(0.5, 1);
    label.position.y = -camp.height * 0.55;
    camp.anchor.set(0.5, 1);
    camp.tint = 0x9b4a4a;
    enemyLayer.addChild(camp);
    enemyLayer.addChild(label);
    return { definition, camp, label };
  }));
  const raiders = Array.from({ length: 3 }, (_, index) => {
    const raider = Sprite.from(memberTexture);
    raider.anchor.set(0.5, 1);
    raider.scale.set(0.65);
    raider.tint = 0xc34d4d;
    raider.visible = false;
    enemyLayer.addChild(raider);
    return { raider, index };
  });

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

  const updateEnemies = () => {
    const { enemyRaid } = store.getState();
    raidAlert.hidden = !enemyRaid.active;
    const hasHunter = store.getState().tribeMembers.some((member) => member.job === 'hunter');
    repelButton.disabled = !hasHunter;
    repelButton.title = hasHunter ? 'Send hunters to repel the raid' : 'Assign a Hunter first';
    const raidProgress = enemyRaid.active
      ? clamp((store.getState().calendar.elapsedSeconds - enemyRaid.startedAt) / 5, 0, 1)
      : 0;
    const camp = enemyCamps[0];
    const startX = camp?.camp.x ?? mapWidth * 0.86;
    const startY = camp?.camp.y ?? mapHeight * 0.08;

    for (const { raider, index } of raiders) {
      const isActive = enemyRaid.active && index < enemyRaid.attackers;
      raider.visible = isActive;
      if (!isActive) continue;
      raider.position.set(
        startX + (settlement.x - startX) * raidProgress + index * 24,
        startY + (settlement.y - startY) * raidProgress,
      );
    }
  };

  const updateCamera = (ticker) => {
    const speed = 420 * (ticker.deltaMS / 1000);
    const menuOpen = document.querySelector('.main-menu, .game-menu__screen:not([hidden]), .world-map-panel:not([hidden])');
    if (!menuOpen && hasPointerPosition) {
      if (mousePosition.y <= edgeScrollMargin) cameraY -= speed;
      if (mousePosition.y >= app.screen.height - edgeScrollMargin) cameraY += speed;
      if (mousePosition.x <= edgeScrollMargin) cameraX -= speed;
      if (mousePosition.x >= app.screen.width - edgeScrollMargin) cameraX += speed;
    }
    cameraX = clamp(cameraX, 0, Math.max(0, mapWidth - app.screen.width));
    cameraY = clamp(cameraY, 0, Math.max(0, mapHeight - app.screen.height));
    world.position.set(-cameraX, -cameraY);

    const directionX = settlement.x - cameraX - app.screen.width / 2;
    const directionY = settlement.y - cameraY - app.screen.height / 2;
    const angle = Math.atan2(directionX, -directionY) * (180 / Math.PI);
    compassArrow.style.transform = `rotate(${angle}deg)`;
    updateMinimap();
  };

  const updateMinimap = () => {
    minimapViewport.style.left = `${(cameraX / mapWidth) * 100}%`;
    minimapViewport.style.top = `${(cameraY / mapHeight) * 100}%`;
    minimapViewport.style.width = `${Math.min(100, (app.screen.width / mapWidth) * 100)}%`;
    minimapViewport.style.height = `${Math.min(100, (app.screen.height / mapHeight) * 100)}%`;
    for (const { definition, marker } of minimapMarkers) {
      marker.hidden = !nodes.some(({ definition: nodeDefinition, node }) =>
        nodeDefinition.id === definition.id && node.visible,
      );
    }
  };

  const handlePointermove = (event) => {
    mousePosition.x = event.clientX;
    mousePosition.y = event.clientY;
    hasPointerPosition = true;
  };

  const handleMapKeydown = (event) => {
    const isTyping = event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement;
    if (isTyping || event.key.toLowerCase() !== 'm' || document.querySelector('.main-menu')) return;
    minimap.hidden = !minimap.hidden;
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
      farmNode.node.position.set(
        mapWidth * 0.5 - width * 0.14 + (index % 3) * 52,
        mapHeight * 0.58 + height * 0.2 + Math.floor(index / 3) * 42,
      );
    }

    for (const { definition, station } of stations) {
      station.position.set(
        mapWidth * 0.5 + width * definition.offsetX,
        mapHeight * 0.58 + height * definition.offsetY,
      );
      station.scale.set(mapScale * 0.7);
    }

    for (const { definition, camp } of enemyCamps) {
      camp.position.set(mapWidth * definition.x, mapHeight * definition.y);
      const campLabel = enemyCamps.find((enemyCamp) => enemyCamp.definition.id === definition.id).label;
      campLabel.position.set(camp.x, camp.y - camp.height * 0.55);
      camp.scale.set(mapScale * 0.55);
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
    updateMinimap();
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', handlePointermove);
  window.addEventListener('keydown', handleMapKeydown);
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
  app.ticker.add(updateEnemies);

  return () => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', handlePointermove);
    window.removeEventListener('keydown', handleMapKeydown);
    compass.remove();
    raidAlert.remove();
    minimap.remove();
    unsubscribe();
    unsubscribeTechnology();
    unsubscribeMembers();
    app.ticker.remove(updateMembers);
    app.ticker.remove(updateCamera);
    app.ticker.remove(updateEnemies);
    world.destroy({ children: true });
  };
}