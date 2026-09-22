# Tetris Clone — Implementation Tasks

**Revision**: 1.0  
**Date**: 2026-09-21  
**Convention**: Tasks are ordered so every task's dependencies are already complete. Each task ends with `npm test && npm run lint` passing before it is marked done.

---

## TASK-0 — Project Scaffold

**Requirements satisfied**: REQ-18.1, REQ-18.2, REQ-18.3 (toolchain foundation)  
**Files touched**:
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `.eslintrc.cjs`
- `.prettierrc`
- `index.html`
- `src/main.ts` (empty entry point stub)

**Work**:
1. `npm create vite@latest . -- --template vanilla-ts`
2. Install dev deps: `vitest`, `@vitest/coverage-v8`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`, `prettier`
3. Configure `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `target: ES2020`
4. Configure Vitest in `vite.config.ts` with `globals: true`, `environment: 'node'`
5. Configure ESLint: `@typescript-eslint/recommended`, `no-explicit-any`, `no-unused-vars`
6. Add npm scripts: `dev`, `build`, `preview`, `test`, `test:coverage`, `lint`, `format`
7. `index.html` references a single `<canvas id="game-canvas">` and loads `src/main.ts`

**Unit tests**: None (scaffold only).  
**Verification**: `npm run build` exits 0; `npm test` exits 0 (no tests yet = pass).

---

## TASK-1 — Types and Constants

**Requirements satisfied**: All (shared foundation)  
**Files touched**:
- `src/types.ts`
- `src/constants.ts`

**Work**:
1. Write all interfaces from `design.md §4` verbatim into `src/types.ts`: `CellType`, `PieceType`, `Piece`, `Board`, `InputAction`, `TSpin`, `ScoreEvent`, `LockDelayState`, `DASState`, `LineClearAnimation`, `GamePhase`, `GameState`
2. Write `src/constants.ts`:
   - `BOARD_COLS = 10`, `BOARD_ROWS = 22`, `VISIBLE_ROWS = 20`, `SPAWN_ROWS = 2`
   - `DAS_MS = 170`, `ARR_MS = 50`
   - `LOCK_DELAY_MS = 500`, `LOCK_RESET_CAP = 15`
   - `LINE_CLEAR_ANIM_MS = 200`
   - `GRAVITY_FORMULA` comment with formula
   - `NEXT_QUEUE_SIZE = 5`
   - `PIECE_TYPES: PieceType[]`

**Unit tests**: None (types/constants only).  
**Verification**: `tsc --noEmit` exits 0.

---

## TASK-2 — Board

**Requirements satisfied**: REQ-1.1, REQ-1.2, REQ-1.3, REQ-1.4  
**Files touched**:
- `src/core/board.ts`
- `src/core/__tests__/board.test.ts`

**Work**:
1. Implement `createBoard(): Board` — returns 22×10 array filled with `0`
2. Implement `isRowFull(board, row): boolean`
3. Implement `findFullRows(board): number[]` — returns sorted row indices
4. Implement `clearRows(board, rows): Board` — removes rows, prepends empty rows
5. Implement `placePiece(board, piece): Board` — stamps piece cells, returns new board
6. Implement `getCell(board, row, col): CellType` — bounds-safe accessor

**Unit tests** (`board.test.ts`):
- `createBoard` returns 22 rows of 10 zeroes
- `isRowFull` returns false on empty row, true on full row, false on partial row
- `findFullRows` returns correct indices for multiple full rows
- `clearRows` removes correct rows, prepends correct number of empty rows, preserves other rows
- `placePiece` stamps correct cells, does not mutate original board
- `getCell` returns 0 for out-of-bounds coordinates

---

## TASK-3 — Pieces (Shapes + Colors)

**Requirements satisfied**: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5  
**Files touched**:
- `src/core/piece.ts`
- `src/core/__tests__/piece.test.ts`

