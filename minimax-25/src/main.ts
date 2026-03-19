import { createGame } from './game/scenes/BootScene';
import './style.css';

window.addEventListener('load', () => {
  const game = createGame();
  (window as any).game = game;
});
