export function mountMainMenu(store, onStart) {
  const menu = document.createElement('main');
  menu.className = 'main-menu';

  const actions = document.createElement('div');
  actions.className = 'main-menu__actions';
  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.textContent = 'Continue';
  continueButton.disabled = !localStorage.getItem('survival-save-v1');
  const newGameButton = document.createElement('button');
  newGameButton.type = 'button';
  newGameButton.textContent = 'New Game';
  actions.append(continueButton, newGameButton);

  menu.append(actions);
  document.body.appendChild(menu);

  const begin = (isNewGame) => {
    if (isNewGame) store.getState().resetGame();
    menu.remove();
    onStart();
  };

  continueButton.addEventListener('click', () => begin(false));
  newGameButton.addEventListener('click', () => begin(true));

  return () => menu.remove();
}