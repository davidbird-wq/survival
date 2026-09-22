import { createStore } from 'zustand/vanilla';

const TICK_INTERVAL_MS = 1000;
const FOOD_DECAY_PER_PERSON_PER_SECOND = 0.1;

export const tribeStore = createStore((set, get) => ({
  resources: {
    food: 100,
    wood: 0,
    population: 5,
    discoveryPoints: 0,
  },
  calendar: {
    day: 1,
    elapsedSeconds: 0,
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

  gather: (resource, amount) =>
    set((state) => ({
      resources: {
        ...state.resources,
        [resource]: Math.max(0, state.resources[resource] + amount),
        discoveryPoints: state.resources.discoveryPoints + 1,
      },
    })),

  hunt: (foodAmount) =>
    set((state) => ({
      resources: {
        ...state.resources,
        food: state.resources.food + foodAmount,
        discoveryPoints: state.resources.discoveryPoints + 2,
      },
    })),

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

        return {
          resources: { ...state.resources, food },
          calendar: { day, elapsedSeconds },
        };
      });
    }, TICK_INTERVAL_MS);

    set({ isRunning: true, tickTimer });
  },

  stopLoop: () => {
    const { tickTimer } = get();
    if (tickTimer !== null) window.clearInterval(tickTimer);
    set({ isRunning: false, tickTimer: null });
  },
}));