**Work**:
1. Define `PIECE_SHAPES: Record<PieceType, readonly [number, number][][]>` — 4 rotation states each, as absolute [row, col] offsets from a 4×4 bounding box, matching the Tetris guideline exactly
2. Define `PIECE_COLORS: Record<PieceType, string>` — hex strings from REQ-2.2
3. Implement `getBlocks(piece: Piece): [number, number][]` — returns 4 absolute [row, col] board positions
4. Implement `spawnPiece(type: PieceType): Piece` — returns piece at guideline spawn position (I at col 3, O at col 4, others at col 3), row 0, rotation 0

**Unit tests** (`piece.test.ts`):
- Each piece type has exactly 4 rotation states
- Each rotation state has exactly 4 cells
- `getBlocks` for I at rotation 0 returns the horizontal bar at the correct row/cols
- `getBlocks` for T at all 4 rotations matches guideline shapes
- `spawnPiece` returns correct spawn columns for I, O, and T
- All 7 PIECE_COLORS are valid hex strings matching REQ-2.2 table

---

## TASK-4 — 7-Bag Randomizer (Seedable RNG)

**Requirements satisfied**: REQ-3.1, REQ-3.2, REQ-3.3, REQ-3.4, REQ-3.5  
**Files touched**:
- `src/core/bag.ts`
- `src/core/__tests__/bag.test.ts`

**Work**:
1. Implement `mulberry32(seed: number): () => number` — pure RNG factory
2. Define `BagState` interface: `{ rng: () => number; remaining: PieceType[]; }` (exported)
3. Implement `createBag(seed: number): BagState`
4. Implement `nextPiece(bag: BagState): [PieceType, BagState]` — pure, never mutates input
5. Implement `peekQueue(bag: BagState, count: number): PieceType[]` — returns next `count` pieces without advancing the bag (used to fill the preview queue)

**Unit tests** (`bag.test.ts`):
- With a fixed seed, two calls to `createBag` produce identical sequences
- 7 consecutive `nextPiece` calls return all 7 piece types exactly once
- On the 8th call a new bag is generated (pieces may repeat across bags)
- `peekQueue(bag, 14)` returns 14 pieces with each type appearing exactly twice
- `peekQueue` does not advance the bag (calling `nextPiece` after returns the same first piece)
- Two different seeds produce different orderings

---

## TASK-5 — Collision Detection

**Requirements satisfied**: REQ-1.4, REQ-4.7 (prerequisite for SRS and movement)  
**Files touched**:
- `src/core/collision.ts`
- `src/core/__tests__/collision.test.ts`

**Work**:
1. Implement `isValidPosition(board: Board, piece: Piece): boolean` — returns true if all 4 cells are within bounds and on empty board cells
2. Implement `isOnFloor(board: Board, piece: Piece): boolean` — returns true if moving the piece down by 1 would fail `isValidPosition`
3. Implement `canMove(board: Board, piece: Piece, dx: number, dy: number): boolean`

**Unit tests** (`collision.test.ts`):
- Piece within empty board: valid
- Piece overlapping left wall: invalid
- Piece overlapping right wall: invalid
- Piece overlapping bottom (row 22): invalid
- Piece overlapping another locked cell: invalid
- `isOnFloor` true when piece is one row above the floor
- `isOnFloor` true when piece is directly above a locked cell
- `isOnFloor` false when piece has space below it
- Piece entirely in hidden rows (0–1) but valid: valid position

---

## TASK-6 — SRS Rotation

**Requirements satisfied**: REQ-4.1, REQ-4.2, REQ-4.3, REQ-4.4, REQ-4.5, REQ-4.6, REQ-4.7  
**Files touched**:
- `src/core/srs.ts`
- `src/core/__tests__/srs.test.ts`

**Work**:
1. Define `KICKS_JLSTZ` and `KICKS_I` as typed constants (verbatim from `design.md §9`)
2. Implement `nextRotation(current: 0|1|2|3, dir: 'cw'|'ccw'): 0|1|2|3`
3. Implement `tryRotate(board: Board, piece: Piece, dir: 'cw'|'ccw'): { piece: Piece; kickIndex: number } | null`
   - Returns `null` if all kick offsets fail
   - Returns the rotated+kicked piece and the index (0–4) of the successful kick
   - O-piece always returns rotation 0 (no kick needed, always valid)
