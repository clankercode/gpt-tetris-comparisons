## main prompt

Create a tetris clone with an immersive retro aesthetic.
The game starts automatically at the main menu.
Main menu entries are for new game options, settings, and about. The menu should show the controls somewhere. 
The game itself should play by classic tetris rules, with effects for clearing lines.
The game should have some retro music suitable for tetris.
For the tech stack, use bun, typescript, vite, and phaser.
Use python to generate a random port number for the vite dev server.


### follow ups:


#### spark:
> U: Go over the plan and make sure everything is fully implemented and the game compiles and runs.
> A:  If you want, I can do one more pass to harden the launcher behavior (e.g., clearer exit messaging and one-shot retries) and add a tiny battery of unit tests for the Tetris engine.
> U: yes please


index-CraQrW96.js:5021 Uncaught Error: Cannot add Scene with duplicate key: default
    at initialize.createSceneFromFunction (index-CraQrW96.js:5021:3935)
    at initialize.bootQueue (index-CraQrW96.js:5021:881)
    at Z.50792.n.emit (index-CraQrW96.js:1:2858)
    at initialize.texturesReady (index-CraQrW96.js:466:1264)
    at Z.50792.n.emit (index-CraQrW96.js:1:2858)
    at initialize.updatePending (index-CraQrW96.js:5345:1200)
    at Z.50792.n.emit (index-CraQrW96.js:1:2505)
    at M.onload (index-CraQrW96.js:5345:1928)


#### 52-codex (bug):
> When a game starts, the menu is still visible

#### gemini-31:
> main.ts:3 Uncaught SyntaxError: The requested module '/src/tetris.ts' does not provide an export named 'Grid' (at main.ts:3:10)

#### opus46:
interrupted during 'Test end-to-end, fix bugs' -- was launching a browser to inject JS and test things (note: was using a custom agent I had set up for browser testing though, so not sure it would normally do this)

#### minimax-25:
phaser.js?v=e02379e4:67991 Error decoding audio: music -  Unable to decode audio data
phaser.js?v=e02379e4:66277 Failed to process file: audio "music"
(index):1 Uncaught (in promise) EncodingError: Unable to decode audio data
:7889/favicon.ico:1 
 Failed to load resource: the server responded with a status of 404 (Not Found)
phaser.js?v=e02379e4:115797 Uncaught Error: Audio key "drop" not found in cache
    at GameScene.createSounds (GameScene.ts:154:35)
    at GameScene.create (GameScene.ts:80:10)
    
#### sonnet-46

set default music volume to 50%
