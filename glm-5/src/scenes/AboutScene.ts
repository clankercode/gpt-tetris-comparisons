import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

export class AboutScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AboutScene' });
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0a12).setOrigin(0, 0);
    
    this.add.text(GAME_WIDTH / 2, 50, 'ABOUT', { 
      fontFamily: 'monospace', 
      fontSize: '32px', 
      color: '#f08000' 
    }).setOrigin(0.5);
    
    const content = [
      '',
      'TETRIS - Retro Edition',
      '',
      'A classic Tetris clone with',
      'a retro arcade aesthetic.',
      '',
      'Built with:',
      '  - Phaser 3',
      '  - TypeScript',
      '  - Vite',
      '  - Bun',
      '',
      'Features:',
      '  - Classic 7-bag randomizer',
      '  - SRS rotation system',
      '  - Hold piece',
      '  - Ghost piece',
      '  - CRT effects',
      '',
      'How to Play:',
      'Stack the falling blocks',
      'to complete horizontal lines.',
      'Clear 4 lines at once',
      'for a TETRIS!',
      '',
      'Created for the',
      'Model Compare Tetris project',
    ];
    
    const startY = 100;
    content.forEach((line, i) => {
      this.add.text(GAME_WIDTH / 2, startY + i * 18, line, { 
        fontFamily: 'monospace', 
        fontSize: '12px', 
        color: '#a0a0a0',
        align: 'center',
      }).setOrigin(0.5);
    });
    
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Press ESC to return', { 
      fontFamily: 'monospace', 
      fontSize: '14px', 
      color: '#606060' 
    }).setOrigin(0.5);
    
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
    
    this.input.keyboard!.on('keydown-ENTER', () => {
      this.scene.start('MenuScene');
    });
    
    this.input.keyboard!.on('keydown-SPACE', () => {
      this.scene.start('MenuScene');
    });
  }
}