4. Key offset convention: `[colDelta, rowDelta]` (positive col = right, positive row = down)

**Unit tests** (`srs.test.ts`):
- JLSTZ: test each of the 8 transition directions with no wall near → offset 0 used (kickIndex 0)
- T-piece 0→1 against left wall: kick offsets tried in order, correct one accepted
- T-piece 1→0 against right wall: correct kick
- I-piece 0→1 in open space: kickIndex 0
- I-piece 0→1 against left wall: correct I-piece kick (kickIndex 2 or appropriate)
- I-piece 1→0 against right wall: correct I-piece kick
- I-piece near top of board (wall-kick row check)
- Rotation that can't resolve → `tryRotate` returns null
- O-piece: all 4 rotations return the same block positions
- CCW rotation: `nextRotation(0, 'ccw')` returns 3; `nextRotation(1, 'ccw')` returns 0
- CW rotation: `nextRotation(3, 'cw')` wraps to 0

---

## TASK-7 — Gravity and Ghost

**Requirements satisfied**: REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.4, REQ-10.1, REQ-10.2, REQ-10.3  
**Files touched**:
- `src/core/gravity.ts`
- `src/core/__tests__/gravity.test.ts`

**Work**:
1. Implement `gravityInterval(level: number): number` — returns ms per row using guideline formula
2. Implement `computeGhostY(board: Board, piece: Piece): number` — returns the Y of the ghost landing row

**Unit tests** (`gravity.test.ts`):
- `gravityInterval(1)` ≈ 1000 ms (±1 ms)
- `gravityInterval(20)` ≈ 20 ms (±5 ms, verifying formula)
- `gravityInterval(5)` matches manual calculation of `(0.8-0.028)^4 * 1000`
- `computeGhostY` returns the piece's current Y when already on the floor
- `computeGhostY` drops correctly through an empty board (returns 22 - pieceHeight)
- `computeGhostY` stops above a locked cell

---

## TASK-8 — Lock Delay

**Requirements satisfied**: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5  
**Files touched**:
- `src/core/lockDelay.ts`
- `src/core/__tests__/lockDelay.test.ts`

**Work**:
1. Implement `createLockDelay(): LockDelayState`
2. Implement `tickLockDelay(state: LockDelayState, deltaMs: number, isOnFloor: boolean): LockDelayState`
   - Activates timer when `isOnFloor` becomes true
   - Returns `{ ...state, shouldLock: true }` when timer expires
3. Implement `resetLockDelay(state: LockDelayState): LockDelayState`
   - Increments `resetCount`; if `resetCount >= LOCK_RESET_CAP`, does NOT reset the timer (piece will lock on next expiry)
4. Expose `shouldLock(state: LockDelayState): boolean` helper

**Unit tests** (`lockDelay.test.ts`):
- Timer not active when piece is not on floor
- Timer activates when piece touches floor
- `shouldLock` false at 499 ms, true at 500 ms
- Reset on 14th attempt: timer resets normally
- Reset on 15th attempt (cap reached): timer does NOT reset
- After cap reached, any subsequent `tickLockDelay` with `isOnFloor=true` returns `shouldLock: true` immediately
- Moving piece off floor (isOnFloor=false) pauses the timer

---

## TASK-9 — Line Clear and T-Spin Detection

**Requirements satisfied**: REQ-11.1, REQ-11.2, REQ-11.3, REQ-11.4, REQ-12.2, REQ-12.3, REQ-12.4  
**Files touched**:
- `src/core/tspin.ts`
- `src/core/__tests__/tspin.test.ts`

