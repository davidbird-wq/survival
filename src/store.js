import { createStore } from 'zustand/vanilla';
import tribeData from './data/tribeData.json';

const TICK_INTERVAL_MS = 1000;
const FOOD_DECAY_PER_PERSON_PER_SECOND = 0.1;
const SAVE_KEY = 'survival-save-v1';

const getSaveData = (state) => ({
  resources: state.resources,
  tribeName: state.tribeName,
  calendar: state.calendar,
  tribeMembers: state.tribeMembers,
  technologies: state.technologies,
  explorationLevel: state.explorationLevel,
  farmTiles: state.farmTiles,
});

export const jobDefinitions = Object.fromEntries(
  tribeData.jobs.map(({ id, name, description, requires }) => [id, { name, description, requires }]),
);

const canStartJob = (jobId, technologies) => {
  const job = jobDefinitions[jobId];
  return Boolean(job && (!job.requires || technologies[job.requires]));
};

const createMember = (index, technologies) => {
  const profile = tribeData.members[index % tribeData.members.length];
  const job = canStartJob(profile.preferredJob, technologies) ? profile.preferredJob : null;
  return {
    id: `member-${index + 1}`,
    name: profile.name,
    task: job || 'idle',
    job,
    targetId: null,
  };
};

const initialTechnologies = { fire: false, toolmaking: false, agriculture: false };

