const statDefinitions = [
  ['food', 'Food'],
  ['wood', 'Wood'],
  ['population', 'Population'],
  ['discoveryPoints', 'Discovery'],
];

export function mountTribeStats(store) {
  const panel = document.createElement('aside');
  panel.className = 'tribe-stats';
  panel.setAttribute('aria-label', 'Tribe statistics');

  const heading = document.createElement('h1');
  heading.textContent = 'Tribe';
  panel.appendChild(heading);

  const day = document.createElement('p');
  day.className = 'tribe-stats__day';
  panel.appendChild(day);

  const list = document.createElement('dl');
  const values = new Map();

  for (const [resource, label] of statDefinitions) {
    const term = document.createElement('dt');
    term.textContent = label;
    const value = document.createElement('dd');
    values.set(resource, value);
    list.append(term, value);
  }

  panel.appendChild(list);
  document.body.appendChild(panel);

  const render = ({ resources, calendar }) => {
    day.textContent = `Day ${calendar.day}`;

    for (const [resource, value] of values) {
      value.textContent = Math.floor(resources[resource]).toString();
    }
  };

  render(store.getState());
  const unsubscribe = store.subscribe(render);

  return () => {
    unsubscribe();
    panel.remove();
  };
}