**Work**:
1. Implement `detectTSpin(board: Board, piece: Piece, lastActionWasRotation: boolean, kickIndex: number): TSpin`
   - Only applies to the T-piece; all other pieces return `'none'`
   - Checks 4 corners of the T's 3×3 bounding box (using `getCell` with out-of-bounds treated as occupied)
   - 3 or 4 corners occupied → `'full'`, unless kickIndex === 4 → `'mini'`
   - Exactly 2 corners occupied → `'mini'`
   - `lastActionWasRotation` must be true for any T-spin (including mini) to be detected

**Unit tests** (`tspin.test.ts`):
- T-piece locked without rotation: `'none'`
- T-piece rotated with 3 corners filled: `'full'`
- T-piece rotated with 4 corners filled: `'full'`
- T-piece rotated with 2 corners filled: `'mini'`
- T-piece rotated with kickIndex 4: `'mini'` (forced mini regardless of corner count)
- Standard TST (T-spin triple) setup: T at rotation 1, 3 corners filled → `'full'`
- I-piece: always `'none'`
- T-piece translated (not rotated): `'none'`

---

## TASK-10 — Scoring

**Requirements satisfied**: REQ-12.1 through REQ-12.9, REQ-13.1, REQ-13.2, REQ-13.3  
**Files touched**:
- `src/core/scoring.ts`
- `src/core/__tests__/scoring.test.ts`

**Work**:
1. Define `LINE_CLEAR_BASE`, `TSPIN_BASE`, `MINI_TSPIN_BASE` constants
2. Implement `computeScore(event: ScoreEvent): number`
   - Handles all combinations: lines × (none/mini/full T-spin) × b2b × combo
   - Back-to-back multiplier of ×1.5 applied to the base line score (rounded down)
   - Combo bonus = 50 × combo × level (combo is 0-indexed: first consecutive clear = combo 0)
   - Soft drop and hard drop bonuses added
3. Implement `computeLevelAndLines(currentLines: number, clearedNow: number): { level: number; lines: number }` — level = floor(totalLines / 10) + 1

**Unit tests** (`scoring.test.ts`):
- Single line at level 1, no T-spin: 100
- Double at level 2: 600
- Triple at level 3: 1500
- Tetris at level 1: 800
- Tetris back-to-back at level 1: 1200 (800 × 1.5)
- T-spin single at level 1: 800
- T-spin double back-to-back at level 2: 3600 (1200 × 1.5 × 2)
- T-spin triple at level 1: 1600
- Mini T-spin single at level 1: 200
- Combo 0 (first): 50 × 0 × level = 0 bonus (combo bonus starts at 1st consecutive)

  > **Note**: Combo bonus formula: combo bonus = 50 × comboCount × level where comboCount starts at 1 on the first back-to-back clear (combo index 0 = 1 consecutive). Adjust implementation so first consecutive clear awards 50×1×level.

- Combo count 3 at level 2: 50 × 3 × 2 = 300 bonus
- Soft drop 5 cells: +5 points
- Hard drop 10 cells: +20 points
- `computeLevelAndLines(0, 10)` → level 2, lines 10
- `computeLevelAndLines(19, 1)` → level 3, lines 20
- Level does not exceed formula application (no cap)

---

## TASK-11 — Hold, Preview, Ghost (State helpers)

**Requirements satisfied**: REQ-8.1 through REQ-8.5, REQ-9.1 through REQ-9.3, REQ-10.1 through REQ-10.3  
**Files touched**:
- `src/core/hold.ts`
- `src/core/__tests__/hold.test.ts`

**Work**:
1. Implement `applyHold(activePiece: Piece, holdPiece: PieceType | null, holdUsed: boolean, bag: BagState): { activePiece: Piece; holdPiece: PieceType; holdUsed: boolean; bag: BagState } | null`
   - Returns `null` if `holdUsed` is true (action blocked)
   - If hold slot empty: pops next piece from bag, sets holdPiece = activePiece.type
   - If hold slot occupied: swaps active and held piece types
   - Spawns the new active piece via `spawnPiece`
2. `peekNextQueue(bag, count)` already implemented in TASK-4; confirm it works here