export const tribeStore = createStore((set, get) => ({
  resources: {
    food: 100,
    wood: 0,
    population: 5,
    discoveryPoints: 0,
  },
  tribeName: 'Tribe',
  calendar: {
    day: 1,
    elapsedSeconds: 0,
  },
  tribeMembers: Array.from({ length: 3 }, (_, index) => createMember(index, initialTechnologies)),
  technologies: initialTechnologies,
  explorationLevel: 0,
  farmTiles: Array.from({ length: 6 }, (_, index) => ({
    id: `farm-${index + 1}`,
    state: 'Empty',
    elapsedSeconds: 0,
  })),
  enemyRaid: {
    active: false,
    startedAt: 0,
    attackers: 0,
  },
  isRunning: false,
  tickTimer: null,

  addResource: (resource, amount) =>
    set((state) => ({
      resources: {
        ...state.resources,
        [resource]: Math.max(0, state.resources[resource] + amount),
      },
    })),

  setTribeName: (name) =>
    set((state) => {
      const tribeName = name.trim().slice(0, 24);
      return tribeName ? { tribeName } : state;
    }),

  gather: (resource, amount) =>
    set((state) => ({
      resources: {
        ...state.resources,
        [resource]: Math.max(0, state.resources[resource] + amount),
        discoveryPoints: state.resources.discoveryPoints + 1,
      },
    })),

  hunt: (foodAmount, discoveryPoints = 2) =>
    set((state) => ({
      resources: {
        ...state.resources,
        food: state.resources.food + foodAmount,
        discoveryPoints: state.resources.discoveryPoints + discoveryPoints,
      },
    })),

  assignHunt: (targetId) =>
    set((state) => ({
      tribeMembers: state.tribeMembers.map((member, index) =>
        index === 0
          ? { ...member, task: 'hunting', targetId }
          : member,
      ),
    })),

  clearHunt: () =>
    set((state) => ({
      tribeMembers: state.tribeMembers.map((member) =>
        member.task === 'hunting'
          ? { ...member, task: 'idle', targetId: null }
          : member,
      ),
    })),

  assignJob: (memberId, jobId) =>
    set((state) => {
      const job = jobDefinitions[jobId];
      if (!job || (job.requires && !state.technologies[job.requires])) return state;
      return {
        tribeMembers: state.tribeMembers.map((member) =>
          member.id === memberId ? { ...member, task: jobId, job: jobId, targetId: null } : member,
        ),
      };
    }),

  clearJob: (memberId) =>
    set((state) => ({
      tribeMembers: state.tribeMembers.map((member) =>
        member.id === memberId ? { ...member, task: 'idle', job: null, targetId: null } : member,
      ),
    })),

  repelRaid: () =>
    set((state) => {
      const hasHunter = state.tribeMembers.some((member) => member.job === 'hunter');
      if (!state.enemyRaid.active || !hasHunter) return state;
      return { enemyRaid: { active: false, startedAt: 0, attackers: 0 } };
    }),

  plantTile: (tileId) =>
    set((state) => {
      if (!state.technologies.agriculture) return state;
      return {
        farmTiles: state.farmTiles.map((tile) =>
          tile.id === tileId && tile.state === 'Empty'
            ? { ...tile, state: 'Seeded', elapsedSeconds: 0 }
            : tile,
        ),
      };
    }),

  harvestTile: (tileId) =>
    set((state) => {
      const tile = state.farmTiles.find((farmTile) => farmTile.id === tileId);
      if (!tile || tile.state !== 'Harvestable') return state;

      return {
        resources: {
          ...state.resources,
          food: state.resources.food + 25,
          discoveryPoints: state.resources.discoveryPoints + 1,
        },
        farmTiles: state.farmTiles.map((farmTile) =>
          farmTile.id === tileId
            ? { ...farmTile, state: 'Empty', elapsedSeconds: 0 }
            : farmTile,
        ),
      };
    }),

  saveGame: () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(getSaveData(get())));
  },

  loadGame: () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!saved || !saved.resources || !saved.calendar) return;

      set((state) => ({
        resources: {
          ...state.resources,
          ...saved.resources,
          population: Math.max(3, Number(saved.resources.population) || 5),
        },
        tribeName: typeof saved.tribeName === 'string' && saved.tribeName.trim()
          ? saved.tribeName.trim().slice(0, 24)
          : state.tribeName,
        calendar: { ...state.calendar, ...saved.calendar },
        tribeMembers: Array.isArray(saved.tribeMembers) ? saved.tribeMembers : state.tribeMembers,
        technologies: { ...state.technologies, ...saved.technologies },
        explorationLevel: saved.explorationLevel || 0,
        farmTiles: Array.isArray(saved.farmTiles) ? saved.farmTiles : state.farmTiles,
        enemyRaid: { active: false, startedAt: 0, attackers: 0 },
      }));
    } catch {
      localStorage.removeItem(SAVE_KEY);
    }
  },

  resetGame: () => {
    localStorage.removeItem(SAVE_KEY);
    set({
      resources: { food: 100, wood: 0, population: 5, discoveryPoints: 0 },
      tribeName: 'Tribe',
      calendar: { day: 1, elapsedSeconds: 0 },
      tribeMembers: Array.from({ length: 3 }, (_, index) => createMember(index, initialTechnologies)),
      technologies: Object.fromEntries(Object.keys(technologyDefinitions).map((id) => [id, false])),
      explorationLevel: 0,
      farmTiles: Array.from({ length: 6 }, (_, index) => ({
        id: `farm-${index + 1}`,
        state: 'Empty',
        elapsedSeconds: 0,
      })),
      enemyRaid: { active: false, startedAt: 0, attackers: 0 },
    });
  },

  unlockTechnology: (technologyId) =>
    set((state) => {
      const technology = technologyDefinitions[technologyId];
      if (!technology || (state.technologies[technologyId] && technologyId !== 'exploration')) return state;

      const hasPrerequisites = technology.prerequisites.every(
        (prerequisite) => state.technologies[prerequisite],
      );
      const cost = getTechnologyCost(technologyId, state);
      if (!hasPrerequisites || state.resources.discoveryPoints < cost) {
        return state;
      }

      return {
        resources: {
          ...state.resources,
          discoveryPoints: state.resources.discoveryPoints - cost,
        },
        technologies: {
          ...state.technologies,
          [technologyId]: true,
        },
        explorationLevel: technologyId === 'exploration'
          ? state.explorationLevel + 1
          : state.explorationLevel,
      };
    }),

  startLoop: () => {
    if (get().isRunning) return;

    const tickTimer = window.setInterval(() => {
      set((state) => {
        const elapsedSeconds = state.calendar.elapsedSeconds + 1;
        const day = Math.floor(elapsedSeconds / 60) + 1;
        const food = Math.max(
          0,
          state.resources.food -
            state.resources.population * FOOD_DECAY_PER_PERSON_PER_SECOND,
        );
        const farmTiles = state.farmTiles.map((tile) => {
          if (tile.state === 'Empty' || tile.state === 'Harvestable') return tile;

          const elapsedSeconds = tile.elapsedSeconds + 1;
          const duration = { Seeded: 5, Growing: 8, Mature: 4 }[tile.state];
          if (elapsedSeconds < duration) return { ...tile, elapsedSeconds };

          const nextState = { Seeded: 'Growing', Growing: 'Mature', Mature: 'Harvestable' }[tile.state];
          return { ...tile, state: nextState, elapsedSeconds: 0 };
        });
        const farmers = state.tribeMembers.filter((member) => member.job === 'farmer').length;
        const hunters = state.tribeMembers.filter((member) => member.job === 'hunter').length;
        const jobFood = state.tribeMembers.filter((member) => ['cook', 'herder'].includes(member.job)).length;
        const jobWood = state.tribeMembers.filter((member) => member.job === 'gatherer').length;
        let updatedFarmTiles = farmTiles;
        let harvestedFood = 0;

        for (let index = 0; index < farmers; index += 1) {
          const harvestableIndex = updatedFarmTiles.findIndex((tile) => tile.state === 'Harvestable');
          if (harvestableIndex !== -1) {
            updatedFarmTiles = updatedFarmTiles.map((tile, tileIndex) =>
              tileIndex === harvestableIndex ? { ...tile, state: 'Empty', elapsedSeconds: 0 } : tile,
            );
            harvestedFood += 25;
            continue;
          }

          const emptyIndex = updatedFarmTiles.findIndex((tile) => tile.state === 'Empty');
          if (emptyIndex === -1 || !state.technologies.agriculture) continue;
          updatedFarmTiles = updatedFarmTiles.map((tile, tileIndex) =>
            tileIndex === emptyIndex ? { ...tile, state: 'Seeded', elapsedSeconds: 0 } : tile,
          );
        }

        const newPeople = day > state.calendar.day && day % 10 === 0
          ? Array.from({ length: 2 }, (_, index) => ({
            ...createMember(state.tribeMembers.length + index, state.technologies),
          }))
          : [];
        const raidEnded = state.enemyRaid.active && elapsedSeconds - state.enemyRaid.startedAt >= 10;
        const raidStarts = !state.enemyRaid.active && elapsedSeconds > 0 && elapsedSeconds % 30 === 0;
        const attackers = Math.min(3, Math.max(1, state.resources.population));
        const enemyRaid = raidStarts
          ? { active: true, startedAt: elapsedSeconds, attackers }
          : raidEnded
            ? { active: false, startedAt: 0, attackers: 0 }
            : state.enemyRaid;
        const raidFoodLoss = raidStarts ? 15 : 0;
        const hasDefenders = state.tribeMembers.some((member) => member.job === 'hunter');
        const raidPopulationLoss = raidStarts && !hasDefenders && state.resources.population > 3 ? 1 : 0;

        return {
          resources: {
            ...state.resources,
            food: Math.max(0, food + jobFood + harvestedFood + hunters * 3 - raidFoodLoss),
            wood: state.resources.wood + jobWood,
            population: Math.max(3, state.resources.population + newPeople.length - raidPopulationLoss),
          },
          calendar: { day, elapsedSeconds },
          farmTiles: updatedFarmTiles,
          tribeMembers: [...state.tribeMembers, ...newPeople],
          enemyRaid,
        };
      });
      if (get().calendar.elapsedSeconds % 10 === 0) get().saveGame();
    }, TICK_INTERVAL_MS);

    set({ isRunning: true, tickTimer });
  },

  stopLoop: () => {
    const { tickTimer } = get();
    if (tickTimer !== null) window.clearInterval(tickTimer);
    set({ isRunning: false, tickTimer: null });
  },
}));

