## main prompt

Create a tetris clone with an immersive retro aesthetic.
The game starts automatically at the main menu.
Main menu entries are for new game options, settings, and about. The menu should show the controls somewhere. 
The game itself should play by classic tetris rules, with effects for clearing lines.
The game should have some retro music suitable for tetris.
For the tech stack, use bun, typescript, vite, and phaser.
Use python to generate a random port number for the vite dev server.


### follow ups:


spark:
> U: Go over the plan and make sure everything is fully implemented and the game compiles and runs.
> A:  If you want, I can do one more pass to harden the launcher behavior (e.g., clearer exit messaging and one-shot retries) and add a tiny battery of unit tests for the Tetris engine.
> U: yes please

52-codex (bug):
> When a game starts, the menu is still visible