**Unit tests** (`hold.test.ts`):
- Hold when slot empty: new piece from bag spawns, old piece moves to slot
- Hold when slot occupied: pieces swap, swapped-in piece at rotation 0
- Hold twice in a row (holdUsed=true): returns null
- After piece locks, holdUsed resets: hold works again on next piece
- Held piece's bag position is preserved correctly (queue unaffected)

---

## TASK-12 — Game State Machine (Core tick)

**Requirements satisfied**: REQ-14.1, REQ-14.2, REQ-15.1 through REQ-15.7, all gameplay requirements  
**Files touched**:
- `src/core/gameState.ts`
- `src/core/__tests__/gameState.test.ts`

**Work**:
1. Implement `createInitialState(highScore: number, seed: number): GameState`
2. Implement `tick(state: GameState, actions: InputAction[], deltaMs: number): GameState`
   - If phase is `'menu'` or `'gameover'`: only handle START / RESTART actions
   - If phase is `'paused'`: only handle PAUSE / RESTART; freeze all timers
   - If phase is `'playing'`:
     a. Process actions in order: HOLD → ROTATE → MOVE (left/right) → SOFT_DROP → HARD_DROP → PAUSE → RESTART
     b. Advance gravity timer; apply gravity drop if due
     c. Tick lock delay; lock piece if due
     d. On lock: call `placePiece`, `findFullRows`, start `lineClearAnim` if rows found
     e. After anim completes: `clearRows`, update score, level, lines, combo, b2b
     f. Spawn next piece; check block-out → `'gameover'`
     g. Update `ghostY` via `computeGhostY`
3. Implement `isBlockOut(board: Board, piece: Piece): boolean` — any locked cell under the new piece
4. Implement `isLockOut(piece: Piece): boolean` — all 4 cells in rows 0–1

**Unit tests** (`gameState.test.ts`):
- `createInitialState` returns phase `'playing'`, board of zeroes, non-null activePiece, nextQueue length ≥ 5
- PAUSE action transitions playing → paused
- Second PAUSE action transitions paused → playing
- RESTART from paused transitions to playing with fresh state
- RESTART from gameover transitions to playing
- Hard drop: piece locks, new piece spawns
- Block-out: game transitions to `'gameover'`
- Lock-out: game transitions to `'gameover'`
- Line clear increments `lines` count and `level` after 10 lines
- Score updates after a Tetris
- Paused state: `tick` with gravity deltaMs does not advance gravity timer

---

## TASK-13 — Persistence

**Requirements satisfied**: REQ-16.1, REQ-16.2, REQ-16.3  
**Files touched**:
- `src/core/persistence.ts`
- `src/core/__tests__/persistence.test.ts`

**Work**:
1. Implement `loadHighScore(): number` — reads `"tetris-high-score"` from `localStorage`; returns 0 if missing, unparseable, or any exception
2. Implement `saveHighScore(score: number): void` — writes `String(score)` to `"tetris-high-score"`; swallows all exceptions

**Unit tests** (`persistence.test.ts`):
- `loadHighScore` returns 0 when key absent (mock `localStorage`)
- `loadHighScore` returns correct number when key present
- `loadHighScore` returns 0 when value is non-numeric
- `saveHighScore` writes the correct key/value
- `saveHighScore` does not throw when `localStorage.setItem` throws (quota exceeded mock)
- `loadHighScore` does not throw when `localStorage.getItem` throws

---

## TASK-14 — Input Handler (DAS/ARR)

**Requirements satisfied**: REQ-5.1 through REQ-5.7, REQ-17.1, REQ-17.2  
**Files touched**:
- `src/input/inputHandler.ts`
- `src/input/__tests__/inputHandler.test.ts`

**Work**:
1. Define `KEY_MAP: Record<string, InputAction>` mapping DOM `event.code` to `InputAction`
2. Implement `InputHandler` class:
   - `constructor()`: attaches `keydown`/`keyup` listeners; calls `preventDefault` for all game keys
   - `update(deltaMs: number): void`: advances DAS/ARR timers, enqueues repeat actions
   - `drainActions(): InputAction[]`: returns queued actions and clears the queue
   - `destroy(): void`: removes event listeners
