import { createInitialState, tick } from './core/gameState.js';
import { loadHighScore, saveHighScore } from './core/persistence.js';
import { InputHandler } from './input/inputHandler.js';
import { GameLoop } from './loop/gameLoop.js';
import { Renderer } from './render/renderer.js';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (canvas === null) throw new Error('canvas#game-canvas not found');

  const highScore = loadHighScore();

  const renderer = new Renderer(canvas);
  const inputHandler = new InputHandler();
  // C5: createInitialState now returns phase:'menu', so the menu is shown on load.
  const initialState = createInitialState(highScore, Date.now());

  let lastHighScore = highScore;

  const gameLoop = new GameLoop(
    (state, actions, deltaMs) => {
      const next = tick(state, actions, deltaMs);
      if (next.highScore > lastHighScore) {
        lastHighScore = next.highScore;
        saveHighScore(next.highScore);
      }
      return next;
    },
    (state) => renderer.render(state),
    inputHandler,
    initialState,
  );

  // B4: single resize listener here (Renderer constructor no longer adds one)
  window.addEventListener('resize', () => {
    renderer.resize();
    renderer.render(gameLoop.getState());
  });

  gameLoop.start();
}

main();
