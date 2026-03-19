# Tetris Clone - Retro Edition

## Project Overview
- **Project Name**: Retro Tetris
- **Project Type**: Browser-based arcade game
- **Core Functionality**: Classic Tetris gameplay with authentic retro CRT aesthetic
- **Target Users**: Casual gamers, retro gaming enthusiasts

## Tech Stack
- **Runtime**: Bun
- **Language**: TypeScript
- **Build Tool**: Vite (with random port from Python)
- **Game Engine**: Phaser 3

## UI/UX Specification

### Layout Structure
- **Game Resolution**: 800x600 pixels (4:3 ratio, CRT-style)
- **Play Area**: 10x20 grid (centered, 28px cells = 280x560 play area)
- **Side Panel**: Score, level, lines display (right side)
- **Menu Overlay**: Full-screen with scanline overlay

### Visual Design

#### Color Palette
- **Background**: `#0a0a0a` (deep black with slight CRT glow)
- **Grid Background**: `#1a1a2e` (dark navy)
- **UI Text**: `#00ff88` (retro green terminal)
- **UI Accent**: `#ff00ff` (magenta for highlights)
- **Scanline Overlay**: `rgba(0, 0, 0, 0.15)`

#### Tetromino Colors (Classic)
- **I**: `#00f5ff` (cyan)
- **J**: `#0066ff` (blue)
- **L**: `#ff9900` (orange)
- **O**: `#ffdd00` (yellow)
- **S**: `#00ff66` (green)
- **T**: `#cc00ff` (purple)
- **Z**: `#ff3333` (red)

#### Typography
- **Main Font**: "Press Start 2P" (Google Fonts - pixel style)
- **Fallback**: monospace

#### Visual Effects
- CRT scanline overlay (horizontal lines)
- Subtle screen curvature effect (CSS)
- Screen flicker on line clear (brief)
- Glow effect on active piece
- Ghost piece (semi-transparent, same position)

### Components

#### Main Menu
- Game title: "RETRO TETRIS" with flicker animation
- Menu entries:
  - "NEW GAME" → starts game
  - "SETTINGS" → sound on/off, controls info
  - "ABOUT" → game info/credits
- Controls display at bottom of menu:
  - "←→: MOVE  ↑: ROTATE  ↓: SOFT DROP  SPACE: HARD DROP  P: PAUSE"
- Selected item highlighted in magenta
- Background: animated falling pieces (slow)

#### Game HUD
- Score display (top right)
- Level display
- Lines cleared
- Next piece preview (small, right side)
- Pause overlay when paused

#### Game Over Screen
- "GAME OVER" text with glitch effect
- Final score display
- "PRESS ENTER TO RETURN TO MENU"

#### Settings Screen
- Sound: ON/OFF toggle
- Music: ON/OFF toggle
- Back option

#### About Screen
- Game title and version
- Simple credit text
- Back option

## Functionality Specification

### Core Features

#### Tetris Mechanics
1. **Piece Generation**: Standard 7-bag randomizer (each piece appears once per 7)
2. **Movement**: Left, Right, Down (soft drop), Up (rotate), Space (hard drop)
3. **Rotation**: Wall kicks (SRS-like basic implementation)
4. **Line Clearing**: 
   - 1 line: 100 × level
   - 2 lines: 300 × level
   - 3 lines: 500 × level
   - 4 lines (Tetris): 800 × level
5. **Leveling**: Every 10 lines cleared, level increases, speed increases
6. **Speed Curve**: Start at 1000ms drop interval, decrease by 100ms per level (min 100ms)

#### Game States
- **Menu**: Main menu active
- **Playing**: Active gameplay
- **Paused**: Game paused (P key)
- **GameOver**: No valid moves remaining

### User Interactions
- Arrow keys for piece control
- P key for pause
- Enter to confirm menu selections
- Escape to go back (menu screens)

### Audio
- Background music: "Korobeiniki" (Tetris Theme A) - public domain Russian folk song
- Line clear sound: retro blip
- Game over sound: descending tone

### Edge Cases
- Wall collision handling
- Floor collision
- Piece spawn collision (game over)
- Rapid key presses (debounce)

## Acceptance Criteria
1. Game loads to main menu automatically
2. Menu shows controls and all three options
3. New game starts with falling tetromino
4. All 7 tetrominoes appear with correct colors
5. Lines clear with visual effect when complete
6. Score updates correctly per line clear rules
7. Level increases every 10 lines
8. Speed increases with level
9. Game over triggers when pieces stack to top
10. Retro scanline effect visible
11. Music plays during gameplay
12. Settings toggle sound/music on/off
13. About screen displays game info

## File Structure
```
minimax-25/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── scenes/
│   │   │   ├── MenuScene.ts
│   │   │   ├── GameScene.ts
│   │   │   ├── SettingsScene.ts
│   │   │   └── AboutScene.ts
│   │   ├── objects/
│   │   │   └── Tetromino.ts
│   │   └── utils/
│   │       └── TetrisLogic.ts
│   └── style.css
├── public/
│   └── music/
│       └── tetris-theme.mp3
├── scripts/
│   └── get-random-port.py
└── SPEC.md
```