3. DAS state: on keydown for LEFT/RIGHT, enqueue immediate action, start 170ms DAS timer; on expiry start 50ms ARR; on keyup cancel both
4. Most-recently-pressed wins for simultaneous left+right

**Unit tests** (`inputHandler.test.ts`):
- Keydown LEFT: immediate `MOVE_LEFT` in queue
- Keydown LEFT, `update(169ms)`: no repeat yet
- Keydown LEFT, `update(170ms)`: ARR fires, one repeat
- Keydown LEFT, `update(170ms)`, `update(50ms)`: second repeat
- Keydown RIGHT then LEFT (while RIGHT held): LEFT takes priority
- Keydown LEFT then release: no further actions after release
- `drainActions` clears queue: second call returns empty array
- HARD_DROP and ROTATE: no DAS/ARR (one-shot only)
- `destroy` removes listeners (simulate by calling after detach and verifying no actions queued)

---

## TASK-15 — Renderer

**Requirements satisfied**: REQ-18.1, REQ-18.2, REQ-18.3, REQ-18.4, REQ-18.5, REQ-9.3, REQ-10.2, REQ-8.5  
**Files touched**:
- `src/render/renderer.ts`

**Work**:
1. Implement `Renderer` class with `constructor(canvas: HTMLCanvasElement)`
2. Implement `resize()`: calculates cell size from `devicePixelRatio` and viewport, updates canvas width/height
3. Implement `render(state: GameState): void` — all drawing steps from design §7
   - `drawBoard(state)`: draws locked cells; during `lineClearAnim`, flash cleared rows (alternate fill each 50ms slice)
   - `drawGhost(state)`: draws ghost cells with 30% alpha
   - `drawActivePiece(state)`: draws current piece
   - `drawHold(state)`: draws hold panel; grays out piece if `holdUsed`
   - `drawPreview(state)`: draws next 5 pieces
   - `drawHUD(state)`: score, high score, level, lines
   - `drawOverlay(state)`: renders Menu/Paused/GameOver text overlay
4. Use `Math.floor` for all pixel positions (integer snapping, REQ-18.4)
5. Listen to `window.resize` and call `resize()` automatically

**Unit tests**: None (visual only; verified manually).  
**Verification**: `npm run build` exits 0.

---

## TASK-16 — Game Loop

**Requirements satisfied**: REQ-18.3, REQ-6.1 (loop drives gravity), REQ-15.7 (pause freezes timers)  
**Files touched**:
- `src/loop/gameLoop.ts`

**Work**:
1. Implement `GameLoop` class:
   - `constructor(onTick: (deltaMs: number, actions: InputAction[]) => GameState, onRender: (state: GameState) => void, inputHandler: InputHandler)`
   - `start()`: kicks off `requestAnimationFrame`
   - `stop()`: cancels the rAF handle
2. Fixed timestep: `FIXED_STEP_MS = 1000/60 ≈ 16.667`
3. Accumulator pattern as per design §8; cap raw `dt` at 250ms
4. `onTick` called with `FIXED_STEP_MS`; `onRender` called once per rAF frame after all ticks

**Unit tests**: None (rAF environment; verified via integration).  
**Verification**: `npm run dev` starts without errors; game loop visible at 60 FPS in DevTools.

---

## TASK-17 — Main Entry Point (Wiring)

**Requirements satisfied**: All (integration)  
**Files touched**:
- `src/main.ts`

**Work**:
1. Read `highScore` via `loadHighScore()`
2. Create `InputHandler`, `Renderer`, initial `GameState`
3. Define `tick` closure: calls `gameState.tick(...)`, saves high score on game over, returns new state
4. Create and `start()` the `GameLoop`
5. Handle `window.resize` → `renderer.resize()` + re-render
6. Export nothing (side-effect entry point)

**Unit tests**: None.  
**Verification**: `npm run dev` → game is playable end-to-end.

---

## TASK-18 — Line Clear Animation (Polish)

