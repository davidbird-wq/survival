import { Assets, Container, Graphics, Sprite, Text, TilingSprite } from 'pixi.js';

const nodeDefinitions = [
  { id: 'berries-east', activity: 'gather', kind: 'food', label: 'Berry bush', biome: 'Meadow', x: 0.72, y: 0.35, amount: 12, asset: '/img/berry_bush.jpeg' },
  { id: 'berries-south', activity: 'gather', kind: 'food', label: 'Berry bush', biome: 'Meadow', x: 0.28, y: 0.72, amount: 12, asset: '/img/berry_bush.jpeg' },
  { id: 'tree-north', activity: 'gather', kind: 'wood', label: 'Tree', biome: 'Forest', x: 0.48, y: 0.18, amount: 8, asset: '/img/tree.jpeg' },
  { id: 'tree-west', activity: 'gather', kind: 'wood', label: 'Tree', biome: 'Forest', x: 0.12, y: 0.43, amount: 8, asset: '/img/tree.jpeg' },
  { id: 'game-trail', activity: 'hunt', label: 'Game trail', biome: 'Woodland edge', x: 0.84, y: 0.72, amount: 20, asset: '/img/rock.jpeg' },
];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(value, maximum));

export async function createWorld(app, store) {
  const world = new Container();
  const background = new TilingSprite({ texture: await Assets.load('/img/grass.jpeg'), width: 1, height: 1 });
  const biomeLayer = new Graphics();
  const biomeLabels = new Container();
  const settlement = Sprite.from(await Assets.load('/img/house.jpeg'));
  const resourceLayer = new Container();

  world.addChild(background, biomeLayer, biomeLabels, settlement, resourceLayer);
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
      sprite.anchor.set(0.5, 1);
      label.anchor.set(0.5, 0);
      label.position.set(0, 5);
      node.addChild(sprite, label);
      node.on('pointertap', () => {
        if (!node.visible) return;
        if (definition.activity === 'hunt') {
          store.getState().hunt(definition.amount);
        } else {
          store.getState().gather(definition.kind, definition.amount);
        }
        node.visible = false;
      });
      resourceLayer.addChild(node);

      return { definition, node, sprite };
    }),
  );

  const resize = () => {
    const { width, height } = app.screen;
    background.width = width;
    background.height = height;

    biomeLayer.clear();
    biomeLayer.rect(0, 0, width * 0.4, height).fill({ color: 0x38583a, alpha: 0.22 });
    biomeLayer.rect(width * 0.68, 0, width * 0.32, height).fill({ color: 0x9d7b4c, alpha: 0.16 });
    biomeLayer.rect(0, height * 0.55, width, height * 0.45).fill({ color: 0x8b9d69, alpha: 0.15 });
    biomeLayer.moveTo(width * 0.58, 0);
    biomeLayer.lineTo(width * 0.63, height * 0.3);
    biomeLayer.lineTo(width * 0.56, height * 0.58);
    biomeLayer.lineTo(width * 0.62, height);
    biomeLayer.stroke({ color: 0x7899a1, alpha: 0.7, width: 24 });

    biomeLabels.removeChildren().forEach((label) => label.destroy());
    for (const [text, x, y] of [['Forest', 0.08, 0.08], ['Woodland edge', 0.7, 0.08], ['Meadow', 0.08, 0.88]]) {
      const label = new Text({
        text,
        style: { fill: '#f4ead5', fontSize: 14, fontStyle: 'italic', stroke: { color: '#16201f', width: 4 } },
      });
      label.position.set(width * x, height * y);
      label.alpha = 0.8;
      biomeLabels.addChild(label);
    }

    const mapScale = clamp(Math.min(width / 900, height / 650), 0.65, 1.25);
    settlement.scale.set(mapScale * 0.55);
    settlement.anchor.set(0.5, 1);
    settlement.position.set(width * 0.5, height * 0.58);

    for (const { definition, node, sprite } of nodes) {
      node.position.set(width * definition.x, height * definition.y);
      sprite.scale.set(mapScale * 0.8);
    }
  };

  resize();
  window.addEventListener('resize', resize);

  return () => {
    window.removeEventListener('resize', resize);
    world.destroy({ children: true });
  };
}