export const technologyDefinitions = {
  fire: {
    name: 'Fire',
    description: 'Warmth, light, and safer camps.',
    cost: 4,
    prerequisites: [],
  },
  toolmaking: {
    name: 'Toolmaking',
    description: 'Improve gathering and hunting tools.',
    cost: 6,
    prerequisites: ['fire'],
  },
  exploration: {
    name: 'Exploration',
    description: 'Learn the land and expand the known world.',
    cost: 7,
    prerequisites: ['toolmaking'],
  },
  hunting: {
    name: 'Hunting',
    description: 'Organize safer and more effective hunting parties.',
    cost: 5,
    prerequisites: ['toolmaking'],
  },
  fishing: {
    name: 'Fishing',
    description: 'Gather food from rivers and nearby waters.',
    cost: 6,
    prerequisites: ['toolmaking'],
  },
  agriculture: {
    name: 'Agriculture',
    description: 'Unlock cultivated fields and crop cycles.',
    cost: 8,
    prerequisites: ['toolmaking'],
  },
  pottery: {
    name: 'Pottery',
    description: 'Shape clay into vessels for cooking and storage.',
    cost: 7,
    prerequisites: ['fire'],
  },
  masonry: {
    name: 'Masonry',
    description: 'Build stronger structures from stone and clay.',
    cost: 10,
    prerequisites: ['toolmaking'],
  },
  weaving: {
    name: 'Weaving',
    description: 'Turn plant fibers into cloth, rope, and shelter materials.',
    cost: 8,
    prerequisites: ['agriculture'],
  },
  animalHusbandry: {
    name: 'Animal Husbandry',
    description: 'Raise animals near the settlement for a steady food supply.',
    cost: 10,
    prerequisites: ['agriculture'],
  },
  irrigation: {
    name: 'Irrigation',
    description: 'Channel water to make farm plots more reliable.',
    cost: 12,
    prerequisites: ['agriculture'],
  },
  storage: {
    name: 'Storage',
    description: 'Preserve surplus food through changing seasons.',
    cost: 9,
    prerequisites: ['pottery'],
  },
  bronzeWorking: {
    name: 'Bronze Working',
    description: 'Forge durable tools and weapons from early metal alloys.',
    cost: 15,
    prerequisites: ['masonry', 'pottery'],
  },
  ...Object.fromEntries(
    tribeData.upgrades.map(({ id, name, description, cost, prerequisites }) => [
      id,
      { name, description, cost, prerequisites },
    ]),
  ),
};

export const getTechnologyCost = (technologyId, state) => {
  const technology = technologyDefinitions[technologyId];
  if (!technology) return Infinity;
  if (technologyId !== 'exploration') return technology.cost;
  return Math.ceil(technology.cost * (1.5 ** state.explorationLevel));
};