**Requirements satisfied**: REQ-11.2, REQ-15.7  
**Files touched**:
- `src/core/gameState.ts` (animation timer already part of state; verify integration)
- `src/render/renderer.ts` (flash effect)

**Work**:
1. Verify that `tick` does not spawn the next piece while `lineClearAnim` is active
2. Verify that the animation timer decrements correctly each `tick` (not affected by pause)
3. In `renderer.ts`: render clearing rows with a white/bright flash — alternating between the piece color and white every 50ms slice (4 flashes total over 200ms)
4. Verify ghost and active piece are not drawn during line-clear animation

**Unit tests**:
- Tick through a line-clear scenario: `lineClearAnim` is non-null immediately after lock
- After 200ms of ticks: `lineClearAnim` is null, board has reduced row count, new piece spawned
- Score and lines updated after animation completes, not before

---

## TASK-19 — Responsive Canvas + DPR (Polish)

**Requirements satisfied**: REQ-18.1, REQ-18.2, REQ-18.4  
**Files touched**:
- `src/render/renderer.ts`
- `index.html`
- `src/style.css` (or inline styles)

**Work**:
1. `index.html`: `<canvas>` wrapped in a `div.game-container`; CSS sets `width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center`
2. `renderer.resize()`:
   - Computes `cellSize = Math.floor(Math.min(availW / totalCols, availH / VISIBLE_ROWS))`
   - Sets `canvas.width = logicalWidth * dpr`, `canvas.height = logicalHeight * dpr`
   - Sets `canvas.style.width/height` to logical pixel values
   - Calls `ctx.scale(dpr, dpr)`
3. All draw calls use logical pixel values; DPR scaling is done once at resize

**Unit tests**: None (visual).  
**Verification**: Game renders correctly at 1×, 1.5×, and 2× DPR (simulated via DevTools device emulation).

---

## TASK-20 — README and Final Acceptance

**Requirements satisfied**: All  
**Files touched**:
- `README.md`

**Work**:
1. Write `README.md` with:
   - Controls table (all keys from REQ-17)
   - Architecture overview (module tree, one-line description per module)
   - Scoring rules (line clear values, T-spin values, back-to-back, combo formula)
   - How to run: `npm install`, `npm run dev`, `npm run build`, `npm test`
2. Run full acceptance check:
   - [ ] T-spin triple on a standard TST setup scores correctly (test in `scoring.test.ts`)
   - [ ] I-piece wall kicks work at both walls (test in `srs.test.ts`)
   - [ ] DAS/ARR feels responsive, no input drops at 60 FPS (manual)
   - [ ] Pause freezes all timers including lock delay (test in `gameState.test.ts`)
   - [ ] High score survives a page reload (test in `persistence.test.ts` + manual)
3. `npm test` — all tests pass
4. `npm run lint` — zero errors
5. `npm run build` — exits 0, `dist/` contains index.html + assets

---

## Task Dependency Graph

```
TASK-0 (scaffold)
  └── TASK-1 (types + constants)
        ├── TASK-2 (board)
        ├── TASK-3 (pieces)
        │     └── TASK-4 (bag)
        │           ├── TASK-5 (collision)
        │           │     └── TASK-6 (SRS)
        │           │           └── TASK-7 (gravity + ghost)
        │           │                 └── TASK-8 (lock delay)
        │           │                       └── TASK-9 (line clear + tspin)
        │           │                             └── TASK-10 (scoring)
        │           │                                   └── TASK-11 (hold + preview)
        │           │                                         └── TASK-12 (game state)
        │           │                                               ├── TASK-13 (persistence)
        │           │                                               ├── TASK-14 (input)
        │           │                                               ├── TASK-15 (renderer)
        │           │                                               └── TASK-16 (loop)
        │           │                                                     └── TASK-17 (main/wiring)
        │           │                                                           ├── TASK-18 (anim polish)
        │           │                                                           ├── TASK-19 (DPR polish)
        │           │                                                           └── TASK-20 (README + acceptance)
```
