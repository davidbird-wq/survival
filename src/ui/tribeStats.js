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

  const heading = document.createElement('button');
  heading.className = 'tribe-stats__name';
  heading.type = 'button';
  heading.title = 'Rename tribe';
  heading.setAttribute('aria-label', 'Rename tribe');
  panel.appendChild(heading);

  const editName = () => {
    const input = document.createElement('input');
    input.className = 'tribe-stats__name-input';
    input.type = 'text';
    input.maxLength = 24;
    input.value = store.getState().tribeName;
    heading.replaceWith(input);
    input.focus();
    input.select();

    const saveName = () => {
      store.getState().setTribeName(input.value);
      input.replaceWith(heading);
    };
    input.addEventListener('blur', saveName, { once: true });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.stopPropagation();
        input.blur();
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        input.replaceWith(heading);
      }
    });
  };
  heading.addEventListener('click', editName);

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

  const render = ({ resources, calendar, tribeName }) => {
    heading.textContent = tribeName;
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