import { getTechnologyCost, jobDefinitions, technologyDefinitions } from '../store.js';

const resourceDefinitions = [
  ['food', 'Food'],
  ['wood', 'Wood'],
  ['population', 'Population'],
  ['discoveryPoints', 'Discovery Points'],
];

export function mountGameMenu(store) {
  const root = document.createElement('div');
  root.className = 'game-menu';

  const screen = document.createElement('section');
  screen.id = 'game-menu-screen';
  screen.className = 'game-menu__screen';
  screen.hidden = true;
  screen.setAttribute('aria-hidden', 'true');
  screen.setAttribute('aria-label', 'Game menu');
  root.appendChild(screen);

  const header = document.createElement('header');
  header.className = 'game-menu__header';
  const title = document.createElement('h2');
  title.textContent = 'Tribe Ledger';
  const close = document.createElement('button');
  close.className = 'game-menu__close';
  close.type = 'button';
  close.textContent = 'Close';
  header.append(title, close);
  screen.appendChild(header);

  const navigation = document.createElement('nav');
  navigation.className = 'game-menu__navigation';
  navigation.setAttribute('aria-label', 'Ledger sections');
  const content = document.createElement('div');
  content.className = 'game-menu__content';
  screen.append(navigation, content);

  const views = new Map();
  const viewButtons = new Map();
  for (const [id, label] of [['stats', 'Stats'], ['knowledge', 'Knowledge'], ['jobs', 'Jobs']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => selectView(id));
    navigation.appendChild(button);
    viewButtons.set(id, button);

    const view = document.createElement('article');
    view.className = `game-menu__view game-menu__view--${id}`;
    view.hidden = true;
    content.appendChild(view);
    views.set(id, view);
  }

  const statsView = views.get('stats');
  const statsHeading = document.createElement('h3');
  statsHeading.textContent = 'Tribe statistics';
  statsView.appendChild(statsHeading);
  const statGrid = document.createElement('dl');
  const statValues = new Map();
  for (const [resource, label] of resourceDefinitions) {
    const term = document.createElement('dt');
    term.textContent = label;
    const value = document.createElement('dd');
    statValues.set(resource, value);
    statGrid.append(term, value);
  }
  const dayTerm = document.createElement('dt');
  dayTerm.textContent = 'Current day';
  const dayValue = document.createElement('dd');
  statGrid.append(dayTerm, dayValue);
  statsView.appendChild(statGrid);

  const membersHeading = document.createElement('h3');
  membersHeading.textContent = 'Tribe members';
  statsView.appendChild(membersHeading);
  const membersList = document.createElement('ul');
  statsView.appendChild(membersList);

  const knowledgeView = views.get('knowledge');
  const knowledgeHeading = document.createElement('h3');
  knowledgeHeading.textContent = 'Knowledge';
  knowledgeView.appendChild(knowledgeHeading);
  const points = document.createElement('p');
  points.className = 'game-menu__points';
  knowledgeView.appendChild(points);
  const technologyList = document.createElement('div');
  technologyList.className = 'game-menu__technologies';
  knowledgeView.appendChild(technologyList);
  const technologyControls = new Map();

  for (const [id, technology] of Object.entries(technologyDefinitions)) {
    const node = document.createElement('article');
    node.className = 'game-menu__technology';
    const nodeTitle = document.createElement('h4');
    nodeTitle.textContent = technology.name;
    const description = document.createElement('p');
    description.textContent = technology.description;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Unlock · ${technology.cost} DP`;
    button.addEventListener('click', () => store.getState().unlockTechnology(id));
    const status = document.createElement('span');
    node.append(nodeTitle, description, button, status);
    technologyList.appendChild(node);
    technologyControls.set(id, { node, button, status });
  }

  const jobsView = views.get('jobs');
  const jobsHeading = document.createElement('h3');
  jobsHeading.textContent = 'Jobs';
  jobsView.appendChild(jobsHeading);
  const jobsIntro = document.createElement('p');
  jobsIntro.textContent = 'Assign tribe members to work around the settlement.';
  jobsView.appendChild(jobsIntro);
  const jobList = document.createElement('div');
  jobList.className = 'game-menu__jobs';
  jobsView.appendChild(jobList);
  const jobControls = new Map();
  const addJobControl = (member) => {
    const row = document.createElement('article');
    row.className = 'game-menu__job-row';
    const memberName = document.createElement('h4');
    memberName.textContent = member.name;
    const select = document.createElement('select');
    select.appendChild(new Option('Idle', ''));
    for (const [id, job] of Object.entries(jobDefinitions)) {
      select.appendChild(new Option(job.name, id));
    }
    select.addEventListener('change', () => {
      if (select.value) store.getState().assignJob(member.id, select.value);
      else store.getState().clearJob(member.id);
    });
    row.append(memberName, select);
    jobList.appendChild(row);
    jobControls.set(member.id, select);
  };
  for (const member of store.getState().tribeMembers) addJobControl(member);

  function selectView(viewId) {
    for (const [id, view] of views) {
      view.hidden = id !== viewId;
      viewButtons.get(id).classList.toggle('is-active', id === viewId);
    }
  }

  let isOpen = false;

  function setOpen(nextIsOpen) {
    isOpen = nextIsOpen;
    screen.hidden = !isOpen;
    screen.setAttribute('aria-hidden', String(!isOpen));
    root.classList.toggle('is-open', isOpen);
  }

  const render = ({ resources, calendar, tribeMembers, technologies, explorationLevel }) => {
    for (const [resource, value] of statValues) {
      value.textContent = Math.floor(resources[resource]).toString();
    }
    dayValue.textContent = calendar.day.toString();
    membersList.replaceChildren(...tribeMembers.map((member) => {
      const item = document.createElement('li');
      item.textContent = `${member.name} · ${member.job ? jobDefinitions[member.job].name : 'Idle'}`;
      return item;
    }));
    for (const member of tribeMembers) {
      if (!jobControls.has(member.id)) addJobControl(member);
      const select = jobControls.get(member.id);
      if (select) select.value = member.job || '';
    }
    points.textContent = `${Math.floor(resources.discoveryPoints)} Discovery Points available`;

    for (const [id, technology] of Object.entries(technologyDefinitions)) {
      const { node, button, status } = technologyControls.get(id);
      const isRepeatable = id === 'exploration';
      const unlocked = technologies[id];
      const missing = technology.prerequisites.find((prerequisite) => !technologies[prerequisite]);
      const cost = getTechnologyCost(id, { explorationLevel });
      const canUnlock = (!unlocked || isRepeatable) && !missing && resources.discoveryPoints >= cost;
      node.classList.toggle('is-unlocked', unlocked);
      button.disabled = !canUnlock;
      button.textContent = isRepeatable
        ? `Upgrade · ${cost} DP`
        : `Unlock · ${cost} DP`;
      status.textContent = unlocked
        ? isRepeatable ? `Level ${explorationLevel}` : 'Unlocked'
        : missing
          ? `Requires ${technologyDefinitions[missing].name}`
          : resources.discoveryPoints >= cost
            ? 'Ready to unlock'
            : `Need ${cost - resources.discoveryPoints} more DP`;
    }
  };

  close.addEventListener('click', () => setOpen(false));
  const handleKeydown = (event) => {
    const isTyping = event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement;
    if (event.key === 'Escape' && !isTyping && !document.querySelector('.main-menu')) {
      setOpen(!isOpen);
    }
  };
  document.addEventListener('keydown', handleKeydown);

  root.appendChild(screen);
  document.body.appendChild(root);
  selectView('stats');
  render(store.getState());
  const unsubscribe = store.subscribe(render);

  return () => {
    unsubscribe();
    document.removeEventListener('keydown', handleKeydown);
    root.remove();
  };
}