# Tetris

A production-quality Tetris clone built with TypeScript (strict mode), Vite, and HTML5 Canvas 2D. Zero runtime dependencies.

## Quick Start

```bash
npm install
npm run dev        # development server (http://localhost:5173)
npm run build      # production build → dist/
npm run preview    # preview the production build
npm test           # run all unit tests
npm run lint       # ESLint check
```

---

## Controls

| Key(s)            | Action                     |
|-------------------|----------------------------|
| ← Arrow           | Move left                  |
| → Arrow           | Move right                 |
| ↓ Arrow           | Soft drop (1 pt/cell)      |
| Space             | Hard drop (2 pts/cell)     |
| ↑ Arrow, X        | Rotate clockwise           |
| Z                 | Rotate counter-clockwise   |
| C, Shift          | Hold piece                 |
| P, Escape         | Pause / Resume             |
| R                 | Restart                    |
| Enter             | Start (from Menu/GameOver) |

Movement uses **DAS** (170 ms delay) and **ARR** (50 ms repeat rate).

---

## Scoring Rules

### Line Clears (× current level)

| Lines | Name    | Base  |
|-------|---------|-------|
| 1     | Single  | 100   |
| 2     | Double  | 300   |
| 3     | Triple  | 500   |
| 4     | Tetris  | 800   |

### T-Spin Clears (× current level)

| Lines | Name           | Base  |
|-------|----------------|-------|
| 0     | T-Spin         | 400   |
| 1     | T-Spin Single  | 800   |
| 2     | T-Spin Double  | 1200  |
| 3     | T-Spin Triple  | 1600  |

| Lines | Name              | Base |
|-------|-------------------|------|
| 0     | Mini T-Spin       | 100  |
| 1     | Mini T-Spin Single| 200  |

### Bonuses

- **Back-to-Back**: ×1.5 multiplier on Tetris and T-spin clears when consecutive.
- **Combo**: 50 × combo\_count × level (combo\_count increments with each consecutive piece that clears at least one line).
- **Soft drop**: 1 pt per cell.
- **Hard drop**: 2 pts per cell.

### Levelling

Level increases by 1 for every 10 lines cleared. Gravity accelerates using the guideline formula:

```
interval(level) = (0.8 − (level−1) × 0.007)^(level−1)  seconds per row
```

---

## Architecture

```
src/
├── core/           Pure, deterministic game logic — no DOM access
│   ├── board.ts        10×22 grid operations (create, place, clear)
│   ├── piece.ts        Piece shapes, colors, block positions, spawn
│   ├── bag.ts          7-bag randomizer with Mulberry32 seedable RNG
│   ├── collision.ts    Bounds and overlap checks
│   ├── srs.ts          SRS rotation with full JLSTZ + I kick tables
│   ├── gravity.ts      Gravity interval formula + ghost Y computation
│   ├── lockDelay.ts    500 ms lock delay with 15-reset cap
│   ├── tspin.ts        T-spin detection (3-corner rule)
│   ├── scoring.ts      Guideline scoring, back-to-back, combo
│   ├── hold.ts         Hold slot logic
│   ├── gameState.ts    Full game state machine (createInitialState + tick)
│   └── persistence.ts  localStorage high score (safe try/catch wrapper)
│
├── input/          Keyboard event handling
│   └── inputHandler.ts  DAS/ARR state machine, key→action mapping
│
├── render/         Canvas 2D renderer (read-only on state)
│   └── renderer.ts      Board, ghost, pieces, hold, preview, HUD, overlays
│
├── loop/           Game loop
│   └── gameLoop.ts      Fixed-timestep rAF accumulator (FIXED_STEP = 16.667 ms)
│
├── types.ts        All shared TypeScript interfaces
├── constants.ts    Named constants (DAS, ARR, lock delay, board size, etc.)
└── main.ts         Entry point — wires all subsystems together
```

### Design Principles

- **Pure core**: `core/` contains only pure functions. No DOM, no side effects.
- **Single tick function**: `tick(state, actions, deltaMs) → GameState` is the only entry point for state mutation.
- **Seedable RNG**: Mulberry32 PRNG makes every bag sequence reproducible for tests.
- **Fixed timestep**: The game loop runs at a fixed 16.667 ms step, decoupled from rAF frame rate.

---

## Tech Stack

- **TypeScript** (strict + noUncheckedIndexedAccess)
- **Vite 6** — dev server and bundler
- **Vitest 3** — unit testing
- **ESLint 9** + **Prettier 3** — linting and formatting
- **Zero runtime dependencies**

---

## Test Coverage

194 unit tests covering:

- All SRS kick transitions (JLSTZ and I-piece tables)
- Lock delay reset cap (15 resets)
- 7-bag distribution (14 pieces = 2× each type)
- Full scoring table including T-spin, back-to-back, and combo
- T-spin detection (3-corner rule, mini/full, kickIndex 4 override)
- Block-out and lock-out game-over conditions
- Game state transitions (menu → playing → paused → gameover)
- Persistence (localStorage read/write with error handling)
- Input handler DAS/ARR timing and priority
